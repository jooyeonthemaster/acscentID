// 프로그램 인화 디자인(4×6, 1200×1800) — 프로그램마다 2종. 화면 미리보기·폰 저장·인쇄가 모두 이 한 장을 쓴다(같은 결과).
// 인화물에는 QR 을 넣지 않는다 — QR 은 저장 화면에만(폰에 저장한 사진과 인쇄물이 똑같게).
// AC'SCENT 표기는 넣지 않는다. 서비스 워드마크만.

import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { anton, bagel, blackHan, gowun, pen, playfair } from './fonts'

export const PRINT_W = 1200
export const PRINT_H = 1800

export type Pic = HTMLImageElement | HTMLCanvasElement
const size = (p: Pic) => (p instanceof HTMLImageElement ? { w: p.naturalWidth, h: p.naturalHeight } : { w: p.width, h: p.height })

export interface PrintInput {
  /** 생성 결과 */
  result: Pic
  /** 찍은 사진(첫 장) */
  original: Pic
  choices: Record<string, string>
  /** 고른 옵션 이름(그룹 id → 이름) */
  labels: Record<string, string>
  /** AI 코멘트 한 줄(주거복지대전 3종·과거로의 여행 — 2026-10-26 제안서 '코멘트 및 사진 인쇄') */
  comment?: string
}

type Ctx = CanvasRenderingContext2D

export function cover(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number, focusY = 0.35) {
  const { w: sw, h: sh } = size(pic)
  const scale = Math.max(w / sw, h / sh)
  const cw = w / scale, ch = h / scale
  const cx = (sw - cw) / 2
  const cy = Math.max(0, Math.min(sh - ch, (sh - ch) * focusY))
  ctx.drawImage(pic, cx, cy, cw, ch, x, y, w, h)
}

export function text(ctx: Ctx, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center', extra?: (c: Ctx) => void) {
  ctx.save()
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  extra?.(ctx)
  ctx.fillText(value, x, y)
  ctx.restore()
}

/** 폭에 맞춰 글자 크기를 줄인다 */
export function fitText(ctx: Ctx, value: string, x: number, y: number, maxW: number, px: number, family: string, color: string, weight = '', align: CanvasTextAlign = 'center', extra?: (c: Ctx) => void) {
  let s = px
  ctx.save()
  for (; s > 20; s -= 4) { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(value).width <= maxW) break }
  ctx.restore()
  text(ctx, value, x, y, `${weight} ${s}px ${family}`, color, align, extra)
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, radius = 0) {
  ctx.save()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fill()
  ctx.restore()
}

function stroke(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, width: number, radius = 0) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.stroke()
  ctx.restore()
}

export function photoClip(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number, radius: number, focusY = 0.35) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
  cover(ctx, pic, x, y, w, h, focusY)
  ctx.restore()
}

export function shadow(ctx: Ctx, blur = 30, color = 'rgba(0,0,0,0.25)') {
  ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur / 3
}

function paper(ctx: Ctx, base: string, speck: string, count = 1400) {
  rect(ctx, 0, 0, PRINT_W, PRINT_H, base)
  ctx.save()
  ctx.fillStyle = speck
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < count; i++) ctx.fillRect(rnd() * PRINT_W, rnd() * PRINT_H, 1 + rnd() * 2, 1 + rnd() * 2)
  ctx.restore()
}

export function star(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
  ctx.save()
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  ctx.closePath(); ctx.fill(); ctx.restore()
}

function heart(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
  ctx.save()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(cx, cy + r * 0.9)
  ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.6, cy - r * 1.3, cx, cy - r * 0.4)
  ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9)
  ctx.fill(); ctx.restore()
}

function crown(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
  ctx.save()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(cx - r, cy + r * 0.6)
  ctx.lineTo(cx - r, cy - r * 0.4); ctx.lineTo(cx - r * 0.5, cy + r * 0.05)
  ctx.lineTo(cx, cy - r * 0.8); ctx.lineTo(cx + r * 0.5, cy + r * 0.05)
  ctx.lineTo(cx + r, cy - r * 0.4); ctx.lineTo(cx + r, cy + r * 0.6)
  ctx.closePath(); ctx.fill(); ctx.restore()
}

function seal(ctx: Ctx, cx: number, cy: number, s: number, glyph: string) {
  rect(ctx, cx - s / 2, cy - s / 2, s, s, '#b8352a', 8)
  text(ctx, glyph, cx, cy + s * 0.28, `700 ${s * 0.7}px ${gowun.style.fontFamily}`, '#fbeee0')
}

// ── 인화 디자인에 쓰는 그림 파일 — 생성을 기다리는 동안 받아 둔다(loadPrintArt). 못 받으면 글자로 대신 그린다 ──

/** DRAW! 캐리커처 워드마크 — 키오스크 DRAW! 와 같은 그림 */
const DRAW_MARK = '/assets/kiosk-experiences/draw-wordmark.webp'
const PRINT_ART: Partial<Record<string, string[]>> = { caricature: [DRAW_MARK] }
const artCache = new Map<string, HTMLImageElement>()
/** DRAW! 손글씨 — 한글까지 든 나눔손글씨 펜 원본(next/font 의 pen 은 라틴 글자만 받아 한글이 기본 글꼴로 나왔다). 키오스크 명함 디자이너와 같은 파일 */
const DRAW_HAND = 'pg-draw-hand'
const PRINT_FONTS: Partial<Record<string, [family: string, url: string][]>> = { caricature: [[DRAW_HAND, '/fonts/ui/nanum-pen/400.woff2']] }
const fontsAdded = new Set<string>()

export async function loadPrintArt(program: ProgramDef): Promise<void> {
  const fonts = (PRINT_FONTS[program.id] ?? []).map(async ([family, url]) => {
    if (fontsAdded.has(family)) return
    try {
      const face = new FontFace(family, `url(${url})`)
      await face.load()
      document.fonts.add(face)
      fontsAdded.add(family)
    } catch {
      // next/font 손글씨(라틴) → 기본 글꼴로 그린다
    }
  })
  const images = (PRINT_ART[program.id] ?? []).map(async (src) => {
    if (artCache.has(src)) return
    try {
      const image = new Image()
      image.src = src
      await image.decode()
      artCache.set(src, image)
    } catch {
      // 글자 워드마크로 대신 그린다
    }
  })
  await Promise.all([...fonts, ...images])
}

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type Design = (ctx: Ctx, input: PrintInput) => void

export const A = () => anton.style.fontFamily
export const P = () => playfair.style.fontFamily
const B = () => bagel.style.fontFamily
const H = () => blackHan.style.fontFamily
export const G = () => gowun.style.fontFamily
const S = () => pen.style.fontFamily
/** DRAW! 손글씨(한글 포함) — 못 받았으면 next/font 손글씨 */
const HAND = () => `'${DRAW_HAND}', ${S()}`

/** DRAW! 캐리커처 — 키오스크 DRAW!(draw.css · DrawMode 포스터)와 같은 색 */
const DRAW = { yellow: '#fef0aa', coral: '#f0563c', star: '#f6c531', ink: '#1f1d1b', paper: '#fffaf0' }

