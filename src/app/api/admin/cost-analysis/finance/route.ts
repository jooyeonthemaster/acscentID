import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { hasCostAnalysisAccess } from '@/lib/admin/cost-analysis-access'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  calculateFinanceSummary,
  DEFAULT_FINANCE_MONTH_SETTINGS,
  mergeFinanceSettings,
  normalizeFinanceMonth,
  type FinanceChannel,
  type FinanceImportBatch,
  type FinanceManualEntry,
  type FinanceMonthSettings,
  type FinanceTransaction,
  type OnlineFinanceItem,
  type OnlineFinanceOrder,
} from '@/lib/admin/finance-core'

const TIME_ZONE = 'Asia/Seoul'
const PAID_STATUSES = ['paid', 'preparing', 'shipping', 'delivered']

function isMissingFinanceTable(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .*finance_/i.test(error.message || '') ||
    /could not find the table .*finance_/i.test(error.message || '')
  )
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0)
}

function addMonths(month: string, count: number) {
  const [year, monthNumber] = month.slice(0, 7).split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1))
  return date.toISOString().slice(0, 10)
}

function toKoreaBoundaryIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString()
}

function getDefaultMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
}

function dbSettingsToClient(row: Record<string, unknown> | null): FinanceMonthSettings {
  if (!row) return DEFAULT_FINANCE_MONTH_SETTINGS
  return mergeFinanceSettings({
    fixedRent: toNumber(row.fixed_rent),
    fixedUtilities: toNumber(row.fixed_utilities),
    fixedTelecom: toNumber(row.fixed_telecom),
    fixedInsurance: toNumber(row.fixed_insurance),
    fixedOther: toNumber(row.fixed_other),
    wowFixedAllocationPercent: toNumber(row.wow_fixed_allocation_percent),
    idFixedAllocationPercent: toNumber(row.id_fixed_allocation_percent),
    onlineFixedAllocationPercent: toNumber(row.online_fixed_allocation_percent),
    idStaffLabor: toNumber(row.id_staff_labor),
    eventStaffLabor: toNumber(row.event_staff_labor),
    naverFeeRatePercent: toNumber(row.naver_fee_rate_percent),
    payhereFeeRatePercent: toNumber(row.payhere_fee_rate_percent),
    onlinePgFeeRatePercent: toNumber(row.online_pg_fee_rate_percent),
    notes: String(row.notes || ''),
  })
}

function settingsToDb(month: string, settings: FinanceMonthSettings, updatedBy: string) {
  return {
    month,
    fixed_rent: Math.round(settings.fixedRent),
    fixed_utilities: Math.round(settings.fixedUtilities),
    fixed_telecom: Math.round(settings.fixedTelecom),
    fixed_insurance: Math.round(settings.fixedInsurance),
    fixed_other: Math.round(settings.fixedOther),
    wow_fixed_allocation_percent: settings.wowFixedAllocationPercent,
    id_fixed_allocation_percent: settings.idFixedAllocationPercent,
    online_fixed_allocation_percent: settings.onlineFixedAllocationPercent,
    id_staff_labor: Math.round(settings.idStaffLabor),
    event_staff_labor: Math.round(settings.eventStaffLabor),
    naver_fee_rate_percent: settings.naverFeeRatePercent,
    payhere_fee_rate_percent: settings.payhereFeeRatePercent,
    online_pg_fee_rate_percent: settings.onlinePgFeeRatePercent,
    notes: settings.notes || '',
    updated_by: updatedBy,
  }
}

function dbTransactionToClient(row: Record<string, unknown>): FinanceTransaction {
  return {
    id: String(row.id),
    month: String(row.month),
    source: row.source as FinanceTransaction['source'],
    channel: row.channel as FinanceChannel,
    occurredOn: String(row.occurred_on),
    externalId: row.external_id ? String(row.external_id) : null,
    status: row.status ? String(row.status) : null,
    itemName: row.item_name ? String(row.item_name) : null,
    optionText: row.option_text ? String(row.option_text) : null,
    rawDescription: row.raw_description ? String(row.raw_description) : null,
    quantity: toNumber(row.quantity) || 1,
    grossAmount: toNumber(row.gross_amount),
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    rawPayload: (row.raw_payload || {}) as Record<string, unknown>,
  }
}

