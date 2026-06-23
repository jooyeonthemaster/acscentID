import { NextRequest, NextResponse } from 'next/server'
import { getKakaoSession } from '@/lib/auth-session'
import { preRegisterPortOnePayment } from '@/lib/portone/verify'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

const ONLINE_PAYMENT_METHODS = new Set(['card', 'kakao_pay', 'naver_pay'])

/**
 * 결제 준비 API
 * POST /api/payments/prepare
 *
 * PortOne 결제창 호출 전에 paymentId를 주문에 묶고, 결제 예정 금액을 포트원에 사전 등록합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const {
      paymentId,
      orderId,
      totalAmount,
      paymentMethod,
    } = body as {
      paymentId?: string
      orderId?: string
      totalAmount?: number
      paymentMethod?: string
    }

    if (!paymentId || !orderId || typeof totalAmount !== 'number' || !paymentMethod) {
      return NextResponse.json(
        { error: 'paymentId, orderId, totalAmount, paymentMethod가 필요합니다' },
        { status: 400 }
      )
    }

    if (!ONLINE_PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: '온라인 결제수단이 아닙니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('id, user_id, status, final_price, payment_method, payment_id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    if (order.status !== 'awaiting_payment') {
      return NextResponse.json({ error: '결제 준비가 가능한 주문 상태가 아닙니다' }, { status: 400 })
    }

    if (order.payment_method !== paymentMethod) {
      return NextResponse.json({ error: '주문 결제수단과 요청 결제수단이 일치하지 않습니다' }, { status: 400 })
    }

    if (order.payment_id && order.payment_id !== paymentId) {
      return NextResponse.json({ error: '이미 다른 결제 요청이 진행 중입니다' }, { status: 409 })
    }

    if (Number(order.final_price) !== totalAmount) {
      return NextResponse.json({ error: '결제 금액이 주문 금액과 일치하지 않습니다' }, { status: 400 })
    }

    try {
      await preRegisterPortOnePayment(paymentId, totalAmount)
    } catch (portoneError) {
      console.error('[Payments Prepare] PortOne pre-register failed:', portoneError)
      return NextResponse.json({ error: '포트원 결제 사전등록에 실패했습니다' }, { status: 502 })
    }

    const { error: updateError } = await serviceClient
      .from('orders')
      .update({
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('user_id', userId)
      .eq('status', 'awaiting_payment')

    if (updateError) {
      console.error('[Payments Prepare] Order payment_id update failed:', updateError)
      return NextResponse.json({ error: '주문 결제 준비에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Payments Prepare] Unexpected error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
