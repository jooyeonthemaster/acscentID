import { NextResponse } from 'next/server'
import { destroyKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * POST /api/auth/logout - 로그아웃 처리
 * - 카카오 커스텀 세션 삭제
 * - Supabase Auth 세션도 삭제 (Google 로그인 호환)
 */
export async function POST() {
  try {
    // 1. 카카오 커스텀 세션 삭제
    await destroyKakaoSession()

    // 2. Supabase Auth 세션도 삭제 (Google 로그인 사용자용)
    const supabase = await createServerSupabaseClientWithCookies()
    await supabase.auth.signOut()

    // 3. PG 심사 모드 쿠키 삭제
    const response = NextResponse.json({ success: true })
    response.cookies.delete('pg_review_mode')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}
