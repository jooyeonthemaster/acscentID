// 사진 속 얼굴 찾기 — MediaPipe Face Landmarker(478 특징점). AI 아이돌 사진(src/components/photobooth/IdolStage.tsx)이
// 인원수를 세고(countFaces) 얼굴 쪽으로 사진을 자르는 데(faceRectsInCell) 쓴다.
// (예전 K-POP 무대 메이크업 — 얼굴에 화장을 그리던 기능 — 은 2026-10-01 에 없앴다)
//
// - 모델·wasm 은 public 에 자체 호스팅(/models/face_landmarker.task, /mediapipe/wasm) — 행사장 인터넷이 약해도 동작
// - 얼굴을 못 찾거나 모델을 못 불러오면 빈 결과(부스가 멈추면 안 된다)

import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/models/face_landmarker.task'
const MAX_FACES = 6
/** 검출에 쓰는 사진의 긴 변 상한 */
const SHOT_EDGE = 1800

type Mode = 'IMAGE'
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
export function preloadFaceDetect() {
  if (warmed) return
  warmed = true
  const blank = document.createElement('canvas')
  blank.width = blank.height = 64
  blank.getContext('2d')!.fillRect(0, 0, 64, 64)
  void getLandmarker('IMAGE').then((m) => { m.detect(blank) }).catch(() => { warmed = false })
}

interface P { x: number; y: number }
type Face = P[]

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)

function toPixels(marks: NormalizedLandmark[], w: number, h: number): Face {
  return marks.map((m) => ({ x: m.x * w, y: m.y * h }))
}

// ───────────────────────── 사진에서 얼굴 찾기 ─────────────────────────

type Source = HTMLImageElement | HTMLCanvasElement
const detectCache = new WeakMap<Source, Promise<{ canvas: HTMLCanvasElement; faces: Face[] }>>()

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
 * AI 아이돌 사진에 보낼 사진을 얼굴 쪽으로 자를 때 쓴다(IdolStage). 못 찾으면 빈 배열
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
