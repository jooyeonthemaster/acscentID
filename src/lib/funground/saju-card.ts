// 펀그라운드 사주 카드(SAJU! · FORTUNE!) — 4×6 포토 프린터로 뽑는 컬러 카드(1200×1800, JPEG)를 캔버스로 그린다.
// 들어가는 것: 글자 로고(FUN GROUND 별내 — 로고가 오기 전 자리) · 프로그램 이름 · 찍은 사진 · 나의 일간(제목 + 첫 문장) · 만세력 네 기둥 ·
// 2027년 한 줄 · 공부 · 친구 · 진로 · 꿈 · 마음 한 줄씩 · 행운 · 날짜 · 「재미로 보는 풀이예요」.
// 글은 결과 화면과 같은 문장(FgSajuResult)의 제목만 쓴다. 줄은 띄어쓰기에서만 나눈다(keep-all).
// 사진은 이 기기에서 찍은 것 그대로 — AI 에 보내지 않는다. 사진이 없으면(카메라 실패 · 「사진 없이 계속」) 일간 한자로 채운다.
// 글꼴: 화면 글꼴(Wanted Sans, next/font 이름 그대로) · 한자는 Noto Serif KR — 그리기 전에 쓸 글자로 document.fonts.load 해 둔다.
// 브라우저 전용(document · canvas).

import type { Element } from '@/lib/saju'
import { FG_ELEMENT_HANJA, FG_TOPICS, FG_YEAR, FG_YEAR_GANJI, type FgSajuResult } from './saju-reading'

/** 화면 · 카드가 함께 쓰는 사주 색 */
export const FG_SAJU_TONE = '#1f5a45'
/** 오행 색 — 만세력 글자 · 막대 */
export const FG_ELEMENT_COLOR: Record<Element, string> = { 목: '#2f9e5b', 화: '#e5533d', 토: '#d39a1c', 금: '#8a93a6', 수: '#2f6fd6' }

/** 4×6 인쇄(300dpi 근처) */
export const SAJU_CARD_W = 1200
export const SAJU_CARD_H = 1800
/** 사진 칸 비율(가로 4 : 세로 5) — 촬영 화면 미리보기와 같다 */
export const SAJU_PHOTO_ASPECT = 4 / 5

const W = SAJU_CARD_W
const H = SAJU_CARD_H
const M = 60
const INK = '#17213a'
const SOFT = '#56607a'
const PAPER = '#fff8ef'
const YELLOW = '#ffc83d'

export interface SajuCardInput {
  result: FgSajuResult
  /** 이 기기에서 찍은 사진(data URL) — 없으면 일간 한자로 채운다 */
  photo: string | null
  /** 입력이 음력이면 화면처럼 음력 날짜를 보여 준다 */
  calendar: 'solar' | 'lunar'
  /** 찍는 날(기본: 지금) */
  printedAt?: Date
  /** 글꼴을 읽을 요소(기본: .fg-stage) */
  root?: globalThis.Element | null
}

/** 흰색과 섞은 옅은 색(color-mix 대신) */
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount))
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}
/** 검정과 섞은 짙은 색 */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c * amount)
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

/** 화면이 쓰는 본문 글꼴(next/font 가 만든 이름 포함) · 한자 글꼴 */
function fontFamilies(root?: globalThis.Element | null) {
  const from = root ?? document.querySelector('.fg-stage') ?? document.body
  const sans = getComputedStyle(from).fontFamily || "'Apple SD Gothic Neo', sans-serif"
  const serifVar = getComputedStyle(document.body).getPropertyValue('--font-noto-serif-kr').trim()
  const serif = `${serifVar ? `${serifVar}, ` : ''}'Noto Serif KR', 'Apple SD Gothic Neo', serif`
  return { sans, serif }
}

