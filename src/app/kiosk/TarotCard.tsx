'use client'

// 키오스크 타로 카드 — 달과 식물 선화 뒷면, 원화·번호·다국어 이름이 읽히는 앞면.
// 뽑기 화면과 결과 화면이 같은 카드와 정/역방향 표시를 쓴다.

import { useState, type CSSProperties } from 'react'
import { TAROT_DECK, TAROT_ELEMENT_COLORS, tarotArtSrc } from '@/lib/kiosk/tarot-deck'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotElement } from '@/types/analysis'
import './programs.css'
import './moonlit-tarot.css'
import './tarot-card-art.css'

/** 연금술 원소 기호 — 불 △ · 바람 △에 가로줄 · 물 ▽ · 흙 ▽에 가로줄. 글꼴에 없는 기호라 직접 그린다 */
export function ElementGlyph({ element, size = 40 }: { element: TarotElement; size?: number }) {
  const up = element === 'fire' || element === 'air'
  const bar = element === 'air' || element === 'earth'
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={up ? 'M20 5 L36 34 H4 Z' : 'M20 35 L36 6 H4 Z'} />
      {bar && <path d={up ? 'M11 22 H29' : 'M11 18 H29'} />}
    </svg>
  )
}

/** 뒷면 — 선화(달과 식물)는 카드마다 벡터를 그리지 않고 한 장을 마스크로 같이 쓴다(.trt-garden-art, 색은 글자색). 22장이 한꺼번에 움직여도 가볍다 */
export function TarotCardBack() {
  return (
    <div className="trt-card trt-card--back" aria-hidden="true">
      <span />
      <i className="trt-garden-art" />
    </div>
  )
}

/** 앞면 — 역방향이면 카드 전체를 거꾸로 놓는다(실제 타로처럼). 읽을 이름은 카드 밖 캡션이 맡는다 */
export function TarotCardFace({ id, reversed, lang }: { id: number; reversed: boolean; lang: KioskLang }) {
  const [failedArtId, setFailedArtId] = useState<number | null>(null)
  const card = TAROT_DECK[id]
  if (!card) return null
  return (
    <div
      className="trt-card trt-card--face"
      data-reversed={reversed || undefined}
      data-art={failedArtId !== id || undefined}
      style={{ '--trt-el': TAROT_ELEMENT_COLORS[card.element] } as CSSProperties}
    >
      <div className="trt-card-inner">
        <span className="trt-card-roman">{card.roman}</span>
        <span className="trt-card-art" aria-hidden="true">
          {/* Local artwork keeps the kiosk independent of the reference demo's host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={id}
            src={tarotArtSrc(id)}
            alt=""
            width={350}
            height={600}
            draggable={false}
            decoding="async"
            onError={() => setFailedArtId(id)}
          />
        </span>
        <span className="trt-card-glyph">
          <ElementGlyph element={card.element} size={44} />
        </span>
        <span className="trt-card-name">{card.names[lang]}</span>
        {lang !== 'en' && <span className="trt-card-en">{card.names.en}</span>}
      </div>
    </div>
  )
}
