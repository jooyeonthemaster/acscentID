// K-POP 무대 메이크업 — 얼굴 인식(MediaPipe Face Landmarker, 478 특징점)으로 이목구비를 찾아
// 입술·눈두덩·아이라인·볼·콧등·광대에 실제 화장처럼 색을 입힌다(src/lib/booth/stage-makeup.ts 의 룩별 makeup).
//
// - 모델·wasm 은 public 에 자체 호스팅(/models/face_landmarker.task, /mediapipe/wasm) — 행사장 인터넷이 약해도 동작
// - 사진(편집·인화)은 makeupShot: 원본 크기(긴 변 1800 이하)에 그려 캐시, 실시간 화면은 paintFaceMakeup 을 매 프레임
// - 얼굴을 못 찾거나 모델을 못 불러오면 원본 그대로(부스가 멈추면 안 된다)
// - 색은 곱하기(multiply)로 피부결을 살리고 soft-light 로 발색, 가장자리는 blur 로 번지게 — 스티커처럼 떠 보이지 않게

import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { StageLook, FaceMakeup } from './stage-makeup'

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/models/face_landmarker.task'
const MAX_FACES = 6
/** 편집·인화용 메이크업 사진의 긴 변 상한 — 인화 칸(최대 1200×1546)보다 충분히 크게 */
const SHOT_EDGE = 1800

type Mode = 'IMAGE' | 'VIDEO'
const landmarkers: Partial<Record<Mode, Promise<FaceLandmarker>>> = {}

async function createLandmarker(runningMode: Mode): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  const common = { runningMode, numFaces: MAX_FACES, minFaceDetectionConfidence: 0.4, minFacePresenceConfidence: 0.4 }
  try {
    return await FaceLandmarker.createFromOptions(fileset, { ...common, baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' } })
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, { ...common, baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' } })
  }
}

function getLandmarker(mode: Mode): Promise<FaceLandmarker> {
  if (!landmarkers[mode]) {
    landmarkers[mode] = createLandmarker(mode).catch((error) => {
      delete landmarkers[mode] // 실패를 캐시하지 않는다 — 다음에 다시 시도
      throw error
    })
  }
  return landmarkers[mode]!
}

/**
 * 행사 모드 첫 화면에서 미리 불러 두고 빈 그림으로 한 번씩 돌려 둔다 — 부스 PC(Intel UHD)에서 첫 검출은
 * GPU 준비로 2초쯤 걸리고 그다음부터 수십 ms. 손님이 찍은 뒤 기다리지 않게 첫 화면에서 미리 치른다.
 */
let warmed = false
export function preloadFaceMakeup() {
  if (warmed) return
  warmed = true
  const blank = document.createElement('canvas')
  blank.width = blank.height = 64
  blank.getContext('2d')!.fillRect(0, 0, 64, 64)
  void getLandmarker('IMAGE').then((m) => { m.detect(blank) }).catch(() => { warmed = false })
  void getLandmarker('VIDEO').then((m) => { m.detectForVideo(blank, performance.now()) }).catch(() => { warmed = false })
}

// ───────────────────────── 특징점 번호(MediaPipe face mesh) ─────────────────────────

const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

/** 사진 속 오른쪽 눈(인물의 오른쪽) / 왼쪽 눈 — 윗눈꺼풀은 안쪽→바깥쪽, 아랫눈꺼풀도 안쪽→바깥쪽 */
const EYES = [
  {
    upper: [133, 173, 157, 158, 159, 160, 161, 246, 33],
    lower: [133, 155, 154, 153, 145, 144, 163, 7, 33],
    brow: [55, 65, 52, 53, 46],
    outer: 33,
    cheek: 50,
    cheekbone: 117,
  },
  {
    upper: [362, 398, 384, 385, 386, 387, 388, 466, 263],
    lower: [362, 382, 381, 380, 374, 373, 390, 249, 263],
    brow: [285, 295, 282, 283, 276],
    outer: 263,
    cheek: 280,
    cheekbone: 346,
  },
]
const BROWS = [[70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]]

interface P { x: number; y: number }
type Face = P[]

const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const avg = (ps: P[]): P => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length })
const unit = (a: P, b: P): P => { const d = dist(a, b) || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d } }

function toPixels(marks: NormalizedLandmark[], w: number, h: number): Face {
  return marks.map((m) => ({ x: m.x * w, y: m.y * h }))
}