/** 쓸 글자로 글꼴을 받아 둔다(한자 글꼴은 글자 범위마다 나뉘어 있어 쓸 글자를 넘겨야 받는다) */
async function loadFonts(sans: string, serif: string, sample: string, hanja: string) {
  try {
    await Promise.all([
      ...[600, 700, 800].map((w) => document.fonts.load(`${w} 32px ${sans}`, sample)),
      document.fonts.load(`900 60px ${serif}`, hanja),
    ])
    await document.fonts.ready
  } catch { /* 기본 글꼴로 그린다 */ }
}

/** 폭에 맞게 줄을 나눈다 — 띄어쓰기에서만 나누고, 한 낱말이 폭을 넘을 때만 글자 단위로 자른다 */
export function wrapKeepAll(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      if (!word) continue
      if (ctx.measureText(line + word).width <= maxWidth) { line += word; continue }
      if (line.trim()) { lines.push(line.trimEnd()); line = '' }
      if (/^\s+$/.test(word)) continue
      for (const ch of word) {
        if (line && ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = '' }
        line += ch
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('사진을 읽지 못했습니다'))
    image.src = src
  })
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const dateOf = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`

/** 사주 카드 그림(JPEG data URL) */
export async function renderSajuCard({ result, photo, calendar, printedAt = new Date(), root }: SajuCardInput): Promise<string> {
  const { chart, reading } = result
  const ai = result.engine === 'ai'
  const { sans, serif } = fontFamilies(root)
  const dm = reading.dayMaster
  const dmColor = FG_ELEMENT_COLOR[dm.element]
  const birthLine = `${calendar === 'lunar' ? chart.lunarLabel : chart.solarLabel} · ${chart.zodiac}띠`
  const hanja = [dm.hanja, FG_YEAR_GANJI.hanja, ...Object.values(FG_ELEMENT_HANJA), ...chart.pillars.flatMap(({ pillar }) => (pillar ? [pillar.ganHanja, pillar.jiHanja] : []))].join('')
  const sample = [
    birthLine, dm.title, reading.year2027.title, ...FG_TOPICS.flatMap((t) => [t.label, reading.topics[t.key].title]),
    reading.lucky.color, reading.lucky.item, reading.lucky.habit,
    'FUN GROUND 별내 SAJU! FORTUNE! 사주 카드 AI 포춘 나의 일간 만세력 흐름 행운 색 물건 습관 재미로 보는 풀이예요 시간 모름 0123456789.()·', hanja,
  ].join(' ')
  const [image] = await Promise.all([photo ? loadImage(photo).catch(() => null) : Promise.resolve(null), loadFonts(sans, serif, sample, hanja)])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d 를 쓸 수 없습니다')
  ctx.textBaseline = 'top'
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  const font = (weight: number, size: number, family = sans) => { ctx.font = `${weight} ${size}px ${family}` }
  const fill = (color: string) => { ctx.fillStyle = color }
  const round = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    fill(color); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill()
  }
  /** 폭에 들어가게 글자 크기를 줄여 한 줄로(최소 크기에서도 넘치면 줄을 나눈다) — 쓴 높이를 돌려준다 */
  const fitLine = (text: string, x: number, y: number, maxW: number, size: number, weight: number, { min = Math.round(size * 0.78), color = INK, align = 'left' as CanvasTextAlign, lead = 1.22, maxLines = 2 } = {}) => {
    let s = size
    font(weight, s)
    while (s > min && ctx.measureText(text).width > maxW) { s -= 1; font(weight, s) }
    const lines = wrapKeepAll(ctx, text, maxW).slice(0, maxLines)
    fill(color)
    ctx.textAlign = align
    lines.forEach((line, i) => ctx.fillText(line, align === 'center' ? x + maxW / 2 : align === 'right' ? x + maxW : x, y + i * Math.round(s * lead)))
    ctx.textAlign = 'left'
    return lines.length * Math.round(s * lead)
  }
  const shadowed = (draw: () => void) => {
    ctx.save(); ctx.shadowColor = 'rgba(23, 33, 58, 0.12)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; draw(); ctx.restore()
  }

  // ───────── 머리 띠: 글자 로고 · 프로그램 이름 · 날짜 ─────────
  const BAND = 250
  fill(FG_SAJU_TONE)
  ctx.fillRect(0, 0, W, BAND)
  const glow = ctx.createRadialGradient(W * 0.88, BAND, 10, W * 0.88, BAND, 520)
  glow.addColorStop(0, 'rgba(255, 200, 61, 0.28)')
  glow.addColorStop(1, 'rgba(255, 200, 61, 0)')
  fill(glow as unknown as string)
  ctx.fillRect(0, 0, W, BAND)
  font(800, 40)
  ctx.letterSpacing = '4px'
  fill('#fff')
  ctx.fillText('FUN GROUND', M, 48)
  const brandW = ctx.measureText('FUN GROUND').width
  ctx.letterSpacing = '0px'
  font(800, 36)
  fill(YELLOW)
  ctx.fillText('별내', M + brandW + 14, 51)
  font(800, 124)
  ctx.letterSpacing = '-4px'
  fill(YELLOW)
  const word = 'FORTUNE!'
  ctx.fillText(word, M - 4, 104)
  const wordW = ctx.measureText(word).width
  ctx.letterSpacing = '0px'
  font(800, 40)
  fill('#fff')
  ctx.fillText(ai ? 'AI 포춘 카드' : '포춘 카드', M + wordW + 22, 132)
  font(600, 28)
  fill('rgba(255, 255, 255, 0.78)')
  ctx.fillText(birthLine, M + wordW + 22, 184)

  // ───────── 사진(왼쪽 4:5) · 일간 · 만세력(오른쪽) ─────────
  const TOP = BAND + 32
  const PH_W = 510
  const PH_H = Math.round(PH_W / SAJU_PHOTO_ASPECT)
  const RX = M + PH_W + 32
  const RW = W - M - RX
  shadowed(() => round(M - 10, TOP - 10, PH_W + 20, PH_H + 20, 40, '#fff'))
  ctx.save()
  ctx.beginPath(); ctx.roundRect(M, TOP, PH_W, PH_H, 30); ctx.clip()
  if (image) {
    // 가운데 기준으로 칸을 꽉 채운다
    const scale = Math.max(PH_W / image.naturalWidth, PH_H / image.naturalHeight)
    const dw = image.naturalWidth * scale
    const dh = image.naturalHeight * scale
    ctx.drawImage(image, M + (PH_W - dw) / 2, TOP + (PH_H - dh) / 2, dw, dh)
  } else {
    fill(tint(dmColor, 0.18))
    ctx.fillRect(M, TOP, PH_W, PH_H)
    fill(dmColor)
    ctx.textAlign = 'center'
    font(900, 300, serif)
    ctx.fillText(dm.hanja, M + PH_W / 2, TOP + PH_H / 2 - 190)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  // 사진 귀퉁이 일간 도장(사진이 없으면 칸 전체가 일간 한자라 뺀다)
  if (image) {
    const r = 70
    const cx = M + PH_W - r + 16
    const cy = TOP + PH_H - r + 16
    fill('#fff'); ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fill()
    fill(dmColor); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    fill('#fff')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    font(900, 84, serif)
    ctx.fillText(dm.hanja, cx, cy + 4)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
  }

  // 나의 일간
  const HERO_H = 262
  shadowed(() => round(RX, TOP, RW, HERO_H, 34, tint(dmColor, 0.16)))
  {
    const x = RX + 34
    const w = RW - 68
    font(800, 28)
    fill(shade(dmColor, 0.7))
    ctx.fillText(`나의 일간 · ${dm.gan}${dm.element}(${dm.hanja}${FG_ELEMENT_HANJA[dm.element]})`, x, TOP + 32)
    const titleH = fitLine(dm.title, x, TOP + 78, w, 50, 800, { min: 40, lead: 1.18, maxLines: 2 })
    // 일간 이야기 첫 문장 — 칸에 들어가는 줄까지만
    const first = dm.text.split(/(?<=[.!?。])\s+/)[0] ?? ''
    const textTop = TOP + 78 + titleH + 12
    font(600, 26)
    const room = Math.floor((TOP + HERO_H - 24 - textTop) / 36)
    const lines = wrapKeepAll(ctx, first, w)
    if (room > 0 && lines.length <= room) {
      fill(shade(dmColor, 0.55))
      lines.forEach((line, i) => ctx.fillText(line, x, textTop + i * 36))
    }
  }

  // 만세력
  const CH_TOP = TOP + HERO_H + 22
  const CH_H = PH_H - HERO_H - 22
  shadowed(() => round(RX, CH_TOP, RW, CH_H, 34, '#fff'))
  {
    font(800, 32)
    fill(INK)
    ctx.fillText('나의 만세력', RX + 30, CH_TOP + 26)
    if (chart.isThreePillar) {
      const tw = ctx.measureText('나의 만세력').width
      font(700, 24); fill(SOFT); ctx.fillText('시간 모름', RX + 30 + tw + 14, CH_TOP + 34)
    }
    const gap = 10
    const innerX = RX + 22
    const innerW = RW - 44
    const colW = (innerW - gap * 3) / 4
    const top = CH_TOP + 80
    const colH = CH_TOP + CH_H - 22 - top
    const glyph = Math.min(colW - 18, (colH - 52 - 10) / 2)
    chart.pillars.forEach(({ key, label, pillar }, i) => {
      const x = innerX + i * (colW + gap)
      const me = key === 'day'
      round(x, top, colW, colH, 22, me ? tint(FG_SAJU_TONE, 0.14) : '#f6f1e8')
      if (me) { ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = FG_SAJU_TONE; ctx.beginPath(); ctx.roundRect(x + 2.5, top + 2.5, colW - 5, colH - 5, 20); ctx.stroke(); ctx.restore() }
      ctx.textAlign = 'center'
      font(800, 22)
      fill(me ? FG_SAJU_TONE : SOFT)
      ctx.fillText(me ? '나 · 날' : label, x + colW / 2, top + 14)
      const gx = x + (colW - glyph) / 2
      if (pillar) {
        ;([[pillar.ganHanja, `${pillar.gan} · ${pillar.ganElement}`, pillar.ganElement], [pillar.jiHanja, `${pillar.ji} · ${pillar.jiElement}`, pillar.jiElement]] as const).forEach(([h, k, el], n) => {
          const gy = top + 50 + n * (glyph + 10)
          round(gx, gy, glyph, glyph, 18, FG_ELEMENT_COLOR[el])
          fill('#fff')
          font(900, Math.round(glyph * 0.5), serif)
          ctx.fillText(h, x + colW / 2, gy + glyph * 0.12)
          font(800, 18)
          ctx.fillText(k, x + colW / 2, gy + glyph * 0.7)
        })
      } else {
        ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = '#c9bfae'
        ctx.beginPath(); ctx.roundRect(gx, top + 50, glyph, glyph * 2 + 10, 18); ctx.stroke(); ctx.restore()
        font(800, 24); fill(SOFT)
        ctx.fillText('모름', x + colW / 2, top + 50 + glyph - 10)
      }
      ctx.textAlign = 'left'
    })
  }

  // ───────── 2027년 흐름 ─────────
  let y = TOP + PH_H + 32
  {
    const h = 146
    shadowed(() => round(M, y, W - M * 2, h, 34, '#fff'))
    const grad = ctx.createLinearGradient(M, y, W - M, y + h)
    grad.addColorStop(0.55, 'rgba(255, 230, 220, 0)')
    grad.addColorStop(1, 'rgba(255, 214, 196, 0.9)')
    fill(grad as unknown as string)
    ctx.beginPath(); ctx.roundRect(M, y, W - M * 2, h, 34); ctx.fill()
    font(800, 28)
    fill('#c0442f')
    ctx.fillText(`${FG_YEAR}년 나의 흐름 · ${FG_YEAR_GANJI.label}`, M + 36, y + 26)
    fitLine(reading.year2027.title, M + 36, y + 72, W - M * 2 - 72, 46, 800, { min: 34, maxLines: 1 })
    y += h + 22
  }

  // ───────── 공부 · 친구 · 진로 · 꿈 · 마음 ─────────
  {
    const rowH = 70
    const h = 24 + FG_TOPICS.length * rowH + 12
    shadowed(() => round(M, y, W - M * 2, h, 34, '#fff'))
    FG_TOPICS.forEach((t, i) => {
      const ry = y + 20 + i * rowH
      if (i) { fill('#efe8dc'); ctx.fillRect(M + 36, ry - 4, W - M * 2 - 72, 2) }
      round(M + 30, ry + 8, 120, 52, 26, tint(FG_SAJU_TONE, 0.12))
      font(800, 28)
      fill(FG_SAJU_TONE)
      ctx.textAlign = 'center'
      ctx.fillText(t.label, M + 90, ry + 18)
      ctx.textAlign = 'left'
      fitLine(reading.topics[t.key].title, M + 176, ry + 15, W - M * 2 - 176 - 30, 36, 800, { min: 26, maxLines: 1 })
    })
    y += h + 22
  }

  // ───────── 행운 ─────────
  {
    const luckyColor = FG_ELEMENT_COLOR[reading.lucky.element]
    const gap = 16
    const colW = (W - M * 2 - gap * 3 - 150) / 3
    const h = 134
    shadowed(() => round(M, y, 150, h, 30, luckyColor))
    fill('#fff')
    ctx.textAlign = 'center'
    font(800, 26)
    ctx.fillText('나의 행운', M + 75, y + 30)
    font(900, 52, serif)
    ctx.fillText(FG_ELEMENT_HANJA[reading.lucky.element], M + 75, y + 66)
    ctx.textAlign = 'left'
    ;[['색', reading.lucky.color], ['물건', reading.lucky.item], ['습관', reading.lucky.habit]].forEach(([label, value], i) => {
      const x = M + 150 + gap + i * (colW + gap)
      shadowed(() => round(x, y, colW, h, 30, tint(luckyColor, 0.14)))
      let tx = x + 24
      if (i === 0) {
        fill('#fff'); ctx.beginPath(); ctx.arc(x + 44, y + 44, 22, 0, Math.PI * 2); ctx.fill()
        fill(reading.lucky.swatch); ctx.beginPath(); ctx.arc(x + 44, y + 44, 17, 0, Math.PI * 2); ctx.fill()
        tx = x + 78
      }
      font(800, 24)
      fill(SOFT)
      ctx.fillText(label, tx, y + 30)
      // 가장 작은 글자로도 한 줄에 안 들어가면 두 줄 자리로 올린다(fitLine 이 먼저 크기를 줄인다)
      font(800, 24)
      const twoLines = ctx.measureText(value).width > colW - 44
      fitLine(value, x + 22, twoLines ? y + 64 : y + 76, colW - 44, 30, 800, { min: 24, lead: 1.2, maxLines: 2 })
    })
    y += h + 28
  }

  // ───────── 끝: 재미로 보는 풀이예요 · 날짜 ─────────
  {
    font(800, 32)
    const label = '재미로 보는 풀이예요'
    const w = ctx.measureText(label).width + 52
    const by = Math.min(y, H - 40 - 60)
    round(M, by, w, 60, 30, YELLOW)
    fill(INK)
    ctx.fillText(label, M + 26, by + 13)
    font(700, 26)
    fill(SOFT)
    ctx.textAlign = 'right'
    ctx.fillText(`FUN GROUND 별내 · ${dateOf(printedAt)}`, W - M, by + 18)
    ctx.textAlign = 'left'
  }

  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = 0
  return out
}
