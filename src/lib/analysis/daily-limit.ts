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

interface DailyAnalysisLimitRpcRow {
  allowed: boolean
  used_count: number
  remaining_count: number
  daily_limit: number
  usage_date: string
  reset_at: string
}

function normalizeLimitRow(row: DailyAnalysisLimitRpcRow): DailyAnalysisLimitResult {
  return {
    allowed: Boolean(row.allowed),
    usedCount: Number(row.used_count ?? 0),
    remainingCount: Number(row.remaining_count ?? 0),
    dailyLimit: Number(row.daily_limit ?? DAILY_ANALYSIS_LIMIT),
    usageDate: String(row.usage_date ?? ''),
    resetAt: String(row.reset_at ?? ''),
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
  const { data, error } = await supabase.rpc('consume_daily_analysis_usage', {
    p_user_id: userId,
    p_provider: provider ?? null,
    p_product_type: productType,
    p_endpoint: endpoint,
    p_target_type: targetType ?? null,
    p_daily_limit: DAILY_ANALYSIS_LIMIT,
  })

  if (error) {
    console.error('[DailyAnalysisLimit] consume failed:', error)
    throw new Error('Failed to check daily analysis limit')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Daily analysis limit response was empty')
  }

  return normalizeLimitRow(row as DailyAnalysisLimitRpcRow)
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
