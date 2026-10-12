// 버추얼 메이크업 — 사진 속 얼굴의 특징점(478개)으로 자리를 찾아 그 자리에만 화장을 올린다.
//  · 색조: 입술 · 볼 · 눈두덩 · 눈썹 · 머리카락 — 원본 픽셀 위에 색 층만 겹친다(밝기는 원본을 따른다 → 주름·입체가 남는다).
//  · 선: 아이라인 · 속눈썹 — 눈꺼풀 선을 따라 그린다.
//  · 얼굴형 보정: 턱선을 안쪽으로 조금 당기고 눈을 살짝 키우며 피부결을 고르게 한다(픽셀을 옮기는 것이라 사람이 바뀌지는 않는다).
// 모두 기기 안에서 한다. 머리 '모양'을 바꾸는 것만 서버의 이미지 생성을 쓴다(MakeupMode · src/lib/kiosk/hairstyle.ts).

import { loadVision } from '../kx-vision'

interface P { x: number; y: number }

export interface FaceShape {
  lipsOuter: P[]
  lipsInner: P[]
  cheeks: { x: number; y: number; r: number }[]
  /** 눈두덩(눈꺼풀 선에서 눈썹 쪽으로 절반쯤) — 왼쪽·오른쪽 */
  lids: P[][]
  /** 윗눈꺼풀 선(바깥 → 안쪽)과 그 눈의 '위' 방향 — 아이라인·속눈썹 */
  lashLines: { line: P[]; up: P; width: number }[]
  brows: P[][]
  /** 눈 구멍(색이 들어가면 안 되는 곳) */
  eyeHoles: P[][]
  oval: P[]
  faceWidth: number
}

// MediaPipe Face Mesh 특징점 번호
const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
const LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
// 눈꺼풀 선(바깥 → 안쪽)과 눈썹 아랫선·윗선(바깥 → 안쪽)
const LIDS = [[33, 246, 161, 160, 159, 158, 157, 173, 133], [263, 466, 388, 387, 386, 385, 384, 398, 362]]
const LOWER_LIDS = [[33, 7, 163, 144, 145, 153, 154, 155, 133], [263, 249, 390, 373, 374, 380, 381, 382, 362]]
const BROWS = [[46, 53, 52, 65, 55], [276, 283, 282, 295, 285]]
const BROW_TOPS = [[70, 63, 105, 66, 107], [300, 293, 334, 296, 336]]
const CHEEKS = [[50, 205], [280, 425]]
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
// 얼굴형 보정에서 안쪽으로 당기는 턱선·아래 볼의 점
const JAW = [58, 172, 136, 150, 149, 288, 397, 365, 379, 378, 132, 361]

const along = (line: P[], t: number): P => {
  const at = Math.min(line.length - 1.0001, Math.max(0, t * (line.length - 1)))
  const i = Math.floor(at), f = at - i
  return { x: line[i].x + (line[i + 1].x - line[i].x) * f, y: line[i].y + (line[i + 1].y - line[i].y) * f }
}
const unit = (x: number, y: number): P => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d } }

/** 사진에서 얼굴 한 명의 특징점(사진 픽셀). 얼굴이 없으면 null */
export async function findFaceMarks(photo: HTMLCanvasElement): Promise<P[] | null> {
  const engine = await loadVision('face')
  const marks = engine.detect(photo).faceLandmarks[0]
  return marks ? marks.map((mark) => ({ x: mark.x * photo.width, y: mark.y * photo.height })) : null
}

/** 특징점에서 화장할 자리를 뽑는다 */
export function shapeOf(marks: P[]): FaceShape {
  const pt = (index: number) => marks[index]
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
  const lashLines = LIDS.map((lid, side) => {
    const line = lid.map(pt)
    const brow = along(BROWS[side].map(pt), 0.5), mid = along(line, 0.5)
    return { line, up: unit(brow.x - mid.x, brow.y - mid.y), width: Math.hypot(line[0].x - line[line.length - 1].x, line[0].y - line[line.length - 1].y) }
  })
  const cheeks = CHEEKS.map(([a, b]) => ({ x: (pt(a).x + pt(b).x) / 2, y: (pt(a).y + pt(b).y) / 2, r: faceWidth * 0.15 }))
  return {
    lipsOuter: LIPS_OUTER.map(pt), lipsInner: LIPS_INNER.map(pt), cheeks, lids, lashLines,
    brows: BROWS.map((lower, side) => [...BROW_TOPS[side].map(pt), ...lower.map(pt).reverse()]),
    eyeHoles: LIDS.map((upper, side) => [...upper.map(pt), ...LOWER_LIDS[side].map(pt).reverse()]),
    oval: OVAL.map(pt),
    faceWidth,
  }
}

