// 펀그라운드 「FUTURE NEWS! 2046 별내 신문」 — 4×6 사진 인쇄용 신문 1면(세로 1200×1800 JPEG, 300dpi 4×6). 기기 안 캔버스로만 그린다.
// 짜임(위에서 아래로):
//   귀퉁이 상자(FUTURE NEWS! · FUN GROUND 별내) + 제호 「별내 미래 신문」(명조) · THE BYEOLLAE TIMES · 겹줄 · 날짜 · 호수 · 특별판
//   / 「1면 특종」 띠 + 호칭(별내 출신 ○○) · 큰 제목(명조, 두 줄까지) · 부제
//   / 1면 사진 — 미래 장면 그림(LATER! · THEME! 배경) 위에 오늘 찍은 사람(기기 안에서 오려 낸 그대로 — 얼굴 · 옷을 바꾸지 않는다) · 사진 설명
//   / 기사 두 단(명조 본문) + 작은 상자(오늘의 별내 날씨 · 20년 전 오늘의 나) / 바닥 FUN GROUND 별내 · 「재미로 상상해 보는 미래 신문이에요」.
// 사진 칸 위에는 아무것도 그리지 않는다(글 · 도장이 얼굴을 가리지 않게). 테두리 없는 인쇄에서 가장자리가 조금 잘려도 되게 바깥 60px 은 비운다.
// cutout 이 없으면 견본(시작 화면) — 사진 칸에 「오늘의 내 사진이 여기에」 자리 표시.

import { drawCoverFocal } from '@/lib/photobooth/compose'
import { drawPeople } from '@/lib/funground/theme-photo'
import { NEWS_DISCLAIMER, type NewsSceneId, type NewsStory } from '@/lib/funground/news-template'
import { fontsReady, roundRect, wrapLines } from '@/app/kiosk/experience/kx-canvas'

const W = 1200
const H = 1800
const PAD = 60
const INNER = W - PAD * 2
const PAPER = '#f6f1e4'
const INK = '#1b1a17'
const SOFT = '#5d574c'
const RED = '#c4372c'
const ORANGE = '#ff6b2c'
const GREEN = '#18a874'
/** 사진 칸 아래 끝 · 기사 단 위아래 · 바닥 줄 */
const PHOTO_BOTTOM = 1272
const COLS_TOP = 1328
const COLS_BOTTOM = 1672
const FOOT_RULE = 1690
const SIDEBAR_W = 324
const COL_GAP = 30

/** 미래 장면 그림(세로 1200×1800)을 가로로 긴 사진 칸에 자를 때 위아래 기준(0 위 ~ 1 아래) · 사람 뒤 빛 */
const SCENE_FIT: Record<NewsSceneId, { focalY: number; glow: string }> = {
  city: { focalY: 0.44, glow: '#fff1d6' },
  sky: { focalY: 0.36, glow: '#ffffff' },
  space: { focalY: 0.47, glow: '#7fd8ff' },
  stadium: { focalY: 0.44, glow: '#fff1b8' },
  idol: { focalY: 0.4, glow: '#ff7ad9' },
  park: { focalY: 0.32, glow: '#ffffff' },
  magic: { focalY: 0.28, glow: '#ffd27a' },
}

export interface NewsPrintInput {
  story: NewsStory
  /** 20년 전 오늘의 나 — 고른 대답 */
  memo: { label: string; value: string }[]
  dateline: { date: string; weekday: string; issue: string; year: number }
  /** 찍은 날(오늘) */
  today: Date
  scene: NewsSceneId
  /** 미래 장면 그림 — 없으면 그라데이션 하늘 */
  backdrop: HTMLImageElement | null
  /** 기기 안에서 오려 낸 사람(투명 캔버스) — 없으면 견본 */
  cutout: HTMLCanvasElement | null
  /** 기사 쓴 곳 — 지면에 작게(AI 기자 · 편집부) */
  byline: string
}

/** 화면 본문 글꼴(next/font Wanted Sans) — 펀그라운드 틀(.fg-viewport)에서 읽는다 */
function sansFamily(): string {
  const root = document.querySelector('.fg-viewport')
  return root ? getComputedStyle(root).fontFamily : "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
}

