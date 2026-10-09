'use client'

import type { CSSProperties } from 'react'
import { TarotCardBack } from './TarotCard'
import './tarot-shuffle.css'

export interface TarotShuffleAnimationProps {
  phase: 'shuffling' | 'cutting'
  label: string
}

const CARD_LAYERS = Array.from({ length: 12 }, (_, i) => i)

/** 시각 효과만 맡는다. 실제 덱·타이머·다음 단계는 부모 화면에서 관리한다. */
export function TarotShuffleAnimation({ phase, label }: TarotShuffleAnimationProps) {
  return (
    <div className="trt-shuffle-animation" data-phase={phase} role="status" aria-live="polite" aria-atomic="true" aria-label={label}>
      <div className="trt-shuffle-table" aria-hidden="true">
        {CARD_LAYERS.map((i) => {
          const side = i % 2 === 0 ? -1 : 1
          const pile = Math.floor(i / 4) - 1
          return (
            <div
              key={i}
              className="trt-shuffle-card"
              data-side={side === -1 ? 'left' : 'right'}
              style={{
                '--i': i,
                '--trt-shuffle-x': `${side * 60}px`,
                '--trt-shuffle-turn': `${side * 11}deg`,
                '--trt-riffle-x': `${side * (i % 6) * 4}px`,
                '--trt-riffle-y': `${-16 + (11 - i) * 3}px`,
                '--trt-riffle-turn': `${side * 3}deg`,
                '--trt-cut-x': `${pile * 80}px`,
                '--trt-cut-y': `${pile === 0 ? -10 : 8}px`,
                '--trt-cut-turn': `${pile * 5}deg`,
              } as CSSProperties}
            >
              <TarotCardBack />
            </div>
          )
        })}
      </div>
      <p className="trt-shuffle-label">{label}</p>
    </div>
  )
}
