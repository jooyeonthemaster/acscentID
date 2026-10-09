// 키오스크 퍼스널 컬러 — 촬영한 사람의 상의 색만 바꿔 보는 미리보기(브라우저 안에서만, 생성형 이미지 API 없음).
//
// 1. 옷 영역 — MediaPipe SelfieMulticlass(256×256, Apache-2.0, public/models 자체 호스팅)의 6분류 중 4번 '옷' 신뢰도.
//    배경·머리카락·몸 피부·얼굴 피부·액세서리는 다른 분류라 마스크에 들어가지 않는다.
//    모델 출력(저해상도)을 사진 크기로 늘린 뒤 가이드 필터로 사진의 윤곽(목선·어깨·머리카락 끝)에 맞춘다.
// 2. 색 바꾸기 — 옷 픽셀의 밝기(Lab L*)를 '옷 평균과의 차이'로 남겨 주름·명암·짜임을 그대로 두고,
//    색상(a*·b*)과 평균 밝기만 고른 색으로 바꾼다. 마스크 밖 픽셀은 원본 그대로 복사한다.
// 3. 사진마다 마스크·밝기를 한 번만 계산해 두고(prepareGarment), 색을 누를 때는 픽셀 계산만 한다(색마다 결과를 캐시).
// 4. 결과는 '옷 부분만 담은 투명 PNG' — 화면은 원본 사진 위에 이것을 겹친다. 그래서 얼굴·피부·머리카락·배경은
//    원본 픽셀 그대로다(다시 압축하거나 다시 그리지 않는다). 옷 가장자리는 마스크 값만큼 반투명.
//
// 진단(AI 분석)에는 이 모듈이 만든 이미지를 절대 쓰지 않는다 — 원본 사진은 화면이 따로 들고 있다.

import type { ImageSegmenter } from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/models/selfie_multiclass_256x256.tflite'
const CLOTHES = 4
/** 계산 해상도 상한(긴 변) — 촬영본은 720×960, 폰 업로드는 최대 1280 */
const WORK_EDGE = 960
/** 옷이 사진에서 이만큼도 안 보이면 바꿀 옷이 없다고 본다 */
const MIN_COVERAGE = 0.035
/** 모델·추론이 이보다 오래 걸리면 포기하고 드레이프로 돌아간다(매장 망이 느려 모델 16MB 를 못 받는 경우) */
const PREPARE_TIMEOUT_MS = 40_000

export type GarmentStatus = 'ready' | 'no-garment' | 'failed'

export interface GarmentPrep {
  status: GarmentStatus
  /** 사진에서 옷이 차지하는 비율(0~1) */
  coverage: number
  width: number
  height: number
  /** 고른 색으로 칠한 옷만 담은 투명 PNG 주소(blob:) — 원본 사진 위에 겹쳐 쓴다. 같은 색은 다시 계산하지 않는다 */
  render(hex: string): Promise<string>
  /** 디버그·검증용 — 옷 마스크를 흑백 이미지로 */
  maskUrl(): Promise<string>
}

// ───────────────────────── 모델 ─────────────────────────

let segmenterPromise: Promise<ImageSegmenter> | null = null

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
      const common = { runningMode: 'IMAGE' as const, outputCategoryMask: false, outputConfidenceMasks: true }
      try {
        return await ImageSegmenter.createFromOptions(fileset, { ...common, baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' } })
      } catch {
        // GPU 를 못 쓰는 기기 — CPU 로(사진 한 장에 한 번이라 감당된다)
        return await ImageSegmenter.createFromOptions(fileset, { ...common, baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' } })
      }
    })().catch((error) => {
      // 실패를 캐시하면 다음 손님도 영영 못 쓴다 — 비워 두고 다음에 다시
      segmenterPromise = null
      throw error
    })
  }
  return segmenterPromise
}

/** 컬러 모드 첫 화면에서 미리 불러 둔다(모델 16MB · WASM 9MB). 실패해도 조용히 — 결과 화면에서 다시 시도한다 */
export function preloadGarmentModel(): void {
  if (typeof window === 'undefined') return
  void getSegmenter().catch(() => {})
}

