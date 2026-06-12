import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getCouponDiscountType, resolveEffectiveDiscount } from '@/types/coupon'
import { getUserCouponSnapshots } from '@/lib/coupons/user-coupon-discount'

/**
 * 사용자 쿠폰 목록 조회 API
 * GET /api/coupons/my
 */
export async function GET() {
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
      return NextResponse.json({ coupons: [], requireLogin: true })
    }

    // 2. 사용자 쿠폰 조회 (쿠폰 정보와 함께)
    const serviceClient = createServiceRoleClient()

    const { data: userCoupons, error } = await serviceClient
      .from('user_coupons')
      .select(`
        id,
        coupon_id,
        is_used,
        used_at,
        claimed_at,
        coupon:coupons (
          code,
          type,
          discount_percent,
          discount_type,
          discount_amount,
          title,
          description,
          valid_until
        )
      `)
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch user coupons:', error)
      return NextResponse.json(
        { error: '쿠폰 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // 개인 쿠폰에 고정된 할인값(스냅샷)이 있으면 표시 할인값을 그 값으로 덮어쓴다.
    const rows = userCoupons || []
    const snapshotMap = await getUserCouponSnapshots(
      serviceClient,
      rows.map((row) => row.id)
    )
    const coupons = rows.map((row) => {
      const template = Array.isArray(row.coupon) ? row.coupon[0] : row.coupon
      if (!template) return row
      const effective = resolveEffectiveDiscount(snapshotMap.get(row.id), template)
      return {
        ...row,
        coupon: {
          ...template,
          discount_type: getCouponDiscountType(effective),
          discount_percent: effective.discount_percent ?? 0,
          discount_amount: effective.discount_amount ?? 0,
        },
      }
    })

    return NextResponse.json({ coupons })

  } catch (error) {
    console.error('Coupons API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
