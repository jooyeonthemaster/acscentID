// K-POP 무대 메이크업 — 포토부스 행사 모드(src/lib/booth/modes.ts 의 stageMakeup)에서 편집 화면에 룩을 고르면
// 얼굴 인식 메이크업(입술·눈두덩·아이라인·볼·광대 — src/lib/booth/face-makeup.ts) + 가벼운 사진 색 보정 +
// 반짝이·하트 같은 스티커 + 인화물 하단 '오늘의 무대 메이크업'(룩 이름·설명·행사 줄)이 입혀진다. docs/kiosk-modes.md '포토부스'
//
// 룩은 아이돌 무대 메이크업에서 자주 보이는 다섯 가지 — 펄 글리터 아이, 볼·콧등을 잇는 블러셔 라인, 체리 레드 립,
// 물광(글래스) 스킨, 컬러 그래픽 라이너. 외국인 손님이 많아 이름·설명은 한국어와 영어를 함께 둔다.

import { FONT_STACK, roundRectPath } from '@/lib/photobooth/compose'

export type StickerMotif = 'sparkle' | 'star' | 'heart' | 'lips' | 'dots' | 'bubble' | 'swoosh'

/** 얼굴에 입히는 메이크업(face-makeup.ts) — alpha 는 발색 세기(0~1) */
export interface FaceMakeup {
  lip?: { color: string; alpha: number; gloss?: number }
  /** 눈두덩 섀도 — reach: 눈썹 쪽으로 얼마나 올리나(0~1), glitter: 펄 색 */
  shadow?: { color: string; alpha: number; reach?: number; glitter?: string[] }
  /** 아이라인 — width 배수, wing: 꼬리 길이 배수, lower: 아랫라인 색, glow: 네온처럼 빛 번짐 */
  liner?: { color: string; width: number; wing: number; lower?: string; glow?: boolean }
  /** 볼 블러셔 — line: 볼·콧등을 잇는 블러셔 라인 */
  blush?: { color: string; alpha: number; line?: boolean }
  /** 하이라이터(콧대·광대·이마·턱) 세기 */
  glow?: number
  /** 피부결 정돈 세기 */
  smooth?: number
}

export interface StageLook {
  id: string
  name: { ko: string; en: string }
  desc: { ko: string; en: string }
  /** 편집 화면 칩 색(그라데이션 두 색) */
  swatch: [string, string]
  /** 사진 색 보정 — CSS filter 값 + 색 덧입히기(soft-light) + 빛 번짐(screen) + 가장자리 어둡게 */
  grade: {
    brightness: number
    contrast: number
    saturate: number
    tint: string
    tintAlpha: number
    glow: number
    vignette: number
  }
  stickers: { motifs: StickerMotif[]; colors: string[]; count: number }
  makeup: FaceMakeup
  /** 인화물 하단 띠 색(어두운 무대 색) */
  footer: string
  accent: string
}

