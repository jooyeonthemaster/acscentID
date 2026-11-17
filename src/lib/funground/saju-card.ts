// 펀그라운드 사주 카드(FORTUNE!) — 4×6 포토 프린터로 뽑는 카드(1200×1800, JPEG)를 캔버스로 그린다.
// 모양(2026-11-16): 화면과 같은 「FUN GROUND Editorial」 — 흰 바탕 · 검정 선 · 강조색 하나(#FF7A1A) · 영문 큰 제목 Anton · 한글 머리말 Black Han Sans · 본문 Pretendard.
// 들어가는 것: FUN GROUND 글자 로고(로고가 오기 전 자리) · 날짜 · 카드 이름 · FORTUNE! · 생일 한 줄 · 찍은 사진(+ 오행 라벨) · 나의 일간 제목 ·
// 만세력 네 기둥 · 01 2027년 · 02~06 공부 · 친구 · 진로 · 꿈 · 마음 한 줄씩 · 행운 · 「재미로 보는 풀이예요」.
// 글은 결과 화면과 같은 문장(FgSajuResult)의 제목만 쓴다. 줄은 띄어쓰기에서만 나눈다(keep-all).
// 사진은 이 기기에서 찍은 것 그대로 — AI 에 보내지 않는다. 사진이 없으면(카메라 실패 · 「사진 없이 계속」) 일간 한자로 채운다.
// 글꼴: 화면이 이미 받은 글꼴(editorial.css 의 FG Pretendard · FG Black Han Sans, next/font Anton 변수) · 한자는 Noto Serif KR —
// 그리기 전에 쓸 글자로 document.fonts.load 해 둔다. 브라우저 전용(document · canvas).

import { FG_ELEMENT_HANJA, FG_ELEMENT_WORD, FG_TOPICS, FG_YEAR, type FgSajuResult } from './saju-reading'

/** 4×6 인쇄(300dpi 근처) */
export const SAJU_CARD_W = 1200
export const SAJU_CARD_H = 1800
/** 사진 칸 비율(가로 4 : 세로 5) — 촬영 화면 미리보기와 같다 */
export const SAJU_PHOTO_ASPECT = 4 / 5

const W = SAJU_CARD_W
const H = SAJU_CARD_H
const M = 64
const INK = '#111111'
const SOFT = '#6b6b6b'
const PAPER = '#ffffff'
const ACCENT = '#ff7a1a'

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

/** 화면이 쓰는 글꼴 이름(next/font 가 만든 Anton 이름 포함) · 한자 글꼴 */
function fontFamilies(root?: globalThis.Element | null) {
  const from = root ?? document.querySelector('.fg-stage') ?? document.body
  const style = getComputedStyle(from)
  const sans = "'FG Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
  const head = "'FG Black Han Sans', 'FG Pretendard', 'Apple SD Gothic Neo', sans-serif"
  const antonVar = style.getPropertyValue('--pg-f-anton').trim()
  const display = `${antonVar ? `${antonVar}, ` : ''}'Anton', Impact, 'Arial Narrow', sans-serif`
  const serifVar = getComputedStyle(document.body).getPropertyValue('--font-noto-serif-kr').trim()
  const serif = `${serifVar ? `${serifVar}, ` : ''}'Noto Serif KR', 'Apple SD Gothic Neo', serif`
  return { sans, head, display, serif }
}

