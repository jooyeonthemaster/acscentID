/**
 * 펀그라운드 웹캠 사진 사람 오려내기 — cutoutWebcamPerson (FUTURE NEWS! · LATER! · THEME!)
 *
 * 부스 「같이 찍기」의 cutoutPerson 은 팬 사진(손에 든 인형 · 스티커)용이라 ② 배경과 다른 색 덩어리 ③ U²-Net 주인공을
 * 사람에 붙인다. 노트북 · 부스 웹캠 셀카에서는 이 덧붙이기와 256 해상도 마스크가 머리 · 든 손 둘레에 어두운 배경 덩어리를
 * 남겼다(2026-11 실사용 시험: 어두운 방 · 검은 후드 · 머리 옆에 든 손). 그래서 웹캠 사진은 따로 오린다.
 *
 *   ① 사람 자리   MediaPipe 다중 클래스(사람만, 덧붙이기 없음) — 어디에 사람이 있는지 · 얼굴이 어디인지
 *   ② 경계        MODNet 인물 매팅 — 사람 자리 둘레만 잘라 짧은 변 512 로 돌려 머리카락 · 손가락 경계를 얻는다
 *   ③ 정리        MODNet 결과는 ① 을 불린 범위 안에서만 쓴다(머리카락 자리는 넉넉히, 몸 · 손은 조금만 — 책상 위 노트북 같은
 *                 앞 물건 · 뒤 배경 차단). 반투명 경계의 알파를 주변 사람 색 · 배경색으로 다시 재고(흰 배경 후광 · 곱슬머리 사이 벽),
 *                 사람(얼굴)에 이어진 덩어리만 남겨 섬 · 가는 띠를 지운 뒤, 경계에 섞인 배경색을 사람 색으로 바꾼다
 *
 * 2026-11-15 비교(가상 웹캠 사진 7장 — 어두운 방 검은 후드 + 든 손 · 어수선한 거실 · 역광 창 · 곱슬머리 · 안경+헤드폰 ·
 * 아이 둘 · 흰 부스 배경): cutoutPerson 은 창문 · 프린터 · 책 · 노트북을 사람에 붙였고, MediaPipe 만(가이드 필터)은
 * 머리가 헬멧처럼 뭉개지고 든 손과 머리 사이 배경이 채워졌다. 이 방법이 머리카락 · 손가락 · 아이 사이 틈이 가장 깨끗했다.
 * MODNet 8비트 양자화본(6.6MB)은 어두운 사진에서 얼굴에 구멍이 나 쓰지 않는다.
 *
 * - 모델 · WASM 전부 자체 호스팅(public/) — CDN 을 쓰면 캔버스가 오염돼 인화 toDataURL() 이 실패한다. 외부 AI 호출 없음.
 * - MODNet: github.com/ZHKKKe/MODNet (코드 · 모델 Apache-2.0). ONNX 는 huggingface.co/Xenova/modnet 의 onnx/model.onnx
 *   (Apache-2.0, 25.9MB, sha256 07c308cf…584df9) → public/models/modnet.onnx. 런타임은 public/onnxruntime(MIT).
 * - MODNet 을 못 불러오면 ① 만으로(가이드 필터로 경계를 다듬어) 계속하고, 그것도 실패하면 cutoutPerson 으로 넘긴다.
 */

import {
  boxMean, cropToContent, cutoutPerson, getSegmenter, smoothstep, upsample,
  type CutoutResult, type OrtModule, type OrtSession,
} from '@/lib/photobooth/segmentation'

const ORT_DIR = '/onnxruntime/'
const ORT_MODULE = '/onnxruntime/ort.wasm.min.mjs'
const MODNET_MODEL = '/models/modnet.onnx'

/** 분석 해상도(긴 변) */
const WORK_EDGE = 1280
/** 결과 캔버스 해상도 상한(긴 변) — cutoutPerson 과 같다 */
const OUTPUT_EDGE = 1600
/** MODNet 입력 짧은 변(32 의 배수로 맞춘다) — 512 가 학습 크기. 노트북 wasm 1스레드에서 약 0.8~1.3초 */
const MODNET_SHORT = 512
/** MediaPipe 사람 자리 밖으로 MODNet 을 허용하는 폭(짧은 변 비율) — 머리카락은 넉넉히, 몸 · 손은 조금만 */
const HAIR_MARGIN = 0.045
const BODY_MARGIN = 0.012
/** 머리카락 자리 밖에서 지우는 가는 띠의 폭(짧은 변 비율) — 몸에 붙은 노트북 윗변 · 책상 모서리 */
const THIN_CUT = 0.006