export const STAGE_LOOKS: StageLook[] = [
  {
    id: 'glitter-eye',
    name: { ko: '글리터 스테이지 아이', en: 'Glitter Stage Eye' },
    desc: { ko: '눈두덩에 펄 글리터, 조명 아래 무대처럼 반짝여요', en: 'Pearl glitter lids that sparkle under stage lights' },
    swatch: ['#c9b8ff', '#fff1c1'],
    grade: { brightness: 1.06, contrast: 1.05, saturate: 1.08, tint: '#b9a7ff', tintAlpha: 0.11, glow: 0.11, vignette: 0.11 },
    stickers: { motifs: ['sparkle', 'sparkle', 'dots', 'star'], colors: ['#ffffff', '#ffe08a', '#d9ccff'], count: 14 },
    makeup: { smooth: 0.35, shadow: { color: '#a98bff', alpha: 0.65, reach: 0.55, glitter: ['#ffffff', '#ffe08a', '#e6dbff', '#ffd1f0'] }, liner: { color: '#2a1636', width: 1, wing: 0.7 }, lip: { color: '#e57a92', alpha: 0.45, gloss: 0.5 }, blush: { color: '#ff9fb8', alpha: 0.28 }, glow: 0.25 },
    footer: '#231a45',
    accent: '#c9b8ff',
  },
  {
    id: 'blush-line',
    name: { ko: '블러셔 라인', en: 'Rosy Blush Line' },
    desc: { ko: '볼과 콧등을 잇는 핑크 블러셔로 사랑스럽게', en: 'A rosy blush line across the cheeks and nose' },
    swatch: ['#ffb3c8', '#ffe3d6'],
    grade: { brightness: 1.05, contrast: 0.98, saturate: 1.1, tint: '#ff8fb0', tintAlpha: 0.13, glow: 0.09, vignette: 0.06 },
    stickers: { motifs: ['heart', 'heart', 'dots', 'sparkle'], colors: ['#ff6f9a', '#ffffff', '#ffc2d4'], count: 13 },
    makeup: { smooth: 0.35, blush: { color: '#ff5f8c', alpha: 0.4, line: true }, shadow: { color: '#f08c9c', alpha: 0.35, reach: 0.4 }, liner: { color: '#4a2228', width: 0.8, wing: 0.35 }, lip: { color: '#ff5d85', alpha: 0.55, gloss: 0.55 }, glow: 0.2 },
    footer: '#4a1830',
    accent: '#ff9dbb',
  },
  {
    id: 'cherry-lip',
    name: { ko: '체리 스테이지 립', en: 'Cherry Stage Lip' },
    desc: { ko: '또렷한 체리 레드 립으로 걸크러시 무대 완성', en: 'A bold cherry-red lip for a girl-crush stage' },
    swatch: ['#d3122f', '#2b0a14'],
    grade: { brightness: 1.0, contrast: 1.16, saturate: 1.18, tint: '#c3143a', tintAlpha: 0.10, glow: 0.04, vignette: 0.19 },
    stickers: { motifs: ['lips', 'star', 'star', 'sparkle'], colors: ['#e0102f', '#1a0a10', '#ffffff'], count: 11 },
    makeup: { smooth: 0.3, lip: { color: '#b3001f', alpha: 0.85, gloss: 0.45 }, liner: { color: '#120408', width: 1.35, wing: 1 }, shadow: { color: '#7a2a32', alpha: 0.4, reach: 0.45 }, blush: { color: '#d8556c', alpha: 0.22 } },
    footer: '#2a0710',
    accent: '#ff5a6e',
  },
  {
    id: 'glass-skin',
    name: { ko: '글래스 스킨 글로우', en: 'Glass Skin Glow' },
    desc: { ko: '하이라이터로 빛나는 맑고 투명한 물광 피부', en: 'Dewy highlighter glow for clear glass skin' },
    swatch: ['#f6f4ff', '#cfe9ff'],
    grade: { brightness: 1.1, contrast: 0.92, saturate: 0.96, tint: '#fff4ea', tintAlpha: 0.15, glow: 0.17, vignette: 0.03 },
    stickers: { motifs: ['bubble', 'bubble', 'sparkle', 'dots'], colors: ['#ffffff', '#cfe9ff', '#f7e7ff'], count: 13 },
    makeup: { smooth: 0.6, glow: 0.7, lip: { color: '#ff8f9a', alpha: 0.4, gloss: 0.8 }, blush: { color: '#ffb2b2', alpha: 0.25 }, shadow: { color: '#e7b7a8', alpha: 0.25, reach: 0.35 }, liner: { color: '#3a2626', width: 0.6, wing: 0.2 } },
    footer: '#1d3345',
    accent: '#9fd6ff',
  },
  {
    id: 'neon-liner',
    name: { ko: '네온 그래픽 라이너', en: 'Neon Liner' },
    desc: { ko: '컬러 아이라이너로 그린 네온, 페스티벌 무대처럼', en: 'Neon graphic liner for a festival stage vibe' },
    swatch: ['#19f0ff', '#ff2bd6'],
    grade: { brightness: 1.02, contrast: 1.12, saturate: 1.3, tint: '#7a3cff', tintAlpha: 0.11, glow: 0.07, vignette: 0.16 },
    stickers: { motifs: ['swoosh', 'star', 'sparkle', 'swoosh'], colors: ['#19f0ff', '#ff2bd6', '#fff35c'], count: 12 },
    makeup: { smooth: 0.35, liner: { color: '#19f0ff', width: 1.5, wing: 1.3, lower: '#ff2bd6', glow: true }, shadow: { color: '#7a3cff', alpha: 0.4, reach: 0.45 }, lip: { color: '#cf2f78', alpha: 0.55, gloss: 0.5 }, blush: { color: '#ff6fb5', alpha: 0.2 } },
    footer: '#120a2b',
    accent: '#19f0ff',
  },
]

