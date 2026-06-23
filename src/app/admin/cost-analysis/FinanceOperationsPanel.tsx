'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  LockKeyhole,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Table2,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react'
import {
  DEFAULT_FINANCE_MONTH_SETTINGS,
  FINANCE_CHANNEL_LABELS,
  type FinanceChannel,
  type FinanceImportBatch,
  type FinanceManualEntry,
  type FinanceMonthSettings,
  type FinanceSummary,
  type FinanceTransaction,
} from '@/lib/admin/finance-core'

interface FinanceResponse {
  month: string
  monthKey: string
  setupRequired: boolean
  settings: FinanceMonthSettings
  summary: FinanceSummary
  transactions: FinanceTransaction[]
  manualEntries: FinanceManualEntry[]
  importBatches: FinanceImportBatch[]
  onlineOrders: {
    count: number
    revenue: number
  }
  automationNotes: string[]
}

type PayhereSyncSource = 'payhere_wow' | 'payhere_id' | 'payhere_online'
type FinancePanelTab = 'overview' | 'revenue' | 'costs' | 'events' | 'settings'

interface PayhereSyncStatus {
  configured: boolean
  missing: string[]
  sources: Array<{
    source: PayhereSyncSource
    label: string
    configured: boolean
    missing: string[]
  }>
}

const IMPORT_SOURCE_OPTIONS = [
  { value: 'full_workbook', label: '전체 원가계산 워크북' },
  { value: 'payhere_wow', label: 'PAYHERE 와우' },
  { value: 'payhere_id', label: 'PAYHERE 아이디' },
  { value: 'payhere_online', label: 'PAYHERE 온라인' },
  { value: 'naver_booking', label: '네이버예약' },
]

const PAYHERE_SOURCE_OPTIONS: Array<{ source: PayhereSyncSource; label: string }> = [
  { source: 'payhere_wow', label: 'PAYHERE 와우' },
  { source: 'payhere_id', label: 'PAYHERE 아이디' },
  { source: 'payhere_online', label: 'PAYHERE 온라인' },
]

const CHANNEL_OPTIONS: Array<{ value: FinanceChannel; label: string }> = [
  { value: 'shared', label: FINANCE_CHANNEL_LABELS.shared },
  { value: 'wow_store', label: FINANCE_CHANNEL_LABELS.wow_store },
  { value: 'id_store', label: FINANCE_CHANNEL_LABELS.id_store },
  { value: 'online_site', label: FINANCE_CHANNEL_LABELS.online_site },
  { value: 'unknown', label: FINANCE_CHANNEL_LABELS.unknown },
]

const CATEGORY_OPTIONS = [
  { value: 'cash_sales', label: '현금매출' },
  { value: 'misc_revenue', label: '잡수익' },
  { value: 'event_labor', label: '이벤트 인건비' },
  { value: 'event_supply', label: '이벤트 준비물' },
  { value: 'labor', label: '인건비' },
  { value: 'marketing', label: '마케팅' },
  { value: 'shipping', label: '배송비' },
  { value: 'supplies', label: '소모품' },
  { value: 'other', label: '기타' },
]

const REVENUE_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) =>
  ['cash_sales', 'misc_revenue'].includes(option.value)
)

const COST_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) =>
  ['labor', 'marketing', 'shipping', 'supplies', 'other'].includes(option.value)
)

const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORY_OPTIONS.map((option) => [option.value, option.label])),
  imported_revenue: '외부매출',
  workbook_product_cost_override: '워크북 재료비',
  workbook_fee_override: '워크북 수수료',
  workbook_direct_labor: '워크북 직접인건비',
  workbook_event_supply: '워크북 이벤트 준비물',
}

const SOURCE_LABELS: Record<string, string> = {
  manual: '수기',
  cash: '현금',
  event_manual: '이벤트 수기',
  workbook_import: '워크북 입력',
  workbook_summary_import: '워크북 계산',
  payhere_wow: 'PAYHERE 와우',
  payhere_id: 'PAYHERE 아이디',
  payhere_online: 'PAYHERE 온라인',
  naver_booking: '네이버예약',
  online_site: '본 온라인 사이트',
}

type LedgerKind = 'revenue' | 'cost'

interface LedgerSheetRow {
  localId: string
  id?: string
  kind: LedgerKind
  channel: FinanceChannel
  category: string
  amount: string
  occurredOn: string
  description: string
  source: string
  rawPayload?: Record<string, unknown>
  isNew: boolean
  dirty: boolean
  locked: boolean
}

interface EventSupplySheetRow {
  localId: string
  id?: string
  eventName: string
  eventCode: string
  channel: FinanceChannel
  occurredOn: string
  itemName: string
  quantity: string
  unitCost: string
  amount: string
  vendor: string
  notes: string
  source: string
  rawPayload?: Record<string, unknown>
  isNew: boolean
  dirty: boolean
  locked: boolean
}

