import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { hasCostAnalysisAccess } from '@/lib/admin/cost-analysis-access'
import { createServiceRoleClient } from '@/lib/supabase/service'

const PAGE_SIZE = 1000
const TIME_ZONE = 'Asia/Seoul'
const PAID_STATUSES = ['paid', 'preparing', 'shipping', 'delivered']

interface DateFilter {
  column: string
  op: 'gte' | 'lt'
  value: string
}

interface UsageBase {
  sessions: number
  pageViews: number
  events: number
  analysisAttempts: number
  savedAnalyses: number
  standardAnalysisCalls: number
  chemistryAnalysisCalls: number
  graduationImageCalls: number
  feedbackRecipeCalls: number
  adminAiCalls: number
  orders: number
  paidOrders: number
  onlinePaidOrders: number
  revenue: number
  onlineRevenue: number
  shippingFees: number
  discounts: number
}

interface DailyUsage extends UsageBase {
  date: string
}

interface MonthlyUsage extends UsageBase {
  month: string
}

function emptyUsageBase(): UsageBase {
  return {
    sessions: 0,
    pageViews: 0,
    events: 0,
    analysisAttempts: 0,
    savedAnalyses: 0,
    standardAnalysisCalls: 0,
    chemistryAnalysisCalls: 0,
    graduationImageCalls: 0,
    feedbackRecipeCalls: 0,
    adminAiCalls: 0,
    orders: 0,
    paidOrders: 0,
    onlinePaidOrders: 0,
    revenue: 0,
    onlineRevenue: 0,
    shippingFees: 0,
    discounts: 0,
  }
}

function emptyDaily(date: string): DailyUsage {
  return {
    date,
    ...emptyUsageBase(),
  }
}

function emptyMonthly(month: string): MonthlyUsage {
  return {
    month,
    ...emptyUsageBase(),
  }
}

function getKoreaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function toKoreaBoundaryIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString()
}

function resolveRange(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const period = searchParams.get('period') || '30d'

  if (startParam && endParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam) && /^\d{4}-\d{2}-\d{2}$/.test(endParam)) {
    const days = Math.max(1, Math.round((Date.parse(`${endParam}T00:00:00Z`) - Date.parse(`${startParam}T00:00:00Z`)) / 86_400_000) + 1)
    return {
      period: 'custom',
      startKey: startParam,
      endKey: endParam,
      days,
      startIso: toKoreaBoundaryIso(startParam),
      endExclusiveIso: toKoreaBoundaryIso(addDays(endParam, 1)),
    }
  }

  const periodDays: Record<string, number> = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
  }
  const days = periodDays[period] || 30
  const endKey = getKoreaDateKey()
  const startKey = addDays(endKey, -(days - 1))

  return {
    period,
    startKey,
    endKey,
    days,
    startIso: toKoreaBoundaryIso(startKey),
    endExclusiveIso: toKoreaBoundaryIso(addDays(endKey, 1)),
  }
}

