import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID!
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET

/**
 * Kakao 사용자를 위한 고정 비밀번호 생성
 * - 동일한 Kakao ID에 대해 항상 같은 비밀번호 반환
 */
function generateKakaoPassword(kakaoId: string): string {
  return `kakao_secure_${kakaoId}_acscent_2025`
}

/**
 * GET /api/auth/kakao - Kakao 로그인 시작 (인가 코드 요청)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/result'
  const code = searchParams.get('code')

  // 인가 코드가 있으면 토큰 교환 처리
  if (code) {
    return handleKakaoCallback(code, next, origin)
  }

  // 인가 코드 요청 (Kakao 로그인 페이지로 리다이렉트)
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  kakaoAuthUrl.searchParams.set('client_id', KAKAO_CLIENT_ID)
  kakaoAuthUrl.searchParams.set('redirect_uri', `${origin}/api/auth/kakao`)
  kakaoAuthUrl.searchParams.set('response_type', 'code')
  kakaoAuthUrl.searchParams.set('state', next) // next 경로를 state로 전달

  return NextResponse.redirect(kakaoAuthUrl.toString())
}

/**
 * Kakao 인가 코드로 토큰 교환 및 사용자 정보 조회
 */
async function handleKakaoCallback(code: string, next: string, origin: string) {
  try {
    // 1. 인가 코드로 액세스 토큰 발급
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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

    // 3. Supabase에 사용자 생성/로그인 (쿠키 기반 세션 사용)
    const supabase = await createServerSupabaseClientWithCookies()

    // Kakao 사용자 정보 추출
    const kakaoAccount = kakaoUser.kakao_account || {}
    const kakaoProfile = kakaoAccount.profile || {}

    const email = kakaoAccount.email || `kakao_${kakaoUser.id}@kakao.local`
    const name = kakaoProfile.nickname || kakaoAccount.name || '카카오 사용자'
    const avatarUrl = kakaoProfile.profile_image_url || kakaoProfile.thumbnail_image_url

    // 고정 비밀번호 생성 (동일 Kakao ID는 항상 같은 비밀번호)
    const password = generateKakaoPassword(kakaoUser.id.toString())

    // 1. 먼저 기존 사용자인지 확인하고 로그인 시도
    console.log('Attempting Kakao login for:', email)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // 로그인 성공 - 기존 사용자
    if (signInData?.session) {
      console.log('Existing Kakao user logged in:', email)

      // 프로필 정보 업데이트 (이름, 아바타가 변경되었을 수 있음)
      await supabase
        .from('user_profiles')
        .update({
          name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', signInData.user.id)

      return NextResponse.redirect(`${origin}${next}?login_success=true`)
    }

    // 2. 로그인 실패 - 새 사용자이므로 회원가입 진행
    console.log('New Kakao user, signing up:', email)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar_url: avatarUrl,
          provider: 'kakao',
          kakao_id: kakaoUser.id.toString(),
        },
      },
    })

    // 회원가입 에러 처리
    if (signUpError) {
      console.error('Supabase sign up error:', signUpError)

      // 이미 등록된 사용자인데 비밀번호가 다른 경우 (이전 방식으로 가입한 사용자)
      if (signUpError.message?.includes('already registered')) {
        console.log('User exists with different password, redirecting to error page')
        return NextResponse.redirect(`${origin}/?error=kakao_existing_user&message=이미 가입된 계정입니다. 다른 방법으로 로그인해주세요.`)
      }

      return NextResponse.redirect(`${origin}/?error=supabase_signup_failed`)
    }

    // 회원가입 성공 - 자동 로그인
    if (signUpData.session) {
      console.log('New Kakao user created and logged in:', email)
      return NextResponse.redirect(`${origin}${next}?login_success=true`)
    }

    // 이메일 확인이 필요한 경우 (Supabase 설정에 따라) - 바로 로그인 시도
    if (signUpData.user && !signUpData.session) {
      console.log('Kakao user created, attempting auto sign-in')

      const { data: autoSignInData, error: autoSignInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (autoSignInError) {
        console.error('Auto sign in after signup failed:', autoSignInError)
        return NextResponse.redirect(`${origin}/?error=auto_signin_failed`)
      }

      if (autoSignInData.session) {
        return NextResponse.redirect(`${origin}${next}?login_success=true`)
      }
    }

    return NextResponse.redirect(`${origin}${next}?login_success=true`)
  } catch (error) {
    console.error('Kakao OAuth error:', error)
    return NextResponse.redirect(`${origin}/?error=kakao_oauth_failed`)
  }
}
