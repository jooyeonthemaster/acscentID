// 퍼스널 컬러 결과 카드 — 노트북 화면의 [휴대폰으로 받기]가 올리는 그림 한 장(1080 폭 JPG, Chromatic Archive 색).
// 유형 · 한 줄 · 잘 어울리는 색 8 · 피할 색 4(이름) · 톤 눈금 · 스타일 가이드 · 키워드.
// 손님 사진(진단에 쓴 그 사진)을 머리 오른쪽에 넣는다(2026-10-29 사용자 지시: "결과물에 본인을 찍은 사진이 있도록").
// 손님이 [휴대폰으로 받기]를 누를 때만 올라가 24시간 보관된다 — 기록·영수증에는 여전히 넣지 않는다.

import { personalColorType } from '@/lib/kiosk/color-types'
import type { ColorGaugeKey, ProgramText } from '@/lib/kiosk/program-i18n'
import type { ProgramUiText } from '@/lib/kiosk/program-ui-i18n'
import type { ColorAnalysisResult } from '@/types/analysis'
import { canvasBlob, drawCover, fontsReady, loadImage, makeCanvas, roundRect, wrapLines } from '../experience/kx-canvas'

const W = 1080
const PAD = 84
const INNER = W - PAD * 2
const PAPER = '#fff8e8'
const CARD = '#fffcf4'
const INK = '#272f73'
const SOFT = '#586180'
const LINE = '#c4c7d9'
const GAUGES: ColorGaugeKey[] = ['warmth', 'brightness', 'clarity', 'contrast']
const STYLE_KEYS = ['makeup', 'hair', 'fashion', 'accessory'] as const

/** 화면 글꼴 그대로 — 한자권 언어는 루트가 그 언어 글꼴로 바뀌어 있다 */
function screenFont(): string {
  const root = document.querySelector('.ksk-root')
  return root ? getComputedStyle(root).fontFamily : 'sans-serif'
}

/** 머리 오른쪽 사진 칸(3:4) */
const PHOTO_W = 300
const PHOTO_H = 400