/** 쓸 글자로 글꼴을 받아 둔다(한자 글꼴은 글자 범위마다 나뉘어 있어 쓸 글자를 넘겨야 받는다) */
async function loadFonts(f: ReturnType<typeof fontFamilies>, sample: string, hanja: string) {
  try {
    await Promise.all([
      ...[600, 700, 800, 900].map((w) => document.fonts.load(`${w} 32px ${f.sans}`, sample)),
      document.fonts.load(`400 72px ${f.head}`, sample),
      document.fonts.load(`400 72px ${f.display}`, 'FUNGROUNDFORTUNE!0123456789'),
      document.fonts.load(`900 60px ${f.serif}`, hanja),
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
  const fonts = fontFamilies(root)
  const dm = reading.dayMaster
  const birthLine = `${calendar === 'lunar' ? chart.lunarLabel : chart.solarLabel} · ${chart.zodiac}띠${chart.isThreePillar ? ' · 시간 모름' : ''}`
  const rows = [
    { label: `${FG_YEAR}년`, title: reading.year2027.title },
    ...FG_TOPICS.map((t) => ({ label: t.label, title: reading.topics[t.key].title })),
  ]
  const hanja = [dm.hanja, ...Object.values(FG_ELEMENT_HANJA), ...chart.pillars.flatMap(({ pillar }) => (pillar ? [pillar.ganHanja, pillar.jiHanja] : []))].join('')
  const sample = [
    birthLine, dm.title, ...rows.flatMap((r) => [r.label, r.title]), reading.lucky.color, reading.lucky.item, reading.lucky.habit,
    `${FG_ELEMENT_WORD[dm.element]}의 기운 나의 일간 만세력 시 날 달 해 나 모름 행운 색 물건 습관 AI 포춘 카드 재미로 보는 풀이예요 별내 0123456789.()·—`,
    `${dm.gan}${dm.element}`, ...chart.pillars.flatMap(({ pillar }) => (pillar ? [pillar.gan, pillar.ji, pillar.ganElement, pillar.jiElement] : [])),
  ].join(' ')
  const [image] = await Promise.all([photo ? loadImage(photo).catch(() => null) : Promise.resolve(null), loadFonts(fonts, sample, hanja)])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d 를 쓸 수 없습니다')
  ctx.textBaseline = 'top'
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  const font = (weight: number | string, size: number, family = fonts.sans) => { ctx.font = `${weight} ${size}px ${family}` }
  const fill = (color: string) => { ctx.fillStyle = color }
  const rule = (x: number, y: number, w: number, h = 1, color = INK) => { fill(color); ctx.fillRect(x, y, w, h) }
  /** 폭에 들어가게 글자 크기를 줄여 쓴다(최소 크기에서도 넘치면 줄을 나눈다) — 쓴 높이를 돌려준다 */
  const fitLine = (text: string, x: number, y: number, maxW: number, size: number, weight: number | string, { min = Math.round(size * 0.78), color = INK, lead = 1.22, maxLines = 1, family = fonts.sans } = {}) => {
    let s = size
    font(weight, s, family)
    while (s > min && ctx.measureText(text).width > maxW) { s -= 1; font(weight, s, family) }
    const lines = wrapKeepAll(ctx, text, maxW).slice(0, maxLines)
    fill(color)
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * Math.round(s * lead)))
    return { height: lines.length * Math.round(s * lead), size: s, width: Math.max(...lines.map((l) => ctx.measureText(l).width)) }
  }
  /** 강조색 라벨 띠 — 쓴 폭을 돌려준다 */
  const label = (text: string, x: number, y: number, size: number, padX = 20, h = Math.round(size * 1.6)) => {
    font(900, size)
    const w = ctx.measureText(text).width + padX * 2
    fill(ACCENT); ctx.fillRect(x, y, w, h)
    fill(INK); ctx.fillText(text, x + padX, y + (h - size) / 2 + 1)
    return w
  }

  // ───────── 머리: FUN GROUND · 날짜 / 카드 이름 띠 / FORTUNE! / 생일 한 줄 ─────────
  font(400, 56, fonts.display)
  fill(INK)
  ctx.fillText('FUN GROUND', M, 52)
  font(700, 28)
  fill(SOFT)
  ctx.textAlign = 'right'
  ctx.fillText(`별내 · ${dateOf(printedAt)}`, W - M, 70)
  ctx.textAlign = 'left'
  rule(M, 136, W - M * 2, 2)

  const bandW = label(ai ? 'AI 포춘 카드' : '포춘 카드', M, 168, 34)
  rule(M + bandW + 24, 168 + 27, W - M * 2 - bandW - 24)

  // 영문 큰 제목 — 폭에 맞춰(긴 쪽이 넘치지 않게)
  {
    let s = 248
    font(400, s, fonts.display)
    while (s > 160 && ctx.measureText('FORTUNE!').width > W - M * 2) { s -= 4; font(400, s, fonts.display) }
    ctx.textBaseline = 'alphabetic'
    fill(INK)
    ctx.fillText('FORTUNE!', M - 4, 440)
    ctx.textBaseline = 'top'
  }
  font(700, 32)
  fill(INK)
  ctx.fillText(birthLine, M, 462)

  // ───────── 사진(왼쪽 4:5 + 오행 라벨) · 나의 일간 · 만세력(오른쪽) ─────────
  const TOP = 528
  const PH_W = 500
  const PH_H = Math.round(PH_W / SAJU_PHOTO_ASPECT)
  ctx.save()
  ctx.beginPath(); ctx.rect(M, TOP, PH_W, PH_H); ctx.clip()
  if (image) {
    // 가운데 기준으로 칸을 꽉 채운다
    const scale = Math.max(PH_W / image.naturalWidth, PH_H / image.naturalHeight)
    const dw = image.naturalWidth * scale
    const dh = image.naturalHeight * scale
    ctx.drawImage(image, M + (PH_W - dw) / 2, TOP + (PH_H - dh) / 2, dw, dh)
  } else {
    fill(INK)
    ctx.fillRect(M, TOP, PH_W, PH_H)
    fill(PAPER)
    ctx.textAlign = 'center'
    font(900, 320, fonts.serif)
    ctx.fillText(dm.hanja, M + PH_W / 2, TOP + PH_H / 2 - 190)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  label(`${FG_ELEMENT_WORD[dm.element]}의 기운`, M + 20, TOP + PH_H - 20 - 62, 36, 18, 62)

  const RX = M + PH_W + 40
  const RW = W - M - RX
  font(800, 28)
  fill(SOFT)
  ctx.fillText(`나의 일간 · ${dm.gan}${dm.element}(${dm.hanja}${FG_ELEMENT_HANJA[dm.element]})`, RX, TOP)
  const title = fitLine(dm.title, RX, TOP + 46, RW, 76, 400, { min: 56, lead: 1.12, maxLines: 2, family: fonts.head })
  rule(RX, TOP + 46 + title.height + 4, Math.min(RW, title.width), 12, ACCENT)

  // 만세력 — 네 칸(시 · 날 · 달 · 해), 날 기둥(나)은 강조색
  {
    const top = TOP + 46 + title.height + 44
    const bottom = TOP + PH_H
    const colW = RW / 4
    const labelH = 50
    const cellH = (bottom - top - labelH) / 2
    rule(RX, top, RW)
    chart.pillars.forEach(({ key, label: name, pillar }, i) => {
      const x = RX + i * colW
      if (key === 'day') { fill(ACCENT); ctx.fillRect(x, top, colW, bottom - top) }
      ctx.textAlign = 'center'
      font(800, 26)
      fill(INK)
      ctx.fillText(key === 'day' ? '나 · 날' : name.replace('태어난 ', ''), x + colW / 2, top + 13)
      if (pillar) {
        ;([[pillar.ganHanja, `${pillar.gan} · ${pillar.ganElement}`], [pillar.jiHanja, `${pillar.ji} · ${pillar.jiElement}`]] as const).forEach(([h, k], n) => {
          const cy = top + labelH + n * cellH
          const g = Math.min(76, cellH * 0.56)
          font(900, g, fonts.serif)
          fill(INK)
          ctx.fillText(h, x + colW / 2, cy + (cellH - g - 30) / 2)
          font(700, 22)
          ctx.fillText(k, x + colW / 2, cy + (cellH - g - 30) / 2 + g + 8)
        })
      } else {
        font(800, 26)
        fill(SOFT)
        ctx.fillText('모름', x + colW / 2, top + labelH + cellH - 13)
      }
      ctx.textAlign = 'left'
    })
    // 가는 선 격자
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.strokeRect(RX + 0.5, top + 0.5, RW - 1, bottom - top - 1)
    for (let i = 1; i < 4; i += 1) rule(RX + i * colW, top, 1, bottom - top)
    rule(RX, top + labelH, RW)
  }

  // ───────── 01 2027년 · 02~06 공부 · 친구 · 진로 · 꿈 · 마음 ─────────
  let y = TOP + PH_H + 32
  {
    const rowH = 66
    rule(M, y, W - M * 2, 2)
    rows.forEach((r, i) => {
      const ry = y + i * rowH
      if (i) rule(M, ry, W - M * 2)
      font(400, 40, fonts.display)
      fill(INK)
      ctx.fillText(pad2(i + 1), M, ry + 12)
      font(900, 32)
      ctx.fillText(r.label, M + 92, ry + 18)
      font(600, 32)
      ctx.fillText('—', M + 250, ry + 18)
      fitLine(r.title, M + 304, ry + 18, W - M - (M + 304), 32, 600, { min: 24 })
    })
    y += rows.length * rowH
    rule(M, y, W - M * 2)
  }

  // ───────── 행운 한 줄 ─────────
  {
    y += 22
    font(900, 30)
    fill(INK)
    ctx.fillText('행운', M, y + 8)
    const sx = M + 92
    fill(reading.lucky.swatch); ctx.fillRect(sx, y + 6, 36, 36)
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, y + 6.5, 35, 35)
    fitLine(`${reading.lucky.color} · ${reading.lucky.item} · ${reading.lucky.habit}`, sx + 56, y + 8, W - M - (sx + 56), 30, 700, { min: 22 })
  }

  // ───────── 끝: 재미로 보는 풀이예요 · FUN GROUND 별내 ─────────
  {
    const fy = H - 60 - 50
    rule(M, fy - 24, W - M * 2, 2)
    label('재미로 보는 풀이예요', M, fy, 30, 18, 50)
    font(400, 34, fonts.display)
    fill(INK)
    ctx.textAlign = 'right'
    ctx.fillText('FUN GROUND', W - M, fy + 8)
    ctx.textAlign = 'left'
  }

  const out = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = 0
  return out
}
