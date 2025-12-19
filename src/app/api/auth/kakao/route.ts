import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID!
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET

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

    // 3. Supabase에 사용자 생성/로그인
    const supabase = createServerSupabaseClient()

    // Kakao 사용자 정보 추출
    const kakaoAccount = kakaoUser.kakao_account || {}
    const kakaoProfile = kakaoAccount.profile || {}

    const email = kakaoAccount.email || `kakao_${kakaoUser.id}@kakao.local`
    const name = kakaoProfile.nickname || kakaoAccount.name || '카카오 사용자'
    const avatarUrl = kakaoProfile.profile_image_url || kakaoProfile.thumbnail_image_url

    // Supabase Admin API로 사용자 생성/조회
    // 참고: 이 방식은 signInWithIdToken을 사용하지 않고 직접 처리
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      // 기존 사용자 - 세션 생성을 위해 매직 링크 방식 사용
      // 또는 커스텀 토큰 방식 필요
      console.log('Existing Kakao user:', email)
    }

    // Supabase Auth에 사용자 생성 (signUp with generated password)
    const generatedPassword = `kakao_${kakaoUser.id}_${Date.now()}_${Math.random().toString(36)}`

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: generatedPassword,
      options: {
        data: {
          name,
          avatar_url: avatarUrl,
          provider: 'kakao',
          kakao_id: kakaoUser.id.toString(),
        },
      },
    })

    // 이미 존재하는 사용자인 경우 signIn 시도
    if (signUpError?.message?.includes('already registered')) {
      // 기존 사용자 - 비밀번호 없이 로그인 불가
      // 이 경우 매직 링크나 OTP 방식 필요
      // 임시로 에러 페이지로 리다이렉트
      console.log('User already exists, redirecting...')

      // 기존 사용자의 경우 쿠키 기반 세션 설정이 어려우므로
      // 클라이언트에서 처리하도록 정보 전달
      const redirectUrl = new URL('/auth/kakao-complete', origin)
      redirectUrl.searchParams.set('email', email)
      redirectUrl.searchParams.set('name', name)
      redirectUrl.searchParams.set('avatar', avatarUrl || '')
      redirectUrl.searchParams.set('kakao_id', kakaoUser.id.toString())
      redirectUrl.searchParams.set('next', next)

      return NextResponse.redirect(redirectUrl.toString())
    }

    if (signUpError) {
      console.error('Supabase sign up error:', signUpError)
      return NextResponse.redirect(`${origin}/?error=supabase_signup_failed`)
    }

    // 회원가입 성공 - 자동 로그인
    if (signUpData.session) {
      console.log('Kakao user created and logged in:', email)

      const response = NextResponse.redirect(`${origin}${next}?login_success=true`)

      // 세션 쿠키 설정 (Supabase는 자동으로 처리하지만 명시적으로 설정)
      return response
    }

    // 이메일 확인 필요한 경우 (Supabase 설정에 따라)
    if (signUpData.user && !signUpData.session) {
      console.log('Kakao user created, email confirmation required')

      // 이메일 확인 없이 바로 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: generatedPassword,
      })

      if (signInError) {
        console.error('Auto sign in after signup failed:', signInError)
        return NextResponse.redirect(`${origin}/?error=auto_signin_failed`)
      }

      if (signInData.session) {
        return NextResponse.redirect(`${origin}${next}?login_success=true`)
      }
    }

    return NextResponse.redirect(`${origin}${next}?login_success=true`)
  } catch (error) {
    console.error('Kakao OAuth error:', error)
    return NextResponse.redirect(`${origin}/?error=kakao_oauth_failed`)
  }
}
