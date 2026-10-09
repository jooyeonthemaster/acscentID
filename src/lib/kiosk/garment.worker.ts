/// <reference lib="webworker" />
// 옷 색 미리보기 워커 — 모델 추론·마스크 다듬기·색 칠하기·PNG 만들기를 화면 스레드 밖에서 한다.
// 매장 기기(느린 CPU)에서 결과 화면이 멈추지 않게, 계산이 멈추면 화면 쪽이 워커째 끝낼 수 있게(garment-recolor.ts).

import { ImageSegmenter } from '@mediapipe/tasks-vision'
import { analyzeGarment, maskGarment, renderGarment, type GarmentState } from './garment-core'

const CLOTHES = 4

// MediaPipe 는 WASM 로더(일반 스크립트)를 importScripts 로 읽는다. 번들러가 이 워커를 일반 워커로 만들면 그대로 쓰고,
// 모듈 워커로 만들면(부르면 오류) 동기 요청으로 받아 전역에서 실행하는 대체품을 둔다. 로더는 화면 쪽이 미리 받아 둔 blob: 주소다.
let importScriptsWorks = true
try {
  importScripts()
} catch {
  importScriptsWorks = false
}
if (!importScriptsWorks) {
  ;(self as unknown as { importScripts: (...urls: string[]) => void }).importScripts = (...urls: string[]) => {
    for (const url of urls) {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, false)
      xhr.send()
      if (xhr.status !== 200 && xhr.status !== 0) throw new Error(`loader ${xhr.status}`)
      ;(0, eval)(xhr.responseText)
    }
  }
}

export type GarmentWorkerRequest =
  | { type: 'init'; id: number; loader: string; binary: string; model: Uint8Array }
  | { type: 'prepare'; id: number; key: number; width: number; height: number; pixels: ArrayBuffer; minCoverage: number }
  | { type: 'render'; id: number; key: number; hex: string }
  | { type: 'mask'; id: number; key: number }
  | { type: 'release'; id: number }

export type GarmentWorkerResponse =
  | { id: number; ok: true; coverage?: number; status?: 'ready' | 'no-garment'; blob?: Blob }
  | { id: number; ok: false; error: string }

let segmenter: ImageSegmenter | null = null
/** 지금 사진 한 장만 기억한다 */
let current: { key: number; state: GarmentState } | null = null

const reply = (message: GarmentWorkerResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message)

async function toPng(rgba: Uint8ClampedArray<ArrayBuffer>, w: number, h: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.putImageData(new ImageData(rgba, w, h), 0, 0)
  return canvas.convertToBlob({ type: 'image/png' })
}

self.onmessage = async (event: MessageEvent<GarmentWorkerRequest>) => {
  const m = event.data
  try {
    if (m.type === 'init') {
      if (!segmenter) {
        segmenter = await ImageSegmenter.createFromOptions(
          { wasmLoaderPath: m.loader, wasmBinaryPath: m.binary },
          // CPU 로만 — 오래된 GPU 에서 WebGL 준비가 멈추는 위험을 피한다(사진 한 장에 한 번이라 충분)
          { runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true, baseOptions: { modelAssetBuffer: m.model, delegate: 'CPU' } },
        )
      }
      reply({ id: m.id, ok: true })
    } else if (m.type === 'prepare') {
      if (!segmenter) throw new Error('not initialised')
      current = null
      const image = new ImageData(new Uint8ClampedArray(m.pixels), m.width, m.height)
      const result = segmenter.segment(image)
      const masks = result.confidenceMasks
      if (!masks || masks.length <= CLOTHES) {
        result.close?.()
        throw new Error('multiclass masks missing')
      }
      const mask = masks[CLOTHES]
      const clothesRaw = new Float32Array(mask.getAsFloat32Array())
      const mw = mask.width, mh = mask.height
      result.close?.()
      const state = analyzeGarment(image.data, m.width, m.height, clothesRaw, mw, mh)
      current = { key: m.key, state }
      reply({ id: m.id, ok: true, coverage: state.coverage, status: state.coverage < m.minCoverage ? 'no-garment' : 'ready' })
    } else if (m.type === 'render' || m.type === 'mask') {
      if (!current || current.key !== m.key) throw new Error('superseded')
      const { state } = current
      const rgba = m.type === 'render' ? renderGarment(state, m.hex) : maskGarment(state)
      reply({ id: m.id, ok: true, blob: await toPng(rgba, state.W, state.H) })
    } else if (m.type === 'release') {
      current = null
      reply({ id: m.id, ok: true })
    }
  } catch (error) {
    reply({ id: m.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
