import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface AnalysisResultRow {
  id: string
  created_at: string
  user_image_url: string | null
  analysis_data: object
  twitter_name: string
  perfume_name: string
  perfume_brand: string
}
