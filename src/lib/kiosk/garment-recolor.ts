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
// 계산은 모두 웹 워커(garment.worker.ts · garment-core.ts)에서 — 매장 기기의 느린 CPU 에서 결과 화면이 멈추지 않게.
// 계산이 제한 시간을 넘기면 워커째 끝내고 드레이프로 돌아간다(화면 스레드였다면 멈춘 계산을 끊을 수 없다).
//
// 진단(AI 분석)에는 이 모듈이 만든 이미지를 절대 쓰지 않는다 — 원본 사진은 화면이 따로 들고 있다.

import type { ColorMeasure } from './garment-core'
import type { GarmentWorkerRequest, GarmentWorkerResponse } from './garment.worker'

export type { ColorMeasure }

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/models/selfie_multiclass_256x256.tflite'
/** 계산 해상도 상한(긴 변) — 촬영본은 720×960, 폰 업로드는 최대 1280 */
const WORK_EDGE = 960
/** 옷이 사진에서 이만큼도 안 보이면 바꿀 옷이 없다고 본다 */
const MIN_COVERAGE = 0.035
/** 엔진 준비·추론이 이보다 오래 걸리면 워커를 끝내고 드레이프로 돌아간다(파일은 미리 받아 둔 것만 쓴다) */
const PREPARE_TIMEOUT_MS = 40_000
/** 색 하나 칠하기 제한 시간 */
const RENDER_TIMEOUT_MS = 15_000

/** unavailable — 모델 파일을 아직 다 받지 못했다(손님 진행 중에는 받지 않는다). 드레이프만 보여 준다 */
export type GarmentStatus = 'ready' | 'no-garment' | 'failed' | 'unavailable'

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
  /** 진단용 — 옷·배경을 회색으로 지우고 얼굴 둘레만 자른 사진(data: JPEG)과 피부·머리카락 색. 얼굴을 못 찾았으면 없다 */
  focus?: ColorFocus
}

/** 퍼스널 컬러 진단(AI)에 원본 대신 보내는 것 — 옷 색이 진단을 끌고 가지 않게 */
export interface ColorFocus {
  image: string
  measure: ColorMeasure
}

// ───────────────────────── 파일 받기 ─────────────────────────
//
// 엔진(WASM 9.5MB)·모델(16MB)은 손님이 없는 첫 화면에서만, 조각으로 천천히 받는다(preloadGarmentModel).
// 손님이 시작하면 받던 것을 멈춘다(pauseGarmentDownload) — 진단 요청과 같은 순간에 받기 시작했더니 키오스크의
// USB Wi-Fi 가 끊겨 진단 결과가 돌아오지 못했다(2026-10-09 실기). 한 번 받은 파일은 기기 보관함(Cache Storage)에 두어
// 앱을 다시 켜도 다시 받지 않는다. 쓸 때는 메모리(blob)에서만 읽는다 — 손님 진행 중에는 이 기능 때문에 망을 쓰지 않는다.
// 다 받지 못했으면 결과 화면은 드레이프로 대신한다.

interface GarmentAssets {
  /** blob: 주소 — WASM 로더 스크립트 */
  loader: string
  /** blob: 주소 — WASM 바이너리 */
  binary: string
  model: Uint8Array
}

let assets: GarmentAssets | null = null
let download: AbortController | null = null

/** 받아 둔 파일 보관함(Cache Storage) 이름 — @mediapipe/tasks-vision 이나 모델 파일을 바꾸면 끝의 번호를 올린다(옛 파일과 섞이지 않게) */
const ASSET_CACHE = 'kiosk-garment-assets-v1'
/**
 * 조각 크기와 조각 사이 쉬는 시간 — 평균 250KB/s 를 넘지 않게 받는다(전부 약 26MB, 2~4분).
 * 매장 키오스크는 USB Wi-Fi 동글(802.11n)이라 25MB 를 한꺼번에 받자 회선이 끊겼다
 * (2026-10-09: 14시간 멀쩡하던 Wi-Fi 가 받기 시작한 뒤 여섯 번 재연결). 응답을 천천히 읽는 것만으로는
 * 브라우저가 미리 다 받아 버려 소용없다 — 부분 요청(Range)으로 조각을 나눠 실제 전송을 늦춘다.
 */
const CHUNK_BYTES = 320 * 1024
const CHUNK_GAP_MS = 1300

