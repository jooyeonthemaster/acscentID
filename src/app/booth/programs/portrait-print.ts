'use client'

// 새해 관상 FACE!(nh-face) 4×6 인화 원판 두 가지 — AI 동양풍 초상(src/lib/booth/programs/portrait.ts) 위에 새해 이야기를 붓글씨로 얹는다.
// 2026-11-17 사용자 요청: 「동양풍 얼굴 초상처럼 나오면서 여기에 분석 결과가 쓰여 나오게」(시대극 영화 포스터 분위기 — 배우 · 제목 글씨 · 도장은 따라 하지 않는다).
//   ① 초상 포스터 — 초상을 꽉 채우고, 왼쪽 위 세로 제목 · 오른쪽 아래 세로 붓글씨 키워드 · 아래 한지로 번지는 칸에 이야기
//   ② 족자 — 한지 바탕에 액자처럼 초상, 아래 가운데 맞춤 이야기
// AI 초상을 못 받으면 찍은 사진을 세피아로 바꿔 같은 자리에 넣는다(손님을 막지 않는다). 화면 미리보기 = 폰 저장 = 인쇄 원판(같은 JPEG).

import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { READING_NOTICE } from '@/lib/booth/programs/reading'
import { eventBrandFor } from '@/lib/nh-awards/brand'
import { READING_H, READING_W, wrap, type ReadingPrintInput } from './reading-print'

type Ctx = CanvasRenderingContext2D

const BRUSH = "'nh-brush', 'nh-myeongjo', 'Noto Serif KR', 'AppleMyungjo', serif"
const MYEONGJO = "'nh-myeongjo', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif"
const HANJA = "'nh-hanja', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif"
const SANS = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"

const PAPER = '#ece1c8'
const INK = '#1e1711'
const BODY = '#3a2f24'
const MUTE = '#7d6e5c'
const RED = '#a3271c'

export interface PortraitPrintInput extends ReadingPrintInput {
  /** photo 가 AI 초상인가 — 아니면(찍은 사진) 세피아로 바꿔 넣는다 */
  portrait: boolean
  /** photo 안 모든 얼굴을 감싼 상자(0~1, 이마~턱) — 단체 초상에서 얼굴이 글 칸에 묻히지 않게 맞춘다. 없으면 가운데 기준 */
  faces?: FaceBox | null
}

export interface FaceBox { x0: number; y0: number; x1: number; y1: number }

/** 얼굴 상자 → 머리(상투 · 비녀)부터 턱 아래까지 */
function headBox(b: FaceBox): FaceBox {
  const h = b.y1 - b.y0
  const w = b.x1 - b.x0
  return { x0: Math.max(0, b.x0 - w * 0.12), x1: Math.min(1, b.x1 + w * 0.12), y0: Math.max(0, b.y0 - h * 0.55), y1: Math.min(1, b.y1 + h * 0.12) }
}

/** 그릴 자리 — 배율 k, 왼쪽 위(dx, dy), 캔버스 위 머리 상자(없으면 null) */
interface Fit { k: number; dx: number; dy: number; head: { x0: number; y0: number; x1: number; y1: number } | null }

/**
 * 사진을 (x, y, w, h) 칸에 놓을 자리 — 기본은 칸을 꽉 채우고(lift 만큼 올려), 얼굴이 [top, bottom] 을 넘으면 더 올리고,
 * 그래도 안 되면 줄인다(양옆은 drawFitted 가 한지색으로 녹인다)
 */
