import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const DAILY_ANALYSIS_LIMIT = 3
export const DAILY_ANALYSIS_LIMIT_CODE = 'DAILY_ANALYSIS_LIMIT_EXCEEDED'

export interface DailyAnalysisLimitResult {
  allowed: boolean
  usedCount: number
  remainingCount: number
  dailyLimit: number
  usageDate: string
  resetAt: string
}

interface ConsumeDailyAnalysisLimitArgs {
  userId: string
  provider?: string | null
  productType: string
  endpoint: string
  targetType?: 'idol' | 'self' | null
}

interface DailyUsageRow {
  id: string
  used_count: number
}

function getKoreaUsageDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to resolve Korea usage date')
  }

  return `${year}-${month}-${day}`
}

function getKoreaResetAt(usageDate: string) {
  const [year, month, day] = usageDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0, 0)).toISOString()
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || error?.message?.includes('duplicate key') === true
}

async function insertUsageEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  args: ConsumeDailyAnalysisLimitArgs,
  dailyUsageId: string,
  usageDate: string
) {
  const { error } = await supabase.from('analysis_usage_events').insert({
    daily_usage_id: dailyUsageId,
    usage_date: usageDate,
    user_id: args.userId,
    provider: args.provider ?? null,
    product_type: args.productType || 'unknown',
    endpoint: args.endpoint || 'unknown',
    target_type: args.targetType ?? null,
  })

  if (error) {
    console.warn('[DailyAnalysisLimit] usage event insert skipped:', error)
  }
}

function toLimitResult(allowed: boolean, usedCount: number, usageDate: string): DailyAnalysisLimitResult {
  return {
    allowed,
    usedCount,
    remainingCount: Math.max(DAILY_ANALYSIS_LIMIT - usedCount, 0),
    dailyLimit: DAILY_ANALYSIS_LIMIT,
    usageDate,
    resetAt: getKoreaResetAt(usageDate),
  }
}

export async function consumeDailyAnalysisLimit({
  userId,
  provider,
  productType,
  endpoint,
  targetType,
}: ConsumeDailyAnalysisLimitArgs): Promise<DailyAnalysisLimitResult> {
  const supabase = createServiceRoleClient()

  if (!userId.trim()) {
    return toLimitResult(false, 0, getKoreaUsageDate())
  }

  const usageDate = getKoreaUsageDate()
  const now = new Date().toISOString()

  const { data: inserted, error: insertError } = await supabase
    .from('analysis_daily_usage')
    .insert({
      usage_date: usageDate,
      user_id: userId,
      provider: provider ?? null,
      used_count: 1,
      max_count: DAILY_ANALYSIS_LIMIT,
      last_used_at: now,
      updated_at: now,
    })
    .select('id, used_count')
    .single<DailyUsageRow>()

  if (inserted) {
    await insertUsageEvent(supabase, { userId, provider, productType, endpoint, targetType }, inserted.id, usageDate)
    return toLimitResult(true, inserted.used_count, usageDate)
  }

  if (insertError && !isUniqueViolation(insertError)) {
    console.error('[DailyAnalysisLimit] initial insert failed:', insertError)
    throw new Error('Failed to check daily analysis limit')
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: current, error: selectError } = await supabase
      .from('analysis_daily_usage')
      .select('id, used_count')
      .eq('usage_date', usageDate)
      .eq('user_id', userId)
      .maybeSingle<DailyUsageRow>()

    if (selectError) {
      console.error('[DailyAnalysisLimit] select failed:', selectError)
      throw new Error('Failed to check daily analysis limit')
    }

    if (!current) {
      continue
    }

    if (current.used_count >= DAILY_ANALYSIS_LIMIT) {
      return toLimitResult(false, current.used_count, usageDate)
    }

    const nextCount = current.used_count + 1
    const updatePayload: Record<string, string | number | null> = {
      used_count: nextCount,
      max_count: DAILY_ANALYSIS_LIMIT,
      last_used_at: now,
      updated_at: now,
    }

    if (provider) {
      updatePayload.provider = provider
    }

    const { data: updated, error: updateError } = await supabase
      .from('analysis_daily_usage')
      .update(updatePayload)
      .eq('id', current.id)
      .eq('used_count', current.used_count)
      .select('id, used_count')
      .maybeSingle<DailyUsageRow>()

    if (updateError) {
      console.error('[DailyAnalysisLimit] update failed:', updateError)
      throw new Error('Failed to check daily analysis limit')
    }

    if (updated) {
      await insertUsageEvent(supabase, { userId, provider, productType, endpoint, targetType }, updated.id, usageDate)
      return toLimitResult(true, updated.used_count, usageDate)
    }
  }

  console.error('[DailyAnalysisLimit] consume retry exhausted')
  throw new Error('Failed to check daily analysis limit')
}

export function dailyAnalysisLimitExceededResponse(limit: DailyAnalysisLimitResult) {
  return NextResponse.json(
    {
      success: false,
      code: DAILY_ANALYSIS_LIMIT_CODE,
      error: `오늘 가능한 분석 ${limit.dailyLimit}회를 모두 사용했어요. 매일 00:00에 다시 이용할 수 있습니다.`,
      limit,
    },
    { status: 429 }
  )
}
