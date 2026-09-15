/**
 * 포토카드 인쇄용 원판 렌더러.
 *
 * 규격 (세로형, 300dpi)
 * - 재단영역 52 x 86 mm — 실제로 제작되어 손에 쥐는 크기
 * - 작업영역 54 x 88 mm — 디자인 파일 크기. 재단 오차를 흡수할 사방 1mm 여백 포함
 *
 * 작업영역까지 이미지를 채워야 재단이 밀려도 흰 테두리가 생기지 않는다.
 * 반대로 중요한 요소(QR·번호)는 재단선에서 더 안쪽(안전영역)에 둬야 잘리지 않는다.
 */

const MM = 300 / 25.4
const px = (mm: number) => Math.round(mm * MM)

export const CARD_PRINT = {
  /** 재단영역 52 x 86 mm */
  trimW: px(52), // 614
  trimH: px(86), // 1016
  /** 도련 — 작업영역과 재단영역의 차이 (사방 1mm) */
  bleed: px(1), // 12
  /** 재단선 안쪽 안전 여백 — 도련이 1mm뿐이라 여기를 넉넉히 잡는다 */
  safe: px(3), // 35
  /** 화면 표기용 */
  trimLabel: '52 × 86 mm',
  workLabel: '54 × 88 mm',
} as const

/** 작업영역 = 디자인 파일 크기 (54 x 88 mm) */
export const CARD_FULL_W = CARD_PRINT.trimW + CARD_PRINT.bleed * 2 // 638
export const CARD_FULL_H = CARD_PRINT.trimH + CARD_PRINT.bleed * 2 // 1040

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