function dbManualEntryToClient(row: Record<string, unknown>): FinanceManualEntry {
  return {
    id: String(row.id),
    month: String(row.month),
    kind: row.kind as FinanceManualEntry['kind'],
    channel: row.channel as FinanceChannel,
    category: String(row.category || ''),
    amount: toNumber(row.amount),
    occurredOn: String(row.occurred_on),
    description: String(row.description || ''),
    source: String(row.source || 'manual'),
    rawPayload: (row.raw_payload || {}) as Record<string, unknown>,
  }
}

function dbBatchToClient(row: Record<string, unknown>): FinanceImportBatch {
  return {
    id: String(row.id),
    month: String(row.month),
    source: String(row.source),
    fileName: row.file_name ? String(row.file_name) : null,
    rowCount: toNumber(row.row_count),
    grossAmount: toNumber(row.gross_amount),
    importedBy: row.imported_by ? String(row.imported_by) : null,
    importedAt: String(row.imported_at),
    replacedExisting: Boolean(row.replaced_existing),
  }
}

async function fetchOnlineOrders(month: string): Promise<OnlineFinanceOrder[]> {
  const supabase = createServiceRoleClient()
  const startIso = toKoreaBoundaryIso(month)
  const endIso = toKoreaBoundaryIso(addMonths(month, 1))

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status, final_price, shipping_fee, discount_amount, payment_method, refund_amount, is_influencer')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[finance] online orders skipped:', error.message)
    return []
  }

  const paidOrders = (orders || []).filter((order) => {
    if (order.is_influencer) return false
    return order.status ? PAID_STATUSES.includes(order.status) : false
  })

  const orderIds = paidOrders.map((order) => order.id)
  let itemsByOrder: Record<string, OnlineFinanceItem[]> = {}

  if (orderIds.length > 0) {
    const { data: items, error: itemError } = await supabase
      .from('order_items')
      .select('order_id, product_type, size, unit_price, quantity, subtotal')
      .in('order_id', orderIds)

    if (!itemError && items) {
      itemsByOrder = items.reduce((acc, item) => {
        const orderId = String(item.order_id)
        if (!acc[orderId]) acc[orderId] = []
        acc[orderId].push({
          orderId,
          productType: item.product_type,
          size: item.size,
          unitPrice: toNumber(item.unit_price),
          quantity: toNumber(item.quantity) || 1,
          subtotal: toNumber(item.subtotal),
        })
        return acc
      }, {} as Record<string, OnlineFinanceItem[]>)
    }
  }

  return paidOrders.map((order) => ({
    id: String(order.id),
    createdAt: String(order.created_at),
    status: order.status,
    finalPrice: Math.max(0, toNumber(order.final_price) - toNumber(order.refund_amount)),
    shippingFee: toNumber(order.shipping_fee),
    discountAmount: toNumber(order.discount_amount),
    paymentMethod: order.payment_method,
    items: itemsByOrder[String(order.id)] || [],
  }))
}

