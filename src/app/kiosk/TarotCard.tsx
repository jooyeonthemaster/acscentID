'use client'

// 키오스크 타로 카드 — 달과 식물 선화 뒷면, 원소·번호·다국어 이름이 읽히는 앞면.
// 뽑기 화면과 결과 화면이 같은 카드와 정/역방향 표시를 쓴다.

import type { CSSProperties } from 'react'
import { TAROT_DECK, TAROT_ELEMENT_COLORS } from '@/lib/kiosk/tarot-deck'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotElement } from '@/types/analysis'
import './programs.css'
import './moonlit-tarot.css'

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
      <svg className="trt-garden-art" viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="92" height="142" rx="5" />
        <rect x="7" y="7" width="86" height="136" rx="3" strokeDasharray="1 2.6" />
        <path d="M58 45a18 18 0 1 0 5 31 18 18 0 0 1-5-31Z" fill="currentColor" fillOpacity=".16" />
        <path d="m50 24 1.8 5.2 5.2 1.8-5.2 1.8-1.8 5.2-1.8-5.2-5.2-1.8 5.2-1.8Z M25 57l1.3 4.7L31 63l-4.7 1.3L25 69l-1.3-4.7L19 63l4.7-1.3Z M75 57l1.3 4.7L81 63l-4.7 1.3L75 69l-1.3-4.7L69 63l4.7-1.3Z" fill="currentColor" strokeWidth=".6" />
        <path d="M49 125C30 118 20 104 21 87 M51 125C70 118 80 104 79 87 M39 119C36 112 34 106 34 99 M61 119C64 112 66 106 66 99" />
        <g fill="currentColor" fillOpacity=".19">
          <path d="M24 100C16 98 13 92 15 85c6 3 9 8 9 15Z M28 108c-9 1-14-3-16-9 7 0 12 3 16 9Z M36 116c-10 4-16 1-20-5 8-2 14 0 20 5Z M45 122c-8 6-15 6-21 1 7-4 14-4 21-1Z M24 98c-1-9 2-15 8-18 2 8 0 14-8 18Z M30 109c-2-8 0-14 6-18 3 8 2 14-6 18Z M38 117c-1-8 1-13 6-16 3 7 1 12-6 16Z" />
          <path d="M76 100c8-2 11-8 9-15-6 3-9 8-9 15Z M72 108c9 1 14-3 16-9-7 0-12 3-16 9Z M64 116c10 4 16 1 20-5-8-2-14 0-20 5Z M55 122c8 6 15 6 21 1-7-4-14-4-21-1Z M76 98c1-9-2-15-8-18-2 8 0 14 8 18Z M70 109c2-8 0-14-6-18-3 8-2 14 6 18Z M62 117c1-8-1-13-6-16-3 7-1 12 6 16Z" />
        </g>
        <path d="m50 119 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="currentColor" />
        <path d="M14 19h7m-3.5-3.5v7 M79 19h7m-3.5-3.5v7 M14 134h7m-3.5-3.5v7 M79 134h7m-3.5-3.5v7" strokeWidth=".75" />
      </svg>
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
