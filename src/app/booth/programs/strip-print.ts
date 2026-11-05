// ANSAN 타임캡슐 인화물 — 2×6 사진(600×1800, 300dpi) 네 컷: 지금(찍은 사진) · 10 · 20 · 30년 후(AI).
// 프린터(DS-RX1)는 4×6 용지에 '2 inch cut'을 켜면 가운데를 잘라 사진 두 장을 낸다 → 인쇄 원판은 4×6(1200×1800)에
// 같은 사진 둘을 나란히. 폰 저장(QR)은 사진 한 장. 자르는 자리(가운데)·용지 가장자리에 글자·사진이 걸리지 않게 여백.
// 여백은 넉넉히(2026-11-04 실물 시험): 드라이버 용지가 테두리 여분까지 찍는 (4x6) 면 원판이 3~4% 커져 위 제목이 종이 끝에 붙고
// 아래 날짜가 반쯤 잘렸다 — 위아래 약 6~7mm · 좌우 약 4mm 를 비운다.
// 기본 디자인 2종(renderStrip): 타임캡슐(라벤더 · LATER! 테마) / 우주 정거장(남색 밤하늘). 프레임 10종은 renderFrameStrip.

import type { StripFrameDef } from '@/lib/booth/programs/strip-frames'
import { STRIP_NOW_YEAR, STRIP_STEPS } from '@/lib/booth/programs/timecapsule-strip'
import { A, G, P, cover, photoClip, rect, shadow, star, text, today, type Pic } from './print-designs'

export const STRIP_W = 600
export const STRIP_H = 1800
/** 사진 좌우 여백 — 자르는 칼 오차·용지 여분 확대에 사진이 잘리지 않게 */
const SIDE = 46
const CELL_W = STRIP_W - SIDE * 2
const CELL_H = Math.round(CELL_W / 1.5)
const GAP = 12
const TOP = 196

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
  const pillH = 44, px = x + 12, py = y + CELL_H - pillH - 12
  ctx.save(); ctx.font = `30px ${A()}`; const yw = ctx.measureText(String(year)).width; ctx.font = `700 20px ${G()}`; const lw = ctx.measureText(label).width; ctx.restore()
  rect(ctx, px, py, yw + lw + 42, pillH, theme.pill, pillH / 2)
  text(ctx, String(year), px + 16, py + 33, `30px ${A()}`, theme.pillYear, 'left', (c) => { c.letterSpacing = '1px' })
  text(ctx, label, px + 26 + yw, py + 30, `700 20px ${G()}`, theme.pillText, 'left')
}

/** 사진 한 장(600×1800) 캔버스 */
export function renderStrip(design: 0 | 1, input: StripInput): HTMLCanvasElement {
  const theme = THEMES[design]
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  theme.background(ctx)
  text(ctx, 'LATER!', STRIP_W / 2, 136, `italic 900 84px ${P()}`, theme.title)
  text(ctx, 'AI 포토존 · 미래로 가는 타임캡슐', STRIP_W / 2, 174, `700 21px ${G()}`, theme.sub)
  cell(ctx, theme, input.now, 0, STRIP_NOW_YEAR, '지금')
  STRIP_STEPS.forEach((step, i) => cell(ctx, theme, input.future[i] ?? null, i + 1, step.year, step.label))
  const foot = cellY(4)
  text(ctx, '2026 안산사이언스밸리 과학축제', STRIP_W / 2, foot + 44, `700 25px ${G()}`, theme.foot)
  text(ctx, 'AI가 만든 재미로 보는 상상 사진이에요', STRIP_W / 2, foot + 76, `700 17px ${G()}`, theme.footSub)
  text(ctx, today(), STRIP_W / 2, foot + 110, `22px ${A()}`, theme.footSub, 'center', (c) => { c.letterSpacing = '6px' })
  return canvas
}

// ───────────────────────── 프레임 10종(strip-frames.ts) ─────────────────────────
// 프레임은 인생네컷처럼 제목이 아래에 있는 배치 — 1200×3600 PNG 의 좌표 계약(ansan-frames/coordinate-contract.json)을 절반으로 쓴다

const FRAME_CELL = { x: 46, w: 508, h: 339, ys: [60, 413, 766, 1119] }

