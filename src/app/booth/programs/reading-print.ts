'use client'

// 「2027 정미년 새해 이야기」(관상 · 사주 · 손금) 4×6 인화 원판 두 가지 — 찍은 사진 + AI 새해 이야기를 기기 안에서 합성한다(그림 생성 없음).
// 화면과 같은 「모노 갤러리」 말투(2026-11-17 사용자 선택 — 국내 셀프 사진관 모노맨션 · 인생네컷 계열): 흑 · 백 · 미색 + 노랑 한 점, 가는 세리프 숫자, 얇은 한글.
//   ① WHITE — 미색 종이 · 컬러 사진 · 사진 둘레에 가는 검은 선(액자 속 인화) · 검정 정사각 도장(丁未)
//   ② BLACK — 검정 바탕 · 흰 종이 카드에 흑백 사진 · 흰 글 · 노란 가는 선 하나
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
  /** 관상: 고른 주제 · 표정 / 손금: 손 모양 / 사주: 띠 · 일간 */
  tag?: string
  /** 얼굴 옆 손바닥까지 담는 넓은 사진(손금) — 사진 칸을 조금 낮고 넓게 */
  wide?: boolean
}

type Ctx = CanvasRenderingContext2D

/** 저장소 원본 글꼴 — 영문 숫자 · 워드마크는 Cormorant Garamond(가는 세리프), 한자는 LXGW WenKai TC, 한글은 Pretendard 가변(programs.css) */
const FONTS: [family: string, url: string, desc?: FontFaceDescriptors][] = [
  ['nh-serif', '/fonts/cormorant-garamond/CormorantGaramond-latin.woff2', { weight: '300 700' }],
  ['nh-serif', '/fonts/cormorant-garamond/CormorantGaramond-italic-latin.woff2', { weight: '300', style: 'italic' }],
  ['nh-hanja', '/fonts/hanja/wenkai-tc-700.woff2'],
  // 새해 관상 초상 원판(portrait-print.ts) — 큰 붓글씨 · 옛 명조(public/fonts/brush/README.md)
  ['nh-brush', '/fonts/brush/east-sea-dokdo.woff2'],
  ['nh-myeongjo', '/fonts/brush/song-myung.woff2'],
]
const SERIF = "'nh-serif', 'Times New Roman', serif"
const HANJA = "'nh-hanja', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif"
const SANS = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
let fontsReady: Promise<void> | null = null
const logoCache = new Map<string, HTMLImageElement | null>()

/** 생성을 기다리는 동안 받아 둔다(못 받으면 기본 글꼴) */
export function loadReadingPrintAssets(programId: string): Promise<void> {
  fontsReady ??= Promise.all(FONTS.map(async ([family, url, desc]) => {
    try { const face = new FontFace(family, `url(${url})`, desc); await face.load(); document.fonts.add(face) } catch { /* 기본 글꼴 */ }
  })).then(() => Promise.all(['200 40px Pretendard', '300 40px Pretendard', '400 40px Pretendard', '500 40px Pretendard', '600 40px Pretendard'].map((s) => document.fonts.load(s, '가A').catch(() => undefined)))).then(() => undefined)
  const logo = eventBrandFor(programId)?.printLogo
  const logoLoad = logo && !logoCache.has(logo) ? new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => { logoCache.set(logo, image); resolve() }
    image.onerror = () => { logoCache.set(logo, null); resolve() }
    image.src = logo
  }) : Promise.resolve()
  return Promise.all([fontsReady, logoLoad]).then(() => undefined)
}