export function findStageLook(id: string | null | undefined): StageLook | null {
  return STAGE_LOOKS.find((look) => look.id === id) ?? null
}

/** 무대 메이크업 레이아웃 — 사진은 하단 띠 위까지, 띠는 기존 이벤트 푸터와 같은 자리(프레임의 비운 자리와 맞음) */
export const STAGE_LAYOUT = { W: 1200, H: 1800, photoBottom: 1564 - 18, footer: { x: 36, y: 1564, w: 1128, h: 200 } } as const

export interface Rect { x: number; y: number; w: number; h: number }

/** 촬영 화면 실시간 미리보기용 색 보정(CSS filter) — 인화물 applyLookGrade 의 가벼운 판. 틴트는 StageLookLiveTint 가 덧입힌다 */
export function lookPreviewFilter(look: StageLook | null): string | undefined {
  if (!look) return undefined
  const g = look.grade
  return `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturate})`
}

/** 사진 칸들에 룩 색 보정 — 흰 바탕(여백)은 거의 그대로 남는다 */
export function applyLookGrade(ctx: CanvasRenderingContext2D, look: StageLook, rects: Rect[]) {
  const g = look.grade
  for (const r of rects) {
    const w = Math.round(r.w), h = Math.round(r.h)
    if (w <= 0 || h <= 0) continue
    const copy = document.createElement('canvas')
    copy.width = w
    copy.height = h
    const cctx = copy.getContext('2d')
    if (!cctx) continue
    cctx.drawImage(ctx.canvas, r.x, r.y, w, h, 0, 0, w, h)

    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x, r.y, w, h)
    ctx.clip()
    ctx.filter = `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturate})`
    ctx.drawImage(copy, r.x, r.y)
    ctx.filter = 'none'
    // 룩 색을 살짝 덧입힌다
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = g.tintAlpha
    ctx.fillStyle = g.tint
    ctx.fillRect(r.x, r.y, w, h)
    // 무대 조명처럼 밝은 곳이 번진다
    if (g.glow > 0) {
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = g.glow
      ctx.filter = `blur(${Math.round(Math.min(w, h) * 0.02)}px) brightness(1.05)`
      ctx.drawImage(copy, r.x, r.y)
      ctx.filter = 'none'
    }
    // 가장자리를 어둡게 — 가운데(얼굴)로 시선이 모인다
    if (g.vignette > 0) {
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 1
      const cx = r.x + w / 2, cy = r.y + h / 2
      const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.hypot(w, h) * 0.62)
      grad.addColorStop(0, 'rgba(255,255,255,1)')
      grad.addColorStop(1, `rgba(${Math.round(255 * (1 - g.vignette))},${Math.round(255 * (1 - g.vignette))},${Math.round(255 * (1 - g.vignette * 0.8))},1)`)
      ctx.fillStyle = grad
      ctx.fillRect(r.x, r.y, w, h)
    }
    ctx.restore()
  }
}