// ───────────────────────── 모델 로딩 ─────────────────────────

let modnetPromise: Promise<{ ort: OrtModule; session: OrtSession } | null> | null = null

function getModnet(): Promise<{ ort: OrtModule; session: OrtSession } | null> {
  if (!modnetPromise) {
    modnetPromise = (async () => {
      try {
        const url = new URL(ORT_MODULE, window.location.origin).href
        const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as OrtModule
        ort.env.wasm.wasmPaths = new URL(ORT_DIR, window.location.origin).href
        // segmentation.ts(u2netp)와 같은 설정 — 교차 출처 격리가 없어 스레드 1, 화면이 얼지 않게 워커에서
        ort.env.wasm.numThreads = 1
        ort.env.wasm.proxy = true
        const session = await ort.InferenceSession.create(MODNET_MODEL, { executionProviders: ['wasm'] })
        return { ort, session }
      } catch (error) {
        console.warn('[funground] MODNet 로드 실패 — MediaPipe 만으로 오린다:', error)
        // 실패를 캐시하지 않는다 — 다음 사진에서 다시 시도
        modnetPromise = null
        return null
      }
    })()
  }
  return modnetPromise
}

/** 모델을 미리 올려 둔다(카메라 화면에서) — 찍은 뒤 기다림이 추론 시간만 남게 */
export async function warmupWebcamCutout(): Promise<void> {
  await Promise.allSettled([
    getSegmenter().then((segmenter) => {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 64
      c.getContext('2d')?.fillRect(0, 0, 64, 64)
      segmenter.segment(c).close?.()
    }),
    getModnet(),
  ])
}

// ───────────────────────── 보조 계산 ─────────────────────────

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 이진 격자의 4-이웃 연결 덩어리 번호(0 = 없음)와 넓이 */
function labelComponents(bin: Uint8Array, w: number, h: number) {
  const labels = new Int32Array(w * h)
  const areas = [0]
  const stack: number[] = []
  let next = 1
  for (let start = 0; start < bin.length; start++) {
    if (!bin[start] || labels[start]) continue
    let area = 0
    labels[start] = next
    stack.push(start)
    while (stack.length) {
      const i = stack.pop() as number
      area++
      const x = i % w
      if (x + 1 < w && bin[i + 1] && !labels[i + 1]) { labels[i + 1] = next; stack.push(i + 1) }
      if (x > 0 && bin[i - 1] && !labels[i - 1]) { labels[i - 1] = next; stack.push(i - 1) }
      if (i + w < bin.length && bin[i + w] && !labels[i + w]) { labels[i + w] = next; stack.push(i + w) }
      if (i - w >= 0 && bin[i - w] && !labels[i - w]) { labels[i - w] = next; stack.push(i - w) }
    }
    areas.push(area)
    next++
  }
  return { labels, areas }
}

/** 이진 마스크를 반경 r 만큼 불린다(박스) */
function dilate(bin: Float32Array, w: number, h: number, r: number): Float32Array {
  const m = boxMean(bin, w, h, r)
  for (let i = 0; i < m.length; i++) m[i] = m[i] > 1e-4 ? 1 : 0
  return m
}

/** 이진 마스크를 반경 r 만큼 깎는다(박스) */
function erode(bin: Float32Array, w: number, h: number, r: number): Float32Array {
  const m = boxMean(bin, w, h, r)
  for (let i = 0; i < m.length; i++) m[i] = m[i] > 1 - 1e-4 ? 1 : 0
  return m
}

