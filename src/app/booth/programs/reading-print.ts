'use client'

// 「2027 정미년 새해 이야기」(관상 · 사주 · 손금) 4×6 인화 원판 두 가지 — 찍은 사진 + AI 새해 이야기를 기기 안에서 합성한다(그림 생성 없음).
//   ① 새해 카드 — 한지 미색 · 먹 · 주홍 낙관 · 금색 띠
//   ② 정미년 연하장 — 붉은 바탕(정 丁 = 불 · 미 未 = 양) · 금색 이중 테두리 · 아치 사진
// 사진 칸은 글 길이를 먼저 재고 남은 높이를 준다(글이 길어도 넘치지 않게). 얼굴이 있으면 얼굴을 가운데로 자른다.
// 화면 미리보기 = 폰 저장 = 인쇄 원판(같은 JPEG). 브랜드 커스텀을 켜면 맨 아래에 로고 · 한 줄(src/lib/nh-awards/brand.ts).

import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { READING_NOTICE, type ReadingStory, type SajuView } from '@/lib/booth/programs/reading'
import { eventBrandFor } from '@/lib/nh-awards/brand'

export const READING_W = 1200
export const READING_H = 1800

export interface ReadingPrintInput {
  photo: HTMLImageElement | HTMLCanvasElement
  /** 사진 안 얼굴 가운데(0~1) — 없으면 가운데 */
  focus: { x: number; y: number } | null
  story: ReadingStory
  saju?: SajuView
  /** 관상: 고른 주제 이름 / 손금: 손 모양 / 사주: 띠 */
  tag?: string
  /** 얼굴 옆 손바닥까지 담는 넓은 사진(손금) — 연하장의 아치를 넓게 */
  wide?: boolean
}

type Ctx = CanvasRenderingContext2D

/** 저장소 원본 글꼴(한글 전체) — next/font 판은 라틴만이라 캔버스에서 한글이 기본 글꼴로 나온다(print-designs.ts 와 같은 까닭) */
const FONTS: [family: string, url: string][] = [
  ['nh-head', '/fonts/ui/black-han-sans/400.woff2'],
  ['nh-hand', '/fonts/ui/nanum-pen/400.woff2'],
  ['nh-hanja', '/fonts/hanja/wenkai-tc-700.woff2'],
]
const HEAD = "'nh-head', 'Pretendard', sans-serif"
const HAND = "'nh-hand', 'Pretendard', cursive"
const HANJA = "'nh-hanja', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif"
const BODY = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
let fontsReady: Promise<void> | null = null
const logoCache = new Map<string, HTMLImageElement | null>()

/** 생성을 기다리는 동안 받아 둔다(못 받으면 기본 글꼴) */
export function loadReadingPrintAssets(programId: string): Promise<void> {
  fontsReady ??= Promise.all(FONTS.map(async ([family, url]) => {
    try { const face = new FontFace(family, `url(${url})`); await face.load(); document.fonts.add(face) } catch { /* 기본 글꼴 */ }
  })).then(() => Promise.all(['800 40px Pretendard', '600 40px Pretendard'].map((s) => document.fonts.load(s, '가A').catch(() => undefined)))).then(() => undefined)
  const logo = eventBrandFor(programId)?.printLogo
  const logoLoad = logo && !logoCache.has(logo) ? new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => { logoCache.set(logo, image); resolve() }
    image.onerror = () => { logoCache.set(logo, null); resolve() }
    image.src = logo
  }) : Promise.resolve()
  return Promise.all([fontsReady, logoLoad]).then(() => undefined)
}

function wrap(ctx: Ctx, text: string, width: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    // 한글은 낱말 단위로, 낱말이 너무 길면 글자 단위로
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= width) { line = next; continue }
      if (line) lines.push(line)
      if (ctx.measureText(word).width <= width) { line = word; continue }
      line = ''
      for (const ch of word) { if (ctx.measureText(line + ch).width > width && line) { lines.push(line); line = ch } else line += ch }
    }
    if (line) lines.push(line)
  }
  return lines
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}
/** 아치 — 위 두 모서리를 r 만큼 둥글게(r = w/2 면 반원 지붕). 넓은 사진(손금)은 r 을 줄여 모서리만 둥글게 */
function arch(ctx: Ctx, x: number, y: number, w: number, h: number, r = w / 2) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, [Math.min(r, w / 2), Math.min(r, w / 2), 0, 0])
}

