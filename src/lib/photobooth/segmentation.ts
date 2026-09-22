/**
 * 업로드 사진 인물 오려내기
 *
 * '같이 찍기'에서 손님이 폰으로 올린 포카·직찍의 배경을 지워, 현장 촬영분 위에
 * 인물만 올려 "같이 찍은 것처럼" 합성하기 위한 모듈. (관리자 포카 등록도 같은 걸 쓴다)
 *
 * 팬 사진에는 인형·응원봉·글자 스티커처럼 "손에 든 것"이 흔하다. 사람만 찾는 모델은
 * 이걸 배경으로 지워 인물이 뜯겨 나간 것처럼 보인다(2026-09 매장 실기: 여우 인형이 통째로 사라짐).
 * 그래서 세 가지를 합친다.
 *
 *   ① 사람        MediaPipe 다중 클래스 — 머리카락·피부·옷. 얼굴 위치도 여기서 얻는다
 *   ② 소품        배경이 단색에 가까우면 배경색을 배워, 배경과 다른 색이면서 사람에 붙은 덩어리
 *   ③ 주인공      U²-Net 경량(u2netp) — 흰 글자 스티커처럼 배경색과 비슷해도 눈에 띄는 것
 *
 * ②·③ 은 "얼굴 중심보다 아래 + 사람에 붙어 있음" 일 때만 더한다 — 머리 뒤 스탠드·조명 같은
 * 촬영 장비가 딸려 오지 않게. 마지막으로 원본 사진 윤곽에 맞춰 경계를 다듬는다(가이드 필터).
 *
 * - 모델·WASM 전부 자체 호스팅(public/) — 외부 CDN 을 쓰면 캔버스가 오염돼
 *   최종 인화의 toDataURL() 이 실패한다. 오프라인 매장에서도 동작해야 한다.
 * - MediaPipe·ONNX Runtime·U²-Net 모두 Apache-2.0 — 상업적 이용 제약 없음.
 * - ③ 을 못 불러오면 ①② 만으로 계속한다(부스가 멈추면 안 된다).
 */

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'

/** 품질 우선(다중 클래스, 얼굴 클래스도 준다) → 실패 시 경량 모델로 폴백 */
const MODEL_CANDIDATES = [
  '/models/selfie_multiclass_256x256.tflite',
  '/models/selfie_segmenter.tflite',
]

/** onnxruntime-web 1.30 (wasm 전용 빌드) — public/onnxruntime 에 자체 호스팅 */
const ORT_DIR = '/onnxruntime/'
const ORT_MODULE = '/onnxruntime/ort.wasm.min.mjs'
const SALIENT_MODEL = '/models/u2netp.onnx'
const SALIENT_SIZE = 320

/** 분석 해상도 (긴 변). 인화에 쓰이는 크기보다 충분히 크고, 부스 PC 에서 1초 안쪽 */
const WORK_EDGE = 1024
/** 결과 캔버스 해상도 상한 (긴 변) */
const OUTPUT_EDGE = 1600

// ───────────────────────── 모델 로딩 ─────────────────────────

let segmenterPromise: Promise<ImageSegmenter> | null = null

async function createSegmenter(modelAssetPath: string): Promise<ImageSegmenter> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  const common = {
    runningMode: 'IMAGE' as const,
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  }
  try {
    return await ImageSegmenter.createFromOptions(fileset, {
      ...common,
      baseOptions: { modelAssetPath, delegate: 'GPU' },
    })
  } catch {
    // GPU 델리게이트를 못 쓰는 기기에서는 CPU로 (느리지만 일회성이라 감당 가능)
    return await ImageSegmenter.createFromOptions(fileset, {
      ...common,
      baseOptions: { modelAssetPath, delegate: 'CPU' },
    })
  }
}

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      let lastError: unknown
      for (const model of MODEL_CANDIDATES) {
        try {
          return await createSegmenter(model)
        } catch (error) {
          lastError = error
          console.warn('[photobooth] 세그멘테이션 모델 로드 실패:', model, error)
        }
      }
      throw lastError ?? new Error('세그멘테이션 모델을 불러오지 못했습니다')
    })().catch((error) => {
      // 실패한 약속을 캐시하면 영영 재시도가 안 되므로 비워둔다
      segmenterPromise = null
      throw error
    })
  }
  return segmenterPromise
}

