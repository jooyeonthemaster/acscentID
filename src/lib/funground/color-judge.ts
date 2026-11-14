// 펀그라운드 B안 퍼스널 컬러 — 기기 안에서 잰 색(ColorMeasure)으로 결과를 정하거나 「다시 찍기」 이유를 고른다(순수 함수).
// 판정은 키오스크와 같은 숫자 규칙(src/lib/kiosk/color-rules.ts diagnoseFromMeasure) 하나뿐 — AI 에 묻지 않는다.
// 규칙이 유형까지 정하지 못하면(얼굴 못 찾음 · 조명 · 머리카락 안 보임) 결과를 지어내지 않고 다시 찍게 한다.

import type { PersonalColorTypeId } from '@/types/analysis'
import { diagnoseFromMeasure } from '@/lib/kiosk/color-rules'
import type { ColorMeasure } from '@/lib/kiosk/garment-core'

export type FgRetakeReason = 'no-face' | 'small-face' | 'too-dark' | 'too-bright' | 'odd-light' | 'no-hair'

export type FgColorJudge =
  | { ok: true; typeId: PersonalColorTypeId; undertone: 'warm' | 'cool' }
  | { ok: false; reason: FgRetakeReason }

/**
 * measure 가 null 이면 얼굴 피부를 충분히 찾지 못한 사진이다(얼굴이 없거나 아주 작음 — measureColors).
 * diagnoseFromMeasure 가 null 이면 그 까닭(diagnoseFromMeasure 와 같은 순서 · 같은 경계)을 손님 말로 고른다.
 */
export function judgeColor(measure: ColorMeasure | null | undefined): FgColorJudge {
  if (!measure) return { ok: false, reason: 'no-face' }
  const diagnosis = diagnoseFromMeasure(measure)
  if (!diagnosis) {
    const chroma = Math.hypot(measure.skin.a, measure.skin.b)
    if (measure.skinShare < 0.02) return { ok: false, reason: 'small-face' }
    if (measure.skin.L < 35) return { ok: false, reason: 'too-dark' }
    if (measure.skin.L > 90) return { ok: false, reason: 'too-bright' }
    if (chroma < 8 || chroma > 36) return { ok: false, reason: 'odd-light' }
    return { ok: false, reason: 'no-face' }
  }
  // 웜/쿨만 정해졌다 — 머리카락을 못 재 밝기 대비를 모른다(키오스크는 여기서 AI 가 고르지만 B안은 다시 찍는다)
  if (!diagnosis.typeId) return { ok: false, reason: 'no-hair' }
  return { ok: true, typeId: diagnosis.typeId, undertone: diagnosis.undertone }
}

export interface FgRetakeText {
  title: string
  desc: string
  tips: string[]
}

/** 다시 찍기 안내 — 탓하지 않고, 무엇을 바꾸면 되는지만 */
export const FG_RETAKE_TEXTS: Record<FgRetakeReason, FgRetakeText> = {
  'no-face': {
    title: '얼굴을 잘 찾지 못했어요',
    desc: '얼굴이 동그라미 안에 잘 들어오면 색을 잴 수 있어요.',
    tips: ['화면 속 동그라미에 얼굴을 맞춰 주세요', '모자 · 마스크는 잠깐 벗어 주세요', '카메라를 정면으로 바라봐 주세요'],
  },
  'small-face': {
    title: '얼굴이 조금 작게 찍혔어요',
    desc: '한 걸음 앞으로 와서 얼굴이 더 크게 보이게 찍어 볼까요?',
    tips: ['한 걸음 가까이 와 주세요', '얼굴이 동그라미를 꽉 채우게 해 주세요', '한 번에 한 명씩 찍어 주세요'],
  },
  // 피부가 짙은 사람도 여기로 온다(키오스크 규칙은 피부 L* 35 미만을 조명 탓으로 본다) — 그래서 사람이 아니라 '빛' 이야기만 한다
  'too-dark': {
    title: '빛이 조금 부족했어요',
    desc: '얼굴에 빛이 고르게 닿으면 색을 더 정확하게 잴 수 있어요.',
    tips: ['조금 더 밝은 곳에 서 주세요', '뒤에 창문이나 밝은 조명이 없게 해 주세요', '얼굴에 그림자가 지지 않게 고개를 들어 주세요'],
  },
  'too-bright': {
    title: '빛이 너무 세게 비쳤어요',
    desc: '얼굴이 하얗게 날아가면 피부 색을 잴 수 없어요.',
    tips: ['강한 조명을 바로 받지 않는 자리로 옮겨 주세요', '반 걸음 뒤로 가 주세요'],
  },
  'odd-light': {
    title: '조명 색이 얼굴에 많이 비쳤어요',
    desc: '알록달록한 조명이나 필터 없이 찍어야 피부 색을 잴 수 있어요.',
    tips: ['색깔 조명이 비치지 않는 곳에서 찍어 주세요', '얼굴 앞에 화면 · 휴대폰 빛이 없게 해 주세요'],
  },
  'no-hair': {
    title: '머리카락이 잘 보이지 않았어요',
    desc: '피부와 머리카락 색을 함께 재야 어울리는 색을 고를 수 있어요.',
    tips: ['모자 · 후드를 잠깐 벗어 주세요', '머리카락이 화면에 보이게 조금 뒤로 가 주세요', '머리 위가 잘리지 않게 동그라미에 맞춰 주세요'],
  },
}

/** 두 번 넘게 다시 찍어도 안 될 때 덧붙이는 말 */
export const FG_RETAKE_STAFF = '두세 번 해도 안 되면 직원에게 알려 주세요'
