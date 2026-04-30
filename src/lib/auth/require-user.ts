import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

export interface AuthenticatedUser {
  id: string
  email: string | null
  provider: 'kakao' | 'supabase'
}

/**
 * API 라우트에서 인증된 사용자를 강제로 요구.
 * Kakao 커스텀 세션 또는 Supabase Auth 둘 중 하나로 인증되어야 함.
 * 비로그인이면 null 반환 — 호출 측에서 401로 응답할 것.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const kakao = await getKakaoSession()
  if (kakao?.user?.id) {
    return {
      id: kakao.user.id,
      email: kakao.user.email,
      provider: 'kakao',
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id) {
    return {
      id: user.id,
      email: user.email ?? null,
      provider: 'supabase',
    }
  }

  return null
}
