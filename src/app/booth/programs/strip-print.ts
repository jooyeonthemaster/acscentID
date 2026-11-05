// ANSAN 타임캡슐 인화물 — 2×6 사진(600×1800, 300dpi) 네 컷: 지금(찍은 사진) · 10 · 20 · 30년 후(AI).
// 프린터(DS-RX1)는 4×6 용지에 '2 inch cut'을 켜면 가운데를 잘라 사진 두 장을 낸다 → 인쇄 원판은 4×6(1200×1800)에
// 같은 사진 둘을 나란히. 폰 저장(QR)은 사진 한 장. 자르는 자리(가운데)·용지 가장자리에 글자·사진이 걸리지 않게 여백.
// 여백은 넉넉히(2026-11-04 실물 시험): 드라이버 용지가 테두리 여분까지 찍는 (4x6) 면 원판이 3~4% 커져 위 제목이 종이 끝에 붙고
// 아래 날짜가 반쯤 잘렸다 — 위아래 약 6~7mm · 좌우 약 4mm 를 비운다.
// 기본 디자인 2종(renderStrip): 축제 공식 웹사이트 디자인(WHITEPRINT) — ASV 화이트(종이 · 잉크 · 볼트) / ASV 블랙(사이트 다크 섹션).
// 로고 마크 · 거대 영문 LATER · 치수선 · 칸 모서리 크로스헤어 · 볼트 연도. 축제 표기는 ASV_FESTIVAL(공식 확정 카피) 그대로. 프레임 10종은 renderFrameStrip.

import type { StripFrameDef } from '@/lib/booth/programs/strip-frames'
import { ASV_FESTIVAL, STRIP_NOW_YEAR, STRIP_STEPS } from '@/lib/booth/programs/timecapsule-strip'
import { bricolage, jetbrains } from './fonts'
import { A, G, P, cover, rect, text, today, type Pic } from './print-designs'

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

/** 영문 디스플레이 · 모노 라벨 · 한글 */
const D = () => bricolage.style.fontFamily
const M = () => jetbrains.style.fontFamily
const K = 'Pretendard, sans-serif'

interface Theme {
  paper: string
  dot: string
  ink: string
  sub: string
  mute: string
  line: string
  reg: string
  volt: string
  cellBg: string
}

const THEMES: Theme[] = [
  // ASV 화이트 — 사이트 기본 면(paper-50) · 잉크 글자 · 볼트 강조
  { paper: '#f7f8fa', dot: '#cbd0d8', ink: '#0b0d10', sub: '#3c434e', mute: '#5c6472', line: '#b4bac4', reg: '#3c434e', volt: '#1436ff', cellBg: '#e8ebef' },
  // ASV 블랙 — 사이트 다크 섹션(ink-900 바탕 · 종이 글자 · 다크 위 볼트 volt-300)
  { paper: '#0b0d10', dot: '#262b33', ink: '#f7f8fa', sub: '#cbd0d8', mute: '#a9b0bb', line: '#3c434e', reg: '#a9b0bb', volt: '#7a8cff', cellBg: '#171a1f' },
]

const cellY = (i: number) => TOP + i * (CELL_H + GAP)

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, width = 2) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore()
}

/** 모서리 크로스헤어 — 인쇄라 사이트(1px)보다 굵게 */
function crosshair(ctx: Ctx, x: number, y: number, color: string, arm = 12) {
  line(ctx, x - arm, y, x + arm, y, color, 2)
  line(ctx, x, y - arm, x, y + arm, color, 2)
}

function cell(ctx: Ctx, theme: Theme, pic: Pic | null, i: number, year: number, label: string) {
  const x = SIDE, y = cellY(i)
  if (pic) {
    cover(ctx, pic, x, y, CELL_W, CELL_H, 0.4)
  } else {
    // 못 만든 칸 — 빗금 위 '아직 오는 중'
    rect(ctx, x, y, CELL_W, CELL_H, theme.cellBg)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, CELL_W, CELL_H); ctx.clip()
    for (let d = -CELL_H; d < CELL_W; d += 22) line(ctx, x + d, y + CELL_H, x + d + CELL_H, y, theme.line, 1.5)
    ctx.restore()
    text(ctx, 'PENDING', STRIP_W / 2, y + CELL_H / 2 - 52, `500 15px ${M()}`, theme.volt, 'center', (c) => { c.letterSpacing = '3px' })
    text(ctx, '미래가 아직', STRIP_W / 2, y + CELL_H / 2 - 4, `800 32px ${K}`, theme.ink)
    text(ctx, '도착하는 중이에요', STRIP_W / 2, y + CELL_H / 2 + 40, `800 32px ${K}`, theme.ink)
  }
  ctx.save(); ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, CELL_W + 2, CELL_H + 2); ctx.restore()
  ;[[x, y], [x + CELL_W, y], [x, y + CELL_H], [x + CELL_W, y + CELL_H]].forEach(([cx, cy]) => crosshair(ctx, cx, cy, theme.reg))
  // 칸 번호 — 오른쪽 위 잉크 상자
  const idx = String(i + 1).padStart(2, '0')
  rect(ctx, x + CELL_W - 46, y + 12, 34, 26, theme.ink)
  text(ctx, idx, x + CELL_W - 29, y + 31, `500 15px ${M()}`, theme.paper)
  // 칸 이름표 — 연도(볼트 · 좁은 디스플레이) + 이름
  const h = 46, px = x + 14, py = y + CELL_H - h - 14
  ctx.save(); ctx.font = `800 32px ${D()}`; ctx.fontStretch = 'condensed'; const yw = ctx.measureText(String(year)).width; ctx.font = `700 20px ${K}`; const lw = ctx.measureText(label).width; ctx.restore()
  rect(ctx, px, py, yw + lw + 40, h, theme.paper)
  text(ctx, String(year), px + 14, py + 34, `800 32px ${D()}`, theme.volt, 'left', (c) => { c.fontStretch = 'condensed' })
  text(ctx, label, px + 26 + yw, py + 31, `700 20px ${K}`, theme.ink, 'left')
}

