import { NextResponse } from 'next/server'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * GET /api/auth/session - 현재 세션 조회
 * - 카카오 커스텀 세션 우선 확인
 * - 없으면 Supabase Auth 세션 확인 (Google 로그인 호환)
 */
export async function GET() {
  try {
    // 1. 카카오 커스텀 세션 확인
    const kakaoSession = await getKakaoSession()
    if (kakaoSession) {
      return NextResponse.json({
        user: {
          id: kakaoSession.user.id,
          email: kakaoSession.user.email,
          name: kakaoSession.user.name,
          avatar_url: kakaoSession.user.avatar_url,
          provider: 'kakao',
        },
        provider: 'kakao',
      })
    }

    // 2. Supabase Auth 세션 확인 (Google 로그인용)
    const supabase = await createServerSupabaseClientWithCookies()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      return NextResponse.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          provider: session.user.app_metadata?.provider || 'google',
        },
        provider: session.user.app_metadata?.provider || 'google',
      })
    }

    // 3. 세션 없음
    return NextResponse.json({ user: null, provider: null })

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null, provider: null, error: 'Session check failed' }, { status: 500 })
  }
}