function polyPath(ctx: CanvasRenderingContext2D, face: Face, idx: number[]) {
  idx.forEach((i, n) => (n ? ctx.lineTo(face[i].x, face[i].y) : ctx.moveTo(face[i].x, face[i].y)))
  ctx.closePath()
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: P[], closed: boolean) {
  if (pts.length < 3) { pts.forEach((p, n) => (n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); return }
  const mid = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  if (closed) {
    const start = mid(pts[pts.length - 1], pts[0])
    ctx.moveTo(start.x, start.y)
    pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); ctx.quadraticCurveTo(p.x, p.y, m.x, m.y) })
    ctx.closePath()
  } else {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) { const m = mid(pts[i], pts[i + 1]); ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y) }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  }
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// ───────────────────────── 레이어 합성 ─────────────────────────

// 레이어는 지금 칠하는 얼굴 둘레(region)만큼만 — 사진 전체 크기로 매번 번지게 하면 여럿 찍은 컷에서 수 초가 걸린다
interface Region { x: number; y: number; w: number; h: number }
let region: Region = { x: 0, y: 0, w: 1, h: 1 }
let layerCanvas: HTMLCanvasElement | null = null
/** 캔버스 좌표 그대로 그리면 되는 레이어(region 만큼) */
function layer() {
  if (!layerCanvas) layerCanvas = document.createElement('canvas')
  if (layerCanvas.width !== region.w || layerCanvas.height !== region.h) { layerCanvas.width = region.w; layerCanvas.height = region.h }
  const l = layerCanvas.getContext('2d')!
  l.setTransform(1, 0, 0, 1, 0, 0)
  l.globalCompositeOperation = 'source-over'
  l.globalAlpha = 1
  l.filter = 'none'
  l.clearRect(0, 0, region.w, region.h)
  l.setTransform(1, 0, 0, 1, -region.x, -region.y)
  return l
}

/** draw 로 그린 모양을 blur 로 번지게 해서 passes(합성 방식·세기) 순서대로 입힌다 */
function paint(
  ctx: CanvasRenderingContext2D,
  draw: (l: CanvasRenderingContext2D) => void,
  blur: number,
  passes: [GlobalCompositeOperation, number][],
) {
  const l = layer()
  draw(l)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.beginPath(); ctx.rect(region.x, region.y, region.w, region.h); ctx.clip()
  ctx.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none'
  for (const [op, alpha] of passes) {
    if (alpha <= 0) continue
    ctx.globalCompositeOperation = op
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(l.canvas, region.x, region.y)
  }
  ctx.restore()
}

// ───────────────────────── 부위별 메이크업 ─────────────────────────

function faceGeometry(face: Face) {
  const width = dist(face[234], face[454])
  const up = unit(face[152], face[10])
  return { width, up }
}

function shadowRegion(face: Face, eye: (typeof EYES)[number], reach: number): P[] {
  const lid = eye.upper.map((i) => face[i])
  const center = avg([...eye.upper, ...eye.lower].map((i) => face[i]))
  // 눈썹 아래쪽 점을 눈 가운데 쪽으로 당긴 선이 윗경계 — reach 가 클수록 눈썹 가까이까지
  const top = [...eye.brow].reverse().map((i) => lerp(center, face[i], 0.35 + reach * 0.5))
  return [...lid, ...top]
}