function fitFaces(pic: ReadingPrintInput['photo'], box: FaceBox | null | undefined, x: number, y: number, w: number, h: number, top: number, bottom: number, lift: number): Fit {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  let k = Math.max(w / iw, (h + lift) / ih)
  let dx = x + (w - iw * k) / 2
  let dy = y - lift
  if (!box) return { k, dx, dy, head: null }
  const hb = headBox(box)
  const cx = (hb.x0 + hb.x1) / 2
  dx = Math.min(x, Math.max(x + w - iw * k, x + w / 2 - cx * iw * k))
  const room = bottom - top
  if ((hb.y1 - hb.y0) * ih * k > room) {
    // 줄인다 — 머리 위 ~ 턱 아래가 room 에 맞게(너무 작아지지 않게 칸 폭의 70% 까지)
    k = Math.max((w * 0.7) / iw, room / ((hb.y1 - hb.y0) * ih))
    dx = x + (w - iw * k) / 2
  }
  // 턱이 bottom 위에, 머리가 top 아래에(머리를 먼저 지킨다), 그림 위끝은 칸 위끝보다 아래로 내려오지 않게
  dy = Math.min(y, Math.max(top - hb.y0 * ih * k, Math.min(dy, bottom - hb.y1 * ih * k)))
  return { k, dx, dy, head: { x0: dx + hb.x0 * iw * k, x1: dx + hb.x1 * iw * k, y0: dy + hb.y0 * ih * k, y1: dy + hb.y1 * ih * k } }
}

function drawFitted(ctx: Ctx, pic: ReadingPrintInput['photo'], f: Fit, x: number, y: number, w: number, h: number) {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const { k, dx, dy } = f
  ctx.drawImage(pic, dx, dy, iw * k, ih * k)
  // 줄여서 양옆이 비면 한지색으로 녹인다
  if (dx - x > 0.5) {
    const g = ctx.createLinearGradient(dx, 0, dx + 170, 0)
    g.addColorStop(0, 'rgba(236,225,200,1)'); g.addColorStop(1, 'rgba(236,225,200,0)')
    ctx.fillStyle = g; ctx.fillRect(dx - 1, y, 171, h)
  }
  const ex = dx + iw * k
  if (x + w - ex > 0.5) {
    const g = ctx.createLinearGradient(ex - 170, 0, ex, 0)
    g.addColorStop(0, 'rgba(236,225,200,0)'); g.addColorStop(1, 'rgba(236,225,200,1)')
    ctx.fillStyle = g; ctx.fillRect(ex - 170, y, 171, h)
  }
  // 그림 아래가 칸 끝보다 위면(줄였을 때) 아래도 녹인다
  const end = dy + ih * k
  if (end < y + h) {
    const g = ctx.createLinearGradient(0, end - 120, 0, end)
    g.addColorStop(0, 'rgba(236,225,200,0)'); g.addColorStop(1, 'rgba(236,225,200,1)')
    ctx.fillStyle = g; ctx.fillRect(x, end - 120, w, 121)
  }
}

/** 사진을 칸에 꽉 차게(얼굴을 위 40% 쯤에) — AI 초상을 못 받아 찍은 사진을 넣을 때 */
function cover(ctx: Ctx, pic: ReadingPrintInput['photo'], focus: ReadingPrintInput['focus'], x: number, y: number, w: number, h: number) {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale, sh = h / scale
  const fx = (focus?.x ?? 0.5) * iw, fy = (focus?.y ?? 0.42) * ih
  const sx = Math.max(0, Math.min(iw - sw, fx - sw / 2))
  const sy = Math.max(0, Math.min(ih - sh, fy - sh * 0.4))
  ctx.drawImage(pic, sx, sy, sw, sh, x, y, w, h)
}

/** 찍은 사진을 초상 분위기로 — 낮은 채도의 따뜻한 세피아(화소를 직접 바꾼다: 사파리도 같게) */
function sepia(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const img = ctx.getImageData(x, y, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const c = Math.max(0, Math.min(255, (v - 128) * 1.05 + 128))
    d[i] = Math.min(255, c * 1.02 + 18)
    d[i + 1] = Math.min(255, c * 0.94 + 10)
    d[i + 2] = Math.min(255, c * 0.78)
  }
  ctx.putImageData(img, x, y)
}

