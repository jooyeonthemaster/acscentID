export type FinanceSource =
  | 'online_site'
  | 'payhere_wow'
  | 'payhere_id'
  | 'payhere_online'
  | 'naver_booking'
  | 'cash'
  | 'manual'

export type FinanceChannel = 'wow_store' | 'id_store' | 'online_site' | 'shared' | 'unknown'
export type FinanceManualKind = 'revenue' | 'cost'

export interface FinanceMonthSettings {
  fixedRent: number
  fixedUtilities: number
  fixedTelecom: number
  fixedInsurance: number
  fixedOther: number
  wowFixedAllocationPercent: number
  idFixedAllocationPercent: number
  onlineFixedAllocationPercent: number
  idStaffLabor: number
  eventStaffLabor: number
  naverFeeRatePercent: number
  payhereFeeRatePercent: number
  onlinePgFeeRatePercent: number
  notes: string
}

export interface FinanceTransaction {
  id?: string
  month: string
  source: FinanceSource
  channel: FinanceChannel
  occurredOn: string
  externalId?: string | null
  status?: string | null
  itemName?: string | null
  optionText?: string | null
  rawDescription?: string | null
  quantity: number
  grossAmount: number
  paymentMethod?: string | null
  rawPayload?: Record<string, unknown>
}

export interface FinanceManualEntry {
  id?: string
  month: string
  kind: FinanceManualKind
  channel: FinanceChannel
  category: string
  amount: number
  occurredOn: string
  description: string
  source?: string
  rawPayload?: Record<string, unknown>
}

export interface FinanceImportBatch {
  id: string
  month: string
  source: string
  fileName: string | null
  rowCount: number
  grossAmount: number
  importedBy: string | null
  importedAt: string
  replacedExisting: boolean
}

export interface OnlineFinanceOrder {
  id: string
  createdAt: string
  status: string | null
  finalPrice: number
  shippingFee: number
  discountAmount: number
  paymentMethod: string | null
  items: OnlineFinanceItem[]
}

