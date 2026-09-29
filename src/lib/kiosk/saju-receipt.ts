// 사주 결과 → 영수증 사주 부분(ReceiptSaju). 기존·레트로 두 키오스크 화면이 같이 쓴다.
// 제목·오행 이름·향 층 이름은 화면 언어로, 해석 문장은 서버가 이미 그 언어로 만들어 준다.

import { SAJU_ELEMENT_INFO, type SajuAnalysisResult, type SajuElement } from '@/types/analysis'
import type { ReceiptSaju } from './receipt-canvas'
import type { SajuText } from './saju-i18n'

const PILLAR_KEYS = ['hour', 'day', 'month', 'year'] as const

// ── 십성(十星) — 일간과 다른 글자의 오행·음양 관계. 감정서 명식표의 윗줄·아랫줄에 쓴다(지지는 본기 기준)
const STEM_INFO: Record<string, { el: number; yang: boolean }> = {
  甲: { el: 0, yang: true }, 乙: { el: 0, yang: false }, 丙: { el: 1, yang: true }, 丁: { el: 1, yang: false },
  戊: { el: 2, yang: true }, 己: { el: 2, yang: false }, 庚: { el: 3, yang: true }, 辛: { el: 3, yang: false },
  壬: { el: 4, yang: true }, 癸: { el: 4, yang: false },
}
/** 지지 본기(本氣) 천간 */
const BRANCH_MAIN: Record<string, string> = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' }
/** 목0 화1 토2 금3 수4 — 상생 +1, 상극 +2 */
export function tenGod(dayStem: string, other: string): string {
  const d = STEM_INFO[dayStem], o = STEM_INFO[other] ?? STEM_INFO[BRANCH_MAIN[other] ?? '']
  if (!d || !o) return ''
  const same = d.yang === o.yang
  const diff = (o.el - d.el + 5) % 5
  if (diff === 0) return same ? '比肩' : '劫財'
  if (diff === 1) return same ? '食神' : '傷官'   // 내가 낳음
  if (diff === 2) return same ? '偏財' : '正財'   // 내가 극함
  if (diff === 3) return same ? '偏官' : '正官'   // 나를 극함
  return same ? '偏印' : '正印'                   // 나를 낳음
}
const PILLAR_HEADS: Record<(typeof PILLAR_KEYS)[number], string> = { hour: '時柱', day: '日柱', month: '月柱', year: '年柱' }

export function buildReceiptSaju(r: SajuAnalysisResult, sx: SajuText, korean: boolean, genderText = ''): ReceiptSaju {
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
        ganGod: k === 'day' ? '日主' : tenGod(chart.dayMaster.hanja, p.ganHanja),
        jiGod: tenGod(chart.dayMaster.hanja, p.jiHanja),
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
    genderText,
    birthDate: `${chart.birthDisplay.solarDate.replace(/-/g, '.')}${chart.birthDisplay.calendar === 'lunar' ? ` (${sx.lunar})` : ` (${sx.solar})`}`,
    birthTime: chart.birthDisplay.sijin ? (korean ? chart.birthDisplay.sijin : chart.birthDisplay.sijin.replace(/^[가-힣]+/, '').replace(/[()]/g, '')) : sx.noHour,
  }
}