/** 사진을 칸에 꽉 차게(얼굴을 가운데로) */
function drawPhoto(ctx: Ctx, pic: ReadingPrintInput['photo'], focus: ReadingPrintInput['focus'], x: number, y: number, w: number, h: number) {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale, sh = h / scale
  const fx = (focus?.x ?? 0.5) * iw, fy = (focus?.y ?? 0.45) * ih
  // 얼굴이 칸의 위 40% 쯤에 오게
  const sx = Math.max(0, Math.min(iw - sw, fx - sw / 2))
  const sy = Math.max(0, Math.min(ih - sh, fy - sh * 0.42))
  ctx.drawImage(pic, sx, sy, sw, sh, x, y, w, h)
}

interface Palette { bg: string; ink: string; soft: string; accent: string; gold: string; pill: string; pillInk: string }

/** 글 칸 높이를 재고 그린다 — draw=false 면 재기만 */
function storyBlock(ctx: Ctx, input: ReadingPrintInput, p: Palette, x: number, y: number, w: number, draw: boolean): number {
  const s = input.story
  let cy = y
  const line = (text: string, font: string, color: string, lh: number, align: CanvasTextAlign = 'center') => {
    ctx.font = font
    const lines = wrap(ctx, text, w)
    if (draw) {
      ctx.fillStyle = color; ctx.textAlign = align
      lines.forEach((l, i) => ctx.fillText(l, align === 'center' ? x + w / 2 : x, cy + lh * (i + 0.78)))
    }
    cy += lines.length * lh
  }
  line(s.keyword, `96px ${HEAD}`, p.accent, 104)
  cy += 4
  line(s.title, `800 46px ${BODY}`, p.ink, 58)
  cy += 22
  for (const l of s.lines) { line(l, `500 33px ${BODY}`, p.ink, 47); cy += 12 }
  cy += 8
  // 행운의 색 · 물건 — 알약 둘
  const pills = [`행운의 색 · ${s.lucky.color}`, `행운의 물건 · ${s.lucky.item}`]
  ctx.font = `800 30px ${BODY}`
  const widths = pills.map((t) => ctx.measureText(t).width + 56)
  const total = widths.reduce((a, b) => a + b, 0) + 20
  if (draw) {
    let px = x + (w - total) / 2
    pills.forEach((t, i) => {
      roundRect(ctx, px, cy, widths[i], 60, 30); ctx.fillStyle = p.pill; ctx.fill()
      ctx.fillStyle = p.pillInk; ctx.textAlign = 'center'; ctx.fillText(t, px + widths[i] / 2, cy + 41)
      px += widths[i] + 20
    })
  }
  cy += 60 + 26
  line(s.wish, `62px ${HAND}`, p.accent, 66)
  return cy - y
}

/** 사주 네 기둥(시 · 일 · 월 · 년) — 한자 두 글자씩 */
function pillarsRow(ctx: Ctx, saju: SajuView, p: Palette, x: number, y: number, w: number, draw: boolean): number {
  const h = 128
  if (!draw) return h + 18
  const cols = saju.pillars
  const cw = (w - 30) / cols.length
  cols.forEach((col, i) => {
    const cx = x + i * (cw + 10)
    roundRect(ctx, cx, y, cw, h, 14)
    ctx.strokeStyle = p.gold; ctx.lineWidth = 3; ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = p.soft; ctx.font = `700 22px ${BODY}`
    ctx.fillText(col.label, cx + cw / 2, y + 32)
    ctx.fillStyle = col.hanja ? p.ink : p.soft; ctx.font = col.hanja ? `62px ${HANJA}` : `600 28px ${BODY}`
    ctx.fillText(col.hanja ?? '모름', cx + cw / 2, y + (col.hanja ? 104 : 92))
  })
  return h + 18
}