/** onnxruntime-web 에서 쓰는 부분만 좁게 선언 (번들러를 거치지 않고 public 에서 직접 불러온다) */
interface OrtTensor {
  data: Float32Array
}
interface OrtSession {
  inputNames: readonly string[]
  outputNames: readonly string[]
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>
}
interface OrtModule {
  env: { wasm: { wasmPaths: string; numThreads: number; proxy: boolean } }
  Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => unknown
  InferenceSession: { create(url: string, options?: object): Promise<OrtSession> }
}

let salientPromise: Promise<{ ort: OrtModule; session: OrtSession } | null> | null = null

function getSalient(): Promise<{ ort: OrtModule; session: OrtSession } | null> {
  if (!salientPromise) {
    salientPromise = (async () => {
      try {
        const url = new URL(ORT_MODULE, window.location.origin).href
        const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as OrtModule
        ort.env.wasm.wasmPaths = new URL(ORT_DIR, window.location.origin).href
        // 멀티스레드는 교차 출처 격리(COOP/COEP)가 필요하다 — 부스 페이지엔 없다
        ort.env.wasm.numThreads = 1
        // 추론을 워커에서 — 화면 스레드에서 돌리면 2초 가까이 화면이 얼어 "처리 중" 표시가 멈춘다
        // (실측: 최대 멈춤 4.2초 → 1.9초, 남은 건 MediaPipe 몫)
        ort.env.wasm.proxy = true
        const session = await ort.InferenceSession.create(SALIENT_MODEL, {
          executionProviders: ['wasm'],
        })
        return { ort, session }
      } catch (error) {
        console.warn('[photobooth] 주인공 모델(u2netp) 로드 실패 — 사람·소품만으로 진행:', error)
        salientPromise = null
        return null
      }
    })()
  }
  return salientPromise
}

/**
 * 모델을 미리 올려 둔다 — 손님이 폰으로 사진을 고르는 동안(QR 화면) 부르면
 * 사진이 도착했을 때 기다림이 추론 시간만 남는다.
 */
export async function warmupSegmentation(): Promise<void> {
  await Promise.allSettled([
    getSegmenter().then((segmenter) => {
      // 첫 추론 때 GPU 셰이더를 컴파일한다 — 작은 그림으로 미리 치러 둔다
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 64
      c.getContext('2d')?.fillRect(0, 0, 64, 64)
      segmenter.segment(c).close?.()
    }),
    getSalient(),
  ])
}

// ───────────────────────── 보조 계산 ─────────────────────────

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

interface Mask {
  w: number
  h: number
  data: Float32Array
}

/** 저해상 마스크 → W×H (쌍선형) */
function upsample(m: Mask, W: number, H: number): Float32Array {
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const fy = ((y + 0.5) / H) * m.h - 0.5
    const y0 = Math.max(0, Math.floor(fy))
    const y1 = Math.min(m.h - 1, y0 + 1)
    const wy = Math.min(1, Math.max(0, fy - y0))
    for (let x = 0; x < W; x++) {
      const fx = ((x + 0.5) / W) * m.w - 0.5
      const x0 = Math.max(0, Math.floor(fx))
      const x1 = Math.min(m.w - 1, x0 + 1)
      const wx = Math.min(1, Math.max(0, fx - x0))
      const top = m.data[y0 * m.w + x0] * (1 - wx) + m.data[y0 * m.w + x1] * wx
      const bottom = m.data[y1 * m.w + x0] * (1 - wx) + m.data[y1 * m.w + x1] * wx
      out[y * W + x] = top * (1 - wy) + bottom * wy
    }
  }
  return out
}

