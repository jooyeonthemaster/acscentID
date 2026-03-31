import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * POST /api/orders/[id]/payment-failed
 * 결제 실패/취소 시 awaiting_payment 상태의 주문을 삭제합니다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const reason = body.reason || '결제 실패'

    const serviceClient = createServiceRoleClient()

    // awaiting_payment 상태인 주문만 삭제 (이미 결제된 주문은 보호)
    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('id, status, order_number')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    if (order.status !== 'awaiting_payment') {
      // 이미 결제되었거나 다른 상태면 삭제하지 않음
      return NextResponse.json({ error: '삭제할 수 없는 주문 상태입니다' }, { status: 400 })
    }

    // order_items 먼저 삭제 (FK 제약)
    await serviceClient
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    // 주문 삭제
    const { error: deleteError } = await serviceClient
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (deleteError) {
      console.error('[Payment Failed] Order delete failed:', deleteError)
      return NextResponse.json({ error: '주문 삭제에 실패했습니다' }, { status: 500 })
    }

    console.log(`[Payment Failed] Order ${order.order_number} deleted - reason: ${reason}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Payment Failed] Error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
