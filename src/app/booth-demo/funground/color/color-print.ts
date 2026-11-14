// 펀그라운드 B안 퍼스널 컬러 — 4×6 사진 인쇄용 「퍼스널 컬러 카드」(세로 1200×1800 JPEG, 300dpi 4×6).
// 결과 화면의 「사진 인쇄하기」가 만든다 → FgPrintButton(미리보기 · QR). 설치 기기에서는 같은 그림을 포토 프린터로 보낸다.
// 로고 자리(임시 FUN GROUND 별내 글자) · 날짜 · COLOR! 제목 · 유형 이름 · 별명 · 가운데 찍은 사진(지금 고른 색으로 칠한 옷,
// 옷을 못 찾았으면 얼굴 아래 천) 양옆 어울리는 색 6 + 6(이름, 고른 색에 고리) · 입는 법 2~3 · 「재미로 보는 결과」. 점수 · 순위는 넣지 않는다(9~19세 체험).
// 글은 color-texts.ts 표 그대로(AI 가 쓴 글이 아니다). 테두리 없는 인쇄에서 가장자리가 조금 잘려도 되게 바깥 64px 은 비운다.

import { canvasBlob, drawCover, fontsReady, loadImage, makeCanvas, roundRect, wrapLines } from '@/app/kiosk/experience/kx-canvas'
import { FG_COLOR_DISCLAIMER, UNDERTONE_LABEL, type FgColorText } from '@/lib/funground/color-texts'

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
/** 가운데 사진 칸(세로 3:4 — 찍은 사진과 같은 비율) 높이 — 아래 입는 법이 짧으면 크게, 길면(3개 × 두 줄) 줄인다 */
const PHOTO_MAX_H = 800
const PHOTO_MIN_H = 720

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

