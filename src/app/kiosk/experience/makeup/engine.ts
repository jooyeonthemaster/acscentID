// 버추얼 메이크업 — 사진 속 얼굴의 입술·볼·눈두덩 자리를 찾아(얼굴 특징점 478개) 그 자리에만 색을 올린다.
// 얼굴 모양·피부·이목구비는 건드리지 않는다: 원본 픽셀 위에 색 층만 겹친다(밝기는 원본을 따른다 → 주름·입체가 남는다).
// 사진은 기기 안에서만 본다. 생성형 이미지 API 를 쓰지 않는다.

import { loadVision } from '../kx-vision'

interface P { x: number; y: number }

export interface FaceShape {
  lipsOuter: P[]
  lipsInner: P[]
  cheeks: { x: number; y: number; r: number }[]
  /** 눈두덩(눈꺼풀 선에서 눈썹 쪽으로 절반쯤) — 왼쪽·오른쪽 */
  lids: P[][]
  faceWidth: number
}

// MediaPipe Face Mesh 특징점 번호
const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
const LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
// 눈꺼풀 선(바깥 → 안쪽)과 눈썹 아랫선(바깥 → 안쪽)
const LIDS = [[33, 246, 161, 160, 159, 158, 157, 173, 133], [263, 466, 388, 387, 386, 385, 384, 398, 362]]
const BROWS = [[46, 53, 52, 65, 55], [276, 283, 282, 295, 285]]
const CHEEKS = [[50, 205], [280, 425]]

const along = (line: P[], t: number): P => {
  const at = Math.min(line.length - 1.0001, Math.max(0, t * (line.length - 1)))
  const i = Math.floor(at), f = at - i
  return { x: line[i].x + (line[i + 1].x - line[i].x) * f, y: line[i].y + (line[i + 1].y - line[i].y) * f }
}

/** 사진에서 얼굴 한 명의 화장 자리를 찾는다. 얼굴이 없으면 null */
export async function findFace(photo: HTMLCanvasElement): Promise<FaceShape | null> {
  const engine = await loadVision('face')
  const marks = engine.detect(photo).faceLandmarks[0]
  if (!marks) return null
  const pt = (index: number): P => ({ x: marks[index].x * photo.width, y: marks[index].y * photo.height })
  const faceWidth = Math.hypot(pt(454).x - pt(234).x, pt(454).y - pt(234).y)
  const lids = LIDS.map((lid, side) => {
    const lower = lid.map(pt)
    const brow = BROWS[side].map(pt)
    // 눈꺼풀 선의 각 점을 눈썹 쪽으로 55% 올린 선 — 바깥쪽은 조금 더 넓게
    const upper = lower.map((p, i) => {
      const b = along(brow, i / (lower.length - 1))
      const lift = 0.55 + 0.1 * (1 - i / (lower.length - 1))
      return { x: p.x + (b.x - p.x) * lift, y: p.y + (b.y - p.y) * lift }
    })
    return [...lower, ...upper.reverse()]
  })
  const cheeks = CHEEKS.map(([a, b]) => ({ x: (pt(a).x + pt(b).x) / 2, y: (pt(a).y + pt(b).y) / 2, r: faceWidth * 0.15 }))
  return { lipsOuter: LIPS_OUTER.map(pt), lipsInner: LIPS_INNER.map(pt), cheeks, lids, faceWidth }
}

export interface MakeupLook {
  /** 색(#rrggbb)과 농도(0~1) — 농도 0 이면 바르지 않는다 */
  lip: { color: string; level: number }
  blush: { color: string; level: number }
  eye: { color: string; level: number }
}

let scratch: { mask: HTMLCanvasElement; layer: HTMLCanvasElement } | null = null

function path(ctx: CanvasRenderingContext2D, points: P[]) {
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
}

/**
 * base(원본 사진) 위에 화장을 올려 target 에 그린다.
 * 색 층은 두 번 겹친다: '색'(원본의 밝기는 두고 색상·채도만) + '곱하기'(살짝 깊이). 가장자리는 흐려 경계가 보이지 않게.
 */
export function renderMakeup(target: HTMLCanvasElement, base: HTMLCanvasElement, face: FaceShape, look: MakeupLook) {
  const W = base.width, H = base.height
  if (target.width !== W) target.width = W
  if (target.height !== H) target.height = H
  const ctx = target.getContext('2d')!
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  ctx.drawImage(base, 0, 0)
  if (!scratch) scratch = { mask: document.createElement('canvas'), layer: document.createElement('canvas') }
  const { mask, layer } = scratch
  for (const canvas of [mask, layer]) { if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H } }
  const maskCtx = mask.getContext('2d')!
  const layerCtx = layer.getContext('2d')!

  const tint = (draw: (c: CanvasRenderingContext2D) => void, color: string, blur: number, passes: [GlobalCompositeOperation, number][]) => {
    maskCtx.clearRect(0, 0, W, H)
    maskCtx.fillStyle = '#fff'
    draw(maskCtx)
    layerCtx.globalCompositeOperation = 'source-over'
    layerCtx.clearRect(0, 0, W, H)
    layerCtx.filter = `blur(${blur.toFixed(1)}px)`
    layerCtx.drawImage(mask, 0, 0)
    layerCtx.filter = 'none'
    layerCtx.globalCompositeOperation = 'source-in'
    layerCtx.fillStyle = color
    layerCtx.fillRect(0, 0, W, H)
    for (const [mode, alpha] of passes) {
      if (alpha <= 0.004) continue
      ctx.globalCompositeOperation = mode
      ctx.globalAlpha = Math.min(1, alpha)
      ctx.drawImage(layer, 0, 0)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  const s = face.faceWidth
  if (look.blush.level > 0) {
    tint((c) => {
      for (const cheek of face.cheeks) {
        const g = c.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, cheek.r)
        g.addColorStop(0, 'rgba(255,255,255,0.95)')
        g.addColorStop(0.55, 'rgba(255,255,255,0.5)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = g
        c.beginPath()
        c.ellipse(cheek.x, cheek.y, cheek.r * 1.15, cheek.r * 0.9, 0, 0, Math.PI * 2)
        c.fill()
      }
    }, look.blush.color, s * 0.03, [['color', 0.5 * look.blush.level], ['multiply', 0.28 * look.blush.level]])
  }
  if (look.eye.level > 0) {
    tint((c) => { for (const lid of face.lids) { c.beginPath(); path(c, lid); c.fill() } }, look.eye.color, s * 0.022, [['multiply', 0.5 * look.eye.level], ['color', 0.34 * look.eye.level]])
  }
  if (look.lip.level > 0) {
    tint((c) => { c.beginPath(); path(c, face.lipsOuter); path(c, face.lipsInner); c.fill('evenodd') }, look.lip.color, s * 0.008, [['color', 0.72 * look.lip.level], ['multiply', 0.38 * look.lip.level]])
  }
}