/** 컬러 가이드 필터(He et al.) — 마스크 경계를 원본 사진의 색 윤곽에 붙인다. 밝기만 쓰는 것보다 검은 옷 · 어두운 배경을 잘 가른다 */
function guidedFilterRGB(px: Uint8ClampedArray, p: Float32Array, W: number, H: number, r: number, eps: number) {
  const n = W * H
  const R = new Float32Array(n)
  const G = new Float32Array(n)
  const B = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    R[i] = px[i * 4] / 255
    G[i] = px[i * 4 + 1] / 255
    B[i] = px[i * 4 + 2] / 255
  }
  const prod = (a: Float32Array, b: Float32Array) => {
    const o = new Float32Array(n)
    for (let i = 0; i < n; i++) o[i] = a[i] * b[i]
    return o
  }
  const mR = boxMean(R, W, H, r)
  const mG = boxMean(G, W, H, r)
  const mB = boxMean(B, W, H, r)
  const mp = boxMean(p, W, H, r)
  const mRp = boxMean(prod(R, p), W, H, r)
  const mGp = boxMean(prod(G, p), W, H, r)
  const mBp = boxMean(prod(B, p), W, H, r)
  const vRR = boxMean(prod(R, R), W, H, r)
  const vRG = boxMean(prod(R, G), W, H, r)
  const vRB = boxMean(prod(R, B), W, H, r)
  const vGG = boxMean(prod(G, G), W, H, r)
  const vGB = boxMean(prod(G, B), W, H, r)
  const vBB = boxMean(prod(B, B), W, H, r)
  const aR = new Float32Array(n)
  const aG = new Float32Array(n)
  const aB = new Float32Array(n)
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const cR = mRp[i] - mR[i] * mp[i]
    const cG = mGp[i] - mG[i] * mp[i]
    const cB = mBp[i] - mB[i] * mp[i]
    const rr = vRR[i] - mR[i] * mR[i] + eps
    const rg = vRG[i] - mR[i] * mG[i]
    const rb = vRB[i] - mR[i] * mB[i]
    const gg = vGG[i] - mG[i] * mG[i] + eps
    const gb = vGB[i] - mG[i] * mB[i]
    const bb = vBB[i] - mB[i] * mB[i] + eps
    // 3×3 대칭 행렬의 역행렬
    const i00 = gg * bb - gb * gb
    const i01 = gb * rb - rg * bb
    const i02 = rg * gb - gg * rb
    const i11 = rr * bb - rb * rb
    const i12 = rb * rg - rr * gb
    const i22 = rr * gg - rg * rg
    const det = rr * i00 + rg * i01 + rb * i02
    const inv = det !== 0 ? 1 / det : 0
    aR[i] = (i00 * cR + i01 * cG + i02 * cB) * inv
    aG[i] = (i01 * cR + i11 * cG + i12 * cB) * inv
    aB[i] = (i02 * cR + i12 * cG + i22 * cB) * inv
    b[i] = mp[i] - aR[i] * mR[i] - aG[i] * mG[i] - aB[i] * mB[i]
  }
  const maR = boxMean(aR, W, H, r)
  const maG = boxMean(aG, W, H, r)
  const maB = boxMean(aB, W, H, r)
  const mb = boxMean(b, W, H, r)
  const q = new Float32Array(n)
  for (let i = 0; i < n; i++) q[i] = Math.min(1, Math.max(0, maR[i] * R[i] + maG[i] * G[i] + maB[i] * B[i] + mb[i]))
  return q
}

// ───────────────────────── 모델 실행 ─────────────────────────

interface PersonMasks {
  /** 사람일 확률(W×H) */
  person: Float32Array
  /** 얼굴 피부일 확률(W×H), 이진 모델이면 null */
  face: Float32Array | null
  /** 머리카락일 확률(W×H), 이진 모델이면 null */
  hair: Float32Array | null
}

/** MediaPipe 를 그림 한 장(또는 그 일부)에 돌려 W×H 격자의 rect 자리에 붙인다(rect 밖은 0) */
async function runMediaPipe(source: CanvasImageSource, rect: Rect, W: number, H: number, scale: number): Promise<PersonMasks> {
  const segmenter = await getSegmenter()
  // MediaPipe 입력은 256×256 으로 늘려 들어간다 — 잘라 낸 자리를 그 비율 그대로 넘긴다
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(rect.w / scale))
  c.height = Math.max(1, Math.round(rect.h / scale))
  const cx = c.getContext('2d')
  if (!cx) throw new Error('작업 캔버스를 만들지 못했습니다')
  cx.drawImage(source, rect.x / scale, rect.y / scale, rect.w / scale, rect.h / scale, 0, 0, c.width, c.height)
  const result = segmenter.segment(c)
  const masks = result.confidenceMasks
  if (!masks || masks.length === 0) {
    result.close?.()
    throw new Error('인물을 찾지 못했습니다')
  }
  const mw = masks[0].width
  const mh = masks[0].height
  const raw = new Float32Array(mw * mh)
  if (masks.length === 1) raw.set(masks[0].getAsFloat32Array())
  else {
    const bg = masks[0].getAsFloat32Array()
    for (let i = 0; i < raw.length; i++) raw[i] = 1 - bg[i]
  }
  // 다중 클래스: 1 머리카락 · 3 얼굴 피부
  const hairRaw = masks.length > 3 ? new Float32Array(masks[1].getAsFloat32Array()) : null
  const faceRaw = masks.length > 3 ? new Float32Array(masks[3].getAsFloat32Array()) : null
  result.close?.()
  return {
    person: pasteInto({ w: mw, h: mh, data: raw }, rect, W, H),
    face: faceRaw ? pasteInto({ w: mw, h: mh, data: faceRaw }, rect, W, H) : null,
    hair: hairRaw ? pasteInto({ w: mw, h: mh, data: hairRaw }, rect, W, H) : null,
  }
}