async function fetchAllRows<T>(
  table: string,
  select: string,
  filters: DateFilter[],
  options?: { orderColumn?: string }
): Promise<T[]> {
  const supabase = createServiceRoleClient()
  const rows: T[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1)

    for (const filter of filters) {
      if (filter.op === 'gte') {
        query = query.gte(filter.column, filter.value)
      } else {
        query = query.lt(filter.column, filter.value)
      }
    }

    if (options?.orderColumn) {
      query = query.order(options.orderColumn, { ascending: true })
    }

    const { data, error } = await query
    if (error) {
      console.warn(`[CostAnalysis] ${table} fetch skipped:`, error.message)
      return rows
    }

    if (!data || data.length === 0) break
    rows.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function makeDailyMap(startKey: string, endKey: string) {
  const map = new Map<string, DailyUsage>()
  let current = startKey
  while (current <= endKey) {
    map.set(current, emptyDaily(current))
    current = addDays(current, 1)
  }
  return map
}

function getBucket(map: Map<string, DailyUsage>, iso: string) {
  const key = getKoreaDateKey(new Date(iso))
  const existing = map.get(key)
  if (existing) return existing
  const created = emptyDaily(key)
  map.set(key, created)
  return created
}

function addUsage(target: UsageBase, source: UsageBase) {
  target.sessions += source.sessions
  target.pageViews += source.pageViews
  target.events += source.events
  target.analysisAttempts += source.analysisAttempts
  target.savedAnalyses += source.savedAnalyses
  target.standardAnalysisCalls += source.standardAnalysisCalls
  target.chemistryAnalysisCalls += source.chemistryAnalysisCalls
  target.graduationImageCalls += source.graduationImageCalls
  target.feedbackRecipeCalls += source.feedbackRecipeCalls
  target.adminAiCalls += source.adminAiCalls
  target.orders += source.orders
  target.paidOrders += source.paidOrders
  target.onlinePaidOrders += source.onlinePaidOrders
  target.revenue += source.revenue
  target.onlineRevenue += source.onlineRevenue
  target.shippingFees += source.shippingFees
  target.discounts += source.discounts
}

function addMonthly(month: MonthlyUsage, day: DailyUsage) {
  addUsage(month, day)
}

function normalizeAnalysisCalls(day: DailyUsage, usageByDate: Map<string, { standard: number; chemistry: number }>, resultByDate: Map<string, { standard: number; chemistryRows: number; graduation: number }>) {
  const usage = usageByDate.get(day.date) || { standard: 0, chemistry: 0 }
  const results = resultByDate.get(day.date) || { standard: 0, chemistryRows: 0, graduation: 0 }

  day.standardAnalysisCalls = usage.standard > 0 ? usage.standard : results.standard
  day.chemistryAnalysisCalls = usage.chemistry > 0 ? usage.chemistry : Math.ceil(results.chemistryRows / 2)
  day.graduationImageCalls = results.graduation
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    if (!hasCostAnalysisAccess(request)) {
      return NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 })
    }

    const range = resolveRange(request)
    const dailyMap = makeDailyMap(range.startKey, range.endKey)
    const filters = [
      { column: 'created_at', op: 'gte' as const, value: range.startIso },
      { column: 'created_at', op: 'lt' as const, value: range.endExclusiveIso },
    ]

    const [
      sessions,
      pageViews,
      events,
      usageEvents,
      savedAnalyses,
      orders,
      feedbacks,
      adminAiAnalyses,
    ] = await Promise.all([
      fetchAllRows<{ started_at: string }>('analytics_sessions', 'started_at', [
        { column: 'started_at', op: 'gte', value: range.startIso },
        { column: 'started_at', op: 'lt', value: range.endExclusiveIso },
      ]),
      fetchAllRows<{ viewed_at: string }>('analytics_page_views', 'viewed_at', [
        { column: 'viewed_at', op: 'gte', value: range.startIso },
        { column: 'viewed_at', op: 'lt', value: range.endExclusiveIso },
      ]),
      fetchAllRows<{ created_at: string }>('analytics_events', 'created_at', filters),
      fetchAllRows<{ created_at: string; product_type: string | null; endpoint: string | null }>(
        'analysis_usage_events',
        'created_at, product_type, endpoint',
        filters
      ),
      fetchAllRows<{ created_at: string; product_type: string | null }>(
        'analysis_results',
        'created_at, product_type',
        filters
      ),
      fetchAllRows<{
        created_at: string
        status: string | null
        final_price: number | null
        shipping_fee: number | null
        discount_amount: number | null
        payment_method: string | null
        is_influencer: boolean | null
      }>(
        'orders',
        'created_at, status, final_price, shipping_fee, discount_amount, payment_method, is_influencer',
        filters
      ),
      fetchAllRows<{ created_at: string }>('perfume_feedbacks', 'created_at', filters),
      fetchAllRows<{ created_at: string }>('feedback_ai_analyses', 'created_at', filters),
    ])

    sessions.forEach((row) => {
      getBucket(dailyMap, row.started_at).sessions += 1
    })

    pageViews.forEach((row) => {
      getBucket(dailyMap, row.viewed_at).pageViews += 1
    })

    events.forEach((row) => {
      getBucket(dailyMap, row.created_at).events += 1
    })

    const usageByDate = new Map<string, { standard: number; chemistry: number }>()
    usageEvents.forEach((row) => {
      const day = getBucket(dailyMap, row.created_at)
      const key = day.date
      const current = usageByDate.get(key) || { standard: 0, chemistry: 0 }
      const isChemistry = row.product_type === 'chemistry_set' || row.endpoint?.includes('chemistry')
      if (isChemistry) current.chemistry += 1
      else current.standard += 1
      usageByDate.set(key, current)
      day.analysisAttempts += 1
    })

    const resultByDate = new Map<string, { standard: number; chemistryRows: number; graduation: number }>()
    savedAnalyses.forEach((row) => {
      const day = getBucket(dailyMap, row.created_at)
      const key = day.date
      const current = resultByDate.get(key) || { standard: 0, chemistryRows: 0, graduation: 0 }
      if (row.product_type === 'chemistry_set') {
        current.chemistryRows += 1
      } else {
        current.standard += 1
      }
      if (row.product_type === 'graduation') {
        current.graduation += 1
      }
      resultByDate.set(key, current)
      day.savedAnalyses += 1
    })

    orders.forEach((row) => {
      const day = getBucket(dailyMap, row.created_at)
      if (row.status !== 'awaiting_payment') day.orders += 1
      const paid = row.status ? PAID_STATUSES.includes(row.status) : false
      if (!paid || row.is_influencer) return

      const revenue = row.final_price || 0
      const isOnlinePayment = row.payment_method && row.payment_method !== 'bank_transfer'
      day.paidOrders += 1
      day.revenue += revenue
      day.shippingFees += row.shipping_fee || 0
      day.discounts += row.discount_amount || 0

      if (isOnlinePayment) {
        day.onlinePaidOrders += 1
        day.onlineRevenue += revenue
      }
    })

    feedbacks.forEach((row) => {
      getBucket(dailyMap, row.created_at).feedbackRecipeCalls += 1
    })

    adminAiAnalyses.forEach((row) => {
      getBucket(dailyMap, row.created_at).adminAiCalls += 1
    })

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    daily.forEach((day) => normalizeAnalysisCalls(day, usageByDate, resultByDate))

    const monthlyMap = new Map<string, MonthlyUsage>()
    daily.forEach((day) => {
      const month = day.date.slice(0, 7)
      const bucket = monthlyMap.get(month) || emptyMonthly(month)
      addMonthly(bucket, day)
      monthlyMap.set(month, bucket)
    })
    const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    const totals = emptyUsageBase()
    daily.forEach((day) => addUsage(totals, day))

    return NextResponse.json({
      range: {
        period: range.period,
        start: range.startKey,
        end: range.endKey,
        days: range.days,
        timeZone: TIME_ZONE,
      },
      daily,
      monthly,
      totals: {
        ...totals,
      },
      notes: [
        '분석 비용은 analysis_usage_events를 우선 사용하고, 과거 로그가 없는 날짜는 저장된 analysis_results로 보정합니다.',
        '졸업 이미지 변환 호출 수는 별도 로그가 없어 졸업 분석 결과 수를 기반으로 한 추정값입니다.',
        '결제 수수료는 계좌이체를 제외한 온라인 결제 매출에만 적용할 수 있도록 onlineRevenue를 분리했습니다.',
      ],
    })
  } catch (error) {
    console.error('[CostAnalysis] GET error:', error)
    return NextResponse.json({ error: '원가 분석 데이터를 불러오지 못했습니다' }, { status: 500 })
  }
}