const DESIGNS: Record<string, [Design, Design]> = {
  // ───── 펀그라운드 별내 A안 새 프로그램(2026-11-14) — 인화물에 펀그라운드 로고 자리(임시 글자 FUN GROUND 별내) ─────
  quest: [
    // 모험 포스터 — 사진을 꽉 채우고 위에 금빛 제목, 아래 세계관 띠
    (ctx, { result, labels }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const top = ctx.createLinearGradient(0, 0, 0, 460)
      top.addColorStop(0, 'rgba(20,10,45,0.85)'); top.addColorStop(1, 'rgba(20,10,45,0)')
      ctx.fillStyle = top; ctx.fillRect(0, 0, PRINT_W, 460)
      const gold = ctx.createLinearGradient(0, 80, 0, 260)
      gold.addColorStop(0, '#fff2c2'); gold.addColorStop(1, '#e0a93a')
      fitText(ctx, 'QUEST!', PRINT_W / 2, 250, 1000, 230, B(), gold as unknown as string, '', 'center', (c) => { c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24 })
      text(ctx, 'Your quest begins', PRINT_W / 2, 330, `60px ${S()}`, '#fff2c2')
      const bottom = ctx.createLinearGradient(0, PRINT_H - 380, 0, PRINT_H)
      bottom.addColorStop(0, 'rgba(20,10,45,0)'); bottom.addColorStop(1, 'rgba(20,10,45,0.9)')
      ctx.fillStyle = bottom; ctx.fillRect(0, PRINT_H - 380, PRINT_W, 380)
      text(ctx, `${labels.world ?? ''}의 모험가`, PRINT_W / 2, PRINT_H - 150, `700 64px ${G()}`, '#ffffff')
      text(ctx, `FUN GROUND 별내 · ${today()}`, PRINT_W / 2, PRINT_H - 70, `32px ${A()}`, '#e0a93a', 'center', (c) => { c.letterSpacing = '6px' })
    },
    // 모험가 카드 — 양피지 바탕에 금테 카드, 별 장식
    (ctx, { result, labels }) => {
      paper(ctx, '#ecdcb8', 'rgba(110,70,20,0.09)', 2000)
      ctx.save(); shadow(ctx, 36, 'rgba(60,30,0,0.35)')
      rect(ctx, 110, 130, 980, 1420, '#2a1b4d', 36); ctx.restore()
      stroke(ctx, 130, 150, 940, 1380, '#e0a93a', 6, 28)
      photoClip(ctx, result, 170, 190, 860, 1120, 18, 0.25)
      text(ctx, 'ADVENTURER CARD', PRINT_W / 2, 1390, `40px ${A()}`, '#e0a93a', 'center', (c) => { c.letterSpacing = '10px' })
      text(ctx, `${labels.world ?? ''} · ${labels.cape ?? ''} 망토`, PRINT_W / 2, 1470, `700 46px ${G()}`, '#fff2c2')
      for (const [x, y, r] of [[160, 120, 34], [1040, 120, 28], [150, 1560, 26], [1050, 1570, 36]] as const) star(ctx, x, y, r, '#e0a93a')
      text(ctx, 'QUEST!', PRINT_W / 2, 1680, `110px ${B()}`, '#2a1b4d')
      text(ctx, `FUN GROUND 별내 · ${today()}`, PRINT_W / 2, 1745, `28px ${A()}`, '#6b4a2b', 'center', (c) => { c.letterSpacing = '6px' })
    },
  ],
  mvp: [
    // 우승 포스터 — 사진 위에 굵은 MVP!, 아래 종목 · 날짜 띠
    (ctx, { result, labels }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const top = ctx.createLinearGradient(0, 0, 0, 420)
      top.addColorStop(0, 'rgba(10,15,30,0.8)'); top.addColorStop(1, 'rgba(10,15,30,0)')
      ctx.fillStyle = top; ctx.fillRect(0, 0, PRINT_W, 420)
      text(ctx, 'MVP!', 70, 250, `250px ${A()}`, '#ffd23f', 'left', (c) => { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 20 })
      text(ctx, 'CHAMPION OF THE DAY', 80, 320, `40px ${A()}`, '#ffffff', 'left', (c) => { c.letterSpacing = '8px' })
      ctx.save(); ctx.translate(0, PRINT_H - 230); ctx.rotate(-0.03)
      rect(ctx, -40, 0, PRINT_W + 80, 150, '#d9681f')
      text(ctx, `${labels.sport ?? ''} 우승 · ${today()}`, PRINT_W / 2, 100, `900 64px ${H()}`, '#ffffff')
      ctx.restore()
      text(ctx, 'FUN GROUND 별내', PRINT_W / 2, PRINT_H - 30, `30px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '8px' })
    },
    // 선수 카드 — 트레이딩 카드 모양(글자 · 번호 대신 별 다섯)
    (ctx, { result, labels }) => {
      const bg = ctx.createLinearGradient(0, 0, PRINT_W, PRINT_H)
      bg.addColorStop(0, '#13213f'); bg.addColorStop(1, '#2c4a8a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      ctx.save(); shadow(ctx, 40, 'rgba(0,0,0,0.45)')
      rect(ctx, 120, 120, 960, 1480, '#ffd23f', 40); ctx.restore()
      photoClip(ctx, result, 150, 150, 900, 1200, 26, 0.25)
      rect(ctx, 150, 1370, 900, 200, '#13213f', 24)
      text(ctx, 'MVP!', 200, 1490, `120px ${A()}`, '#ffd23f', 'left')
      text(ctx, labels.sport ?? '', 1000, 1450, `900 60px ${H()}`, '#ffffff', 'right')
      for (let i = 0; i < 5; i++) star(ctx, 760 + i * 58, 1520, 22, '#ffd23f')
      text(ctx, `FUN GROUND 별내 · ${today()}`, PRINT_W / 2, 1700, `30px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '8px' })
    },
  ],
  runway: [
    (ctx, { result, labels }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.2)
      const g = ctx.createLinearGradient(0, 0, 0, 520)
      g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, PRINT_W, 520)
      fitText(ctx, 'MY RUNWAY', PRINT_W / 2, 230, 1080, 220, P(), '#ffffff', '900')
      const b = ctx.createLinearGradient(0, PRINT_H - 360, 0, PRINT_H)
      b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(1, 'rgba(0,0,0,0.8)')
      ctx.fillStyle = b; ctx.fillRect(0, PRINT_H - 360, PRINT_W, 360)
      text(ctx, `${labels.look ?? ''} LOOK`.toUpperCase(), PRINT_W / 2, PRINT_H - 120, `52px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '12px' })
      text(ctx, today(), PRINT_W / 2, PRINT_H - 60, `28px ${A()}`, '#e8336d', 'center', (c) => { c.letterSpacing = '8px' })
    },
    (ctx, { result }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#0b0b0d')
      photoClip(ctx, result, 70, 220, 1060, 1380, 0, 0.2)
      stroke(ctx, 50, 200, 1100, 1420, '#e8336d', 6)
      text(ctx, 'WALK!', 70, 170, `150px ${A()}`, '#e8336d', 'left')
      text(ctx, 'My Runway', PRINT_W - 70, 160, `86px ${S()}`, '#ffffff', 'right')
      text(ctx, `FASHION WEEK · ${today()}`, PRINT_W / 2, PRINT_H - 100, `40px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '10px' })
    },
  ],
  'fashion-time': [
    (ctx, { result, labels }) => {
      paper(ctx, '#efe4cf', 'rgba(120,80,40,0.08)')
      ctx.save(); ctx.translate(PRINT_W / 2, 820); ctx.rotate(-0.025); shadow(ctx, 40)
      rect(ctx, -500, -680, 1000, 1280, '#fbf7ee'); ctx.restore()
      ctx.save(); ctx.translate(PRINT_W / 2, 820); ctx.rotate(-0.025)
      photoClip(ctx, result, -450, -630, 900, 1000, 0, 0.25)
      text(ctx, labels.era ?? '', -420, 520, `italic 900 110px ${P()}`, '#3b2414', 'left')
      text(ctx, 'Same me, Different time', 420, 520, `56px ${S()}`, '#6b4a2b', 'right')
      ctx.restore()
      rect(ctx, 420, 120, 360, 70, 'rgba(180,160,120,0.55)')
      text(ctx, 'ERA!', PRINT_W / 2, 1650, `900 110px ${P()}`, '#3b2414')
      text(ctx, 'FASHION TRAVELS THROUGH TIME', PRINT_W / 2, 1720, `26px ${A()}`, '#1e4fbf', 'center', (c) => { c.letterSpacing = '8px' })
    },
    (ctx, { result, labels }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(240,220,190,0.35)'; ctx.fillRect(0, 0, PRINT_W, PRINT_H); ctx.restore()
      text(ctx, 'ERA!', 60, 250, `900 260px ${P()}`, '#fbf3e4', 'left', (c) => { shadow(c, 20, 'rgba(0,0,0,0.35)') })
      rect(ctx, 60, 300, 520, 8, '#1e4fbf')
      text(ctx, `${labels.era ?? ''} ISSUE`, 60, 380, `52px ${A()}`, '#fbf3e4', 'left', (c) => { c.letterSpacing = '6px'; shadow(c, 12, 'rgba(0,0,0,0.4)') })
      text(ctx, '시대를 바꾸면, 새로운 내가 보여요', PRINT_W - 60, PRINT_H - 80, `700 44px ${G()}`, '#fbf3e4', 'right', (c) => { shadow(c, 12, 'rgba(0,0,0,0.5)') })
    },
  ],
  'idol-makeup': [
    (ctx, { result }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const g = ctx.createLinearGradient(0, PRINT_H - 600, 0, PRINT_H)
      g.addColorStop(0, 'rgba(40,10,50,0)'); g.addColorStop(1, 'rgba(40,10,50,0.85)')
      ctx.fillStyle = g; ctx.fillRect(0, PRINT_H - 600, PRINT_W, 600)
      const pink = ctx.createLinearGradient(0, PRINT_H - 400, 0, PRINT_H - 160)
      pink.addColorStop(0, '#ffd1ef'); pink.addColorStop(1, '#ff5fb8')
      fitText(ctx, 'MY STAGE', PRINT_W / 2, PRINT_H - 190, 1100, 250, H(), pink as unknown as string, '', 'center', (c) => { c.shadowColor = 'rgba(255,95,184,0.8)'; c.shadowBlur = 30 })
      text(ctx, '지금, 가장 빛나는 나', PRINT_W / 2, PRINT_H - 90, `700 46px ${G()}`, '#ffffff')
    },
    (ctx, { result }) => {
      const bg = ctx.createLinearGradient(0, 0, PRINT_W, PRINT_H)
      bg.addColorStop(0, '#2a0f3a'); bg.addColorStop(1, '#5a1f6e')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      for (let i = 0; i < 60; i++) star(ctx, (i * 197) % PRINT_W, (i * 311) % PRINT_H, 4 + (i % 5) * 2, 'rgba(255,200,240,0.5)')
      ctx.save(); shadow(ctx, 40, 'rgba(255,95,184,0.5)')
      rect(ctx, 150, 170, 900, 1350, '#ffffff', 40); ctx.restore()
      photoClip(ctx, result, 180, 200, 840, 1290, 26, 0.25)
      text(ctx, 'IDOL!', PRINT_W / 2, 1660, `130px ${H()}`, '#ff8fd0')
      text(ctx, today(), PRINT_W / 2, 1730, `30px ${A()}`, '#f7d6ff', 'center', (c) => { c.letterSpacing = '8px' })
    },
  ],
  'fan-card': [
    (ctx, input) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#eef1ff')
      fanCard(ctx, input, 60, 120, 520, 800, -0.04)
      fanCard(ctx, input, 620, 120, 520, 800, 0.03)
      fanCard(ctx, input, 60, 960, 520, 800, 0.02)
      fanCard(ctx, input, 620, 960, 520, 800, -0.03)
    },
    (ctx, input) => {
      const bg = ctx.createLinearGradient(0, 0, PRINT_W, PRINT_H)
      bg.addColorStop(0, '#e8ecff'); bg.addColorStop(1, '#f6eaff')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      fanCard(ctx, input, 120, 110, 960, 1460, -0.015)
      text(ctx, 'WITH!', PRINT_W / 2, 1720, `110px ${B()}`, '#3f5bd8')
    },
  ],
  graduation: [
    (ctx, { result, labels }) => {
      paper(ctx, '#f7f3e8', 'rgba(60,90,60,0.05)')
      stroke(ctx, 40, 40, 1120, 1720, '#1f5a3d', 4)
      stroke(ctx, 56, 56, 1088, 1688, '#c9a24a', 2)
      photoClip(ctx, result, 110, 110, 980, 1300, 0, 0.25)
      text(ctx, 'GRAD!', PRINT_W / 2, 1560, `900 150px ${P()}`, '#1f5a3d')
      text(ctx, `CLASS OF ${new Date().getFullYear()} · ${labels.place ?? ''}`, PRINT_W / 2, 1650, `34px ${A()}`, '#c9a24a', 'center', (c) => { c.letterSpacing = '10px' })
      text(ctx, 'Good Things Ahead', PRINT_W / 2, 1720, `54px ${S()}`, '#1f5a3d')
    },
    (ctx, { result }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const g = ctx.createLinearGradient(0, PRINT_H - 480, 0, PRINT_H)
      g.addColorStop(0, 'rgba(247,243,232,0)'); g.addColorStop(0.5, 'rgba(247,243,232,0.9)'); g.addColorStop(1, '#f7f3e8')
      ctx.fillStyle = g; ctx.fillRect(0, PRINT_H - 480, PRINT_W, 480)
      text(ctx, '빛나는 오늘을 졸업 사진으로', PRINT_W / 2, PRINT_H - 190, `700 56px ${G()}`, '#1f5a3d')
      text(ctx, `GRAD! · ${today()}`, PRINT_W / 2, PRINT_H - 100, `40px ${A()}`, '#c9a24a', 'center', (c) => { c.letterSpacing = '10px' })
    },
  ],
  history: [
    (ctx, { result, labels, comment }) => {
      paper(ctx, '#efe2c8', 'rgba(120,70,30,0.09)', 2200)
      ctx.save(); shadow(ctx, 24); rect(ctx, 90, 120, 1020, 1400, '#f7eedb'); ctx.restore()
      photoClip(ctx, result, 120, 150, 960, 1340, 0, 0.25)
      text(ctx, 'TIME!', PRINT_W / 2, 1650, `900 120px ${P()}`, '#b23a2a')
      if (comment) {
        fitText(ctx, comment, PRINT_W / 2, 1712, 900, 40, G(), '#5b3a22', '700')
        text(ctx, `${labels.role ?? ''} · ${labels.scene ?? ''} — 역사에서 영감을 받은 상상화`, PRINT_W / 2, 1765, `600 26px ${G()}`, '#8a6a4a')
      } else text(ctx, `${labels.role ?? ''} · ${labels.scene ?? ''} — 역사에서 영감을 받은 상상화`, PRINT_W / 2, 1720, `700 34px ${G()}`, '#5b3a22')
      seal(ctx, 1040, 1620, 90, '時')
    },
    (ctx, { result, comment }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#3d2a1c')
      rect(ctx, 0, 0, PRINT_W, 90, '#8a5a32'); rect(ctx, 0, PRINT_H - 90, PRINT_W, 90, '#8a5a32')
      paper(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0)
      rect(ctx, 130, 130, 940, 1540, '#f3e6cb')
      photoClip(ctx, result, 170, 230, 860, 1180, 0, 0.25)
      // 코멘트가 있으면 고정 문구 대신 AI 코멘트(손글씨체)
      fitText(ctx, comment ?? '꽃이 피는 역사 속에서도, 나는 있었다', PRINT_W / 2, 1520, 860, 52, S(), '#5b3a22')
      seal(ctx, PRINT_W / 2, 1600, 70, '畵')
    },
  ],
  timecapsule: [
    (ctx, { result, original, labels }) => {
      const bg = ctx.createLinearGradient(0, 0, 0, PRINT_H)
      bg.addColorStop(0, '#ecebff'); bg.addColorStop(1, '#f9f8ff')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      text(ctx, 'LATER!', PRINT_W / 2, 210, `italic 900 170px ${P()}`, '#5b55d6')
      const pol = (pic: Pic, x: number, y: number, rot: number, caption: string) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shadow(ctx, 24, 'rgba(60,50,150,0.25)')
        rect(ctx, -270, -380, 540, 760, '#ffffff'); ctx.restore()
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
        photoClip(ctx, pic, -240, -350, 480, 600, 0, 0.3)
        text(ctx, caption, 0, 330, `56px ${S()}`, '#3c3790')
        ctx.restore()
      }
      pol(original, 330, 760, -0.05, '지금의 나 ♡')
      pol(result, 870, 1020, 0.04, `${labels.years ?? ''}의 나 ♡`)
      text(ctx, '재미로 보는 상상 사진 · 실제 미래 모습과는 다를 수 있어요', PRINT_W / 2, 1640, `700 32px ${G()}`, '#5b55d6')
      text(ctx, today(), PRINT_W / 2, 1710, `30px ${A()}`, '#8f86e8', 'center', (c) => { c.letterSpacing = '8px' })
    },
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f4f2ff')
      ctx.save(); shadow(ctx, 30, 'rgba(60,50,150,0.2)'); rect(ctx, 90, 90, 1020, 1620, '#ffffff', 12); ctx.restore()
      photoClip(ctx, result, 140, 140, 920, 1160, 8, 0.3)
      text(ctx, '언제나, 더 빛날 너에게 ♡', 160, 1430, `64px ${S()}`, '#3c3790', 'left')
      text(ctx, `${labels.years ?? ''} · ${labels.place ?? ''}`, 160, 1510, `700 36px ${G()}`, '#5b55d6', 'left')
      text(ctx, 'LATER!', 1040, 1640, `italic 900 90px ${P()}`, '#5b55d6', 'right')
      text(ctx, '재미로 보는 상상 사진', 160, 1640, `700 28px ${G()}`, '#8f86e8', 'left')
    },
  ],
  'brand-avatar': [
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f3f0ff')
      ctx.save(); shadow(ctx, 30, 'rgba(91,72,224,0.25)'); rect(ctx, 100, 100, 1000, 1600, '#ffffff', 48); ctx.restore()
      photoClip(ctx, result, 140, 140, 920, 1200, 36, 0.3)
      text(ctx, 'AVATAR!', 160, 1500, `150px ${A()}`, '#5b48e0', 'left')
      text(ctx, `${labels.mood ?? ''} · ${labels.format ?? ''}`, 165, 1580, `700 40px ${G()}`, '#2d2470', 'left')
      text(ctx, '오늘, 좋은 하루 되세요!', 1050, 1640, `52px ${S()}`, '#7a6cf0', 'right')
      rect(ctx, 165, 1610, 260, 12, '#c6f04a', 6)
    },
    (ctx, { result, original }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#ffffff')
      rect(ctx, 0, 0, PRINT_W, PRINT_H / 2, '#ece8ff')
      photoClip(ctx, original, 80, 120, 500, 640, 28, 0.3)
      text(ctx, '내 사진에서', 330, 840, `52px ${S()}`, '#5b48e0')
      photoClip(ctx, result, 620, 120, 500, 640, 28, 0.3)
      text(ctx, '나만의 캐릭터로!', 870, 840, `52px ${S()}`, '#5b48e0')
      photoClip(ctx, result, 200, 960, 800, 620, 40, 0.35)
      text(ctx, 'AVATAR!', PRINT_W / 2, 1720, `110px ${A()}`, '#5b48e0')
    },
  ],
  hanbok: [
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f4f1e8')
      stroke(ctx, 40, 40, 1120, 1720, '#2f6b4f', 3)
      stroke(ctx, 54, 54, 1092, 1692, '#2f6b4f', 1)
      photoClip(ctx, result, 100, 100, 1000, 1360, 0, 0.25)
      text(ctx, 'HANBOK!', PRINT_W / 2, 1610, `140px ${A()}`, '#2f6b4f')
      text(ctx, `${labels.hanbok ?? ''} · ${labels.place ?? ''} · ${today()}`, PRINT_W / 2, 1690, `700 34px ${G()}`, '#4f6b5c')
    },
    (ctx, { result }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      text(ctx, 'HANBOK!', 70, 190, `150px ${A()}`, '#ffffff', 'left', (c) => shadow(c, 20, 'rgba(0,0,0,0.35)'))
      text(ctx, '오늘의 나를 한복으로 기억해요', 74, 260, `700 46px ${G()}`, '#ffffff', 'left', (c) => shadow(c, 14, 'rgba(0,0,0,0.45)'))
    },
  ],
  traditional: [
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#5a4632')
      rect(ctx, 60, 0, 1080, PRINT_H, '#c9b48e')
      paper(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0)
      rect(ctx, 120, 90, 960, 1620, '#f4eee2')
      photoClip(ctx, result, 170, 150, 860, 1240, 0, 0.25)
      text(ctx, `${labels.style ?? ''} 초상`, PRINT_W / 2, 1500, `700 64px ${G()}`, '#2b2520')
      text(ctx, '붓결로 남기는 특별한 초상', PRINT_W / 2, 1570, `50px ${S()}`, '#5a4a3a')
      seal(ctx, PRINT_W / 2, 1650, 80, '畵')
    },
    (ctx, { result }) => {
      paper(ctx, '#f4efe4', 'rgba(60,40,20,0.07)', 2000)
      stroke(ctx, 50, 50, 1100, 1700, '#2b2520', 4)
      photoClip(ctx, result, 110, 110, 980, 1420, 0, 0.25)
      text(ctx, 'INK!', 120, 1680, `150px ${H()}`, '#2b2520', 'left')
      text(ctx, today(), 1040, 1660, `700 36px ${G()}`, '#5a4a3a', 'right')
      seal(ctx, 1040, 1590, 80, '印')
    },
  ],
  // 키오스크 DRAW! 의 저장 포스터(노란 바탕 · 종이에 붙인 그림 · 코럴 꼬리표 · 원본 한 장)를 4×6 인화지로.
  // 혼자면 세로 2:3 그림, 여럿이면 가로 3:2 그림 — 그림 모양을 보고 배치를 고른다
  caricature: [
    (ctx, { result, original, labels }) => {
      const wide = isWide(result)
      rect(ctx, 0, 0, PRINT_W, PRINT_H, DRAW.yellow)
      drawMark(ctx, PRINT_W / 2, 48, 520)
      rays(ctx, 250, 150, 70, Math.PI * 1.12)
      rays(ctx, 950, 150, 70, -Math.PI * 0.12)
      star(ctx, 112, wide ? 1180 : 330, 50, DRAW.star)
      heart(ctx, 1094, wide ? 1140 : 300, 34, DRAW.coral)
      const tag = drawTag(labels)
      if (!wide) {
        drawSheet(ctx, result, 150, 276, 900, 1320, -0.02, 30)
        star(ctx, 1110, 1150, 34, DRAW.star)
        smiley(ctx, 92, 1470, 34, DRAW.coral)
        polaroid(ctx, original, 960, 1500, 300, 0.07, '원본')
        drawTagChip(ctx, tag, 360, 1626, -0.045, 44)
        text(ctx, today(), 80, 1752, `30px ${A()}`, DRAW.ink, 'left', (c) => { c.letterSpacing = '8px'; c.globalAlpha = 0.7 })
        fitText(ctx, 'You Look Great!', PRINT_W - 70, 1756, 560, 64, HAND(), DRAW.coral, '', 'right')
        return
      }
      drawSheet(ctx, result, 60, 290, 1080, 740, -0.015, 30)
      polaroid(ctx, original, 850, 1330, 520, 0.06, '원본')
      drawTagChip(ctx, tag, 330, 1196, -0.04, 42)
      fitText(ctx, '오늘도 멋진 우리!', 330, 1360, 520, 100, HAND(), DRAW.ink)
      fitText(ctx, 'You Look Great!', 330, 1462, 520, 76, HAND(), DRAW.coral)
      star(ctx, 170, 1630, 46, DRAW.star)
      smiley(ctx, 600, 1626, 36, DRAW.coral)
      heart(ctx, 1030, 1630, 30, DRAW.coral)
      star(ctx, 1110, 1580, 26, DRAW.star)
      text(ctx, today(), PRINT_W / 2, 1752, `32px ${A()}`, DRAW.ink, 'center', (c) => { c.letterSpacing = '10px'; c.globalAlpha = 0.7 })
    },
    (ctx, { result, original, labels }) => {
      // 스케치북 한 장 — 위 스프링, 종이에 붙인 그림(마스킹 테이프), 아래 손글씨
      const wide = isWide(result)
      paper(ctx, DRAW.paper, 'rgba(120,100,40,0.06)', 1600)
      spiral(ctx)
      const tag = drawTag(labels)
      if (!wide) {
        sketchFrame(ctx, result, 150, 176, 900, 1350)
        tape(ctx, 196, 196, -0.5, DRAW.coral)
        tape(ctx, 1004, 196, 0.5, DRAW.star)
        fitText(ctx, 'Smile, you’re drawn!', 150, 1652, 600, 92, HAND(), DRAW.coral, '', 'left')
        text(ctx, tag, 154, 1728, `800 36px Pretendard`, DRAW.ink, 'left')
        drawMark(ctx, 930, 1560, 300)
        text(ctx, today(), 930, 1740, `28px ${A()}`, DRAW.ink, 'center', (c) => { c.letterSpacing = '8px'; c.globalAlpha = 0.7 })
        star(ctx, 1108, 1300, 28, DRAW.star)
        heart(ctx, 96, 1240, 26, DRAW.coral)
        return
      }
      sketchFrame(ctx, result, 80, 186, 1040, 693)
      tape(ctx, 126, 206, -0.5, DRAW.coral)
      tape(ctx, 1074, 206, 0.5, DRAW.star)
      taped(ctx, original, 330, 1150, 480, -0.04)
      text(ctx, '원본 ♡', 330, 1388, `60px ${HAND()}`, DRAW.ink)
      drawMark(ctx, 870, 990, 400)
      text(ctx, tag, 870, 1218, `800 38px Pretendard`, DRAW.ink)
      fitText(ctx, 'Smile, you’re drawn!', 870, 1316, 560, 76, HAND(), DRAW.coral)
      fitText(ctx, '오늘도 멋진 우리!', PRINT_W / 2, 1580, 900, 130, HAND(), DRAW.ink)
      star(ctx, 150, 1540, 40, DRAW.star)
      heart(ctx, 1060, 1530, 30, DRAW.coral)
      smiley(ctx, 1090, 1360, 30, DRAW.coral)
      text(ctx, today(), PRINT_W / 2, 1730, `30px ${A()}`, DRAW.ink, 'center', (c) => { c.letterSpacing = '10px'; c.globalAlpha = 0.7 })
    },
  ],
  wedding: [
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#faf5ef')
      stroke(ctx, 50, 50, 1100, 1700, '#c9a882', 3)
      photoClip(ctx, result, 110, 110, 980, 1340, 0, 0.25)
      text(ctx, 'VOW!', PRINT_W / 2, 1600, `900 140px ${P()}`, '#7a5240')
      text(ctx, `OUR SPECIAL DAY · ${labels.place ?? ''} · ${today()}`, PRINT_W / 2, 1680, `30px ${A()}`, '#b08d6c', 'center', (c) => { c.letterSpacing = '8px' })
    },
    (ctx, { result }) => {
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      rect(ctx, 160, PRINT_H - 420, 880, 300, 'rgba(250,245,239,0.92)', 12)
      text(ctx, 'Our Special Day', PRINT_W / 2, PRINT_H - 300, `92px ${S()}`, '#7a5240')
      text(ctx, `VOW! · ${today()}`, PRINT_W / 2, PRINT_H - 190, `36px ${A()}`, '#b08d6c', 'center', (c) => { c.letterSpacing = '10px' })
    },
  ],
  'future-family': [
    (ctx, { result, labels }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#fdf1e3')
      text(ctx, 'FAMILY!', PRINT_W / 2, 200, `150px ${B()}`, '#c4622d')
      photoClip(ctx, result, 90, 260, 1020, 1240, 28, 0.3)
      for (let i = 0; i < 6; i++) heart(ctx, 120 + i * 190, 1560, 18, 'rgba(196,98,45,0.5)')
      text(ctx, `${labels.scene ?? ''} — 함께라서, 더 특별한 하루`, PRINT_W / 2, 1650, `56px ${S()}`, '#8a4a22')
      text(ctx, '재미로 보는 가족 상상 · AI가 만든 창작 이미지예요', PRINT_W / 2, 1720, `700 30px ${G()}`, '#c4622d')
    },
    (ctx, { result }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f3e2cc')
      ctx.save(); ctx.translate(PRINT_W / 2, 860); ctx.rotate(0.02); shadow(ctx, 30)
      rect(ctx, -500, -720, 1000, 1360, '#ffffff'); ctx.restore()
      ctx.save(); ctx.translate(PRINT_W / 2, 860); ctx.rotate(0.02)
      photoClip(ctx, result, -450, -670, 900, 1080, 0, 0.3)
      text(ctx, '재미로 보는 가족 상상 ♡', 0, 540, `64px ${S()}`, '#8a4a22')
      ctx.restore()
      rect(ctx, 420, 110, 360, 70, 'rgba(240,210,170,0.8)')
      text(ctx, 'AI가 만든 창작 이미지예요', PRINT_W / 2, 1720, `700 32px ${G()}`, '#c4622d')
    },
  ],
  // ── 주거복지대전 3종 ──
  'housing-movein': [
    (ctx, { result, labels, comment }) => {
      // 입주 기념 액자 — 크림 바탕 · 하늘색 이중 테두리 · 아래 기념 문구
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f7f1e6')
      stroke(ctx, 40, 40, 1120, 1720, '#2f6f9f', 6)
      stroke(ctx, 62, 62, 1076, 1676, '#2f6f9f', 2)
      // 목업 b4-5: 워드마크 위에 작은 지붕 선
      ctx.save(); ctx.strokeStyle = '#c4553a'; ctx.lineWidth = 8; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(PRINT_W / 2 - 90, 92); ctx.lineTo(PRINT_W / 2, 50); ctx.lineTo(PRINT_W / 2 + 90, 92); ctx.stroke(); ctx.restore()
      text(ctx, 'MOVE IN!', PRINT_W / 2, 230, `150px ${A()}`, '#2f6f9f')
      photoClip(ctx, result, 110, 270, 980, 1170, 10, 0.3)
      text(ctx, '입주를 축하합니다', PRINT_W / 2, 1545, `700 68px ${G()}`, '#1f3f5a')
      if (comment) fitText(ctx, comment, PRINT_W / 2, 1625, 980, 42, G(), '#2f6f9f', '700')
      text(ctx, `${labels.home ?? ''} · ${today()}`, PRINT_W / 2, comment ? 1690 : 1650, `700 ${comment ? 32 : 38}px ${G()}`, '#5b7d97')
    },
    (ctx, { result, comment }) => {
      // 우리 집 프레임 — 사진을 지붕 있는 집 모양으로
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#dcebf5')
      for (let i = 0; i < 7; i++) rect(ctx, 0, 1480 + i * 48, PRINT_W, 24, i % 2 ? '#cfe3c4' : '#bcd8ae')
      // 목업 b4-6: 맨 위 워드마크, 그 아래 지붕 있는 집 모양 사진
      text(ctx, 'MOVE IN!', PRINT_W / 2, 190, `130px ${A()}`, '#2f6f9f')
      const x = 110, w = 980, roof = 280, top = 260, bottom = 1500
      ctx.save(); shadow(ctx, 30, 'rgba(30,60,90,0.3)')
      ctx.beginPath(); ctx.moveTo(x - 30, top + roof); ctx.lineTo(PRINT_W / 2, top); ctx.lineTo(x + w + 30, top + roof); ctx.lineTo(x + w, top + roof); ctx.lineTo(x + w, bottom); ctx.lineTo(x, bottom); ctx.lineTo(x, top + roof); ctx.closePath()
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore()
      ctx.save()
      ctx.beginPath(); ctx.moveTo(x + 40, top + roof + 10); ctx.lineTo(PRINT_W / 2, top + 50); ctx.lineTo(x + w - 40, top + roof + 10); ctx.lineTo(x + w - 30, top + roof + 10); ctx.lineTo(x + w - 30, bottom - 30); ctx.lineTo(x + 30, bottom - 30); ctx.lineTo(x + 30, top + roof + 10); ctx.closePath(); ctx.clip()
      cover(ctx, result, x + 30, top + 50, w - 60, bottom - top - 80, 0.3)
      ctx.restore()
      ctx.save(); ctx.strokeStyle = '#c4553a'; ctx.lineWidth = 34; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(x - 50, top + roof + 14); ctx.lineTo(PRINT_W / 2, top - 10); ctx.lineTo(x + w + 50, top + roof + 14); ctx.stroke(); ctx.restore()
      text(ctx, 'Welcome Home', PRINT_W / 2, comment ? 1610 : 1640, `${comment ? 84 : 96}px ${S()}`, '#1f3f5a')
      if (comment) fitText(ctx, comment, PRINT_W / 2, 1685, 980, 40, G(), '#1f3f5a', '700')
      text(ctx, `우리 집 첫날 · ${today()}`, PRINT_W / 2, comment ? 1750 : 1730, `700 ${comment ? 30 : 36}px ${G()}`, '#2f6f9f')
    },
  ],
  'housing-cover': [
    (ctx, { result, labels }) => {
      // 매거진 표지 — 사진 전면 + 위 큰 제호 + 왼쪽 표지 문구
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.2)
      const fade = ctx.createLinearGradient(0, 0, 0, 520)
      fade.addColorStop(0, 'rgba(0,0,0,0.35)'); fade.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fade; ctx.fillRect(0, 0, PRINT_W, 520)
      fitText(ctx, 'MY HOME', PRINT_W / 2, 270, 1080, 300, P(), '#ffffff', '900', 'center', (c) => shadow(c, 16, 'rgba(0,0,0,0.3)'))
      text(ctx, `DREAM HOME ISSUE · ${today()}`, PRINT_W / 2, 340, `34px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '10px'; shadow(c, 10, 'rgba(0,0,0,0.4)') })
      const bottom = ctx.createLinearGradient(0, PRINT_H - 620, 0, PRINT_H)
      bottom.addColorStop(0, 'rgba(0,0,0,0)'); bottom.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = bottom; ctx.fillRect(0, PRINT_H - 620, PRINT_W, 620)
      rect(ctx, 70, PRINT_H - 420, 300, 64, '#c2412d')
      text(ctx, 'COVER STORY', 220, PRINT_H - 375, `36px ${A()}`, '#ffffff', 'center', (c) => { c.letterSpacing = '4px' })
      text(ctx, `${labels.room ?? ''} 집에 사는 나`, 70, PRINT_H - 250, `700 76px ${G()}`, '#ffffff', 'left', (c) => shadow(c, 14, 'rgba(0,0,0,0.45)'))
      text(ctx, '내가 꿈꾸는 집, 나다운 하루', 74, PRINT_H - 160, `700 44px ${G()}`, '#f3e6dc', 'left', (c) => shadow(c, 12, 'rgba(0,0,0,0.45)'))
      text(ctx, 'COVER!', PRINT_W - 70, PRINT_H - 80, `56px ${A()}`, '#ffffff', 'right')
    },
    (ctx, { result, labels }) => {
      // 인테리어 화보 — 흰 지면 · 위 사진 · 아래 기사 머리
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#fbf8f3')
      text(ctx, 'MY HOME', 80, 140, `900 92px ${P()}`, '#1d1d1d', 'left')
      text(ctx, today(), PRINT_W - 80, 130, `30px ${A()}`, '#c2412d', 'right', (c) => { c.letterSpacing = '6px' })
      rect(ctx, 80, 170, PRINT_W - 160, 4, '#1d1d1d')
      photoClip(ctx, result, 80, 210, PRINT_W - 160, 1220, 0, 0.25)
      text(ctx, 'INTERIOR', 80, 1520, `40px ${A()}`, '#c2412d', 'left', (c) => { c.letterSpacing = '10px' })
      fitText(ctx, `${labels.room ?? ''} — 나다운 집의 조건`, 80, 1610, PRINT_W - 160, 74, G(), '#1d1d1d', '700', 'left')
      text(ctx, '좋아하는 빛과 재료로 채운 공간에서, 오늘의 나를 만났어요.', 80, 1690, `36px ${G()}`, '#55504a', 'left')
    },
  ],
  'housing-2046': [
    (ctx, { result, labels, comment }) => {
      // 미래 주민 카드 — 재미로 만든 가상 카드(공식 신분증처럼 보이지 않게 '재미로 만든 카드'를 적는다)
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#0f2b3a')
      const glow = ctx.createRadialGradient(PRINT_W * 0.8, 200, 50, PRINT_W * 0.8, 200, 900)
      glow.addColorStop(0, 'rgba(94,234,212,0.35)'); glow.addColorStop(1, 'rgba(94,234,212,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      text(ctx, '2046!', 80, 200, `170px ${A()}`, '#5eead4', 'left')
      text(ctx, 'FUTURE RESIDENT CARD', 86, 268, `38px ${A()}`, '#d8fbf4', 'left', (c) => { c.letterSpacing = '8px' })
      ctx.save(); shadow(ctx, 40, 'rgba(0,0,0,0.45)'); rect(ctx, 80, 330, 1040, 1300, '#f4fbfa', 36); ctx.restore()
      // 코멘트가 있으면 사진을 조금 줄여 카드 아래에 한 줄(주민 카드 '코멘트')
      const ph = comment ? 880 : 960, base = 370 + ph
      photoClip(ctx, result, 120, 370, 960, ph, 24, 0.25)
      text(ctx, '미래 도시 주민', 130, base + 100, `700 40px ${G()}`, '#1d8a78', 'left')
      fitText(ctx, labels.city ?? '', 130, base + 180, 620, 72, G(), '#0f2b3a', '700', 'left')
      text(ctx, `입주 2046 · 발급 ${today()}`, 130, base + 245, `30px ${A()}`, '#4b6b74', 'left', (c) => { c.letterSpacing = '4px' })
      ctx.save(); ctx.strokeStyle = '#1d8a78'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(1000, base + 160, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
      text(ctx, '2046', 1000, base + 175, `44px ${A()}`, '#1d8a78')
      if (comment) fitText(ctx, `“${comment}”`, PRINT_W / 2, base + 325, 960, 40, G(), '#1d8a78', '700')
      text(ctx, '재미로 만든 미래 주민 카드 · AI가 만든 창작 이미지예요', PRINT_W / 2, 1720, `700 30px ${G()}`, '#9fd8cd')
    },
    (ctx, { result, labels, comment }) => {
      // 미래 도시 포스터 — 사진 전면 + 큰 연도
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const fade = ctx.createLinearGradient(0, PRINT_H - 700, 0, PRINT_H)
      fade.addColorStop(0, 'rgba(8,30,40,0)'); fade.addColorStop(1, 'rgba(8,30,40,0.85)')
      ctx.fillStyle = fade; ctx.fillRect(0, PRINT_H - 700, PRINT_W, 700)
      if (comment) fitText(ctx, comment, PRINT_W / 2, PRINT_H - 520, 1040, 46, G(), '#ffffff', '700', 'center', (c) => shadow(c, 14, 'rgba(0,0,0,0.5)'))
      text(ctx, '2046', PRINT_W / 2, PRINT_H - 250, `300px ${A()}`, 'rgba(255,255,255,0.92)', 'center', (c) => { c.letterSpacing = '20px' })
      text(ctx, `${labels.city ?? ''} · SEE YOU IN 2046`, PRINT_W / 2, PRINT_H - 150, `40px ${A()}`, '#5eead4', 'center', (c) => { c.letterSpacing = '6px' })
      text(ctx, 'AI가 만든 창작 이미지예요', PRINT_W / 2, PRINT_H - 80, `700 30px ${G()}`, '#d8fbf4')
    },
  ],
}

function fanCard(ctx: Ctx, input: PrintInput, x: number, y: number, w: number, h: number, rot: number) {
  const frame = input.choices.frame
  const color = frame === 'black' ? '#141418' : frame === 'cream' ? '#fbf1df' : '#dcd1ff'
  const ink = frame === 'black' ? '#ffffff' : '#3f3a8a'
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot)
  shadow(ctx, 24, 'rgba(60,70,160,0.25)')
  rect(ctx, -w / 2, -h / 2, w, h, color, w * 0.06)
  ctx.restore()
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot)
  if (frame === 'lavender') {
    const holo = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
    holo.addColorStop(0, 'rgba(255,255,255,0.6)'); holo.addColorStop(0.5, 'rgba(190,220,255,0.3)'); holo.addColorStop(1, 'rgba(255,200,250,0.5)')
    rect(ctx, -w / 2, -h / 2, w, h, holo as unknown as string, w * 0.06)
  }
  const pad = w * 0.07
  photoClip(ctx, input.result, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h * 0.78, w * 0.03, 0.3)
  const caption = input.labels.caption ?? ''
  fitText(ctx, caption, 0, h / 2 - h * 0.07, w - pad * 2, w * 0.11, S(), ink)
  const s = w * 0.07
  const draw = input.choices.sticker === 'heart' ? heart : input.choices.sticker === 'crown' ? crown : star
  const tint = input.choices.sticker === 'crown' ? '#f0b53a' : input.choices.sticker === 'heart' ? '#ff7fb8' : '#8fb6ff'
  draw(ctx, w / 2 - pad - s, -h / 2 + pad + s * 1.2, s, tint)
  draw(ctx, -w / 2 + pad + s * 0.9, h * 0.25, s * 0.8, tint)
  text(ctx, 'WITH!', w / 2 - pad, -h / 2 + pad + h * 0.78 - s * 0.4, `${w * 0.07}px ${B()}`, '#ffffff', 'right', (c) => shadow(c, 8, 'rgba(0,0,0,0.3)'))
  ctx.restore()
}

// ── DRAW! 캐리커처 부품 ──

const isWide = (pic: Pic) => { const { w, h } = size(pic); return w > h }

/** 워드마크(그림) — 위쪽 가운데 기준. 그림을 못 받았으면 글자 + 코럴 밑줄 */
function drawMark(ctx: Ctx, cx: number, top: number, width: number) {
  const mark = artCache.get(DRAW_MARK)
  if (mark) {
    ctx.drawImage(mark, cx - width / 2, top, width, (width * mark.naturalHeight) / mark.naturalWidth)
    return
  }
  const px = width * 0.3
  text(ctx, 'DRAW!', cx, top + px, `${px}px ${A()}`, DRAW.ink)
  rect(ctx, cx - width * 0.32, top + px * 1.12, width * 0.64, px * 0.12, DRAW.coral, px * 0.06)
}

/** 튀는 선 세 줄(낙서) — angle 방향으로 */
function rays(ctx: Ctx, cx: number, cy: number, length: number, angle: number) {
  ctx.save()
  ctx.strokeStyle = DRAW.coral; ctx.lineWidth = 9; ctx.lineCap = 'round'
  for (const d of [-0.42, 0, 0.42]) {
    const a = angle + d
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * length * 0.35, cy + Math.sin(a) * length * 0.35)
    ctx.lineTo(cx + Math.cos(a) * length, cy + Math.sin(a) * length)
    ctx.stroke()
  }
  ctx.restore()
}

function smiley(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 0.52, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.34, cy - r * 0.36); ctx.lineTo(cx - r * 0.34, cy - r * 0.16)
  ctx.moveTo(cx + r * 0.34, cy - r * 0.36); ctx.lineTo(cx + r * 0.34, cy - r * 0.16)
  ctx.stroke()
  ctx.restore()
}

/** 꼬리표 글자 — 키오스크와 같은 '코믹 · 재미있게' */
const drawTag = (labels: Record<string, string>) => [labels.style, labels.level].filter(Boolean).join(' · ')

/** 코럴 꼬리표(흰 글자, 살짝 기울임) */
function drawTagChip(ctx: Ctx, value: string, cx: number, cy: number, tilt: number, px: number) {
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(tilt)
  ctx.font = `800 ${px}px Pretendard`
  const w = ctx.measureText(value).width + px * 2.1, h = px * 1.9
  ctx.shadowColor = 'rgba(90,70,10,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5
  rect(ctx, -w / 2, -h / 2, w, h, DRAW.coral, px * 0.34)
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(value, 0, px * 0.06)
  ctx.restore()
}

/** 종이 한 장에 붙인 그림 — 기울기 · 그림자 · 여백 */
function drawSheet(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number, tilt: number, pad: number) {
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(90,70,10,0.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12
  ctx.fillStyle = DRAW.paper; ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.shadowColor = 'transparent'
  cover(ctx, pic, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2, 0.4)
  ctx.restore()
}

/** 원본 사진 폴라로이드(가로 4:3 사진 칸 + 아래 글자) — 가운데 기준 */
function polaroid(ctx: Ctx, pic: Pic, cx: number, cy: number, width: number, tilt: number, caption: string) {
  const pad = Math.round(width * 0.055), pw = width - pad * 2, ph = Math.round((pw * 3) / 4), foot = Math.round(width * 0.18)
  const h = pad + ph + foot
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(90,70,10,0.3)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8
  ctx.fillStyle = DRAW.paper; ctx.fillRect(-width / 2, -h / 2, width, h)
  ctx.shadowColor = 'transparent'
  cover(ctx, pic, -width / 2 + pad, -h / 2 + pad, pw, ph, 0.35)
  text(ctx, caption, 0, h / 2 - foot * 0.32, `800 ${Math.round(foot * 0.42)}px Pretendard`, DRAW.ink)
  ctx.restore()
}

/** 스케치북 위 스프링 */
function spiral(ctx: Ctx) {
  rect(ctx, 0, 0, PRINT_W, 120, 'rgba(31,29,27,0.04)')
  for (let x = 66; x < PRINT_W - 40; x += 78) {
    ctx.save()
    ctx.fillStyle = '#3a342c'
    ctx.beginPath(); ctx.arc(x, 92, 11, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#9b958a'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x + 4, 90); ctx.bezierCurveTo(x + 6, 40, x - 14, 18, x - 18, 52); ctx.stroke()
    ctx.restore()
  }
}

/** 종이에 바로 그린 듯 — 그림 + 연필 테두리 두 줄(살짝 어긋나게) */
function sketchFrame(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number) {
  cover(ctx, pic, x, y, w, h, 0.4)
  ctx.save()
  ctx.strokeStyle = DRAW.ink; ctx.lineWidth = 4; ctx.lineJoin = 'round'
  ctx.strokeRect(x, y, w, h)
  ctx.globalAlpha = 0.45; ctx.lineWidth = 2
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(0.004)
  ctx.strokeRect(-w / 2 - 8, -h / 2 - 6, w + 14, h + 12)
  ctx.restore()
}

/** 마스킹 테이프 한 조각 — 가운데 기준 */
function tape(ctx: Ctx, cx: number, cy: number, tilt: number, color: string) {
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(tilt)
  ctx.globalAlpha = 0.72
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-90, -24); ctx.lineTo(90, -24); ctx.lineTo(84, -12); ctx.lineTo(90, 0); ctx.lineTo(84, 12); ctx.lineTo(90, 24)
  ctx.lineTo(-90, 24); ctx.lineTo(-84, 12); ctx.lineTo(-90, 0); ctx.lineTo(-84, -12); ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** 테이프로 붙인 원본 사진(흰 테두리 · 가로 4:3) — 가운데 기준 */
function taped(ctx: Ctx, pic: Pic, cx: number, cy: number, width: number, tilt: number) {
  const pad = 14, h = Math.round(((width - pad * 2) * 3) / 4) + pad * 2
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(60,45,10,0.22)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-width / 2, -h / 2, width, h)
  ctx.shadowColor = 'transparent'
  cover(ctx, pic, -width / 2 + pad, -h / 2 + pad, width - pad * 2, h - pad * 2, 0.35)
  ctx.restore()
  tape(ctx, cx - width * 0.36, cy - h / 2 + 4, -0.6 + tilt, DRAW.star)
  tape(ctx, cx + width * 0.36, cy - h / 2 + 4, 0.6 + tilt, DRAW.coral)
}

/** 인화 디자인 한 장(JPEG data URL) */
export function renderProgramPrint(program: ProgramDef, design: 0 | 1, input: PrintInput): string {
  const canvas = document.createElement('canvas')
  canvas.width = PRINT_W
  canvas.height = PRINT_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PRINT_W, PRINT_H)
  const designs = DESIGNS[program.id]
  if (!designs) throw new Error(`no print design for ${program.id}`)
  designs[design](ctx, input)
  return canvas.toDataURL('image/jpeg', 0.93)
}
