import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { BANK_DEPOSIT_TABLE, confirmBankTransferPaid, isReviewStatus } from '@/lib/bank-deposit/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * 관리자 - 확인이 필요한 입금 처리
 * POST /api/admin/bank-deposits/:id
 *   { action: 'link', orderId }  이 입금을 그 주문의 입금으로 보고 주문을 입금완료로(재고·쿠폰·ERP 포함)
 *   { action: 'dismiss', note? }  주문과 무관한 입금으로 넘김(환불할 돈·개인 입금 등)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = body?.action
  const serviceClient = createServiceRoleClient()

  const { data: deposit, error } = await serviceClient
    .from(BANK_DEPOSIT_TABLE)
    .select('id, status, amount, occurred_at, received_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deposit) return NextResponse.json({ error: '입금 기록이 없습니다' }, { status: 404 })
  if (!isReviewStatus(deposit.status)) {
    return NextResponse.json({ error: '이미 처리된 입금입니다' }, { status: 409 })
  }

  const now = new Date().toISOString()
  if (action === 'dismiss') {
    const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : '관리자가 주문과 무관한 입금으로 처리'
    await serviceClient.from(BANK_DEPOSIT_TABLE)
      .update({ status: 'dismissed', note, resolved_by: admin.email, processed_at: now })
      .eq('id', id)
    return NextResponse.json({ success: true, status: 'dismissed' })
  }

  if (action !== 'link' || typeof body?.orderId !== 'string') {
    return NextResponse.json({ error: '처리 방법을 확인해 주세요' }, { status: 400 })
  }

  const paidAt = new Date(deposit.occurred_at || deposit.received_at)
  const result = await confirmBankTransferPaid(serviceClient, body.orderId, { paidAt, by: admin.email })
  if (!result.confirmed) return NextResponse.json({ error: result.reason }, { status: 409 })

  await serviceClient.from(BANK_DEPOSIT_TABLE)
    .update({ status: 'linked', matched_order_id: body.orderId, resolved_by: admin.email, processed_at: now })
    .eq('id', id)
  return NextResponse.json({ success: true, status: 'linked', orderNumber: result.orderNumber })
}
