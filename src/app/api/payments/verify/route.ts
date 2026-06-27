import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getPortOnePayment, cancelPortOnePayment } from '@/lib/portone/verify'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'
import { notifyNewOrder } from '@/lib/email/admin-notify'
import { markCouponUsedForPaidOrder } from '@/lib/coupons/order-coupon-usage'

function getOrderIdFromPaymentCustomData(customData: unknown): string | null {
  if (!customData) return null

  if (typeof customData === 'string') {
    try {
      const parsed = JSON.parse(customData) as { orderId?: unknown }
      return typeof parsed.orderId === 'string' ? parsed.orderId : null
    } catch {
      return null
    }
  }

  if (typeof customData === 'object' && 'orderId' in customData) {
    const orderId = (customData as { orderId?: unknown }).orderId
    return typeof orderId === 'string' ? orderId : null
  }

  return null
}

/**
 * 결제 검증 API
 * POST /api/payments/verify
 *
 * 포트원 결제 완료 후 서버에서 결제를 검증하고 주문 상태를 업데이트합니다.
 */
export async function POST(request: NextRequest) {
  console.log('[Payments Verify] POST request received')

  try {
    // 1. 사용자 인증 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { paymentId, orderId } = body

    if (!paymentId || !orderId) {
      return NextResponse.json(
        { error: 'paymentId와 orderId가 필요합니다' },
        { status: 400 }
      )
    }

    console.log('[Payments Verify] Verifying payment:', { paymentId, orderId, userId })

    const serviceClient = createServiceRoleClient()

    // 3. 주문 조회 및 소유권 확인
    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !order) {
      console.error('[Payments Verify] Order not found:', fetchError)
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (order.payment_id && order.payment_id !== paymentId) {
      console.error('[Payments Verify] Payment ID mismatch:', {
        orderPaymentId: order.payment_id,
        requestPaymentId: paymentId,
        orderId,
      })
      return NextResponse.json(
        { error: '주문에 등록된 결제 ID와 요청 결제 ID가 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // 4. 포트원에서 결제 정보 조회
    let payment
    try {
      payment = await getPortOnePayment(paymentId)
      console.log('[Payments Verify] PortOne payment:', {
        status: payment.status,
        amount: payment.amount?.total,
        orderAmount: order.final_price,
      })
    } catch (portoneError) {
      console.error('[Payments Verify] PortOne API error:', portoneError)
      return NextResponse.json(
        { error: '결제 정보 조회에 실패했습니다' },
        { status: 502 }
      )
    }

    // 5. 결제 상태 확인
    if (payment.status !== 'PAID') {
      console.error('[Payments Verify] Payment not paid:', payment.status)
      return NextResponse.json(
        { error: `결제가 완료되지 않았습니다 (상태: ${payment.status})` },
        { status: 400 }
      )
    }

    const customDataOrderId = getOrderIdFromPaymentCustomData(payment.customData)
    if (customDataOrderId && customDataOrderId !== orderId) {
      console.error('[Payments Verify] Custom data order mismatch:', {
        customDataOrderId,
        orderId,
        paymentId,
      })
      return NextResponse.json(
        { error: '결제 정보의 주문 ID가 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // 6. 금액 일치 확인
    if (payment.amount.total !== order.final_price) {
      console.error('[Payments Verify] Amount mismatch:', {
        paid: payment.amount.total,
        expected: order.final_price,
      })

      // 금액 불일치 시 결제 취소 시도
      try {
        await cancelPortOnePayment(paymentId, '결제 금액 불일치')
        console.log('[Payments Verify] Mismatched payment cancelled')
      } catch (cancelError) {
        console.error('[Payments Verify] Failed to cancel mismatched payment:', cancelError)
      }

      return NextResponse.json(
        { error: '결제 금액이 주문 금액과 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // 7. 주문 상태 업데이트
    const now = new Date().toISOString()

    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'paid',
        payment_id: paymentId,
        pg_provider: payment.channel?.pgProvider || null,
        pg_tx_id: payment.pgTxId || null,
        paid_at: payment.paidAt || now,
        receipt_url: payment.receiptUrl || null,
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('[Payments Verify] Order update failed:', updateError)
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    // 8. 결제 완료 시점에 쿠폰 사용 확정
    const couponUsageResult = await markCouponUsedForPaidOrder(serviceClient, updatedOrder, now)
    if (!couponUsageResult.success) {
      console.error('[Payments Verify] Coupon usage finalization failed:', couponUsageResult)
    }

    // 9. 재고 차감 (실패해도 결제 검증 결과에 영향 없음)
    try {
      console.log('[Payments Verify] Deducting inventory for order:', orderId)
      const deductionResult = await deductInventoryForOrder(serviceClient, orderId)
      if (!deductionResult.success) {
        console.warn('[Payments Verify] Inventory deduction had errors:', deductionResult.errors)
      }
    } catch (deductionError) {
      console.error('[Payments Verify] Inventory deduction failed:', deductionError)
    }

    console.log('[Payments Verify] Payment verified successfully:', orderId)

    // 결제 완료 후 관리자 알림 발송 (이메일 + 노션, fire-and-forget)
    // order.status는 업데이트 직전 조회값이므로, 이번 호출로 '처음 결제완료된' 경우에만 발송한다.
    // (이미 paid면 웹훅과의 중복 발송 방지)
    if (order.status !== 'paid') {
      notifyNewOrder({
        orderNumber: order.order_number,
        recipientName: order.recipient_name || order.customer_name || '',
        perfumeName: order.perfume_name || '',
        finalPrice: order.final_price,
        productType: order.product_type || 'image_analysis',
        itemCount: order.item_count || 1,
        paymentMethod: order.payment_method,
        status: 'paid',
        orderId: order.id,
      })
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      couponUsage: couponUsageResult,
    })

  } catch (error) {
    console.error('[Payments Verify] Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
