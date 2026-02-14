import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { cancelPortOnePayment } from '@/lib/portone/verify'

// 관리자 이메일 목록 (환경변수 또는 하드코딩)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()

  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email
    }
  }

  return { isAdmin: false, email: null }
}

/**
 * 관리자 - 주문 환불 처리
 * POST /api/admin/orders/refund
 *
 * 포트원 결제 취소(환불)를 실행하고 주문 상태를 업데이트합니다.
 * 부분 환불도 지원합니다 (amount 파라미터).
 */
export async function POST(request: NextRequest) {
  console.log('[Admin Refund] POST request received')

  try {
    // 1. 관리자 인증 확인
    const { isAdmin: isUserAdmin, email } = await isAdmin()

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { orderId, reason, amount } = body

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'orderId와 reason이 필요합니다' },
        { status: 400 }
      )
    }

    console.log('[Admin Refund] Processing refund:', { orderId, reason, amount, admin: email })

    const serviceClient = createServiceRoleClient()

    // 3. 주문 조회
    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      console.error('[Admin Refund] Order not found:', fetchError)
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 4. 결제 ID 확인
    if (!order.payment_id) {
      return NextResponse.json(
        { error: '결제 정보가 없는 주문입니다 (무통장 입금 등)' },
        { status: 400 }
      )
    }

    // 이미 환불된 주문인지 확인
    if (order.status === 'cancelled' && order.refunded_at) {
      return NextResponse.json(
        { error: '이미 환불 처리된 주문입니다' },
        { status: 400 }
      )
    }

    // 5. 포트원 결제 취소 (환불)
    let cancelResult
    try {
      cancelResult = await cancelPortOnePayment(order.payment_id, reason, amount)
      console.log('[Admin Refund] PortOne cancel result:', cancelResult)
    } catch (cancelError) {
      console.error('[Admin Refund] PortOne cancel failed:', cancelError)
      return NextResponse.json(
        {
          error: '결제 취소에 실패했습니다',
          details: cancelError instanceof Error ? cancelError.message : String(cancelError)
        },
        { status: 502 }
      )
    }

    // 6. 주문 상태 업데이트
    const now = new Date().toISOString()
    const refundAmount = amount || order.final_price

    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'cancelled',
        refund_amount: refundAmount,
        refunded_at: cancelResult.cancelledAt || now,
        refund_reason: reason,
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Refund] Order update failed:', updateError)
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다 (결제 취소는 완료됨)' },
        { status: 500 }
      )
    }

    console.log('[Admin Refund] Refund completed:', orderId, `(${refundAmount}원)`)

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund: {
        cancellationId: cancelResult.cancellationId,
        cancelledAt: cancelResult.cancelledAt,
        amount: refundAmount,
      },
    })

  } catch (error) {
    console.error('[Admin Refund] Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