// ───────────────────────── 얼굴형 보정 ─────────────────────────

const falloff = (t: number) => (t >= 1 ? 0 : (1 - t * t) * (1 - t * t))

/**
 * 얼굴형 보정 — level(0~1)만큼 턱선을 얼굴 가운데 쪽으로 당기고(가장 세게 해도 얼굴 반 폭의 7%쯤), 눈을 조금 키우고, 피부결을 고르게 한다.
 * 픽셀을 옮기는 일이라(각 점이 '어디서 왔는지'를 거꾸로 찾아 읽는다) 얼굴 둘레만 계산한다. 바뀐 그림과 그에 맞춰 옮긴 특징점을 돌려준다.
 */
export function beautify(base: HTMLCanvasElement, marks: P[], level: number): { canvas: HTMLCanvasElement; marks: P[] } {
  if (level <= 0.01) return { canvas: base, marks }
  const W = base.width, H = base.height
  const top = marks[10], chin = marks[152]
  const faceWidth = Math.hypot(marks[454].x - marks[234].x, marks[454].y - marks[234].y)
  const axis = unit(chin.x - top.x, chin.y - top.y)
  // 옮기는 붓들 — [가운데, 반지름, 옮길 벡터] 또는 눈 키우기 [가운데, 반지름, 배율]
  const pulls = JAW.map((index) => {
    const c = marks[index]
    const along0 = (c.x - top.x) * axis.x + (c.y - top.y) * axis.y
    const foot = { x: top.x + axis.x * along0, y: top.y + axis.y * along0 }
    const strength = (index === 132 || index === 361 ? 0.02 : 0.034) * level
    return { c, r: faceWidth * 0.3, v: { x: (foot.x - c.x) * strength, y: (foot.y - c.y) * strength } }
  })
  const grows = LIDS.map((lid, side) => {
    const a = marks[lid[0]], b = marks[lid[lid.length - 1]]
    const lower = marks[LOWER_LIDS[side][4]], upper = marks[lid[4]]
    return { c: { x: (a.x + b.x + lower.x + upper.x) / 4, y: (a.y + b.y + lower.y + upper.y) / 4 }, r: Math.hypot(a.x - b.x, a.y - b.y) * 1.05, k: 0.09 * level }
  })
  /** 그 자리의 그림이 옮겨 가는 양 */
  const shift = (x: number, y: number): P => {
    let dx = 0, dy = 0
    for (const pull of pulls) {
      const w = falloff(Math.hypot(x - pull.c.x, y - pull.c.y) / pull.r)
      if (w) { dx += pull.v.x * w; dy += pull.v.y * w }
    }
    for (const grow of grows) {
      const w = falloff(Math.hypot(x - grow.c.x, y - grow.c.y) / grow.r)
      if (w) { dx += (x - grow.c.x) * grow.k * w; dy += (y - grow.c.y) * grow.k * w }
    }
    return { x: dx, y: dy }
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(base, 0, 0)
  // 얼굴 둘레만
  const xs = marks.map((mark) => mark.x), ys = marks.map((mark) => mark.y)
  const pad = faceWidth * 0.32
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), y0 = Math.max(0, Math.floor(Math.min(...ys) - pad))
  const x1 = Math.min(W, Math.ceil(Math.max(...xs) + pad)), y1 = Math.min(H, Math.ceil(Math.max(...ys) + pad))
  const rw = x1 - x0, rh = y1 - y0
  if (rw > 4 && rh > 4) {
    const source = base.getContext('2d')!.getImageData(x0, y0, rw, rh)
    const out = ctx.createImageData(rw, rh)
    const src = source.data, dst = out.data
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const d = shift(x + x0, y + y0)
        // 이 자리에 올 그림은 d 만큼 덜 옮겨진 곳에 있다 — 두 줄 사이를 섞어 읽는다
        const sx = Math.min(rw - 1.001, Math.max(0, x - d.x)), sy = Math.min(rh - 1.001, Math.max(0, y - d.y))
        const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy
        const a = (iy * rw + ix) * 4, b = a + 4, c = a + rw * 4, e = c + 4
        const o = (y * rw + x) * 4
        for (let k = 0; k < 3; k++) dst[o + k] = (src[a + k] * (1 - fx) + src[b + k] * fx) * (1 - fy) + (src[c + k] * (1 - fx) + src[e + k] * fx) * fy
        dst[o + 3] = 255
      }
    }
    ctx.putImageData(out, x0, y0)
  }
  const moved = marks.map((mark) => { const d = shift(mark.x, mark.y); return { x: mark.x + d.x, y: mark.y + d.y } })

  // 피부결 — 얼굴 안쪽(눈·눈썹·입 빼고)에 흐린 그림을 옅게 겹친다
  const face = shapeOf(moved)
  const soft = document.createElement('canvas')
  soft.width = W
  soft.height = H
  const softCtx = soft.getContext('2d')!
  softCtx.fillStyle = '#fff'
  softCtx.filter = `blur(${(faceWidth * 0.03).toFixed(1)}px)`
  softCtx.beginPath()
  path(softCtx, face.oval)
  for (const hole of [...face.eyeHoles, ...face.brows, face.lipsOuter]) path(softCtx, hole)
  softCtx.fill('evenodd')
  softCtx.globalCompositeOperation = 'source-in'
  softCtx.filter = `blur(${(faceWidth * 0.012).toFixed(1)}px)`
  softCtx.drawImage(canvas, 0, 0)
  softCtx.filter = 'none'
  ctx.globalAlpha = 0.5 * level
  ctx.drawImage(soft, 0, 0)
  ctx.globalAlpha = 1
  return { canvas, marks: moved }
}