export async function drawColorCard({ result, px, ui, name, date, photo }: {
  result: ColorAnalysisResult
  px: ProgramText
  ui: ProgramUiText
  name: string
  date: string
  /** 진단에 쓴 손님 사진(data: 주소) — 없으면 글만 */
  photo: string | null
}): Promise<Blob> {
  const family = screenFont()
  await fontsReady(`900 80px ${family}`, `700 30px ${family}`, `500 28px ${family}`)
  const picture = photo ? await loadImage(photo).catch(() => null) : null
  // 사진이 있으면 머리 글은 사진 왼쪽 폭에서 줄을 나눈다
  const headW = picture ? INNER - PHOTO_W - 40 : INNER
  const tx = px.color
  const d = result.colorDiagnosis
  const type = personalColorType(d.typeId)
  const names = (avoid: boolean) => {
    const list = avoid ? d.avoidColorNames : d.bestColorNames
    return list.length === (avoid ? type.avoid : type.best).length ? list : null
  }

  // 두 번 그린다 — 처음은 높이만 재고(draw=false), 그 높이로 캔버스를 만들어 다시 그린다
  const paint = (ctx: CanvasRenderingContext2D, draw: boolean): number => {
    const text = (value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
      if (!draw) return
      ctx.font = font
      ctx.fillStyle = color
      ctx.textAlign = align
      ctx.fillText(value, x, y)
    }
    const lines = (value: string, x: number, y: number, width: number, font: string, color: string, height: number) => {
      ctx.font = font
      const wrapped = wrapLines(ctx, value, width)
      wrapped.forEach((line, i) => text(line, x, y + i * height, font, color))
      return y + wrapped.length * height
    }
    const rule = (y: number) => {
      if (!draw) return
      ctx.fillStyle = LINE
      ctx.fillRect(PAD, y, INNER, 2)
    }
    ctx.textBaseline = 'top'

    let y = 92
    text('AI PERSONAL COLOR', PAD, y, `800 24px ${family}`, INK)
    text(date, W - PAD, y, `600 22px ${family}`, SOFT, 'right')
    y += 54
    const photoTop = y
    if (picture && draw) {
      // 흰 테 · 옅은 그림자 · 둥근 모서리 안에 3:4 로 잘라(얼굴이 위쪽이라 위를 조금 더 남긴다)
      const px0 = W - PAD - PHOTO_W
      ctx.save()
      ctx.shadowColor = 'rgba(39, 47, 115, 0.22)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 8
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, px0 - 10, photoTop - 10, PHOTO_W + 20, PHOTO_H + 20, 18)
      ctx.fill()
      ctx.restore()
      ctx.save()
      roundRect(ctx, px0, photoTop, PHOTO_W, PHOTO_H, 12)
      ctx.clip()
      drawCover(ctx, picture, px0, photoTop, PHOTO_W, PHOTO_H, 0.3)
      ctx.restore()
    }
    text(ui.color.resultKicker(name), PAD, y, `700 32px ${family}`, SOFT)
    y += 56
    y = lines(tx.typeNames[d.typeId], PAD, y, headW, `900 84px ${family}`, INK, 96) + 10
    // 웜/쿨 띠
    ctx.font = `800 28px ${family}`
    const badge = tx.undertone[d.undertone]
    const badgeW = ctx.measureText(badge).width + 44
    if (draw) {
      ctx.fillStyle = d.undertone === 'warm' ? '#ed573c' : '#3d6fb6'
      roundRect(ctx, PAD, y, badgeW, 50, 25)
      ctx.fill()
    }
    text(badge, PAD + 22, y + 10, `800 28px ${family}`, '#fff')
    y += 74
    y = lines(d.title, PAD, y, headW, `700 36px ${family}`, INK, 50) + 34
    if (picture) y = Math.max(y, photoTop + PHOTO_H + 44)
    rule(y)
    y += 40

    // 잘 어울리는 색 — 4 × 2 견본, 이름은 견본 아래
    const swatchRow = (colors: string[], labels: string[] | null, top: number, cols: number, height: number) => {
      const gap = 18
      const w = (INNER - gap * (cols - 1)) / cols
      let bottom = top
      colors.forEach((hex, i) => {
        const x = PAD + (i % cols) * (w + gap)
        const sy = top + Math.floor(i / cols) * (height + (labels ? 70 : 18))
        if (draw) {
          ctx.fillStyle = hex
          roundRect(ctx, x, sy, w, height, 12)
          ctx.fill()
          ctx.strokeStyle = 'rgba(39, 47, 115, 0.14)'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        const label = labels?.[i]?.trim()
        if (label) {
          ctx.font = `700 24px ${family}`
          const fitted = wrapLines(ctx, label, w)[0] ?? ''
          text(fitted, x + w / 2, sy + height + 14, `700 24px ${family}`, INK, 'center')
        }
        bottom = Math.max(bottom, sy + height + (label ? 56 : 18))
      })
      return bottom
    }
    text(tx.best, PAD, y, `900 34px ${family}`, INK)
    y += 58
    y = swatchRow(type.best, names(false), y, 4, 130)
    if (!names(false) && d.bestColorNames.length) y = lines(d.bestColorNames.join(' · '), PAD, y + 4, INNER, `600 26px ${family}`, SOFT, 38) + 8
    y += 22
    text(tx.avoid, PAD, y, `900 34px ${family}`, INK)
    y += 58
    y = swatchRow(type.avoid, names(true), y, 4, 96)
    if (!names(true) && d.avoidColorNames.length) y = lines(d.avoidColorNames.join(' · '), PAD, y + 4, INNER, `600 26px ${family}`, SOFT, 38) + 8
    y += 30
    rule(y)
    y += 40

    // 톤 눈금 — 이름 · 낮음 ─●─ 높음
    text(tx.gaugeTitle, PAD, y, `900 34px ${family}`, INK)
    y += 66
    const labelW = 190
    const lowW = 140
    const trackX = PAD + labelW + lowW
    const trackW = INNER - labelW - lowW * 2
    for (const key of GAUGES) {
      const gauge = tx.gauges[key]
      text(gauge.label, PAD, y, `800 28px ${family}`, INK)
      text(gauge.low, trackX - 18, y + 3, `600 23px ${family}`, SOFT, 'right')
      text(gauge.high, trackX + trackW + 18, y + 3, `600 23px ${family}`, SOFT)
      if (draw) {
        ctx.fillStyle = '#e3e4ec'
        roundRect(ctx, trackX, y + 13, trackW, 8, 4)
        ctx.fill()
        const v = Math.max(0, Math.min(100, d.scores[key]))
        ctx.fillStyle = INK
        ctx.beginPath()
        ctx.arc(trackX + (trackW * v) / 100, y + 17, 13, 0, Math.PI * 2)
        ctx.fill()
      }
      y += 58
    }
    y += 16
    rule(y)
    y += 40

    // 스타일 가이드 — 네 칸
    text(tx.stylingTitle, PAD, y, `900 34px ${family}`, INK)
    y += 62
    for (const key of STYLE_KEYS) {
      const body = d.styling[key]?.trim()
      if (!body) continue
      const top = y
      ctx.font = `500 27px ${family}`
      const wrapped = wrapLines(ctx, body, INNER - 56)
      const h = 34 + 42 + wrapped.length * 40 + 26
      if (draw) {
        ctx.fillStyle = CARD
        roundRect(ctx, PAD, top, INNER, h, 6)
        ctx.fill()
        ctx.strokeStyle = LINE
        ctx.lineWidth = 2
        ctx.stroke()
      }
      const title = key === 'accessory' ? `${tx.styling[key]} · ${tx.metal[d.metal]}` : tx.styling[key]
      text(title, PAD + 28, top + 28, `900 30px ${family}`, INK)
      wrapped.forEach((line, i) => text(line, PAD + 28, top + 34 + 42 + i * 40, `500 27px ${family}`, '#3c4577'))
      y += h + 14
    }

    // 키워드
    if (result.keywords.length) {
      y += 14
      let x = PAD
      ctx.font = `800 26px ${family}`
      for (const keyword of result.keywords.slice(0, 6)) {
        const label = `#${keyword}`
        const w = ctx.measureText(label).width + 40
        if (x + w > W - PAD) { x = PAD; y += 62 }
        if (draw) {
          ctx.fillStyle = '#ecebf4'
          roundRect(ctx, x, y, w, 48, 24)
          ctx.fill()
        }
        text(label, x + 20, y + 10, `800 26px ${family}`, INK)
        x += w + 12
      }
      y += 48
    }
    y += 36
    y = lines(tx.disclaimer, PAD, y, INNER, `500 22px ${family}`, SOFT, 32)
    return y + 70
  }

  const height = Math.ceil(paint(makeCanvas(W, 10)[1], false))
  const [canvas, ctx] = makeCanvas(W, height)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, height)
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(30, 30, W - 60, height - 60)
  paint(ctx, true)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}