function drawLips(ctx: CanvasRenderingContext2D, face: Face, m: NonNullable<FaceMakeup['lip']>, fw: number) {
  const shape = (l: CanvasRenderingContext2D) => {
    l.fillStyle = m.color
    l.beginPath()
    smoothPath(l, LIPS_OUTER.map((i) => face[i]), true)
    smoothPath(l, LIPS_INNER.map((i) => face[i]), true)
    l.fill('evenodd')
  }
  paint(ctx, shape, fw * 0.006, [['multiply', m.alpha], ['soft-light', m.alpha * 0.8], ['source-over', m.alpha * 0.28]])
  if (m.gloss) {
    // 아랫입술 가운데 윤기
    const a = face[14], b = face[17]
    const c = lerp(a, b, 0.42)
    paint(ctx, (l) => {
      l.fillStyle = '#ffffff'
      l.beginPath()
      l.ellipse(c.x, c.y, fw * 0.045, fw * 0.014, Math.atan2(face[291].y - face[61].y, face[291].x - face[61].x), 0, Math.PI * 2)
      l.fill()
    }, fw * 0.012, [['screen', m.gloss]])
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, face: Face, m: NonNullable<FaceMakeup['shadow']>, fw: number, seed: number) {
  const regions = EYES.map((eye) => shadowRegion(face, eye, m.reach ?? 0.5))
  paint(ctx, (l) => {
    l.fillStyle = m.color
    for (const r of regions) { l.beginPath(); smoothPath(l, r, true); l.fill() }
    // 눈 부분은 비운다(눈동자·흰자에 색이 묻지 않게)
    l.globalCompositeOperation = 'destination-out'
    for (const eye of EYES) { l.beginPath(); smoothPath(l, [...eye.upper, ...[...eye.lower].reverse()].map((i) => face[i]), true); l.fill() }
  }, fw * 0.03, [['multiply', m.alpha], ['soft-light', m.alpha]])

  const glitter = m.glitter ?? []
  if (glitter.length) {
    const rand = seeded(seed)
    paint(ctx, (l) => {
      for (const r of regions) {
        const path = new Path2D()
        r.forEach((p, n) => (n ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)))
        path.closePath()
        const xs = r.map((p) => p.x), ys = r.map((p) => p.y)
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
        let placed = 0
        for (let tries = 0; placed < 42 && tries < 600; tries++) {
          const x = x0 + rand() * (x1 - x0), y = y0 + rand() * (y1 - y0)
          if (!l.isPointInPath(path, x - region.x, y - region.y)) continue // 판정은 변환 전(레이어) 좌표
          placed++
          l.fillStyle = glitter[Math.floor(rand() * glitter.length)]
          const r0 = fw * (0.0016 + rand() * 0.0026)
          l.globalAlpha = 0.45 + rand() * 0.5
          l.beginPath(); l.arc(x, y, r0, 0, Math.PI * 2); l.fill()
          if (rand() < 0.08) {
            // 큰 반짝이 — 십자 빛
            const s = r0 * 3.2
            l.beginPath()
            l.moveTo(x - s, y); l.lineTo(x - r0 * 0.3, y - r0 * 0.3); l.lineTo(x, y - s); l.lineTo(x + r0 * 0.3, y - r0 * 0.3)
            l.lineTo(x + s, y); l.lineTo(x + r0 * 0.3, y + r0 * 0.3); l.lineTo(x, y + s); l.lineTo(x - r0 * 0.3, y + r0 * 0.3)
            l.closePath(); l.fill()
          }
        }
      }
    }, fw * 0.0012, [['screen', 0.85], ['source-over', 0.25]])
  }
}

function drawLiner(ctx: CanvasRenderingContext2D, face: Face, m: NonNullable<FaceMakeup['liner']>, fw: number, up: P) {
  const width = fw * 0.0075 * m.width
  const strokes = (l: CanvasRenderingContext2D) => {
    l.strokeStyle = m.color
    l.lineCap = 'round'
    l.lineJoin = 'round'
    for (const eye of EYES) {
      const lid = eye.upper.map((i) => face[i])
      const outer = face[eye.outer]
      const dir = unit(face[eye.upper[2]], outer)
      const eyeW = dist(face[eye.upper[0]], outer)
      const tip = {
        x: outer.x + (dir.x * 0.34 + up.x * 0.2) * eyeW * m.wing,
        y: outer.y + (dir.y * 0.34 + up.y * 0.2) * eyeW * m.wing,
      }
      // 안쪽은 가늘게, 바깥으로 갈수록 두껍게
      for (let seg = 0; seg < lid.length - 1; seg++) {
        l.lineWidth = width * (0.45 + (seg / (lid.length - 2)) * 0.75)
        l.beginPath(); l.moveTo(lid[seg].x, lid[seg].y); l.lineTo(lid[seg + 1].x, lid[seg + 1].y); l.stroke()
      }
      if (m.wing > 0) {
        l.fillStyle = m.color
        const back = lid[lid.length - 3]
        l.beginPath()
        l.moveTo(back.x, back.y - width * 0.3)
        l.quadraticCurveTo(outer.x + up.x * width, outer.y + up.y * width, tip.x, tip.y)
        l.lineTo(outer.x - up.x * width * 0.6, outer.y - up.y * width * 0.6)
        l.closePath()
        l.fill()
      }
      if (m.lower) {
        // 아랫라인 바깥쪽 절반
        const low = eye.lower.slice(4).map((i) => face[i])
        l.strokeStyle = m.lower
        l.lineWidth = width * 0.7
        l.beginPath(); smoothPath(l, low, false); l.stroke()
        l.strokeStyle = m.color
      }
    }
  }
  if (m.glow) paint(ctx, strokes, width * 2.2, [['screen', 0.9]])
  paint(ctx, strokes, width * 0.18, [[m.glow ? 'source-over' : 'multiply', m.glow ? 0.92 : 0.9], ...(m.glow ? [] : [['source-over', 0.35]] as [GlobalCompositeOperation, number][])])
}