function frameCell(ctx: Ctx, def: StripFrameDef, pic: Pic | null, i: number) {
  const { x, w, h, ys } = FRAME_CELL
  if (pic) {
    cover(ctx, pic, x, ys[i], w, h, 0.4)
  } else {
    // 못 만든 칸 — 빈 칸 대신 '아직 오는 중'
    rect(ctx, x, ys[i], w, h, def.tone === 'dark' ? '#23264a' : '#e8e6f5')
    const ink = def.tone === 'dark' ? '#ffffff' : '#2a2670'
    text(ctx, '미래가 아직', STRIP_W / 2, ys[i] + h / 2 - 6, `700 32px ${G()}`, ink)
    text(ctx, '도착하는 중이에요', STRIP_W / 2, ys[i] + h / 2 + 38, `700 32px ${G()}`, ink)
  }
}

/** 프레임 칸 이름표 — 계약의 비워 둔 자리(칸 왼쪽 아래에서 20px 안쪽) */
function framePill(ctx: Ctx, def: StripFrameDef, i: number, year: number, label: string) {
  const { x, h, ys } = FRAME_CELL
  const pillH = 44, px = x + 20, py = ys[i] + h - pillH - 20
  ctx.save(); ctx.font = `30px ${A()}`; const yw = ctx.measureText(String(year)).width; ctx.font = `700 20px ${G()}`; const lw = ctx.measureText(label).width; ctx.restore()
  rect(ctx, px, py, yw + lw + 42, pillH, def.colors.pill, pillH / 2)
  text(ctx, String(year), px + 16, py + 33, `30px ${A()}`, def.colors.pillYear, 'left', (c) => { c.letterSpacing = '1px' })
  text(ctx, label, px + 26 + yw, py + 30, `700 20px ${G()}`, def.colors.pillText, 'left')
}

/** 프레임 사진 한 장(600×1800) — 사진 → 프레임 → 이름표·아래 글자 */
export function renderFrameStrip(def: StripFrameDef, overlay: Pic, input: StripInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = def.background; ctx.fillRect(0, 0, STRIP_W, STRIP_H)
  frameCell(ctx, def, input.now, 0)
  STRIP_STEPS.forEach((_, i) => frameCell(ctx, def, input.future[i] ?? null, i + 1))
  ctx.drawImage(overlay, 0, 0, STRIP_W, STRIP_H)
  framePill(ctx, def, 0, STRIP_NOW_YEAR, '지금')
  STRIP_STEPS.forEach((step, i) => framePill(ctx, def, i + 1, step.year, step.label))
  // 아래 글자 구역(가로 80~520, 세로 1485~1735)
  const { title, sub, foot, footSub } = def.colors
  text(ctx, 'LATER!', STRIP_W / 2, 1562, `italic 900 78px ${P()}`, title)
  text(ctx, 'AI 포토존 · 미래로 가는 타임캡슐', STRIP_W / 2, 1600, `700 21px ${G()}`, sub)
  text(ctx, '2026 안산사이언스밸리 과학축제', STRIP_W / 2, 1642, `700 25px ${G()}`, foot)
  text(ctx, 'AI가 만든 재미로 보는 상상 사진이에요', STRIP_W / 2, 1674, `700 17px ${G()}`, footSub)
  text(ctx, today(), STRIP_W / 2, 1710, `22px ${A()}`, footSub, 'center', (c) => { c.letterSpacing = '6px' })
  return canvas
}

/** 프레임 고르는 칸에 깔 사진 네 장(240×720) — 투명 작은 그림(thumbs) 뒤에 깔면 내 사진이 든 프레임처럼 보인다 */
export function framePhotoLayer(input: StripInput): string {
  const scale = 0.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(STRIP_W * scale); canvas.height = Math.round(STRIP_H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d9d9e3'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const { x, w, h, ys } = FRAME_CELL
  ;[input.now, ...STRIP_STEPS.map((_, i) => input.future[i] ?? null)].forEach((pic, i) => {
    if (pic) cover(ctx, pic, x * scale, ys[i] * scale, w * scale, h * scale, 0.4)
  })
  return canvas.toDataURL('image/jpeg', 0.8)
}

/** 사진 캔버스를 고르는 칸 크기(240×720)로 */
export function stripThumb(strip: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = 240; canvas.height = 720
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(strip, 0, 0, 240, 720)
  return canvas.toDataURL('image/jpeg', 0.8)
}

/**
 * 인쇄 원판 4×6(1200×1800) — 같은 사진 둘을 나란히. 프린터가 가운데를 잘라 두 조각이 된다(한쪽을 비우면 빈 종이가 나온다)
 */
export function stripSheet(strip: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W * 2; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(strip, 0, 0)
  ctx.drawImage(strip, STRIP_W, 0)
  return canvas.toDataURL('image/jpeg', 0.93)
}
