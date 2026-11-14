// 퍼스널 컬러 — 기기가 잰 색(Lab)으로 유형을 정하는 숫자 규칙(순수 함수 — 서버 · 브라우저 어디서나).
// 키오스크 AI 퍼스널 컬러(color-analysis.ts, 서버)가 AI 에 유형을 못 박을 때 쓰고,
// 펀그라운드 B안 퍼스널 컬러(/booth-demo/funground/color)는 AI 없이 이 규칙만으로 판정한다.
// color-analysis.ts 에서 옮겨 왔다(2026-11-14) — 그쪽은 Gemini 클라이언트를 함께 불러 브라우저에 실을 수 없다. 값 · 동작은 그대로.

import { PERSONAL_COLOR_TYPES } from './color-types'
import type { ColorMeasure } from './garment-core'
import type { PersonalColorTypeId } from '@/types/analysis'

/**
 * 측정값으로 유형을 정하는 경계값 — 모두 어림값이다. 조명(화이트밸런스·노출)에 따라 달라지고, 유형이 확정된 사람들로 맞춘 값이 아니다.
 * 서버 로그의 측정값(`[KIOSK-COLOR-…] 사진 … 피부 L a b`)을 모아 실기 조명에서 여러 사람으로 확인하며 조정할 것.
 *  · 웜/쿨: 피부 색상각(노랑 쪽일수록 큼)
 *  · 딥: 피부가 어두움 / 브라이트: 피부와 머리카락의 명도 차가 큼 / 라이트: 대비가 작고 맑으며 피부가 밝음 / 뮤트: 그 밖
 */
const UNDERTONE_HUE = 55
const DEEP_SKIN_L = 60
const BRIGHT_CONTRAST = 66
const LIGHT_SKIN_L = 68
const LIGHT_CHROMA_MAX = 17

export const skinHue = (m: ColorMeasure) => (Math.atan2(m.skin.b, m.skin.a) * 180) / Math.PI
const to100 = (value: number, lo: number, hi: number) => Math.round(Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100)))

/** 측정값으로 정한 진단 — typeId 가 없으면 웜/쿨만 정해졌다(머리카락을 못 잰 사진: 그 안의 4유형은 AI 가 고른다) */
export interface MeasuredDiagnosis {
  undertone: 'warm' | 'cool'
  typeId: PersonalColorTypeId | null
  scores: { warmth: number; brightness: number; clarity: number; contrast: number | null }
  /** 웜·쿨 경계에 가깝다 — 확신을 '높음'으로 내지 않는다 */
  edge: boolean
}

/**
 * 측정값으로 유형을 정한다. AI 가 눈으로 고르면 같은 사람도 사진이 조금만 달라지면 유형이 바뀌었다
 * (같은 조명에서 살짝 다르게 찍은 7장 중 3~4장이 웜↔쿨, 2장이 라이트↔뮤트 — 2026-10-10 실험). 측정값은 7장이 거의 같다.
 * 그래서 유형은 숫자로 정하고 AI 는 그 유형의 설명만 쓴다.
 * 피부로 보기 어려운 값(너무 어둡거나 밝음, 무채색에 가깝거나 지나치게 짙음)은 조명 탓일 수 있어 숫자로 정하지 않는다(null → AI 가 판단).
 */
export function diagnoseFromMeasure(m: ColorMeasure | null | undefined): MeasuredDiagnosis | null {
  if (!m) return null
  const chroma = Math.hypot(m.skin.a, m.skin.b)
  if (m.skin.L < 35 || m.skin.L > 90 || chroma < 8 || chroma > 36 || m.skinShare < 0.02) return null
  const hue = skinHue(m)
  const undertone = hue >= UNDERTONE_HUE ? 'warm' : 'cool'
  const contrast = m.hair ? m.skin.L - m.hair.L : null
  const scores = {
    // 온도 눈금은 유형 쪽에 서게 한다(웜 55 이상 · 쿨 45 이하 — parseColorResponse 와 같은 규칙)
    warmth: undertone === 'warm' ? Math.max(55, to100(hue, 45, 65)) : Math.min(45, to100(hue, 45, 65)),
    brightness: to100(m.skin.L, 50, 85),
    clarity: to100(chroma, 10, 24),
    contrast: contrast === null ? null : to100(contrast, 35, 80),
  }
  let tone: 'light' | 'bright' | 'mute' | 'deep' | null = null
  if (m.skin.L <= DEEP_SKIN_L) tone = 'deep'
  else if (contrast !== null) {
    tone = contrast >= BRIGHT_CONTRAST ? 'bright' : m.skin.L >= LIGHT_SKIN_L && chroma < LIGHT_CHROMA_MAX ? 'light' : 'mute'
  }
  const typeId = tone
    ? (PERSONAL_COLOR_TYPES.find((t) => t.undertone === undertone && t.tone === tone)?.id ?? null)
    : null
  return { undertone, typeId, scores, edge: Math.abs(hue - UNDERTONE_HUE) < 1.5 }
}