function createLedgerRowId() {
  return `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEventSupplyRowId() {
  return `event-supply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function blankLedgerRow(month: string, kind: LedgerKind = 'cost'): LedgerSheetRow {
  return {
    localId: createLedgerRowId(),
    kind,
    channel: 'shared',
    category: kind === 'revenue' ? 'cash_sales' : 'other',
    amount: '',
    occurredOn: `${month}-01`,
    description: '',
    source: 'manual',
    isNew: true,
    dirty: false,
    locked: false,
  }
}

function blankEventSupplyRow(month: string): EventSupplySheetRow {
  return {
    localId: createEventSupplyRowId(),
    eventName: '',
    eventCode: '',
    channel: 'wow_store',
    occurredOn: `${month}-01`,
    itemName: '',
    quantity: '1',
    unitCost: '',
    amount: '',
    vendor: '',
    notes: '',
    source: 'event_manual',
    isNew: true,
    dirty: false,
    locked: false,
  }
}

function ledgerRowFromEntry(entry: FinanceManualEntry): LedgerSheetRow {
  const source = entry.source || 'manual'
  const locked = source === 'workbook_import' || source === 'workbook_summary_import'
  return {
    localId: entry.id || createLedgerRowId(),
    id: entry.id,
    kind: entry.kind,
    channel: entry.channel,
    category: entry.category,
    amount: String(Math.round(entry.amount || 0)),
    occurredOn: entry.occurredOn,
    description: entry.description,
    source,
    rawPayload: entry.rawPayload,
    isNew: false,
    dirty: false,
    locked,
  }
}

function ledgerRowFromTransaction(transaction: FinanceTransaction): LedgerSheetRow {
  return {
    localId: transaction.id || createLedgerRowId(),
    id: transaction.id,
    kind: 'revenue',
    channel: transaction.channel,
    category: 'imported_revenue',
    amount: String(Math.round(transaction.grossAmount || 0)),
    occurredOn: transaction.occurredOn,
    description: transaction.rawDescription || transaction.itemName || transaction.optionText || transaction.externalId || '',
    source: transaction.source,
    rawPayload: transaction.rawPayload,
    isNew: false,
    dirty: false,
    locked: true,
  }
}

function payloadText(payload: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = payload?.[key]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

function payloadNumberText(payload: Record<string, unknown> | undefined, keys: string[]) {
  const text = payloadText(payload, keys)
  if (!text) return ''
  const number = Number(text)
  return Number.isFinite(number) && number > 0 ? String(number) : ''
}

function stripEventSupplyPrefix(description: string) {
  return description
    .replace(/^워크북 이벤트 준비물\s*·\s*/, '')
    .replace(/^이벤트 준비물\s*·\s*/, '')
    .trim()
}

function eventSupplyRowFromEntry(entry: FinanceManualEntry): EventSupplySheetRow {
  const source = entry.source || 'manual'
  const locked = source === 'workbook_import' || source === 'workbook_summary_import'
  const rawPayload = entry.rawPayload || {}
  const fallbackDescription = stripEventSupplyPrefix(entry.description)
  const eventCode = payloadText(rawPayload, ['eventCode', 'code'])
  const eventName =
    payloadText(rawPayload, ['eventName', 'name']) ||
    (locked ? '워크북 요약' : '') ||
    eventCode
  const itemName =
    payloadText(rawPayload, ['supplyName', 'itemName', 'item', 'category']) ||
    fallbackDescription

  return {
    localId: entry.id || createEventSupplyRowId(),
    id: entry.id,
    eventName,
    eventCode,
    channel: entry.channel,
    occurredOn: entry.occurredOn,
    itemName,
    quantity: payloadNumberText(rawPayload, ['quantity', 'qty']) || '1',
    unitCost: payloadNumberText(rawPayload, ['unitCost', 'unit_cost']),
    amount: String(Math.round(entry.amount || 0)),
    vendor: payloadText(rawPayload, ['vendor', 'shop', 'supplier']),
    notes: payloadText(rawPayload, ['notes', 'memo']),
    source,
    rawPayload,
    isNew: false,
    dirty: false,
    locked,
  }
}

function ledgerRowHasInput(row: LedgerSheetRow) {
  return Boolean(row.amount.trim() || row.description.trim())
}

function eventSupplyRowHasInput(row: EventSupplySheetRow) {
  return Boolean(
    row.eventName.trim() ||
    row.eventCode.trim() ||
    row.itemName.trim() ||
    row.amount.trim() ||
    row.vendor.trim() ||
    row.notes.trim()
  )
}

function isEventCostCategory(category: string) {
  return ['event_labor', 'event_supply', 'workbook_event_supply'].includes(category)
}

function ledgerRowScope(row: LedgerSheetRow): 'revenue' | 'costs' | 'events' {
  if (row.kind === 'revenue') return 'revenue'
  if (isEventCostCategory(row.category)) return 'events'
  return 'costs'
}

function ledgerSourceForRow(row: LedgerSheetRow) {
  if (row.source && row.source !== 'manual') return row.source
  if (row.kind === 'revenue' && row.category === 'cash_sales') return 'cash'
  if (row.category === 'event_labor' || row.category === 'event_supply') return 'event_manual'
  return 'manual'
}

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] || category
}

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] || source || '수기'
}

function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
}

function formatCurrency(value: number) {
  return `₩${Math.round(value || 0).toLocaleString('ko-KR')}`
}

function formatNumber(value: number) {
  return Math.round(value || 0).toLocaleString('ko-KR')
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0.0%'
  return `${value.toFixed(1)}%`
}

