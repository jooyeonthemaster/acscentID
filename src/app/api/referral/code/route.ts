import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 추천인 코드 생성
 * 6자리 영숫자 (예: ABC123)
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 내 추천인 코드 조회/생성
 * GET /api/referral/code
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
        { success: false, error: '로그인이 필요합니다', requireLogin: true },
        { status: 401 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 기존 추천인 코드 확인
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    let referralCode = profile?.referral_code

    // 추천인 코드가 없으면 새로 생성
    if (!referralCode) {
      // 중복 체크하면서 코드 생성
      let attempts = 0
      let isUnique = false

      while (!isUnique && attempts < 10) {
        referralCode = generateReferralCode()
        const { data: existing } = await serviceClient
          .from('user_profiles')
          .select('id')
          .eq('referral_code', referralCode)
          .single()

        if (!existing) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        return NextResponse.json(
          { success: false, error: '추천인 코드 생성에 실패했습니다. 다시 시도해주세요.' },
          { status: 500 }
        )
      }

      // 코드 저장
      const { error: updateError } = await serviceClient
        .from('user_profiles')
        .update({ referral_code: referralCode })
        .eq('id', userId)

      if (updateError) {
        console.error('Referral code update error:', updateError)
        return NextResponse.json(
          { success: false, error: '추천인 코드 저장에 실패했습니다' },
          { status: 500 }
        )
      }
    }

    // 초대한 친구 수 조회
    const { count: inviteCount } = await serviceClient
      .from('referral_rewards')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)

    return NextResponse.json({
      success: true,
      code: referralCode,
      inviteCount: inviteCount || 0,
    })
  } catch (error) {
    console.error('Referral code API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