/** 작은 격자(m)를 W×H 의 rect 자리에 쌍선형으로 펴서 붙인다 */
function pasteInto(m: { w: number; h: number; data: Float32Array }, rect: Rect, W: number, H: number): Float32Array {
  const rw = Math.max(1, Math.round(rect.w))
  const rh = Math.max(1, Math.round(rect.h))
  const local = upsample(m, rw, rh)
  const x0 = Math.round(rect.x)
  const y0 = Math.round(rect.y)
  const out = new Float32Array(W * H)
  for (let y = 0; y < rh; y++) {
    const yy = y0 + y
    if (yy < 0 || yy >= H) continue
    for (let x = 0; x < rw; x++) {
      const xx = x0 + x
      if (xx < 0 || xx >= W) continue
      out[yy * W + xx] = local[y * rw + x]
    }
  }
  return out
}

/** MODNet 을 rect 자리에 돌린다 — 짧은 변 MODNET_SHORT(32 의 배수로), 원본 해상도에서 잘라 넣는다. 못 하면 null */
async function runModnet(
  source: CanvasImageSource, rect: Rect, scale: number, W: number, H: number,
): Promise<Float32Array | null> {
  const net = await getModnet()
  if (!net) return null
  try {
    const k = MODNET_SHORT / Math.min(rect.w, rect.h)
    const iw = Math.max(32, Math.round((rect.w * k) / 32) * 32)
    const ih = Math.max(32, Math.round((rect.h * k) / 32) * 32)
    const c = document.createElement('canvas')
    c.width = iw
    c.height = ih
    const cx = c.getContext('2d', { willReadFrequently: true })
    if (!cx) return null
    cx.imageSmoothingQuality = 'high'
    cx.drawImage(source, rect.x / scale, rect.y / scale, rect.w / scale, rect.h / scale, 0, 0, iw, ih)
    const px = cx.getImageData(0, 0, iw, ih).data
    const plane = iw * ih
    // 학습 때와 같은 정규화: (x/255 - 0.5) / 0.5
    const input = new Float32Array(3 * plane)
    for (let i = 0; i < plane; i++) {
      input[i] = px[i * 4] / 127.5 - 1
      input[plane + i] = px[i * 4 + 1] / 127.5 - 1
      input[2 * plane + i] = px[i * 4 + 2] / 127.5 - 1
    }
    const { ort, session } = net
    const output = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, ih, iw]) })
    const matte = output[session.outputNames[0]].data
    return pasteInto({ w: iw, h: ih, data: Float32Array.from(matte) }, rect, W, H)
  } catch (error) {
    console.warn('[funground] MODNet 추론 실패 — MediaPipe 만으로 오린다:', error)
    return null
  }
}

// ───────────────────────── 사람 자리 · 정리 ─────────────────────────

/**
 * 사람 덩어리만 고른다 — 얼굴이 닿은 덩어리 + 큰 덩어리(가장 큰 것의 8% · 화면의 0.4% 이상).
 * 배경의 작은 섬(전등 · 액자 · 의자 끝)은 버린다.
 */
