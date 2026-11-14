// 펀그라운드 B안 미래 직업 탐색(NEXT!) — 4×6 사진 인쇄용 「미래 직업 탐색 카드」(세로 1200×1800 JPEG, 300dpi 4×6).
// 결과 화면의 「사진 인쇄하기」가 만든다 → FgPrintButton(미리보기 · QR). 설치 기기에서는 같은 그림을 포토 프린터로 보낸다.
// 짜임은 퍼스널 컬러 카드(color/color-print.ts)와 같은 머리 · 바탕 · 아래 말:
//   로고 자리(임시 FUN GROUND 별내 글자) · 날짜 · NEXT! 제목 / 왼쪽 찍은 사진(세로 3:4) · 오른쪽 관심 축 태그 · 재미로 보는 풀이(제목 · 들어가는 만큼의 문장)
//   / 탐색해 볼 직업 셋(축 그림 · 이름 · 한 줄) / 작은 첫 도전 / 「재미로 보는 탐색 · 적성 검사가 아니에요」.
// 글은 키오스크 text.ts · career-combos.ts 표 그대로(AI 가 쓴 글이 아니다). 기기 안 캔버스로만 그린다.
// 테두리 없는 인쇄에서 가장자리가 조금 잘려도 되게 바깥 64px 은 비운다.

import { canvasBlob, drawCover, fontsReady, loadImage, makeCanvas, roundRect, wrapLines } from '@/app/kiosk/experience/kx-canvas'

const W = 1200
const H = 1800
const PAD = 64
const INNER = W - PAD * 2
const PAPER = '#fff8ef'
const INK = '#17213a'
const SOFT = '#56607a'
const LINE = '#e4dccf'
const ORANGE = '#ff6b2c'
const GREEN = '#18a874'
const NEXT_ORANGE = '#f2702a'
/** 왼쪽 사진 칸(세로 3:4 — 찍은 사진과 같은 비율) */
const PHOTO_W = 456
const PHOTO_H = 608
export const CAREER_DISCLAIMER = '재미로 보는 탐색 · 적성 검사가 아니에요'

export interface CareerPrintInput {
  /** 찍은 사진(data: JPEG, 세로 3:4) — 사진 없이 계속했으면 null */
  photo: string | null
  /** 관심 축 태그(앞 둘) — 예: ['만들기', '문제 풀기'] */
  tags: string[]
  mbti: string | null
  /** 재미로 보는 풀이 — 제목 · 축 짝(「만들기 × 문제 풀기」) · 문장들 */
  combo: { title: string; axes: string; body: string[] }
  /** 탐색해 볼 직업 셋 — 이름 · 한 줄 · 축 그림 주소 */
  careers: { name: string; desc: string; art: string }[]
  /** 작은 첫 도전(1위 직업) */
  first: string
  /** 화면 대표색(코발트) */
  tone: string
  date: Date
}

/** 화면 글꼴 그대로(next/font 의 Wanted Sans) — 펀그라운드 틀(.fg-viewport)에서 읽는다 */
function stageFont(): string {
  const root = document.querySelector('.fg-viewport')
  return root ? getComputedStyle(root).fontFamily : "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')))
  reader.onerror = () => reject(new Error('read failed'))
  reader.readAsDataURL(blob)
})

/** 「 · 」가 줄 맨 앞에 오지 않게 앞 낱말에 붙여 줄을 나눈다 */
const wrapKeepDot = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) =>
  wrapLines(ctx, text.replace(/ · /g, ' · '), maxWidth).map((line) => line.replace(/ /g, ' '))

