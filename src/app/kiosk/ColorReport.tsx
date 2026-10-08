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
import './color-archive.css'

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
  // 팔레트와 이름 개수가 일치할 때만 견본마다 이름을 붙인다. 개수가 다르면(AI 가 덜 준 경우·데모) 손님에게
  // HEX 를 보이지 않고, 견본 아래에 받은 이름을 목록으로 보여 준다(그 경우 견본과 이름은 1:1 이 아니다).
  const avoiding = type.avoid.includes(drape)
  const namesMatch = (avoid: boolean) => (avoid ? d.avoidColorNames.length === type.avoid.length : d.bestColorNames.length === type.best.length)
  const colorName = (hex: string, avoid: boolean): string | null => {
    if (!namesMatch(avoid)) return null
    const names = avoid ? d.avoidColorNames : d.bestColorNames
    return names[(avoid ? type.avoid : type.best).indexOf(hex)]?.trim() || null
  }
  const drapeName = colorName(drape, avoiding)
  const nameList = (avoid: boolean) => {
    const names = avoid ? d.avoidColorNames : d.bestColorNames
    return !namesMatch(avoid) && names.length > 0 ? <p className="clr-names">{names.join(' · ')}</p> : null
  }
  const swatches = (colors: string[], avoid: boolean) => (
    <div className="clr-swatches" data-avoid={avoid || undefined} role="group" aria-label={avoid ? tx.avoid : tx.best}>
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          className="clr-swatch"
          data-on={drape === hex || undefined}
          aria-label={`${avoid ? tx.avoid : tx.best} · ${colorName(hex, avoid) ?? hex}`}
          aria-pressed={drape === hex}
          style={{ background: hex, color: readableInk(hex) }}
          onClick={() => setDrape(hex)}
        >
          {drape === hex && (
            <svg className="clr-swatch-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className="sjr clr">
      <section className="clr-drape" style={{ '--clr-drape': drape, '--clr-ink': readableInk(drape) } as CSSProperties}>
        <p className="clr-drape-kicker"><span>{tx.typeLabel}</span><span>{tx.undertone[d.undertone]}</span></p>
        <h2 className="clr-drape-type">{tx.typeNames[d.typeId]}</h2>
        <p className="clr-drape-title">{d.title}</p>
        <div className="clr-portrait" data-photo={Boolean(photo) || undefined}>
          {photo && (
            <div className="clr-face">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" />
            </div>
          )}
        </div>
        <p className="clr-drape-color" data-avoid={avoiding || undefined} aria-live="polite" aria-atomic="true">
          <span>{avoiding ? tx.avoid : tx.best}</span>
          {drapeName && <strong>{drapeName}</strong>}
        </p>
      </section>

      <section className="sjr-card clr-palette">
        <p className="sjr-kicker">{tx.drapeTitle}</p>
        <p className="clr-hint">{tx.drapeHint}</p>
        <p className="clr-swatch-label">{tx.best}</p>
        {swatches(type.best, false)}
        {nameList(false)}
        <p className="clr-swatch-label">{tx.avoid}</p>
        {swatches(type.avoid, true)}
        {nameList(true)}
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
