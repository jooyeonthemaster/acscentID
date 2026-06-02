// ============================================================
// "오늘의 향" 추첨 로직 — 하루 1회, 익명(localStorage) 기반.
// 로그인 불필요. useCouponPolicy 의 localStorage 패턴을 차용.
// ============================================================

import { TODAY_SCENTS, getScentById, type TodayScent } from './scents'

const STORAGE_KEY = 'acscent_today_scent'

interface DrawState {
  /** 마지막으로 뽑은 날짜 (YYYY-MM-DD, 로컬 기준) */
  date: string
  /** 뽑은 향 id */
  scentId: string
}

/** 로컬 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function todayKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function readState(): DrawState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DrawState
    if (!parsed?.date || !parsed?.scentId) return null
    return parsed
  } catch {
    return null
  }
}

function writeState(state: DrawState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* localStorage 비활성 환경(시크릿 등) — 조용히 무시 */
  }
}

/** 오늘 이미 뽑았으면 그 향을, 아니면 null */
export function getDrawnToday(): TodayScent | null {
  const state = readState()
  if (!state || state.date !== todayKey()) return null
  return getScentById(state.scentId) ?? null
}

/** 오늘 이미 뽑았는지 여부 */
export function hasDrawnToday(): boolean {
  return getDrawnToday() !== null
}

/**
 * 오늘의 향을 뽑는다. 이미 뽑았으면 기존 향을 그대로 반환(멱등).
 * 새로 뽑을 때는 직전 향은 피해서 매일 다른 향이 나오도록 한다.
 */
export function drawToday(): TodayScent {
  const existing = getDrawnToday()
  if (existing) return existing

  const prev = readState()
  const pool = prev
    ? TODAY_SCENTS.filter((s) => s.id !== prev.scentId)
    : TODAY_SCENTS
  const picked = pool[Math.floor(Math.random() * pool.length)]

  writeState({ date: todayKey(), scentId: picked.id })
  return picked
}
