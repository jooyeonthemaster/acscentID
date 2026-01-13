import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 추천인 코드 적용
 * POST /api/referral/apply
 *
 * 새 회원이 추천인 코드를 입력하면:
 * 1. 추천인(referrer)에게 referral 쿠폰 발급
 * 2. 피추천인(referred)에게 referral 쿠폰 발급
 * 3. referral_rewards 테이블에 기록
 */
export async function POST(request: NextRequest) {
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
        { success: false, error: '로그인이 필요합니다', requireLogin: true },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { success: false, error: '추천인 코드를 입력해주세요' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 1. 추천인 코드로 추천인 찾기
    const { data: referrer, error: referrerError } = await serviceClient
      .from('user_profiles')
      .select('id, name')
      .eq('referral_code', referralCode.toUpperCase())
      .single()

    if (referrerError || !referrer) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 추천인 코드입니다' },
        { status: 404 }
      )
    }

    // 2. 자기 자신의 코드인지 확인
    if (referrer.id === userId) {
      return NextResponse.json(
        { success: false, error: '본인의 추천인 코드는 사용할 수 없습니다' },
        { status: 400 }
      )
    }

    // 3. 이미 추천인이 있는지 확인
    const { data: currentProfile } = await serviceClient
      .from('user_profiles')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (currentProfile?.referred_by) {
      return NextResponse.json(
        { success: false, error: '이미 추천인 코드를 사용하셨습니다' },
        { status: 409 }
      )
    }

    // 4. referral 쿠폰 찾기
    const { data: referralCoupon, error: couponError } = await serviceClient
      .from('coupons')
      .select('id')
      .eq('type', 'referral')
      .eq('is_active', true)
      .single()

    if (couponError || !referralCoupon) {
      return NextResponse.json(
        { success: false, error: '친구 초대 쿠폰을 찾을 수 없습니다' },
        { status: 500 }
      )
    }

    // 5. 추천인(referrer)에게 쿠폰 발급
    const { data: referrerCoupon } = await serviceClient
      .from('user_coupons')
      .insert({
        user_id: referrer.id,
        coupon_id: referralCoupon.id,
        claimed_at: new Date().toISOString(),
        is_used: false,
      })
      .select('id')
      .single()

    // 6. 피추천인(현재 사용자)에게 쿠폰 발급
    const { data: referredCoupon } = await serviceClient
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: referralCoupon.id,
        claimed_at: new Date().toISOString(),
        is_used: false,
      })
      .select('id')
      .single()

    // 7. 피추천인 프로필에 referred_by 업데이트
    await serviceClient
      .from('user_profiles')
      .update({ referred_by: referrer.id })
      .eq('id', userId)

    // 8. referral_rewards 테이블에 기록
    await serviceClient
      .from('referral_rewards')
      .insert({
        referrer_id: referrer.id,
        referred_id: userId,
        referrer_coupon_id: referrerCoupon?.id || null,
        referred_coupon_id: referredCoupon?.id || null,
      })

    return NextResponse.json({
      success: true,
      message: '추천인 코드가 적용되었습니다! 10% 할인 쿠폰이 발급되었어요.',
      referrerName: referrer.name || '친구',
    })
  } catch (error) {
    console.error('Referral apply API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