/** 받다 만 조각 — 손님이 와서 멈춰도 앱이 켜져 있는 동안은 다음 첫 화면에서 이어 받는다 */
const partial = new Map<string, { etag: string | null; total: number; type: string; chunks: BlobPart[]; received: number }>()

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'))
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { window.clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')) }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** 보관함에 있으면 그것을(망을 쓰지 않는다), 없으면 조각으로 천천히 받아 보관함에 넣는다 */
async function getAsset(url: string, signal: AbortSignal): Promise<Blob> {
  const store = typeof caches === 'undefined' ? null : await caches.open(ASSET_CACHE).catch(() => null)
  const kept = await store?.match(url).catch(() => undefined)
  if (kept) return kept.blob()
  const keep = async (blob: Blob) => {
    partial.delete(url)
    await store?.put(url, new Response(blob, { headers: { 'content-type': blob.type } })).catch(() => {})
    return blob
  }
  for (;;) {
    const part = partial.get(url)
    const from = part?.received ?? 0
    if (part && from >= part.total) return keep(new Blob(part.chunks, { type: part.type }))
    const res = await fetch(url, { signal, cache: 'no-store', priority: 'low', headers: { Range: `bytes=${from}-${from + CHUNK_BYTES - 1}` } } as RequestInit)
    const type = res.headers.get('content-type') ?? 'application/octet-stream'
    // 부분 요청을 무시하고 통째로 준 서버 — 받은 것을 그대로 쓴다
    if (res.status === 200) return keep(new Blob([await res.arrayBuffer()], { type }))
    if (res.status !== 206) throw new Error(`${url} ${res.status}`)
    const total = Number(res.headers.get('content-range')?.split('/')[1])
    const etag = res.headers.get('etag')
    if (!Number.isFinite(total) || total <= 0) throw new Error(`${url} no total`)
    if (part && (part.etag !== etag || part.total !== total)) {
      // 받는 사이에 파일이 바뀌었다(새 배포) — 처음부터
      partial.delete(url)
      continue
    }
    const bytes = await res.arrayBuffer()
    if (!bytes.byteLength) throw new Error(`${url} empty chunk`)
    const next = part ?? { etag, total, type, chunks: [], received: 0 }
    next.chunks.push(bytes)
    next.received += bytes.byteLength
    partial.set(url, next)
    if (next.received < next.total) await pause(CHUNK_GAP_MS, signal)
  }
}

/** 컬러 모드 첫 화면(손님 없음)에서 부른다. 이미 받았거나 받는 중이면 아무것도 하지 않는다. 실패해도 조용히 — 다음 첫 화면에서 다시 */
export function preloadGarmentModel(): void {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || assets || download) return
  const ctrl = new AbortController()
  download = ctrl
  void (async () => {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision')
    const name = (await FilesetResolver.isSimdSupported()) ? 'vision_wasm_internal' : 'vision_wasm_nosimd_internal'
    // 작은 것부터 — 로더 → 엔진 → 모델. 끝까지 받은 파일은 보관함에, 받다 만 파일은 조각째 메모리에 남아 다음에 이어 받는다
    const loader = await getAsset(`${WASM_PATH}/${name}.js`, ctrl.signal)
    const binary = await getAsset(`${WASM_PATH}/${name}.wasm`, ctrl.signal)
    const model = new Uint8Array(await (await getAsset(MODEL_PATH, ctrl.signal)).arrayBuffer())
    if (ctrl.signal.aborted) return
    assets = { loader: URL.createObjectURL(loader), binary: URL.createObjectURL(binary), model }
    // 옛 판 보관함 정리
    if (typeof caches !== 'undefined') {
      void caches.keys().then((keys) => keys.filter((k) => k.startsWith('kiosk-garment-assets-') && k !== ASSET_CACHE).forEach((k) => void caches.delete(k))).catch(() => {})
    }
  })()
    .catch(() => {})
    .finally(() => { if (download === ctrl) download = null })
}

/** 손님이 첫 화면을 떠나면 받던 것을 멈춘다 — 다음 첫 화면에서 이어 받는다 */
export function pauseGarmentDownload(): void {
  download?.abort()
  download = null
}

// ───────────────────────── 워커 ─────────────────────────

let worker: { w: Worker; ready: Promise<void>; pending: Map<number, (r: GarmentWorkerResponse) => void> } | null = null
let nextId = 1

function killWorker(): void {
  if (!worker) return
  worker.w.terminate()
  for (const done of worker.pending.values()) done({ id: 0, ok: false, error: 'worker terminated' })
  worker = null
}

/** 워커에 보내는 요청(번호는 call 이 붙인다) */
type WorkerCall = GarmentWorkerRequest extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never

function call(req: WorkerCall, timeoutMs: number, transfer: Transferable[] = []): Promise<GarmentWorkerResponse & { ok: true }> {
  const current = worker
  if (!current) return Promise.reject(new Error('no worker'))
  const id = nextId++
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      current.pending.delete(id)
      // 계산이 멈췄다 — 워커째 끝낸다(다음 사진에서 새로 만든다)
      if (worker === current) killWorker()
      reject(new Error('timeout'))
    }, timeoutMs)
    current.pending.set(id, (res) => {
      window.clearTimeout(timer)
      current.pending.delete(id)
      if (res.ok) resolve(res)
      else reject(new Error(res.error))
    })
    current.w.postMessage({ ...req, id }, transfer)
  })
}

/** 촬영 화면에서 미리 부른다 — 엔진 준비(수 초)를 사진 찍는 동안 끝내 둔다. 파일을 아직 못 받았으면 아무것도 하지 않는다 */
export function warmGarmentEngine(): void {
  if (typeof window !== 'undefined' && assets) void ensureWorker().catch(() => {})
}