/** 사진 한 장(600×1800) 캔버스 */
export function renderStrip(design: 0 | 1, input: StripInput): HTMLCanvasElement {
  const theme = THEMES[design]
  const canvas = document.createElement('canvas')
  canvas.width = STRIP_W; canvas.height = STRIP_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  // 도트 격자 종이
  ctx.fillStyle = theme.paper; ctx.fillRect(0, 0, STRIP_W, STRIP_H)
  ctx.fillStyle = theme.dot
  for (let y = 12; y < STRIP_H; y += 24) for (let x = 12; x < STRIP_W; x += 24) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill() }

  // 머리 — 로고 마크 · ASV 2026 · AI PHOTO ZONE
  ctx.save(); ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.strokeRect(SIDE + 1, 67, 20, 20); ctx.restore()
  rect(ctx, SIDE + 6, 72, 12, 12, theme.volt)
  text(ctx, ASV_FESTIVAL.short, SIDE + 34, 86, `800 25px ${D()}`, theme.ink, 'left', (c) => { c.letterSpacing = '-0.5px' })
  text(ctx, 'AI PHOTO ZONE', STRIP_W - SIDE, 85, `500 14px ${M()}`, theme.mute, 'right', (c) => { c.letterSpacing = '2.5px' })
  // 거대 워드마크 + 한글 부제
  text(ctx, 'LATER', SIDE - 6, 166, `800 100px ${D()}`, theme.volt, 'left', (c) => { c.letterSpacing = '-4px' })
  text(ctx, '미래로 가는', STRIP_W - SIDE, 128, `800 23px ${K}`, theme.ink, 'right')
  text(ctx, '타임캡슐', STRIP_W - SIDE, 158, `800 23px ${K}`, theme.ink, 'right')
  // 치수선 — 네 컷이 재는 시간
  const dy = 180
  line(ctx, SIDE, dy, STRIP_W - SIDE, dy, theme.mute, 2)
  line(ctx, SIDE + 1, dy - 7, SIDE + 1, dy + 7, theme.mute, 2)
  line(ctx, STRIP_W - SIDE - 1, dy - 7, STRIP_W - SIDE - 1, dy + 7, theme.mute, 2)
  const span = `${STRIP_NOW_YEAR} — ${STRIP_STEPS[STRIP_STEPS.length - 1].year}`
  ctx.save(); ctx.font = `500 14px ${M()}`; ctx.letterSpacing = '2px'; const sw = ctx.measureText(span).width; ctx.restore()
  rect(ctx, STRIP_W / 2 - sw / 2 - 10, dy - 9, sw + 20, 18, theme.paper)
  text(ctx, span, STRIP_W / 2, dy + 5, `500 14px ${M()}`, theme.mute, 'center', (c) => { c.letterSpacing = '2px' })

  cell(ctx, theme, input.now, 0, STRIP_NOW_YEAR, '지금')
  STRIP_STEPS.forEach((step, i) => cell(ctx, theme, input.future[i] ?? null, i + 1, step.year, step.label))

  // 바닥 — 축제 공식 표기 · 일시 · 장소 · 봉인 날짜
  const fy = cellY(4) + 16
  line(ctx, SIDE, fy, STRIP_W - SIDE, fy, theme.line, 2)
  text(ctx, ASV_FESTIVAL.name, SIDE, fy + 38, `800 23px ${K}`, theme.ink, 'left', (c) => { c.letterSpacing = '-0.5px' })
  text(ctx, `${ASV_FESTIVAL.dates} · ${ASV_FESTIVAL.venue}`, SIDE, fy + 66, `600 15px ${K}`, theme.sub, 'left')
  text(ctx, 'AI가 만든 재미로 보는 상상 사진이에요', SIDE, fy + 93, `600 14px ${K}`, theme.mute, 'left')
  text(ctx, `SEALED ${today()}`, STRIP_W - SIDE, fy + 93, `500 13px ${M()}`, theme.volt, 'right', (c) => { c.letterSpacing = '1.5px' })
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
