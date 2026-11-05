'use client'

// ANSAN 띠지 인화 장수 — 손님이 프레임 고르는 화면에서 1장 단위로 고른다(StripFlow).
// 4×6 한 장은 프린터 2인치 자르기로 언제나 두 줄이 되어 나온다 → 홀수면 마지막 한 장의 한 줄은 비어 나온다(stripPrintPlan).
// 부스마다 관리자 창(STORE ADMIN)에서 정한다, 그 기기 localStorage: 최대 장수 · 자동 인화수(찍힌 인원수까지만).

export const STRIPS_PER_SHEET = 2
/** 관리자 창에서 고르는 최대 장수 */
export const STRIP_MAX_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10] as const
export const STRIP_MAX_DEFAULT = 4

const MAX_KEY = 'acscent-booth-strip-max-v1'
const AUTO_KEY = 'acscent-booth-strip-auto-v1'

const valid = (n: number) => (STRIP_MAX_CHOICES as readonly number[]).includes(n)

/** 이 부스의 최대 장수 — 없거나 이상하면 기본 4장 */
export function readStripMax(): number {
  try {
    const n = Number(localStorage.getItem(MAX_KEY))
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

/** 자동 인화수 — 켜면 찍힌 인원수까지만 고른다. 기본 꺼짐 */
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
 * 손님이 고를 수 있는 장수와 처음 골라 둘 값.
 * 자동 인화수가 켜져 있고 인원수를 알면 1~인원수(최대 장수는 넘지 않게), 처음 값은 그 인원수.
 * 아니면 1~최대 장수, 처음 값은 2장(4×6 한 장을 남김없이 쓰는 값).
 */
export function stripCountOptions(max: number, auto: boolean, people: number): { choices: number[]; initial: number } {
  const limited = auto && people > 0
  const cap = Math.max(1, limited ? Math.min(max, people) : max)
  const choices = Array.from({ length: cap }, (_, i) => i + 1)
  return { choices, initial: limited ? cap : Math.min(STRIPS_PER_SHEET, cap) }
}

/** 고른 장수 → 인쇄할 4×6 수: 두 줄 다 찬 장 + 홀수면 한 줄만 찬 장 */
export function stripPrintPlan(count: number): { fullSheets: number; halfSheet: boolean } {
  const n = Math.max(1, Math.floor(count))
  return { fullSheets: Math.floor(n / STRIPS_PER_SHEET), halfSheet: n % STRIPS_PER_SHEET === 1 }
}
