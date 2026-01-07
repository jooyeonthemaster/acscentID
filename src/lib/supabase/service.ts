import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase Client
 *
 * RLS(Row Level Security)를 우회하는 관리자용 클라이언트
 * 서버사이드에서만 사용 (API Routes)
 *
 * 사용 사례:
 * - 카카오 로그인 (auth.uid() 없이 user_profiles 테이블 접근)
 * - 관리자 작업
 * - 배치 처리
 *
 * ⚠️ 주의: 절대 클라이언트(브라우저)에 노출하지 말 것!
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
