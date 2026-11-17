'use client'

// 정미년 사주 이야기 SAJU!(nh-saju) 인화 원판 — 가로 6×4(1800×1200)를 가운데에서 반 접는 카드.
// 2026-11-17 사용자 요청: 「행사 접는 카드처럼」(왼쪽 면은 꾸민 초상, 오른쪽 면은 오행 색 원국 + 풀이).
//   왼쪽 면(900×1200): AI 초상(saju-portrait.ts)을 꽉 채우고, 오른쪽 가장자리에 세로 큰 제목(키워드) · 아래에 丁未 도장.
//   오른쪽 면(900×1200): 머리(2027 丁未年 · 띠 · 일간) → 오행 색 칸 원국 + 십성 → 오행 개수 → 제목 → 소제목 단락 셋 → 행운 → 덕담 → 안내.
// 원국 색 칸은 만세력 앱 · 상담 리포트의 공통 문법(木 초록 · 火 빨강 · 土 노랑 · 金 흰색 · 水 검정).
// 십성 · 오행 개수는 서버가 준 원국 한자에서 다시 센다(엔진 함수 그대로, 새 계산 없음).
// 두 가지 색: ① 밤하늘(검정에 가까운 면 · 금색 선) ② 한지(미색 면 · 붉은 선). 초상을 못 받으면 찍은 사진을 그대로 넣는다.
// 인쇄기(tools/booth-app/app/print-photo.ps1)가 가로 원판을 돌려 4×6 에 찍는다.

import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { READING_NOTICE } from '@/lib/booth/programs/reading'
import { ELEMENT_HANJA, GAN, GAN_ELEMENT, GAN_HANJA, JI, JI_ELEMENT, JI_HANJA, principalStemOf, sipseongOf, type Element, type Gan } from '@/lib/saju'
import { eventBrandFor } from '@/lib/nh-awards/brand'
import type { ReadingPrintInput } from './reading-print'

export const SAJU_W = 1800
export const SAJU_H = 1200
const HALF = SAJU_W / 2

export interface SajuPrintInput extends ReadingPrintInput {
  /** photo 가 AI 초상인지(아니면 찍은 사진 — 얼굴 가운데로 자른다) */
  portrait: boolean
}

type Ctx = CanvasRenderingContext2D

/** 풀이 글꼴 — 본문(BODY) · 제목과 소제목(HEAD) 모두 송명체(옛 인쇄 명조).
 *  2026-11-17 사용자: 「기본 고딕 말고 사주에 어울리는 글꼴」 → 고운바탕 · 송명체 · 나눔명조 · 고운바탕 네 가지를 카드에 얹어 비교, 송명체를 골랐다 */
const TEXT_FONTS: [family: string, url: string, desc?: FontFaceDescriptors][] = [
  ['nh-saju-body', '/fonts/brush/song-myung.woff2', { weight: '400' }],
  ['nh-saju-head', '/fonts/brush/song-myung.woff2', { weight: '400' }],
]
/** HEAD 글꼴의 굵기(한 굵기뿐인 글꼴은 400 — 가짜 굵게를 피한다) */
const HEAD_WEIGHT = 400

/** 저장소 글꼴 — reading-print.ts 와 같은 이름(이미 받았으면 다시 받지 않는다) + 붓글씨 제목 */
const FONTS: [family: string, url: string, desc?: FontFaceDescriptors][] = [
  ['nh-serif', '/fonts/cormorant-garamond/CormorantGaramond-latin.woff2', { weight: '300 700' }],
  ['nh-hanja', '/fonts/hanja/wenkai-tc-700.woff2'],
  ['nh-brush', '/fonts/brush/east-sea-dokdo.woff2'],
  ...TEXT_FONTS,
]
const SERIF = "'nh-serif', 'Times New Roman', serif"
const HANJA = "'nh-hanja', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif"
const BRUSH = "'nh-brush', 'nh-hanja', 'Noto Serif KR', serif"
const BODY = "'nh-saju-body', 'AppleMyungjo', 'Batang', serif"
const HEAD = "'nh-saju-head', 'nh-saju-body', 'AppleMyungjo', 'Batang', serif"
const head = (size: number) => `${HEAD_WEIGHT} ${size}px ${HEAD}`
let fontsReady: Promise<void> | null = null
const logoCache = new Map<string, HTMLImageElement | null>()

