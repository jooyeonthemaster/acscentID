import crypto from 'crypto'
import {
  normalizeFinanceMonth,
  type FinanceChannel,
  type FinanceSource,
  type FinanceTransaction,
} from './finance-core'

export type PayhereSyncSource = Extract<FinanceSource, 'payhere_wow' | 'payhere_id' | 'payhere_online'>

interface PayhereSourceConfig {
  source: PayhereSyncSource
  label: string
  channel: FinanceChannel
  storeEnv: string
}

interface PayhereFetchConfig {
  apiBaseUrl: string
  endpointTemplate: string
  authHeaderName: string
  authHeaderValue: string
  maxPages: number
}

export class PayhereConfigurationError extends Error {
  status: PayhereSyncStatus

  constructor(status: PayhereSyncStatus) {
    super('PAYHERE API 설정이 아직 완료되지 않았습니다')
    this.name = 'PayhereConfigurationError'
    this.status = status
  }
}

const PAYHERE_SOURCES: PayhereSourceConfig[] = [
  {
    source: 'payhere_wow',
    label: 'PAYHERE 와우',
    channel: 'wow_store',
    storeEnv: 'PAYHERE_WOW_STORE_ID',
  },
  {
    source: 'payhere_id',
    label: 'PAYHERE 아이디',
    channel: 'id_store',
    storeEnv: 'PAYHERE_ID_STORE_ID',
  },
  {
    source: 'payhere_online',
    label: 'PAYHERE 온라인',
    channel: 'online_site',
    storeEnv: 'PAYHERE_ONLINE_STORE_ID',
  },
]

export interface PayhereSyncStatus {
  configured: boolean
  missing: string[]
  sources: Array<{
    source: PayhereSyncSource
    label: string
    configured: boolean
    missing: string[]
  }>
}

export interface PayhereSyncResult {
  transactions: FinanceTransaction[]
  sourceRows: Array<{
    source: PayhereSyncSource
    label: string
    count: number
    grossAmount: number
  }>
  status: PayhereSyncStatus
}

function env(name: string) {
  return process.env[name]?.trim() || ''
}

function getAuthHeaderValue() {
  const explicit = env('PAYHERE_AUTH_HEADER_VALUE')
  if (explicit) return explicit

  const token = env('PAYHERE_API_KEY') || env('PAYHERE_ACCESS_TOKEN')
  if (!token) return ''

  const scheme = env('PAYHERE_AUTH_SCHEME') || 'Bearer'
  return `${scheme} ${token}`
}

function getFetchConfig(): PayhereFetchConfig | null {
  const apiBaseUrl = env('PAYHERE_API_BASE_URL')
  const endpointTemplate = env('PAYHERE_SALES_ENDPOINT_TEMPLATE')
  const authHeaderValue = getAuthHeaderValue()

  if (!apiBaseUrl || !endpointTemplate || !authHeaderValue) return null

  const maxPages = Number(env('PAYHERE_MAX_PAGES') || 5)
  return {
    apiBaseUrl,
    endpointTemplate,
    authHeaderName: env('PAYHERE_AUTH_HEADER_NAME') || 'Authorization',
    authHeaderValue,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 5,
  }
}

export function getPayhereSyncStatus(): PayhereSyncStatus {
  const missing = []
  if (!env('PAYHERE_API_BASE_URL')) missing.push('PAYHERE_API_BASE_URL')
  if (!env('PAYHERE_SALES_ENDPOINT_TEMPLATE')) missing.push('PAYHERE_SALES_ENDPOINT_TEMPLATE')
  if (!getAuthHeaderValue()) missing.push('PAYHERE_API_KEY 또는 PAYHERE_ACCESS_TOKEN')

  const sources = PAYHERE_SOURCES.map((source) => {
    const sourceMissing = env(source.storeEnv) ? [] : [source.storeEnv]
    return {
      source: source.source,
      label: source.label,
      configured: sourceMissing.length === 0,
      missing: sourceMissing,
    }
  })

  return {
    configured: missing.length === 0 && sources.some((source) => source.configured),
    missing,
    sources,
  }
}

function addMonths(month: string, count: number) {
  const [year, monthNumber] = month.slice(0, 7).split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1))
  return date.toISOString().slice(0, 10)
}

function formatEndpoint(template: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, encodeURIComponent(String(value)))
  }, template)
}

function buildUrl(config: PayhereFetchConfig, params: Record<string, string | number>) {
  const formatted = formatEndpoint(config.endpointTemplate, params)
  if (/^https?:\/\//i.test(formatted)) return formatted

  const base = config.apiBaseUrl.replace(/\/+$/, '')
  const path = formatted.startsWith('/') ? formatted : `/${formatted}`
  return `${base}${path}`
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function firstValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
  }
  return null
}

function toText(value: unknown) {
  return String(value ?? '').trim()
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = toText(value).replace(/[^\d.-]/g, '')
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function toIsoDate(value: unknown, fallback: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }

  const text = toText(value)
  if (!text) return fallback

  const iso = text.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return fallback
}

function stableExternalId(parts: unknown[]) {
  return crypto
    .createHash('sha1')
    .update(parts.map((part) => toText(part)).join('|'))
    .digest('hex')
}

function findFirstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = toRecord(value)

  const directKeys = ['data', 'items', 'results', 'sales', 'orders', 'payments', 'transactions', 'list', 'content']
  for (const key of directKeys) {
    const direct = record[key]
    if (Array.isArray(direct)) return direct
  }

  for (const nested of Object.values(record)) {
    const nestedRecord = toRecord(nested)
    for (const key of directKeys) {
      const direct = nestedRecord[key]
      if (Array.isArray(direct)) return direct
    }
  }

  return []
}

