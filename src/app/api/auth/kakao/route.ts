import { NextRequest, NextResponse } from 'next/server'
import { authenticateKakaoUser, createKakaoSession } from '@/lib/auth-session'

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID!
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET

/**
 * GET /api/auth/kakao - Kakao 로그인 시작 또는 콜백 처리
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/'
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // 인가 코드가 있으면 콜백 처리
  if (code) {
    const redirectPath = state || next
    return handleKakaoCallback(code, redirectPath, origin)
  }

  // 인가 코드 요청 (Kakao 로그인 페이지로 리다이렉트)
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  kakaoAuthUrl.searchParams.set('client_id', KAKAO_CLIENT_ID)
  kakaoAuthUrl.searchParams.set('redirect_uri', `${origin}/api/auth/kakao`)
  kakaoAuthUrl.searchParams.set('response_type', 'code')
  kakaoAuthUrl.searchParams.set('state', next)
  // scope: 이메일 없이 닉네임과 프로필 이미지만 요청
  kakaoAuthUrl.searchParams.set('scope', 'profile_nickname profile_image')

  return NextResponse.redirect(kakaoAuthUrl.toString())
}

/**
 * Kakao 콜백 처리 - Supabase Auth 없이 직접 테이블 저장
 */
async function handleKakaoCallback(code: string, next: string, origin: string) {
  try {
    // 1. 인가 코드로 액세스 토큰 발급
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET || '',
        redirect_uri: `${origin}/api/auth/kakao`,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Kakao token error:', errorData)
      return NextResponse.redirect(`${origin}/?error=kakao_token_failed`)
    }

    const tokenData = await tokenResponse.json()

    // 2. 액세스 토큰으로 사용자 정보 조회
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    })

    if (!userResponse.ok) {
      const errorData = await userResponse.text()
      console.error('Kakao user info error:', errorData)
      return NextResponse.redirect(`${origin}/?error=kakao_user_failed`)
    }

    const kakaoUser = await userResponse.json()

    // 3. 카카오 사용자 정보 추출
    const kakaoAccount = kakaoUser.kakao_account || {}
    const kakaoProfile = kakaoAccount.profile || {}

    const kakaoId = String(kakaoUser.id)
    const nickname = kakaoProfile.nickname || kakaoAccount.name || 'Kakao User'
    const avatarUrl = kakaoProfile.profile_image_url || kakaoProfile.thumbnail_image_url

    console.log('Kakao user info:', { kakaoId, nickname })

    // 4. user_profiles 테이블에서 조회 또는 생성 (Supabase Auth 미사용)
    const user = await authenticateKakaoUser({
      kakaoId,
      nickname,
      avatarUrl,
    })

    // 5. 커스텀 세션 생성 (쿠키 기반)
    await createKakaoSession(user)

    console.log('Kakao login successful:', user.id)

    // 6. 리다이렉트
    return NextResponse.redirect(`${origin}${next}?login_success=true`)

  } catch (error) {
    console.error('Kakao OAuth error:', error)
    return NextResponse.redirect(`${origin}/?error=kakao_oauth_failed`)
  }
}