// ───────────────────────── 사진 한 장 준비(캐시) ─────────────────────────

let current: { key: string; promise: Promise<GarmentPrep>; urls: string[]; generation: number } | null = null
let generation = 0

/** 이 사진의 옷 마스크를 계산한다. 같은 사진이면 계산 중이거나 끝난 것을 그대로 돌려준다(한 장만 기억) */
export function prepareGarment(photo: string): Promise<GarmentPrep> {
  if (current?.key === photo) return current.promise
  releaseGarment()
  const gen = ++generation
  const urls: string[] = []
  const promise = withTimeout(build(photo, urls, gen), PREPARE_TIMEOUT_MS).catch((error) => {
    console.warn('[garment] 옷 영역을 만들지 못했습니다:', error)
    return failedPrep()
  })
  current = { key: photo, promise, urls, generation: gen }
  return promise
}

/** 다시 찍기·처음으로·무입력 초기화 — 이전 사진의 결과 이미지를 지우고, 계산 중인 것은 결과를 버린다 */
export function releaseGarment(): void {
  if (!current) return
  for (const url of current.urls) URL.revokeObjectURL(url)
  current.urls.length = 0
  current = null
  generation++
}

function failedPrep(): GarmentPrep {
  return {
    status: 'failed', coverage: 0, width: 0, height: 0,
    render: () => Promise.reject(new Error('garment unavailable')),
    maskUrl: () => Promise.reject(new Error('garment unavailable')),
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then((v) => { window.clearTimeout(timer); resolve(v) }, (e) => { window.clearTimeout(timer); reject(e) })
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('photo load failed'))
    img.src = src
  })
}

// sRGB ↔ Lab (D65)
const SRGB_TO_LINEAR = new Float32Array(256).map((_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
})
const labF = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
const labFInv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787)
const linearToSrgb = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = SRGB_TO_LINEAR[r], G = SRGB_TO_LINEAR[g], B = SRGB_TO_LINEAR[b]
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const fx = labF(x), fy = labF(y), fz = labF(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function hexToLab(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

/** 회색 기준 가이드 필터(He et al.) — 마스크 경계를 사진의 윤곽에 붙인다. r: 반경, eps: 매끄러움 */
function guidedFilter(I: Float32Array, p: Float32Array, w: number, h: number, r: number, eps: number): Float32Array {
  const box = (src: Float32Array) => {
    const out = new Float32Array(w * h)
    const tmp = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      let acc = 0
      const row = y * w
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))]
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1)
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1)
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
      }
    }
    return out
  }
  const n = w * h
  const Ip = new Float32Array(n), II = new Float32Array(n)
  for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i] }
  const mI = box(I), mp = box(p), mIp = box(Ip), mII = box(II)
  const a = new Float32Array(n), b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const cov = mIp[i] - mI[i] * mp[i]
    const varI = mII[i] - mI[i] * mI[i]
    a[i] = cov / (varI + eps)
    b[i] = mp[i] - a[i] * mI[i]
  }
  const ma = box(a), mb = box(b)
  const q = new Float32Array(n)
  for (let i = 0; i < n; i++) q[i] = Math.min(1, Math.max(0, ma[i] * I[i] + mb[i]))
  return q
}

function bilinear(src: Float32Array, sw: number, sh: number, w: number, h: number): Float32Array {
  if (sw === w && sh === h) return src
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / h - 0.5))
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0
    for (let x = 0; x < w; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / w - 0.5))
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0
      const top = src[y0 * sw + x0] * (1 - tx) + src[y0 * sw + x1] * tx
      const bot = src[y1 * sw + x0] * (1 - tx) + src[y1 * sw + x1] * tx
      out[y * w + x] = top * (1 - ty) + bot * ty
    }
  }
  return out
}

/**
 * 옷 덩어리만 남긴다 — 배경의 반짝이·소품이 '옷'으로 잡힌 작은 조각을 지운다.
 * 4px 칸으로 줄여 이어진 덩어리를 찾고, 가장 큰 덩어리의 12% 보다 작은 덩어리는 버린다.
 */
