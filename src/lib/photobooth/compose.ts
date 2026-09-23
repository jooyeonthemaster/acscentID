/**
 * 포토부스 캔버스 합성 유틸 (4x6인치 @300dpi = 1200x1800px)
 *
 * 핵심은 renderTogetherBand — 손님의 카메라 화면을 전체 배경으로 깔고 투명한
 * 아티스트 전경을 올려 "최애 옆에 같이 선" 한 장을 만든다. 라이브 프리뷰(video)와
 * 최종 인쇄(캡처 이미지)가 같은 함수를 쓰기 때문에 부스에서 본 그대로 인화된다.
 */

import type { TemplateGeometry } from './templates'

export const PRINT = {
  W: 1200,
  H: 1800,
  margin: 36,
  gap: 18,
  footerH: 200,
  radius: 24,
} as const

/** 최애와 찍기 전용 레이아웃 — 위: 합성 컷, 아래: 현장 단독 컷, 맨 아래: 이벤트 푸터 */
export const TEMPLATE_LAYOUT = (() => {
  const x = PRINT.margin
  const contentW = PRINT.W - PRINT.margin * 2
  const togetherY = PRINT.margin
  const togetherH = Math.round((contentW * 3) / 4) // 템플릿 4:3 무손실 배치
  const soloY = togetherY + togetherH + PRINT.gap
  const footerY = PRINT.H - PRINT.margin - PRINT.footerH
  const soloH = footerY - PRINT.gap - soloY
  return { x, contentW, togetherY, togetherH, soloY, soloH, footerY }
})()

type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

function sourceSize(src: ImageSource): { w: number; h: number } {
  if (typeof HTMLVideoElement !== 'undefined' && src instanceof HTMLVideoElement) {
    return { w: src.videoWidth, h: src.videoHeight }
  }
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }
  }
  return { w: src.width, h: src.height }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath()
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
  } else {
    ctx.rect(x, y, w, h)
  }
}

export interface FitOptions {
  /** 잘라낼 기준점 (0~1). 최종 이미지 기준이라 mirror여도 조작감이 같다 */
  focalX?: number
  focalY?: number
  /** 1 = cover, 그 이상은 확대 */
  zoom?: number
  mirror?: boolean
}

/**
 * 비율 유지 cover + 기준점/확대/좌우반전 지원.
 */
export function drawCoverFocal(
  ctx: CanvasRenderingContext2D,
  src: ImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  { focalX = 0.5, focalY = 0.5, zoom = 1, mirror = false }: FitOptions = {}
) {
  const { w: sw0, h: sh0 } = sourceSize(src)
  if (!sw0 || !sh0) return

  const scale = Math.max(dw / sw0, dh / sh0) * Math.max(1, zoom)
  const sw = Math.min(sw0, dw / scale)
  const sh = Math.min(sh0, dh / scale)

  // mirror일 때도 화면에서 보이는 방향과 조작 방향을 일치시킨다
  const fx = mirror ? 1 - focalX : focalX
  const sx = Math.min(Math.max((sw0 - sw) * fx, 0), sw0 - sw)
  const sy = Math.min(Math.max((sh0 - sh) * focalY, 0), sh0 - sh)

  if (mirror) {
    ctx.save()
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh)
    ctx.restore()
  } else {
    ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh)
  }
}

export interface BackdropKeyOptions {
  /** 매장 배경지를 지울지 (단색 배경일 때만 의미 있음) */
  enabled?: boolean
  /** 배경으로 간주할 색 거리 (0~1) */
  tolerance?: number
  /** 경계 부드러움 (0~1) */
  softness?: number
}

const MAX_COLOR_DISTANCE = Math.sqrt(3 * 255 * 255)

/**
 * 프레임 위쪽 양 모서리에서 배경색을 샘플링해, 그 색과 가까운 픽셀을 투명하게 만든다.
 * 매장에 단색 배경지만 걸면 별도 모델 없이도 인물만 남길 수 있다.
 */
