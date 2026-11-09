import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { normalizeDepositorName } from '@/lib/bank-deposit/alert'
import { BANK_DEPOSIT_REVIEW_STATUSES, BANK_DEPOSIT_TABLE, getBankDepositConfig, isReviewStatus } from '@/lib/bank-deposit/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DepositRow {
  id: string
  amount: number
  depositor_name: string | null
  status: string
  matched_order_id: string | null
  candidate_order_ids: string[] | null
  [key: string]: unknown
}

interface OrderRow {
  id: string
  order_number: string
  final_price: number
  recipient_name: string | null
  depositor_name?: string | null
  perfume_name: string | null
  created_at: string
  status: string
}

const ORDER_COLUMNS = 'id, order_number, final_price, recipient_name, depositor_name, perfume_name, created_at, status'

/**
 * 관리자 - 입금 문자 목록
 * GET /api/admin/bank-deposits?view=review|all
 *
 * 확인이 필요한 입금(unmatched·ambiguous·failed)에는 고를 만한 입금대기 무통장 주문(suggestions)을 붙인다 —
 * 금액이 같은 주문, 입금자명이 같은 주문을 앞에. 처리된 입금에는 연결된 주문번호를 붙인다.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const view = new URL(request.url).searchParams.get('view') === 'all' ? 'all' : 'review'
  const serviceClient = createServiceRoleClient()

  let query = serviceClient.from(BANK_DEPOSIT_TABLE).select('*').order('received_at', { ascending: false }).limit(100)
  if (view === 'review') query = query.in('status', [...BANK_DEPOSIT_REVIEW_STATUSES])
  const { data: deposits, error } = await query
  if (error) {
    const missing = error.code === 'PGRST205' || error.code === '42P01'
    return NextResponse.json(
      { error: missing ? '입금 문자 표가 아직 없습니다. supabase/migrations/20261109_bank_deposit_auto_confirm.sql 을 실행해 주세요.' : error.message, setupNeeded: missing },
      { status: missing ? 409 : 500 },
    )
  }
  const rows = (deposits || []) as DepositRow[]

  // 입금대기 무통장 주문(보통 몇 건) — 확인 필요 입금의 후보
  let pending: OrderRow[] = []
  if (rows.some((row) => isReviewStatus(row.status))) {
    const pendingOrders = (columns: string) =>
      serviceClient.from('orders').select(columns)
        .eq('status', 'pending').eq('payment_method', 'bank_transfer').order('created_at', { ascending: false }).limit(300)
    let res = await pendingOrders(ORDER_COLUMNS)
    // 입금자명 열이 아직 없는 DB(마이그레이션 일부만 적용) — 받는 분 이름으로
    if (res.error && (res.error.message || '').includes('depositor_name')) res = await pendingOrders(ORDER_COLUMNS.replace(', depositor_name', ''))
    pending = (res.data || []) as unknown as OrderRow[]
  }

  // 처리된 입금에 붙은 주문
  const linkedIds = [...new Set(rows.flatMap((row) => [row.matched_order_id, ...(row.candidate_order_ids || [])]).filter(Boolean))] as string[]
  const linked = new Map<string, Pick<OrderRow, 'id' | 'order_number' | 'status'>>()
  if (linkedIds.length) {
    const { data } = await serviceClient.from('orders').select('id, order_number, status').in('id', linkedIds)
    for (const order of data || []) linked.set(order.id, order)
  }

  const result = rows.map((row) => {
    const isReview = isReviewStatus(row.status)
    const name = normalizeDepositorName(row.depositor_name)
    const suggestions = isReview
      ? pending
          .map((order) => {
            const sameAmount = order.final_price === row.amount
            const sameName = !!name && normalizeDepositorName(order.depositor_name || order.recipient_name) === name
            const flagged = (row.candidate_order_ids || []).includes(order.id)
            return { order, score: (flagged ? 4 : 0) + (sameAmount ? 2 : 0) + (sameName ? 1 : 0), sameAmount, sameName }
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score || b.order.created_at.localeCompare(a.order.created_at))
          .slice(0, 8)
          .map(({ order, sameAmount, sameName }) => ({ ...order, sameAmount, sameName }))
      : []
    return {
      ...row,
      matched_order: row.matched_order_id ? linked.get(row.matched_order_id) ?? null : null,
      suggestions,
    }
  })

  const config = getBankDepositConfig()
  return NextResponse.json({
    deposits: result,
    receiving: !!config.token,
    accountSuffix: config.accountSuffix,
    windowHours: config.windowHours,
  })
}