export async function drawCareerPrint(input: CareerPrintInput): Promise<string> {
  const { photo, tags, mbti, combo, careers, first, tone, date } = input
  const family = stageFont()
  await fontsReady(`900 80px ${family}`, `800 40px ${family}`, `700 30px ${family}`, `600 26px ${family}`)
  const [picture, ...arts] = await Promise.all([
    photo ? loadImage(photo).catch(() => null) : Promise.resolve(null),
    ...careers.map((c) => loadImage(c.art).catch(() => null)),
  ])
  const [canvas, ctx] = makeCanvas(W, H)
  ctx.textBaseline = 'alphabetic'

  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`
  const write = (value: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = f
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
  }
  /** 폭에 들어가게 글자 크기를 줄인다 */
  const fitSize = (value: string, weight: number, size: number, maxW: number, min: number) => {
    let s = size
    while (s > min) {
      ctx.font = font(weight, s)
      if (ctx.measureText(value).width <= maxW) break
      s -= 2
    }
    return s
  }

  // 바탕 · 위 색 띠
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, W, 22)

  // ── 머리: 로고 자리(임시 글자) · 날짜 ──
  let y = 120
  write('FUN', PAD, y, font(900, 54), ORANGE)
  let x = PAD + ctx.measureText('FUN').width + 12
  write('GROUND', x, y, font(900, 54), GREEN)
  x += ctx.measureText('GROUND').width + 18
  ctx.font = font(800, 26)
  const placeW = ctx.measureText('별내').width + 28
  ctx.save()
  ctx.setLineDash([8, 6])
  ctx.strokeStyle = '#c9bfae'
  ctx.lineWidth = 3
  roundRect(ctx, x, y - 36, placeW, 46, 12)
  ctx.stroke()
  ctx.restore()
  write('별내', x + 14, y - 3, font(800, 26), SOFT)
  write(new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date), W - PAD, y - 4, font(700, 30), SOFT, 'right')

  // ── 제목: NEXT! 미래 직업 탐색 ──
  y = 214
  write('NEXT!', PAD, y, font(900, 84), tone)
  ctx.font = font(900, 84)
  write('미래 직업 탐색', PAD + ctx.measureText('NEXT!').width + 24, y - 6, font(800, 44), INK)

  // ── 왼쪽 사진(3:4) — 흰 테두리 · 그림자 ──
  const photoTop = 276
  const photoX = PAD + 12
  ctx.save()
  ctx.shadowColor = 'rgba(23, 33, 58, 0.18)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, photoX - 12, photoTop - 12, PHOTO_W + 24, PHOTO_H + 24, 40)
  ctx.fill()
  ctx.restore()
  ctx.save()
  roundRect(ctx, photoX, photoTop, PHOTO_W, PHOTO_H, 30)
  ctx.clip()
  if (picture) {
    drawCover(ctx, picture, photoX, photoTop, PHOTO_W, PHOTO_H)
  } else {
    // 사진 없이 계속 — 연한 바탕에 사람 모양
    ctx.fillStyle = '#e4edfb'
    ctx.fillRect(photoX, photoTop, PHOTO_W, PHOTO_H)
    ctx.fillStyle = '#b9cbea'
    ctx.beginPath()
    ctx.arc(photoX + PHOTO_W / 2, photoTop + PHOTO_H * 0.38, PHOTO_W * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(photoX + PHOTO_W / 2, photoTop + PHOTO_H * 0.98, PHOTO_W * 0.4, PHOTO_H * 0.32, 0, Math.PI, 0)
    ctx.fill()
  }
  ctx.restore()

  // ── 오른쪽: 관심 축 태그 · 재미로 보는 풀이 ──
  const sideX = photoX + PHOTO_W + 12 + 44
  const sideW = W - PAD - sideX
  const sideBottom = photoTop + PHOTO_H
  y = photoTop
  {
    const chips = [...tags.map((t) => ({ text: `#${t}`, warm: false })), ...(mbti ? [{ text: mbti, warm: true }] : [])]
    const h = 58
    let cx = sideX
    ctx.font = font(800, 30)
    for (const chip of chips) {
      const w = ctx.measureText(chip.text).width + 44
      if (cx + w > W - PAD) { cx = sideX; y += h + 12 }
      ctx.fillStyle = chip.warm ? '#fde9dc' : '#e4ecf8'
      roundRect(ctx, cx, y, w, h, h / 2)
      ctx.fill()
      write(chip.text, cx + 22, y + 40, font(800, 30), chip.warm ? NEXT_ORANGE : tone)
      cx += w + 12
    }
    y += h + 30
  }
  // 「재미로 보는 풀이예요」 노란 띠
  ctx.font = font(800, 26)
  const funW = ctx.measureText('재미로 보는 풀이예요').width + 40
  ctx.fillStyle = '#ffc83d'
  roundRect(ctx, sideX, y, funW, 48, 24)
  ctx.fill()
  write('재미로 보는 풀이예요', sideX + 20, y + 34, font(800, 26), INK)
  y += 48 + 64
  // 제목 — 두 줄까지(넘으면 글자를 줄인다)
  let titleSize = 60
  ctx.font = font(900, titleSize)
  while (titleSize > 44 && wrapKeepDot(ctx, combo.title, sideW).length > 2) { titleSize -= 4; ctx.font = font(900, titleSize) }
  for (const line of wrapKeepDot(ctx, combo.title, sideW)) {
    write(line, sideX, y, font(900, titleSize), INK)
    y += Math.round(titleSize * 1.2)
  }
  write(combo.axes, sideX, y - 4, font(800, 30), tone)
  y += 58
  // 풀이 문장 — 사진 아래 끝까지 들어가는 만큼(첫 문장은 늘)
  const bodyFont = font(600, 30)
  const bodyLine = 45
  ctx.font = bodyFont
  let bodyLines: string[] = []
  for (const sentence of combo.body) {
    ctx.font = bodyFont
    const next = [...bodyLines, ...wrapKeepDot(ctx, sentence, sideW)]
    if (bodyLines.length && y + (next.length - 1) * bodyLine > sideBottom) break
    bodyLines = next
  }
  bodyLines.forEach((line, i) => write(line, sideX, y + i * bodyLine, bodyFont, '#33415f'))

  // ── 탐색해 볼 직업 셋 ──
  y = photoTop + PHOTO_H + 12 + 84
  write('탐색해 볼 직업', PAD, y, font(900, 44), INK)
  y += 30
  const rowH = 128
  const artSize = 106
  careers.forEach((career, i) => {
    const top = y + i * (rowH + 12)
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, PAD, top, INNER, rowH, 32)
    ctx.fill()
    const art = arts[i]
    const ax = PAD + 12
    const ay = top + (rowH - artSize) / 2
    ctx.save()
    roundRect(ctx, ax, ay, artSize, artSize, 24)
    ctx.clip()
    ctx.fillStyle = '#e4ecf8'
    ctx.fillRect(ax, ay, artSize, artSize)
    if (art) drawCover(ctx, art, ax, ay, artSize, artSize)
    ctx.restore()
    const tx = ax + artSize + 28
    const tw = W - PAD - 28 - tx
    const no = String(i + 1).padStart(2, '0')
    write(no, tx, top + 58, font(900, 34), i === 0 ? NEXT_ORANGE : tone)
    ctx.font = font(900, 34)
    const nameX = tx + ctx.measureText(no).width + 16
    write(career.name, nameX, top + 58, font(900, fitSize(career.name, 900, 46, W - PAD - 28 - nameX, 34)), INK)
    write(career.desc, tx, top + 100, font(600, fitSize(career.desc, 600, 30, tw, 24)), SOFT)
  })
  y += careers.length * (rowH + 12) + 10

  // ── 작은 첫 도전 — 전구 · 두 줄까지 ──
  const footY = H - PAD - 6
  {
    const top = y
    const textX = PAD + 132
    const textW = W - PAD - 36 - textX
    let size = 36
    ctx.font = font(800, size)
    while (size > 28 && wrapKeepDot(ctx, first, textW).length > 2) { size -= 2; ctx.font = font(800, size) }
    const lines = wrapKeepDot(ctx, first, textW)
    const lh = Math.round(size * 1.35)
    const boxH = 34 + 40 + 16 + lines.length * lh + 18
    ctx.fillStyle = '#fff3ea'
    roundRect(ctx, PAD, top, INNER, boxH, 32)
    ctx.fill()
    // 전구 — 동그라미 · 목 · 받침(선)
    const cx = PAD + 66
    const cy = top + boxH / 2 - 10
    ctx.strokeStyle = NEXT_ORANGE
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, 24, Math.PI * 0.78, Math.PI * 2.22)
    ctx.lineTo(cx + 11, cy + 36)
    ctx.lineTo(cx - 11, cy + 36)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 11, cy + 47); ctx.lineTo(cx + 11, cy + 47)
    ctx.moveTo(cx - 6, cy + 57); ctx.lineTo(cx + 6, cy + 57)
    ctx.stroke()
    write('작은 첫 도전', textX, top + 34 + 30, font(900, 32), NEXT_ORANGE)
    lines.forEach((line, i) => write(line, textX, top + 34 + 40 + 16 + size * 0.9 + i * lh, font(800, size), INK))
  }

  // ── 아래 말 ──
  ctx.fillStyle = LINE
  ctx.fillRect(PAD, footY - 46, INNER, 2)
  write(CAREER_DISCLAIMER, W / 2, footY, font(700, 28), SOFT, 'center')

  return blobToDataUrl(await canvasBlob(canvas, 'image/jpeg', 0.92))
}