function keepPeople(bin: Uint8Array, face: Float32Array | null, W: number, H: number): Uint8Array {
  const { labels, areas } = labelComponents(bin, W, H)
  const touchesFace = new Uint8Array(areas.length)
  if (face) for (let i = 0; i < labels.length; i++) if (labels[i] && face[i] > 0.5) touchesFace[labels[i]] = 1
  let largest = 0
  for (let k = 1; k < areas.length; k++) largest = Math.max(largest, areas[k])
  const minArea = Math.max(W * H * 0.004, largest * 0.08)
  const keep = new Uint8Array(areas.length)
  for (let k = 1; k < areas.length; k++) keep[k] = touchesFace[k] || areas[k] >= minArea ? 1 : 0
  const out = new Uint8Array(W * H)
  for (let i = 0; i < labels.length; i++) if (keep[labels[i]]) out[i] = 1
  return out
}

/** 사람 둘레를 감싸는 자리(여유 포함) — 머리카락 위 · 든 손 · 옆 머리가 잘리지 않게 넉넉히 */
function peopleRect(bin: Uint8Array, W: number, H: number): Rect | null {
  let minX = W
  let minY = H
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!bin[y * W + x]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const mx = Math.max(bw * 0.15, W * 0.06)
  const top = Math.max(bh * 0.15, H * 0.06)
  const x0 = Math.max(0, Math.floor(minX - mx))
  const y0 = Math.max(0, Math.floor(minY - top))
  const x1 = Math.min(W, Math.ceil(maxX + 1 + mx))
  const y1 = Math.min(H, Math.ceil(maxY + 1 + mx))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** 바깥과 이어지지 않은 작은 구멍(눈 · 단추 · 안경알이 빠진 곳)을 메운다 — 팔과 몸 사이 같은 큰 틈은 그대로 */
function smallHoles(bin: Uint8Array, W: number, H: number, maxArea: number): Uint8Array {
  const inv = new Uint8Array(W * H)
  for (let i = 0; i < inv.length; i++) inv[i] = bin[i] ? 0 : 1
  const { labels, areas } = labelComponents(inv, W, H)
  const border = new Uint8Array(areas.length)
  for (let x = 0; x < W; x++) {
    border[labels[x]] = 1
    border[labels[(H - 1) * W + x]] = 1
  }
  for (let y = 0; y < H; y++) {
    border[labels[y * W]] = 1
    border[labels[y * W + W - 1]] = 1
  }
  const out = new Uint8Array(W * H)
  for (let i = 0; i < labels.length; i++) {
    const k = labels[i]
    if (k && !border[k] && areas[k] <= maxArea) out[i] = 1
  }
  return out
}

// ───────────────────────── 오려내기 ─────────────────────────

export type WebcamCutoutMethod = 'modnet' | 'mp'

export interface WebcamCutoutOptions {
  /** modnet(기본 — MediaPipe 자리 + MODNet 경계) · mp(MediaPipe 만 + 컬러 가이드 필터, MODNet 을 못 불러올 때와 같은 길) */
  method?: WebcamCutoutMethod
}

export interface WebcamCutoutResult extends CutoutResult {
  /** 실제로 쓴 방법 — MODNet 을 못 불러오면 mp, 전부 실패하면 legacy(cutoutPerson) */
  method: WebcamCutoutMethod | 'legacy'
  /** 단계별 소요 시간(ms) */
  timings: Record<string, number>
}

type Source = HTMLImageElement | HTMLCanvasElement

/**
 * 웹캠 사진에서 사람만 남긴 RGBA 캔버스(내용에 맞춰 잘림). cutoutPerson 과 같은 모양의 결과를 돌려준다.
 * 무엇이 실패하든 cutoutPerson(부스 「같이 찍기」 방식)으로 넘겨 화면이 멈추지 않게 한다.
 */
export async function cutoutWebcamPerson(source: Source, options: WebcamCutoutOptions = {}): Promise<WebcamCutoutResult> {
  try {
    return await cutoutWebcam(source, options)
  } catch (error) {
    console.warn('[funground] 웹캠 오려내기 실패 — 부스 방식(cutoutPerson)으로:', error)
    const t0 = performance.now()
    const img = source instanceof HTMLImageElement ? source : await canvasToImage(source)
    const legacy = await cutoutPerson(img)
    return { ...legacy, method: 'legacy', timings: { total: Math.round(performance.now() - t0) } }
  }
}

async function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 읽지 못했어요.'))), 'image/jpeg', 0.95))
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function cutoutWebcam(source: Source, { method = 'modnet' }: WebcamCutoutOptions): Promise<WebcamCutoutResult> {
  const t0 = performance.now()
  const timings: Record<string, number> = {}
  const lap = (() => {
    let last = t0
    return (name: string) => {
      const now = performance.now()
      timings[name] = Math.round(now - last)
      last = now
    }
  })()

  const sw = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width
  const sh = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height
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
  const full: Rect = { x: 0, y: 0, w: W, h: H }

  // ① 사람 자리 — 화면 전체에 한 번
  let mp = await runMediaPipe(source, full, W, H, ws)
  lap('mediapipe')
  const bin0 = new Uint8Array(W * H)
  for (let i = 0; i < bin0.length; i++) bin0[i] = mp.person[i] > 0.5 ? 1 : 0
  const people0 = keepPeople(bin0, mp.face, W, H)
  const rect = peopleRect(people0, W, H) ?? full

  // 사람 자리만 잘라 한 번 더 — 256 격자가 사람에게만 쓰여 경계가 촘촘해진다
  if (rect.w * rect.h < W * H * 0.9) {
    mp = await runMediaPipe(source, rect, W, H, ws)
    lap('mediapipe-zoom')
  }

  let alpha: Float32Array
  let used: WebcamCutoutMethod = method
  /** 머리카락 자리(잔머리를 살릴 곳) — 가는 띠 지우기에서 뺀다 */
  let hairZone: Float32Array | null = null
  const matte = method === 'mp' ? null : await runModnet(source, rect, ws, W, H)
  if (method !== 'mp') lap('modnet')

  if (matte) {
    // ③ MODNet 은 사람 자리(불린 MediaPipe 마스크) 안에서만 — 뒤 배경의 사람 비슷한 것 · 물건을 막는다
    //   머리카락(잔머리가 MediaPipe 밖으로 나간다)은 넉넉히, 몸 · 손은 조금만 — 책상 위 노트북 같은 앞 물건이 붙지 않게
    const S = Math.min(W, H)
    const gateOf = (prob: Float32Array, margin: number) => {
      const bin = new Float32Array(W * H)
      for (let i = 0; i < bin.length; i++) bin[i] = prob[i] > 0.3 ? 1 : 0
      const r = Math.max(2, Math.round(S * margin))
      return boxMean(dilate(bin, W, H, r), W, H, Math.max(1, Math.round(r / 2)))
    }
    const bodyGate = gateOf(mp.person, BODY_MARGIN)
    const hairGate = mp.hair ? gateOf(mp.hair, HAIR_MARGIN) : null
    hairZone = hairGate
    alpha = new Float32Array(W * H)
    for (let i = 0; i < alpha.length; i++) alpha[i] = matte[i] * (hairGate ? Math.max(bodyGate[i], hairGate[i]) : bodyGate[i])
    // 반투명 경계 알파를 색으로 다시 잰다(흰 배경 후광 · 곱슬머리 사이 벽)
    rematte(px, alpha, W, H, mp.hair)
  } else {
    // MediaPipe 만 — 덧붙이기 없이 사람 마스크를 컬러 가이드 필터로 원본 윤곽에 붙이고 경계를 조인다
    used = 'mp'
    const p = new Float32Array(W * H)
    for (let i = 0; i < p.length; i++) p[i] = smoothstep(0.4, 0.6, mp.person[i])
    const q = guidedFilterRGB(px, p, W, H, Math.max(4, Math.round(Math.min(W, H) / 100)), 4e-3)
    alpha = new Float32Array(W * H)
    for (let i = 0; i < alpha.length; i++) alpha[i] = smoothstep(0.35, 0.75, q[i])
  }
  lap('combine')

  // 정리 — 사람(얼굴)에 이어진 덩어리만, 작은 구멍은 메운다
  const bin = new Uint8Array(W * H)
  for (let i = 0; i < bin.length; i++) bin[i] = alpha[i] > 0.5 ? 1 : 0
  const kept = keepPeople(bin, mp.face, W, H)
  const keptF = new Float32Array(W * H)
  for (let i = 0; i < kept.length; i++) keptF[i] = kept[i]
  // 남긴 덩어리 둘레의 반투명 경계(머리카락)는 살리고, 버린 섬은 지운다
  const near = boxMean(dilate(keptF, W, H, 3), W, H, 2)
  // 머리카락 자리 밖의 가는 띠(몸에 붙은 노트북 윗변 · 책상 모서리)는 지운다 — 열림 연산으로 굵은 몸만 남긴다
  let thick: Float32Array | null = null
  if (hairZone) {
    const r = Math.max(2, Math.round(Math.min(W, H) * THIN_CUT))
    thick = boxMean(dilate(dilate(erode(keptF, W, H, r), W, H, r), W, H, 2), W, H, 1)
  }
  const holes = smallHoles(kept, W, H, W * H * 0.0006)
  let covered = 0
  for (let i = 0; i < alpha.length; i++) {
    // MODNet 이 있으면 MediaPipe 도 확실히 사람이라는 구멍만 메운다 — 곱슬머리 틈으로 보이는 벽은 그대로
    const fill = holes[i] && (!matte || mp.person[i] > 0.7)
    let a = fill ? 1 : alpha[i] * near[i]
    if (thick && hairZone && hairZone[i] < 0.5) a *= thick[i]
    alpha[i] = a
    if (a > 0.5) covered++
  }
  lap('cleanup')

  // 알파를 W×H 마스크 캔버스로
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = W
  maskCanvas.height = H
  const mctx = maskCanvas.getContext('2d')
  if (!mctx) throw new Error('마스크 캔버스를 만들지 못했습니다')
  const maskImage = mctx.createImageData(W, H)
  for (let i = 0; i < alpha.length; i++) {
    const o = i * 4
    maskImage.data[o] = 255
    maskImage.data[o + 1] = 255
    maskImage.data[o + 2] = 255
    maskImage.data[o + 3] = Math.round(alpha[i] * 255)
  }
  mctx.putImageData(maskImage, 0, 0)

  // 결과는 원본 해상도(상한 OUTPUT_EDGE) — 마스크만 부드럽게 확대해 알파로
  const os = Math.min(1, OUTPUT_EDGE / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * os))
  const height = Math.max(1, Math.round(sh * os))
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const octx = out.getContext('2d', { willReadFrequently: true })
  if (!octx) throw new Error('출력 캔버스를 만들지 못했습니다')
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(source, 0, 0, width, height)
  writeCutout(octx, maskCanvas, width, height)

  // 원본 테두리에 닿아 잘린 몸(팔 · 몸통)은 네 변을 알파로 살짝 흐려 감춘다(cutoutPerson 과 같다)
  octx.globalCompositeOperation = 'destination-in'
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
  lap('output')
  timings.total = Math.round(performance.now() - t0)
  console.info('[funground] 웹캠 오려내기(ms)', { size: `${W}x${H}`, method: used, ...timings })

  return { canvas: cropToContent(out), coverage: covered / alpha.length, method: used, timings }
}