/** 박스 평균 (적분 영상, O(N)) */
function boxMean(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const I = new Float64Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) {
    let row = 0
    for (let x = 0; x < W; x++) {
      row += src[y * W + x]
      I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row
    }
  }
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(H, y + r + 1)
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(W, x + r + 1)
      out[y * W + x] =
        (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) /
        ((y1 - y0) * (x1 - x0))
    }
  }
  return out
}

/** 가이드 필터 — 거친 마스크 경계를 원본 사진의 밝기 윤곽에 붙인다 (He et al.) */
function guidedFilter(guide: Float32Array, p: Float32Array, W: number, H: number, r: number, eps: number) {
  const n = W * H
  const Ip = new Float32Array(n)
  const II = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    Ip[i] = guide[i] * p[i]
    II[i] = guide[i] * guide[i]
  }
  const mI = boxMean(guide, W, H, r)
  const mp = boxMean(p, W, H, r)
  const mIp = boxMean(Ip, W, H, r)
  const mII = boxMean(II, W, H, r)
  const a = new Float32Array(n)
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const variance = mII[i] - mI[i] * mI[i]
    const covariance = mIp[i] - mI[i] * mp[i]
    a[i] = covariance / (variance + eps)
    b[i] = mp[i] - a[i] * mI[i]
  }
  const ma = boxMean(a, W, H, r)
  const mb = boxMean(b, W, H, r)
  const q = new Float32Array(n)
  for (let i = 0; i < n; i++) q[i] = Math.min(1, Math.max(0, ma[i] * guide[i] + mb[i]))
  return q
}

function toLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const R = lin(r)
  const G = lin(g)
  const B = lin(b)
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
  const X = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047)
  const Y = f(R * 0.2126 + G * 0.7152 + B * 0.0722)
  const Z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883)
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]
}

// ───────────────────────── 모델 실행 ─────────────────────────

interface PersonResult {
  /** 사람일 확률 (W×H) */
  person: Float32Array
  /** 얼굴 중심 높이 (0~1), 모르면 null */
  faceY: number | null
}

function runPerson(segmenter: ImageSegmenter, work: HTMLCanvasElement, W: number, H: number): PersonResult {
  const result = segmenter.segment(work)
  const masks = result.confidenceMasks
  if (!masks || masks.length === 0) {
    result.close?.()
    throw new Error('인물을 찾지 못했습니다')
  }
  const mw = masks[0].width
  const mh = masks[0].height
  const raw = new Float32Array(mw * mh)
  if (masks.length === 1) {
    // 이진 모델: 마스크 값이 곧 인물 신뢰도
    raw.set(masks[0].getAsFloat32Array())
  } else {
    // 다중 클래스: 0번이 배경 — 그 여집합이 인물(머리카락·피부·옷·장신구)
    const background = masks[0].getAsFloat32Array()
    for (let i = 0; i < raw.length; i++) raw[i] = 1 - background[i]
  }

  // 3번 = 얼굴 피부. 얼굴 중심 높이를 구해 "머리 뒤 장비"와 "손에 든 소품"을 가른다
  let faceY: number | null = null
  if (masks.length > 3) {
    const face = masks[3].getAsFloat32Array()
    let weight = 0
    let sum = 0
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const v = face[y * mw + x]
        if (v > 0.5) {
          weight += v
          sum += v * y
        }
      }
    }
    if (weight > 0) faceY = sum / weight / mh
  }
  result.close?.()

  const person = mw === W && mh === H ? raw : upsample({ w: mw, h: mh, data: raw }, W, H)
  return { person, faceY }
}

