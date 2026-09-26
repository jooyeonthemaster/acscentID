// 포토부스 소재(프레임·템플릿·포토카드) ↔ 화면 이벤트(ERP·노션 행사) 연결.
// 행사에 묶인 프레임·템플릿은 그 행사가 '지금 이 매장 기기에 적용 중'일 때만 부스에 보인다 —
// 기간 안이거나 '지금 바로 적용'을 누른 동안. 배경의 '기간 중 자동 적용'(approved)과는 따로다(배경을 안 만들어도 프레임은 쓴다).
// 부스가 1초마다 설정을 묻기 때문에 행사 목록(버킷 파일 여러 개)은 인스턴스마다 잠깐 기억해 둔다.

import { readScreenEvents } from '@/lib/screen-events/store'
import { DEVICE_STORE, isEventLive, isForced, kstToday, type ScreenEvent } from '@/lib/screen-events/types'

export const SCREEN_EVENT_ID = /^[a-z0-9-]{1,80}$/

export interface EventOption {
  id: string
  title: string
  starts_on: string
  ends_on: string
  /** 지금 기기에 적용 중(기간 안 또는 지금 바로 적용) */
  live: boolean
  /** 이미 끝난 행사 */
  past: boolean
}

export interface EventScope {
  /** 지금 소재를 보여 줄 행사 */
  live: Set<string>
  options: EventOption[]
}

const TTL_MS = 20_000
let cache: { at: number; value: EventScope } | null = null

/** 이 매장(와우·공통)의 숨기지 않은 행사 — 진행 중 → 다가오는 순 → 지난 행사(최근 순) */
export function eventOptions(events: ScreenEvent[], today = kstToday()): EventOption[] {
  const mine = events.filter(e => !e.hidden && (e.store === DEVICE_STORE || e.store === 'all'))
  const options = mine.map(e => ({
    id: e.id, title: e.title, starts_on: e.starts_on, ends_on: e.ends_on,
    live: isEventLive(e, today) || isForced(e, today), past: e.ends_on < today,
  }))
  const rank = (o: EventOption) => (o.live ? 0 : o.past ? 2 : 1)
  return options.sort((a, b) => rank(a) - rank(b) || (a.past ? b.starts_on.localeCompare(a.starts_on) : a.starts_on.localeCompare(b.starts_on)))
}

/** 지금 적용 중인 행사 — 읽기에 실패하면 마지막으로 알던 값, 그것도 없으면 '없음'(행사 소재를 숨긴다) */
export async function screenEventScope(now = Date.now()): Promise<EventScope> {
  if (cache && now - cache.at < TTL_MS) return cache.value
  try {
    const options = eventOptions(await readScreenEvents())
    const value = { live: new Set(options.filter(o => o.live).map(o => o.id)), options }
    cache = { at: now, value }
    return value
  } catch (error) {
    console.error('[photobooth] 화면 이벤트를 읽지 못했습니다:', error instanceof Error ? error.message : error)
    return cache?.value ?? { live: new Set(), options: [] }
  }
}

/** 상시(연결 없음)이거나 연결된 행사가 적용 중이면 보인다 */
export function inScope(screenEventId: unknown, scope: EventScope): boolean {
  return typeof screenEventId !== 'string' || !screenEventId || scope.live.has(screenEventId)
}

/** 저장 값 정리 — '' / null 은 상시, 형식이 틀리면 undefined(거절) */
export function parseScreenEventId(value: unknown): string | null | undefined {
  if (value === null || value === '') return null
  return typeof value === 'string' && SCREEN_EVENT_ID.test(value) ? value : undefined
}

/** 마이그레이션 전(screen_event_id 칸 없음) 저장 실패를 알아본다 */
export function missingEventColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === 'PGRST204' || error.code === '42703' || /screen_event_id/.test(error.message ?? ''))
}
export const MISSING_EVENT_COLUMN_MESSAGE = '행사 연결 칸이 아직 DB에 없습니다. supabase/migrations/20260926_photobooth_screen_event.sql 을 실행해주세요.'

/** 테스트용 — 기억해 둔 행사 목록 비우기 */
export function resetEventScopeCache() { cache = null }
