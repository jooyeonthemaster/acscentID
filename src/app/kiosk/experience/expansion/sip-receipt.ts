// SIP! 영상판 영수증(2026-11-18 사용자 지시: 영수증을 새로 — 맨 위 '포도밭에 선 나' 검정 도장, 맨 아래 해나의 큰 사인).
// 감열지 한 장(폭 512점, 흰 바탕 · 검정만)을 직접 그린다 — kx-receipt.ts 의 render 길로 인쇄 · 미리보기에 그대로 쓰인다.
//   1. 포도밭에 선 나 — 기념사진으로 만든 AI 도장 그림(/api/kiosk/experience/sip-stamp), 사진이 없거나 못 만들면 기본 도장(사람 없는 포도밭).
//      흑백으로 찍고 잉크가 군데군데 빠진 고무도장 결을 더해, 손으로 찍은 듯 살짝 기울인다
//   2. 오늘의 한 잔 — 큰 번호 · 이름 · 영문 · 종류(직원이 이것만 보고 따른다)   3. 고른 맛 — 단맛 · 산미 · 바디 점 다섯
//   4. 해나의 한마디   5. 휴대폰으로 받기 QR   6. 해나의 사인(크게) · Sommelier
// 그림: public/assets/kiosk-expansion/nh-sip/hana-signature.png · receipt-stamp-default.png(원본 design-review/nh-sip-art/receipt, R&D 키)

import { NH_SCALES, type NhAnswers } from '@/lib/kiosk/expansion/nh-sommelier'
import type { ResultPour } from '@/lib/kiosk/expansion/types'
import { fontsReady, kxFontFamily, loadImage, wrapLines } from '../kx-canvas'
import type { KxReceipt, KxReceiptQr } from '../kx-receipt'
import { inkStamp } from '../kx-stamp'

const ART = '/assets/kiosk-expansion/nh-sip'
const W = 512
const M = 30
const SERIF = "'nh-serif', 'Cormorant Garamond', 'Times New Roman', serif"
const IMPACT = "Impact, 'Arial Narrow'"

export interface SipReceiptInput {
  pour: ResultPour
  answers: NhAnswers
  /** 해나의 한마디(결과 요약) */
  note: string
  /** 기념사진으로 만든 도장 그림(data: 주소) — 없으면 기본 도장 */
  stamp: string | null
}

export function sipReceipt(input: SipReceiptInput): KxReceipt {
  return {
    tag: 'SIP!', title: '오늘의 한 잔', blocks: [],
    render: (qr, stamp) => renderSipReceipt(input, qr, stamp),
  }
}