/**
 * 주변 색 평균 — 가중치 w 인 곳의 색을 반경 r(작은 것 → 없으면 큰 것)으로 모은다. 결과는 0~255 RGB 세 장 + 근거가 있는지
 */
function localColor(px: Uint8ClampedArray, w: Float32Array, W: number, H: number, radii: number[]) {
  const n = W * H
  const R = new Float32Array(n)
  const G = new Float32Array(n)
  const B = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    R[i] = px[i * 4] * w[i]
    G[i] = px[i * 4 + 1] * w[i]
    B[i] = px[i * 4 + 2] * w[i]
  }
  const oR = new Float32Array(n)
  const oG = new Float32Array(n)
  const oB = new Float32Array(n)
  const ok = new Uint8Array(n)
  for (const r of radii) {
    const mw = boxMean(w, W, H, r)
    const mR = boxMean(R, W, H, r)
    const mG = boxMean(G, W, H, r)
    const mB = boxMean(B, W, H, r)
    for (let i = 0; i < n; i++) {
      if (ok[i] || mw[i] < 0.02) continue
      oR[i] = mR[i] / mw[i]
      oG[i] = mG[i] / mw[i]
      oB[i] = mB[i] / mw[i]
      ok[i] = 1
    }
  }
  return { R: oR, G: oG, B: oB, ok }
}

