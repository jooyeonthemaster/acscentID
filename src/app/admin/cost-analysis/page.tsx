'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Bot,
  Calculator,
  CalendarDays,
  CreditCard,
  Download,
  Lock,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Server,
  SlidersHorizontal,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { AdminHeader } from '../components/AdminHeader'

const AVG_DAYS_PER_MONTH = 30.4375
const SETTINGS_KEY = 'acscent_cost_analysis_assumptions_v2'
const RESEARCHED_AT = '2026-06-12'
const USD_TO_KRW = 1520

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

interface CostAnalysisResponse {
  range: {
    period: string
    start: string
    end: string
    days: number
    timeZone: string
  }
  daily: DailyUsage[]
  monthly: MonthlyUsage[]
  totals: UsageBase
  notes: string[]
}

interface CostAssumptions {
  fixedMonthly: {
    hosting: number
    database: number
    storage: number
    email: number
    domain: number
    other: number
  }
  variable: {
    pageView: number
    session: number
    standardAnalysis: number
    chemistryAnalysis: number
    graduationImage: number
    feedbackRecipe: number
    adminAi: number
    paymentRatePercent: number
    paymentFixed: number
    packagingPerOrder: number
    shippingCostPerOrder: number
    productCostRatePercent: number
  }
}

interface CostBreakdown {
  fixed: number
  traffic: number
  ai: number
  payment: number
  fulfillment: number
  product: number
  total: number
  profit: number
  margin: number
}

interface CustomRange {
  start: string
  end: string
}

const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  fixedMonthly: {
    hosting: 30400,
    database: 38000,
    storage: 0,
    email: 0,
    domain: 2000,
    other: 0,
  },
  variable: {
    pageView: 0,
    session: 0,
    standardAnalysis: 45,
    chemistryAnalysis: 160,
    graduationImage: 220,
    feedbackRecipe: 30,
    adminAi: 120,
    paymentRatePercent: 3.52,
    paymentFixed: 0,
    packagingPerOrder: 900,
    shippingCostPerOrder: 3200,
    productCostRatePercent: 35,
  },
}

const ASSUMPTION_NOTES = [
  `기본값은 ${RESEARCHED_AT} 공개 요금표 기준이며, USD 비용은 1달러=${USD_TO_KRW.toLocaleString('ko-KR')}원으로 환산했습니다.`,
  '호스팅은 Vercel Pro 1석, DB는 Supabase Pro 1개 조직/프로젝트의 기본 유료 운영 기준입니다.',
  'AI 단가는 Gemini 3 Flash 텍스트/이미지 분석 토큰 단가에 평균 입출력 토큰과 재시도 여지를 더해 1회당 원화로 둥글게 잡았습니다.',
  '졸업 이미지 변환은 Gemini 3 Pro Image 1K 출력 이미지 1장 기준 공식 이미지 출력 단가를 반영했습니다.',
  'PG 수수료율은 국내 PG 일반 카드 3.20%에 VAT 10%를 더한 3.52%입니다. 영세/중소 우대 수수료 계약이면 낮춰야 합니다.',
  '포장비, 실배송비, 상품 원가율은 공개 포장재/운임과 소형 커스텀 향수 판매가를 바탕으로 한 추정치라 실제 BOM으로 교체하는 것이 좋습니다.',
]

const ASSUMPTION_SOURCE_LINKS = [
  { label: 'Gemini API 요금', href: 'https://ai.google.dev/gemini-api/docs/pricing' },
  { label: 'Gemini 토큰 계산', href: 'https://ai.google.dev/gemini-api/docs/tokens' },
  { label: 'Vercel Pro 요금', href: 'https://vercel.com/docs/plans/pro-plan' },
  { label: 'Supabase 청구/쿼터', href: 'https://supabase.com/docs/guides/platform/billing-on-supabase' },
  { label: 'Resend 요금', href: 'https://resend.com/pricing' },
  { label: 'PortOne PG 수수료', href: 'https://help.portone.io/category/pricing' },
  { label: 'CJ대한통운 운임', href: 'https://www.cjlogistics.com/ko/utility/parcel-price' },
  { label: 'USD/KRW 환율', href: 'https://wise.com/us/currency-converter/usd-to-krw-rate/history' },
]

const PERIODS = [
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: '180d', label: '180일' },
  { value: '365d', label: '365일' },
]