function footer(ctx: Ctx, programId: string, p: Palette, bottom: number): number {
  const brand = eventBrandFor(programId)
  let y = bottom
  ctx.textAlign = 'center'
  if (brand) {
    const logo = brand.printLogo ? logoCache.get(brand.printLogo) : null
    if (logo) {
      const h = 70, w = Math.min(420, (logo.naturalWidth / logo.naturalHeight) * h)
      ctx.drawImage(logo, READING_W / 2 - w / 2, y - h, w, h)
      y -= h + 10
    }
    if (brand.line) { ctx.fillStyle = p.ink; ctx.font = `800 26px ${BODY}`; ctx.fillText(brand.line, READING_W / 2, y); y -= 38 }
  }
  ctx.fillStyle = p.soft; ctx.font = `500 21px ${BODY}`
  const lines = wrap(ctx, READING_NOTICE, READING_W - 260)
  lines.reverse().forEach((l, i) => ctx.fillText(l, READING_W / 2, y - i * 28))
  return bottom - y + 30
}

// ─────────── ① 새해 카드 ───────────
const CARD: Palette = { bg: '#f6efe0', ink: '#2a2420', soft: '#7a6e60', accent: '#b3261e', gold: '#c9a24a', pill: '#efe1c2', pillInk: '#5a4630' }

function card(ctx: Ctx, program: ProgramDef, input: ReadingPrintInput) {
  const p = CARD
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, READING_W, READING_H)
  // 종이 결
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(120,95,60,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * READING_W, Math.random() * READING_H, 2, 2) }
  // 이중 테두리
  ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.strokeRect(36, 36, READING_W - 72, READING_H - 72)
  ctx.lineWidth = 1.5; ctx.strokeRect(50, 50, READING_W - 100, READING_H - 100)
  // 머리 — 2027 丁未年 · 프로그램 이름
  ctx.textAlign = 'center'
  ctx.fillStyle = p.accent; ctx.font = `54px ${HANJA}`
  ctx.fillText('丁未年', READING_W / 2, 140)
  ctx.fillStyle = p.ink; ctx.font = `800 30px ${BODY}`
  ctx.fillText(`2027 · ${program.name}`, READING_W / 2, 190)
  // 낙관
  ctx.fillStyle = p.accent; roundRect(ctx, READING_W - 190, 92, 92, 92, 10); ctx.fill()
  ctx.fillStyle = '#fbeee0'; ctx.font = `46px ${HANJA}`; ctx.fillText('福', READING_W - 144, 156)

  const x = 110, w = READING_W - 220
  const sajuH = input.saju ? pillarsRow(ctx, input.saju, p, x, 0, w, false) : 0
  const textH = storyBlock(ctx, input, p, x, 0, w, false)
  const foot = 110
  const top = 228
  const photoH = Math.max(560, READING_H - foot - top - 30 - sajuH - textH - 30)
  // 사진 — 둥근 모서리 + 금색 테
  ctx.save(); roundRect(ctx, x, top, w, photoH, 26); ctx.clip()
  drawPhoto(ctx, input.photo, input.focus, x, top, w, photoH)
  ctx.restore()
  roundRect(ctx, x, top, w, photoH, 26); ctx.strokeStyle = p.gold; ctx.lineWidth = 6; ctx.stroke()
  if (input.tag) {
    ctx.font = `800 26px ${BODY}`
    const tw = ctx.measureText(input.tag).width + 40
    roundRect(ctx, x + 24, top + 24, tw, 50, 25); ctx.fillStyle = 'rgba(42,36,32,0.72)'; ctx.fill()
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(input.tag, x + 24 + tw / 2, top + 59)
  }
  let y = top + photoH + 30
  if (input.saju) y += pillarsRow(ctx, input.saju, p, x, y, w, true)
  storyBlock(ctx, input, p, x, y, w, true)
  footer(ctx, program.id, p, READING_H - 74)
}