function drawBlush(ctx: CanvasRenderingContext2D, face: Face, m: NonNullable<FaceMakeup['blush']>, fw: number) {
  paint(ctx, (l) => {
    l.fillStyle = m.color
    for (const eye of EYES) {
      const c = lerp(face[eye.cheek], face[eye.cheekbone], 0.35)
      l.beginPath(); l.ellipse(c.x, c.y, fw * 0.11, fw * 0.075, 0, 0, Math.PI * 2); l.fill()
    }
    if (m.line) {
      // 볼 — 콧등 — 볼을 잇는 블러셔 라인(아이돌 '코 블러셔')
      const a = lerp(face[EYES[0].cheek], face[EYES[0].cheekbone], 0.3)
      const b = lerp(face[EYES[1].cheek], face[EYES[1].cheekbone], 0.3)
      const nose = lerp(face[195], face[5], 0.4)
      l.strokeStyle = m.color
      l.lineCap = 'round'
      l.lineWidth = fw * 0.06
      l.beginPath(); l.moveTo(a.x, a.y); l.quadraticCurveTo(nose.x, nose.y, b.x, b.y); l.stroke()
    }
  }, fw * 0.09, [['multiply', m.alpha * 0.8], ['soft-light', m.alpha]])
}

function drawGlow(ctx: CanvasRenderingContext2D, face: Face, amount: number, fw: number) {
  paint(ctx, (l) => {
    l.fillStyle = '#ffffff'
    l.strokeStyle = '#ffffff'
    l.lineCap = 'round'
    // 콧대
    l.lineWidth = fw * 0.03
    l.beginPath(); l.moveTo(face[6].x, face[6].y); l.lineTo(face[195].x, face[195].y); l.stroke()
    // 광대 위·턱·인중 위(이마는 앞머리에 가려지는 일이 많아 뺀다)
    for (const eye of EYES) {
      const c = lerp(face[eye.cheekbone], face[eye.outer], 0.3)
      l.beginPath(); l.ellipse(c.x, c.y, fw * 0.08, fw * 0.04, 0, 0, Math.PI * 2); l.fill()
    }
    const spots: [P, number][] = [[lerp(face[152], face[17], 0.35), 0.03], [lerp(face[0], face[164], 0.5), 0.014]]
    for (const [p, r] of spots) { l.beginPath(); l.arc(p.x, p.y, fw * r, 0, Math.PI * 2); l.fill() }
  }, fw * 0.035, [['soft-light', amount], ['screen', amount * 0.45]])
}

function drawSmooth(ctx: CanvasRenderingContext2D, face: Face, amount: number, fw: number) {
  // 얼굴 안쪽만 살짝 흐리게 섞어 피부결을 정돈 — 눈·눈썹·입은 또렷하게 남긴다
  const l = layer()
  l.filter = `blur(${(fw * 0.012).toFixed(1)}px)`
  l.drawImage(ctx.canvas, 0, 0)
  l.filter = 'none'
  l.globalCompositeOperation = 'destination-in'
  l.filter = `blur(${(fw * 0.02).toFixed(1)}px)`
  l.beginPath(); polyPath(l, face, FACE_OVAL); l.fillStyle = '#000'; l.fill()
  l.filter = `blur(${(fw * 0.012).toFixed(1)}px)`
  l.globalCompositeOperation = 'destination-out'
  for (const eye of EYES) { l.beginPath(); smoothPath(l, [...eye.upper, ...[...eye.lower].reverse()].map((i) => face[i]), true); l.lineWidth = fw * 0.03; l.fill(); l.stroke() }
  for (const brow of BROWS) { l.beginPath(); polyPath(l, face, brow); l.lineWidth = fw * 0.02; l.fill(); l.stroke() }
  l.beginPath(); polyPath(l, face, LIPS_OUTER); l.lineWidth = fw * 0.015; l.fill(); l.stroke()
  l.filter = 'none'
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = amount
  ctx.drawImage(l.canvas, region.x, region.y)
  ctx.restore()
}

