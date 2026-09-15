/**
 * 업로드 사진 인물 오려내기 (MediaPipe Image Segmenter)
 *
 * '같이 찍기'에서 손님이 폰으로 올린 포카·직찍의 배경을 지워, 현장 촬영분 위에
 * 인물만 올려 "같이 찍은 것처럼" 합성하기 위한 모듈.
 *
 * - 모델·WASM 전부 자체 호스팅(public/) — 외부 CDN을 쓰면 캔버스가 오염돼
 *   최종 인화의 toDataURL()이 실패한다. 오프라인 매장에서도 동작해야 한다.
 * - 업로드 시 한 번만 도는 일회성 처리라 실시간 성능 제약이 없다.
 * - MediaPipe(Apache-2.0)라 상업적 이용에 제약이 없다.
 */

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'

/** 품질 우선(다중 클래스, 머리카락 경계가 낫다) → 실패 시 경량 모델로 폴백 */
const MODEL_CANDIDATES = [
  '/models/selfie_multiclass_256x256.tflite',
  '/models/selfie_segmenter.tflite',
]

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

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export interface CutoutOptions {
  /** 경계를 조이는 정도(0~1). 높일수록 배경 후광이 줄지만 인물 외곽이 깎인다 */
  tighten?: number
  /** 경계 부드러움(0~1). 인화 시 계단현상을 막는 최소한의 여유 */
  softness?: number
}

export interface CutoutResult {
  canvas: HTMLCanvasElement
  /** 원본 대비 인물이 차지한 면적 비율 — 실패 감지에 쓴다 */
  coverage: number
}

/**
 * 인물만 남긴 RGBA 캔버스를 만든다. 인물 바운딩 박스로 잘라내므로
 * 합성 시 크기 슬라이더가 곧 인물 크기가 된다.
 */
export async function cutoutPerson(
  source: HTMLImageElement,
  { tighten = 0.5, softness = 0.16 }: CutoutOptions = {}
): Promise<CutoutResult> {
  const segmenter = await getSegmenter()
  const result = segmenter.segment(source)
  const masks = result.confidenceMasks

  if (!masks || masks.length === 0) {
    result.close?.()
    throw new Error('인물을 찾지 못했습니다')
  }

  const mw = masks[0].width
  const mh = masks[0].height
  const alpha = new Float32Array(mw * mh)

  if (masks.length === 1) {
    // 이진 모델: 마스크 값이 곧 인물 신뢰도
    alpha.set(masks[0].getAsFloat32Array())
  } else {
    // 다중 클래스 모델: 0번이 배경이므로 그 여집합이 인물(머리카락·피부·옷 전부 포함)
    const background = masks[0].getAsFloat32Array()
    for (let i = 0; i < alpha.length; i++) alpha[i] = 1 - background[i]
  }
  result.close?.()

  // 신뢰도 → 알파. tighten 이 높을수록 임계값이 올라가 경계가 안쪽으로 깎인다(후광 제거)
  const center = 0.3 + Math.min(1, Math.max(0, tighten)) * 0.4
  const band = Math.max(0.02, softness)
  const lo = center - band / 2
  const hi = center + band / 2

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = mw
  maskCanvas.height = mh
  const mctx = maskCanvas.getContext('2d')
  if (!mctx) throw new Error('마스크 캔버스를 만들지 못했습니다')

  const maskImage = mctx.createImageData(mw, mh)
  let covered = 0
  for (let i = 0; i < alpha.length; i++) {
    const a = smoothstep(lo, hi, alpha[i])
    if (a > 0.5) covered++
    const o = i * 4
    maskImage.data[o] = 255
    maskImage.data[o + 1] = 255
    maskImage.data[o + 2] = 255
    maskImage.data[o + 3] = Math.round(a * 255)
  }
  mctx.putImageData(maskImage, 0, 0)

  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const octx = out.getContext('2d')
  if (!octx) throw new Error('출력 캔버스를 만들지 못했습니다')

  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(source, 0, 0, width, height)
  // 마스크를 원본 크기로 부드럽게 확대해 알파로 적용
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
    coverage: covered / alpha.length,
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