/** 한지 결 — 아주 옅은 점 */
function grain(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(90,70,40,${Math.random() * alpha})`; ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2) }
}

/** 세로쓰기에서 빼는 문장 부호(세로로 세우면 어색하다) */
const stripForVertical = (text: string) => text.replace(/[,.!?…'"“”‘’]/g, '').replace(/\s+/g, ' ').trim()

/** 낱말을 끊지 않고 한 줄에 max 자까지 채운 세로줄들(띄어쓰기는 반 칸) */
export function verticalColumns(text: string, max: number): string[] {
  const cols: string[] = []
  let col = ''
  for (const word of stripForVertical(text).split(' ').filter(Boolean)) {
    const next = col ? `${col} ${word}` : word
    if ([...next.replace(/ /g, '')].length + (next.split(' ').length - 1) * 0.5 <= max) { col = next; continue }
    if (col) cols.push(col)
    // 낱말이 한 줄보다 길면 글자로 자른다
    let rest = [...word]
    while (rest.length > max) { cols.push(rest.slice(0, max).join('')); rest = rest.slice(max) }
    col = rest.join('')
  }
  if (col) cols.push(col)
  return cols
}

/** 세로 한 줄 — x 는 줄 가운데, y 는 첫 글자 윗변. 그린 높이를 돌려준다 */
function verticalLine(ctx: Ctx, text: string, x: number, y: number, step: number, draw = true): number {
  let cy = y
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const ch of text) {
    if (ch === ' ') { cy += step * 0.45; continue }
    if (draw) ctx.fillText(ch, x, cy)
    cy += step
  }
  ctx.textBaseline = 'alphabetic'
  return cy - y
}

/** 글자 둘레에 한지색 번짐 — 초상 위에서도 읽히게 */
function withHalo(ctx: Ctx, color: string, blur: number, draw: () => void) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  draw(); draw()
  ctx.restore()
  draw()
}

/** 丁未 도장 — 붉은 바탕에 흰 글씨, 테두리를 살짝 거칠게 */
function seal(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  ctx.fillStyle = RED
  ctx.globalAlpha = 0.92
  ctx.beginPath()
  ctx.moveTo(x + 2, y + 1); ctx.lineTo(x + s - 1, y + 3); ctx.lineTo(x + s, y + s - 2); ctx.lineTo(x + 1, y + s); ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#f3e7cf'; ctx.lineWidth = 2
  ctx.strokeRect(x + 7, y + 7, s - 14, s - 14)
  ctx.fillStyle = '#f6ecd6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `${Math.round(s * 0.36)}px ${HANJA}`
  ctx.fillText('丁', x + s / 2, y + s * 0.3)
  ctx.fillText('未', x + s / 2, y + s * 0.7)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

/** 이야기 글 칸(가로) — 꼬리표 · 세 문장 · 행운 · 덕담. align center 면 x 가 가운데. 높이를 돌려준다 */
function storyBlock(ctx: Ctx, input: ReadingPrintInput, x: number, y: number, w: number, align: 'left' | 'center', draw: boolean, opts: { keyword?: boolean; title?: boolean } = {}): number {
  const s = input.story
  let cy = y
  ctx.textAlign = align
  const para = (text: string, font: string, color: string, lh: number) => {
    ctx.font = font
    const lines = wrap(ctx, text, w)
    if (draw) { ctx.fillStyle = color; ctx.textAlign = align; lines.forEach((l, i) => ctx.fillText(l, x, cy + lh * (i + 0.78))) }
    cy += lines.length * lh
  }
  if (opts.keyword) { para(s.keyword, `118px ${BRUSH}`, INK, 118); cy += 2; para(s.title, `40px ${MYEONGJO}`, INK, 52); cy += 22 }
  else if (opts.title) { para(s.title, `40px ${MYEONGJO}`, INK, 52); cy += 14 }
  if (input.tag) { para(input.tag, `500 22px ${SANS}`, RED, 32); cy += 8 }
  for (const l of s.lines) { para(l, `29px ${MYEONGJO}`, BODY, 43); cy += 6 }
  cy += 12
  para(`행운의 색 ${s.lucky.color}  ·  행운의 물건 ${s.lucky.item}`, `27px ${MYEONGJO}`, INK, 40)
  cy += 10
  para(s.wish, `50px ${BRUSH}`, RED, 54)
  return cy - y
}

/** 바닥 안내(재미로 보는 이야기 · 브랜드 한 줄) — 높이를 돌려준다 */
function notice(ctx: Ctx, programId: string, x: number, bottom: number, w: number, align: 'left' | 'center', draw: boolean): number {
  const brand = eventBrandFor(programId)
  ctx.font = `400 17px ${SANS}`
  const lines = wrap(ctx, READING_NOTICE, w)
  const h = lines.length * 25 + (brand?.line ? 32 : 0)
  if (!draw) return h
  let y = bottom - h
  ctx.textAlign = align
  if (brand?.line) { ctx.fillStyle = INK; ctx.font = `600 21px ${SANS}`; ctx.fillText(brand.line, x, y + 20); y += 32 }
  ctx.fillStyle = MUTE; ctx.font = `400 17px ${SANS}`
  lines.forEach((l, i) => ctx.fillText(l, x, y + 18 + i * 25))
  return h
}

/** 왼쪽 위 세로 제목 — 오른쪽 줄부터 「丁未年 새해 관상」, 그 왼쪽으로 제목, 맨 아래 도장 */
/** 왼쪽 위 세로 제목이 차지하는 오른쪽 끝(x) · 아래 끝(y) — 얼굴과 겹치는지 미리 본다 */
function titleBlockSize(title: string, left: number, top: number): { right: number; bottom: number } {
  const cols = verticalColumns(title, 9)
  const longest = Math.max(...cols.map((c) => [...c.replace(/ /g, '')].length * 53 + (c.split(' ').length - 1) * 24))
  return { right: left + cols.length * 60 + 30 + 24, bottom: top + Math.max(longest + 20, 300) + 24 + 68 }
}

/** 얼굴이 왼쪽 위까지 차면(단체 초상) — 세로 제목 대신 가로 한 줄 「丁未年 · 새해 관상」 + 도장 */
function labelLine(ctx: Ctx, program: ProgramDef, left: number, top: number) {
  withHalo(ctx, 'rgba(240,230,208,0.95)', 18, () => {
    ctx.textAlign = 'left'; ctx.fillStyle = RED; ctx.font = `36px ${HANJA}`; ctx.fillText('丁未年', left, top + 36)
    const w = ctx.measureText('丁未年 ').width
    ctx.fillStyle = INK; ctx.font = `28px ${MYEONGJO}`; ctx.fillText(program.name.replace(/ 이야기$/, ''), left + w + 6, top + 34)
  })
  seal(ctx, READING_W - 70 - 60, top - 4, 60)
}

function titleBlock(ctx: Ctx, program: ProgramDef, title: string, left: number, top: number) {
  const titleCols = verticalColumns(title, 9)
  const colW = 60
  const labelX = left + titleCols.length * colW + 30
  ctx.fillStyle = RED; ctx.font = `38px ${HANJA}`
  let h = 0
  withHalo(ctx, 'rgba(240,230,208,0.95)', 18, () => { ctx.fillStyle = RED; ctx.font = `38px ${HANJA}`; h = verticalLine(ctx, '丁未年', labelX, top, 42) })
  withHalo(ctx, 'rgba(240,230,208,0.95)', 18, () => { ctx.fillStyle = INK; ctx.font = `28px ${MYEONGJO}`; verticalLine(ctx, program.name.replace(/ 이야기$/, ''), labelX, top + h + 14, 31) })
  let longest = 0
  titleCols.forEach((col, i) => {
    const x = labelX - 30 - colW / 2 - i * colW - 4
    withHalo(ctx, 'rgba(240,230,208,0.95)', 22, () => { ctx.fillStyle = INK; ctx.font = `48px ${MYEONGJO}`; longest = Math.max(longest, verticalLine(ctx, col, x, top + 20, 53)) })
  })
  seal(ctx, labelX - 34, top + Math.max(longest + 20, h + 140) + 24, 68)
}

// ─────────── ① 초상 포스터 ───────────

function poster(ctx: Ctx, program: ProgramDef, input: PortraitPrintInput) {
  const W = READING_W, H = READING_H
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H)
  const x = 74, bottom = H - 56
  const noticeH = notice(ctx, program.id, x, 0, W - 148, 'left', false)
  // 세로 붓글씨 키워드 — 아래 글 칸 오른쪽(한 줄 4자, 세 줄이 되면 5자). 얼굴을 덮지 않게 턱 아래에서만 쓴다
  const long = verticalColumns(input.story.keyword, 4).length > 2
  const cols = verticalColumns(input.story.keyword, long ? 5 : 4)
  const maxChars = Math.max(...cols.map((c) => [...c.replace(/ /g, '')].length + (c.split(' ').length - 1) * 0.45))
  const kwBottom = bottom - noticeH - 18

  /** 배치 한 벌 — 세로 제목(true)/글 칸 제목(false), 세로 키워드(true)/글 칸 키워드(false) */
  const plan = (verticalTitle: boolean, verticalKeyword: boolean) => {
    const kwW = verticalKeyword ? cols.length * 150 + 20 : 0
    const textW = W - 148 - kwW
    const textH = storyBlock(ctx, input, x, 0, textW, 'left', false, { title: !verticalTitle, keyword: !verticalKeyword })
    const textTop = bottom - noticeH - 24 - textH
    const fadeTop = Math.max(900, textTop - 220)
    const top = verticalTitle ? 40 : 130
    const fit = input.portrait
      ? fitFaces(input.photo, input.faces, 0, 0, W, H, top, fadeTop + 50, 110)
      : { k: 0, dx: 0, dy: 0, head: null }
    return { kwW, textW, textTop, fadeTop, fit }
  }
  let verticalTitle = true, verticalKeyword = true
  let p = plan(true, true)
  const t = titleBlockSize(input.story.title, 70, 76)
  if (p.fit.head && p.fit.head.x0 < t.right && p.fit.head.y0 < t.bottom) { verticalTitle = false; p = plan(false, true) }
  // 키워드 칸: 턱(없으면 번짐 시작) 아래 ~ 안내 위. 두 글자도 못 들어가면 글 칸 맨 위에 가로로
  const kwTop = Math.max(p.fit.head ? p.fit.head.y1 + 16 : p.fadeTop + 40, p.textTop - 80)
  let size = Math.min(172, (kwBottom - kwTop) / (maxChars * 0.92))
  if (size < 104) { verticalKeyword = false; p = plan(verticalTitle, false) }
  size = Math.max(104, size)

  // 초상(얼굴이 번짐 위에 오게) · 찍은 사진이면 세피아
  if (input.portrait) drawFitted(ctx, input.photo, p.fit, 0, 0, W, H)
  else { cover(ctx, input.photo, input.focus, 0, -110, W, H + 110); sepia(ctx, 0, 0, W, H) }
  // 초상 아래가 한지로 번진다
  const g = ctx.createLinearGradient(0, p.fadeTop, 0, p.textTop - 16)
  g.addColorStop(0, 'rgba(236,225,200,0)')
  g.addColorStop(1, 'rgba(236,225,200,1)')
  ctx.fillStyle = g; ctx.fillRect(0, p.fadeTop, W, p.textTop - 16 - p.fadeTop)
  ctx.fillStyle = PAPER; ctx.fillRect(0, p.textTop - 16, W, H - p.textTop + 16)
  // 둘레를 살짝 어둡게(옛 사진 가장자리)
  const v = ctx.createRadialGradient(W / 2, H * 0.36, H * 0.3, W / 2, H * 0.45, H * 0.78)
  v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,0.2)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  grain(ctx, 0, 0, W, H, 900, 0.05)

  if (verticalKeyword) {
    const step = size * 0.92, colW = Math.min(150, size * 0.98)
    cols.forEach((col, i) => {
      const cx = W - 74 - colW / 2 - i * colW
      ctx.font = `${size}px ${BRUSH}`
      const h = verticalLine(ctx, col, cx, 0, step, false)
      // 오른쪽 줄은 위, 왼쪽 줄은 조금 아래(글 칸 쪽으로)
      const top = i === 0 ? Math.max(kwTop, kwBottom - h - size * 0.25) : kwBottom - h
      withHalo(ctx, 'rgba(238,228,204,0.95)', 26, () => { ctx.fillStyle = INK; ctx.font = `${size}px ${BRUSH}`; verticalLine(ctx, col, cx, top, step) })
    })
  }
  if (verticalTitle) titleBlock(ctx, program, input.story.title, 70, 76)
  else labelLine(ctx, program, 70, 40)
  storyBlock(ctx, input, x, p.textTop, p.textW, 'left', true, { title: !verticalTitle, keyword: !verticalKeyword })
  notice(ctx, program.id, x, bottom, W - 148, 'left', true)
}

// ─────────── ② 족자 ───────────

function scroll(ctx: Ctx, program: ProgramDef, input: PortraitPrintInput) {
  const W = READING_W, H = READING_H
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H)
  grain(ctx, 0, 0, W, H, 1400, 0.06)
  // 위 · 아래 족자 막대 느낌의 굵은 띠
  ctx.fillStyle = '#3b2a1c'; ctx.fillRect(0, 0, W, 22); ctx.fillRect(0, H - 22, W, 22)
  ctx.fillStyle = '#b08d57'; ctx.fillRect(0, 22, W, 4); ctx.fillRect(0, H - 26, W, 4)

  const x = 110, w = W - 220
  const noticeH = notice(ctx, program.id, W / 2, 0, w, 'center', false)
  const textH = storyBlock(ctx, input, W / 2, 0, w - 40, 'center', false, { keyword: true })
  const bottom = H - 70
  const photoTop = 96
  const photoH = Math.max(820, bottom - noticeH - 30 - textH - 50 - photoTop)
  // 비단 테(초상 둘레 두 겹)
  ctx.fillStyle = '#d9c7a2'; ctx.fillRect(x - 18, photoTop - 18, w + 36, photoH + 36)
  ctx.strokeStyle = '#6b5236'; ctx.lineWidth = 2; ctx.strokeRect(x - 18, photoTop - 18, w + 36, photoH + 36)
  if (input.portrait) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, photoTop, w, photoH); ctx.clip()
    ctx.fillStyle = PAPER; ctx.fillRect(x, photoTop, w, photoH)
    drawFitted(ctx, input.photo, fitFaces(input.photo, input.faces, x, photoTop, w, photoH, photoTop + 24, photoTop + photoH - 16, 0), x, photoTop, w, photoH)
    ctx.restore()
  } else {
    cover(ctx, input.photo, input.focus, x, photoTop, w, photoH)
    sepia(ctx, Math.round(x), photoTop, Math.round(w), Math.round(photoH))
  }
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, photoTop + 0.75, w - 1.5, photoH - 1.5)
  // 초상 왼쪽 위에 세로 「丁未年」 · 오른쪽 아래 도장
  withHalo(ctx, 'rgba(240,230,208,0.95)', 16, () => { ctx.fillStyle = RED; ctx.font = `36px ${HANJA}`; verticalLine(ctx, '丁未年', x + 46, photoTop + 34, 40) })
  seal(ctx, x + w - 92, photoTop + photoH - 92, 66)

  storyBlock(ctx, input, W / 2, photoTop + photoH + 18 + 50, w - 40, 'center', true, { keyword: true })
  notice(ctx, program.id, W / 2, bottom, w, 'center', true)
}

export function renderPortraitPrint(program: ProgramDef, design: 0 | 1, input: PortraitPrintInput): string {
  const canvas = document.createElement('canvas')
  canvas.width = READING_W
  canvas.height = READING_H
  const ctx = canvas.getContext('2d', { willReadFrequently: !input.portrait })!
  ;(design === 0 ? poster : scroll)(ctx, program, input)
  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = canvas.height = 0
  return out
}