// 룩마다 같은 자리에 같은 스티커(손님마다 달라지면 미리보기와 인화물이 달라 보일 수 있다)
function seeded(text: string) {
  let a = 0
  for (const c of text) a = (a * 31 + c.charCodeAt(0)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawMotif(ctx: CanvasRenderingContext2D, motif: StickerMotif, size: number, color: string) {
  const s = size / 2
  ctx.fillStyle = color
  ctx.strokeStyle = color
  switch (motif) {
    case 'sparkle': {
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0)
      ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s)
      ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0)
      ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s)
      ctx.fill()
      break
    }
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.45 : s
        const a = (Math.PI / 5) * i - Math.PI / 2
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'heart': {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.8)
      ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.45)
      ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.2, -s * 0.1, 0, s * 0.8)
      ctx.fill()
      break
    }
    case 'lips': {
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.bezierCurveTo(-s * 0.6, -s * 0.55, -s * 0.2, -s * 0.5, 0, -s * 0.28)
      ctx.bezierCurveTo(s * 0.2, -s * 0.5, s * 0.6, -s * 0.55, s, 0)
      ctx.bezierCurveTo(s * 0.55, s * 0.62, -s * 0.55, s * 0.62, -s, 0)
      ctx.fill()
      ctx.globalAlpha *= 0.55
      ctx.lineWidth = Math.max(2, s * 0.08)
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(-s * 0.85, 0.02 * s)
      ctx.quadraticCurveTo(0, s * 0.12, s * 0.85, 0.02 * s)
      ctx.stroke()
      break
    }
    case 'dots': {
      const rand = seeded(`${size}-${color}`)
      for (let i = 0; i < 9; i++) {
        ctx.beginPath()
        ctx.arc((rand() - 0.5) * size, (rand() - 0.5) * size, Math.max(2, s * (0.06 + rand() * 0.1)), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'bubble': {
      ctx.globalAlpha *= 0.85
      ctx.lineWidth = Math.max(2, s * 0.08)
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-s * 0.28, -s * 0.28, s * 0.18, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'swoosh': {
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(4, s * 0.16)
      ctx.beginPath()
      ctx.moveTo(-s, s * 0.4)
      ctx.quadraticCurveTo(-s * 0.1, -s * 0.9, s, -s * 0.2)
      ctx.stroke()
      break
    }
  }
}

/** 사진 가장자리 띠에 스티커 — 가운데(얼굴 자리)와 하단 띠는 비운다. 프레임 위에 붙인다 */
/** avoid: 얼굴 자리(인화 캔버스 좌표) — 스티커가 얼굴을 가리지 않게 비켜 간다 */
export function drawLookStickers(ctx: CanvasRenderingContext2D, look: StageLook, area: Rect, avoid: Rect[] = []) {
  const rand = seeded(look.id)
  const band = Math.min(area.w, area.h) * 0.2
  const placed: { x: number; y: number; r: number }[] = []
  let guard = 0
  while (placed.length < look.stickers.count && guard++ < 400) {
    // 네 변 중 하나를 골라 그 변 가까이
    const side = Math.floor(rand() * 4)
    const along = rand()
    const inset = 30 + rand() * band
    const x = side === 0 ? area.x + inset : side === 1 ? area.x + area.w - inset : area.x + 40 + along * (area.w - 80)
    const y = side === 2 ? area.y + inset : side === 3 ? area.y + area.h - inset : area.y + 40 + along * (area.h - 80)
    const size = 44 + rand() * 70
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + size / 2) * 1.05)) continue
    const r = size / 2
    if (avoid.some((f) => x + r > f.x && x - r < f.x + f.w && y + r > f.y && y - r < f.y + f.h)) continue
    placed.push({ x, y, r: size / 2 })
    const motif = look.stickers.motifs[Math.floor(rand() * look.stickers.motifs.length)]
    const color = look.stickers.colors[Math.floor(rand() * look.stickers.colors.length)]
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rand() - 0.5) * 0.9)
    // 스티커처럼 — 흰 테두리 대신 부드러운 그림자로 사진 위에 떠 보이게
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = size * 0.12
    ctx.shadowOffsetY = size * 0.04
    ctx.globalAlpha = 0.95
    drawMotif(ctx, motif, size, color)
    ctx.restore()
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: (px: number) => string, start: number, min: number) {
  let px = start
  ctx.font = font(px)
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 1
    ctx.font = font(px)
  }
  return px
}