// ───────────────────────── 머리카락 ─────────────────────────

/** 머리카락 자리(사진과 같은 크기, 알파가 머리카락일 확률). 못 찾으면 null */
export async function findHair(photo: HTMLCanvasElement): Promise<HTMLCanvasElement | null> {
  const engine = await loadVision('hair')
  const result = engine.segment(photo)
  const mask = result.confidenceMasks?.[1]
  if (!mask) { result.close(); return null }
  const values = mask.getAsFloat32Array(), mw = mask.width, mh = mask.height
  const small = document.createElement('canvas')
  small.width = mw
  small.height = mh
  const smallCtx = small.getContext('2d')!
  const image = smallCtx.createImageData(mw, mh)
  let covered = 0
  for (let i = 0; i < values.length; i++) {
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = 255
    image.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, (values[i] - 0.1) / 0.4)) * 255)
    if (values[i] > 0.5) covered++
  }
  result.close()
  if (covered < values.length * 0.01) return null
  smallCtx.putImageData(image, 0, 0)
  const out = document.createElement('canvas')
  out.width = photo.width
  out.height = photo.height
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = `blur(${(photo.width / mw).toFixed(1)}px)`
  ctx.drawImage(small, 0, 0, out.width, out.height)
  return out
}

// ───────────────────────── 그리기 ─────────────────────────

export interface MakeupLook {
  /** 색(#rrggbb)과 농도(0~1) — 농도 0 이면 바르지 않는다 */
  lip: { color: string; level: number }
  blush: { color: string; level: number }
  eye: { color: string; level: number }
  brow: { color: string; level: number }
  /** 아이라인 — wing 이면 눈꼬리를 뺀다 */
  liner: { color: string; level: number; wing: boolean }
  lash: { level: number }
  hair: { color: string; level: number }
}

let scratch: { mask: HTMLCanvasElement; layer: HTMLCanvasElement } | null = null

function path(ctx: CanvasRenderingContext2D, points: P[]) {
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
}

/** 밝은 색인가 — 머리 염색에서 밝은 색은 '밝히는' 층을 하나 더 얹는다 */
const luma = (hex: string) => (parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114) / 255

/**
 * base(원본 또는 보정한 사진) 위에 화장을 올려 target 에 그린다. hair 는 findHair 가 준 머리카락 자리(없으면 머리 색은 건너뛴다).
 * 색 층은 두 번 겹친다: '색'(원본의 밝기는 두고 색상·채도만) + '곱하기'(살짝 깊이). 가장자리는 흐려 경계가 보이지 않게.
 */
