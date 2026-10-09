'use client'

// 키오스크 AI 타로 결과 — 한 장 스크롤. 카드 세 장 → 자리별 풀이 → 흐름 → 조언.
// 사주 결과(SajuReport)의 카드 부품(.sjr-*)을 그대로 쓰고 카드 그림 부분만 따로 그린다. 기존·레트로 공용. 향 추천은 없다.

import type { CSSProperties } from 'react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { ProgramText } from '@/lib/kiosk/program-i18n'
import { TAROT_DECK, TAROT_ELEMENT_COLORS } from '@/lib/kiosk/tarot-deck'
import type { TarotAnalysisResult } from '@/types/analysis'
import { Brief, ScrollMoreHint } from './SajuReport'
import { ElementGlyph, TarotCardFace } from './TarotCard'
import './saju-report.css'
import './programs.css'
import './moonlit-tarot.css'

export function TarotReportView({ result, px, lang, scrollMore }: { result: TarotAnalysisResult; px: ProgramText; lang: KioskLang; scrollMore: string }) {
  const tx = px.tarot
  const { tarotSpread: spread, tarotReading: reading } = result

  return (
    <div className="sjr trt">
      <section className="trt-hero">
        <p className="trt-hero-kicker"><span aria-hidden="true">✦</span> {tx.topics[spread.topic].label} <span aria-hidden="true">✦</span></p>
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

      {/* 세 장의 흐름 — 작은 카드 셋을 화살표로 잇는다(목업 T15) */}
      <div className="trt-flow-row" aria-hidden="true">
        {spread.cards.map((c, i) => (
          <div key={c.position} className="trt-flow-item">
            {i > 0 && <span className="trt-flow-arrow">→</span>}
            <figure>
              <TarotCardFace id={c.id} reversed={c.reversed} lang={lang} />
              <figcaption><span>{tx.positions[c.position].label}</span><b>{TAROT_DECK[c.id].names[lang]}</b></figcaption>
            </figure>
          </div>
        ))}
      </div>
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

      {result.keywords.length > 0 && (
        <div className="sjr-chips trt-keywords">
          {result.keywords.map((k) => <span key={k} className="sjr-chip">#{k}</span>)}
        </div>
      )}

      <p className="xpr-note">{tx.disclaimer}</p>
      <ScrollMoreHint label={scrollMore} />
    </div>
  )
}
