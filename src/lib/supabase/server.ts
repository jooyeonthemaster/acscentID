import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * 서버사이드용 Supabase 클라이언트 (쿠키 기반 세션 관리)
 * - API Routes에서 로그인/로그아웃 시 사용
 * - 세션이 쿠키에 저장되어 클라이언트에서 인식 가능
 */
export const createServerSupabaseClientWithCookies = async () => {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component에서 호출 시 무시 (읽기 전용)
        }
      },
    },
  })
}