async function runSalient(work: HTMLCanvasElement, W: number, H: number): Promise<Float32Array | null> {
  const model = await getSalient()
  if (!model) return null
  try {
    const N = SALIENT_SIZE
    const c = document.createElement('canvas')
    c.width = N
    c.height = N
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(work, 0, 0, N, N)
    const px = ctx.getImageData(0, 0, N, N).data
    let max = 1
    for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2])
    // U²-Net 학습 때와 같은 정규화 (ImageNet 평균·표준편차)
    const mean = [0.485, 0.456, 0.406]
    const std = [0.229, 0.224, 0.225]
    const input = new Float32Array(3 * N * N)
    for (let i = 0; i < N * N; i++) {
      for (let ch = 0; ch < 3; ch++) input[ch * N * N + i] = (px[i * 4 + ch] / max - mean[ch]) / std[ch]
    }
    const { ort, session } = model
    const output = await session.run({
      [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, N, N]),
    })
    const pred = output[session.outputNames[0]].data
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < N * N; i++) {
      lo = Math.min(lo, pred[i])
      hi = Math.max(hi, pred[i])
    }
    const norm = new Float32Array(N * N)
    for (let i = 0; i < N * N; i++) norm[i] = (pred[i] - lo) / (hi - lo || 1)
    return upsample({ w: N, h: N, data: norm }, W, H)
  } catch (error) {
    console.warn('[photobooth] 주인공 추론 실패 — 사람·소품만으로 진행:', error)
    return null
  }
}

// ───────────────────────── 소품 영역 ─────────────────────────

/**
 * 사람에 붙은 소품 영역 (긴 변 256 격자에서 계산 — 빠르고 잡음에 강하다).
 * 배경색이 단색에 가까우면 색 차이로, 아니면 주인공 모델만으로 후보를 만든다.
 */
