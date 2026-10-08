'use client'

// 키오스크 타로 카드 — 그림 대신 로마 숫자·원소 기호·이름만 있는 글자 카드(초안).
// 일러스트 덱이 생기면 TarotCardFace 안쪽만 이미지로 바꾸면 된다. 뽑기 화면·결과 화면이 같이 쓴다.

import type { CSSProperties } from 'react'
import { TAROT_DECK, TAROT_ELEMENT_COLORS } from '@/lib/kiosk/tarot-deck'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotElement } from '@/types/analysis'
import './programs.css'

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

export function TarotCardBack() {
  return (
    <div className="trt-card trt-card--back" aria-hidden="true">
      <span />
    </div>
  )
}

/** 앞면 — 역방향이면 카드 전체를 거꾸로 놓는다(실제 타로처럼). 읽을 이름은 카드 밖 캡션이 맡는다 */
export function TarotCardFace({ id, reversed, lang }: { id: number; reversed: boolean; lang: KioskLang }) {
  const card = TAROT_DECK[id]
  if (!card) return null
  return (
    <div
      className="trt-card trt-card--face"
      data-reversed={reversed || undefined}
      style={{ '--trt-el': TAROT_ELEMENT_COLORS[card.element] } as CSSProperties}
    >
      <div className="trt-card-inner">
        <span className="trt-card-roman">{card.roman}</span>
        <span className="trt-card-glyph">
          <ElementGlyph element={card.element} size={44} />
        </span>
        <span className="trt-card-name">{card.names[lang]}</span>
        {lang !== 'en' && <span className="trt-card-en">{card.names.en}</span>}
      </div>
    </div>
  )
}