function applyBackdropKey(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  { tolerance = 0.22, softness = 0.1 }: BackdropKeyOptions
) {
  if (w < 8 || h < 8) return
  let frame: ImageData
  try {
    frame = ctx.getImageData(0, 0, w, h)
  } catch {
    // 캔버스가 오염된 경우(교차 출처 이미지) 키잉을 건너뛴다
    return
  }

  const data = frame.data
  const block = Math.max(4, Math.round(Math.min(w, h) * 0.06))

  // 위쪽 좌·우 모서리 평균 = 배경색 추정
  let sr = 0
  let sg = 0
  let sb = 0
  let count = 0
  for (let y = 0; y < block; y++) {
    for (let x = 0; x < block; x++) {
      for (const px of [x, w - 1 - x]) {
        const i = (y * w + px) * 4
        sr += data[i]
        sg += data[i + 1]
        sb += data[i + 2]
        count++
      }
    }
  }
  if (!count) return
  const br = sr / count
  const bg = sg / count
  const bb = sb / count

  const near = tolerance * MAX_COLOR_DISTANCE
  const far = near + Math.max(1, softness * MAX_COLOR_DISTANCE)

  // 배경지가 뚜렷한 색(그린/블루 스크린)이면 남은 픽셀의 그 채널을 눌러 번짐(spill)을 없앤다
  const channels = [br, bg, bb]
  const dominant = channels.indexOf(Math.max(...channels))
  const others = channels.filter((_, i) => i !== dominant)
  const despill = Math.max(...channels) > (others[0] + others[1]) / 2 + 30

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - br
    const dg = data[i + 1] - bg
    const db = data[i + 2] - bb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist <= near) {
      data[i + 3] = 0
      continue
    }
    if (dist < far) {
      data[i + 3] = Math.round(data[i + 3] * ((dist - near) / (far - near)))
    }
    if (despill) {
      const domValue = data[i + dominant]
      const rest = (data[i] + data[i + 1] + data[i + 2] - domValue) / 2
      if (domValue > rest) {
        data[i + dominant] = Math.round(rest + (domValue - rest) * 0.35)
      }
    }
  }

  ctx.putImageData(frame, 0, 0)
}

export interface TogetherBandOptions extends FitOptions {
  templateImg: ImageSource
  /** 인생네컷식 투명 아티스트 전경. 있으면 손님 화면 전체 위에 합성한다. */
  foregroundImg?: ImageSource | null
  /** 손님 소스 — 라이브 프리뷰는 video, 최종 합성은 캡처 이미지 */
  guest: ImageSource | null
  geometry: TemplateGeometry
  /** 배경 톤 보정 강도 (0~1) */
  blend?: number
  radius?: number
  /** 매장 배경지 제거 */
  keying?: BackdropKeyOptions
}

/**
 * 투명 전경이 있으면 손님 카메라를 전체 배경으로 쓰고 아티스트를 그 위에 올린다.
 * 전경이 없는 관리자 업로드 템플릿은 기존 빈 영역 페더 블렌딩으로 호환한다.
 */