/** 인화물 하단 — 왼쪽 '오늘의 무대 메이크업'(룩 이름·설명, 한·영), 오른쪽 행사 줄 */
export function drawStageMakeupFooter(ctx: CanvasRenderingContext2D, look: StageLook | null, eventLines: readonly [string, string]) {
  const { x, y, w, h } = STAGE_LAYOUT.footer
  const pad = 44
  const bg = look?.footer ?? '#1b1b3a'
  const accent = look?.accent ?? '#c9b8ff'
  ctx.save()
  roundRectPath(ctx, x, y, w, h, 24)
  ctx.clip()
  const grad = ctx.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, bg)
  grad.addColorStop(1, '#0d0d18')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  // 무대 조명 같은 사선 빛줄기
  ctx.globalAlpha = 0.12
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(x + w * 0.58, y)
  ctx.lineTo(x + w * 0.7, y)
  ctx.lineTo(x + w * 0.52, y + h)
  ctx.lineTo(x + w * 0.4, y + h)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  const rightW = 360
  const leftW = w - pad * 2 - rightW - 24
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = accent
  ctx.font = `700 17px ${FONT_STACK}`
  ctx.letterSpacing = '4px'
  ctx.fillText(look ? "TODAY'S STAGE MAKEUP · 오늘의 무대 메이크업" : 'K-POP STAGE MAKEUP PHOTO', x + pad, y + 50, leftW)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = '#ffffff'
  const title = look ? look.name.ko : '무대 메이크업 포토부스'
  const titlePx = fitText(ctx, title, leftW * 0.62, (px) => `800 ${px}px ${FONT_STACK}`, 44, 30)
  ctx.fillText(title, x + pad, y + 104)
  const titleW = ctx.measureText(title).width
  ctx.globalAlpha = 0.82
  ctx.font = `600 ${Math.round(titlePx * 0.5)}px ${FONT_STACK}`
  ctx.fillText(look ? look.name.en : 'Pick your K-POP look', x + pad + titleW + 14, y + 104, leftW - titleW - 14)
  ctx.globalAlpha = 0.92
  const ko = look ? look.desc.ko : '편집 화면에서 무대 메이크업 룩을 골라 보세요'
  fitText(ctx, ko, leftW, (px) => `500 ${px}px ${FONT_STACK}`, 22, 16)
  ctx.fillText(ko, x + pad, y + 144)
  ctx.globalAlpha = 0.68
  const en = look ? look.desc.en : 'Choose a stage makeup look on the edit screen'
  fitText(ctx, en, leftW, (px) => `500 ${px}px ${FONT_STACK}`, 18, 14)
  ctx.fillText(en, x + pad, y + 174)
  ctx.globalAlpha = 1

  // 오른쪽 행사 줄 — 1줄은 두 줄로 나눠 크게(2026 K-WAVE / DANCE FESTIVAL)
  const right = x + w - pad
  ctx.textAlign = 'right'
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(right - rightW, y + 34)
  ctx.lineTo(right - rightW, y + h - 34)
  ctx.stroke()
  ctx.globalAlpha = 1
  const [line1, line2] = eventLines
  const split = line1.match(/^(.*?K-WAVE)\s+(.*)$/)
  ctx.fillStyle = '#ffffff'
  const top = split ? split[1] : line1
  const bottom = split ? split[2] : ''
  fitText(ctx, top, rightW - 24, (px) => `800 ${px}px ${FONT_STACK}`, 34, 20)
  ctx.fillText(top, right, y + 78)
  if (bottom) {
    fitText(ctx, bottom, rightW - 24, (px) => `800 ${px}px ${FONT_STACK}`, 30, 18)
    ctx.fillText(bottom, right, y + 116)
  }
  ctx.globalAlpha = 0.78
  fitText(ctx, line2, rightW - 24, (px) => `500 ${px}px ${FONT_STACK}`, 19, 13)
  ctx.fillText(line2, right, y + 158)
  ctx.restore()
}
