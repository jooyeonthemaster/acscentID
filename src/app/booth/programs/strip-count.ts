'use client'

// ANSAN 사진 인화 장수 — 손님이 프레임 고르는 화면에서 2장 단위로 고른다(StripFlow).
// 4×6 한 장은 프린터 2인치 자르기로 언제나 두 조각이 되어 나온다(DS-RX1 드라이버에 한 조각만 뽑는 설정이 없다).
// 그래서 두 조각에 같은 사진을 넣고 2장 단위로만 판다 — 홀수를 허용했더니 빈 종이가 함께 나왔다(2026-11-05 실물 확인).
// 부스마다 관리자 창(STORE ADMIN)에서 정한다, 그 기기 localStorage: 최대 장수 · 자동 인화수(찍힌 인원수에 맞춰).

export const STRIPS_PER_SHEET = 2
/** 관리자 창에서 고르는 최대 장수 */
export const STRIP_MAX_CHOICES = [2, 4, 6, 8, 10] as const
export const STRIP_MAX_DEFAULT = 4

const MAX_KEY = 'acscent-booth-strip-max-v1'
const AUTO_KEY = 'acscent-booth-strip-auto-v1'

const valid = (n: number) => (STRIP_MAX_CHOICES as readonly number[]).includes(n)
/** 2장 단위로 올림 — 3명 → 4장 */
const toPairs = (n: number) => Math.ceil(n / STRIPS_PER_SHEET) * STRIPS_PER_SHEET

/** 이 부스의 최대 장수 — 없거나 이상하면 기본 4장. 1장 단위 시절에 저장한 홀수는 위로 올려 읽는다 */
export function readStripMax(): number {
  try {
    const n = toPairs(Number(localStorage.getItem(MAX_KEY)))
    return valid(n) ? n : STRIP_MAX_DEFAULT
  } catch {
    return STRIP_MAX_DEFAULT
  }
}

/** 최대 장수를 이 부스에 저장 — 저장소를 못 쓰면 false */
export function writeStripMax(n: number): boolean {
  if (!valid(n)) return false
  try {
    localStorage.setItem(MAX_KEY, String(n))
    return readStripMax() === n
  } catch {
    return false
  }
}

/** 자동 인화수 — 켜면 찍힌 인원수에 맞춰(2장 단위로 올림) 그 장수까지만 고른다. 기본 꺼짐 */
export function readStripAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) === '1'
  } catch {
    return false
  }
}

export function writeStripAuto(on: boolean): boolean {
  try {
    localStorage.setItem(AUTO_KEY, on ? '1' : '0')
    return readStripAuto() === on
  } catch {
    return false
  }
}

/**
 * 손님이 고를 수 있는 장수(2장 단위)와 처음 골라 둘 값.
 * 자동 인화수가 켜져 있고 인원수를 알면 2장~인원수를 올린 장수(최대 장수는 넘지 않게), 처음 값은 그 장수.
 * 아니면 2장~최대 장수, 처음 값은 2장.
 */
export function stripCountOptions(max: number, auto: boolean, people: number): { choices: number[]; initial: number } {
  const limited = auto && people > 0
  const top = toPairs(Math.max(STRIPS_PER_SHEET, limited ? Math.min(max, toPairs(people)) : max))
  const choices = Array.from({ length: top / STRIPS_PER_SHEET }, (_, i) => (i + 1) * STRIPS_PER_SHEET)
  return { choices, initial: limited ? top : STRIPS_PER_SHEET }
}

/** 고른 장수 → 인쇄할 4×6 수 */
export function stripSheets(count: number): number {
  return Math.max(1, Math.ceil(count / STRIPS_PER_SHEET))
}
