'use client'

// 섞기 연출 — 장식용 카드 16장. 실제 덱(22장)·순서·타이머는 부모(TarotSteps)가 맡고, 여기는 보이는 움직임만 그린다.
// 섞이는 게 눈에 보이게: 두 더미로 갈라 한 장씩 번갈아 떨어뜨리는 리플 셔플을 두 번 → 세 더미로 나눠 순서를 바꿔 쌓는다.
// 왼쪽·오른쪽 더미는 뒷면 색(세이지·라벤더)이 달라, 떨어진 뒤 두 색이 섞여 쌓이는 게 보인다.

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { TarotCardBack } from './TarotCard'
import './tarot-shuffle.css'

export interface TarotShuffleAnimationProps {
  phase: 'shuffling' | 'cutting'
  label: string
}

/** 부모의 단계 시간과 맞춘다(TarotSteps PHASE_MS) */
export const SHUFFLE_MS = 1450
export const CUT_MS = 800

const N = 16
const CARDS = Array.from({ length: N }, (_, i) => i)
const SPLIT_X = 78
/** 더미 안에서 한 장씩 비켜 쌓인 두께 */
const stackAt = (k: number) => ({ x: (k - (N - 1) / 2) * 0.6, y: (N - 1 - k) * 0.8 })

/**
 * 리플 셔플 두 번. 카드 i 는 i 가 짝수면 왼쪽, 홀수면 오른쪽 더미 — 떨어지는 순서도 i 순서라
 * 왼쪽·오른쪽이 번갈아 떨어지고, 나중에 떨어진 카드가 위(zIndex i)에 놓인다.
 */
function riffleKeyframes(i: number) {
  const side = i % 2 === 0 ? -1 : 1
  const h = Math.floor(i / 2)
  const s = stackAt(i)
  const split = { x: side * SPLIT_X + h * 0.6, y: -8 + (7 - h) * 0.8, rotate: side * 7 }
  const arc = { x: side * SPLIT_X * 0.3, y: -18, rotate: side * 2 }
  const r = i / (N - 1)
  const f1 = 0.22 + r * 0.24
  const f2 = 0.64 + r * 0.26
  const at = [s, s, split, split, arc, s, s, split, split, arc, s, s] as const
  return {
    x: at.map((p) => p.x),
    y: at.map((p) => p.y),
    rotate: at.map((p) => ('rotate' in p ? p.rotate : 0)),
    times: [0, 0.04, 0.16, f1, f1 + 0.03, f1 + 0.06, 0.56, 0.62, f2, f2 + 0.03, f2 + 0.06, 1],
  }
}

/** 컷 — 세 더미로 나눴다가, 맨 위 더미를 맨 아래로 보내는 식으로 순서를 바꿔 다시 쌓는다(위→아래 순서: 가운데·왼쪽·오른쪽) */
const PILE_X = [-96, 0, 96]
const PILE_Y = [6, -8, 6]
const PILE_TURN = [-5, 0, 5]
const RESTACK_ORDER = [2, 0, 1] // 먼저 내려놓는 더미부터
function pileOf(i: number) {
  return i < 6 ? 0 : i < 11 ? 1 : 2
}
function cutKeyframes(i: number) {
  const p = pileOf(i)
  const s = stackAt(i)
  // 새 순서에서의 자리 — 먼저 내려놓은 더미가 아래
  const before = RESTACK_ORDER.slice(0, RESTACK_ORDER.indexOf(p)).reduce((n, q) => n + CARDS.filter((c) => pileOf(c) === q).length, 0)
  const inPile = CARDS.filter((c) => pileOf(c) === p).indexOf(i)
  const ns = stackAt(before + inPile)
  const start = 0.42 + RESTACK_ORDER.indexOf(p) * 0.16
  return {
    zIndex: before + inPile + 1,
    x: [s.x, PILE_X[p] + s.x * 0.4, PILE_X[p] + s.x * 0.4, ns.x, ns.x],
    y: [s.y, PILE_Y[p] + s.y, PILE_Y[p] + s.y, ns.y, ns.y],
    rotate: [0, PILE_TURN[p], PILE_TURN[p], 0, 0],
    times: [0, 0.3, start, start + 0.14, 1],
  }
}

export function TarotShuffleAnimation({ phase, label }: TarotShuffleAnimationProps) {
  return (
    <div className="trt-shuffle-animation" data-phase={phase} role="status" aria-live="polite" aria-atomic="true" aria-label={label}>
      <div className="trt-shuffle-table" aria-hidden="true">
        {CARDS.map((i) => {
          const riffle = riffleKeyframes(i)
          const cut = cutKeyframes(i)
          const s = stackAt(i)
          const shuffling = phase === 'shuffling'
          return (
            <motion.div
              key={i}
              className="trt-shuffle-card"
              data-side={i % 2 === 0 ? 'left' : 'right'}
              style={{ zIndex: shuffling ? i + 1 : cut.zIndex } as CSSProperties}
              initial={{ x: s.x, y: s.y, rotate: 0 }}
              animate={shuffling
                ? { x: riffle.x, y: riffle.y, rotate: riffle.rotate }
                : { x: cut.x, y: cut.y, rotate: cut.rotate }}
              transition={{
                duration: (shuffling ? SHUFFLE_MS : CUT_MS) / 1000,
                times: shuffling ? riffle.times : cut.times,
                ease: 'easeInOut',
              }}
            >
              <TarotCardBack />
            </motion.div>
          )
        })}
      </div>
      <p className="trt-shuffle-label">{label}</p>
    </div>
  )
}