function nextPageFromResponse(value: unknown, currentPage: number) {
  const record = toRecord(value)
  const next = firstValue(record, ['nextPage', 'next_page', 'pageNext'])
  if (next) return Number(next)

  const pagination = toRecord(firstValue(record, ['pagination', 'page', 'meta']))
  const nestedNext = firstValue(pagination, ['nextPage', 'next_page'])
  if (nestedNext) return Number(nestedNext)

  const hasNext = Boolean(firstValue(record, ['hasNext', 'has_next']))
  if (hasNext) return currentPage + 1

  return null
}

function itemDescription(row: Record<string, unknown>) {
  const direct = firstValue(row, [
    'rawDescription',
    'description',
    'productName',
    'product_name',
    'itemName',
    'item_name',
    'orderName',
    'order_name',
    'name',
    'memo',
  ])
  if (direct) return toText(direct)

  const items = firstValue(row, ['items', 'products', 'orderItems', 'order_items'])
  if (Array.isArray(items)) {
    return items
      .map((item) => {
        const itemRecord = toRecord(item)
        return toText(firstValue(itemRecord, ['name', 'productName', 'product_name', 'itemName', 'item_name']))
      })
      .filter(Boolean)
      .join(', ')
  }

  return ''
}

function payhereRowToTransaction({
  row,
  index,
  month,
  source,
  channel,
  storeId,
}: {
  row: unknown
  index: number
  month: string
  source: PayhereSyncSource
  channel: FinanceChannel
  storeId: string
}): FinanceTransaction | null {
  const record = toRecord(row)
  if (Object.keys(record).length === 0) return null

  const amount = Math.round(toNumber(firstValue(record, [
    'grossAmount',
    'gross_amount',
    'totalAmount',
    'total_amount',
    'paymentAmount',
    'payment_amount',
    'paidAmount',
    'paid_amount',
    'saleAmount',
    'sale_amount',
    'amount',
    'total',
    'price',
  ])))
  if (!amount) return null

  const occurredOn = toIsoDate(firstValue(record, [
    'occurredOn',
    'occurred_on',
    'paidAt',
    'paid_at',
    'paymentDate',
    'payment_date',
    'createdAt',
    'created_at',
    'soldAt',
    'sold_at',
    'date',
    'orderDate',
    'order_date',
  ]), month)

  const rawDescription = itemDescription(record)
  const explicitId = firstValue(record, [
    'id',
    'paymentId',
    'payment_id',
    'transactionId',
    'transaction_id',
    'orderId',
    'order_id',
    'receiptNo',
    'receipt_no',
    'receiptNumber',
    'receipt_number',
  ])
  const externalId = explicitId
    ? toText(explicitId)
    : stableExternalId([source, storeId, occurredOn, amount, rawDescription, index])

  return {
    month,
    source,
    channel,
    occurredOn,
    externalId,
    status: toText(firstValue(record, ['status', 'state', 'orderStatus', 'order_status'])) || null,
    itemName: rawDescription || null,
    optionText: toText(firstValue(record, ['option', 'optionText', 'option_text'])) || null,
    rawDescription,
    quantity: toNumber(firstValue(record, ['quantity', 'qty', 'count'])) || 1,
    grossAmount: amount,
    paymentMethod: toText(firstValue(record, ['paymentMethod', 'payment_method', 'method', 'payMethod', 'pay_method'])) || 'payhere',
    rawPayload: {
      provider: 'payhere',
      storeId,
      source,
      row: record,
    },
  }
}

async function fetchSourceRows(config: PayhereFetchConfig, sourceConfig: PayhereSourceConfig, month: string) {
  const storeId = env(sourceConfig.storeEnv)
  if (!storeId) return []

  const startDate = month
  const endDate = addMonths(month, 1)
  const rows: unknown[] = []

  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = buildUrl(config, {
      storeId,
      source: sourceConfig.source,
      startDate,
      endDate,
      from: startDate,
      to: endDate,
      page,
    })
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        [config.authHeaderName]: config.authHeaderValue,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`PAYHERE ${sourceConfig.label} API 호출 실패 (${response.status}): ${body.slice(0, 500)}`)
    }

    const json = await response.json()
    rows.push(...findFirstArray(json))

    const nextPage = nextPageFromResponse(json, page)
    if (!nextPage || !Number.isFinite(nextPage) || nextPage <= page) break
  }

  return rows
    .map((row, index) => payhereRowToTransaction({
      row,
      index,
      month,
      source: sourceConfig.source,
      channel: sourceConfig.channel,
      storeId,
    }))
    .filter((row): row is FinanceTransaction => Boolean(row))
}

export async function fetchPayhereTransactions({
  month,
  sources,
}: {
  month: string
  sources: PayhereSyncSource[]
}): Promise<PayhereSyncResult> {
  const normalizedMonth = normalizeFinanceMonth(month)
  const status = getPayhereSyncStatus()
  const config = getFetchConfig()
  if (!config || !status.configured) throw new PayhereConfigurationError(status)

  const selected = PAYHERE_SOURCES.filter((source) => sources.includes(source.source))
  const sourceRows: PayhereSyncResult['sourceRows'] = []
  const transactions: FinanceTransaction[] = []

  for (const sourceConfig of selected) {
    const rows = await fetchSourceRows(config, sourceConfig, normalizedMonth)
    transactions.push(...rows)
    sourceRows.push({
      source: sourceConfig.source,
      label: sourceConfig.label,
      count: rows.length,
      grossAmount: rows.reduce((sum, row) => sum + Math.round(row.grossAmount), 0),
    })
  }

  return {
    transactions,
    sourceRows,
    status,
  }
}

export const PAYHERE_SYNC_SOURCES = PAYHERE_SOURCES.map(({ source, label }) => ({ source, label }))