export async function drawColorPrint({ text, photo, overlay, picked, tone, date }: {
  text: FgColorText
  /** 찍은 사진(data: JPEG, 세로 3:4) */
  photo: string
  /** 고른 색으로 칠한 옷만 담은 투명 PNG(blob:) — 없으면 얼굴 아래에 고른 색 천을 두른다(화면과 같다) */
  overlay: string | null
  /** 지금 고른 색 */
  picked: { hex: string; name: string }
  /** 화면 대표색 */
  tone: string
  date: Date
}): Promise<string> {
  const family = stageFont()
  await fontsReady(`800 80px ${family}`, `700 30px ${family}`, `600 26px ${family}`)
  const [picture, clothes] = await Promise.all([loadImage(photo), overlay ? loadImage(overlay).catch(() => null) : Promise.resolve(null)])
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
  ctx.font = font(900, 54)
  write('FUN', PAD, y, font(900, 54), ORANGE)
  let x = PAD + ctx.measureText('FUN').width + 12
  write('GROUND', x, y, font(900, 54), GREEN)
  ctx.font = font(900, 54)
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

  // ── 제목: COLOR! 나에게 어울리는 색 ──
  y = 214
  write('COLOR!', PAD, y, font(900, 84), tone)
  ctx.font = font(900, 84)
  write('나에게 어울리는 색', PAD + ctx.measureText('COLOR!').width + 24, y - 6, font(800, 44), INK)

  // ── 유형 이름 · 웜쿨 띠 · 별명 ──
  y = 330
  const nameSize = fitSize(text.name, 900, 100, INNER - 330, 64)
  write(text.name, PAD, y, font(900, nameSize), INK)
  ctx.font = font(900, nameSize)
  const badgeX = PAD + ctx.measureText(text.name).width + 28
  const badge = UNDERTONE_LABEL[text.undertone]
  ctx.font = font(900, 30)
  const badgeW = ctx.measureText(badge).width + 48
  ctx.fillStyle = text.undertone === 'warm' ? '#ffe7d6' : '#dfe9ff'
  roundRect(ctx, badgeX, y - 62, badgeW, 58, 29)
  ctx.fill()
  write(badge, badgeX + 24, y - 22, font(900, 30), text.undertone === 'warm' ? '#b4471a' : '#2a4fb3')
  y += 70
  write(`“${text.nickname}”`, PAD, y, font(900, fitSize(`“${text.nickname}”`, 900, 48, INNER, 34)), tone)

  // ── 입는 법을 먼저 재서(들어가는 만큼 2~3개) 사진 크기를 정한다 ──
  const photoTop = 446
  const footY = H - PAD - 6
  const cardBottomMax = footY - 60
  const tipFont = font(700, 31)
  const tipLine = 44
  const head = 96
  const tipW = INNER - 64 - 48
  const tips: string[][] = []
  let used = head
  for (const tip of text.tips) {
    ctx.font = tipFont
    const lines = wrapLines(ctx, tip, tipW)
    const need = lines.length * tipLine + 16
    if (tips.length >= 2 && photoTop + PHOTO_MIN_H + 44 + used + need + 20 > cardBottomMax) break
    tips.push(lines)
    used += need
  }
  const cardH = used + 20
  const photoH = Math.max(PHOTO_MIN_H, Math.min(PHOTO_MAX_H, cardBottomMax - cardH - 44 - photoTop))
  const photoW = Math.round((photoH * 3) / 4)

  // ── 가운데 사진(3:4) · 양옆 어울리는 색 6 + 6 — 결과 화면과 같은 짜임 ──
  const photoX = (W - photoW) / 2
  ctx.save()
  ctx.shadowColor = 'rgba(23, 33, 58, 0.18)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, photoX - 12, photoTop - 12, photoW + 24, photoH + 24, 40)
  ctx.fill()
  ctx.restore()
  ctx.save()
  roundRect(ctx, photoX, photoTop, photoW, photoH, 30)
  ctx.clip()
  ctx.fillStyle = '#1b2236'
  ctx.fillRect(photoX, photoTop, photoW, photoH)
  drawCover(ctx, picture, photoX, photoTop, photoW, photoH)
  if (clothes) {
    drawCover(ctx, clothes, photoX, photoTop, photoW, photoH)
  } else {
    // 화면의 .fcl-cape 와 같은 모양 — 사진 폭보다 넓은 둥근 천을 아래 36% 에
    const top = photoTop + photoH * 0.74
    const rx = photoW * 0.62
    const ry = photoH * 0.36 * 0.7
    ctx.fillStyle = picked.hex
    ctx.beginPath()
    ctx.ellipse(photoX + photoW / 2, top + ry, rx, ry, 0, Math.PI, 0)
    ctx.lineTo(photoX + photoW / 2 + rx, photoTop + photoH)
    ctx.lineTo(photoX + photoW / 2 - rx, photoTop + photoH)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  const sideW = photoX - 12 - 20 - PAD
  // 색 칸은 사진 위아래로 조금 더 넓게 써서 이름과 다음 동그라미 사이를 띄운다
  const colTop = photoTop - 14
  const cellH = (photoH + 28) / 6
  const dot = 72
  text.colors.forEach((c, i) => {
    const cx = i < 6 ? PAD + sideW / 2 : W - PAD - sideW / 2
    const top = colTop + cellH * (i % 6)
    const cy = top + 10 + dot / 2
    const on = c.hex === picked.hex
    if (on) {
      ctx.strokeStyle = tone
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(cx, cy, dot / 2 + 8, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = c.hex
    ctx.beginPath()
    ctx.arc(cx, cy, dot / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(23, 33, 58, 0.16)'
    ctx.lineWidth = 2
    ctx.stroke()
    const size = fitSize(c.name, 800, 27, sideW, 20)
    write(c.name, cx, cy + dot / 2 + 36, font(on ? 900 : 800, size), on ? tone : INK, 'center')
  })

  // ── 이렇게 입어 보세요 ──
  const cardTop = photoTop + photoH + 44
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, PAD, cardTop, INNER, cardH, 32)
  ctx.fill()
  write('이렇게 입어 보세요', PAD + 36, cardTop + 66, font(900, 38), tone)
  let ty = cardTop + head + 34
  for (const lines of tips) {
    ctx.fillStyle = tone
    ctx.beginPath()
    ctx.arc(PAD + 48, ty - 11, 7, 0, Math.PI * 2)
    ctx.fill()
    lines.forEach((line, i) => write(line, PAD + 76, ty + i * tipLine, tipFont, INK))
    ty += lines.length * tipLine + 16
  }

  // ── 아래 말 ──
  ctx.fillStyle = LINE
  ctx.fillRect(PAD, footY - 46, INNER, 2)
  write(FG_COLOR_DISCLAIMER, W / 2, footY, font(700, 28), SOFT, 'center')

  return blobToDataUrl(await canvasBlob(canvas, 'image/jpeg', 0.92))
}