export function renderTogetherBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  {
    templateImg,
    foregroundImg,
    guest,
    geometry,
    blend = 0.1,
    radius = PRINT.radius,
    keying,
    focalX = 0.5,
    focalY = 0.42,
    zoom = 1,
    mirror = false,
  }: TogetherBandOptions
) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 인생네컷 아티스트 프레임 방식: 두 사람 모두 손님 카메라의 한 공간을 공유하고,
  // 미리 촬영된 아티스트/캐릭터만 투명 PNG 전경으로 올라간다.
  if (guest && foregroundImg) {
    drawCoverFocal(ctx, guest, x, y, w, h, { focalX, focalY, zoom, mirror })
    ctx.drawImage(foregroundImg, x, y, w, h)
    ctx.restore()
    return
  }

  // 투명 전경이 없는 원격/구형 템플릿의 안전한 대체 방식.
  ctx.drawImage(templateImg, x, y, w, h)

  if (guest) {
    const baseRectX = Math.round(x + geometry.freeStart * w)
    const baseRectW = Math.max(1, Math.round((geometry.freeEnd - geometry.freeStart) * w))
    // 경계가 정확히 맞닿으면 세로 이음선처럼 보여서, 주인공 쪽으로 조금 겹친 뒤
    // 그 겹침 구간 안에서만 페더링한다.
    const seamOverlap = Math.max(8, Math.round(w * 0.025))
    const rectX = geometry.freeSide === 'right' ? Math.max(x, baseRectX - seamOverlap) : baseRectX
    const rectRight =
      geometry.freeSide === 'left'
        ? Math.min(x + w, baseRectX + baseRectW + seamOverlap)
        : Math.min(x + w, baseRectX + baseRectW)
    const rectW = Math.max(1, rectRight - rectX)
    const rectH = Math.round(h)

    const off = document.createElement('canvas')
    off.width = rectW
    off.height = rectH
    const octx = off.getContext('2d')

    if (octx) {
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      drawCoverFocal(octx, guest, 0, 0, rectW, rectH, { focalX, focalY, zoom, mirror })

      // 매장 배경지를 지워 템플릿 배경이 그대로 비치게 한다
      if (keying?.enabled) {
        applyBackdropKey(octx, rectW, rectH, keying)
      }

      // 배경 톤 맞추기 — 매장 조명과 템플릿 배경의 색온도 차이를 줄인다
      // source-atop이라 투명해진 배경 영역은 물들지 않는다
      if (blend > 0) {
        octx.globalCompositeOperation = 'source-atop'
        octx.globalAlpha = blend
        octx.fillStyle = geometry.bgColor
        octx.fillRect(0, 0, rectW, rectH)
        octx.globalAlpha = 1
        octx.globalCompositeOperation = 'source-over'
      }

      // 두 사진이 만나는 안쪽 이음선만 알파로 정리한다.
      // 바깥·위·아래까지 흐리면 손님 인물 자체가 유령처럼 비치므로 건드리지 않는다.
      octx.globalCompositeOperation = 'destination-in'
      const fade = (
        x0: number,
        y0: number,
        x1: number,
        y1: number
      ) => {
        const grad = octx.createLinearGradient(x0, y0, x1, y1)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, 'rgba(0,0,0,1)')
        octx.fillStyle = grad
        octx.fillRect(0, 0, rectW, rectH)
      }

      // 배경을 지운 경우엔 이미 인물 경계에 알파가 있으므로 아주 짧게만 정리한다.
      const keyed = !!keying?.enabled
      const innerFeather = Math.max(10, rectW * (keyed ? 0.025 : 0.07))
      if (geometry.freeSide === 'right') {
        fade(0, 0, innerFeather, 0)
      } else {
        fade(rectW, 0, rectW - innerFeather, 0)
      }
      octx.globalCompositeOperation = 'source-over'

      ctx.drawImage(off, rectX, y, rectW, rectH)
    }
  }

  ctx.restore()
}

/** 배경색 대비에 맞는 글자색 */
function readableTextColor(color: string): string {
  const hex = color.trim()
  let r = 0
  let g = 0
  let b = 0
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hex)
  const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(hex)
  if (hexMatch) {
    const value = parseInt(hexMatch[1], 16)
    r = (value >> 16) & 255
    g = (value >> 8) & 255
    b = value & 255
  } else if (rgbMatch) {
    r = Number(rgbMatch[1])
    g = Number(rgbMatch[2])
    b = Number(rgbMatch[3])
  } else {
    return '#ffffff'
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1f1a17' : '#ffffff'
}

const FONT_STACK = '"Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif'

export interface EventFooterOptions {
  bgColor: string
  title: string
  subtitle?: string | null
  hashtag?: string | null
  date?: string | null
  radius?: number
}

/**
 * 인화물 하단 이벤트 밴드 — 생카 인증샷에서 어느 매장/누구 주최인지가 바로 읽히게.
 */
export function drawEventFooter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  { bgColor, title, subtitle, hashtag, date, radius = PRINT.radius }: EventFooterOptions
) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()

  ctx.fillStyle = bgColor
  ctx.fillRect(x, y, w, h)

  const textColor = readableTextColor(bgColor)
  const padding = 44

  // 인화 굿즈처럼 보이는 얇은 상단 규칙선과 브랜드 마크
  ctx.globalAlpha = 0.28
  ctx.fillStyle = textColor
  ctx.fillRect(x + padding, y + 25, w - padding * 2, 2)
  ctx.globalAlpha = 0.72
  ctx.font = `700 18px ${FONT_STACK}`
  ctx.letterSpacing = '5px'
  ctx.fillText("AC'SCENT WOW PHOTO", x + padding, y + 55)
  ctx.letterSpacing = '0px'
  ctx.globalAlpha = 1

  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `750 42px ${FONT_STACK}`
  ctx.fillText(title, x + padding, y + (subtitle ? 112 : h / 2 + 30), w - padding * 2)

  if (subtitle) {
    ctx.globalAlpha = 0.75
    ctx.font = `450 24px ${FONT_STACK}`
    ctx.fillText(subtitle, x + padding, y + 153, w - padding * 2)
    ctx.globalAlpha = 1
  }

  if (hashtag) {
    // 제목과 같은 기준선에 맞춰야 두 줄 사이에 떠 보이지 않는다
    ctx.textAlign = 'right'
    ctx.font = `750 28px ${FONT_STACK}`
    ctx.fillText(hashtag, x + w - padding, y + 112)
  }

  if (date) {
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'right'
    ctx.font = `600 19px ${FONT_STACK}`
    ctx.fillText(date, x + w - padding, y + 153)
  }

  ctx.restore()
}