export function renderMakeup(target: HTMLCanvasElement, base: HTMLCanvasElement, face: FaceShape, look: MakeupLook, hair: HTMLCanvasElement | null = null) {
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
  if (hair && look.hair.level > 0) {
    const bright = luma(look.hair.color)
    // 어두운 머리에 밝은 색을 입히려면 색만 바꿔서는 탁한 풀빛이 된다 — 먼저 밝힌 다음 색을 입힌다
    tint((c) => c.drawImage(hair, 0, 0), look.hair.color, 0.5, [['screen', Math.max(0, bright - 0.25) * 0.95 * look.hair.level], ['color', 0.85 * look.hair.level], ['soft-light', 0.3 * look.hair.level]])
  }
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
  if (look.brow.level > 0) {
    tint((c) => { for (const brow of face.brows) { c.beginPath(); path(c, brow); c.fill() } }, look.brow.color, s * 0.007, [['multiply', 0.62 * look.brow.level], ['color', 0.3 * look.brow.level]])
  }
  if (look.eye.level > 0) {
    tint((c) => { for (const lid of face.lids) { c.beginPath(); path(c, lid); c.fill() } }, look.eye.color, s * 0.022, [['multiply', 0.5 * look.eye.level], ['color', 0.34 * look.eye.level]])
  }
  if (look.liner.level > 0) {
    // 윗눈꺼풀 선을 따라 — 눈꼬리 쪽이 굵고 눈머리로 갈수록 가늘다
    tint((c) => {
      for (const { line, up, width } of face.lashLines) {
        const thick = width * (0.03 + 0.045 * look.liner.level)
        const outer = line[0], inner = line[line.length - 1]
        const out = unit(outer.x - inner.x, outer.y - inner.y)
        c.beginPath()
        c.moveTo(outer.x, outer.y)
        line.forEach((p) => c.lineTo(p.x, p.y))
        for (let i = line.length - 1; i >= 0; i--) {
          const t = 1 - i / (line.length - 1)
          const lift = thick * (0.25 + 0.75 * t)
          c.lineTo(line[i].x + up.x * lift, line[i].y + up.y * lift)
        }
        if (look.liner.wing) {
          const tip = { x: outer.x + out.x * width * 0.24 + up.x * width * 0.13, y: outer.y + out.y * width * 0.24 + up.y * width * 0.13 }
          c.lineTo(tip.x, tip.y)
        }
        c.closePath()
        c.fill()
      }
    }, look.liner.color, s * 0.0028, [['source-over', 0.5 + 0.42 * look.liner.level]])
  }
  if (look.lash.level > 0) {
    // 속눈썹 — 눈꺼풀 선에서 위·바깥으로 살짝 휘는 짧은 선들
    ctx.save()
    ctx.strokeStyle = '#17120f'
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.55 + 0.4 * look.lash.level
    for (const { line, up, width } of face.lashLines) {
      const outer = line[0], inner = line[line.length - 1]
      const out = unit(outer.x - inner.x, outer.y - inner.y)
      const count = 13
      for (let i = 0; i < count; i++) {
        const t = 0.04 + (i / (count - 1)) * 0.82
        const root = along(line, t)
        // 눈꼬리 쪽은 바깥으로 눕고, 가운데는 위로 선다
        const lean = 0.85 * (1 - t) * (1 - t) - 0.12 * t
        const dir = unit(up.x + out.x * lean, up.y + out.y * lean)
        const length = width * (0.09 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * (0.55 + 0.75 * look.lash.level)
        ctx.lineWidth = Math.max(0.7, width * (0.014 + 0.008 * look.lash.level))
        ctx.beginPath()
        ctx.moveTo(root.x, root.y)
        ctx.quadraticCurveTo(root.x + dir.x * length * 0.55 + out.x * length * 0.12, root.y + dir.y * length * 0.55 + out.y * length * 0.12, root.x + dir.x * length, root.y + dir.y * length)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
  if (look.lip.level > 0) {
    tint((c) => { c.beginPath(); path(c, face.lipsOuter); path(c, face.lipsInner); c.fill('evenodd') }, look.lip.color, s * 0.008, [['color', 0.72 * look.lip.level], ['multiply', 0.38 * look.lip.level]])
  }
}