/** 캔버스(ctx)에 이미 그려진 사진 위, faces(같은 캔버스 픽셀 좌표) 얼굴마다 룩의 메이크업을 입힌다 */
export function paintFaceMakeup(ctx: CanvasRenderingContext2D, look: StageLook, faces: Face[]) {
  const m = look.makeup
  faces.forEach((face, n) => {
    const { width: fw, up } = faceGeometry(face)
    if (fw < 24) return // 너무 작은 얼굴(멀리 선 사람)은 건너뛴다
    const xs = face.map((p) => p.x), ys = face.map((p) => p.y)
    const pad = fw * 0.35
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), y0 = Math.max(0, Math.floor(Math.min(...ys) - pad))
    const x1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...xs) + pad)), y1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...ys) + pad))
    if (x1 - x0 < 8 || y1 - y0 < 8) return
    region = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    if (m.smooth) drawSmooth(ctx, face, m.smooth, fw)
    if (m.blush) drawBlush(ctx, face, m.blush, fw)
    if (m.shadow) drawShadow(ctx, face, m.shadow, fw, 97 + n * 31)
    if (m.liner) drawLiner(ctx, face, m.liner, fw, up)
    if (m.lip) drawLips(ctx, face, m.lip, fw)
    if (m.glow) drawGlow(ctx, face, m.glow, fw)
  })
}

// ───────────────────────── 사진(편집·인화) ─────────────────────────

type Source = HTMLImageElement | HTMLCanvasElement
const detectCache = new WeakMap<Source, Promise<{ canvas: HTMLCanvasElement; faces: Face[] }>>()
const shotCache = new WeakMap<Source, Map<string, Promise<HTMLCanvasElement | Source>>>()

function baseCanvas(src: Source) {
  const w0 = src instanceof HTMLImageElement ? src.naturalWidth : src.width
  const h0 = src instanceof HTMLImageElement ? src.naturalHeight : src.height
  const k = Math.min(1, SHOT_EDGE / Math.max(w0, h0))
  const c = document.createElement('canvas')
  c.width = Math.round(w0 * k)
  c.height = Math.round(h0 * k)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c
}

/**
 * 사진 전체를 한 번에 보면 얼굴 검출기가 작은 입력으로 줄여 보기 때문에, 여럿이 멀리 선 컷의 작은 얼굴을 놓친다.
 * 전체 + 겹치는 정사각 조각들을 각각 보고, 같은 얼굴(코끝이 가까운 것)은 더 큰 해상도로 본 쪽을 남긴다.
 */
function detectAll(marker: FaceLandmarker, canvas: HTMLCanvasElement): Face[] {
  const { width: w, height: h } = canvas
  const found: { face: Face; res: number }[] = []
  const add = (faces: Face[], res: number) => {
    for (const face of faces) {
      const fw = dist(face[234], face[454])
      const same = found.findIndex((f) => dist(f.face[1], face[1]) < fw * 0.35)
      if (same < 0) found.push({ face, res })
      else if (res > found[same].res) found[same] = { face, res }
    }
  }
  add(marker.detect(canvas).faceLandmarks.map((m) => toPixels(m, w, h)), 1 / Math.max(w, h))
  const size = Math.round(Math.min(w, h) * 0.62)
  const steps = (len: number) => {
    const n = Math.max(1, Math.ceil((len - size) / (size * 0.6)) + 1)
    return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : Math.round(((len - size) * i) / (n - 1))))
  }
  const crop = document.createElement('canvas')
  crop.width = crop.height = size
  const cctx = crop.getContext('2d')!
  for (const y of steps(h)) {
    for (const x of steps(w)) {
      cctx.clearRect(0, 0, size, size)
      cctx.drawImage(canvas, x, y, size, size, 0, 0, size, size)
      const faces = marker.detect(crop).faceLandmarks.map((marks) => marks.map((m) => ({ x: x + m.x * size, y: y + m.y * size })))
      // 조각 가장자리에 걸려 잘린 얼굴은 버린다(다른 조각·전체에서 온전히 잡힌다)
      add(faces.filter((f) => f.every((p) => p.x > x + 2 && p.x < x + size - 2 && p.y > y + 2 && p.y < y + size - 2) || (x === 0 && y === 0 && size >= Math.max(w, h))), 1 / size)
    }
  }
  return found.map((f) => f.face)
}