/** 신문 명조(next/font Noto Serif KR — 루트 레이아웃의 --font-noto-serif-kr) */
function serifFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue('--font-noto-serif-kr').trim()
  return `${v ? `${v}, ` : ''}'Noto Serif KR', 'AppleMyungjo', 'Batang', serif`
}

/** 같은 그림이면 같은 종이 결 — 씨앗 난수 */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 종이 — 미색 바탕 · 잔 얼룩 · 섬유 결 · 가장자리 바램 */
function drawPaper(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  const rnd = seeded(2046)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(90, 70, 40, ${0.03 + rnd() * 0.06})`
    const s = rnd() < 0.85 ? 1.4 : 2.6
    ctx.fillRect(rnd() * W, rnd() * H, s, s)
  }
  ctx.strokeStyle = 'rgba(120, 95, 60, 0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W
    const y = rnd() * H
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 14)
    ctx.stroke()
  }
  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.72)
  edge.addColorStop(0, 'rgba(160, 120, 60, 0)')
  edge.addColorStop(1, 'rgba(160, 120, 60, 0.16)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, W, H)
}

/** 제목 — 한 줄에 들어가면 그대로, 아니면 낱말 사이에서 두 줄 길이가 가장 비슷한 곳을 고른다. 두 줄로도 안 되면 [] */
function balancedTwoLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  if (ctx.measureText(text).width <= width) return [text]
  const words = text.split(' ')
  let best: string[] = []
  let bestW = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width)
    if (w <= width && w < bestW) { best = [a, b]; bestW = w }
  }
  return best
}

/** 낱말 단위 줄 나누기 — 첫 줄만 들여 쓰기(indent px) */
function wrapIndented(ctx: CanvasRenderingContext2D, text: string, width: number, indent: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  const limit = () => (lines.length === 0 ? width - indent : width)
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= limit()) { line = next; continue }
    if (line) { lines.push(line); line = '' }
    // 낱말 하나가 줄보다 길면 글자 단위로
    if (ctx.measureText(word).width > limit()) {
      for (const ch of word) {
        if (line && ctx.measureText(line + ch).width > limit()) { lines.push(line); line = '' }
        line += ch
      }
    } else line = word
  }
  if (line) lines.push(line)
  return lines
}

export async function drawNewsPrint(input: NewsPrintInput): Promise<HTMLCanvasElement> {
  const { story, memo, dateline, today, scene, backdrop, cutout, byline } = input
  const sans = sansFamily()
  const serif = serifFamily()
  // 명조는 글자 묶음(unicode-range)마다 따로 내려온다 — 지면에 쓰는 글자로 불러 둔다
  const serifText = `별내 미래 신문 THE BYEOLLAE TIMES ${story.headline} ${story.article.join(' ')}`
  await fontsReady(`900 90px ${sans}`, `700 30px ${sans}`)
  try {
    await Promise.all([
      document.fonts.load(`900 96px ${serif}`, `별내 미래 신문 ${story.headline}`),
      document.fonts.load(`600 26px ${serif}`, 'THE BYEOLLAE TIMES'),
      document.fonts.load(`400 24px ${serif}`, serifText),
    ])
  } catch { /* 기본 명조로 그린다 */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d 를 쓸 수 없습니다')
  ctx.textBaseline = 'alphabetic'
  const S = (weight: number, size: number) => `${weight} ${size}px ${sans}`
  const M = (weight: number, size: number) => `${weight} ${size}px ${serif}`
  const write = (value: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = f
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
  }
  const rule = (y: number, h: number, x = PAD, w = INNER, color = INK) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  const spacing = (px: number) => {
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`
  }

  drawPaper(ctx)

  // ── 제호 · 귀퉁이 상자 ──
  const earW = 176
  const earTop = 74
  const earH = 128
  // 왼쪽 귀: FUTURE NEWS! 2046 특별판
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(PAD, earTop, earW, earH)
  write('FUTURE', PAD + earW / 2, earTop + 42, S(900, 30), RED, 'center')
  write('NEWS!', PAD + earW / 2, earTop + 76, S(900, 30), RED, 'center')
  rule(earTop + 90, 1.5, PAD + 22, earW - 44)
  write(`${dateline.year} 특별판`, PAD + earW / 2, earTop + 116, S(700, 20), SOFT, 'center')
  // 오른쪽 귀: FUN GROUND 별내
  const rx = W - PAD - earW
  ctx.strokeRect(rx, earTop, earW, earH)
  write('FUN', rx + earW / 2, earTop + 42, S(900, 30), ORANGE, 'center')
  write('GROUND', rx + earW / 2, earTop + 76, S(900, 30), GREEN, 'center')
  rule(earTop + 90, 1.5, rx + 22, earW - 44)
  write('별내에서 만든 신문', rx + earW / 2, earTop + 116, S(700, 18), SOFT, 'center')
  // 제호
  let mastSize = 98
  ctx.font = M(900, mastSize)
  while (ctx.measureText('별내 미래 신문').width > INNER - earW * 2 - 56 && mastSize > 70) { mastSize -= 2; ctx.font = M(900, mastSize) }
  write('별내 미래 신문', W / 2, 168, M(900, mastSize), INK, 'center')
  spacing(9)
  write('THE BYEOLLAE TIMES', W / 2, 212, M(600, 24), INK, 'center')
  spacing(0)
  rule(232, 6)
  rule(243, 2)
  write(`${dateline.date} ${dateline.weekday}`, PAD, 278, S(700, 24), INK)
  write(dateline.issue, W / 2, 278, S(700, 24), INK, 'center')
  write('미래에서 온 특별판', W - PAD, 278, S(700, 24), INK, 'right')
  rule(294, 2)

  // ── 1면 특종 · 호칭 · 기사 쓴 곳 ──
  let y = 322
  ctx.font = S(800, 24)
  const tagW = ctx.measureText('1면 특종').width + 28
  ctx.fillStyle = RED
  ctx.fillRect(PAD, y, tagW, 40)
  write('1면 특종', PAD + 14, y + 29, S(800, 24), '#ffffff')
  write(story.kicker, PAD + tagW + 16, y + 30, S(800, 30), RED)
  write(byline, W - PAD, y + 29, S(600, 21), SOFT, 'right')
  y += 40

  // ── 큰 제목(명조) — 한 줄이면 한 줄, 아니면 두 줄을 비슷한 길이로(신문 제목처럼). 안 들어가면 글자를 줄인다 ──
  let hs = 90
  let headLines: string[] = []
  for (; hs >= 64; hs -= 2) {
    ctx.font = M(900, hs)
    headLines = balancedTwoLines(ctx, story.headline, INNER)
    if (headLines.length) break
  }
  if (!headLines.length) { hs = 64; ctx.font = M(900, hs); headLines = wrapLines(ctx, story.headline, INNER) }
  const headLH = Math.round(hs * 1.18)
  y += Math.round(hs * 1.02)
  ctx.font = M(900, hs)
  spacing(-1)
  for (const line of headLines) { write(line, PAD - 2, y, M(900, hs), INK); y += headLH }
  spacing(0)
  y -= headLH

  // ── 부제 — 왼쪽 빨간 막대 ──
  let ss = 32
  let subLines: string[] = []
  for (; ss >= 26; ss -= 2) {
    ctx.font = S(700, ss)
    subLines = wrapLines(ctx, story.subhead, INNER - 26)
    if (subLines.length <= 2) break
  }
  const subLH = Math.round(ss * 1.36)
  y += 26
  const subTop = y
  y += ss
  for (const line of subLines) { write(line, PAD + 26, y, S(700, ss), '#3a352d'); y += subLH }
  y -= subLH
  ctx.fillStyle = RED
  ctx.fillRect(PAD, subTop - 2, 7, y - subTop + 12)

  // ── 1면 사진 — 미래 장면 + 오려 낸 사람(그대로) ──
  const box = { x: PAD, y: y + 26, w: INNER, h: PHOTO_BOTTOM - (y + 26) }
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  const fit = SCENE_FIT[scene]
  if (backdrop) drawCoverFocal(ctx, backdrop, box.x, box.y, box.w, box.h, { focalY: fit.focalY })
  else {
    const sky = ctx.createLinearGradient(0, box.y, 0, box.y + box.h)
    sky.addColorStop(0, '#7fb6ff')
    sky.addColorStop(1, '#ffe2c4')
    ctx.fillStyle = sky
    ctx.fillRect(box.x, box.y, box.w, box.h)
  }
  if (cutout) {
    // 무리(1~4명)를 사진 칸 아래 가운데에 — 가로로 넓은 무리는 폭 가득, 원본보다 2.4배 넘게 키우지 않는다
    const wide = cutout.width / cutout.height > 1.8
    const scale = Math.min((box.w * (wide ? 0.98 : 0.9)) / cutout.width, (box.h * 0.92) / cutout.height, 2.4)
    const width = cutout.width * scale
    const height = cutout.height * scale
    // 원본 사진 아래 끝에서 잘린 몸(흐린 경계)은 사진 칸 밖으로 조금 내려 가린다
    const bottom = box.y + box.h + Math.round(height * 0.03)
    drawPeople(ctx, cutout, { cx: box.x + box.w / 2, cy: bottom - height / 2, width, height, bottom }, fit.glow)
  } else {
    // 견본 — 사람 자리 표시(점선 실루엣 · 안내)
    const cx = box.x + box.w / 2
    const bh = box.h * 0.78
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.lineWidth = 6
    ctx.setLineDash([18, 12])
    ctx.beginPath()
    ctx.arc(cx, box.y + box.h - bh + bh * 0.24, bh * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    const sw = bh * 0.62
    const top = box.y + box.h - bh * 0.5
    ctx.moveTo(cx - sw / 2, box.y + box.h + 10)
    ctx.quadraticCurveTo(cx - sw / 2, top, cx, top)
    ctx.quadraticCurveTo(cx + sw / 2, top, cx + sw / 2, box.y + box.h + 10)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 14
    write('오늘의 내 사진이 여기에!', cx, box.y + 70, S(900, 44), '#ffffff', 'center')
    ctx.restore()
  }
  ctx.restore()
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(box.x + 1.5, box.y + 1.5, box.w - 3, box.h - 3)

  // 사진 설명 · 사진 출처
  // (AI 가 쓴 설명이 길면 글자를 줄이고, 그래도 길면 오른쪽 출처를 뺀다)
  const credit = `사진 · FUN GROUND 별내(${today.getFullYear()}년 촬영)`
  ctx.font = S(600, 19)
  const creditW = ctx.measureText(credit).width + 28
  let cs = 23
  for (; cs > 18; cs -= 1) { ctx.font = S(700, cs); if (ctx.measureText(story.caption).width <= INNER - creditW) break }
  const showCredit = ctx.measureText(story.caption).width <= INNER - creditW
  write(story.caption, PAD, PHOTO_BOTTOM + 34, S(700, cs), SOFT)
  if (showCredit) write(credit, W - PAD, PHOTO_BOTTOM + 34, S(600, 19), SOFT, 'right')
  rule(COLS_TOP - 14, 2)

  // ── 기사 두 단(명조) — 두 단 높이를 비슷하게 나누고, 안 들어가면 글자를 줄인다 ──
  const colsW = INNER - SIDEBAR_W - COL_GAP
  const colW = (colsW - COL_GAP) / 2
  const colsH = COLS_BOTTOM - COLS_TOP
  type Item = { text: string; gap: boolean; first: boolean }
  let as = 28
  let lh = 0
  let cols: Item[][] = []
  for (; as >= 20; as -= 1) {
    ctx.font = M(400, as)
    lh = Math.round(as * 1.56)
    const items: Item[] = story.article.flatMap((p, pi) => wrapIndented(ctx, p, colW, as).map((text, li) => ({ text, gap: pi > 0 && li === 0, first: li === 0 })))
    // 단 높이 — 맨 위 줄의 문단 사이 빈칸은 빼고, 마지막 줄은 글자 높이만
    const height = (part: Item[]) => part.reduce((h, it, i) => h + (i === 0 ? 0 : lh + (it.gap ? lh * 0.45 : 0)), part.length ? as : 0)
    let bestH = Infinity
    for (let k = 1; k <= items.length; k++) {
      const a = items.slice(0, k)
      const b = items.slice(k)
      const h = Math.max(height(a), height(b))
      if (h <= colsH && h < bestH) { bestH = h; cols = [a, b] }
    }
    if (bestH < Infinity) break
  }
  ctx.font = M(400, as)
  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  cols.forEach((part, ci) => {
    let cy = COLS_TOP + as
    part.forEach((it, i) => {
      if (i > 0) cy += lh + (it.gap ? lh * 0.45 : 0)
      ctx.fillText(it.text, PAD + ci * (colW + COL_GAP) + (it.first ? as : 0), cy)
    })
  })
  // 단 사이 · 상자 앞 세로줄
  rule(COLS_TOP, COLS_BOTTOM - COLS_TOP, PAD + colW + COL_GAP / 2 - 0.5, 1, 'rgba(27, 26, 23, 0.45)')

  // ── 작은 상자 — 오늘의 별내 날씨 · 20년 전 오늘의 나 ──
  const sx = W - PAD - SIDEBAR_W
  const sTop = COLS_TOP - 2
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(sx, sTop, SIDEBAR_W, COLS_BOTTOM - sTop + 4)
  ctx.fillStyle = INK
  ctx.fillRect(sx, sTop, SIDEBAR_W, 42)
  // 해 그림
  ctx.fillStyle = '#ffc83d'
  ctx.beginPath()
  ctx.arc(sx + 26, sTop + 21, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffc83d'
  ctx.lineWidth = 2.5
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(sx + 26 + Math.cos(a) * 12, sTop + 21 + Math.sin(a) * 12)
    ctx.lineTo(sx + 26 + Math.cos(a) * 16, sTop + 21 + Math.sin(a) * 16)
    ctx.stroke()
  }
  let ts = 22
  for (; ts > 16; ts -= 1) { ctx.font = S(800, ts); if (ctx.measureText(story.sidebar.title).width <= SIDEBAR_W - 60) break }
  write(story.sidebar.title, sx + 48, sTop + 29, S(800, ts), PAPER)
  let ws = 23
  let weather: string[] = []
  for (; ws >= 19; ws -= 1) {
    ctx.font = S(700, ws)
    weather = wrapLines(ctx, story.sidebar.text, SIDEBAR_W - 32)
    if (weather.length <= 2) break
  }
  weather = weather.slice(0, 3)
  let wy = sTop + 42 + 34
  for (const line of weather) { write(line, sx + 16, wy, S(700, ws), INK); wy += Math.round(ws * 1.36) }
  // 20년 전 오늘의 나
  let my = wy + 2
  rule(my, 1.5, sx + 14, SIDEBAR_W - 28)
  my += 32
  write(`${today.getFullYear()}년 오늘의 나`, sx + 16, my, S(900, 23), RED)
  my += 8
  const rowH = Math.min(56, (COLS_BOTTOM - my) / memo.length)
  for (const row of memo) {
    write(row.label, sx + 16, my + 23, S(700, 19), SOFT)
    ctx.font = S(800, 23)
    let v = row.value
    while (ctx.measureText(v).width > SIDEBAR_W - 32 && v.length > 2) v = `${v.slice(0, -2)}…`
    write(v, sx + 16, my + 49, S(800, 23), INK)
    my += rowH
  }

  // ── 바닥 ──
  rule(FOOT_RULE, 3)
  const fy = FOOT_RULE + 42
  write('FUN', PAD, fy, S(900, 30), ORANGE)
  ctx.font = S(900, 30)
  let fx = PAD + ctx.measureText('FUN').width + 8
  write('GROUND', fx, fy, S(900, 30), GREEN)
  fx += ctx.measureText('GROUND').width + 14
  write(`별내 · FUTURE NEWS! · 찍은 날 ${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`, fx, fy - 2, S(700, 20), SOFT)
  // 재미로 상상해 보는 미래 신문이에요 — 노란 띠
  ctx.font = S(800, 22)
  const dw = ctx.measureText(NEWS_DISCLAIMER).width + 32
  ctx.fillStyle = '#ffc83d'
  roundRect(ctx, W - PAD - dw, fy - 30, dw, 40, 20)
  ctx.fill()
  write(NEWS_DISCLAIMER, W - PAD - dw / 2, fy - 3, S(800, 22), INK, 'center')

  return canvas
}