function attachedExtras(
  px: Uint8ClampedArray,
  W: number,
  H: number,
  person: Float32Array,
  salient: Float32Array | null,
  faceY: number | null
): Mask {
  const g = Math.min(1, 256 / Math.max(W, H))
  const gw = Math.max(1, Math.round(W * g))
  const gh = Math.max(1, Math.round(H * g))
  const n = gw * gh
  const lab = new Float32Array(n * 3)
  const pg = new Float32Array(n)
  const sg = new Float32Array(n)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const sx = Math.min(W - 1, Math.round((x + 0.5) / g))
      const sy = Math.min(H - 1, Math.round((y + 0.5) / g))
      const si = sy * W + sx
      const gi = y * gw + x
      const [L, A, B] = toLab(px[si * 4], px[si * 4 + 1], px[si * 4 + 2])
      lab[gi * 3] = L
      lab[gi * 3 + 1] = A
      lab[gi * 3 + 2] = B
      pg[gi] = person[si]
      sg[gi] = salient ? salient[si] : 0
    }
  }

  // 사람이 거의 없으면(캐릭터·인형 사진) 주인공 모델을 씨앗으로 삼고 얼굴 기준을 쓰지 않는다
  let personArea = 0
  for (let i = 0; i < n; i++) if (pg[i] > 0.5) personArea++
  const seedFromSalient = personArea < n * 0.01 && !!salient

  // ── 배경색 학습: 위쪽 띠 + 위쪽 45% 의 좌우 띠 (아래쪽은 몸·소품·스티커가 닿기 쉽다)
  const band = Math.max(3, Math.round(Math.min(gw, gh) * 0.05))
  const samples: number[] = []
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x
      const inTop = y < band
      const inSide = (x < band || x >= gw - band) && y < gh * 0.45
      if ((inTop || inSide) && pg[i] < 0.1 && sg[i] < 0.3) samples.push(i)
    }
  }
  const dist = (i: number, c: number[]) => {
    // 밝기 차는 덜 친다 — 벽의 조명 얼룩·그림자를 소품으로 오인하지 않게
    const dl = (lab[i * 3] - c[0]) * 0.6
    const da = lab[i * 3 + 1] - c[1]
    const db = lab[i * 3 + 2] - c[2]
    return Math.sqrt(dl * dl + da * da + db * db)
  }
  let centers: number[][] = []
  let threshold = Infinity
  if (samples.length >= 60) {
    let C = [0, 1, 2].map((k) => {
      const i = samples[Math.floor(((k + 0.5) * samples.length) / 3)]
      return [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]
    })
    const assign = new Int32Array(samples.length)
    for (let iter = 0; iter < 10; iter++) {
      const sum = C.map(() => [0, 0, 0, 0])
      samples.forEach((i, s) => {
        let best = 0
        let bestD = Infinity
        C.forEach((c, k) => {
          const d = dist(i, c)
          if (d < bestD) {
            bestD = d
            best = k
          }
        })
        assign[s] = best
        sum[best][0] += lab[i * 3]
        sum[best][1] += lab[i * 3 + 1]
        sum[best][2] += lab[i * 3 + 2]
        sum[best][3]++
      })
      C = C.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c))
    }
    const counts = C.map((_, k) => assign.reduce((acc, a) => acc + (a === k ? 1 : 0), 0))
    centers = C.filter((_, k) => counts[k] >= samples.length * 0.1)
    const spreadList = samples.map((i) => Math.min(...centers.map((c) => dist(i, c)))).sort((a, b) => a - b)
    const spread = spreadList[Math.floor(spreadList.length * 0.9)]
    // 배경이 복잡하면(행사 현수막 등) 색으로는 가를 수 없다 — 주인공 모델만 쓴다
    if (spread <= 12) threshold = Math.max(16, spread * 2.5)
  }

  // ── 후보: 배경과 다른 색 또는 눈에 띄는 것, 단 얼굴 중심보다 아래
  const faceRow = seedFromSalient
    ? -1
    : faceY !== null
      ? faceY * gh
      : (() => {
          let top = gh
          for (let i = 0; i < n; i++) if (pg[i] > 0.5) top = Math.min(top, Math.floor(i / gw))
          return top + gh * 0.15
        })()
  let cand = new Uint8Array(n)
  for (let y = 0; y < gh; y++) {
    if (y <= faceRow) continue
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x
      const byColor = threshold < Infinity && Math.min(...centers.map((c) => dist(i, c))) > threshold
      const bySalience = sg[i] > 0.5
      if (byColor || bySalience) cand[i] = 1
    }
  }

  // ── 가는 막대·케이블 제거 (열림 연산: 깎았다가 다시 불린다)
  const r = Math.max(2, Math.round(Math.min(gw, gh) * 0.012))
  const morph = (src: Uint8Array, erode: boolean) => {
    const out = new Uint8Array(n)
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        let v = erode ? 1 : 0
        search: for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const yy = y + dy
            const xx = x + dx
            const s = yy < 0 || yy >= gh || xx < 0 || xx >= gw ? (erode ? 1 : 0) : src[yy * gw + xx]
            if (erode && !s) {
              v = 0
              break search
            }
            if (!erode && s) {
              v = 1
              break search
            }
          }
        }
        out[y * gw + x] = v
      }
    }
    return out
  }
  cand = morph(morph(cand, true), false)

  // ── 사람(또는 주인공)에 닿은 덩어리만 남긴다
  const PERSON = 2
  const EXTRA = 1
  const keep = new Uint8Array(n)
  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    if (seedFromSalient ? sg[i] > 0.5 : pg[i] > 0.5) {
      keep[i] = PERSON
      queue.push(i)
    }
  }
  while (queue.length) {
    const i = queue.pop() as number
    const x = i % gw
    const y = (i / gw) | 0
    const neighbors = [
      x + 1 < gw ? i + 1 : -1,
      x > 0 ? i - 1 : -1,
      y + 1 < gh ? i + gw : -1,
      y > 0 ? i - gw : -1,
    ]
    for (const j of neighbors) {
      if (j >= 0 && !keep[j] && cand[j]) {
        keep[j] = EXTRA
        queue.push(j)
      }
    }
  }

  // ── 소품 안쪽 구멍 메우기 — 인형의 흰 주둥이처럼 배경색과 비슷해 빠진 곳.
  //    바깥 배경과 이어지지 않고, 둘레의 대부분이 소품인 구멍만 (팔과 몸 사이 틈은 그대로 둔다)
  const outside = new Uint8Array(n)
  const flood: number[] = []
  for (let x = 0; x < gw; x++) {
    for (const y of [0, gh - 1]) {
      const i = y * gw + x
      if (!keep[i] && !outside[i]) {
        outside[i] = 1
        flood.push(i)
      }
    }
  }
  for (let y = 0; y < gh; y++) {
    for (const x of [0, gw - 1]) {
      const i = y * gw + x
      if (!keep[i] && !outside[i]) {
        outside[i] = 1
        flood.push(i)
      }
    }
  }
  while (flood.length) {
    const i = flood.pop() as number
    const x = i % gw
    const y = (i / gw) | 0
    for (const j of [x + 1 < gw ? i + 1 : -1, x > 0 ? i - 1 : -1, y + 1 < gh ? i + gw : -1, y > 0 ? i - gw : -1]) {
      if (j >= 0 && !keep[j] && !outside[j]) {
        outside[j] = 1
        flood.push(j)
      }
    }
  }
  const seen = new Uint8Array(n)
  for (let start = 0; start < n; start++) {
    if (keep[start] || outside[start] || seen[start]) continue
    const hole: number[] = []
    let byExtra = 0
    let byPerson = 0
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop() as number
      hole.push(i)
      const x = i % gw
      const y = (i / gw) | 0
      for (const j of [x + 1 < gw ? i + 1 : -1, x > 0 ? i - 1 : -1, y + 1 < gh ? i + gw : -1, y > 0 ? i - gw : -1]) {
        if (j < 0) continue
        if (keep[j] === EXTRA) byExtra++
        else if (keep[j] === PERSON) byPerson++
        else if (!seen[j]) {
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    if (byExtra > byPerson) for (const i of hole) keep[i] = EXTRA
  }

  const data = new Float32Array(n)
  for (let i = 0; i < n; i++) if (keep[i] === EXTRA || (seedFromSalient && keep[i] === PERSON)) data[i] = 1
  return { w: gw, h: gh, data }
}

// ───────────────────────── 오려내기 ─────────────────────────

export interface CutoutOptions {
  /** 경계를 조이는 정도(0~1). 높일수록 배경 후광이 줄지만 인물 외곽이 깎인다 */
  tighten?: number
  /** 경계 부드러움(0~1). 인화 시 계단현상을 막는 최소한의 여유 */
  softness?: number
}

export interface CutoutResult {
  canvas: HTMLCanvasElement
  /** 원본 대비 인물(+소품)이 차지한 면적 비율 — 실패 감지에 쓴다 */
  coverage: number
}

/**
 * 인물(+손에 든 소품)만 남긴 RGBA 캔버스를 만든다. 내용 바운딩 박스로 잘라내므로
 * 합성 시 크기 슬라이더가 곧 인물 크기가 된다.
 */
export async function cutoutPerson(
  source: HTMLImageElement,
  { tighten = 0.5, softness = 0.4 }: CutoutOptions = {}
): Promise<CutoutResult> {
  const sw = source.naturalWidth || source.width
  const sh = source.naturalHeight || source.height

  // 분석은 긴 변 WORK_EDGE 에서
  const ws = Math.min(1, WORK_EDGE / Math.max(sw, sh))
  const W = Math.max(1, Math.round(sw * ws))
  const H = Math.max(1, Math.round(sh * ws))
  const work = document.createElement('canvas')
  work.width = W
  work.height = H
  const wctx = work.getContext('2d', { willReadFrequently: true })
  if (!wctx) throw new Error('작업 캔버스를 만들지 못했습니다')
  wctx.imageSmoothingQuality = 'high'
  wctx.drawImage(source, 0, 0, W, H)
  const px = wctx.getImageData(0, 0, W, H).data

  // 단계별 소요 시간 — 매장 PC 원격 점검용 (콘솔)
  const t0 = performance.now()
  const segmenter = await getSegmenter()
  const t1 = performance.now()
  const { person, faceY } = runPerson(segmenter, work, W, H)
  const t2 = performance.now()
  const salient = await runSalient(work, W, H)
  const t3 = performance.now()
  const extras = upsample(attachedExtras(px, W, H, person, salient, faceY), W, H)
  const t4 = performance.now()

  // 사람 + 소품(+ 소품 범위 안의 주인공 윤곽)
  const merged = new Float32Array(W * H)
  for (let i = 0; i < merged.length; i++) {
    const p = smoothstep(0.42, 0.58, person[i])
    const e = smoothstep(0.35, 0.65, extras[i])
    // 주인공 모델의 부드러운 윤곽은 소품으로 인정된 범위 안에서만 쓴다 (머리 뒤 장비 차단)
    const s = salient ? smoothstep(0.35, 0.65, salient[i]) * smoothstep(0.1, 0.5, extras[i]) : 0
    merged[i] = Math.max(p, e, s)
  }

  // 경계를 원본 윤곽에 붙인다
  const gray = new Float32Array(W * H)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255
  }
  const refined = guidedFilter(gray, merged, W, H, Math.max(4, Math.round(Math.min(W, H) / 120)), 1e-3)
  const t5 = performance.now()
  console.info('[photobooth] 오려내기(ms)', {
    size: `${W}x${H}`,
    load: Math.round(t1 - t0),
    person: Math.round(t2 - t1),
    salient: salient ? Math.round(t3 - t2) : 'off',
    extras: Math.round(t4 - t3),
    edges: Math.round(t5 - t4),
  })

  // tighten 이 높을수록 임계값이 올라가 경계가 안쪽으로 깎인다(후광 제거)
  const center = 0.3 + Math.min(1, Math.max(0, tighten)) * 0.4
  const band = Math.max(0.04, Math.min(1, softness))
  const lo = center - band / 2
  const hi = center + band / 2

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = W
  maskCanvas.height = H
  const mctx = maskCanvas.getContext('2d')
  if (!mctx) throw new Error('마스크 캔버스를 만들지 못했습니다')
  const maskImage = mctx.createImageData(W, H)
  let covered = 0
  for (let i = 0; i < refined.length; i++) {
    const a = smoothstep(lo, hi, refined[i])
    if (a > 0.5) covered++
    const o = i * 4
    maskImage.data[o] = 255
    maskImage.data[o + 1] = 255
    maskImage.data[o + 2] = 255
    maskImage.data[o + 3] = Math.round(a * 255)
  }
  mctx.putImageData(maskImage, 0, 0)

  // 결과는 원본 해상도(상한 OUTPUT_EDGE)로 — 마스크만 부드럽게 확대해 알파로 적용
  const os = Math.min(1, OUTPUT_EDGE / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * os))
  const height = Math.max(1, Math.round(sh * os))
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const octx = out.getContext('2d')
  if (!octx) throw new Error('출력 캔버스를 만들지 못했습니다')
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(source, 0, 0, width, height)
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskCanvas, 0, 0, width, height)

  // 원본 사진 테두리에 닿아 잘린 부분(팔·몸통 등)은 직선으로 남아 "사진을 붙인 티"가 난다.
  // 네 변을 알파로 살짝 흐려 잘린 단면을 감춘다.
  const feather = Math.max(8, Math.round(Math.min(width, height) * 0.05))
  const fadeEdge = (x0: number, y0: number, x1: number, y1: number) => {
    const grad = octx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,1)')
    octx.fillStyle = grad
    octx.fillRect(0, 0, width, height)
  }
  fadeEdge(0, 0, feather, 0)
  fadeEdge(width, 0, width - feather, 0)
  fadeEdge(0, 0, 0, feather)
  fadeEdge(0, height, 0, height - feather)
  octx.globalCompositeOperation = 'source-over'

  return {
    canvas: cropToContent(out),
    coverage: covered / refined.length,
  }
}

/** 투명 여백을 잘라내 인물에 딱 맞춘다 (약간의 여유는 남긴다) */
function cropToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return canvas
  }

  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas

  const pad = Math.round(Math.max(canvas.width, canvas.height) * 0.01)
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(canvas.width - 1, maxX + pad)
  maxY = Math.min(canvas.height - 1, maxY + pad)

  const cropped = document.createElement('canvas')
  cropped.width = maxX - minX + 1
  cropped.height = maxY - minY + 1
  const cctx = cropped.getContext('2d')
  if (!cctx) return canvas
  cctx.drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
  return cropped
}