export function loadSajuPrintAssets(programId: string): Promise<void> {
  fontsReady ??= Promise.all(FONTS.map(async ([family, url, desc]) => {
    if ([...document.fonts].some((f) => f.family.replace(/['"]/g, '') === family && f.status === 'loaded')) return
    try { const face = new FontFace(family, `url(${url})`, desc); await face.load(); document.fonts.add(face) } catch { /* 기본 글꼴 */ }
  })).then(() => Promise.all([`400 40px ${BODY}`, `700 40px ${BODY}`, head(40)].map((s) => document.fonts.load(s, '가A').catch(() => undefined)))).then(() => undefined)
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

// ───────── 원국 → 칸 ─────────

const ELEMENT_ORDER: Element[] = ['목', '화', '토', '금', '수']
/** 오행 칸 색 — 만세력 관례(인화지에서 또렷하게 조금 진하게) */
const CELL: Record<Element, { bg: string; ink: string; edge?: string }> = {
  목: { bg: '#2f8a4c', ink: '#ffffff' },
  화: { bg: '#cf3a2b', ink: '#ffffff' },
  토: { bg: '#e2b11a', ink: '#1a1a1a' },
  금: { bg: '#f1f0ec', ink: '#1a1a1a', edge: '#b9b7af' },
  수: { bg: '#1b2030', ink: '#ffffff', edge: '#5b6380' },
}

interface Glyph { hanja: string; element: Element; sipseong: string }
interface Column { label: string; gan: Glyph | null; ji: Glyph | null }

/** 서버가 준 원국 한자(「癸丑」)에서 칸 · 십성을 만든다. 일간 칸은 「나」 */
function columns(input: ReadingPrintInput): { cols: Column[]; count: Record<Element, number>; dayGan: Gan } | null {
  const saju = input.saju
  if (!saju) return null
  const dayGan = saju.dayMaster.gan
  const count: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const cols = saju.pillars.map((p): Column => {
    if (!p.hanja) return { label: p.label, gan: null, ji: null }
    const gi = GAN_HANJA.indexOf(p.hanja[0]), ji = JI_HANJA.indexOf(p.hanja[1])
    if (gi < 0 || ji < 0) return { label: p.label, gan: null, ji: null }
    const gEl = GAN_ELEMENT[gi], jEl = JI_ELEMENT[ji]
    count[gEl]++; count[jEl]++
    return {
      label: p.label,
      gan: { hanja: GAN_HANJA[gi], element: gEl, sipseong: p.label === '일주' ? '나' : sipseongOf(dayGan, GAN[gi]) },
      ji: { hanja: JI_HANJA[ji], element: jEl, sipseong: sipseongOf(dayGan, principalStemOf(JI[ji])) },
    }
  })
  return { cols, count, dayGan }
}

// ───────── 색 ─────────

interface Theme {
  name: string
  paper: string; ink: string; body: string; mute: string; line: string; accent: string
  /** 왼쪽 면 세로 제목 띠 */
  band: string; bandInk: string; bandEdge: string
  seal: { bg: string; ink: string }
  /** 종이 결(밝은 면만) */
  grain: boolean
}

const NIGHT: Theme = {
  name: 'night', paper: '#0e0e10', ink: '#f6efdd', body: '#e4dfd2', mute: '#a29e95', line: '#34333a', accent: '#e8c35a',
  band: 'rgba(10,10,12,0.84)', bandInk: '#f5e3b0', bandEdge: '#e8c35a', seal: { bg: '#b3261e', ink: '#fff4dc' }, grain: false,
}
const HANJI: Theme = {
  name: 'hanji', paper: '#f4efe3', ink: '#1b1a17', body: '#3d3a33', mute: '#857e70', line: '#d6cdb9', accent: '#a3241b',
  band: 'rgba(244,239,227,0.9)', bandInk: '#1b1a17', bandEdge: '#a3241b', seal: { bg: '#a3241b', ink: '#fff6e6' }, grain: true,
}

// ───────── 왼쪽 면 ─────────

/** 사진을 칸에 꽉 차게 — 초상은 가운데 위쪽, 찍은 사진은 얼굴을 위 40% 쯤에 */
function cover(ctx: Ctx, pic: ReadingPrintInput['photo'], focus: ReadingPrintInput['focus'], x: number, y: number, w: number, h: number) {
  const iw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const ih = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale, sh = h / scale
  const fx = (focus?.x ?? 0.5) * iw, fy = (focus?.y ?? 0.42) * ih
  const sx = Math.max(0, Math.min(iw - sw, fx - sw / 2))
  const sy = Math.max(0, Math.min(ih - sh, fy - sh * 0.42))
  ctx.drawImage(pic, sx, sy, sw, sh, x, y, w, h)
}

function leftFace(ctx: Ctx, program: ProgramDef, input: SajuPrintInput, t: Theme) {
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, HALF, SAJU_H); ctx.clip()
  ctx.fillStyle = '#10142a'; ctx.fillRect(0, 0, HALF, SAJU_H)
  // 초상은 가운데(지시문이 얼굴을 가운데 위에 둔다), 찍은 사진은 얼굴 기준
  cover(ctx, input.photo, input.portrait ? null : input.focus, 0, 0, HALF, SAJU_H)
  // 위 · 아래 살짝 어둡게(글씨가 얹히는 자리)
  const top = ctx.createLinearGradient(0, 0, 0, 220)
  top.addColorStop(0, 'rgba(8,10,24,0.55)'); top.addColorStop(1, 'rgba(8,10,24,0)')
  ctx.fillStyle = top; ctx.fillRect(0, 0, HALF, 220)

  // 왼쪽 위 — 워드마크 · 해
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'; ctx.font = `600 40px ${SERIF}`; ctx.fillText(program.wordmark, 48, 84)
  ctx.font = `400 22px ${BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('2027 정미년 사주 이야기', 50, 120)

  // 오른쪽 가장자리 — 세로 큰 제목 띠(키워드)
  const title = input.story.keyword.replace(/\s+/g, '')
  const chars = [...title].slice(0, 9)
  const size = chars.length <= 5 ? 92 : chars.length <= 7 ? 80 : 68
  const bandW = size + 52, bandX = HALF - bandW - 36, bandY = 60
  const bandH = Math.min(SAJU_H - 260, chars.length * size * 1.02 + 70)
  ctx.fillStyle = t.band; ctx.fillRect(bandX, bandY, bandW, bandH)
  ctx.strokeStyle = t.bandEdge; ctx.lineWidth = 3; ctx.strokeRect(bandX + 8, bandY + 8, bandW - 16, bandH - 16)
  ctx.fillStyle = t.bandInk; ctx.textAlign = 'center'; ctx.font = `${size}px ${BRUSH}`
  chars.forEach((ch, i) => ctx.fillText(ch, bandX + bandW / 2, bandY + 35 + size * 0.86 + i * size * 1.02))

  // 띠 아래 — 丁未 도장
  const s = 92, sx = bandX + (bandW - s) / 2, sy = bandY + bandH + 22
  ctx.fillStyle = t.seal.bg; ctx.fillRect(sx, sy, s, s)
  ctx.strokeStyle = t.seal.ink; ctx.lineWidth = 2; ctx.strokeRect(sx + 6, sy + 6, s - 12, s - 12)
  ctx.fillStyle = t.seal.ink; ctx.font = `34px ${HANJA}`
  ctx.fillText('丁', sx + s / 2, sy + 42); ctx.fillText('未', sx + s / 2, sy + 80)
  ctx.restore()
}

// ───────── 오른쪽 면 ─────────

function rightFace(ctx: Ctx, program: ProgramDef, input: SajuPrintInput, t: Theme) {
  const x0 = HALF, pad = 64, x = x0 + pad, w = HALF - pad * 2
  ctx.fillStyle = t.paper; ctx.fillRect(x0, 0, HALF, SAJU_H)
  if (t.grain) for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(90,80,60,${Math.random() * 0.04})`; ctx.fillRect(x0 + Math.random() * HALF, Math.random() * SAJU_H, 2, 2) }
  // 접는 자리 표시(위 · 아래 짧은 눈금)
  ctx.fillStyle = t.line; ctx.fillRect(x0, 0, 2, 26); ctx.fillRect(x0, SAJU_H - 26, 2, 26)

  const saju = input.saju, s = input.story
  const data = columns(input)
  let y = 58

  // 머리 — 2027 丁未年 · 오른쪽 띠 · 일간
  ctx.textAlign = 'left'; ctx.fillStyle = t.ink
  ctx.font = `400 36px ${SERIF}`; ctx.fillText('2027', x, y + 30)
  const yw = ctx.measureText('2027 ').width
  ctx.font = `30px ${HANJA}`; ctx.fillText('丁未年', x + yw, y + 29)
  if (saju) {
    ctx.textAlign = 'right'; ctx.font = `500 22px ${BODY}`; ctx.fillStyle = t.mute
    ctx.fillText(`${saju.zodiac}띠 · ${saju.dayMaster.gan}(${saju.dayMaster.hanja}) 일간${saju.solarLabel ? ` · ${saju.solarLabel}` : ''}`, x + w, y + 28)
  }
  y += 50
  ctx.fillStyle = t.accent; ctx.fillRect(x, y, w, 2)
  y += 26

  // 원국 — 네 칸(시 · 일 · 월 · 년), 위 천간 십성 · 아래 지지 십성
  if (data) {
    const gap = 14, cw = (w - gap * 3) / 4, cell = Math.min(cw, 100)
    data.cols.forEach((col, i) => {
      const cx = x + i * (cw + gap) + cw / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = t.mute; ctx.font = `500 19px ${BODY}`; ctx.fillText(col.label, cx, y + 20)
      ctx.fillStyle = t.ink; ctx.font = head(24); ctx.fillText(col.gan?.sipseong ?? '', cx, y + 48)
      const g = [col.gan, col.ji]
      g.forEach((glyph, k) => {
        const cy = y + 62 + k * (cell + 10), left = cx - cell / 2
        if (!glyph) {
          ctx.strokeStyle = t.line; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(left + 1, cy + 1, cell - 2, cell - 2); ctx.setLineDash([])
          ctx.fillStyle = t.mute; ctx.font = `400 22px ${BODY}`; ctx.fillText('모름', cx, cy + cell / 2 + 8)
          return
        }
        const c = CELL[glyph.element]
        ctx.fillStyle = c.bg; roundRect(ctx, left, cy, cell, cell, 10); ctx.fill()
        if (c.edge) { ctx.strokeStyle = c.edge; ctx.lineWidth = 2; roundRect(ctx, left + 1, cy + 1, cell - 2, cell - 2, 9); ctx.stroke() }
        ctx.fillStyle = c.ink; ctx.font = `${Math.round(cell * 0.62)}px ${HANJA}`; ctx.fillText(glyph.hanja, cx, cy + cell * 0.73)
      })
      ctx.fillStyle = t.ink; ctx.font = head(24); ctx.fillText(col.ji?.sipseong ?? '', cx, y + 62 + cell * 2 + 10 + 32)
    })
    y += 62 + cell * 2 + 10 + 50

    // 오행 개수 — 다섯 칸(색 점 + 한자 + 숫자)
    const unit = w / 5
    ELEMENT_ORDER.forEach((el, i) => {
      const cx = x + i * unit
      const c = CELL[el]
      ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(cx + 14, y + 14, 13, 0, Math.PI * 2); ctx.fill()
      if (c.edge) { ctx.strokeStyle = c.edge; ctx.lineWidth = 2; ctx.stroke() }
      ctx.textAlign = 'left'; ctx.fillStyle = t.ink; ctx.font = `26px ${HANJA}`; ctx.fillText(ELEMENT_HANJA[el], cx + 36, y + 24)
      ctx.font = head(28); ctx.fillStyle = data.count[el] ? t.ink : t.mute; ctx.fillText(String(data.count[el]), cx + 72, y + 24)
    })
    y += 50
  }

  // 아래부터 — 안내 · 브랜드
  const brand = eventBrandFor(program.id)
  const logo = brand?.printLogo ? logoCache.get(brand.printLogo) : null
  ctx.font = `400 18px ${BODY}`
  const notice = wrap(ctx, READING_NOTICE, w)
  const footH = 18 + notice.length * 26 + (brand?.line ? 30 : 0) + (logo ? 60 : 0)
  const bottom = SAJU_H - 44 - footH

  // 제목 + 단락 셋 + 행운 + 덕담 — 자리에 맞게 본문 크기를 줄인다
  const heads = [
    `타고난 기운 · ${saju ? `${saju.dayMaster.hanja}${ELEMENT_HANJA[saju.dayMaster.element]}` : ''}`,
    `2027 정미년${saju ? ` · ${saju.sipseong}` : ''}`,
    `채우면 좋은 기운${saju ? ` · ${ELEMENT_HANJA[saju.yongsin]}` : ''}`,
  ]
  const block = (size: number, draw: boolean, top: number): number => {
    let cy = top
    ctx.textAlign = 'left'
    ctx.font = head(size + 12)
    const tl = wrap(ctx, s.title, w)
    if (draw) { ctx.fillStyle = t.ink; tl.forEach((l, i) => ctx.fillText(l, x, cy + (size + 20) * (i + 0.82))) }
    cy += tl.length * (size + 20) + 14
    s.lines.slice(0, 3).forEach((line, i) => {
      if (draw) { ctx.fillStyle = t.accent; ctx.font = head(size - 1); ctx.fillText(heads[i] ?? '', x, cy + size * 0.9) }
      cy += size + 8
      ctx.font = `400 ${size}px ${BODY}`
      const ls = wrap(ctx, line, w)
      if (draw) { ctx.fillStyle = t.body; ls.forEach((l, j) => ctx.fillText(l, x, cy + size * 1.42 * (j + 0.74))) }
      cy += ls.length * size * 1.42 + 12
    })
    cy += 4
    // 행운 — 두 칸
    const half = (w - 24) / 2
    if (draw) {
      ;[['행운의 색', s.lucky.color], ['행운의 물건', s.lucky.item]].forEach(([label, value], i) => {
        const lx = x + i * (half + 24)
        ctx.fillStyle = t.accent; ctx.fillRect(lx, cy, half, 2)
        ctx.fillStyle = t.mute; ctx.font = `500 ${size - 6}px ${BODY}`; ctx.fillText(label, lx, cy + size + 6)
        ctx.fillStyle = t.ink; ctx.font = head(size + 2); ctx.fillText(value, lx, cy + size * 2 + 14)
      })
    }
    cy += size * 2 + 34
    ctx.font = `400 ${size}px ${BODY}`
    const wl = wrap(ctx, `“${s.wish}”`, w)
    if (draw) { ctx.fillStyle = t.ink; wl.forEach((l, i) => ctx.fillText(l, x, cy + size * 1.45 * (i + 0.75))) }
    cy += wl.length * size * 1.45
    return cy - top
  }
  let size = 31
  while (size > 24 && y + 16 + block(size, false, 0) > bottom) size--
  block(size, true, y + 16)

  // 바닥
  let fy = SAJU_H - 44 - footH
  ctx.fillStyle = t.line; ctx.fillRect(x, fy, w, 1)
  fy += 18
  ctx.textAlign = 'left'
  if (logo) { const lh = 48, lw = Math.min(300, (logo.naturalWidth / logo.naturalHeight) * lh); ctx.drawImage(logo, x, fy, lw, lh); fy += lh + 12 }
  if (brand?.line) { ctx.fillStyle = t.ink; ctx.font = head(22); ctx.fillText(brand.line, x, fy + 20); fy += 30 }
  ctx.fillStyle = t.mute; ctx.font = `400 18px ${BODY}`
  notice.forEach((l, i) => ctx.fillText(l, x, fy + 18 + i * 26))
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** design 0 = 밤하늘, 1 = 한지 */
export function renderSajuPrint(program: ProgramDef, design: 0 | 1, input: SajuPrintInput): string {
  const canvas = document.createElement('canvas')
  canvas.width = SAJU_W
  canvas.height = SAJU_H
  const ctx = canvas.getContext('2d')!
  const t = design === 0 ? NIGHT : HANJI
  leftFace(ctx, program, input, t)
  rightFace(ctx, program, input, t)
  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = canvas.height = 0
  return out
}