function FinanceKpi({
  label,
  value,
  subValue,
  tone = 'slate',
}: {
  label: string
  value: string
  subValue: string
  tone?: 'slate' | 'emerald' | 'red' | 'blue'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${tones[tone]}`}>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{subValue}</p>
    </div>
  )
}

function MoneyInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string
  value: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-2 focus-within:border-slate-400">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value || 0))}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm font-bold text-slate-900 outline-none"
        />
        {suffix && <span className="text-xs font-bold text-slate-400">{suffix}</span>}
      </div>
    </label>
  )
}

function FinancePanelTabs({
  active,
  onChange,
  pending,
}: {
  active: FinancePanelTab
  onChange: (tab: FinancePanelTab) => void
  pending: {
    revenue: number
    costs: number
    events: number
  }
}) {
  const tabs: Array<{
    value: FinancePanelTab
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }> = [
    { value: 'overview', label: '손익 요약', icon: BarChart3 },
    { value: 'revenue', label: '매출입력', icon: Table2, badge: pending.revenue > 0 ? String(pending.revenue) : undefined },
    { value: 'costs', label: '비용입력', icon: FileSpreadsheet, badge: pending.costs > 0 ? String(pending.costs) : undefined },
    { value: 'events', label: '이벤트관리', icon: Package, badge: pending.events > 0 ? String(pending.events) : undefined },
    { value: 'settings', label: '설정', icon: Settings },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(({ value, label, icon: Icon, badge }) => {
          const selected = active === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-black transition-colors ${
                selected
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {badge && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FinanceOperationsPanel({ accessGranted }: { accessGranted: boolean }) {
  const [month, setMonth] = useState(getCurrentMonth)
  const [data, setData] = useState<FinanceResponse | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<FinanceMonthSettings>(DEFAULT_FINANCE_MONTH_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSource, setUploadSource] = useState('full_workbook')
  const [replaceExisting, setReplaceExisting] = useState(true)
  const [fileName, setFileName] = useState('')
  const [activePanelTab, setActivePanelTab] = useState<FinancePanelTab>('overview')
  const [payhereStatus, setPayhereStatus] = useState<PayhereSyncStatus | null>(null)
  const [payhereSelectedSources, setPayhereSelectedSources] = useState<PayhereSyncSource[]>(
    PAYHERE_SOURCE_OPTIONS.map((source) => source.source)
  )
  const [payhereReplaceExisting, setPayhereReplaceExisting] = useState(true)
  const [syncingPayhere, setSyncingPayhere] = useState(false)
  const [ledgerRows, setLedgerRows] = useState<LedgerSheetRow[]>(() =>
    [
      ...Array.from({ length: 4 }, () => blankLedgerRow(getCurrentMonth(), 'revenue')),
      ...Array.from({ length: 6 }, () => blankLedgerRow(getCurrentMonth(), 'cost')),
    ]
  )
  const [eventSupplyRows, setEventSupplyRows] = useState<EventSupplySheetRow[]>(() =>
    Array.from({ length: 4 }, () => blankEventSupplyRow(getCurrentMonth()))
  )
  const fileRef = useRef<HTMLInputElement | null>(null)

  const fetchFinance = useCallback(async () => {
    if (!accessGranted) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/cost-analysis/finance?month=${month}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '월별 재무 데이터를 불러오지 못했습니다')
      setData(result)
      setSettingsDraft(result.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : '월별 재무 데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [accessGranted, month])

  const fetchPayhereStatus = useCallback(async () => {
    if (!accessGranted) return
    try {
      const response = await fetch(`/api/admin/cost-analysis/finance/payhere-sync?month=${month}`, { cache: 'no-store' })
      if (!response.ok) return
      setPayhereStatus(await response.json())
    } catch {
      setPayhereStatus(null)
    }
  }, [accessGranted, month])

  useEffect(() => {
    fetchFinance()
    fetchPayhereStatus()
  }, [fetchFinance, fetchPayhereStatus])

  const totalFixed = useMemo(() => {
    return (
      settingsDraft.fixedRent +
      settingsDraft.fixedUtilities +
      settingsDraft.fixedTelecom +
      settingsDraft.fixedInsurance +
      settingsDraft.fixedOther
    )
  }, [settingsDraft])
  const payhereRevenueTotal = data
    ? data.summary.revenue.payhereWow + data.summary.revenue.payhereId + data.summary.revenue.payhereOnline
    : 0

  useEffect(() => {
    if (!data) return
    setLedgerRows([
      ...data.transactions.map((transaction) => ledgerRowFromTransaction(transaction)),
      ...data.manualEntries.map((entry) => ledgerRowFromEntry(entry)),
      ...Array.from({ length: 4 }, () => blankLedgerRow(month, 'revenue')),
      ...Array.from({ length: 6 }, () => blankLedgerRow(month, 'cost')),
    ])
    setEventSupplyRows([
      ...data.manualEntries
        .filter((entry) => entry.category === 'event_supply' || entry.category === 'workbook_event_supply')
        .map((entry) => eventSupplyRowFromEntry(entry)),
      ...Array.from({ length: 4 }, () => blankEventSupplyRow(month)),
    ])
  }, [data, month])

  const revenueLedgerRows = useMemo(
    () => ledgerRows.filter((row) => ledgerRowScope(row) === 'revenue'),
    [ledgerRows]
  )

  const costLedgerRows = useMemo(
    () => ledgerRows.filter((row) => ledgerRowScope(row) === 'costs'),
    [ledgerRows]
  )

  const revenueLedgerTotals = useMemo(() => {
    return revenueLedgerRows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0)
        if (Number.isFinite(amount) && amount > 0) {
          acc.total += amount
          acc.count += 1
        }
        if (row.dirty || (row.isNew && ledgerRowHasInput(row))) acc.pending += 1
        return acc
      },
      { total: 0, count: 0, pending: 0 }
    )
  }, [revenueLedgerRows])

  const costLedgerTotals = useMemo(() => {
    return costLedgerRows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0)
        if (Number.isFinite(amount) && amount > 0) {
          acc.total += amount
          acc.count += 1
        }
        if (row.dirty || (row.isNew && ledgerRowHasInput(row))) acc.pending += 1
        return acc
      },
      { total: 0, count: 0, pending: 0 }
    )
  }, [costLedgerRows])

  const eventSupplyTotals = useMemo(() => {
    return eventSupplyRows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0)
        if (Number.isFinite(amount) && amount > 0) {
          acc.total += amount
          acc.count += 1
        }
        if (row.dirty || (row.isNew && eventSupplyRowHasInput(row))) acc.pending += 1
        return acc
      },
      { total: 0, count: 0, pending: 0 }
    )
  }, [eventSupplyRows])

  const eventSupplyGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; code: string; amount: number; count: number }>()
    eventSupplyRows.forEach((row) => {
      const amount = Number(row.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) return
      const code = row.eventCode.trim()
      const label = row.eventName.trim() || code || '미분류 이벤트'
      const key = code || label
      const current = groups.get(key) || { key, label, code, amount: 0, count: 0 }
      current.amount += amount
      current.count += 1
      groups.set(key, current)
    })
    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount)
  }, [eventSupplyRows])

  const setSetting = (key: keyof FinanceMonthSettings, value: number | string) => {
    setSettingsDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateLedgerCell = (localId: string, patch: Partial<LedgerSheetRow>) => {
    setLedgerRows((rows) =>
      rows.map((row) => {
        if (row.localId !== localId || row.locked) return row
        return {
          ...row,
          ...patch,
          dirty: true,
        }
      })
    )
  }

  const addLedgerRows = (kind: LedgerKind, count = 5) => {
    setLedgerRows((rows) => [...rows, ...Array.from({ length: count }, () => blankLedgerRow(month, kind))])
  }

  const addEventSupplyRows = (count = 4) => {
    setEventSupplyRows((rows) => [...rows, ...Array.from({ length: count }, () => blankEventSupplyRow(month))])
  }

  const removeBlankLedgerRow = (localId: string, kind: LedgerKind) => {
    setLedgerRows((rows) => {
      const next = rows.filter((row) => row.localId !== localId)
      const editableBlankCount = next.filter((row) => row.kind === kind && row.isNew && !ledgerRowHasInput(row)).length
      if (editableBlankCount >= 2) return next
      return [...next, blankLedgerRow(month, kind)]
    })
  }

  const removeBlankEventSupplyRow = (localId: string) => {
    setEventSupplyRows((rows) => {
      const next = rows.filter((row) => row.localId !== localId)
      const editableBlankCount = next.filter((row) => row.isNew && !eventSupplyRowHasInput(row)).length
      if (editableBlankCount >= 2) return next
      return [...next, blankEventSupplyRow(month)]
    })
  }

  const entryPayloadFromLedgerRow = (row: LedgerSheetRow) => ({
    id: row.id,
    kind: row.kind,
    channel: row.channel,
    category: row.category || 'other',
    amount: Number(row.amount || 0),
    occurredOn: row.occurredOn || `${month}-01`,
    description: row.description,
    source: ledgerSourceForRow(row),
    rawPayload: row.rawPayload || {},
  })

  const updateEventSupplyCell = (localId: string, patch: Partial<EventSupplySheetRow>) => {
    setEventSupplyRows((rows) =>
      rows.map((row) => {
        if (row.localId !== localId || row.locked) return row
        const next = {
          ...row,
          ...patch,
          dirty: true,
        }
        if ('quantity' in patch || 'unitCost' in patch) {
          const quantity = Number(next.quantity || 0)
          const unitCost = Number(next.unitCost || 0)
          if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitCost) && unitCost > 0) {
            next.amount = String(Math.round(quantity * unitCost))
          }
        }
        return next
      })
    )
  }

  const entryPayloadFromEventSupplyRow = (row: EventSupplySheetRow) => {
    const eventName = row.eventName.trim()
    const eventCode = row.eventCode.trim()
    const itemName = row.itemName.trim()
    const quantity = Number(row.quantity || 0)
    const unitCost = Number(row.unitCost || 0)
    const amount = Number(row.amount || 0)
    const memoParts = [eventCode, eventName, itemName].filter(Boolean)

    return {
      id: row.id,
      kind: 'cost',
      channel: row.channel,
      category: 'event_supply',
      amount,
      occurredOn: row.occurredOn || `${month}-01`,
      description: `이벤트 준비물 · ${memoParts.join(' · ') || '미분류'}`,
      source: 'event_manual',
      rawPayload: {
        ...(row.rawPayload || {}),
        eventCode,
        eventName,
        supplyName: itemName,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitCost: Number.isFinite(unitCost) && unitCost > 0 ? unitCost : 0,
        vendor: row.vendor.trim(),
        notes: row.notes.trim(),
      },
    }
  }

  const saveLedgerRows = async (scope: 'revenue' | 'costs') => {
    const rowsToSave = ledgerRows.filter((row) => (
      ledgerRowScope(row) === scope &&
      !row.locked &&
      ledgerRowHasInput(row) &&
      (row.isNew || row.dirty)
    ))
    if (rowsToSave.length === 0) {
      setError('저장할 변경 행이 없습니다')
      return
    }

    const invalidRow = rowsToSave.find((row) => Number(row.amount || 0) <= 0)
    if (invalidRow) {
      setError('저장할 행에는 0보다 큰 금액이 필요합니다')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/cost-analysis/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-manual-ledger-rows',
          month,
          entries: rowsToSave.map((row) => entryPayloadFromLedgerRow(row)),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '입력 내용을 저장하지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '입력 내용을 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const saveEventSupplyRows = async () => {
    const rowsToSave = eventSupplyRows.filter((row) => !row.locked && eventSupplyRowHasInput(row) && (row.isNew || row.dirty))
    if (rowsToSave.length === 0) {
      setError('저장할 이벤트 준비물 행이 없습니다')
      return
    }

    const invalidRow = rowsToSave.find((row) => {
      const amount = Number(row.amount || 0)
      return !row.eventName.trim() || !row.itemName.trim() || !Number.isFinite(amount) || amount <= 0
    })
    if (invalidRow) {
      setError('이벤트 준비물 행에는 이벤트명, 준비물명, 0보다 큰 금액이 필요합니다')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/cost-analysis/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-manual-ledger-rows',
          month,
          entries: rowsToSave.map((row) => entryPayloadFromEventSupplyRow(row)),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '이벤트 준비물을 저장하지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '이벤트 준비물을 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/cost-analysis/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert-settings',
          month,
          settings: settingsDraft,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '월별 설정을 저장하지 못했습니다')
      setData(result)
      setSettingsDraft(result.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : '월별 설정을 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileName(file?.name || '')
  }

  const handleUpload = async (sourceOverride?: string) => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('업로드할 파일을 선택해 주세요')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      const source = sourceOverride || uploadSource
      body.set('file', file)
      body.set('source', source)
      body.set('month', month)
      body.set('replaceExisting', String(replaceExisting))

      const response = await fetch('/api/admin/cost-analysis/finance/import', {
        method: 'POST',
        body,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '파일 업로드 처리에 실패했습니다')

      if (fileRef.current) fileRef.current.value = ''
      setFileName('')
      await fetchFinance()
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 업로드 처리에 실패했습니다')
    } finally {
      setUploading(false)
    }
  }

  const togglePayhereSource = (source: PayhereSyncSource) => {
    setPayhereSelectedSources((sources) =>
      sources.includes(source) ? sources.filter((item) => item !== source) : [...sources, source]
    )
  }

  const handlePayhereSync = async () => {
    if (payhereSelectedSources.length === 0) {
      setError('동기화할 PAYHERE 매장을 선택해 주세요')
      return
    }

    setSyncingPayhere(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/cost-analysis/finance/payhere-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          sources: payhereSelectedSources,
          replaceExisting: payhereReplaceExisting,
        }),
      })
      const result = await response.json()
      if (result.status) setPayhereStatus(result.status)
      if (!response.ok) throw new Error(result.error || 'PAYHERE 매출을 불러오지 못했습니다')
      await fetchFinance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PAYHERE 매출을 불러오지 못했습니다')
    } finally {
      setSyncingPayhere(false)
    }
  }

  const deleteManualEntry = async (entryId: string) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/cost-analysis/finance?month=${month}&entryId=${entryId}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '수기 항목을 삭제하지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '수기 항목을 삭제하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const deleteLedgerRow = async (row: LedgerSheetRow) => {
    if (row.locked) return
    if (!row.id) {
      removeBlankLedgerRow(row.localId, row.kind)
      return
    }
    await deleteManualEntry(row.id)
  }

  const deleteEventSupplyRow = async (row: EventSupplySheetRow) => {
    if (row.locked) return
    if (!row.id) {
      removeBlankEventSupplyRow(row.localId)
      return
    }
    await deleteManualEntry(row.id)
  }

  const deleteImportedSource = async (source: string) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/cost-analysis/finance?month=${month}&source=${source}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '업로드 원장을 삭제하지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 원장을 삭제하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const saveSnapshot = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/cost-analysis/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snapshot-month', month }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '월마감 스냅샷을 저장하지 못했습니다')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '월마감 스냅샷을 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const payhereSourceStatuses = useMemo(() => {
    const statusBySource = new Map(payhereStatus?.sources.map((source) => [source.source, source]))
    return PAYHERE_SOURCE_OPTIONS.map((option) => {
      return statusBySource.get(option.source) || {
        source: option.source,
        label: option.label,
        configured: false,
        missing: payhereStatus ? [`${option.label} 매장 ID`] : ['상태 확인 중'],
      }
    })
  }, [payhereStatus])

  const selectedPayhereSourceStatuses = payhereSourceStatuses.filter((source) =>
    payhereSelectedSources.includes(source.source)
  )
  const payhereSelectedSourcesReady =
    selectedPayhereSourceStatuses.length > 0 && selectedPayhereSourceStatuses.every((source) => source.configured)
  const payhereCanSync = Boolean(
    data && !data.setupRequired && payhereStatus?.configured && payhereSelectedSourcesReady && !syncingPayhere
  )
  const payhereMissing = payhereStatus
    ? Array.from(new Set([
      ...payhereStatus.missing,
      ...selectedPayhereSourceStatuses.flatMap((source) => source.missing),
    ]))
    : ['상태 확인 중']

  const renderFileImportTools = (mode: 'revenue' | 'costs') => {
    const sourceOptions = mode === 'costs'
      ? IMPORT_SOURCE_OPTIONS.filter((option) => option.value === 'full_workbook')
      : IMPORT_SOURCE_OPTIONS
    const selectedSource = mode === 'costs' ? 'full_workbook' : uploadSource

    return (
    <div className="grid grid-cols-1 gap-3">
      <label className="block">
        <span className="text-xs font-black text-slate-500">파일 소스</span>
        <select
          value={selectedSource}
          onChange={(event) => setUploadSource(event.target.value)}
          disabled={mode === 'costs'}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-black text-slate-500">파일</span>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
      </label>
      <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(event) => setReplaceExisting(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        같은 월·소스 기존 업로드 교체
      </label>
      <button
        type="button"
        onClick={() => handleUpload(mode === 'costs' ? 'full_workbook' : undefined)}
        disabled={uploading || !data || data.setupRequired || !fileName}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        파일 반영
      </button>
    </div>
    )
  }

  const renderImportAssist = (mode: 'revenue' | 'costs') => (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-slate-500" />
        <h4 className="text-sm font-black text-slate-900">보조 입력</h4>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${mode === 'revenue' ? 'xl:grid-cols-2' : ''}`}>
        {mode === 'revenue' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">PAYHERE 자동입력</p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">
                  {payhereStatus?.configured ? 'API 연결 준비 완료' : 'API 연결 설정 대기'}
                </p>
              </div>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black ${
                payhereStatus?.configured
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {payhereStatus?.configured ? '준비됨' : '설정 필요'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {payhereSourceStatuses.map((source) => (
                <label
                  key={source.source}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-black ${
                    payhereSelectedSources.includes(source.source)
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-transparent bg-white/60 text-slate-500'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={payhereSelectedSources.includes(source.source)}
                      onChange={() => togglePayhereSource(source.source)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                    <span className="truncate">{source.label}</span>
                  </span>
                  <span className={source.configured ? 'text-emerald-600' : 'text-amber-600'}>
                    {source.configured ? 'OK' : '대기'}
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={payhereReplaceExisting}
                onChange={(event) => setPayhereReplaceExisting(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              같은 월·매장 기존 PAYHERE 원장 교체
            </label>

            {payhereMissing.length > 0 && !payhereCanSync && (
              <p className="mt-2 break-words text-[11px] font-bold text-amber-700">
                필요: {payhereMissing.join(', ')}
              </p>
            )}

            <button
              type="button"
              onClick={handlePayhereSync}
              disabled={!payhereCanSync}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {syncingPayhere ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              PAYHERE 불러오기
            </button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-3 text-sm font-black text-slate-900">파일로 입력</p>
          {renderFileImportTools(mode)}
          {data && data.importBatches.length > 0 && (
            <div className="mt-4 space-y-2">
              {data.importBatches.slice(0, 3).map((batch) => (
                <div key={batch.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-700">{batch.fileName || batch.source}</p>
                    <p className="text-[11px] font-bold text-slate-400">
                      {batch.source} · {formatNumber(batch.rowCount)}행 · {formatCurrency(batch.grossAmount)}
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderLedgerInputSection = ({
    scope,
    kind,
    title,
    rows,
    total,
    count,
    pending,
    categoryOptions,
    totalTone,
    helper,
  }: {
    scope: 'revenue' | 'costs'
    kind: LedgerKind
    title: string
    rows: LedgerSheetRow[]
    total: number
    count: number
    pending: number
    categoryOptions: Array<{ value: string; label: string }>
    totalTone: 'emerald' | 'red'
    helper: React.ReactNode
  }) => (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          {pending > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
              변경 {pending}행
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-3 py-2 text-xs font-black ${
            totalTone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            합계 {formatCurrency(total)}
          </span>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
            {formatNumber(count)}행
          </span>
          <button
            type="button"
            onClick={() => addLedgerRows(kind, kind === 'revenue' ? 4 : 5)}
            disabled={!data || data.setupRequired}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            행 추가
          </button>
          <button
            type="button"
            onClick={() => saveLedgerRows(scope)}
            disabled={saving || !data || data.setupRequired || pending === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-black text-slate-600">
              <th className="w-12 border-r border-slate-200 px-2 py-2 text-center">#</th>
              <th className="w-36 border-r border-slate-200 px-2 py-2">채널</th>
              <th className="w-40 border-r border-slate-200 px-2 py-2">카테고리</th>
              <th className="w-36 border-r border-slate-200 px-2 py-2">일자</th>
              <th className="w-36 border-r border-slate-200 px-2 py-2 text-right">금액</th>
              <th className="min-w-[280px] border-r border-slate-200 px-2 py-2">내용</th>
              <th className="w-28 border-r border-slate-200 px-2 py-2">출처</th>
              <th className="w-24 px-2 py-2 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const editableCategoryOptions = categoryOptions.some((option) => option.value === row.category)
                ? categoryOptions
                : [{ value: row.category, label: categoryLabel(row.category) }, ...categoryOptions]
              const cellClass = row.locked
                ? 'w-full bg-slate-50 px-2 py-2 text-sm font-bold text-slate-500 outline-none'
                : 'w-full bg-white px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:bg-blue-50'

              return (
                <tr
                  key={row.localId}
                  className={`border-t border-slate-200 ${row.dirty || (row.isNew && ledgerRowHasInput(row)) ? 'bg-blue-50/40' : 'bg-white'}`}
                >
                  <td className="border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-black text-slate-400">
                    {index + 1}
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    {row.locked ? (
                      <div className={cellClass}>{FINANCE_CHANNEL_LABELS[row.channel]}</div>
                    ) : (
                      <select
                        value={row.channel}
                        onChange={(event) => updateLedgerCell(row.localId, { channel: event.target.value as FinanceChannel })}
                        className={cellClass}
                      >
                        {CHANNEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    {row.locked ? (
                      <div className={cellClass}>{categoryLabel(row.category)}</div>
                    ) : (
                      <select
                        value={row.category}
                        onChange={(event) => updateLedgerCell(row.localId, { category: event.target.value })}
                        className={cellClass}
                      >
                        {editableCategoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input
                      type="date"
                      value={row.occurredOn}
                      disabled={row.locked}
                      onChange={(event) => updateLedgerCell(row.localId, { occurredOn: event.target.value })}
                      className={cellClass}
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input
                      type="number"
                      value={row.amount}
                      disabled={row.locked}
                      onChange={(event) => updateLedgerCell(row.localId, { amount: event.target.value })}
                      className={`${cellClass} text-right`}
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input
                      value={row.description}
                      disabled={row.locked}
                      onChange={(event) => updateLedgerCell(row.localId, { description: event.target.value })}
                      className={cellClass}
                    />
                  </td>
                  <td className="border-r border-slate-200 px-2 py-2 text-xs font-black text-slate-500">
                    {sourceLabel(ledgerSourceForRow(row))}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {row.locked ? (
                      <span className="text-xs font-black text-slate-300">잠금</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deleteLedgerRow(row)}
                        disabled={saving}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        title="행 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {helper}
    </section>
  )

  return (
    <section className="space-y-5">
      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-black text-slate-900">월별 재무 운영</h2>
              {data?.setupRequired ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  DB 설정 필요
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                  운영 가능
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">
              온라인 주문 자동 집계와 외부 매출 원장을 합쳐 월별 손익을 계산합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || getCurrentMonth())}
                className="bg-transparent text-sm font-black text-slate-900 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={fetchFinance}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              새로고침
            </button>
            <button
              type="button"
              onClick={saveSnapshot}
              disabled={saving || !data || data.setupRequired}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <LockKeyhole className="h-4 w-4" />
              월마감
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {data?.setupRequired && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            `supabase/migrations/20260613_finance_operations.sql` 마이그레이션을 적용하면 외부 매출 업로드와 수기 원장이 저장됩니다.
          </div>
        )}

        {data && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceKpi
              label="월 총매출"
              value={formatCurrency(data.summary.revenue.totalGross)}
              subValue={`네이버예약 ${formatCurrency(data.summary.revenue.naverBooking)} · PAYHERE ${formatCurrency(payhereRevenueTotal)} · 온라인몰 ${formatCurrency(data.summary.revenue.onlineSite)}`}
              tone="blue"
            />
            <FinanceKpi
              label="월 총비용"
              value={formatCurrency(data.summary.costs.total)}
              subValue={`재료 ${formatCurrency(data.summary.costs.product)} · 수수료 ${formatCurrency(data.summary.costs.fees)} · 직접 ${formatCurrency(data.summary.costs.manual)}`}
            />
            <FinanceKpi
              label="운영 순이익"
              value={formatCurrency(data.summary.profit)}
              subValue={`마진 ${formatPercent(data.summary.margin)}`}
              tone={data.summary.profit >= 0 ? 'emerald' : 'red'}
            />
            <FinanceKpi
              label="BEP 달성률"
              value={`${data.summary.bepAchievement.toFixed(2)}x`}
              subValue={`BEP ${formatCurrency(data.summary.bepRevenue)}`}
              tone={data.summary.bepAchievement >= 1 ? 'emerald' : 'red'}
            />
          </div>
        )}
      </div>

      {data && (
        <FinancePanelTabs
          active={activePanelTab}
          onChange={setActivePanelTab}
          pending={{
            revenue: revenueLedgerTotals.pending,
            costs: costLedgerTotals.pending,
            events: eventSupplyTotals.pending,
          }}
        />
      )}

      {data && activePanelTab === 'overview' && (
          <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                <h3 className="text-base font-black text-slate-900">매출원별 원장</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">온라인 주문 {formatNumber(data.onlineOrders.count)}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-black text-slate-500">
                    <th className="py-2 pr-3">소스</th>
                    <th className="py-2 pr-3 text-right">건수</th>
                    <th className="py-2 pr-3 text-right">매출</th>
                    <th className="py-2 pr-3 text-right">추정비용</th>
                    <th className="py-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.sourceRows.map((row) => (
                    <tr key={row.source} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-black text-slate-900">{row.label}</td>
                      <td className="py-3 pr-3 text-right text-slate-600">{formatNumber(row.count)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-slate-900">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-red-600">{formatCurrency(row.cost)}</td>
                      <td className="py-3 text-right">
                        {['payhere_wow', 'payhere_id', 'payhere_online', 'naver_booking'].includes(String(row.source)) && row.count > 0 && (
                          <button
                            type="button"
                            onClick={() => deleteImportedSource(String(row.source))}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

      )}

      {data && activePanelTab === 'revenue' && renderLedgerInputSection({
        scope: 'revenue',
        kind: 'revenue',
        title: '매출입력',
        rows: revenueLedgerRows,
        total: revenueLedgerTotals.total,
        count: revenueLedgerTotals.count,
        pending: revenueLedgerTotals.pending,
        categoryOptions: REVENUE_CATEGORY_OPTIONS,
        totalTone: 'emerald',
        helper: renderImportAssist('revenue'),
      })}

      {data && activePanelTab === 'costs' && renderLedgerInputSection({
        scope: 'costs',
        kind: 'cost',
        title: '비용입력',
        rows: costLedgerRows,
        total: costLedgerTotals.total,
        count: costLedgerTotals.count,
        pending: costLedgerTotals.pending,
        categoryOptions: COST_CATEGORY_OPTIONS,
        totalTone: 'red',
        helper: renderImportAssist('costs'),
      })}

      {data && activePanelTab === 'overview' && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
          <h3 className="mb-4 text-base font-black text-slate-900">채널별 손익</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.summary.channels.map((channel) => (
              <div key={channel.channel} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-black text-slate-900">{channel.label}</p>
                <p className="mt-2 text-xl font-black text-slate-900">{formatCurrency(channel.revenue)}</p>
                <div className="mt-3 space-y-1 text-xs font-bold text-slate-500">
                  <div className="flex justify-between gap-2">
                    <span>재료비</span>
                    <span>{formatCurrency(channel.productCost)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>수수료</span>
                    <span>{formatCurrency(channel.fees)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>직접/수기</span>
                    <span>{formatCurrency(channel.manualCost)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>고정/상시</span>
                    <span>{formatCurrency(channel.allocatedFixed + channel.labor)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>비용</span>
                    <span>{formatCurrency(channel.totalCost)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>순이익</span>
                    <span className={channel.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(channel.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>마진</span>
                    <span>{formatPercent(channel.margin)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && activePanelTab === 'events' && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-500" />
              <h3 className="text-base font-black text-slate-900">이벤트별 준비물</h3>
              {eventSupplyTotals.pending > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                  변경 {eventSupplyTotals.pending}행
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                준비물 {formatCurrency(eventSupplyTotals.total)}
              </span>
              <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                {formatNumber(eventSupplyTotals.count)}행
              </span>
              <button
                type="button"
                onClick={() => addEventSupplyRows(4)}
                disabled={data.setupRequired}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                행 추가
              </button>
              <button
                type="button"
                onClick={saveEventSupplyRows}
                disabled={saving || data.setupRequired || eventSupplyTotals.pending === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                준비물 저장
              </button>
            </div>
          </div>

          {eventSupplyGroups.length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {eventSupplyGroups.slice(0, 8).map((group) => (
                <div key={group.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="truncate text-xs font-black text-slate-700">{group.label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(group.amount)}</p>
                  <p className="text-[11px] font-bold text-slate-400">
                    {group.code ? `${group.code} · ` : ''}{formatNumber(group.count)}행
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-xs font-black text-slate-600">
                  <th className="w-12 border-r border-slate-200 px-2 py-2 text-center">#</th>
                  <th className="w-44 border-r border-slate-200 px-2 py-2">이벤트명</th>
                  <th className="w-28 border-r border-slate-200 px-2 py-2">코드</th>
                  <th className="w-32 border-r border-slate-200 px-2 py-2">채널</th>
                  <th className="w-36 border-r border-slate-200 px-2 py-2">일자</th>
                  <th className="min-w-[220px] border-r border-slate-200 px-2 py-2">준비물</th>
                  <th className="w-24 border-r border-slate-200 px-2 py-2 text-right">수량</th>
                  <th className="w-32 border-r border-slate-200 px-2 py-2 text-right">단가</th>
                  <th className="w-36 border-r border-slate-200 px-2 py-2 text-right">금액</th>
                  <th className="w-40 border-r border-slate-200 px-2 py-2">구매처</th>
                  <th className="min-w-[220px] border-r border-slate-200 px-2 py-2">메모</th>
                  <th className="w-24 px-2 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {eventSupplyRows.map((row, index) => {
                  const cellClass = row.locked
                    ? 'w-full bg-slate-50 px-2 py-2 text-sm font-bold text-slate-500 outline-none'
                    : 'w-full bg-white px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:bg-blue-50'

                  return (
                    <tr
                      key={row.localId}
                      className={`border-t border-slate-200 ${row.dirty || (row.isNew && eventSupplyRowHasInput(row)) ? 'bg-blue-50/40' : 'bg-white'}`}
                    >
                      <td className="border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-black text-slate-400">
                        {index + 1}
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          value={row.eventName}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { eventName: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          value={row.eventCode}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { eventCode: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        {row.locked ? (
                          <div className={cellClass}>{FINANCE_CHANNEL_LABELS[row.channel]}</div>
                        ) : (
                          <select
                            value={row.channel}
                            onChange={(event) => updateEventSupplyCell(row.localId, { channel: event.target.value as FinanceChannel })}
                            className={cellClass}
                          >
                            {CHANNEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="date"
                          value={row.occurredOn}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { occurredOn: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          value={row.itemName}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { itemName: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          value={row.quantity}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { quantity: event.target.value })}
                          className={`${cellClass} text-right`}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          value={row.unitCost}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { unitCost: event.target.value })}
                          className={`${cellClass} text-right`}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          value={row.amount}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { amount: event.target.value })}
                          className={`${cellClass} text-right`}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          value={row.vendor}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { vendor: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          value={row.notes}
                          disabled={row.locked}
                          onChange={(event) => updateEventSupplyCell(row.localId, { notes: event.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        {row.locked ? (
                          <span className="text-xs font-black text-slate-300">잠금</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => deleteEventSupplyRow(row)}
                            disabled={saving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                            title="행 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data && activePanelTab === 'settings' && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">월별 계산 설정</h3>
              <p className="mt-1 text-xs font-bold text-slate-400">월 고정비 {formatCurrency(totalFixed)}</p>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving || data.setupRequired}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              설정 저장
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyInput label="임차료" value={settingsDraft.fixedRent} onChange={(value) => setSetting('fixedRent', value)} />
            <MoneyInput label="전기/수도/가스" value={settingsDraft.fixedUtilities} onChange={(value) => setSetting('fixedUtilities', value)} />
            <MoneyInput label="인터넷/통신" value={settingsDraft.fixedTelecom} onChange={(value) => setSetting('fixedTelecom', value)} />
            <MoneyInput label="보험료" value={settingsDraft.fixedInsurance} onChange={(value) => setSetting('fixedInsurance', value)} />
            <MoneyInput label="기타 고정비" value={settingsDraft.fixedOther} onChange={(value) => setSetting('fixedOther', value)} />
            <MoneyInput label="아이디 상시 인건비" value={settingsDraft.idStaffLabor} onChange={(value) => setSetting('idStaffLabor', value)} />
            <MoneyInput label="이벤트 인건비" value={settingsDraft.eventStaffLabor} onChange={(value) => setSetting('eventStaffLabor', value)} />
            <MoneyInput label="네이버 수수료" suffix="%" value={settingsDraft.naverFeeRatePercent} onChange={(value) => setSetting('naverFeeRatePercent', value)} />
            <MoneyInput label="PAYHERE 수수료" suffix="%" value={settingsDraft.payhereFeeRatePercent} onChange={(value) => setSetting('payhereFeeRatePercent', value)} />
            <MoneyInput label="온라인 PG 수수료" suffix="%" value={settingsDraft.onlinePgFeeRatePercent} onChange={(value) => setSetting('onlinePgFeeRatePercent', value)} />
            <MoneyInput label="와우 고정비 배부" suffix="%" value={settingsDraft.wowFixedAllocationPercent} onChange={(value) => setSetting('wowFixedAllocationPercent', value)} />
            <MoneyInput label="아이디 고정비 배부" suffix="%" value={settingsDraft.idFixedAllocationPercent} onChange={(value) => setSetting('idFixedAllocationPercent', value)} />
          </div>
          <textarea
            value={settingsDraft.notes}
            onChange={(event) => setSetting('notes', event.target.value)}
            rows={2}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
            placeholder="월별 메모"
          />
        </section>
      )}
    </section>
  )
}
