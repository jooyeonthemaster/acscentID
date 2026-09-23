// 이벤트 기간 화면 — 생일카페 같은 매장 이벤트마다 키오스크·포토부스 배경과 글꼴을 미리 만들어 두면
// 그 기간(한국 시간 날짜 기준)에만 자동으로 적용되고, 끝나면 평소 설정으로 돌아간다.
// 이벤트 정보는 ACSCENT ERP(기간)·노션 '이벤트 굿즈 관리'(포스터)에서 불러오거나 직접 추가한다.
// 설계: docs/screen-events.md

import type { ScreenBackground, ScreenTarget } from '@/lib/screen-backgrounds/types'
import { validateBackground } from '@/lib/screen-backgrounds/validation'
import { isFontId } from '@/lib/screen-backgrounds/types'

export const EVENT_STORES = ['wow', 'id', 'all'] as const
export type EventStore = (typeof EVENT_STORES)[number]
export const EVENT_STORE_LABELS: Record<EventStore, string> = { wow: '와우', id: '아이디', all: '공통' }

/** 키오스크·포토부스가 놓인 매장 — 이 매장과 '공통' 이벤트만 기기에 적용한다 */
export const DEVICE_STORE: EventStore = 'wow'

export type EventSource = 'erp' | 'notion' | 'manual'

export interface FontSuggestion { id: string; reason: string }

export interface EventAnalysis {
  mood: string
  tone: 'light' | 'dark'
  base: string
  ink: string
  accent: string
}

export interface ScreenEvent {
  id: string
  source: EventSource
  erp_id: string | null
  notion_block_id: string | null
  store: EventStore
  title: string
  /** YYYY-MM-DD, 한국 시간 */
  starts_on: string
  ends_on: string
  /** 저장해 둔 포스터(admin-content 공개 주소) — 노션 주소는 1시간 뒤 만료라 복사해 둔다 */
  posters: string[]
  poster: string | null
  /** 만든 배경 — 배경 라이브러리와 따로 두어 기기 선택 목록을 어지럽히지 않는다 */
  backgrounds: Record<ScreenTarget, ScreenBackground | null>
  font_suggestions: FontSuggestion[]
  font: string | null
  analysis: EventAnalysis | null
  /** 미리보기를 확인하고 '기간 중 자동 적용'을 켰는가 */
  approved: boolean
  hidden: boolean
  generated_at: string | null
  /** OpenRouter 가 알려준 누적 비용(USD) */
  generation_cost: number | null
  updated_at: string
}

/** 기기에 내려주는 몫 — 지금 적용 중인 이벤트 배경·글꼴 */
export interface LiveEventOverride {
  event_id: string
  title: string
  ends_on: string
  background: ScreenBackground
  font: string | null
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX = /^#[0-9a-f]{6}$/i

export function isEventDate(value: unknown): value is string {
  return typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function kstToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10)
}

export function validateScreenEvent(value: unknown): value is ScreenEvent {
  if (!value || typeof value !== 'object') return false
  const e = value as ScreenEvent
  return typeof e.id === 'string' && /^[a-z0-9-]{1,80}$/.test(e.id) &&
    ['erp', 'notion', 'manual'].includes(e.source) &&
    (EVENT_STORES as readonly string[]).includes(e.store) &&
    typeof e.title === 'string' && !!e.title.trim() && e.title.length <= 120 &&
    isEventDate(e.starts_on) && isEventDate(e.ends_on) && e.starts_on <= e.ends_on &&
    Array.isArray(e.posters) && e.posters.every(url => typeof url === 'string' && url.startsWith('https://')) &&
    (e.poster === null || e.posters.includes(e.poster)) &&
    !!e.backgrounds && (['booth', 'kiosk'] as const).every(t => e.backgrounds[t] === null || (validateBackground(e.backgrounds[t]) && e.backgrounds[t]!.target === t)) &&
    Array.isArray(e.font_suggestions) && e.font_suggestions.every(s => isFontId(s?.id) && typeof s.reason === 'string') &&
    (e.font === null || isFontId(e.font)) &&
    (e.analysis === null || (!!e.analysis && [e.analysis.base, e.analysis.ink, e.analysis.accent].every(c => HEX.test(c)))) &&
    typeof e.approved === 'boolean' && typeof e.hidden === 'boolean'
}

export function isEventLive(event: ScreenEvent, today: string): boolean {
  return event.starts_on <= today && today <= event.ends_on
}

/** 지금 이 기기에 적용할 이벤트 — 겹치면 늦게 시작한 쪽(더 최근에 준비한 행사)이 이긴다 */
export function liveOverride(events: ScreenEvent[], target: ScreenTarget, today = kstToday()): LiveEventOverride | null {
  const live = events
    .filter(e => e.approved && !e.hidden && (e.store === DEVICE_STORE || e.store === 'all') && isEventLive(e, today) && e.backgrounds[target])
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0]
  if (!live) return null
  return { event_id: live.id, title: live.title, ends_on: live.ends_on, background: live.backgrounds[target]!, font: live.font }
}

export function emptyEvent(fields: Pick<ScreenEvent, 'id' | 'source' | 'store' | 'title' | 'starts_on' | 'ends_on'>): ScreenEvent {
  return {
    erp_id: null, notion_block_id: null, posters: [], poster: null,
    backgrounds: { booth: null, kiosk: null }, font_suggestions: [], font: null, analysis: null,
    approved: false, hidden: false, generated_at: null, generation_cost: null, updated_at: new Date().toISOString(),
    ...fields,
  }
}