function keepMainGarment(alpha: Float32Array, W: number, H: number): void {
  const S = 4
  const gw = Math.ceil(W / S), gh = Math.ceil(H / S)
  const on = new Uint8Array(gw * gh)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.5) on[((y / S) | 0) * gw + ((x / S) | 0)] = 1
  const label = new Int32Array(gw * gh).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || label[start] >= 0) continue
    const id = sizes.length
    let size = 0
    stack.push(start)
    label[start] = id
    while (stack.length) {
      const c = stack.pop()!
      size++
      const cx = c % gw, cy = (c / gw) | 0
      const next = [cx > 0 ? c - 1 : -1, cx < gw - 1 ? c + 1 : -1, cy > 0 ? c - gw : -1, cy < gh - 1 ? c + gw : -1]
      for (const n of next) if (n >= 0 && on[n] && label[n] < 0) { label[n] = id; stack.push(n) }
    }
    sizes.push(size)
  }
  if (!sizes.length) return
  const keep = Math.max(...sizes) * 0.12
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = ((y / S) | 0) * gw + ((x / S) | 0)
    // 경계의 반투명 픽셀은 이웃 칸이 옷이면 남긴다
    let ok = label[g] >= 0 && sizes[label[g]] >= keep
    if (!ok && alpha[y * W + x] > 0) {
      const gx = g % gw, gy = (g / gw) | 0
      for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1 && !ok; dx++) {
        const nx = gx + dx, ny = gy + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const l = label[ny * gw + nx]
        ok = l >= 0 && sizes[l] >= keep
      }
    }
    if (!ok) alpha[y * W + x] = 0
  }
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

