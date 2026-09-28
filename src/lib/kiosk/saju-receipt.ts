// 사주 결과 → 영수증 사주 부분(ReceiptSaju). 기존·레트로 두 키오스크 화면이 같이 쓴다.
// 제목·오행 이름·향 층 이름은 화면 언어로, 해석 문장은 서버가 이미 그 언어로 만들어 준다.

import { SAJU_ELEMENT_INFO, type SajuAnalysisResult, type SajuElement } from '@/types/analysis'
import type { ReceiptSaju } from './receipt-canvas'
import type { SajuText } from './saju-i18n'

const PILLAR_KEYS = ['hour', 'day', 'month', 'year'] as const
const PILLAR_HEADS: Record<(typeof PILLAR_KEYS)[number], string> = { hour: '時柱', day: '日柱', month: '月柱', year: '年柱' }

export function buildReceiptSaju(r: SajuAnalysisResult, sx: SajuText, korean: boolean): ReceiptSaju {
  const chart = r.sajuChart
  const d = r.sajuAnalysis.scentDestiny
  const persona = r.matchingPerfumes[0]?.persona
  const hanja = (e: SajuElement) => SAJU_ELEMENT_INFO[e]?.hanja ?? ''
  const el = (e: SajuElement) => (korean ? `${e}(${hanja(e)})` : `${hanja(e)} ${sx.elements[e]}`)
  // 기둥 아래 읽기 — 한국어는 글자 읽기(병·오), 다른 언어는 오행 이름(Fire·Water)
  const read = (glyph: string, e: SajuElement) => (korean ? glyph : sx.elements[e])

  return {
    pillars: PILLAR_KEYS.map((k) => {
      const p = chart.pillars[k]
      if (!p) return null
      return {
        head: PILLAR_HEADS[k],
        ganHanja: p.ganHanja,
        ganRead: read(p.gan, p.ganElement),
        ganElement: hanja(p.ganElement),
        jiHanja: p.jiHanja,
        jiRead: read(p.ji, p.jiElement),
        jiElement: hanja(p.jiElement),
        isDay: k === 'day',
      }
    }),
    dayMaster: korean
      ? `${chart.dayMaster.gan}(${chart.dayMaster.hanja}) · ${chart.dayMaster.strength}`
      : `${chart.dayMaster.hanja} ${sx.elements[chart.dayMaster.element]} · ${sx.strength[chart.dayMaster.strength]}`,
    yongsin: `${el(chart.yongsin.element)} · ${sx.noteFamily[chart.yongsin.element]}`,
    birth: `${chart.birthDisplay.solarDate}${chart.birthDisplay.sijin ? ` ${korean ? chart.birthDisplay.sijin : chart.birthDisplay.sijin.replace(/^[가-힣]+/, '').replace(/[()]/g, '')}` : ` ${sx.noHour}`}`,
    elements: (Object.entries(chart.elementCount) as [SajuElement, number][]).map(([e, v]) => ({
      label: el(e),
      value: Math.round(v * 10) / 10,
      isYongsin: e === chart.yongsin.element,
    })),
    bridge: d.elementBridge,
    why: d.whyNarrative,
    tiers: [
      { tier: sx.layers.top, name: persona?.mainScent?.name ?? '-', meaning: d.topMeaning },
      { tier: sx.layers.middle, name: persona?.subScent1?.name ?? '-', meaning: d.middleMeaning },
      { tier: sx.layers.base, name: persona?.subScent2?.name ?? '-', meaning: d.baseMeaning },
    ],
    ritual: d.ritualGuide,
    labels: sx.receipt,
  }
}
