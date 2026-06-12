import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { CheckoutCoupon, calculateCouponDiscount, getCouponDiscountType, resolveEffectiveDiscount } from '@/types/coupon'
import { getUserCouponSnapshots } from '@/lib/coupons/user-coupon-discount'

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
    // 과거 발급된 stamp_* 타입 쿠폰은 더 이상 지원하지 않으므로 제외
    const { data: userCoupons, error } = await serviceClient
      .from('user_coupons')
      .select(`
        id,
        coupon_id,
        is_used,
        claimed_at,
        coupon:coupons!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_used', false)
      .not('coupon.type', 'in', '(stamp_10,stamp_20,stamp_free)')

    if (error) {
      console.error('Fetch user coupons error:', error)
      return NextResponse.json({
        success: false,
        error: '쿠폰 목록을 불러오는데 실패했습니다',
        coupons: [],
      })
    }

    // 재구매 쿠폰 자격 확인 (paid 이후 모든 정상 진행 상태 주문 있는지)
    const { count: completedOrderCount } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['paid', 'preparing', 'shipping', 'delivered'])

    const hasCompletedOrder = (completedOrderCount || 0) > 0

    // 개인 쿠폰에 고정된 할인값(스냅샷) 조회 — 있으면 템플릿 대신 그 값을 적용
    const snapshotMap = await getUserCouponSnapshots(
      serviceClient,
      (userCoupons || []).map((uc) => uc.id)
    )

    // 쿠폰 목록을 CheckoutCoupon 형태로 변환
    const checkoutCoupons: CheckoutCoupon[] = (userCoupons || []).map((uc) => {
      const coupon = uc.coupon as any
      const effective = resolveEffectiveDiscount(snapshotMap.get(uc.id), coupon)

      // 유효기간 확인
      const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date()

      // 재구매 쿠폰 자격 확인
      // 관리자가 재구매 할인을 비활성화(is_active=false)하면 발급된 쿠폰도 사용 불가
      const isRepurchaseCoupon = coupon.type === 'repurchase'
      const isRepurchaseDisabled = isRepurchaseCoupon && coupon.is_active === false
      const repurchaseEligible = !isRepurchaseCoupon || (hasCompletedOrder && !isRepurchaseDisabled)

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
      } else if (isRepurchaseDisabled) {
        ineligibleReason = '현재 재구매 할인이 중단되었어요'
      } else if (!repurchaseEligible) {
        ineligibleReason = '첫 주문 완료 후 사용할 수 있어요'
      } else if (!birthdayEligible) {
        ineligibleReason = '생일 달에만 사용할 수 있어요'
      }

      return {
        id: coupon.id,
        userCouponId: uc.id,
        type: coupon.type,
        discount_percent: effective.discount_percent ?? 0,
        discount_type: getCouponDiscountType(effective),
        discount_amount: effective.discount_amount ?? 0,
        title: coupon.title,
        isEligible,
        ineligibleReason,
      }
    })

    // 사용 가능한 쿠폰을 먼저, 할인율 높은 순으로 정렬
    checkoutCoupons.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1
      if (!a.isEligible && b.isEligible) return 1
      return calculateCouponDiscount(100000, b) - calculateCouponDiscount(100000, a)
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