function detectShot(src: Source) {
  let hit = detectCache.get(src)
  if (!hit) {
    hit = (async () => {
      const canvas = baseCanvas(src)
      const marker = await getLandmarker('IMAGE')
      return { canvas, faces: detectAll(marker, canvas) }
    })()
    detectCache.set(src, hit)
    hit.catch(() => detectCache.delete(src))
  }
  return hit
}

/** 사진 속 얼굴 수(겹치는 조각까지 본 결과) — AI 아이돌 사진 인원 확인용. 모델을 못 쓰면 -1 */
export async function countFaces(src: Source): Promise<number> {
  try {
    return (await detectShot(src)).faces.length
  } catch {
    return -1
  }
}

/**
 * 사진 속 얼굴 자리 — 사진을 (dx,dy,dw,dh) 칸에 가운데 맞춰 꽉 채워 그렸을 때(drawCoverFocal 기본값)의 캔버스 좌표.
 * 스티커가 얼굴을 비켜 가게 쓴다. 아직 얼굴을 찾기 전이거나 못 찾으면 빈 배열
 */
export async function faceRectsInCell(src: Source, dx: number, dy: number, dw: number, dh: number) {
  try {
    const { canvas, faces } = await detectShot(src)
    const k = Math.max(dw / canvas.width, dh / canvas.height)
    const ox = dx + (dw - canvas.width * k) / 2, oy = dy + (dh - canvas.height * k) / 2
    return faces.map((face) => {
      const xs = face.map((p) => p.x), ys = face.map((p) => p.y)
      const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0
      // 머리·턱 아래까지 조금 넉넉히
      return { x: ox + (x0 - w * 0.15) * k, y: oy + (y0 - h * 0.35) * k, w: w * 1.3 * k, h: h * 1.55 * k }
    })
  } catch {
    return []
  }
}

/** 사진 한 장에 룩 메이크업을 입힌 캔버스 — 같은 사진·룩은 캐시. 얼굴을 못 찾으면 원본 */
export function makeupShot(src: Source, look: StageLook): Promise<HTMLCanvasElement | Source> {
  let byLook = shotCache.get(src)
  if (!byLook) { byLook = new Map(); shotCache.set(src, byLook) }
  let hit = byLook.get(look.id)
  if (!hit) {
    hit = detectShot(src)
      .then(({ canvas, faces }) => {
        if (!faces.length) return src
        const out = document.createElement('canvas')
        out.width = canvas.width
        out.height = canvas.height
        const ctx = out.getContext('2d')!
        ctx.drawImage(canvas, 0, 0)
        paintFaceMakeup(ctx, look, faces)
        return out
      })
      .catch((error) => {
        console.warn('[booth] 얼굴 메이크업 실패 — 원본으로 계속:', error)
        byLook!.delete(look.id)
        return src
      })
    byLook.set(look.id, hit)
  }
  return hit
}

// ───────────────────────── 실시간 화면 ─────────────────────────

/** 실시간 화면 한 프레임 — source 를 target 에 그리고 얼굴을 찾아 메이크업. 얼굴 수를 돌려준다 */
export async function paintLiveFrame(
  source: HTMLCanvasElement | HTMLVideoElement,
  target: HTMLCanvasElement,
  look: StageLook,
  maxEdge = 720,
): Promise<number> {
  const w0 = source instanceof HTMLVideoElement ? source.videoWidth : source.width
  const h0 = source instanceof HTMLVideoElement ? source.videoHeight : source.height
  if (!w0 || !h0) return 0
  const k = Math.min(1, maxEdge / Math.max(w0, h0))
  const w = Math.round(w0 * k), h = Math.round(h0 * k)
  const marker = await getLandmarker('VIDEO')
  if (target.width !== w || target.height !== h) { target.width = w; target.height = h }
  const ctx = target.getContext('2d')!
  ctx.drawImage(source, 0, 0, w, h)
  const result = marker.detectForVideo(target, performance.now())
  const faces = result.faceLandmarks.map((marks) => toPixels(marks, w, h))
  paintFaceMakeup(ctx, look, faces)
  return faces.length
}