async function build(photo: string, urls: string[], gen: number): Promise<GarmentPrep> {
  const [segmenter, img] = await Promise.all([getSegmenter(), loadImage(photo)])
  const scale = Math.min(1, WORK_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.round(img.naturalWidth * scale)
  const H = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(img, 0, 0, W, H)
  const original = ctx.getImageData(0, 0, W, H)

  const result = segmenter.segment(canvas)
  const masks = result.confidenceMasks
  if (!masks || masks.length <= CLOTHES) {
    result.close?.()
    throw new Error('multiclass masks missing')
  }
  const mw = masks[CLOTHES].width
  const mh = masks[CLOTHES].height
  const clothesRaw = new Float32Array(masks[CLOTHES].getAsFloat32Array())
  result.close?.()
  if (gen !== generation) throw new Error('superseded')

  // 모델 해상도 → 사진 해상도, 확신이 애매한 경계는 부드럽게
  const clothes = bilinear(clothesRaw, mw, mh, W, H)
  const px = original.data
  const N = W * H
  const gray = new Float32Array(N)
  const L = new Float32Array(N)
  const A = new Float32Array(N)
  const B = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const lab = rgbToLab(r, g, b)
    L[i] = lab[0]; A[i] = lab[1]; B[i] = lab[2]
  }
  const soft = new Float32Array(N)
  for (let i = 0; i < N; i++) soft[i] = smoothstep(0.35, 0.7, clothes[i])
  // 경계를 사진 윤곽에 붙인다 — 반경은 사진 크기에 비례(960 기준 6px)
  const refined = guidedFilter(gray, soft, W, H, Math.max(3, Math.round(Math.max(W, H) / 160)), 0.0015)
  const alpha = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    // 모델이 확신하는 옷 안쪽은 1, 확실히 아닌 곳(신뢰도 0.15 미만)은 경계 다듬기가 번져도 0
    const a = clothes[i] < 0.15 ? 0 : Math.max(refined[i], clothes[i] > 0.85 ? 1 : 0)
    alpha[i] = a < 0.04 ? 0 : a
  }
  keepMainGarment(alpha, W, H)
  let coverage = 0
  for (let i = 0; i < N; i++) coverage += alpha[i]
  coverage /= N
  if (gen !== generation) throw new Error('superseded')

  // 옷의 밝기 분포 — 평균, 위·아래로 얼마나 벌어지는지(고른 색에서 하이라이트·그늘이 넘치지 않게)
  let wsum = 0, lsum = 0
  for (let i = 0; i < N; i++) if (alpha[i] > 0.5) { wsum++; lsum += L[i] }
  const meanL = wsum ? lsum / wsum : 50
  const devs: number[] = []
  for (let i = 0; i < N; i += 3) if (alpha[i] > 0.5) devs.push(L[i] - meanL)
  devs.sort((x, y) => x - y)
  const q = (p: number) => (devs.length ? devs[Math.min(devs.length - 1, Math.floor(p * devs.length))] : 0)
  const spreadUp = Math.max(1, q(0.97))
  const spreadDown = Math.max(1, -q(0.03))
  let std = 0
  for (const d of devs) std += d * d
  std = devs.length ? Math.sqrt(std / devs.length) : 0

  const status: GarmentStatus = coverage < MIN_COVERAGE ? 'no-garment' : 'ready'
  const cache = new Map<string, Promise<string>>()

  const toUrl = async (data: ImageData): Promise<string> => {
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    out.getContext('2d')!.putImageData(data, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('encode failed')
    if (gen !== generation) throw new Error('superseded')
    const url = URL.createObjectURL(blob)
    urls.push(url)
    return url
  }

  const render = (hex: string): Promise<string> => {
    const key = hex.toLowerCase()
    const hit = cache.get(key)
    if (hit) return hit
    const job = (async () => {
      const [Lt, at, bt] = hexToLab(key)
      // 밝기 차이를 얼마나 살릴지 — 짜임이 거의 없는 민무늬는 조금 키우고, 고른 색이 아주 밝거나 어두우면
      // 하이라이트·그늘이 0·100 에 부딪히지 않게 줄인다(그래도 질감이 사라지지 않게 최소 0.35)
      const boost = std > 0 && std < 7 ? Math.min(1.5, 7 / std) : 1
      const k = Math.max(0.35, Math.min(boost, (99 - Lt) / spreadUp, (Lt - 3) / spreadDown))
      // 옷 밖은 완전히 투명 — 원본 사진이 그대로 비친다
      const out = new ImageData(W, H)
      const o = out.data
      for (let i = 0; i < N; i++) {
        const a = alpha[i]
        if (a === 0) continue
        const nl = Math.min(100, Math.max(0, Lt + (L[i] - meanL) * k))
        // 그늘진 곳은 채도를 조금 낮춰 실제 천처럼(밝은 곳은 그대로)
        const chroma = Math.min(1.08, Math.max(0.55, Lt > 1 ? 0.6 + 0.4 * (nl / Lt) : 1))
        // 원래 옷이 가진 미세한 색 차이(무늬·얼룩)를 아주 조금 남겨 평평한 색판처럼 보이지 않게
        const na = at * chroma + A[i] * 0.08
        const nb = bt * chroma + B[i] * 0.08
        const fy = (nl + 16) / 116
        const X = 0.95047 * labFInv(fy + na / 500)
        const Y = labFInv(fy)
        const Z = 1.08883 * labFInv(fy - nb / 200)
        const r = linearToSrgb(3.2406 * X - 1.5372 * Y - 0.4986 * Z)
        const g = linearToSrgb(-0.9689 * X + 1.8758 * Y + 0.0415 * Z)
        const b = linearToSrgb(0.0557 * X - 0.204 * Y + 1.057 * Z)
        const j = i * 4
        o[j] = r
        o[j + 1] = g
        o[j + 2] = b
        o[j + 3] = Math.round(a * 255)
      }
      return toUrl(out)
    })()
    // 실패한 계산은 캐시하지 않는다
    job.catch(() => cache.delete(key))
    cache.set(key, job)
    return job
  }

  const maskUrl = async () => {
    const m = new ImageData(W, H)
    for (let i = 0; i < N; i++) {
      const v = Math.round(alpha[i] * 255)
      m.data[i * 4] = v; m.data[i * 4 + 1] = v; m.data[i * 4 + 2] = v; m.data[i * 4 + 3] = 255
    }
    return toUrl(m)
  }

  return { status, coverage, width: W, height: H, render, maskUrl }
}
