import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getPortOnePayment } from '@/lib/portone/verify'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'
import { issueRepurchaseCouponIfNeeded } from '@/lib/coupons/issue-repurchase'

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

        // 이미 결제 완료 이후 상태이면 중복 처리 방지
        // awaiting_payment, pending 상태만 paid로 전환 허용
        if (order.status !== 'pending' && order.status !== 'awaiting_payment') {
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

        // 재구매 10% 쿠폰 자동 발급 (실 결제 완료 시점에만 발급)
        if (order.user_id) {
          try {
            await issueRepurchaseCouponIfNeeded(serviceClient, order.user_id)
          } catch (couponError) {
            console.error('[Payments Webhook] Repurchase coupon issuance failed:', couponError)
          }
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

        // 이미 우리 측에서 환불 처리된 주문이면 중복 업데이트 방지
        if (order.refunded_at) {
          console.log('[Payments Webhook] Order already refunded, skipping:', order.id)
          return NextResponse.json({ success: true })
        }

        // 포트원에서 실제 결제 상태 재조회하여 정확한 환불 금액/시각 확보
        let cancelledAmount = order.final_price
        let cancelledAt: string = new Date().toISOString()
        let cancellationId: string | null = null
        let portonePayment = null
        try {
          portonePayment = await getPortOnePayment(data.paymentId)
          if (portonePayment?.amount?.cancelled) {
            cancelledAmount = portonePayment.amount.cancelled
          }
          // PortOneCancellation[]이 있으면 최신 취소 시각/ID 추출 (SDK 응답 구조에 따라 필드명 방어적 접근)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cancellations = (portonePayment as any)?.cancellations as Array<{ cancelledAt?: string; id?: string }> | undefined
          if (Array.isArray(cancellations) && cancellations.length > 0) {
            const latest = cancellations[cancellations.length - 1]
            if (latest?.cancelledAt) cancelledAt = latest.cancelledAt
            if (latest?.id) cancellationId = latest.id
          }
        } catch (portoneErr) {
          console.warn('[Payments Webhook] PortOne lookup failed, using fallback values:', portoneErr)
        }

        // 주문 상태 업데이트 — refunded_at 포함하여 동기화
        const { error: updateError } = await serviceClient
          .from('orders')
          .update({
            status: 'cancelled',
            refunded_at: cancelledAt,
            refund_amount: cancelledAmount,
            refund_reason: order.refund_reason || '포트원 웹훅 취소 이벤트',
            cancellation_id: cancellationId,
            refunded_by: order.refunded_by || 'webhook',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('[Payments Webhook] Cancellation update failed:', updateError)
        } else {
          console.log('[Payments Webhook] Order cancelled:', order.id)
        }

        // refund_logs 감사 기록 (테이블 없으면 조용히 스킵)
        try {
          await serviceClient.from('refund_logs').insert({
            order_id: order.id,
            admin_email: 'webhook',
            trigger_type: 'webhook',
            payment_id: order.payment_id,
            payment_method: order.payment_method,
            pg_provider: order.pg_provider,
            amount: cancelledAmount,
            reason: '포트원 웹훅 취소 이벤트',
            cancellation_id: cancellationId,
            portone_response: portonePayment ?? null,
            status: 'succeeded',
            completed_at: new Date().toISOString(),
          })
        } catch (logErr) {
          console.warn('[Payments Webhook] refund_logs skipped:', logErr)
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