export function wrap(ctx: Ctx, text: string, width: number): string[] {
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

/** 사진을 칸에 꽉 차게(얼굴을 위 40% 쯤에) */
function drawPhoto(ctx: Ctx, pic: ReadingPrintInput['photo'], focus: ReadingPrintInput['focus'], x: number, y: number, w: number, h: number) {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale, sh = h / scale
  const fx = (focus?.x ?? 0.5) * iw, fy = (focus?.y ?? 0.45) * ih
  const sx = Math.max(0, Math.min(iw - sw, fx - sw / 2))
  const sy = Math.max(0, Math.min(ih - sh, fy - sh * 0.42))
  ctx.drawImage(pic, sx, sy, sw, sh, x, y, w, h)
}

/** 칸 안을 흑백으로(사파리 등 ctx.filter 가 없는 곳도 같게 — 화소를 직접 바꾼다) */
function grayscale(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const img = ctx.getImageData(x, y, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // 살짝 대비를 올린 흑백(밝기 가중치 BT.709)
    const v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const c = Math.max(0, Math.min(255, (v - 128) * 1.08 + 128))
    d[i] = d[i + 1] = d[i + 2] = c
  }
  ctx.putImageData(img, x, y)
}

interface Palette { bg: string; ink: string; body: string; mute: string; line: string; accent: string | null }

/** 글 칸 — 높이를 재고(draw=false) 그린다. 왼쪽 맞춤, 굵기 대비(아주 가는 키워드 · 보통 본문)로 위계 */
function story(ctx: Ctx, input: ReadingPrintInput, p: Palette, x: number, y: number, w: number, draw: boolean): number {
  const s = input.story
  let cy = y
  const para = (text: string, font: string, color: string, lh: number) => {
    ctx.font = font
    const lines = wrap(ctx, text, w)
    if (draw) { ctx.fillStyle = color; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, x, cy + lh * (i + 0.8))) }
    cy += lines.length * lh
  }
  para(s.keyword, `200 82px ${SANS}`, p.ink, 92)
  cy += 2
  para(s.title, `500 30px ${SANS}`, p.ink, 42)
  cy += 22
  if (input.saju) cy += pillars(ctx, input.saju, p, x, cy, w, draw) + 24
  for (const l of s.lines) { para(l, `400 25px ${SANS}`, p.body, 39); cy += 8 }
  cy += 18
  // 행운 — 영문 이탤릭 라벨 + 값, 두 칸
  const half = (w - 24) / 2
  if (draw) {
    ;[['Lucky color', s.lucky.color], ['Lucky item', s.lucky.item]].forEach(([label, value], i) => {
      const lx = x + i * (half + 24)
      ctx.fillStyle = p.accent ?? p.line; ctx.fillRect(lx, cy, half, p.accent ? 2 : 1)
      ctx.textAlign = 'left'
      ctx.fillStyle = p.mute; ctx.font = `italic 300 24px ${SERIF}`; ctx.fillText(label, lx, cy + 34)
      ctx.fillStyle = p.ink; ctx.font = `500 26px ${SANS}`; ctx.fillText(value, lx, cy + 70)
    })
  }
  cy += 92
  para(`“${s.wish}”`, `300 27px ${SANS}`, p.ink, 40)
  return cy - y
}

/** 사주 네 기둥 — 가는 선 표 */
function pillars(ctx: Ctx, saju: SajuView, p: Palette, x: number, y: number, w: number, draw: boolean): number {
  const h = 128
  if (!draw) return h
  const cw = w / saju.pillars.length
  ctx.strokeStyle = p.line; ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  saju.pillars.forEach((col, i) => {
    const cx = x + i * cw
    if (i) { ctx.beginPath(); ctx.moveTo(cx + 0.5, y); ctx.lineTo(cx + 0.5, y + h); ctx.stroke() }
    ctx.textAlign = 'center'
    ctx.fillStyle = p.mute; ctx.font = `500 18px ${SANS}`; ctx.fillText(col.label, cx + cw / 2, y + 32)
    ctx.fillStyle = col.hanja ? p.ink : p.mute; ctx.font = col.hanja ? `56px ${HANJA}` : `300 26px ${SANS}`
    ctx.fillText(col.hanja ?? '모름', cx + cw / 2, y + (col.hanja ? 100 : 92))
  })
  return h
}

/** 머리 — 왼쪽 2027 丁未年, 오른쪽 워드마크 · 아래 가는 선 · 프로그램 이름과 꼬리표 */
function header(ctx: Ctx, program: ProgramDef, input: ReadingPrintInput, p: Palette, x: number, w: number): number {
  ctx.textAlign = 'left'
  ctx.fillStyle = p.ink; ctx.font = `300 44px ${SERIF}`; ctx.fillText('2027', x, 112)
  const yw = ctx.measureText('2027 ').width
  ctx.font = `36px ${HANJA}`; ctx.fillText('丁未年', x + yw, 110)
  ctx.textAlign = 'right'; ctx.font = `400 44px ${SERIF}`; ctx.fillText(program.wordmark, x + w, 112)
  ctx.fillStyle = p.line; ctx.fillRect(x, 136, w, 1)
  ctx.textAlign = 'left'; ctx.fillStyle = p.mute; ctx.font = `italic 300 26px ${SERIF}`; ctx.fillText('New Year Story', x, 178)
  const nx = x + ctx.measureText('New Year Story  ').width
  ctx.font = `500 21px ${SANS}`; ctx.fillText(`· ${program.name}`, nx, 176)
  if (input.tag) { ctx.textAlign = 'right'; ctx.fillText(input.tag, x + w, 176) }
  return 212
}