/**
 * 반투명 경계의 알파를 색으로 다시 잰다 — I = αF + (1-α)B 에서 주변 사람 색 F · 배경색 B 를 어림해 α 를 푼다.
 * MODNet 은 곱슬머리 사이 벽 · 흰 배경 둘레를 반쯤 사람으로 보는데(밝은 후광), 그 자리 색이 배경색과 같으면 α 가 0 으로 내려간다.
 * F 와 B 가 비슷해 가를 수 없는 곳(검은 옷 · 어두운 벽)은 MODNet 값을 그대로 둔다.
 */
function rematte(px: Uint8ClampedArray, alpha: Float32Array, W: number, H: number, hair: Float32Array | null) {
  const n = W * H
  const wf = new Float32Array(n)
  const wb = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    wf[i] = alpha[i] > 0.95 ? 1 : 0
    wb[i] = alpha[i] < 0.05 ? 1 : 0
  }
  const S = Math.min(W, H)
  const radii = [Math.max(3, Math.round(S / 90)), Math.max(6, Math.round(S / 30))]
  const F = localColor(px, wf, W, H, radii)
  // 배경색은 더 멀리까지 — 곱슬머리 덩어리 안쪽 틈은 바깥 벽까지 멀다
  const B = localColor(px, wb, W, H, [...radii, Math.max(12, Math.round(S / 10))])
  for (let i = 0; i < n; i++) {
    const a = alpha[i]
    // 거의 불투명한 곳은 머리카락 자리에서만 다시 잰다(곱슬머리 틈의 벽) — 얼굴 · 몸 가장자리는 MODNet 을 믿는다
    if (a <= 0.02 || (a >= 0.98 && !(hair && hair[i] > 0.3)) || !F.ok[i] || !B.ok[i]) continue
    const dR = F.R[i] - B.R[i]
    const dG = F.G[i] - B.G[i]
    const dB = F.B[i] - B.B[i]
    const len2 = dR * dR + dG * dG + dB * dB
    const len = Math.sqrt(len2) / 255
    if (len < 0.1) continue
    const est = ((px[i * 4] - B.R[i]) * dR + (px[i * 4 + 1] - B.G[i]) * dG + (px[i * 4 + 2] - B.B[i]) * dB) / len2
    // 불투명한 머리카락 자리는 배경색에 확실히 가까울 때만(머리카락 윤기 · 밝은 머리를 뚫지 않게)
    if (a >= 0.98 && est > 0.3) continue
    const c = smoothstep(0.1, 0.3, len)
    alpha[i] = Math.min(Math.min(1, a + 0.25), Math.max(0, c * est + (1 - c) * a))
  }
}

