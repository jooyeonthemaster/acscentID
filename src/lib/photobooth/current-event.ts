import type { SupabaseClient } from '@supabase/supabase-js'

export interface PhotoboothEvent {
  id: string
  title: string
  artist: string | null
  organizer: string | null
  hashtag: string | null
  greeting: string | null
  theme_color: string | null
  cover_image_url: string | null
  starts_on: string | null
  ends_on: string | null
  is_active: boolean
  created_at: string
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayKst(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * 현재 진행 중인 생카 이벤트 조회.
 * 활성 + 기간(KST 오늘 포함, NULL은 제한 없음) 조건을 만족하는 것 중 최신 등록 순.
 */
export async function resolveCurrentEvent(
  serviceClient: SupabaseClient
): Promise<PhotoboothEvent | null> {
  const { data, error } = await serviceClient
    .from('photobooth_events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Photobooth current event fetch failed:', error)
    return null
  }

  const today = todayKst()
  const current = (data ?? []).find((event) => {
    if (event.starts_on && event.starts_on > today) return false
    if (event.ends_on && event.ends_on < today) return false
    return true
  })
  return (current as PhotoboothEvent) ?? null
}
