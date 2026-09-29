'use client'

// 키오스크 사주 결과 4장 — 줄글 대신 그림·카드 중심. 기존·레트로 두 화면이 같이 쓴다.
// 흰 카드 + 짙은 글자라 어떤 배경(짙은 행사 배경 포함)에서도 읽힌다. 글꼴은 기기에서 고른 글꼴을 물려받고
// 한자는 Noto Sans TC 로 통일한다. 긴 해석은 앞 1~2문장만 보이고 '자세히 보기'로 펼친다.
// 문구는 src/lib/kiosk/saju-i18n.ts (5개 언어), 해석 문장은 서버가 손님 언어로 만든다.

import { useState } from 'react'
import { getPerfumeById } from '@/data/perfumes'
import { SAJU_ELEMENT_INFO, SAJU_PURPOSES, type SajuAnalysisResult, type SajuElement } from '@/types/analysis'
import type { SajuText } from '@/lib/kiosk/saju-i18n'
import './saju-report.css'

const PILLAR_ORDER = ['hour', 'day', 'month', 'year'] as const
const ELEMENT_ORDER: SajuElement[] = ['목', '화', '토', '금', '수']

/** 문장 단위로 자른다 — 한국어 '다.' 일본어 '。' 중국어 '。' 영어 '. ' 모두 */
function sentences(text: string | undefined | null): string[] {
  if (!text) return []
  return (text.match(/[^.!?。！？]+[.!?。！？]+["'”」)]*|[^.!?。！？]+$/g) ?? [text]).map(s => s.trim()).filter(Boolean)
}

/** 앞 n문장만 보이고 나머지는 '자세히 보기' */
function Brief({ text, n = 2, tx, className = '' }: { text: string | undefined | null; n?: number; tx: SajuText; className?: string }) {
  const [open, setOpen] = useState(false)
  const all = sentences(text)
  if (!all.length) return null
  const shown = open ? all : all.slice(0, n)
  return (
    <div className={`sjr-brief ${className}`}>
      {shown.length > 0 && <p>{shown.join(' ')}</p>}
      {all.length > n && (
        <button type="button" className="sjr-more" onClick={() => setOpen(v => !v)}>{open ? tx.less : `${tx.more} ▾`}</button>
      )}
    </div>
  )
}

/** 오행 색 — 원색 대신 먹·광물 안료 같은 가라앉은 색. deep = 칸·글자, tint = 옅은 바탕 */
const PALETTE: Record<SajuElement, { deep: string; tint: string }> = {
  목: { deep: '#3F5A48', tint: '#E6ECE5' }, // 청록 먹빛
  화: { deep: '#8E3B2F', tint: '#F3E3DD' }, // 주사(朱砂)
  토: { deep: '#86673A', tint: '#F1E8D8' }, // 황토
  금: { deep: '#66645F', tint: '#ECEAE4' }, // 은회
  수: { deep: '#1F2B45', tint: '#E2E6EE' }, // 먹 남색
}
const elColor = (e: SajuElement) => PALETTE[e]?.deep ?? '#3f3a33'
const elTint = (e: SajuElement) => PALETTE[e]?.tint ?? '#efe9dd'
const elHanja = (e: SajuElement) => SAJU_ELEMENT_INFO[e]?.hanja ?? ''
/** 짙은 칸 위 글자 — 한지색 */
const onEl = (e: SajuElement) => (e ? '#FBF8F2' : '#FBF8F2')
const elInk = (e: SajuElement) => elColor(e)

// ─────────────────────────────── 1. 명식
export function SajuChartView({ result, tx }: { result: SajuAnalysisResult; tx: SajuText }) {
  const chart = result.sajuChart
  const y = chart.yongsin.element
  const counts = chart.elementCount
  const max = Math.max(1, ...ELEMENT_ORDER.map(e => counts[e] ?? 0))
  const strongest = ELEMENT_ORDER.reduce((a, b) => ((counts[b] ?? 0) > (counts[a] ?? 0) ? b : a), ELEMENT_ORDER[0])
  const purpose = SAJU_PURPOSES.find(p => p.id === result.sajuPurpose)
  return (
    <div className="sjr">
      <div className="sjr-hero">
        <div className="sjr-hero-glyph" style={{ background: elColor(chart.dayMaster.element), color: onEl(chart.dayMaster.element) }}>{chart.dayMaster.hanja}</div>
        <div>
          <p className="sjr-kicker">{tx.dayMaster}{purpose ? ` · ${purpose.hanja} ${tx.purposes[purpose.id]?.label ?? purpose.label}` : ''}</p>
          <p className="sjr-hero-title">
            <span className="sjr-han">{elHanja(chart.dayMaster.element)}</span> {tx.elements[chart.dayMaster.element]} · {tx.yinYang[chart.dayMaster.yinYang]} · {tx.strength[chart.dayMaster.strength]}
          </p>
        </div>
      </div>

      <div className="sjr-pillars">
        {PILLAR_ORDER.map(key => {
          const p = chart.pillars[key]
          const isDay = key === 'day'
          return (
            <div key={key} className="sjr-pillar" data-day={isDay || undefined}>
              <p className="sjr-pillar-head">{tx.pillarHeads[key]}{isDay && <b>{tx.me}</b>}</p>
              {p ? (
                <>
                  <div className="sjr-tile" style={{ background: elTint(p.ganElement), color: elColor(p.ganElement), borderColor: elColor(p.ganElement) }}>
                    <span className="sjr-tile-glyph">{p.ganHanja}</span>
                    <span className="sjr-tile-el">{elHanja(p.ganElement)} {tx.elements[p.ganElement] !== elHanja(p.ganElement) ? tx.elements[p.ganElement] : ''}</span>
                  </div>
                  <div className="sjr-tile" style={{ background: elTint(p.jiElement), color: elColor(p.jiElement), borderColor: elColor(p.jiElement) }}>
                    <span className="sjr-tile-glyph">{p.jiHanja}</span>
                    <span className="sjr-tile-el">{tx.animals[p.jiAnimal] ?? p.jiAnimal}</span>
                  </div>
                </>
              ) : (
                <div className="sjr-tile sjr-tile--empty"><span className="sjr-tile-glyph">?</span><span className="sjr-tile-el">{tx.noHour}</span></div>
              )}
            </div>
          )
        })}
      </div>

      <section className="sjr-card">
        <p className="sjr-card-title">{tx.elementsTitle}</p>
        <div className="sjr-bars">
          {ELEMENT_ORDER.map(e => (
            <div key={e} className="sjr-bar" data-yongsin={e === y || undefined}>
              <span className="sjr-bar-name"><span className="sjr-han" style={{ color: elInk(e) }}>{elHanja(e)}</span> {tx.elements[e] !== elHanja(e) ? tx.elements[e] : ''}</span>
              <span className="sjr-bar-track"><i style={{ width: `${Math.max(4, ((counts[e] ?? 0) / max) * 100)}%`, background: elColor(e) }} /></span>
              <span className="sjr-bar-num">{Math.round((counts[e] ?? 0) * 10) / 10}</span>
              {e === y && <em>{tx.fill}</em>}
              {e === strongest && e !== y && <em className="sjr-bar-strong">{tx.strongest}</em>}
            </div>
          ))}
        </div>
      </section>

      <section className="sjr-yongsin" style={{ borderColor: elColor(y) }}>
        <div className="sjr-yongsin-glyph" style={{ background: elColor(y), color: onEl(y) }}>{elHanja(y)}</div>
        <div>
          <p className="sjr-kicker">{tx.yongsin} · {tx.fill}</p>
          <p className="sjr-yongsin-title">{tx.elements[y]} · {tx.noteFamily[y]}</p>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────── 2. 풀이
export function SajuReadingView({ result, tx }: { result: SajuAnalysisResult; tx: SajuText }) {
  const s = result.sajuAnalysis
  const chart = result.sajuChart
  const lacking = chart.yongsin.lackingElements?.[0] ?? chart.yongsin.element
  const counts = chart.elementCount
  const strongest = ELEMENT_ORDER.reduce((a, b) => ((counts[b] ?? 0) > (counts[a] ?? 0) ? b : a), ELEMENT_ORDER[0])
  const flows: { key: string; label: string; el: SajuElement; text: string }[] = [
    { key: 'dominant', label: tx.flow.dominant, el: strongest, text: s.elementFlow.dominantNarrative },
    { key: 'lacking', label: tx.flow.lacking, el: lacking, text: s.elementFlow.lackingNarrative },
    { key: 'yongsin', label: tx.flow.yongsin, el: chart.yongsin.element, text: s.elementFlow.yongsinNarrative },
  ]
  const pillars = ([
    ['year', s.pillarsReading.year], ['month', s.pillarsReading.month], ['day', s.pillarsReading.day], ['hour', s.pillarsReading.hour],
  ] as const).filter(([, v]) => Boolean(v))
  return (
    <div className="sjr">
      <section className="sjr-card sjr-card--hero">
        <p className="sjr-kicker">{tx.dayMaster} · <span className="sjr-han">{s.dayMasterReading.hanja}</span></p>
        <p className="sjr-big">{s.dayMasterReading.archetypeTitle}</p>
        <p className="sjr-quote">{sentences(s.dayMasterReading.natureMetaphor).slice(0, 2).join(' ')}</p>
        <Brief text={s.dayMasterReading.narrative} n={0} tx={tx} />
      </section>

      <p className="sjr-section">{tx.flowTitle}</p>
      <div className="sjr-flow">
        {flows.map(f => (
          <section key={f.key} className="sjr-card sjr-flow-card" style={{ borderTopColor: elColor(f.el) }}>
            <p className="sjr-flow-head">
              <span className="sjr-flow-glyph" style={{ background: elColor(f.el), color: onEl(f.el) }}>{elHanja(f.el)}</span>
              {f.label}
            </p>
            <Brief text={f.text} n={1} tx={tx} />
          </section>
        ))}
      </div>

      <p className="sjr-section">{tx.pillarsTitle}</p>
      <div className="sjr-grid2">
        {pillars.map(([k, v]) => (
          <section key={k} className="sjr-card">
            <p className="sjr-kicker">{tx.pillarHeads[k]}</p>
            <p className="sjr-card-title">{v!.title}</p>
            <Brief text={v!.meaning} n={1} tx={tx} />
          </section>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────── 3. 물음
export function SajuPurposeView({ result, tx }: { result: SajuAnalysisResult; tx: SajuText }) {
  const p = result.sajuAnalysis.purposeReading
  const c = result.sajuAnalysis.compatibilityReading
  const yearly = result.sajuAnalysis.yearlyFlow
  const label = tx.purposes[p.purpose]?.label ?? ''
  return (
    <div className="sjr">
      <section className="sjr-card sjr-card--hero">
        <p className="sjr-kicker">{label}</p>
        <p className="sjr-big">{p.title}</p>
      </section>

      {!!p.keyInsights?.length && (
        <>
          <p className="sjr-section">{tx.insights}</p>
          <ol className="sjr-insights">
            {p.keyInsights.slice(0, 3).map((k, i) => (
              <li key={i} className="sjr-card"><b>{i + 1}</b><span>{k}</span></li>
            ))}
          </ol>
        </>
      )}

      {p.timingAdvice && (
        <section className="sjr-card sjr-card--accent">
          <p className="sjr-kicker">⏱ {tx.timing}</p>
          <Brief text={p.timingAdvice} n={2} tx={tx} />
        </section>
      )}

      {c && (
        <section className="sjr-card">
          <div className="sjr-compat">
            <div className="sjr-score"><b>{c.score}</b><span>/100</span></div>
            <div>
              <p className="sjr-kicker">{tx.compatTitle}</p>
              <p className="sjr-card-title">{c.title}</p>
            </div>
          </div>
          <div className="sjr-chips">
            {c.harmonyPoints?.map((h, i) => <span key={`h${i}`} className="sjr-chip sjr-chip--good">✓ {h}</span>)}
            {c.frictionPoints?.map((f, i) => <span key={`f${i}`} className="sjr-chip">⚡ {f}</span>)}
          </div>
          <Brief text={c.dynamicNarrative} n={1} tx={tx} />
        </section>
      )}

      {yearly && (
        <section className="sjr-card">
          <p className="sjr-kicker">{yearly.yearTitle}</p>
          <Brief text={yearly.narrative} n={2} tx={tx} />
        </section>
      )}

      <Brief text={p.narrative} n={0} tx={tx} className="sjr-brief--tail" />
    </div>
  )
}

// ─────────────────────────────── 4. 처방
export function SajuPrescriptionView({ result, tx }: { result: SajuAnalysisResult; tx: SajuText }) {
  const d = result.sajuAnalysis.scentDestiny
  const top = result.matchingPerfumes[0]
  const persona = top?.persona
  const y = result.sajuChart.yongsin.element
  const no = (top?.perfumeId.match(/(\d+)\s*$/)?.[1] ?? '--').padStart(2, '0')
  const category = (getPerfumeById(top?.perfumeId ?? '')?.category ?? 'scent').toUpperCase()
  const pct = top ? Math.round(top.score <= 1 ? top.score * 100 : top.score) : null
  const layers = [
    { key: 'top', label: tx.layers.top, name: persona?.mainScent?.name, text: d.topMeaning },
    { key: 'middle', label: tx.layers.middle, name: persona?.subScent1?.name, text: d.middleMeaning },
    { key: 'base', label: tx.layers.base, name: persona?.subScent2?.name, text: d.baseMeaning },
  ]
  return (
    <div className="sjr">
      <section className="sjr-scent" style={{ ['--sjr-el' as string]: elColor(y) }}>
        <p className="sjr-scent-kicker">{tx.scentTitle} · <span className="sjr-han">{elHanja(y)}</span> {tx.elements[y] !== elHanja(y) ? tx.elements[y] : ''}</p>
        <p className="sjr-scent-no">No. {no}</p>
        <p className="sjr-scent-name">{persona?.name ?? '-'}</p>
        <p className="sjr-scent-meta">{category}{pct !== null ? ` · ${tx.match(pct)}` : ''}</p>
        {!!persona?.keywords?.length && (
          <div className="sjr-scent-tags">{persona.keywords.slice(0, 4).map(k => <span key={k}>#{k}</span>)}</div>
        )}
      </section>

      {d.elementBridge && <p className="sjr-bridge">{d.elementBridge}</p>}

      <div className="sjr-layers">
        {layers.map((l, i) => (
          <section key={l.key} className="sjr-layer" style={{ ['--i' as string]: i }}>
            <p className="sjr-layer-head"><b>{l.label}</b><span>{l.name ?? '-'}</span></p>
            <Brief text={l.text} n={1} tx={tx} />
          </section>
        ))}
      </div>

      <div className="sjr-grid2">
        <section className="sjr-card">
          <p className="sjr-kicker">🕰 {tx.ritual}</p>
          <Brief text={d.ritualGuide} n={1} tx={tx} />
        </section>
        <section className="sjr-card">
          <p className="sjr-kicker">✦ {tx.moment}</p>
          <Brief text={d.wearingMoment} n={1} tx={tx} />
        </section>
      </div>

      <section className="sjr-card">
        <p className="sjr-kicker">{tx.why}</p>
        <Brief text={d.whyNarrative} n={1} tx={tx} />
      </section>
    </div>
  )
}
