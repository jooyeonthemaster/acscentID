/**
 * 포토카드 인쇄용 원판 렌더러.
 *
 * 인쇄소는 재단선 바깥으로 여유(도련)가 있는 파일을 요구한다. 도련 없이 넘기면
 * 재단 오차만큼 흰 테두리가 생긴다. 여기서 앞/뒷면 모두 도련 포함으로 뽑는다.
 *
 * 규격: 재단 54x86mm, 도련 3mm, 300dpi
 */

const MM = 300 / 25.4

export const CARD_PRINT = {
  /** 재단 크기 (실제 카드 크기) */
  trimW: Math.round(54 * MM), // 638
  trimH: Math.round(86 * MM), // 1016
  /** 도련 — 재단선 바깥 여유 */
  bleed: Math.round(3 * MM), // 35
  /** 중요한 요소가 들어가면 안 되는 재단선 안쪽 여백 */
  safe: Math.round(3 * MM),
} as const

export const CARD_FULL_W = CARD_PRINT.trimW + CARD_PRINT.bleed * 2 // 708
export const CARD_FULL_H = CARD_PRINT.trimH + CARD_PRINT.bleed * 2 // 1086

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_FULL_W
  canvas.height = CARD_FULL_H
  return canvas
}

/** 도련 영역까지 가득 채우도록 비율 유지 cover */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number
) {
  const scale = Math.max(dw / sw, dh / sh)
  const w = sw * scale
  const h = sh * scale
  ctx.drawImage(img, (dw - w) / 2, (dh - h) / 2, w, h)
}

/** 카드 앞면 — 업로드한 원본을 도련까지 채운다 */
export function renderCardFront(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들지 못했습니다')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CARD_FULL_W, CARD_FULL_H)
  drawCover(
    ctx,
    image,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    CARD_FULL_W,
    CARD_FULL_H
  )
  return canvas
}

export interface CardBackOptions {
  code: string
  qrImage: HTMLImageElement
  cardTitle?: string | null
  eventTitle?: string | null
}

/** 카드 뒷면 — QR + 번호. 중요한 요소는 전부 안전영역 안에 둔다 */
export function renderCardBack({
  code,
  qrImage,
  cardTitle,
  eventTitle,
}: CardBackOptions): HTMLCanvasElement {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들지 못했습니다')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CARD_FULL_W, CARD_FULL_H)

  const font = '"Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif'
  const centerX = CARD_FULL_W / 2

  // 상단: 이벤트명
  if (eventTitle) {
    ctx.fillStyle = '#111111'
    ctx.globalAlpha = 0.5
    ctx.textAlign = 'center'
    ctx.font = `600 30px ${font}`
    ctx.fillText(eventTitle, centerX, CARD_PRINT.bleed + CARD_PRINT.safe + 70, CARD_PRINT.trimW - CARD_PRINT.safe * 2)
    ctx.globalAlpha = 1
  }

  // QR — 가로 재단폭의 62%
  const qrSize = Math.round(CARD_PRINT.trimW * 0.62)
  const qrY = Math.round(CARD_FULL_H * 0.26)
  ctx.imageSmoothingEnabled = false // QR은 보간하면 인식률이 떨어진다
  ctx.drawImage(qrImage, centerX - qrSize / 2, qrY, qrSize, qrSize)
  ctx.imageSmoothingEnabled = true

  // 번호
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'center'
  ctx.font = `700 62px ${font}`
  ctx.fillText(code, centerX, qrY + qrSize + 86)

  ctx.font = `400 26px ${font}`
  ctx.globalAlpha = 0.55
  ctx.fillText('매장 포토부스에서 스캔하세요', centerX, qrY + qrSize + 134)
  if (cardTitle) {
    ctx.fillText(cardTitle, centerX, qrY + qrSize + 176, CARD_PRINT.trimW - CARD_PRINT.safe * 2)
  }
  ctx.globalAlpha = 1

  // 하단 워드마크
  ctx.font = `700 24px ${font}`
  ctx.globalAlpha = 0.4
  ctx.fillText(
    "AC'SCENT WOW",
    centerX,
    CARD_FULL_H - CARD_PRINT.bleed - CARD_PRINT.safe - 24
  )
  ctx.globalAlpha = 1

  return canvas
}

/** 재단선·안전영역을 표시한 확인용 이미지 (인쇄소에 넘기는 파일에는 쓰지 않는다) */
export function withPrintGuides(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return source
  ctx.drawImage(source, 0, 0)

  const { bleed, safe, trimW, trimH } = CARD_PRINT
  ctx.lineWidth = 3
  ctx.setLineDash([12, 10])
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)'
  ctx.strokeRect(bleed, bleed, trimW, trimH) // 재단선
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.75)'
  ctx.strokeRect(bleed + safe, bleed + safe, trimW - safe * 2, trimH - safe * 2) // 안전영역
  ctx.setLineDash([])
  return canvas
}