function getKoreaDateInputValue(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatCurrency(value: number) {
  return `₩${Math.round(value).toLocaleString('ko-KR')}`
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('ko-KR')
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(1)}%`
}

function sumFixedMonthly(assumptions: CostAssumptions) {
  return Object.values(assumptions.fixedMonthly).reduce((sum, value) => sum + value, 0)
}

function calculateCosts(row: UsageBase, assumptions: CostAssumptions, fixedAllocation: number): CostBreakdown {
  const traffic = row.pageViews * assumptions.variable.pageView + row.sessions * assumptions.variable.session
  const ai =
    row.standardAnalysisCalls * assumptions.variable.standardAnalysis +
    row.chemistryAnalysisCalls * assumptions.variable.chemistryAnalysis +
    row.graduationImageCalls * assumptions.variable.graduationImage +
    row.feedbackRecipeCalls * assumptions.variable.feedbackRecipe +
    row.adminAiCalls * assumptions.variable.adminAi
  const payment =
    row.onlineRevenue * (assumptions.variable.paymentRatePercent / 100) +
    row.onlinePaidOrders * assumptions.variable.paymentFixed
  const estimatedShippingCost = row.paidOrders * assumptions.variable.shippingCostPerOrder
  const fulfillment =
    row.paidOrders * assumptions.variable.packagingPerOrder +
    Math.max(estimatedShippingCost - row.shippingFees, 0)
  const product = row.revenue * (assumptions.variable.productCostRatePercent / 100)
  const total = fixedAllocation + traffic + ai + payment + fulfillment + product
  const profit = row.revenue - total

  return {
    fixed: fixedAllocation,
    traffic,
    ai,
    payment,
    fulfillment,
    product,
    total,
    profit,
    margin: row.revenue > 0 ? (profit / row.revenue) * 100 : 0,
  }
}

function mergeAssumptions(value: unknown): CostAssumptions {
  if (!value || typeof value !== 'object') return DEFAULT_ASSUMPTIONS
  const saved = value as Partial<CostAssumptions>
  return {
    fixedMonthly: {
      ...DEFAULT_ASSUMPTIONS.fixedMonthly,
      ...(saved.fixedMonthly || {}),
    },
    variable: {
      ...DEFAULT_ASSUMPTIONS.variable,
      ...(saved.variable || {}),
    },
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subValue?: string
  color?: 'slate' | 'emerald' | 'blue' | 'purple' | 'orange' | 'red'
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl lg:text-3xl font-black text-slate-900 break-words">{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function PeriodSelector({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {PERIODS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            period === item.value
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function DateRangeSelector({
  start,
  end,
  active,
  error,
  onStartChange,
  onEndChange,
  onApply,
}: {
  start: string
  end: string
  active: boolean
  error: string | null
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onApply: () => void
}) {
  const inputClassName =
    'h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[150px]">
        <span className="block text-xs font-bold text-slate-500 mb-1">시작일</span>
        <input
          type="date"
          value={start}
          onChange={(event) => onStartChange(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="min-w-[150px]">
        <span className="block text-xs font-bold text-slate-500 mb-1">종료일</span>
        <input
          type="date"
          value={end}
          onChange={(event) => onEndChange(event.target.value)}
          className={inputClassName}
        />
      </label>
      <button
        type="button"
        onClick={onApply}
        className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all ${
          active
            ? 'bg-slate-900 text-white'
            : 'border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        기간 적용
      </button>
      {error && <p className="basis-full text-xs font-bold text-red-500">{error}</p>}
    </div>
  )
}

function NumberInput({
  label,
  value,
  suffix = '원',
  onChange,
}: {
  label: string
  value: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1">{label}</span>
      <div className="flex items-center rounded-lg border-2 border-slate-200 bg-white focus-within:border-slate-900">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value || 0))}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none"
        />
        <span className="shrink-0 pr-3 text-xs font-bold text-slate-400">{suffix}</span>
      </div>
    </label>
  )
}

function BreakdownBar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  const width = total > 0 ? Math.max(2, (value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function UsagePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  )
}

function CostAnalysisPasswordGate({
  password,
  error,
  submitting,
  onPasswordChange,
  onSubmit,
}: {
  password: string
  error: string | null
  submitting: boolean
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div>
      <AdminHeader title="원가 분석" subtitle="비밀번호 확인 후 접근할 수 있습니다" />
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-xl border-2 border-slate-200 bg-white p-6 shadow-[3px_3px_0px_#e2e8f0]"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Lock className="h-7 w-7" />
          </div>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-black text-slate-900">원가 분석 잠금</h2>
            <p className="mt-2 text-sm text-slate-500">비밀번호를 입력해 주세요.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none transition-colors focus:border-slate-900"
            />
          </label>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            잠금 해제
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CostAnalysisPage() {
  const [accessChecking, setAccessChecking] = useState(true)
  const [accessGranted, setAccessGranted] = useState(false)
  const [accessPassword, setAccessPassword] = useState('')
  const [accessError, setAccessError] = useState<string | null>(null)
  const [accessSubmitting, setAccessSubmitting] = useState(false)
  const [period, setPeriod] = useState('30d')
  const [customStart, setCustomStart] = useState(() => getKoreaDateInputValue())
  const [customEnd, setCustomEnd] = useState(() => getKoreaDateInputValue())
  const [appliedCustomRange, setAppliedCustomRange] = useState<CustomRange | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [data, setData] = useState<CostAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [assumptions, setAssumptions] = useState<CostAssumptions>(DEFAULT_ASSUMPTIONS)
  const appliedCustomStart = appliedCustomRange?.start
  const appliedCustomEnd = appliedCustomRange?.end

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      try {
        const response = await fetch('/api/admin/cost-analysis/access')
        const result = await response.json().catch(() => null)
        if (!cancelled) {
          setAccessGranted(Boolean(response.ok && result?.unlocked))
        }
      } catch {
        if (!cancelled) setAccessGranted(false)
      } finally {
        if (!cancelled) setAccessChecking(false)
      }
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [])

  const handleAccessSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setAccessSubmitting(true)
      setAccessError(null)

      try {
        const response = await fetch('/api/admin/cost-analysis/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: accessPassword }),
        })
        const result = await response.json().catch(() => null)

        if (!response.ok || !result?.unlocked) {
          throw new Error(result?.error || '비밀번호가 올바르지 않습니다')
        }

        setAccessGranted(true)
        setAccessPassword('')
      } catch (err) {
        setAccessError(err instanceof Error ? err.message : '비밀번호 확인 중 오류가 발생했습니다')
      } finally {
        setAccessSubmitting(false)
      }
    },
    [accessPassword]
  )

  const fetchData = useCallback(async () => {
    if (!accessGranted) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (period === 'custom' && appliedCustomStart && appliedCustomEnd) {
        params.set('start', appliedCustomStart)
        params.set('end', appliedCustomEnd)
      } else {
        params.set('period', period)
      }

      const response = await fetch(`/api/admin/cost-analysis?${params.toString()}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '원가 분석 데이터를 불러오지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [accessGranted, appliedCustomEnd, appliedCustomStart, period])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY)
      if (raw) setAssumptions(mergeAssumptions(JSON.parse(raw)))
    } catch {
      setAssumptions(DEFAULT_ASSUMPTIONS)
    } finally {
      setSettingsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(assumptions))
  }, [assumptions, settingsLoaded])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fixedMonthly = useMemo(() => sumFixedMonthly(assumptions), [assumptions])

  const computed = useMemo(() => {
    if (!data) return null

    const totalFixed = fixedMonthly * (data.range.days / AVG_DAYS_PER_MONTH)
    const totalCosts = calculateCosts(data.totals, assumptions, totalFixed)
    const dailyAverageCost = totalCosts.total / Math.max(data.range.days, 1)
    const monthlyProjectedCost = dailyAverageCost * AVG_DAYS_PER_MONTH
    const latestDay = data.daily[data.daily.length - 1]
    const latestDayCosts = latestDay
      ? calculateCosts(latestDay, assumptions, fixedMonthly / AVG_DAYS_PER_MONTH)
      : null

    const monthDayCounts = data.daily.reduce<Record<string, number>>((acc, day) => {
      const month = day.date.slice(0, 7)
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    const monthly = data.monthly.map((row) => ({
      row,
      costs: calculateCosts(row, assumptions, fixedMonthly * ((monthDayCounts[row.month] || 0) / AVG_DAYS_PER_MONTH)),
    }))

    const daily = data.daily.map((row) => ({
      row,
      costs: calculateCosts(row, assumptions, fixedMonthly / AVG_DAYS_PER_MONTH),
    }))

    return {
      totalCosts,
      dailyAverageCost,
      monthlyProjectedCost,
      latestDay,
      latestDayCosts,
      monthly,
      daily,
    }
  }, [assumptions, data, fixedMonthly])

  const updateFixed = (key: keyof CostAssumptions['fixedMonthly'], value: number) => {
    setAssumptions((prev) => ({
      ...prev,
      fixedMonthly: { ...prev.fixedMonthly, [key]: value },
    }))
  }

  const updateVariable = (key: keyof CostAssumptions['variable'], value: number) => {
    setAssumptions((prev) => ({
      ...prev,
      variable: { ...prev.variable, [key]: value },
    }))
  }

  const resetAssumptions = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS)
  }

  const handlePeriodChange = (nextPeriod: string) => {
    setRangeError(null)
    setPeriod(nextPeriod)
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      setRangeError('시작일과 종료일을 모두 선택해 주세요.')
      return
    }

    if (customStart > customEnd) {
      setRangeError('시작일은 종료일보다 늦을 수 없습니다.')
      return
    }

    setRangeError(null)
    setAppliedCustomRange({ start: customStart, end: customEnd })
    setPeriod('custom')
  }

  const downloadCsv = () => {
    if (!computed) return
    const header = ['date', 'pageViews', 'sessions', 'analysisCalls', 'paidOrders', 'revenue', 'cost', 'profit', 'margin']
    const rows = computed.daily.map(({ row, costs }) => [
      row.date,
      row.pageViews,
      row.sessions,
      row.standardAnalysisCalls + row.chemistryAnalysisCalls,
      row.paidOrders,
      Math.round(row.revenue),
      Math.round(costs.total),
      Math.round(costs.profit),
      costs.margin.toFixed(1),
    ])
    const csv = [header, ...rows].map((line) => line.join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `acscent-cost-analysis-${data?.range.start}-${data?.range.end}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (accessChecking) {
    return (
      <div>
        <AdminHeader title="원가 분석" subtitle="접근 권한 확인 중" />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!accessGranted) {
    return (
      <CostAnalysisPasswordGate
        password={accessPassword}
        error={accessError}
        submitting={accessSubmitting}
        onPasswordChange={setAccessPassword}
        onSubmit={handleAccessSubmit}
      />
    )
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div>
        <AdminHeader title="원가 분석" subtitle="일별 · 월별 운영비 추정" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-slate-600">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="원가 분석"
        subtitle="실제 사용량과 운영 단가 가정을 결합해 일별/월별 비용을 추정합니다"
        actions={
          <>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!computed}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-300 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              새로고침
            </button>
          </>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <PeriodSelector period={period} onChange={handlePeriodChange} />
            {data && (
              <div className="text-sm text-slate-500">
                {data.range.start} ~ {data.range.end} · {data.range.days}일 · {data.range.timeZone}
              </div>
            )}
          </div>
          <DateRangeSelector
            start={customStart}
            end={customEnd}
            active={period === 'custom' && appliedCustomStart === customStart && appliedCustomEnd === customEnd}
            error={rangeError}
            onStartChange={setCustomStart}
            onEndChange={setCustomEnd}
            onApply={applyCustomRange}
          />
        </div>

        {computed && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                icon={Calculator}
                label="선택 기간 총 원가"
                value={formatCurrency(computed.totalCosts.total)}
                subValue={`고정비 배분 ${formatCurrency(computed.totalCosts.fixed)} 포함`}
                color="purple"
              />
              <StatCard
                icon={BarChart3}
                label="일평균 원가"
                value={formatCurrency(computed.dailyAverageCost)}
                subValue={`월 환산 ${formatCurrency(computed.monthlyProjectedCost)}`}
                color="blue"
              />
              <StatCard
                icon={TrendingUp}
                label="추정 순이익"
                value={formatCurrency(computed.totalCosts.profit)}
                subValue={`마진 ${formatPercent(computed.totalCosts.margin)}`}
                color={computed.totalCosts.profit >= 0 ? 'emerald' : 'red'}
              />
              <StatCard
                icon={Bot}
                label="AI 사용량"
                value={`${formatNumber(data.totals.standardAnalysisCalls + data.totals.chemistryAnalysisCalls)}회`}
                subValue={`AI 원가 ${formatCurrency(computed.totalCosts.ai)}`}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
              <section className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">원가 구성</h2>
                    <p className="text-sm text-slate-500 mt-1">선택 기간 기준 비용 항목별 비중</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white">
                    {formatCurrency(computed.totalCosts.total)}
                  </div>
                </div>

                <div className="space-y-4">
                  <BreakdownBar label="AI 분석/레시피" value={computed.totalCosts.ai} total={computed.totalCosts.total} className="bg-purple-500" />
                  <BreakdownBar label="결제 수수료" value={computed.totalCosts.payment} total={computed.totalCosts.total} className="bg-blue-500" />
                  <BreakdownBar label="배송/포장 순비용" value={computed.totalCosts.fulfillment} total={computed.totalCosts.total} className="bg-orange-500" />
                  <BreakdownBar label="상품 원가율 반영" value={computed.totalCosts.product} total={computed.totalCosts.total} className="bg-emerald-500" />
                  <BreakdownBar label="트래픽/세션" value={computed.totalCosts.traffic} total={computed.totalCosts.total} className="bg-cyan-500" />
                  <BreakdownBar label="월 고정비 배분" value={computed.totalCosts.fixed} total={computed.totalCosts.total} className="bg-slate-700" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <UsagePill label="페이지뷰" value={formatNumber(data.totals.pageViews)} />
                  <UsagePill label="세션" value={formatNumber(data.totals.sessions)} />
                  <UsagePill label="유료 주문" value={formatNumber(data.totals.paidOrders)} />
                  <UsagePill label="매출" value={formatCurrency(data.totals.revenue)} />
                </div>
              </section>

              <section className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-slate-500" />
                    <h2 className="text-lg font-black text-slate-900">단가 가정</h2>
                  </div>
                  <button
                    type="button"
                    onClick={resetAssumptions}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    조사값 복원
                  </button>
                </div>
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                  {RESEARCHED_AT} 공개 요금표 기준 기본값입니다. 실제 청구서, PG 계약서, BOM이 있으면 아래 값을 덮어써서 맞추세요.
                </p>

                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                      <Server className="w-4 h-4" />
                      월 고정비
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="호스팅" value={assumptions.fixedMonthly.hosting} onChange={(value) => updateFixed('hosting', value)} />
                      <NumberInput label="DB" value={assumptions.fixedMonthly.database} onChange={(value) => updateFixed('database', value)} />
                      <NumberInput label="스토리지" value={assumptions.fixedMonthly.storage} onChange={(value) => updateFixed('storage', value)} />
                      <NumberInput label="이메일" value={assumptions.fixedMonthly.email} onChange={(value) => updateFixed('email', value)} />
                      <NumberInput label="도메인" value={assumptions.fixedMonthly.domain} onChange={(value) => updateFixed('domain', value)} />
                      <NumberInput label="기타" value={assumptions.fixedMonthly.other} onChange={(value) => updateFixed('other', value)} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                      <Bot className="w-4 h-4" />
                      AI/트래픽 단가
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="기본 분석 1회" value={assumptions.variable.standardAnalysis} onChange={(value) => updateVariable('standardAnalysis', value)} />
                      <NumberInput label="케미 분석 1회" value={assumptions.variable.chemistryAnalysis} onChange={(value) => updateVariable('chemistryAnalysis', value)} />
                      <NumberInput label="졸업 이미지 1회" value={assumptions.variable.graduationImage} onChange={(value) => updateVariable('graduationImage', value)} />
                      <NumberInput label="피드백 레시피 1회" value={assumptions.variable.feedbackRecipe} onChange={(value) => updateVariable('feedbackRecipe', value)} />
                      <NumberInput label="관리자 AI 1회" value={assumptions.variable.adminAi} onChange={(value) => updateVariable('adminAi', value)} />
                      <NumberInput label="페이지뷰 1회" value={assumptions.variable.pageView} onChange={(value) => updateVariable('pageView', value)} />
                      <NumberInput label="세션 1회" value={assumptions.variable.session} onChange={(value) => updateVariable('session', value)} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                      <CreditCard className="w-4 h-4" />
                      주문 처리비
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="PG 수수료율" suffix="%" value={assumptions.variable.paymentRatePercent} onChange={(value) => updateVariable('paymentRatePercent', value)} />
                      <NumberInput label="PG 건당 수수료" value={assumptions.variable.paymentFixed} onChange={(value) => updateVariable('paymentFixed', value)} />
                      <NumberInput label="포장비/주문" value={assumptions.variable.packagingPerOrder} onChange={(value) => updateVariable('packagingPerOrder', value)} />
                      <NumberInput label="실배송비/주문" value={assumptions.variable.shippingCostPerOrder} onChange={(value) => updateVariable('shippingCostPerOrder', value)} />
                      <NumberInput label="상품 원가율" suffix="%" value={assumptions.variable.productCostRatePercent} onChange={(value) => updateVariable('productCostRatePercent', value)} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0] overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-slate-500" />
                  <h2 className="text-lg font-black text-slate-900">월별 원가</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-black text-slate-500">
                        <th className="py-2 pr-3">월</th>
                        <th className="py-2 pr-3 text-right">매출</th>
                        <th className="py-2 pr-3 text-right">원가</th>
                        <th className="py-2 pr-3 text-right">순이익</th>
                        <th className="py-2 pr-3 text-right">AI</th>
                        <th className="py-2 pr-3 text-right">주문</th>
                        <th className="py-2 text-right">PV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.monthly.map(({ row, costs }) => (
                        <tr key={row.month} className="border-b border-slate-100">
                          <td className="py-3 pr-3 font-bold text-slate-900">{row.month}</td>
                          <td className="py-3 pr-3 text-right font-bold">{formatCurrency(row.revenue)}</td>
                          <td className="py-3 pr-3 text-right font-bold text-red-600">{formatCurrency(costs.total)}</td>
                          <td className={`py-3 pr-3 text-right font-black ${costs.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(costs.profit)}
                          </td>
                          <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.standardAnalysisCalls + row.chemistryAnalysisCalls)}</td>
                          <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.paidOrders)}</td>
                          <td className="py-3 text-right text-slate-600">{formatNumber(row.pageViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0] overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-slate-500" />
                  <h2 className="text-lg font-black text-slate-900">최근 일별 원가</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-black text-slate-500">
                        <th className="py-2 pr-3">일자</th>
                        <th className="py-2 pr-3 text-right">매출</th>
                        <th className="py-2 pr-3 text-right">원가</th>
                        <th className="py-2 pr-3 text-right">순이익</th>
                        <th className="py-2 pr-3 text-right">분석</th>
                        <th className="py-2 pr-3 text-right">주문</th>
                        <th className="py-2 pr-3 text-right">세션</th>
                        <th className="py-2 text-right">PV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.daily.slice(-21).reverse().map(({ row, costs }) => (
                        <tr key={row.date} className="border-b border-slate-100">
                          <td className="py-3 pr-3 font-bold text-slate-900">{row.date}</td>
                          <td className="py-3 pr-3 text-right font-bold">{formatCurrency(row.revenue)}</td>
                          <td className="py-3 pr-3 text-right font-bold text-red-600">{formatCurrency(costs.total)}</td>
                          <td className={`py-3 pr-3 text-right font-black ${costs.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(costs.profit)}
                          </td>
                          <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.standardAnalysisCalls + row.chemistryAnalysisCalls)}</td>
                          <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.paidOrders)}</td>
                          <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.sessions)}</td>
                          <td className="py-3 text-right text-slate-600">{formatNumber(row.pageViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
              <h2 className="text-lg font-black text-slate-900 mb-3">계산 기준</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm text-slate-600">
                {data.notes.map((note) => (
                  <div key={note} className="rounded-lg bg-slate-50 p-3 leading-relaxed">
                    {note}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-slate-400">
                단가 기본값은 공개 자료 기반 추정치입니다. 실제 청구 단가가 확인되면 우측 단가 가정에서 수정해 계산하세요.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-black text-slate-900 mb-2">단가 조사 기준</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs text-slate-500">
                  {ASSUMPTION_NOTES.map((note) => (
                    <div key={note} className="rounded-lg bg-slate-50 px-3 py-2 leading-relaxed">
                      {note}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ASSUMPTION_SOURCE_LINKS.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    >
                      {source.label}
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
