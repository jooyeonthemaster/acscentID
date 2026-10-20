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
}

type Ctx = CanvasRenderingContext2D

function cover(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number, focusY = 0.35) {
  const { w: sw, h: sh } = size(pic)
  const scale = Math.max(w / sw, h / sh)
  const cw = w / scale, ch = h / scale
  const cx = (sw - cw) / 2
  const cy = Math.max(0, Math.min(sh - ch, (sh - ch) * focusY))
  ctx.drawImage(pic, cx, cy, cw, ch, x, y, w, h)
}

function text(ctx: Ctx, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center', extra?: (c: Ctx) => void) {
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
function fitText(ctx: Ctx, value: string, x: number, y: number, maxW: number, px: number, family: string, color: string, weight = '', align: CanvasTextAlign = 'center', extra?: (c: Ctx) => void) {
  let s = px
  ctx.save()
  for (; s > 20; s -= 4) { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(value).width <= maxW) break }
  ctx.restore()
  text(ctx, value, x, y, `${weight} ${s}px ${family}`, color, align, extra)
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, radius = 0) {
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

function photoClip(ctx: Ctx, pic: Pic, x: number, y: number, w: number, h: number, radius: number, focusY = 0.35) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
  cover(ctx, pic, x, y, w, h, focusY)
  ctx.restore()
}