async function buildFinancePayload(monthInput?: string | null) {
  const month = normalizeFinanceMonth(monthInput || getDefaultMonth())
  const supabase = createServiceRoleClient()
  let setupRequired = false

  const [{ data: settingsRow, error: settingsError }, { data: transactionsRows, error: transactionsError }, { data: manualRows, error: manualError }, { data: batchRows, error: batchError }, onlineOrders] =
    await Promise.all([
      supabase.from('finance_month_settings').select('*').eq('month', month).maybeSingle(),
      supabase.from('finance_transactions').select('*').eq('month', month).order('occurred_on', { ascending: false }).limit(5000),
      supabase.from('finance_manual_entries').select('*').eq('month', month).order('occurred_on', { ascending: false }).limit(1000),
      supabase.from('finance_import_batches').select('*').eq('month', month).order('imported_at', { ascending: false }).limit(30),
      fetchOnlineOrders(month),
    ])

  if (isMissingFinanceTable(settingsError) || isMissingFinanceTable(transactionsError) || isMissingFinanceTable(manualError) || isMissingFinanceTable(batchError)) {
    setupRequired = true
  }

  const settings = dbSettingsToClient(settingsRow as Record<string, unknown> | null)
  const transactions = transactionsError ? [] : (transactionsRows || []).map((row) => dbTransactionToClient(row as Record<string, unknown>))
  const manualEntries = manualError ? [] : (manualRows || []).map((row) => dbManualEntryToClient(row as Record<string, unknown>))
  const importBatches = batchError ? [] : (batchRows || []).map((row) => dbBatchToClient(row as Record<string, unknown>))
  const summary = calculateFinanceSummary({ settings, transactions, manualEntries, onlineOrders })

  return {
    month,
    monthKey: month.slice(0, 7),
    range: {
      start: month,
      end: addMonths(month, 1),
      timeZone: TIME_ZONE,
    },
    setupRequired,
    settings,
    summary,
    transactions,
    manualEntries,
    importBatches,
    onlineOrders: {
      count: onlineOrders.length,
      revenue: summary.revenue.onlineSite,
    },
    automationNotes: [
      '본 온라인 사이트 매출은 orders/order_items에서 자동 집계합니다.',
      'PAYHERE는 API 자동 동기화 또는 엑셀/CSV 업로드로 원장화하며, 네이버예약은 엑셀/CSV 업로드로 반영합니다.',
      '전체 원가계산 워크북을 업로드하면 페이히어/네이버예약 입력 시트와 이벤트 인건비·준비물까지 함께 반영합니다.',
    ],
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    if (!hasCostAnalysisAccess(request)) {
      return NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    return NextResponse.json(await buildFinancePayload(searchParams.get('month')))
  } catch (error) {
    console.error('[finance] GET error:', error)
    return NextResponse.json({ error: '월별 재무 데이터를 불러오지 못했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    if (!hasCostAnalysisAccess(request)) {
      return NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const action = String(body.action || '')
    const month = normalizeFinanceMonth(body.month || getDefaultMonth())
    const supabase = createServiceRoleClient()

    if (action === 'upsert-settings') {
      const settings = mergeFinanceSettings(body.settings || {})
      const { error } = await supabase
        .from('finance_month_settings')
        .upsert(settingsToDb(month, settings, admin.email), { onConflict: 'month' })

      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    if (action === 'create-manual-entry') {
      const entry = body.entry || {}
      const amount = Math.round(toNumber(entry.amount))
      if (!amount || amount < 0) {
        return NextResponse.json({ error: '금액을 입력해 주세요' }, { status: 400 })
      }

      const { error } = await supabase.from('finance_manual_entries').insert({
        month,
        kind: entry.kind === 'revenue' ? 'revenue' : 'cost',
        channel: entry.channel || 'shared',
        category: String(entry.category || 'manual'),
        amount,
        occurred_on: entry.occurredOn || month,
        description: String(entry.description || ''),
        source: entry.source || 'manual',
        raw_payload: entry.rawPayload || {},
        created_by: admin.email,
      })

      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    if (action === 'update-manual-entry') {
      const entry = body.entry || {}
      const entryId = String(entry.id || '')
      const amount = Math.round(toNumber(entry.amount))
      if (!entryId) {
        return NextResponse.json({ error: '수정할 행이 없습니다' }, { status: 400 })
      }
      if (!amount || amount < 0) {
        return NextResponse.json({ error: '금액을 입력해 주세요' }, { status: 400 })
      }

      const { error } = await supabase
        .from('finance_manual_entries')
        .update({
          kind: entry.kind === 'revenue' ? 'revenue' : 'cost',
          channel: entry.channel || 'shared',
          category: String(entry.category || 'manual'),
          amount,
          occurred_on: entry.occurredOn || month,
          description: String(entry.description || ''),
          source: entry.source || 'manual',
          raw_payload: entry.rawPayload || {},
        })
        .eq('id', entryId)

      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    if (action === 'save-manual-ledger-rows') {
      const entries = Array.isArray(body.entries) ? body.entries : []
      const insertRows = []
      const updateRows = []

      for (const entry of entries) {
        const amount = Math.round(toNumber(entry.amount))
        if (!amount || amount < 0) {
          return NextResponse.json({ error: '저장할 모든 행에 금액을 입력해 주세요' }, { status: 400 })
        }

        const row = {
          month,
          kind: entry.kind === 'revenue' ? 'revenue' : 'cost',
          channel: entry.channel || 'shared',
          category: String(entry.category || 'manual'),
          amount,
          occurred_on: entry.occurredOn || month,
          description: String(entry.description || ''),
          source: entry.source || 'manual',
          raw_payload: entry.rawPayload || {},
          created_by: admin.email,
        }

        if (entry.id) {
          updateRows.push({ id: String(entry.id), row })
        } else {
          insertRows.push(row)
        }
      }

      if (insertRows.length > 0) {
        const { error } = await supabase.from('finance_manual_entries').insert(insertRows)
        if (error) throw error
      }

      for (const update of updateRows) {
        const { error } = await supabase
          .from('finance_manual_entries')
          .update({
            kind: update.row.kind,
            channel: update.row.channel,
            category: update.row.category,
            amount: update.row.amount,
            occurred_on: update.row.occurred_on,
            description: update.row.description,
            source: update.row.source,
            raw_payload: update.row.raw_payload,
          })
          .eq('id', update.id)
        if (error) throw error
      }

      return NextResponse.json(await buildFinancePayload(month))
    }

    if (action === 'create-event-entry') {
      const event = body.event || {}
      const eventName = String(event.name || '').trim()
      if (!eventName) {
        return NextResponse.json({ error: '이벤트명을 입력해 주세요' }, { status: 400 })
      }

      const laborAmount = Math.round(toNumber(event.laborAmount))
      const supplyAmount = Math.round(toNumber(event.supplyAmount))
      if (laborAmount <= 0 && supplyAmount <= 0) {
        return NextResponse.json({ error: '이벤트 인건비 또는 준비물비 중 하나는 입력해 주세요' }, { status: 400 })
      }

      const eventCode = String(event.code || '').trim()
      const startsOn = String(event.startsOn || month)
      const endsOn = String(event.endsOn || startsOn)
      const channel = event.channel || 'wow_store'
      const memoPrefix = `${eventCode ? `${eventCode} · ` : ''}${eventName} · ${startsOn}${endsOn !== startsOn ? `~${endsOn}` : ''}`
      const payload = {
        eventCode,
        eventName,
        startsOn,
        endsOn,
        notes: String(event.notes || ''),
      }

      const rows = []
      if (laborAmount > 0) {
        rows.push({
          month,
          kind: 'cost',
          channel,
          category: 'event_labor',
          amount: laborAmount,
          occurred_on: startsOn,
          description: `이벤트 인건비 · ${memoPrefix}`,
          source: 'event_manual',
          raw_payload: payload,
          created_by: admin.email,
        })
      }
      if (supplyAmount > 0) {
        rows.push({
          month,
          kind: 'cost',
          channel,
          category: 'event_supply',
          amount: supplyAmount,
          occurred_on: startsOn,
          description: `이벤트 준비물 · ${memoPrefix}`,
          source: 'event_manual',
          raw_payload: payload,
          created_by: admin.email,
        })
      }

      const { error } = await supabase.from('finance_manual_entries').insert(rows)
      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    if (action === 'snapshot-month') {
      const response = await buildFinancePayload(month)
      const { error } = await supabase.from('finance_monthly_snapshots').upsert({
        month,
        payload: response,
        locked_by: admin.email,
        locked_at: new Date().toISOString(),
      }, { onConflict: 'month' })

      if (error) throw error
      return NextResponse.json({ ...response, snapshotSaved: true })
    }

    return NextResponse.json({ error: '지원하지 않는 작업입니다' }, { status: 400 })
  } catch (error) {
    console.error('[finance] POST error:', error)
    return NextResponse.json({ error: '월별 재무 데이터를 저장하지 못했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    if (!hasCostAnalysisAccess(request)) {
      return NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')
    const month = normalizeFinanceMonth(searchParams.get('month') || getDefaultMonth())
    const source = searchParams.get('source')
    const supabase = createServiceRoleClient()

    if (entryId) {
      const { error } = await supabase.from('finance_manual_entries').delete().eq('id', entryId)
      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    if (source) {
      const { error } = await supabase.from('finance_transactions').delete().eq('month', month).eq('source', source)
      if (error) throw error
      return NextResponse.json(await buildFinancePayload(month))
    }

    return NextResponse.json({ error: '삭제 대상이 없습니다' }, { status: 400 })
  } catch (error) {
    console.error('[finance] DELETE error:', error)
    return NextResponse.json({ error: '월별 재무 데이터를 삭제하지 못했습니다' }, { status: 500 })
  }
}
