import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

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

    return NextResponse.json({ coupons: userCoupons || [] })

  } catch (error) {
    console.error('Coupons API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
