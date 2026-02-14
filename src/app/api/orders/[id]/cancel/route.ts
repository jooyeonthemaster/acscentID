import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { notifyCancelRequest } from '@/lib/email/admin-notify'

/**
 * 주문 취소 요청 API
 * PATCH /api/orders/[id]/cancel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

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

    // 2. 주문 조회 및 소유권 확인
    const serviceClient = createServiceRoleClient()

    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 이미 취소된 주문인지 확인
    if (order.status === 'cancel_requested' || order.status === 'cancelled') {
      return NextResponse.json(
        { error: '이미 취소 요청된 주문입니다' },
        { status: 400 }
      )
    }

    // 4. 주문 상태를 취소 요청으로 변경
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'cancel_requested',
        cancel_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Order cancel request failed:', updateError)
      return NextResponse.json(
        { error: '취소 요청 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    // 관리자 이메일 알림 발송 (fire-and-forget)
    notifyCancelRequest({
      orderNumber: order.order_number,
      recipientName: order.recipient_name,
      perfumeName: order.perfume_name,
      finalPrice: order.final_price,
    })

    // 온라인 결제 주문의 경우 관리자가 환불 처리 필요
    if (order.payment_method && order.payment_method !== 'bank_transfer' && order.payment_id) {
      console.log('[Order Cancel] Online payment order - admin refund needed:', {
        orderId: order.id,
        paymentMethod: order.payment_method,
        paymentId: order.payment_id,
      })
    }

    return NextResponse.json({
      success: true,
      message: '취소 요청이 접수되었습니다',
      order: updatedOrder,
    })

  } catch (error) {
    console.error('Order cancel API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
