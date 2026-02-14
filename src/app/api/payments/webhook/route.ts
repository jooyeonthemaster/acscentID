import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getPortOnePayment } from '@/lib/portone/verify'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'

/**
 * 포트원 웹훅 처리 API
 * POST /api/payments/webhook
 *
 * 포트원 V2 서버에서 호출하는 웹훅 엔드포인트입니다.
 * 인증 없이 호출되며, 항상 200 OK를 반환합니다.
 */
export async function POST(request: NextRequest) {
  console.log('[Payments Webhook] POST request received')

  try {
    const body = await request.json()
    const { type, data } = body

    console.log('[Payments Webhook] Webhook type:', type, 'data:', JSON.stringify(data))

    if (!type || !data?.paymentId) {
      console.warn('[Payments Webhook] Invalid webhook body - missing type or paymentId')
      return NextResponse.json({ success: true })
    }

    const serviceClient = createServiceRoleClient()

    // 결제 완료 웹훅 처리
    if (type.includes('Transaction.Paid') || type.includes('Payment.Paid')) {
      console.log('[Payments Webhook] Processing payment completion:', data.paymentId)

      try {
        // 포트원에서 결제 정보 조회
        const payment = await getPortOnePayment(data.paymentId)

        if (payment.status !== 'PAID') {
          console.warn('[Payments Webhook] Payment status is not PAID:', payment.status)
          return NextResponse.json({ success: true })
        }

        // payment_id로 주문 조회
        const { data: order, error: fetchError } = await serviceClient
          .from('orders')
          .select('*')
          .eq('payment_id', data.paymentId)
          .single()

        if (fetchError || !order) {
          console.warn('[Payments Webhook] Order not found for paymentId:', data.paymentId)
          return NextResponse.json({ success: true })
        }

        // 이미 결제 완료 상태이면 중복 처리 방지
        if (order.status !== 'pending') {
          console.log('[Payments Webhook] Order already processed:', order.id, order.status)
          return NextResponse.json({ success: true })
        }

        // 주문 상태 업데이트
        const now = new Date().toISOString()

        const { error: updateError } = await serviceClient
          .from('orders')
          .update({
            status: 'paid',
            pg_provider: payment.channel?.pgProvider || null,
            pg_tx_id: payment.pgTxId || null,
            paid_at: payment.paidAt || now,
            receipt_url: payment.receiptUrl || null,
            updated_at: now,
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('[Payments Webhook] Order update failed:', updateError)
          return NextResponse.json({ success: true })
        }

        console.log('[Payments Webhook] Order updated to paid:', order.id)

        // 재고 차감 (실패해도 웹훅 응답에 영향 없음)
        try {
          const deductionResult = await deductInventoryForOrder(serviceClient, order.id)
          if (!deductionResult.success) {
            console.warn('[Payments Webhook] Inventory deduction had errors:', deductionResult.errors)
          }
        } catch (deductionError) {
          console.error('[Payments Webhook] Inventory deduction failed:', deductionError)
        }

      } catch (paymentError) {
        console.error('[Payments Webhook] Payment processing error:', paymentError)
      }

      return NextResponse.json({ success: true })
    }

    // 결제 취소 웹훅 처리
    if (
      type.includes('Transaction.Cancelled') ||
      type.includes('Payment.Cancelled') ||
      type.includes('Transaction.PartialCancelled') ||
      type.includes('Payment.PartialCancelled')
    ) {
      console.log('[Payments Webhook] Processing cancellation:', data.paymentId)

      try {
        // payment_id로 주문 조회
        const { data: order, error: fetchError } = await serviceClient
          .from('orders')
          .select('*')
          .eq('payment_id', data.paymentId)
          .single()

        if (fetchError || !order) {
          console.warn('[Payments Webhook] Order not found for cancelled paymentId:', data.paymentId)
          return NextResponse.json({ success: true })
        }

        // 주문 상태 업데이트
        const { error: updateError } = await serviceClient
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('[Payments Webhook] Cancellation update failed:', updateError)
        } else {
          console.log('[Payments Webhook] Order cancelled:', order.id)
        }

      } catch (cancelError) {
        console.error('[Payments Webhook] Cancellation processing error:', cancelError)
      }

      return NextResponse.json({ success: true })
    }

    // 알 수 없는 웹훅 타입
    console.log('[Payments Webhook] Unhandled webhook type:', type)
    return NextResponse.json({ success: true })

  } catch (error) {
    // 웹훅은 항상 200을 반환 (재시도 방지)
    console.error('[Payments Webhook] Unexpected error:', error)
    return NextResponse.json({ success: true })
  }
}