async function renderSipReceipt({ pour, answers, note, stamp: art }: SipReceiptInput, qr: KxReceiptQr | null, when: string): Promise<HTMLCanvasElement> {
  const family = kxFontFamily()
  await fontsReady(`900 30px ${family}`, `700 22px ${family}`, `500 20px ${family}`, `500 40px ${SERIF}`, `italic 300 22px ${SERIF}`)
  const [stampImg, sign] = await Promise.all([
    loadImage(art ?? `${ART}/receipt-stamp-default.png`).catch(() => loadImage(`${ART}/receipt-stamp-default.png`)).catch(() => null),
    loadImage(`${ART}/hana-signature.png`).catch(() => null),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = 4200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, canvas.height)
  ctx.fillStyle = '#000'; ctx.textBaseline = 'top'
  const inner = W - M * 2
  let y = 26
  const text = (value: string, size: number, weight: number | string, { center = true, gap = 8, font = family, spacing = 0, line = 1.38 }: { center?: boolean; gap?: number; font?: string; spacing?: number; line?: number } = {}) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.letterSpacing = `${spacing}px`
    ctx.textAlign = center ? 'center' : 'left'
    for (const l of wrapLines(ctx, value, inner)) { ctx.fillText(l, center ? W / 2 : M, y); y += Math.round(size * line) }
    ctx.letterSpacing = '0px'
    y += gap
  }
  const dots = (gap = 18) => { for (let x = M; x < W - M; x += 9) ctx.fillRect(x, y, 3, 3); y += 3 + gap }

  // 머리 — 작은 SIP! 와 오늘 날짜
  text('SIP!', 46, 500, { font: SERIF, gap: 0, line: 1.05 })
  text("HANA'S VINEYARD  ·  " + when, 13, 700, { spacing: 2.4, gap: 16 })

  // 1. 포도밭에 선 나 — 검정 도장, 손으로 찍은 듯 살짝 기울여
  if (stampImg) {
    const size = 420
    const st = inkStamp(stampImg, size)
    ctx.save()
    ctx.translate(W / 2, y + size / 2 + 6)
    ctx.rotate(-0.022)
    ctx.drawImage(st, -size / 2, -size / 2)
    ctx.restore()
    y += size + 12
    text(art ? '포도밭에서, 오늘의 나' : '포도밭에서, 오늘의 한 장면', 17, 700, { gap: 18 })
  }
  dots()

  // 2. 오늘의 한 잔 — 직원이 보고 따른다
  text("TODAY'S GLASS", 14, 800, { spacing: 4, gap: 2 })
  const top = y
  ctx.textAlign = 'center'
  ctx.font = `400 30px ${SERIF}`
  const noW = ctx.measureText('No.').width
  ctx.font = `900 150px ${IMPACT}, ${family}`
  const numW = ctx.measureText(String(pour.no)).width
  const left = W / 2 - (noW + 8 + numW) / 2
  ctx.textAlign = 'left'
  ctx.font = `400 34px ${SERIF}`; ctx.fillText('No.', left, top + 92)
  ctx.font = `900 150px ${IMPACT}, ${family}`; ctx.fillText(String(pour.no), left + noW + 8, top)
  y = top + 160
  text(pour.name, 32, 900, { gap: 2 })
  text(pour.en, 20, 'italic 300', { font: SERIF, gap: 10 })
  // 종류 — 검은 알약 안 흰 글자
  ctx.font = `800 20px ${family}`
  const kw = ctx.measureText(pour.kind).width + 40
  ctx.beginPath(); ctx.roundRect((W - kw) / 2, y, kw, 36, 18); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(pour.kind, W / 2, y + 7)
  ctx.fillStyle = '#000'
  y += 36 + 26
  dots()

  // 3. 고른 맛 — 점 다섯(1 · 3 · 5)
  text('YOUR TASTE', 14, 800, { spacing: 4, gap: 12 })
  for (const scale of NH_SCALES) {
    const v = Math.max(1, Math.min(5, Math.round(answers[scale.key as 'sweet' | 'acid' | 'body'] ?? 3)))
    ctx.textAlign = 'left'; ctx.font = `800 21px ${family}`; ctx.fillText(scale.title, M + 6, y + 2)
    ctx.font = `600 15px ${family}`; ctx.fillStyle = '#000'
    ctx.textAlign = 'right'; ctx.fillText(scale.lo, 246, y + 6)
    ctx.textAlign = 'left'; ctx.fillText(scale.hi, 412, y + 6)
    for (let i = 0; i < 5; i++) {
      const cx = 266 + i * 31, cy = y + 14
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      if (i < v) ctx.fill(); else { ctx.lineWidth = 2.4; ctx.stroke() }
    }
    y += 40
  }
  y += 10
  dots()

  // 4. 해나의 한마디
  text("HANA'S NOTE", 14, 800, { spacing: 4, gap: 10 })
  text(`“${note}”`, 20, 600, { gap: 20, line: 1.5 })

  // 5. 휴대폰으로 받기
  if (qr) {
    dots()
    text(qr.title, 22, 800, { gap: 10 })
    const QRCode = (await import('qrcode')).default
    const code = document.createElement('canvas')
    await QRCode.toCanvas(code, qr.url, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
    ctx.drawImage(code, Math.round((W - code.width) / 2), y)
    y += code.height + 10
    text(qr.desc, 16, 600, { gap: 2 })
    text(qr.until, 16, 800, { gap: 18 })
  }

  // 6. 해나의 사인 — 크게, 그 아래 가는 선과 Sommelier
  dots(10)
  if (sign) {
    const sw = 420, sh = Math.round(sw * sign.naturalHeight / sign.naturalWidth)
    ctx.drawImage(sign, Math.round((W - sw) / 2), y, sw, sh)
    y += sh - 6
  }
  ctx.fillRect(W / 2 - 150, y, 300, 2); y += 12
  text('Sommelier  ·  해나', 19, 700, { gap: 4 })
  text('오늘 밤의 한 잔을 함께 골랐어요', 15, 600, { gap: 16 })
  text('촬영 사진은 도장 그림을 만드는 데만 쓰고 저장하지 않아요', 13, 500, { gap: 4 })
  y += 40

  const out = document.createElement('canvas')
  out.width = W; out.height = y
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  return out
}
