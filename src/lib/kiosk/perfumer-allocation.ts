// AI 조향사 향 배정 — 기기의 30종 순환을 지키면서 최근 운영 기록에서 적게 나온 향부터 고른다.
// DB는 읽기만 한다. 실제 성공 여부와 기기별 순환 소진은 결과를 받은 클라이언트가 기록한다.
import { createServiceRoleClient } from '@/lib/supabase/service'
import { normalizePerfumerRotation, pickPerfumerScent } from './perfumer-rotation'

const HISTORY_LIMIT = 300
// DB가 잠깐 안 될 때도 같은 서버 인스턴스의 최근 배정을 참고한다.
const recentAllocations: string[] = []

export async function allocatePerfumerScent(raw: unknown): Promise<string> {
  let history = recentAllocations.slice().reverse()
  try {
    const { data, error } = await createServiceRoleClient()
      .from('kiosk_analyses')
      .select('perfume_id')
      .eq('program', 'personal')
      .eq('product_type', 'perfume_10ml')
      .eq('mocked', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)
      .abortSignal(AbortSignal.timeout(2500))
    if (error) throw new Error(error.code || 'history unavailable')
    history = (data ?? []).flatMap((row) => typeof row.perfume_id === 'string' ? [row.perfume_id] : [])
  } catch {
    // 사진·이름이나 DB 오류 원문을 로그에 남기지 않는다. 기기의 순환은 DB 없이도 유지된다.
    console.warn('[perfumer] 운영 기록을 읽지 못해 기기 순환과 최근 서버 배정으로 향을 고릅니다.')
  }
  const id = pickPerfumerScent(normalizePerfumerRotation(raw), history)
  recentAllocations.push(id)
  if (recentAllocations.length > HISTORY_LIMIT) recentAllocations.shift()
  return id
}
