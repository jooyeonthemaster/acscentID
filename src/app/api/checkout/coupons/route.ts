import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { CheckoutCoupon } from '@/types/coupon'

/**
 * 결제 페이지에서 사용 가능한 쿠폰 목록 조회
 * GET /api/checkout/coupons
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
      return NextResponse.json({
        success: false,
        requireLogin: true,
        coupons: [],
      })
    }

    const serviceClient = createServiceRoleClient()

    // 사용자가 보유한 쿠폰 중 미사용 쿠폰 조회
    const { data: userCoupons, error } = await serviceClient
      .from('user_coupons')
      .select(`
        id,
        coupon_id,
        is_used,
        claimed_at,
        coupon:coupons(*)
      `)
      .eq('user_id', userId)
      .eq('is_used', false)

    if (error) {
      console.error('Fetch user coupons error:', error)
      return NextResponse.json({
        success: false,
        error: '쿠폰 목록을 불러오는데 실패했습니다',
        coupons: [],
      })
    }

    // 재구매 쿠폰 자격 확인 (paid, delivered, shipping 상태 주문 있는지)
    const { count: completedOrderCount } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['paid', 'delivered', 'shipping'])

    const hasCompletedOrder = (completedOrderCount || 0) > 0

    // 쿠폰 목록을 CheckoutCoupon 형태로 변환
    const checkoutCoupons: CheckoutCoupon[] = (userCoupons || []).map((uc) => {
      const coupon = uc.coupon as any

      // 유효기간 확인
      const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date()

      // 재구매 쿠폰 자격 확인
      const isRepurchaseCoupon = coupon.type === 'repurchase'
      const repurchaseEligible = !isRepurchaseCoupon || hasCompletedOrder

      // 생일 쿠폰은 현재 월만 사용 가능
      const isBirthdayCoupon = coupon.type === 'birthday'
      const currentMonth = new Date().getMonth()
      const claimedMonth = uc.claimed_at ? new Date(uc.claimed_at).getMonth() : currentMonth
      const birthdayEligible = !isBirthdayCoupon || (currentMonth === claimedMonth)

      // 종합 자격 판단
      const isEligible = !isExpired && repurchaseEligible && birthdayEligible

      // 사용 불가 사유
      let ineligibleReason: string | undefined
      if (isExpired) {
        ineligibleReason = '유효기간이 만료되었어요'
      } else if (!repurchaseEligible) {
        ineligibleReason = '첫 주문 완료 후 사용할 수 있어요'
      } else if (!birthdayEligible) {
        ineligibleReason = '생일 달에만 사용할 수 있어요'
      }

      return {
        id: coupon.id,
        userCouponId: uc.id,
        type: coupon.type,
        discount_percent: coupon.discount_percent,
        title: coupon.title,
        isEligible,
        ineligibleReason,
      }
    })

    // 사용 가능한 쿠폰을 먼저, 할인율 높은 순으로 정렬
    checkoutCoupons.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1
      if (!a.isEligible && b.isEligible) return 1
      return b.discount_percent - a.discount_percent
    })

    return NextResponse.json({
      success: true,
      coupons: checkoutCoupons,
    })
  } catch (error) {
    console.error('Checkout coupons API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다',
      coupons: [],
    })
  }
}
