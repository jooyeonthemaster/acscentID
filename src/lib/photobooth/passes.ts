import type { createServiceRoleClient } from '@/lib/supabase/service'
import { isMasterPass } from '@/lib/photobooth/master-pass'
import { resolveCurrentEvent } from '@/lib/photobooth/current-event'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 카운터 발급분의 최소 유효 시간 — 자정 직전에 뽑아도 바로 만료되지 않게 */
const COUNTER_MIN_VALID_MS = 2 * 60 * 60 * 1000

/** 부스 키패드 잠금 — 최근 1분 동안 틀린 번호가 이만큼 쌓이면 1분간 입력을 받지 않는다 (매장 전체 기준) */
export const PASS_FAILURE_WINDOW_MS = 60 * 1000
export const PASS_FAILURE_LIMIT = 10

export type PassIssuedVia = 'admin' | 'counter'

/** KST 오늘 0시의 UTC ISO 문자열 */
export function kstMidnightIso(now = Date.now()): string {
  const today = new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10)
  return new Date(new Date(`${today}T00:00:00.000Z`).getTime() - KST_OFFSET_MS).toISOString()
}

/** 카운터 발급분 만료 — 발급 당일 KST 자정, 단 최소 2시간은 보장 */
export function counterPassExpiry(now = Date.now()): string {
  const endOfDay = new Date(kstMidnightIso(now)).getTime() + DAY_MS
  return new Date(Math.max(endOfDay, now + COUNTER_MIN_VALID_MS)).toISOString()
}

/** 마스터 번호와 겹치면 사용 불가능한 죽은 이용권이 되므로 다시 뽑는다 */
function generatePassCode(): string {
  let code: string
  do {
    code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  } while (isMasterPass(code))
  return code
}

export interface IssuedPass {
  id: string
  code: string
  created_at: string
  expires_at: string | null
}

/**
 * 이용권 발급 — 관리자 화면과 카운터 기기가 같이 쓴다.
 * 코드 유니크 충돌(23505) 시 재시도. 발급 시점의 진행 중 생카를 통계용으로 붙인다.
 */
export async function issuePasses(
  client: ServiceClient,
  options: { count: number; note?: string | null; via: PassIssuedVia; expiresAt?: string | null }
): Promise<{ passes: IssuedPass[]; event: string | null } | { error: string }> {
  const currentEvent = await resolveCurrentEvent(client)
  const passes: IssuedPass[] = []
  for (let i = 0; i < options.count; i++) {
    let inserted: IssuedPass | null = null
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const { data, error } = await client
        .from('photobooth_passes')
        .insert({
          code: generatePassCode(),
          status: 'issued',
          event_id: currentEvent?.id ?? null,
          note: options.note ?? null,
          issued_via: options.via,
          expires_at: options.expiresAt ?? null,
        })
        .select('id, code, created_at, expires_at')
        .single()
      if (!error && data) inserted = data as IssuedPass
      else if (error && error.code !== '23505') {
        console.error('Photobooth pass insert failed:', error)
        return { error: '발급에 실패했습니다' }
      }
    }
    if (!inserted) return { error: '발급에 실패했습니다' }
    passes.push(inserted)
  }
  return { passes, event: currentEvent?.title ?? null }
}