function shadow(ctx: Ctx, blur = 30, color = 'rgba(0,0,0,0.25)') {
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

function star(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
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

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type Design = (ctx: Ctx, input: PrintInput) => void

const A = () => anton.style.fontFamily
const P = () => playfair.style.fontFamily
const B = () => bagel.style.fontFamily
const H = () => blackHan.style.fontFamily
const G = () => gowun.style.fontFamily
const S = () => pen.style.fontFamily

const DESIGNS: Record<string, [Design, Design]> = {
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
    (ctx, { result, labels }) => {
      paper(ctx, '#efe2c8', 'rgba(120,70,30,0.09)', 2200)
      ctx.save(); shadow(ctx, 24); rect(ctx, 90, 120, 1020, 1400, '#f7eedb'); ctx.restore()
      photoClip(ctx, result, 120, 150, 960, 1340, 0, 0.25)
      text(ctx, 'TIME!', PRINT_W / 2, 1650, `900 120px ${P()}`, '#b23a2a')
      text(ctx, `${labels.role ?? ''} · ${labels.scene ?? ''} — 역사에서 영감을 받은 상상화`, PRINT_W / 2, 1720, `700 34px ${G()}`, '#5b3a22')
      seal(ctx, 1040, 1620, 90, '時')
    },
    (ctx, { result }) => {
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#3d2a1c')
      rect(ctx, 0, 0, PRINT_W, 90, '#8a5a32'); rect(ctx, 0, PRINT_H - 90, PRINT_W, 90, '#8a5a32')
      paper(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0)
      rect(ctx, 130, 130, 940, 1540, '#f3e6cb')
      photoClip(ctx, result, 170, 230, 860, 1180, 0, 0.25)
      text(ctx, '꽃이 피는 역사 속에서도, 나는 있었다', PRINT_W / 2, 1520, `52px ${S()}`, '#5b3a22')
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
    (ctx, { result, labels }) => {
      // 입주 기념 액자 — 크림 바탕 · 하늘색 이중 테두리 · 아래 기념 문구
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#f7f1e6')
      stroke(ctx, 40, 40, 1120, 1720, '#2f6f9f', 6)
      stroke(ctx, 62, 62, 1076, 1676, '#2f6f9f', 2)
      text(ctx, 'MOVE IN!', PRINT_W / 2, 210, `150px ${A()}`, '#2f6f9f')
      photoClip(ctx, result, 110, 260, 980, 1180, 10, 0.3)
      text(ctx, '입주를 축하합니다', PRINT_W / 2, 1560, `700 72px ${G()}`, '#1f3f5a')
      text(ctx, `${labels.home ?? ''} · ${today()}`, PRINT_W / 2, 1650, `700 38px ${G()}`, '#5b7d97')
    },
    (ctx, { result }) => {
      // 우리 집 프레임 — 사진을 지붕 있는 집 모양으로
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#dcebf5')
      for (let i = 0; i < 7; i++) rect(ctx, 0, 1480 + i * 48, PRINT_W, 24, i % 2 ? '#cfe3c4' : '#bcd8ae')
      const x = 110, w = 980, roof = 300, top = 150, bottom = 1500
      ctx.save(); shadow(ctx, 30, 'rgba(30,60,90,0.3)')
      ctx.beginPath(); ctx.moveTo(x - 30, top + roof); ctx.lineTo(PRINT_W / 2, top); ctx.lineTo(x + w + 30, top + roof); ctx.lineTo(x + w, top + roof); ctx.lineTo(x + w, bottom); ctx.lineTo(x, bottom); ctx.lineTo(x, top + roof); ctx.closePath()
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore()
      ctx.save()
      ctx.beginPath(); ctx.moveTo(x + 40, top + roof + 10); ctx.lineTo(PRINT_W / 2, top + 50); ctx.lineTo(x + w - 40, top + roof + 10); ctx.lineTo(x + w - 30, top + roof + 10); ctx.lineTo(x + w - 30, bottom - 30); ctx.lineTo(x + 30, bottom - 30); ctx.lineTo(x + 30, top + roof + 10); ctx.closePath(); ctx.clip()
      cover(ctx, result, x + 30, top + 50, w - 60, bottom - top - 80, 0.3)
      ctx.restore()
      ctx.save(); ctx.strokeStyle = '#c4553a'; ctx.lineWidth = 34; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(x - 50, top + roof + 14); ctx.lineTo(PRINT_W / 2, top - 10); ctx.lineTo(x + w + 50, top + roof + 14); ctx.stroke(); ctx.restore()
      text(ctx, 'Welcome Home', PRINT_W / 2, 1640, `96px ${S()}`, '#1f3f5a')
      text(ctx, `우리 집 첫날 · ${today()}`, PRINT_W / 2, 1730, `700 36px ${G()}`, '#2f6f9f')
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
    (ctx, { result, labels }) => {
      // 미래 주민 카드 — 재미로 만든 가상 카드(공식 신분증처럼 보이지 않게 '재미로 만든 카드'를 적는다)
      rect(ctx, 0, 0, PRINT_W, PRINT_H, '#0f2b3a')
      const glow = ctx.createRadialGradient(PRINT_W * 0.8, 200, 50, PRINT_W * 0.8, 200, 900)
      glow.addColorStop(0, 'rgba(94,234,212,0.35)'); glow.addColorStop(1, 'rgba(94,234,212,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, PRINT_W, PRINT_H)
      text(ctx, '2046!', 80, 200, `170px ${A()}`, '#5eead4', 'left')
      text(ctx, 'FUTURE RESIDENT CARD', 86, 268, `38px ${A()}`, '#d8fbf4', 'left', (c) => { c.letterSpacing = '8px' })
      ctx.save(); shadow(ctx, 40, 'rgba(0,0,0,0.45)'); rect(ctx, 80, 330, 1040, 1300, '#f4fbfa', 36); ctx.restore()
      photoClip(ctx, result, 120, 370, 960, 960, 24, 0.25)
      text(ctx, '미래 도시 주민', 130, 1430, `700 40px ${G()}`, '#1d8a78', 'left')
      fitText(ctx, labels.city ?? '', 130, 1510, 620, 72, G(), '#0f2b3a', '700', 'left')
      text(ctx, `입주 2046 · 발급 ${today()}`, 130, 1580, `30px ${A()}`, '#4b6b74', 'left', (c) => { c.letterSpacing = '4px' })
      ctx.save(); ctx.strokeStyle = '#1d8a78'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(1000, 1490, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
      text(ctx, '2046', 1000, 1505, `44px ${A()}`, '#1d8a78')
      text(ctx, '재미로 만든 미래 주민 카드 · AI가 만든 창작 이미지예요', PRINT_W / 2, 1720, `700 30px ${G()}`, '#9fd8cd')
    },
    (ctx, { result, labels }) => {
      // 미래 도시 포스터 — 사진 전면 + 큰 연도
      cover(ctx, result, 0, 0, PRINT_W, PRINT_H, 0.25)
      const fade = ctx.createLinearGradient(0, PRINT_H - 700, 0, PRINT_H)
      fade.addColorStop(0, 'rgba(8,30,40,0)'); fade.addColorStop(1, 'rgba(8,30,40,0.85)')
      ctx.fillStyle = fade; ctx.fillRect(0, PRINT_H - 700, PRINT_W, 700)
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
