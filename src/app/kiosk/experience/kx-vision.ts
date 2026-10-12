// 손·얼굴 특징점 찾기 엔진(MediaPipe Tasks Vision) — 네일은 손(21점), 메이크업은 얼굴(478점).
// 엔진(WASM)과 모델은 public 에 자체 호스팅한 것을 기기 보관함에 받아 두고 쓴다(kx-assets.ts).
// 사진 한 장을 한 번 보는 일이라 화면 스레드에서 돈다(영상처럼 매 프레임 돌리지 않는다). 사진은 기기 안에서만 본다.

import type { FaceLandmarker, HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision'
import { getCachedAsset, type AssetPace } from './kx-assets'

/** hair — 머리카락·피부·옷을 가르는 분할 모델(16MB, 컬러 모드가 쓰는 것과 같은 파일·같은 보관함) */
export type VisionKind = 'face' | 'hand' | 'hair'
const WASM_PATH = '/mediapipe/wasm'
const MODEL: Record<VisionKind, string> = { face: '/models/face_landmarker.task', hand: '/models/hand_landmarker.task', hair: '/models/selfie_multiclass_256x256.tflite' }

interface Files { loader: Blob; binary: Blob; model: Blob }

async function fetchFiles(kind: VisionKind, signal: AbortSignal, pace: AssetPace): Promise<Files> {
  const { FilesetResolver } = await import('@mediapipe/tasks-vision')
  const name = (await FilesetResolver.isSimdSupported()) ? 'vision_wasm_internal' : 'vision_wasm_nosimd_internal'
  // 작은 것부터 — 로더 → 모델 → 엔진
  const loader = await getCachedAsset(`${WASM_PATH}/${name}.js`, signal, pace)
  const model = await getCachedAsset(MODEL[kind], signal, pace)
  const binary = await getCachedAsset(`${WASM_PATH}/${name}.wasm`, signal, pace)
  return { loader, binary, model }
}

/**
 * 첫 화면(손님 없음)에서 부른다 — 필요한 파일을 천천히 받아 보관함에 넣어 둔다. 돌려주는 함수를 부르면 멈춘다
 * (손님이 시작하면 멈추고, 그 뒤 필요한 순간에 loadVision 이 이어서 받는다).
 */
export function preloadVision(kind: VisionKind): () => void {
  const ctrl = new AbortController()
  void fetchFiles(kind, ctrl.signal, 'idle').catch(() => { /* 다음 첫 화면에서 다시 */ })
  return () => ctrl.abort()
}

type Engine = FaceLandmarker | HandLandmarker | ImageSegmenter
const engines: { face?: Promise<FaceLandmarker>; hand?: Promise<HandLandmarker>; hair?: Promise<ImageSegmenter> } = {}

async function create(kind: VisionKind): Promise<Engine> {
  const files = await fetchFiles(kind, new AbortController().signal, 'now')
  const vision = await import('@mediapipe/tasks-vision')
  const fileset = { wasmLoaderPath: URL.createObjectURL(files.loader), wasmBinaryPath: URL.createObjectURL(files.binary) }
  const baseOptions = { modelAssetBuffer: new Uint8Array(await files.model.arrayBuffer()), delegate: 'CPU' as const }
  if (kind === 'hair') return vision.ImageSegmenter.createFromOptions(fileset, { baseOptions, runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true })
  return kind === 'face'
    ? vision.FaceLandmarker.createFromOptions(fileset, { baseOptions, runningMode: 'IMAGE', numFaces: 1, minFaceDetectionConfidence: 0.4, minFacePresenceConfidence: 0.4 })
    : vision.HandLandmarker.createFromOptions(fileset, { baseOptions, runningMode: 'IMAGE', numHands: 1, minHandDetectionConfidence: 0.35, minHandPresenceConfidence: 0.35 })
}

/** 엔진을 준비한다(이미 준비됐거나 준비 중이면 그것을). 없는 파일은 지금 받는다. 실패는 기억하지 않는다 — 다음에 다시 시도 */
export function loadVision(kind: 'face'): Promise<FaceLandmarker>
export function loadVision(kind: 'hand'): Promise<HandLandmarker>
export function loadVision(kind: 'hair'): Promise<ImageSegmenter>
export function loadVision(kind: VisionKind): Promise<Engine> {
  const kept = engines[kind]
  if (kept) return kept
  const made = create(kind).catch((error) => { delete engines[kind]; throw error })
  ;(engines as Record<VisionKind, Promise<Engine>>)[kind] = made
  return made
}

/** 사진(data: 주소)을 계산용 캔버스로 — 긴 변 상한까지 줄인다 */
export async function photoCanvas(photo: string, maxEdge = 1280): Promise<HTMLCanvasElement> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('사진을 읽지 못했습니다')); image.src = photo })
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}