/**
 * 결과 RGBA — 원본 색 + 알파. 반투명 경계(머리카락 · 손가락 둘레)에는 배경색이 섞여 있어 어두운 방에서 찍으면 테두리가 검게,
 * 흰 배경이면 하얗게 번진다. 그 자리 색을 안쪽(불투명한) 사람 색으로 바꾼다.
 */
function writeCutout(ctx: CanvasRenderingContext2D, alphaCanvas: HTMLCanvasElement, W: number, H: number) {
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  const n = W * H
  const ac = document.createElement('canvas')
  ac.width = W
  ac.height = H
  const actx = ac.getContext('2d', { willReadFrequently: true })
  if (!actx) throw new Error('마스크 캔버스를 만들지 못했습니다')
  actx.imageSmoothingEnabled = true
  actx.imageSmoothingQuality = 'high'
  actx.drawImage(alphaCanvas, 0, 0, W, H)
  const am = actx.getImageData(0, 0, W, H).data
  {
    const wf = new Float32Array(n)
    for (let i = 0; i < n; i++) wf[i] = am[i * 4 + 3] > 242 ? 1 : 0
    const S = Math.min(W, H)
    const F = localColor(d, wf, W, H, [Math.max(3, Math.round(S / 150)), Math.max(6, Math.round(S / 50)), Math.max(12, Math.round(S / 20))])
    for (let i = 0; i < n; i++) {
      const a = am[i * 4 + 3] / 255
      if (a <= 0 || a >= 0.95 || !F.ok[i]) continue
      // 불투명할수록 원래 색, 투명할수록 안쪽 사람 색
      const t = smoothstep(0.4, 0.95, a)
      d[i * 4] = Math.round(d[i * 4] * t + F.R[i] * (1 - t))
      d[i * 4 + 1] = Math.round(d[i * 4 + 1] * t + F.G[i] * (1 - t))
      d[i * 4 + 2] = Math.round(d[i * 4 + 2] * t + F.B[i] * (1 - t))
    }
  }
  for (let i = 0; i < n; i++) d[i * 4 + 3] = am[i * 4 + 3]
  ctx.putImageData(img, 0, 0)
}