// ─────────── ② 정미년 연하장 ───────────
const LETTER: Palette = { bg: '#7d1717', ink: '#fff6e6', soft: '#e9c9a8', accent: '#f0cd73', gold: '#d9b45a', pill: 'rgba(240,205,115,0.18)', pillInk: '#f7e2ae' }

function letter(ctx: Ctx, program: ProgramDef, input: ReadingPrintInput) {
  const p = LETTER
  const g = ctx.createLinearGradient(0, 0, 0, READING_H)
  g.addColorStop(0, '#8e1d1d'); g.addColorStop(1, '#5e1010')
  ctx.fillStyle = g; ctx.fillRect(0, 0, READING_W, READING_H)
  // 구름 무늬(옅게)
  ctx.strokeStyle = 'rgba(240,205,115,0.12)'; ctx.lineWidth = 3
  // 사진 양옆 여백에만(글 칸과 겹치지 않게)
  for (const [cx, cy, r] of [[150, 300, 60], [1060, 420, 70], [140, 760, 50], [1070, 860, 55]] as const) {
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx + k * r * 0.9 - r, cy, r * (k === 1 ? 1 : 0.75), Math.PI, 0); ctx.stroke() }
  }
  // 금색 이중 테두리
  ctx.strokeStyle = p.gold; ctx.lineWidth = 5; ctx.strokeRect(40, 40, READING_W - 80, READING_H - 80)
  ctx.lineWidth = 2; ctx.strokeRect(58, 58, READING_W - 116, READING_H - 116)
  // 머리 — 謹賀新年 · 2027 정미년
  ctx.textAlign = 'center'
  ctx.fillStyle = p.accent; ctx.font = `64px ${HANJA}`
  ctx.fillText('謹賀新年', READING_W / 2, 150)
  ctx.fillStyle = p.soft; ctx.font = `700 28px ${BODY}`
  ctx.fillText(`2027 · ${program.name}`, READING_W / 2, 198)

  const x = 120, w = READING_W - 240
  const sajuH = input.saju ? pillarsRow(ctx, input.saju, p, x, 0, w, false) : 0
  const textH = storyBlock(ctx, input, p, x, 0, w, false)
  const foot = 110
  const top = 236
  const photoH = Math.max(560, READING_H - foot - top - 30 - sajuH - textH - 30)
  // 아치 사진 — 가운데, 높이에 맞춘 폭
  const pw = input.wide ? w : Math.min(w, Math.round(photoH * 0.92)), px = (READING_W - pw) / 2
  const r = input.wide ? 240 : pw / 2
  ctx.save(); arch(ctx, px, top, pw, photoH, r); ctx.clip()
  drawPhoto(ctx, input.photo, input.focus, px, top, pw, photoH)
  ctx.restore()
  arch(ctx, px, top, pw, photoH, r); ctx.strokeStyle = p.gold; ctx.lineWidth = 8; ctx.stroke()
  arch(ctx, px - 14, top - 14, pw + 28, photoH + 14, r + 14); ctx.lineWidth = 2; ctx.stroke()
  // 丁未 금 도장(오른쪽 아래)
  ctx.fillStyle = p.gold; roundRect(ctx, px + pw - 70, top + photoH - 112, 96, 96, 12); ctx.fill()
  ctx.fillStyle = '#7d1717'; ctx.font = `40px ${HANJA}`; ctx.textAlign = 'center'
  ctx.fillText('丁未', px + pw - 22, top + photoH - 50)
  let y = top + photoH + 30
  if (input.saju) y += pillarsRow(ctx, input.saju, p, x, y, w, true)
  storyBlock(ctx, input, p, x, y, w, true)
  footer(ctx, program.id, p, READING_H - 80)
}

export function renderReadingPrint(program: ProgramDef, design: 0 | 1, input: ReadingPrintInput): string {
  const canvas = document.createElement('canvas')
  canvas.width = READING_W
  canvas.height = READING_H
  const ctx = canvas.getContext('2d')!
  ;(design === 0 ? card : letter)(ctx, program, input)
  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = canvas.height = 0
  return out
}
