'use client'

// ANSAN 띠지 인화 장수 — 4×6 한 장이 프린터 2인치 자르기로 띠지 두 장이 되어 나와서 2장 단위로 고른다(홀수면 빈 띠지가 섞여 나온다).
// 손님이 결과 화면에서 고르고(StripFlow), 고를 수 있는 최대 장수는 부스마다 관리자 창(STORE ADMIN)에서 정한다 — 그 기기 localStorage.

export const STRIPS_PER_SHEET = 2
/** 관리자 창에서 고르는 최대 장수 */
export const STRIP_MAX_CHOICES = [2, 4, 6, 8, 10] as const
export const STRIP_MAX_DEFAULT = 4

const KEY = 'acscent-booth-strip-max-v1'

const valid = (n: number) => (STRIP_MAX_CHOICES as readonly number[]).includes(n)

/** 이 부스의 최대 장수 — 없거나 이상하면 기본 4장 */
export function readStripMax(): number {
  try {
    const n = Number(localStorage.getItem(KEY))
    return valid(n) ? n : STRIP_MAX_DEFAULT
  } catch {
    return STRIP_MAX_DEFAULT
  }
}

/** 최대 장수를 이 부스에 저장 — 저장소를 못 쓰면 false */
export function writeStripMax(n: number): boolean {
  if (!valid(n)) return false
  try {
    localStorage.setItem(KEY, String(n))
    return readStripMax() === n
  } catch {
    return false
  }
}

/** 손님이 고를 수 있는 장수 — 2장부터 최대까지 2장씩 */
export function stripCountChoices(max: number): number[] {
  const out: number[] = []
  for (let n = STRIPS_PER_SHEET; n <= max; n += STRIPS_PER_SHEET) out.push(n)
  return out
}
