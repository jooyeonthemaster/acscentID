import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 내 쿠폰 목록 조회
 * GET /api/coupons
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인 (필수)
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
        { error: '로그인이 필요합니다', coupons: [] },
        { status: 401 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 2. 사용자의 쿠폰 목록 조회
    const { data: userCoupons, error } = await serviceClient
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons(*)
      `)
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false })

    if (error) {
      console.error('User coupons fetch failed:', error)
      return NextResponse.json(
        { error: '쿠폰 목록 조회에 실패했습니다', coupons: [] },
        { status: 500 }
      )
    }

    // 3. 쿠폰 정보 가공
    const coupons = userCoupons?.map((uc) => ({
      id: uc.id,
      code: uc.coupon?.code,
      type: uc.coupon?.type,
      discount_percent: uc.coupon?.discount_percent,
      title: uc.coupon?.title,
      description: uc.coupon?.description,
      validUntil: uc.coupon?.valid_until,
      claimedAt: uc.claimed_at,
      usedAt: uc.used_at,
      isUsed: uc.is_used,
    })) || []

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Coupons API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', coupons: [] },
      { status: 500 }
    )
  }
}