/**
 * 이 사진의 진단용 얼굴 사진·색 측정값. 기기에 모델이 없거나, 얼굴을 못 찾았거나, 제한 시간을 넘기면 null —
 * 그때는 원본 사진으로 진단한다(진단을 붙잡아 두지 않는다). 같은 분리 결과를 옷 색 미리보기가 이어서 쓴다.
 */
export function colorFocusFor(photo: string, timeoutMs = 7000): Promise<ColorFocus | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs)
    prepareGarment(photo).then((prep) => { window.clearTimeout(timer); resolve(prep.focus ?? null) }, () => { window.clearTimeout(timer); resolve(null) })
  })
}

/** 받아 둔 파일로 워커와 엔진을 준비한다 — 없으면 바로 실패(여기서 망을 쓰지 않는다) */
function ensureWorker(): Promise<void> {
  if (!assets) return Promise.reject(new Error('garment assets not downloaded'))
  if (!worker) {
    const w = new Worker(new URL('./garment.worker.ts', import.meta.url), { type: 'module' })
    const pending = new Map<number, (r: GarmentWorkerResponse) => void>()
    w.onmessage = (event: MessageEvent<GarmentWorkerResponse>) => pending.get(event.data.id)?.(event.data)
    w.onerror = () => { if (worker?.w === w) killWorker() }
    worker = { w, pending, ready: Promise.resolve() }
    const ready = assets
    worker.ready = call({ type: 'init', loader: ready.loader, binary: ready.binary, model: ready.model }, PREPARE_TIMEOUT_MS).then(() => {})
    // 엔진 준비에 실패한 워커는 버린다 — 다음 사진에서 새로 만든다
    worker.ready.catch(() => { if (worker?.w === w) killWorker() })
  }
  return worker.ready
}

// ───────────────────────── 사진 한 장 준비(캐시) ─────────────────────────

let current: { key: string; promise: Promise<GarmentPrep>; urls: string[]; generation: number } | null = null
let generation = 0

/** 이 사진의 옷 마스크를 계산한다. 같은 사진이면 계산 중이거나 끝난 것을 그대로 돌려준다(한 장만 기억) */
export function prepareGarment(photo: string): Promise<GarmentPrep> {
  if (current?.key === photo) return current.promise
  releaseGarment()
  // 모델을 아직 다 받지 못했다 — 기다리지 않고 바로 드레이프로(손님 진행 중에는 받지 않는다)
  if (!assets || typeof Worker === 'undefined') return Promise.resolve(unavailablePrep())
  const gen = ++generation
  const urls: string[] = []
  const started = Date.now()
  const promise = build(photo, urls, gen, started).catch((error) => {
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

function unavailablePrep(): GarmentPrep {
  return { ...failedPrep(), status: 'unavailable' }
}

function failedPrep(): GarmentPrep {
  return {
    status: 'failed', coverage: 0, width: 0, height: 0,
    render: () => Promise.reject(new Error('garment unavailable')),
    maskUrl: () => Promise.reject(new Error('garment unavailable')),
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('photo load failed'))
    img.src = src
  })
}

async function build(photo: string, urls: string[], gen: number, started: number): Promise<GarmentPrep> {
  const [, img] = await Promise.all([ensureWorker(), loadImage(photo)])
  if (gen !== generation) throw new Error('superseded')
  const scale = Math.min(1, WORK_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.round(img.naturalWidth * scale)
  const H = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(img, 0, 0, W, H)
  const pixels = ctx.getImageData(0, 0, W, H).data.buffer
  // 엔진 준비에 쓴 시간을 빼고 남은 만큼만 기다린다
  const left = Math.max(5_000, PREPARE_TIMEOUT_MS - (Date.now() - started))
  const res = await call({ type: 'prepare', key: gen, width: W, height: H, pixels, minCoverage: MIN_COVERAGE }, left, [pixels])
  if (gen !== generation) throw new Error('superseded')
  const coverage = res.coverage ?? 0
  const status: GarmentStatus = res.status ?? 'failed'
  const cache = new Map<string, Promise<string>>()

  const toUrl = async (req: WorkerCall): Promise<string> => {
    const out = await call(req, RENDER_TIMEOUT_MS)
    if (!out.blob) throw new Error('encode failed')
    if (gen !== generation) throw new Error('superseded')
    const url = URL.createObjectURL(out.blob)
    urls.push(url)
    return url
  }

  const render = (hex: string): Promise<string> => {
    const key = hex.toLowerCase()
    const hit = cache.get(key)
    if (hit) return hit
    const job = toUrl({ type: 'render', key: gen, hex: key })
    // 실패한 계산은 캐시하지 않는다
    job.catch(() => cache.delete(key))
    cache.set(key, job)
    return job
  }

  let focus: ColorFocus | undefined
  if (res.focus && res.measure) {
    const image = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(res.focus as Blob)
    })
    if (image) focus = { image, measure: res.measure }
  }

  return { status, coverage, width: W, height: H, render, maskUrl: () => toUrl({ type: 'mask', key: gen }), focus }
}