/** 바닥 — (브랜드) · 재미로 보는 이야기 안내 · 오른쪽 도장. 차지한 높이를 돌려준다 */
function footer(ctx: Ctx, programId: string, p: Palette, x: number, w: number, bottom: number, stamp: { bg: string; ink: string }, draw: boolean): number {
  const brand = eventBrandFor(programId)
  ctx.font = `400 18px ${SANS}`
  const notice = wrap(ctx, READING_NOTICE, w - 130)
  const logo = brand?.printLogo ? logoCache.get(brand.printLogo) : null
  const h = 20 + notice.length * 28 + (brand?.line ? 36 : 0) + (logo ? 80 : 0)
  if (!draw) return Math.max(h, 96)
  const top = bottom - Math.max(h, 96)
  ctx.fillStyle = p.line; ctx.fillRect(x, top, w, 1)
  let y = top + 22
  ctx.textAlign = 'left'
  if (logo) { const lh = 64, lw = Math.min(360, (logo.naturalWidth / logo.naturalHeight) * lh); ctx.drawImage(logo, x, y, lw, lh); y += lh + 16 }
  if (brand?.line) { ctx.fillStyle = p.ink; ctx.font = `600 22px ${SANS}`; ctx.fillText(brand.line, x, y + 22); y += 36 }
  ctx.fillStyle = p.mute; ctx.font = `400 18px ${SANS}`
  notice.forEach((l, i) => ctx.fillText(l, x, y + 20 + i * 28))
  // 丁未 도장 — 정사각 한 점
  const s = 76, sx = x + w - s, sy = top + 18
  ctx.fillStyle = stamp.bg; ctx.fillRect(sx, sy, s, s)
  ctx.fillStyle = stamp.ink; ctx.font = `30px ${HANJA}`; ctx.textAlign = 'center'
  ctx.fillText('丁', sx + s / 2, sy + 34); ctx.fillText('未', sx + s / 2, sy + 66)
  return Math.max(h, 96)
}

// ─────────── ① WHITE ───────────
const WHITE: Palette = { bg: '#f4f1ea', ink: '#161616', body: '#3b3833', mute: '#7a756d', line: '#161616', accent: null }

function white(ctx: Ctx, program: ProgramDef, input: ReadingPrintInput) {
  const p = WHITE, x = 76, w = READING_W - 152
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, READING_W, READING_H)
  // 종이 결(아주 옅게)
  for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(90,80,60,${Math.random() * 0.035})`; ctx.fillRect(Math.random() * READING_W, Math.random() * READING_H, 2, 2) }
  const top = header(ctx, program, input, p, x, w) + 20
  const foot = footer(ctx, program.id, p, x, w, READING_H - 60, { bg: '#161616', ink: '#f4f1ea' }, false)
  const textH = story(ctx, input, p, x, 0, w, false)
  const photoH = Math.max(560, READING_H - 60 - foot - 40 - textH - 48 - top - 12)
  // 사진 + 둘레 가는 선(10px 띄워서) — 액자 속 인화
  drawPhoto(ctx, input.photo, input.focus, x + 12, top + 12, w - 24, photoH)
  ctx.strokeStyle = p.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, top + 0.75, w - 1.5, photoH + 22.5)
  story(ctx, input, p, x, top + photoH + 24 + 48, w, true)
  footer(ctx, program.id, p, x, w, READING_H - 60, { bg: '#161616', ink: '#f4f1ea' }, true)
}

// ─────────── ② BLACK ───────────
const BLACK: Palette = { bg: '#121212', ink: '#f3f0ea', body: '#c9c5bd', mute: '#8e8a83', line: '#4a4744', accent: '#f2c230' }

function black(ctx: Ctx, program: ProgramDef, input: ReadingPrintInput) {
  const p = BLACK, x = 76, w = READING_W - 152
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, READING_W, READING_H)
  const top = header(ctx, program, input, p, x, w) + 20
  const foot = footer(ctx, program.id, p, x, w, READING_H - 60, { bg: '#f2c230', ink: '#141414' }, false)
  const textH = story(ctx, input, p, x, 0, w, false)
  const cardH = Math.max(600, READING_H - 60 - foot - 40 - textH - 44 - top)
  // 흰 종이 카드(아래 여백이 넓은 인화지) 안에 흑백 사진
  const pad = 24, capH = 58
  ctx.fillStyle = '#f6f3ec'; ctx.fillRect(x, top, w, cardH)
  const ph = cardH - pad - capH
  drawPhoto(ctx, input.photo, input.focus, x + pad, top + pad, w - pad * 2, ph)
  grayscale(ctx, Math.round(x + pad), Math.round(top + pad), Math.round(w - pad * 2), Math.round(ph))
  ctx.fillStyle = '#161616'; ctx.textAlign = 'left'; ctx.font = `italic 300 26px ${SERIF}`; ctx.fillText('New Year Story · 2027', x + pad, top + cardH - 20)
  ctx.textAlign = 'right'; ctx.font = `24px ${HANJA}`; ctx.fillText('丁未年', x + w - pad, top + cardH - 20)
  story(ctx, input, p, x, top + cardH + 44, w, true)
  footer(ctx, program.id, p, x, w, READING_H - 60, { bg: '#f2c230', ink: '#141414' }, true)
}

export function renderReadingPrint(program: ProgramDef, design: 0 | 1, input: ReadingPrintInput): string {
  const canvas = document.createElement('canvas')
  canvas.width = READING_W
  canvas.height = READING_H
  const ctx = canvas.getContext('2d', { willReadFrequently: design === 1 })!
  ;(design === 0 ? white : black)(ctx, program, input)
  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = canvas.height = 0
  return out
}
