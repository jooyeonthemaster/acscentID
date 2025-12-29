import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저용 클라이언트 (쿠키 기반 - 서버 세션과 동기화)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// 서버사이드용 클라이언트 (API Routes에서 사용) - 세션 미저장
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface AnalysisResultRow {
  id: string
  created_at: string
  user_image_url: string | null
  analysis_data: object
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_id?: string | null
}

export interface UserProfile {
  id: string
  created_at: string
  updated_at: string
  email: string | null
  name: string | null
  avatar_url: string | null
  provider: string | null
  fingerprint: string | null
  preferences: object
}
