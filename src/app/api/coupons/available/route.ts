import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { AvailableCoupon } from '@/types/coupon'

// 기본 쿠폰 데이터 (DB 테이블이 없을 경우 폴백)
const DEFAULT_COUPONS: AvailableCoupon[] = [
  {
    id: 'welcome',
    type: 'welcome',
    discount_percent: 15,
    discount_type: 'percent',
    discount_amount: 0,
    title: '웰컴 쿠폰',
    description: '처음 방문해주셔서 감사합니다',
    isClaimed: false,
  },
  {
    id: 'birthday',
    type: 'birthday',
    discount_percent: 20,
    discount_type: 'percent',
    discount_amount: 0,
    title: '생일 축하',
    description: '생일 달 고객님께 드리는 특별 할인',
    isClaimed: false,
  },
  {
    id: 'referral',
    type: 'referral',
    discount_percent: 10,
    discount_type: 'percent',
    discount_amount: 0,
    title: '친구 추천',
    description: '친구를 추천해주셔서 감사합니다',
    isClaimed: false,
  },
  {
    id: 'repurchase',
    type: 'repurchase',
    discount_percent: 10,
    discount_type: 'percent',
    discount_amount: 0,
    title: '재구매 감사',
    description: '다시 찾아주셔서 감사합니다',
    isClaimed: false,
  },
]

/**
 * 받을 수 있는 쿠폰 목록 조회
 * GET /api/coupons/available
 */
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceRoleClient()

    // 1. 사용자 인증 확인 (선택적)
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

    // 2. 활성화된 쿠폰 목록 조회
    const { data: coupons, error: couponsError } = await serviceClient
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .neq('type', 'offline')
      .not('code', 'like', 'OFF%')
      .or('valid_until.is.null,valid_until.gt.now()')

    // DB 테이블이 없거나 에러 시 기본 쿠폰 반환
    if (couponsError || !coupons || coupons.length === 0) {
      console.log('Using default coupons (DB not available or empty)')
      return NextResponse.json({ coupons: DEFAULT_COUPONS, isLoggedIn: !!userId })
    }

    const publicCoupons = coupons.filter((coupon) => {
      const code = String(coupon.code || '')
      const isLegacyOfflineCoupon =
        code.startsWith('OFF') ||
        (coupon.type === 'welcome' && /^[A-Z0-9]{8}$/.test(code) && coupon.title !== '웰컴 쿠폰')

      return !isLegacyOfflineCoupon
    })

    if (publicCoupons.length === 0) {
      return NextResponse.json({ coupons: DEFAULT_COUPONS, isLoggedIn: !!userId })
    }

    // 3. 로그인한 경우 이미 받은 쿠폰 확인
    let claimedCouponIds: string[] = []
    if (userId) {
      const { data: userCoupons } = await serviceClient
        .from('user_coupons')
        .select('coupon_id')
        .eq('user_id', userId)

      if (userCoupons) {
        claimedCouponIds = userCoupons.map((uc) => uc.coupon_id)
      }
    }

    // 4. 쿠폰 목록에 claimed 상태 추가
    const availableCoupons: AvailableCoupon[] = publicCoupons.map((coupon) => ({
      id: coupon.id,
      type: coupon.type,
      discount_percent: coupon.discount_percent,
      discount_type: coupon.discount_type || 'percent',
      discount_amount: coupon.discount_amount || 0,
      title: coupon.title,
      description: coupon.description,
      isClaimed: claimedCouponIds.includes(coupon.id),
    }))

    return NextResponse.json({
      coupons: availableCoupons,
      isLoggedIn: !!userId,
    })
  } catch (error) {
    console.error('Available coupons API error:', error)
    // 에러 시에도 기본 쿠폰 반환 (graceful degradation)
    return NextResponse.json({ coupons: DEFAULT_COUPONS, isLoggedIn: false })
  }
}
