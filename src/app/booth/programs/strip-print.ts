// ANSAN 타임캡슐 인화물 — 2×6 띠지(600×1800, 300dpi) 네 컷: 지금(찍은 사진) · 10 · 20 · 30년 후(AI).
// 프린터(DS-RX1)는 4×6 용지에 '2 inch cut'을 켜면 가운데를 잘라 띠지 두 장을 낸다 → 인쇄 원판은 4×6(1200×1800)에
// 같은 띠지 둘을 나란히. 폰 저장(QR)은 띠지 한 장. 자르는 자리(가운데)·용지 위아래(PR 4x6 은 0.6mm 잘림)에 글자·사진이 걸리지 않게 여백.
// 디자인 2종: 타임캡슐(라벤더 · LATER! 테마) / 우주 정거장(남색 밤하늘).

import { STRIP_NOW_YEAR, STRIP_STEPS } from '@/lib/booth/programs/timecapsule-strip'
import { A, G, P, photoClip, rect, shadow, star, text, today, type Pic } from './print-designs'

export const STRIP_W = 600
export const STRIP_H = 1800
/** 띠지 좌우 여백 — 자르는 칼 오차(약 1mm)에 사진이 잘리지 않게 */
const SIDE = 30
const CELL_W = STRIP_W - SIDE * 2
const CELL_H = Math.round(CELL_W / 1.5)
const GAP = 12
const TOP = 170

type Ctx = CanvasRenderingContext2D

export interface StripInput {
  /** 찍은 사진(가로 3:2) */
  now: Pic
  /** 10 · 20 · 30년 후 — 못 만든 칸은 null */
  future: (Pic | null)[]
}

interface Theme {
  background: (ctx: Ctx) => void
  title: string
  sub: string
  frame: string
  shadow: string
  pill: string
  pillText: string
  pillYear: string
  foot: string
  footSub: string
  empty: [string, string]
}

const THEMES: Theme[] = [
  // 타임캡슐 — 라벤더 하늘(프로그램 화면 LATER! 테마와 같은 색)
  {
    background: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, STRIP_H)
      g.addColorStop(0, '#e6e4ff'); g.addColorStop(1, '#f9f8ff')
      ctx.fillStyle = g; ctx.fillRect(0, 0, STRIP_W, STRIP_H)
    },
    title: '#5b55d6', sub: '#6a66b8', frame: '#ffffff', shadow: 'rgba(60,50,150,0.22)',
    pill: 'rgba(42,38,112,0.82)', pillText: '#ffffff', pillYear: '#d9d6ff', foot: '#2a2670', footSub: '#6a66b8',
    empty: ['#dcd8ff', '#b9b2f5'],
  },
  // 우주 정거장 — 남색 밤하늘과 별
  {
    background: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, STRIP_H)
      g.addColorStop(0, '#0b1033'); g.addColorStop(1, '#1a1f5c')
      ctx.fillStyle = g; ctx.fillRect(0, 0, STRIP_W, STRIP_H)
      let seed = 11
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.75)'
      for (let i = 0; i < 160; i++) { const r = rnd() * 1.6 + 0.4; ctx.beginPath(); ctx.arc(rnd() * STRIP_W, rnd() * STRIP_H, r, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
      star(ctx, 92, 70, 14, '#9ff3ff'); star(ctx, 512, 128, 10, '#ffe08a')
    },
    title: '#9ff3ff', sub: '#c9ccff', frame: '#9ff3ff', shadow: 'rgba(0,0,0,0.45)',
    pill: 'rgba(159,243,255,0.92)', pillText: '#0b1033', pillYear: '#0b1033', foot: '#ffffff', footSub: '#aab0ff',
    empty: ['#232a6e', '#121741'],
  },
]

const cellY = (i: number) => TOP + i * (CELL_H + GAP)

function cell(ctx: Ctx, theme: Theme, pic: Pic | null, i: number, year: number, label: string) {
  const x = SIDE, y = cellY(i)
  ctx.save(); shadow(ctx, 16, theme.shadow); rect(ctx, x - 5, y - 5, CELL_W + 10, CELL_H + 10, theme.frame, 16); ctx.restore()
  if (pic) {
    photoClip(ctx, pic, x, y, CELL_W, CELL_H, 12, 0.4)
  } else {
    // 못 만든 칸 — 빈 칸 대신 '아직 오는 중'
    const g = ctx.createLinearGradient(x, y, x, y + CELL_H)
    g.addColorStop(0, theme.empty[0]); g.addColorStop(1, theme.empty[1])
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, CELL_W, CELL_H, 12); ctx.fill(); ctx.restore()
    text(ctx, '미래가 아직', STRIP_W / 2, y + CELL_H / 2 - 6, `700 34px ${G()}`, theme.foot)
    text(ctx, '도착하는 중이에요', STRIP_W / 2, y + CELL_H / 2 + 40, `700 34px ${G()}`, theme.foot)
  }
  // 칸 이름표 — 연도(크게) + 이름
  const pillH = 50, px = x + 14, py = y + CELL_H - pillH - 14
  ctx.save(); ctx.font = `34px ${A()}`; const yw = ctx.measureText(String(year)).width; ctx.font = `700 22px ${G()}`; const lw = ctx.measureText(label).width; ctx.restore()
  rect(ctx, px, py, yw + lw + 46, pillH, theme.pill, pillH / 2)
  text(ctx, String(year), px + 18, py + 38, `34px ${A()}`, theme.pillYear, 'left', (c) => { c.letterSpacing = '1px' })
  text(ctx, label, px + 28 + yw, py + 34, `700 22px ${G()}`, theme.pillText, 'left')
}

/** 띠지 한 장(600×1800) 캔버스 */
export function renderStrip(design: 0 | 1, input: StripInput): HTMLCanvasElement {
  const theme = THEMES[design]
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  theme.background(ctx)
  text(ctx, 'LATER!', STRIP_W / 2, 108, `italic 900 92px ${P()}`, theme.title)
  text(ctx, 'AI 포토존 · 미래로 가는 타임캡슐', STRIP_W / 2, 148, `700 23px ${G()}`, theme.sub)
  cell(ctx, theme, input.now, 0, STRIP_NOW_YEAR, '지금')
  STRIP_STEPS.forEach((step, i) => cell(ctx, theme, input.future[i] ?? null, i + 1, step.year, step.label))
  const foot = cellY(4)
  text(ctx, '2026 안산사이언스밸리 과학축제', STRIP_W / 2, foot + 50, `700 27px ${G()}`, theme.foot)
  text(ctx, 'AI가 만든 재미로 보는 상상 사진이에요', STRIP_W / 2, foot + 86, `700 18px ${G()}`, theme.footSub)
  text(ctx, today(), STRIP_W / 2, foot + 124, `24px ${A()}`, theme.footSub, 'center', (c) => { c.letterSpacing = '6px' })
  return canvas
}

/** 인쇄 원판 4×6(1200×1800) — 띠지 둘을 나란히(프린터가 가운데를 잘라 두 장) */
export function stripSheet(strip: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W * 2; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(strip, 0, 0)
  ctx.drawImage(strip, STRIP_W, 0)
  return canvas.toDataURL('image/jpeg', 0.93)
}
