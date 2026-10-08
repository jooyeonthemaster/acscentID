// 퍼스널 컬러 · 타로 결과 → 영수증 부분(ReceiptColor · ReceiptTarot)과 분석 기록 요약. saju-receipt.ts 의 짝.
// 기존·레트로 두 키오스크 화면이 같이 쓴다. 제목은 화면 언어로, 문장은 서버가 이미 그 언어로 만들어 준다.

import type { ColorAnalysisResult, ImageAnalysisResult, TarotAnalysisResult } from '@/types/analysis'
import type { KioskLang } from './i18n'
import type { ProgramText } from './program-i18n'
import type { ReceiptColor, ReceiptTarot } from './receipt-canvas'
import { TAROT_DECK } from './tarot-deck'

export function isColorResult(r: ImageAnalysisResult | null): r is ColorAnalysisResult {
  return Boolean(r && 'colorDiagnosis' in r)
}

export function isTarotResult(r: ImageAnalysisResult | null): r is TarotAnalysisResult {
  return Boolean(r && 'tarotSpread' in r)
}

export function buildReceiptColor(r: ColorAnalysisResult, px: ProgramText): ReceiptColor {
  const tx = px.color
  const d = r.colorDiagnosis
  return {
    title: tx.receipt.title,
    typeName: tx.typeNames[d.typeId],
    undertone: tx.undertone[d.undertone],
    nickname: d.title,
    summary: d.summary,
    toneLabel: tx.receipt.tone,
    gauges: (['warmth', 'brightness', 'clarity', 'contrast'] as const).map((key) => ({ ...tx.gauges[key], value: d.scores[key] })),
    bestLabel: tx.receipt.best,
    bestNames: d.bestColorNames,
    avoidLabel: tx.receipt.avoid,
    avoidNames: d.avoidColorNames,
    stylingLabel: tx.receipt.styling,
    styling: [
      { label: tx.styling.makeup, text: d.styling.makeup },
      { label: tx.styling.hair, text: d.styling.hair },
      { label: tx.styling.fashion, text: d.styling.fashion },
      { label: `${tx.styling.accessory} · ${tx.metal[d.metal]}`, text: d.styling.accessory },
    ],
    scentLabel: tx.receipt.scent,
    whyLabel: tx.receipt.why,
    bridge: d.scentBridge,
    why: d.scentWhy,
  }
}

export function buildReceiptTarot(r: TarotAnalysisResult, px: ProgramText, lang: KioskLang): ReceiptTarot {
  const tx = px.tarot
  const { tarotSpread: spread, tarotReading: reading } = r
  return {
    title: tx.receipt.title,
    topic: tx.topics[spread.topic].label,
    question: spread.question,
    headline: reading.headline,
    cards: spread.cards.map((c, i) => ({
      position: tx.positions[c.position].label,
      roman: TAROT_DECK[c.id].roman,
      name: TAROT_DECK[c.id].names[lang],
      orientation: c.reversed ? tx.reversed : tx.upright,
      reversed: c.reversed,
      element: c.element,
      title: reading.cards[i]?.title ?? '',
      keywords: (reading.cards[i]?.keywords ?? []).join(' · '),
    })),
    flowLabel: tx.receipt.flow,
    flow: reading.flow,
    adviceLabel: tx.receipt.advice,
    advice: reading.advice,
    scentLabel: tx.receipt.scent,
    whyLabel: tx.receipt.why,
    bridge: reading.scentBridge,
    why: reading.scentWhy,
    ritualLabel: tx.receipt.ritual,
    ritual: reading.ritual,
  }
}

/** 분석 기록(kiosk_analyses.detail)에 남기는 요약 — 유형·눈금 / 주제·뽑힌 카드. 사진과 긴 문장은 남기지 않는다 */
export function extraRecordDetail(r: ImageAnalysisResult): Record<string, unknown> | null {
  if (isColorResult(r)) {
    const d = r.colorDiagnosis
    return { type: d.typeId, undertone: d.undertone, scores: d.scores, confidence: d.confidence, title: d.title }
  }
  if (isTarotResult(r)) {
    const s = r.tarotSpread
    return {
      topic: s.topic,
      question: s.question ?? null,
      cards: s.cards.map((c) => ({ position: c.position, card: TAROT_DECK[c.id].names.ko, reversed: c.reversed })),
      scentElement: s.scentElement,
      headline: r.tarotReading.headline,
    }
  }
  return null
}

/** 기록의 analysis_text — 이미지 분석의 '분위기 + 스타일' 자리에 두 프로그램은 진단 요약·흐름을 넣는다 */
export function extraAnalysisText(r: ImageAnalysisResult): string | null {
  if (isColorResult(r)) return r.colorDiagnosis.summary
  if (isTarotResult(r)) return r.tarotReading.flow
  return null
}
