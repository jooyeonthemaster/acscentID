// 체험 모드 영수증 — 결과 미리보기(그림·목록)와 휴대폰으로 받는 QR 을 감열지 한 장(폭 512점)에 그린다.
// 향 분석 영수증(src/lib/kiosk/receipt-canvas.ts)과 같은 프린터 경로를 쓴다: 순흑·순백만 쓰고, 사진은 미리 점묘(1비트)로 바꾼다.

import { ditherForThermal } from '@/lib/kiosk/receipt-canvas'
import { fontsReady, kxFontFamily, loadImage, wrapLines } from './kx-canvas'

export type KxReceiptBlock =
  /** 그림 — width 는 점(기본 400), tone 은 밝기 목표(사진 150 · 선화 175) */
  | { kind: 'image'; src: string; width?: number; frame?: boolean; tone?: number; caption?: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'text'; text: string; bold?: boolean; small?: boolean; center?: boolean }
  | { kind: 'pairs'; rows: [string, string][] }
  | { kind: 'rule' }
  /** 도장 빈칸 — 점선 원(지름 약 18mm, 실제 도장을 찍을 수 있는 크기). 스탬프 랠리 */
  | { kind: 'stamps'; count: number }

export interface KxReceipt {
  /** 큰 글자(NAIL! · CARD! …) */
  tag: string
  title: string
  subtitle?: string
  blocks: KxReceiptBlock[]
  foot?: string
}

export interface KxReceiptQr {
  url: string
  title: string
  desc: string
  /** 'OO월 OO일 OO:OO까지 받을 수 있어요' */
  until: string
}

const W = 512
const M = 30
const INK = '#000'

export async function renderKxReceipt(receipt: KxReceipt, qr: KxReceiptQr | null, stamp: string): Promise<{ dataUrl: string; base64: string }> {
  const family = kxFontFamily()
  const sample = [receipt.title, receipt.subtitle ?? '', stamp, qr?.title ?? '', qr?.desc ?? '', qr?.until ?? '', receipt.foot ?? '', ...receipt.blocks.map((block) => JSON.stringify(block))].join(' ')
  await fontsReady(`900 30px ${family}`, `700 22px ${family}`, `500 20px ${family}`)
  try { await document.fonts.load(`700 22px ${family}`, sample) } catch { /* 기본 글꼴로 */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 5200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, canvas.height)
  ctx.fillStyle = INK
  ctx.textBaseline = 'top'
  let y = 26
  const inner = W - M * 2

  const text = (value: string, size: number, weight: number, { center = false, gap = 8, spacing = 0, font = family }: { center?: boolean; gap?: number; spacing?: number; font?: string } = {}) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.letterSpacing = `${spacing}px`
    ctx.textAlign = center ? 'center' : 'left'
    for (const line of wrapLines(ctx, value, inner)) {
      ctx.fillText(line, center ? W / 2 : M, y)
      y += Math.round(size * 1.36)
    }
    ctx.letterSpacing = '0px'
    y += gap
  }
  const rule = (thick = 2, gap = 14) => { ctx.fillRect(M, y, inner, thick); y += thick + gap }
  const dashes = (gap = 14) => { for (let x = M; x < W - M; x += 10) ctx.fillRect(x, y, 6, 2); y += 2 + gap }

  // 머리
  text("AC'SCENT", 17, 800, { center: true, spacing: 6, gap: 2 })
  text(receipt.tag, 68, 900, { center: true, font: `Impact, 'Arial Narrow', ${family}`, gap: 0 })
  text(receipt.title, 27, 800, { center: true, gap: receipt.subtitle ? 0 : 6 })
  if (receipt.subtitle) text(receipt.subtitle, 19, 600, { center: true, gap: 6 })
  text(stamp, 16, 600, { center: true, gap: 10 })
  rule(3, 4)
  rule(1, 18)

  for (const block of receipt.blocks) {
    if (block.kind === 'rule') dashes()
    if (block.kind === 'heading') { y += 4; text(block.text, 24, 800, { gap: 6 }) }
    if (block.kind === 'text') text(block.text, block.small ? 17 : 20, block.bold ? 800 : 500, { center: block.center, gap: 10 })
    if (block.kind === 'list') {
      block.items.forEach((item, i) => {
        ctx.font = `800 21px ${family}`
        ctx.textAlign = 'left'
        ctx.fillText(String(i + 1).padStart(2, '0'), M, y)
        ctx.font = `600 21px ${family}`
        for (const line of wrapLines(ctx, item, inner - 44)) { ctx.fillText(line, M + 44, y); y += 30 }
        y += 4
      })
      y += 8
    }
    if (block.kind === 'pairs') {
      for (const [label, value] of block.rows) {
        ctx.font = `600 18px ${family}`
        ctx.textAlign = 'left'
        ctx.fillText(label, M, y + 2)
        ctx.font = `800 21px ${family}`
        ctx.textAlign = 'right'
        const lines = wrapLines(ctx, value, inner - 130)
        lines.forEach((line, i) => ctx.fillText(line, W - M, y + i * 30))
        y += lines.length * 30 + 4
      }
      ctx.textAlign = 'left'
      y += 8
    }
    if (block.kind === 'stamps') {
      const n = Math.max(1, Math.min(4, block.count)), d = 128, gap = (inner - n * d) / (n + 1)
      for (let i = 0; i < n; i++) {
        const cx = M + gap * (i + 1) + d * i + d / 2, cy = y + d / 2
        // 점선 원 — 짧은 호를 띄엄띄엄(감열지에서 또렷하게 굵기 3)
        ctx.lineWidth = 3
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) { ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 2, a, a + Math.PI / 30); ctx.strokeStyle = INK; ctx.stroke() }
      }
      y += d + 18
    }
    if (block.kind === 'image') {
      const image = await loadImage(block.src).catch(() => null)
      if (image) {
        const width = Math.min(inner, block.width ?? 400), height = Math.round(width * image.naturalHeight / image.naturalWidth)
        const x = Math.round((W - width) / 2)
        ctx.drawImage(ditherForThermal(image, width, height, block.tone ?? 150), x, y)
        if (block.frame) { ctx.fillRect(x - 2, y - 2, width + 4, 2); ctx.fillRect(x - 2, y + height, width + 4, 2); ctx.fillRect(x - 2, y, 2, height); ctx.fillRect(x + width, y, 2, height) }
        y += height + 12
        if (block.caption) text(block.caption, 18, 700, { center: true, gap: 10 })
        else y += 4
      }
    }
  }

  if (qr) {
    dashes(16)
    text(qr.title, 26, 800, { center: true, gap: 8 })
    const QRCode = (await import('qrcode')).default
    const code = document.createElement('canvas')
    await QRCode.toCanvas(code, qr.url, { width: 236, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
    ctx.drawImage(code, Math.round((W - code.width) / 2), y)
    y += code.height + 10
    text(qr.desc, 18, 600, { center: true, gap: 2 })
    text(qr.until, 18, 800, { center: true, gap: 12 })
  }
  rule(1, 12)
  if (receipt.foot) text(receipt.foot, 16, 500, { center: true, gap: 4 })
  text('www.acscent.co.kr', 16, 700, { center: true, spacing: 1, gap: 0 })
  y += 46

  const out = document.createElement('canvas')
  out.width = W
  out.height = y
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  const dataUrl = out.toDataURL('image/png')
  return { dataUrl, base64: dataUrl.split(',')[1] }
}