export interface OnlineFinanceItem {
  orderId: string
  productType: string | null
  size: string | null
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface FinanceChannelSummary {
  channel: FinanceChannel
  label: string
  revenue: number
  productCost: number
  fees: number
  manualCost: number
  allocatedFixed: number
  labor: number
  totalCost: number
  profit: number
  margin: number
  transactionCount: number
}

export interface FinanceSummary {
  revenue: {
    onlineSite: number
    naverBooking: number
    payhereWow: number
    payhereId: number
    payhereOnline: number
    cashManual: number
    manual: number
    totalGross: number
    discounts: number
    netRevenue: number
  }
  costs: {
    product: number
    fees: number
    fixed: number
    labor: number
    manual: number
    total: number
  }
  profit: number
  margin: number
  bepRevenue: number
  bepAchievement: number
  channels: FinanceChannelSummary[]
  sourceRows: Array<{
    source: FinanceSource | 'manual_cost' | 'manual_revenue'
    label: string
    revenue: number
    cost: number
    count: number
  }>
}

export const FINANCE_SOURCE_LABELS: Record<FinanceSource, string> = {
  online_site: '본 온라인 사이트',
  payhere_wow: 'PAYHERE 와우',
  payhere_id: 'PAYHERE 아이디',
  payhere_online: 'PAYHERE 온라인',
  naver_booking: '네이버예약',
  cash: '현금매출',
  manual: '수기입력',
}

export const FINANCE_CHANNEL_LABELS: Record<FinanceChannel, string> = {
  wow_store: '와우 매장',
  id_store: '아이디 매장',
  online_site: '온라인',
  shared: '공통',
  unknown: '미분류',
}

export const DEFAULT_FINANCE_MONTH_SETTINGS: FinanceMonthSettings = {
  fixedRent: 5_170_000,
  fixedUtilities: 200_000,
  fixedTelecom: 80_000,
  fixedInsurance: 15_000,
  fixedOther: 100_000,
  wowFixedAllocationPercent: 50,
  idFixedAllocationPercent: 50,
  onlineFixedAllocationPercent: 0,
  idStaffLabor: 2_100_000,
  eventStaffLabor: 0,
  naverFeeRatePercent: 1.8,
  payhereFeeRatePercent: 2.2,
  onlinePgFeeRatePercent: 3.52,
  notes: '',
}

const OFFLINE_PRODUCT_COSTS = {
  perfume10: 1_643,
  eventPerfume10: 1_642,
  perfume50: 4_896,
  eventPerfume50: 2_724,
  sachet: 534,
  ppudiOffline: 5_197,
}

const ONLINE_PRODUCT_COSTS = {
  perfume10: 5_067,
  perfume50: 8_301,
  ppudi: 9_363,
  sachet: 534,
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function safePercent(value: number) {
  return Number.isFinite(value) ? value / 100 : 0
}

function addTo<K extends string>(record: Record<K, number>, key: K, value: number) {
  record[key] = (record[key] || 0) + value
}

function sourceToChannel(source: FinanceSource): FinanceChannel {
  if (source === 'payhere_wow') return 'wow_store'
  if (source === 'payhere_id' || source === 'naver_booking') return 'id_store'
  if (source === 'payhere_online' || source === 'online_site') return 'online_site'
  return 'unknown'
}

function isCompletedTransaction(row: FinanceTransaction) {
  return row.grossAmount !== 0
}

function unitCount(amount: number, unitPrice: number) {
  if (!unitPrice) return 0
  const rounded = Math.round(amount / unitPrice)
  return rounded > 0 && Math.abs(rounded * unitPrice - amount) <= 1 ? rounded : 0
}

function classifyOfflineImportedCost(row: FinanceTransaction) {
  const amount = Math.abs(toNumber(row.grossAmount))
  const source = row.source
  const text = `${row.itemName || ''} ${row.optionText || ''} ${row.rawDescription || ''}`.toLowerCase()
  const eventCost50 = source === 'payhere_wow' || text.includes('이벤트') || text.includes('forget-me-not')
  const cost50 = eventCost50 ? OFFLINE_PRODUCT_COSTS.eventPerfume50 : OFFLINE_PRODUCT_COSTS.perfume50
  const cost10 = eventCost50 ? OFFLINE_PRODUCT_COSTS.eventPerfume10 : OFFLINE_PRODUCT_COSTS.perfume10
  const ppudiCost = source === 'payhere_online' ? ONLINE_PRODUCT_COSTS.ppudi : OFFLINE_PRODUCT_COSTS.ppudiOffline

  if (text.includes('뿌디') || text.includes('디퓨저')) {
    const count = row.quantity || unitCount(amount, 48_000) || 1
    return count * ppudiCost
  }

  if (text.includes('10ml')) {
    const count = row.quantity || unitCount(amount, 24_000) || 1
    return count * (source === 'payhere_online' ? ONLINE_PRODUCT_COSTS.perfume10 : cost10)
  }

  if (text.includes('50ml') || text.includes('향수')) {
    if (amount === 53_000 || amount === 63_000) return cost50 + OFFLINE_PRODUCT_COSTS.sachet
    if (amount === 78_000) return cost50 + OFFLINE_PRODUCT_COSTS.sachet * 2
    const count =
      row.quantity ||
      unitCount(amount, 38_000) ||
      unitCount(amount, 48_000) ||
      unitCount(amount, 76_000) * 2 ||
      unitCount(amount, 96_000) * 2 ||
      1
    return count * (source === 'payhere_online' ? ONLINE_PRODUCT_COSTS.perfume50 : cost50)
  }

  if (text.includes('사쉐') || text.includes('샤쉐') || text.includes('sachet')) {
    const count = row.quantity || unitCount(amount, 15_000) || unitCount(amount, 30_000) * 2 || 1
    return count * OFFLINE_PRODUCT_COSTS.sachet
  }

  if (amount === 15_000) return OFFLINE_PRODUCT_COSTS.sachet
  if (amount === 30_000) return OFFLINE_PRODUCT_COSTS.sachet * 2
  if (amount === 24_000) return cost10
  if (amount === 38_000 || amount === 48_000) return cost50
  if (amount === 53_000 || amount === 63_000) return cost50 + OFFLINE_PRODUCT_COSTS.sachet
  if (amount === 78_000) return cost50 + OFFLINE_PRODUCT_COSTS.sachet * 2

  return amount * 0.18
}

function onlineItemCost(item: OnlineFinanceItem) {
  const quantity = Math.max(1, toNumber(item.quantity))
  const productType = (item.productType || '').toLowerCase()
  const size = (item.size || '').toLowerCase()

  if (productType.includes('figure') || productType.includes('diffuser') || size.includes('뿌디')) {
    return ONLINE_PRODUCT_COSTS.ppudi * quantity
  }

  if (productType.includes('scent_paper') || size.includes('sachet') || size.includes('사쉐')) {
    return ONLINE_PRODUCT_COSTS.sachet * quantity
  }

  if (size.includes('10')) return ONLINE_PRODUCT_COSTS.perfume10 * quantity
  if (size.includes('50')) return ONLINE_PRODUCT_COSTS.perfume50 * quantity

  return Math.max(0, item.subtotal || item.unitPrice * quantity) * 0.2
}

function channelAllocation(settings: FinanceMonthSettings, channel: FinanceChannel) {
  if (channel === 'wow_store') return safePercent(settings.wowFixedAllocationPercent)
  if (channel === 'id_store') return safePercent(settings.idFixedAllocationPercent)
  if (channel === 'online_site') return safePercent(settings.onlineFixedAllocationPercent)
  return 0
}

export function normalizeFinanceMonth(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function monthKeyFromDate(value: string) {
  return normalizeFinanceMonth(value).slice(0, 7)
}

export function mergeFinanceSettings(value: Partial<FinanceMonthSettings> | null | undefined): FinanceMonthSettings {
  return {
    ...DEFAULT_FINANCE_MONTH_SETTINGS,
    ...(value || {}),
  }
}

export function calculateFinanceSummary({
  settings,
  transactions,
  manualEntries,
  onlineOrders,
}: {
  settings: FinanceMonthSettings
  transactions: FinanceTransaction[]
  manualEntries: FinanceManualEntry[]
  onlineOrders: OnlineFinanceOrder[]
}): FinanceSummary {
  const sourceRevenue: Record<FinanceSource, number> = {
    online_site: 0,
    payhere_wow: 0,
    payhere_id: 0,
    payhere_online: 0,
    naver_booking: 0,
    cash: 0,
    manual: 0,
  }
  const sourceCost: Record<FinanceSource | 'manual_cost' | 'manual_revenue', number> = {
    online_site: 0,
    payhere_wow: 0,
    payhere_id: 0,
    payhere_online: 0,
    naver_booking: 0,
    cash: 0,
    manual: 0,
    manual_cost: 0,
    manual_revenue: 0,
  }
  const sourceCount: Record<FinanceSource | 'manual_cost' | 'manual_revenue', number> = {
    online_site: 0,
    payhere_wow: 0,
    payhere_id: 0,
    payhere_online: 0,
    naver_booking: 0,
    cash: 0,
    manual: 0,
    manual_cost: 0,
    manual_revenue: 0,
  }

  const channelRevenue: Record<FinanceChannel, number> = {
    wow_store: 0,
    id_store: 0,
    online_site: 0,
    shared: 0,
    unknown: 0,
  }
  const channelProductCost: Record<FinanceChannel, number> = { ...channelRevenue }
  const channelFees: Record<FinanceChannel, number> = { ...channelRevenue }
  const channelManualCost: Record<FinanceChannel, number> = { ...channelRevenue }
  const productCostOverrides: Partial<Record<FinanceChannel, number>> = {}
  const feeOverrides: Partial<Record<FinanceChannel, number>> = {}

  let discounts = 0

  onlineOrders.forEach((order) => {
    const revenue = Math.max(0, toNumber(order.finalPrice))
    addTo(sourceRevenue, 'online_site', revenue)
    addTo(channelRevenue, 'online_site', revenue)
    sourceCount.online_site += 1
    discounts += toNumber(order.discountAmount)

    const productCost = order.items.reduce((sum, item) => sum + onlineItemCost(item), 0)
    const fee =
      order.paymentMethod && order.paymentMethod !== 'bank_transfer'
        ? revenue * safePercent(settings.onlinePgFeeRatePercent)
        : 0
    addTo(sourceCost, 'online_site', productCost + fee)
    addTo(channelProductCost, 'online_site', productCost)
    addTo(channelFees, 'online_site', fee)
  })

  transactions.filter(isCompletedTransaction).forEach((row) => {
    const source = row.source
    const revenue = Math.max(0, toNumber(row.grossAmount))
    const channel = row.channel || sourceToChannel(source)
    const productCost = classifyOfflineImportedCost(row)
    const feeRate =
      source === 'naver_booking'
        ? settings.naverFeeRatePercent
        : source === 'payhere_wow' || source === 'payhere_id' || source === 'payhere_online'
          ? settings.payhereFeeRatePercent
          : 0
    const fee = revenue * safePercent(feeRate)

    addTo(sourceRevenue, source, revenue)
    addTo(sourceCost, source, productCost + fee)
    addTo(sourceCount, source, 1)
    addTo(channelRevenue, channel, revenue)
    addTo(channelProductCost, channel, productCost)
    addTo(channelFees, channel, fee)
  })

  manualEntries.forEach((entry) => {
    const amount = Math.max(0, toNumber(entry.amount))
    if (entry.kind === 'cost' && entry.category === 'workbook_product_cost_override') {
      addTo(productCostOverrides as Record<FinanceChannel, number>, entry.channel, amount)
      return
    }
    if (entry.kind === 'cost' && entry.category === 'workbook_fee_override') {
      addTo(feeOverrides as Record<FinanceChannel, number>, entry.channel, amount)
      return
    }

    if (entry.kind === 'revenue') {
      const sourceKey = entry.source === 'cash' ? 'cash' : 'manual'
      addTo(sourceRevenue, sourceKey, amount)
      addTo(sourceCount, sourceKey, 1)
      addTo(sourceCount, 'manual_revenue', 1)
      addTo(channelRevenue, entry.channel, amount)
    } else {
      addTo(sourceCost, 'manual_cost', amount)
      addTo(sourceCount, 'manual_cost', 1)
      addTo(channelManualCost, entry.channel, amount)
    }
  })

  if (Object.keys(productCostOverrides).length > 0) {
    ;(['wow_store', 'id_store', 'online_site'] as FinanceChannel[]).forEach((channel) => {
      channelProductCost[channel] = productCostOverrides[channel] || 0
    })
  }

  if (Object.keys(feeOverrides).length > 0) {
    ;(['wow_store', 'id_store', 'online_site'] as FinanceChannel[]).forEach((channel) => {
      channelFees[channel] = feeOverrides[channel] || 0
    })
  }

  const fixed =
    settings.fixedRent +
    settings.fixedUtilities +
    settings.fixedTelecom +
    settings.fixedInsurance +
    settings.fixedOther
  const labor = settings.idStaffLabor + settings.eventStaffLabor
  const grossRevenue = Object.values(sourceRevenue).reduce((sum, value) => sum + value, 0)
  const product = Object.values(channelProductCost).reduce((sum, value) => sum + value, 0)
  const fees = Object.values(channelFees).reduce((sum, value) => sum + value, 0)
  const manualCost = Object.values(channelManualCost).reduce((sum, value) => sum + value, 0)
  const totalCost = product + fees + fixed + labor + manualCost
  const profit = grossRevenue - totalCost
  const contributionMargin = grossRevenue > 0 ? (grossRevenue - product - fees - manualCost) / grossRevenue : 0
  const bepRevenue = contributionMargin > 0 ? (fixed + labor) / contributionMargin : 0

  const channels: FinanceChannelSummary[] = (['wow_store', 'id_store', 'online_site', 'shared', 'unknown'] as FinanceChannel[])
    .map((channel) => {
      const allocatedFixed = fixed * channelAllocation(settings, channel)
      const channelLabor =
        channel === 'id_store'
          ? settings.idStaffLabor
          : channel === 'wow_store'
            ? settings.eventStaffLabor
            : 0
      const revenue = channelRevenue[channel]
      const productCost = channelProductCost[channel]
      const feesForChannel = channelFees[channel]
      const manualCostForChannel = channelManualCost[channel]
      const total = productCost + feesForChannel + manualCostForChannel + allocatedFixed + channelLabor
      const channelProfit = revenue - total

      return {
        channel,
        label: FINANCE_CHANNEL_LABELS[channel],
        revenue,
        productCost,
        fees: feesForChannel,
        manualCost: manualCostForChannel,
        allocatedFixed,
        labor: channelLabor,
        totalCost: total,
        profit: channelProfit,
        margin: revenue > 0 ? (channelProfit / revenue) * 100 : 0,
        transactionCount:
          transactions.filter((row) => (row.channel || sourceToChannel(row.source)) === channel).length +
          onlineOrders.filter(() => channel === 'online_site').length +
          manualEntries.filter((entry) => entry.channel === channel).length,
      }
    })
    .filter((row) => row.revenue !== 0 || row.totalCost !== 0 || row.transactionCount !== 0)

  const sourceRows: FinanceSummary['sourceRows'] = (Object.keys(FINANCE_SOURCE_LABELS) as FinanceSource[]).map((source) => ({
    source,
    label: FINANCE_SOURCE_LABELS[source],
    revenue: sourceRevenue[source],
    cost: sourceCost[source],
    count: sourceCount[source],
  }))

  sourceRows.push({
    source: 'manual_cost',
    label: '직접/수기 비용',
    revenue: 0,
    cost: sourceCost.manual_cost,
    count: sourceCount.manual_cost,
  })

  return {
    revenue: {
      onlineSite: sourceRevenue.online_site,
      naverBooking: sourceRevenue.naver_booking,
      payhereWow: sourceRevenue.payhere_wow,
      payhereId: sourceRevenue.payhere_id,
      payhereOnline: sourceRevenue.payhere_online,
      cashManual: sourceRevenue.cash,
      manual: sourceRevenue.manual,
      totalGross: grossRevenue,
      discounts,
      netRevenue: grossRevenue,
    },
    costs: {
      product,
      fees,
      fixed,
      labor,
      manual: manualCost,
      total: totalCost,
    },
    profit,
    margin: grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0,
    bepRevenue,
    bepAchievement: bepRevenue > 0 ? grossRevenue / bepRevenue : 0,
    channels,
    sourceRows,
  }
}
