'use client'

// 키오스크 AI 퍼스널 컬러 결과 — 한 장 스크롤. 얼굴 사진에 색을 대어 보는 드레이프 → 진단 → 톤 눈금 → 스타일.
// 팔레트는 유형별 고정값(color-types.ts), 문장은 서버가 손님 언어로 쓴 것. 사주 결과의 카드 부품(.sjr-*)을 같이 쓴다. 향 추천은 없다.

import { useState, type CSSProperties } from 'react'
import { personalColorType, readableInk } from '@/lib/kiosk/color-types'
import type { ColorGaugeKey, ColorText, ProgramText } from '@/lib/kiosk/program-i18n'
import type { ColorAnalysisResult } from '@/types/analysis'
import { Brief, ScrollMoreHint } from './SajuReport'
import './saju-report.css'
import './programs.css'

const GAUGE_KEYS: ColorGaugeKey[] = ['warmth', 'brightness', 'clarity', 'contrast']

/** 촬영 화면 아래 안내 — 진단이 조명·가림에 민감해서 찍기 전에 보여 준다 */
export function ColorCaptureTips({ tx }: { tx: ColorText }) {
  return (
    <ul className="clr-tips">
      {tx.tips.map((tip) => <li key={tip}>{tip}</li>)}
    </ul>
  )
}

export function ColorReportView({ result, photo, px, scrollMore }: { result: ColorAnalysisResult; photo: string | null; px: ProgramText; scrollMore: string }) {
  const tx = px.color
  const d = result.colorDiagnosis
  const type = personalColorType(d.typeId)
  const [drape, setDrape] = useState(type.best[0])
  // 대어 본 색의 이름 — AI 가 팔레트 순서대로 이름을 다 붙여 줬을 때만
  const avoiding = type.avoid.includes(drape)
  const drapeName = avoiding
    ? d.avoidColorNames.length === type.avoid.length ? d.avoidColorNames[type.avoid.indexOf(drape)] : null
    : d.bestColorNames.length === type.best.length ? d.bestColorNames[type.best.indexOf(drape)] : null
  const swatches = (colors: string[], avoid: boolean) => (
    <div className="clr-swatches" data-avoid={avoid || undefined}>
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          className="clr-swatch"
          data-on={drape === hex || undefined}
          aria-label={hex}
          aria-pressed={drape === hex}
          style={{ background: hex }}
          onClick={() => setDrape(hex)}
        />
      ))}
    </div>
  )

  return (
    <div className="sjr clr">
      <section className="clr-drape" style={{ '--clr-drape': drape, '--clr-ink': readableInk(drape) } as CSSProperties}>
        {photo && (
          <div className="clr-face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" />
          </div>
        )}
        {drapeName && <p className="clr-drape-color" data-avoid={avoiding || undefined}>{avoiding ? tx.avoid : tx.best} · {drapeName}</p>}
        <p className="clr-drape-kicker">{tx.typeLabel} · {tx.undertone[d.undertone]}</p>
        <p className="clr-drape-type">{tx.typeNames[d.typeId]}</p>
        <p className="clr-drape-title">{d.title}</p>
      </section>

      <section className="sjr-card">
        <p className="sjr-kicker">{tx.drapeTitle}</p>
        <p className="clr-hint">{tx.drapeHint}</p>
        <p className="clr-swatch-label">{tx.best}</p>
        {swatches(type.best, false)}
        <p className="clr-names">{d.bestColorNames.join(' · ')}</p>
        <p className="clr-swatch-label">{tx.avoid}</p>
        {swatches(type.avoid, true)}
        <p className="clr-names">{d.avoidColorNames.join(' · ')}</p>
      </section>

      {d.confidence === 'low' && <p className="xpr-note xpr-note--warn">{tx.lowConfidence}</p>}

      <section className="sjr-card sjr-card--accent">
        <Brief text={d.summary} n={2} tx={px} />
      </section>

      <p className="sjr-section">{tx.gaugeTitle}</p>
      <section className="sjr-card clr-gauges">
        {GAUGE_KEYS.map((key) => (
          <div key={key} className="clr-gauge">
            <b>{tx.gauges[key].label}</b>
            <span>{tx.gauges[key].low}</span>
            <span className="clr-gauge-track"><i style={{ left: `${d.scores[key]}%` }} /></span>
            <span>{tx.gauges[key].high}</span>
          </div>
        ))}
      </section>

      <p className="sjr-section">{tx.observeTitle}</p>
      <section className="sjr-card clr-observe">
        {(['skin', 'hair', 'eyes'] as const).map((key) => (
          <p key={key}><b>{tx.observe[key]}</b><span>{d.observation[key]}</span></p>
        ))}
      </section>

      <p className="sjr-section">{tx.stylingTitle}</p>
      <div className="sjr-grid2">
        {(['makeup', 'hair', 'fashion', 'accessory'] as const).map((key) => (
          <section key={key} className="sjr-card">
            <p className="sjr-kicker">{tx.styling[key]}{key === 'accessory' ? ` · ${tx.metal[d.metal]}` : ''}</p>
            <Brief text={d.styling[key]} n={2} tx={px} />
          </section>
        ))}
      </div>

      {result.keywords.length > 0 && (
        <div className="sjr-chips clr-keywords">
          {result.keywords.map((k) => <span key={k} className="sjr-chip">#{k}</span>)}
        </div>
      )}

      <p className="xpr-note">{tx.disclaimer}</p>
      <ScrollMoreHint label={scrollMore} />
    </div>
  )
}
