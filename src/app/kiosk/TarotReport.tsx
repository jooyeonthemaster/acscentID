'use client'

// 키오스크 AI 타로 결과 — 한 장 스크롤. 카드 세 장 → 자리별 풀이 → 흐름 → 조언 → 향.
// 사주 결과(SajuReport)의 카드·향 부품(.sjr-*)을 그대로 쓰고 카드 그림 부분만 따로 그린다. 기존·레트로 공용.

import type { CSSProperties } from 'react'
import { getPerfumeById } from '@/data/perfumes'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { ProgramText } from '@/lib/kiosk/program-i18n'
import { TAROT_DECK, TAROT_ELEMENT_COLORS } from '@/lib/kiosk/tarot-deck'
import type { TarotAnalysisResult } from '@/types/analysis'
import { Brief, ScrollMoreHint } from './SajuReport'
import { ElementGlyph, TarotCardFace } from './TarotCard'
import './saju-report.css'
import './programs.css'

export function TarotReportView({ result, px, lang, scrollMore }: { result: TarotAnalysisResult; px: ProgramText; lang: KioskLang; scrollMore: string }) {
  const tx = px.tarot
  const { tarotSpread: spread, tarotReading: reading } = result
  const top = result.matchingPerfumes[0]
  const persona = top?.persona
  const no = (top?.perfumeId.match(/(\d+)\s*$/)?.[1] ?? '--').padStart(2, '0')
  const category = (getPerfumeById(top?.perfumeId ?? '')?.category ?? 'scent').toUpperCase()
  const pct = top ? Math.round(top.score <= 1 ? top.score * 100 : top.score) : null
  const el = spread.scentElement
  const layers = [
    { key: 'top', label: px.layers.top, note: persona?.mainScent },
    { key: 'middle', label: px.layers.middle, note: persona?.subScent1 },
    { key: 'base', label: px.layers.base, note: persona?.subScent2 },
  ]

  return (
    <div className="sjr trt">
      <section className="trt-hero">
        <p className="trt-hero-kicker">{tx.topics[spread.topic].label}</p>
        <p className="trt-hero-title">{reading.headline}</p>
        {spread.question && <p className="trt-hero-question">{tx.questionLabel} · {spread.question}</p>}
        <div className="trt-spread">
          {spread.cards.map((c) => (
            <div key={c.position} className="trt-spread-item">
              <span className="trt-slot-pos">{tx.positions[c.position].label}</span>
              <TarotCardFace id={c.id} reversed={c.reversed} lang={lang} />
              <span className="trt-spread-name">
                {TAROT_DECK[c.id].names[lang]}
                <em>{c.reversed ? tx.reversed : tx.upright}</em>
              </span>
            </div>
          ))}
        </div>
      </section>

      {spread.cards.map((c, i) => {
        const text = reading.cards[i]
        const card = TAROT_DECK[c.id]
        if (!text) return null
        return (
          <section key={c.position} className="sjr-card trt-read" style={{ '--trt-el': TAROT_ELEMENT_COLORS[c.element] } as CSSProperties}>
            <p className="trt-read-head">
              <b>{tx.positions[c.position].label}</b>
              <span>{card.roman} · {card.names[lang]}{c.reversed ? ` · ${tx.reversed}` : ''}</span>
              <i><ElementGlyph element={c.element} size={22} />{tx.elements[c.element]}</i>
            </p>
            <p className="sjr-card-title">{text.title}</p>
            <div className="sjr-chips">
              {text.keywords.map((k) => <span key={k} className="sjr-chip">{k}</span>)}
            </div>
            <Brief text={text.reading} n={2} tx={px} />
          </section>
        )
      })}

      <p className="sjr-section">{tx.flowTitle}</p>
      <section className="sjr-card sjr-card--accent">
        <Brief text={reading.flow} n={3} tx={px} />
      </section>

      <p className="sjr-section">{tx.adviceTitle}</p>
      <ol className="sjr-insights">
        {reading.advice.map((line, i) => (
          <li key={i} className="sjr-card"><b>{i + 1}</b><span>{line}</span></li>
        ))}
      </ol>

      <section className="sjr-scent" style={{ ['--sjr-el' as string]: TAROT_ELEMENT_COLORS[el] }}>
        <p className="sjr-scent-kicker">{tx.scentTitle} · {tx.scentFrom(tx.elements[el])}</p>
        <p className="sjr-scent-no">No. {no}</p>
        <p className="sjr-scent-name">{persona?.name ?? '-'}</p>
        <p className="sjr-scent-meta">{category}{pct !== null ? ` · ${px.match(pct)}` : ''} · {tx.elementScent[el]}</p>
        {!!persona?.keywords?.length && (
          <div className="sjr-scent-tags">{persona.keywords.slice(0, 4).map((k) => <span key={k}>#{k}</span>)}</div>
        )}
      </section>

      {reading.scentBridge && <p className="sjr-bridge">{reading.scentBridge}</p>}

      <div className="sjr-layers">
        {layers.map((l, i) => (
          <section key={l.key} className="sjr-layer" style={{ ['--i' as string]: i }}>
            <p className="sjr-layer-head"><b>{l.label}</b><span>{l.note?.name ?? '-'}</span></p>
            <Brief text={l.note?.fanComment} n={1} tx={px} />
          </section>
        ))}
      </div>

      <section className="sjr-card">
        <p className="sjr-kicker">{tx.ritual}</p>
        <Brief text={reading.ritual} n={2} tx={px} />
      </section>
      <section className="sjr-card">
        <p className="sjr-kicker">{tx.why}</p>
        <Brief text={reading.scentWhy} n={2} tx={px} />
      </section>

      <p className="xpr-note">{tx.disclaimer}</p>
      <ScrollMoreHint label={scrollMore} />
    </div>
  )
}
