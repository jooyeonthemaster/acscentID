import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * fingerprint → 계정 귀속의 안전 윈도우.
 *
 * 분석 직후 뜨는 로그인 유도(결과 페이지 2초 후 프롬프트)로 전환되는 케이스를
 * 넉넉히 커버하면서, 매장 태블릿 등 공용 기기에 수개월치로 쌓인
 * 다른 손님의 게스트 분석까지 통째로 흡수하는 사고를 차단한다.
 * (2026-07 전수 조사: 기기 69대에서 367건이 서로 다른 계정에 뒤섞여 귀속됨)
 */
export const FINGERPRINT_LINK_WINDOW_HOURS = 24

export function fingerprintLinkCutoffISO(): string {
  return new Date(Date.now() - FINGERPRINT_LINK_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
}

export interface FingerprintLinkResult {
  analyses: number
  layeringSessions: number
  feedbacks: number
  total: number
}

/**
 * 게스트(fingerprint) 데이터를 로그인 계정에 귀속.
 * 기존 link_fingerprint_data RPC를 대체한다 — 차이점은 두 가지:
 *  1) user_id가 비어 있는 행만 (RPC와 동일)
 *  2) 최근 FINGERPRINT_LINK_WINDOW_HOURS 이내 생성분만 (신규 제약)
 */
export async function linkFingerprintRows(
  supabase: SupabaseClient,
  userId: string,
  fingerprint: string
): Promise<FingerprintLinkResult> {
  const cutoff = fingerprintLinkCutoffISO()

  const claim = async (table: string) => {
    const { data, error } = await supabase
      .from(table)
      .update({ user_id: userId })
      .eq('user_fingerprint', fingerprint)
      .is('user_id', null)
      .gte('created_at', cutoff)
      .select('id')

    if (error) {
      console.error(`[fingerprint-link] ${table} link failed:`, error.message)
      return 0
    }
    return data?.length || 0
  }

  const [analyses, layeringSessions, feedbacks] = await Promise.all([
    claim('analysis_results'),
    claim('layering_sessions'),
    claim('perfume_feedbacks'),
  ])

  return {
    analyses,
    layeringSessions,
    feedbacks,
    total: analyses + layeringSessions + feedbacks,
  }
}