/**
 * 이미지의 평균색 — 오려낸 인물의 톤을 현장 조명에 맞출 때 기준으로 쓴다.
 * 1x1로 축소해 한 픽셀만 읽는다.
 */
export function averageColor(src: ImageSource): string | null {
  const { w, h } = sourceSize(src)
  if (!w || !h) return null
  try {
    const tiny = document.createElement('canvas')
    tiny.width = 1
    tiny.height = 1
    const tctx = tiny.getContext('2d', { willReadFrequently: true })
    if (!tctx) return null
    tctx.imageSmoothingEnabled = true
    tctx.drawImage(src, 0, 0, 1, 1)
    const [r, g, b] = tctx.getImageData(0, 0, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  } catch {
    return null
  }
}

export interface CutoutPersonOptions {
  /** 현장 촬영분의 평균색 — 인물 톤을 매장 조명 쪽으로 살짝 당긴다 */
  toneColor?: string | null
  toneStrength?: number
  /** 바닥에 붙어 보이도록 그림자를 깐다 */
  shadow?: boolean
  /** 좌우 반전 — 함께 찍는 대상이 손님 쪽을 보게 돌릴 때 */
  flip?: boolean
}

/**
 * 배경을 지운 인물을 현장 촬영분 위에 올린다.
 *
 * 그냥 오려 붙이면 스티커처럼 보이므로 (1) 톤 매칭 (2) 드롭섀도 (3) 경계 살짝 흐리기를
 * 함께 적용한다. 세 가지가 "같이 찍은 것처럼" 보이게 하는 핵심이다.
 */
export function drawCutoutPerson(
  ctx: CanvasRenderingContext2D,
  cutout: ImageSource,
  centerX: number,
  centerY: number,
  width: number,
  rotationDeg: number,
  { toneColor, toneStrength = 0.14, shadow = true, flip = false }: CutoutPersonOptions = {}
) {
  const { w: cw, h: ch } = sourceSize(cutout)
  if (!cw || !ch || width <= 0) return
  const height = Math.round(width * (ch / cw))
  const drawW = Math.round(width)

  // 톤 매칭은 알파가 있는 곳에만 입혀야 하므로 오프스크린에서 source-atop 으로 처리
  let layer: ImageSource = cutout
  if (toneColor && toneStrength > 0) {
    const off = document.createElement('canvas')
    off.width = drawW
    off.height = height
    const octx = off.getContext('2d')
    if (octx) {
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      octx.drawImage(cutout, 0, 0, drawW, height)
      octx.globalCompositeOperation = 'source-atop'
      octx.globalAlpha = toneStrength
      octx.fillStyle = toneColor
      octx.fillRect(0, 0, drawW, height)
      octx.globalAlpha = 1
      octx.globalCompositeOperation = 'source-over'
      layer = off
    }
  }

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((rotationDeg * Math.PI) / 180)
  if (flip) ctx.scale(-1, 1)
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)'
    ctx.shadowBlur = Math.max(8, drawW * 0.05)
    ctx.shadowOffsetY = Math.max(4, height * 0.015)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(layer, -drawW / 2, -height / 2, drawW, height)
  ctx.restore()
}

/** 둥근 모서리로 사진 한 장 배치 (단독 컷 밴드) */
export function drawPhotoCard(
  ctx: CanvasRenderingContext2D,
  src: ImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: FitOptions = {},
  radius = PRINT.radius
) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()
  drawCoverFocal(ctx, src, x, y, w, h, fit)
  ctx.restore()
}
