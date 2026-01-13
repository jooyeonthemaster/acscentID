import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 재구매 쿠폰 자격 확인
 * GET /api/coupons/repurchase/eligible
 *
 * 결제완료(paid) 또는 배송완료(delivered) 상태의 주문이
 * 1건 이상 있으면 재구매 쿠폰 사용 가능
 */
export async function GET() {
  try {
    // 사용자 인증 확인
    let userId: string | null = null
    const kakaoSession = await getKakaoSession()

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
      return NextResponse.json(
        { success: false, eligible: false, requireLogin: true },
        { status: 401 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 결제 완료된 주문 수 확인
    const { count, error } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['paid', 'delivered', 'shipping'])

    if (error) {
      console.error('Order count error:', error)
      return NextResponse.json(
        { success: false, eligible: false, error: '주문 내역 확인에 실패했습니다' },
        { status: 500 }
      )
    }

    const completedOrders = count || 0
    const isEligible = completedOrders > 0

    return NextResponse.json({
      success: true,
      eligible: isEligible,
      completedOrders,
    })
  } catch (error) {
    console.error('Repurchase eligible API error:', error)
    return NextResponse.json(
      { success: false, eligible: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
