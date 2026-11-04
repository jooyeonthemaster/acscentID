'use client'

// 체험 18종 — 찍은 사진 한 장을 기기 안에서 읽는다(MediaPipe: 얼굴·표정, 손, 옷 분할). 사진은 계산용 캔버스로만 쓰고 끝나면 비운다.
// 무엇을 읽고 무엇을 읽지 않는지는 lib/kiosk/expansion/photo.ts 머리말.

import { dominantColors, faceSignal, handAngles, handSignal, rgbToLab, sceneLight, type FaceSignal, type HandSignal, type PhotoPlan, type PhotoReading, type Swatch } from '@/lib/kiosk/expansion/photo'
import { loadVision, photoCanvas } from '../kx-vision'

export type PhotoProblem = 'no-face' | 'no-hand' | 'need-two' | 'tool'
export class PhotoReadError extends Error {
  constructor(readonly problem: PhotoProblem) { super(problem); this.name = 'PhotoReadError' }
}

function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms) })]).finally(() => clearTimeout(timer))
}

/** 얼굴·손 도구는 체험의 중심이라 기다린다(처음엔 받는 시간이 걸린다). 옷 분할 도구(16MB)가 늦으면 옷 색 없이 가고, 그렇다고 화면에 알린다 */
const CORE_WAIT = 45_000
const OUTFIT_WAIT = 20_000
/** 옷 색 계산에 쓰는 픽셀 상한 — 느린 매장 PC 에서도 한순간에 끝나게 */
const MAX_PIXELS = 9000

/** 이 사진의 빛 — 분할 결과가 없으면 사진 전체로 */
function wholeScene(px: Uint8ClampedArray): PhotoReading['scene'] {
  const lab: number[] = []
  const step = Math.max(1, Math.floor(px.length / 4 / MAX_PIXELS))
  for (let i = 0; i < px.length / 4; i += step) lab.push(...rgbToLab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]))
  return sceneLight(lab)
}

export async function readPhoto(photo: string, plan: PhotoPlan): Promise<PhotoReading> {
  const canvas = await photoCanvas(photo, 960)
  const small = document.createElement('canvas')
  try {
    const aspect = canvas.width / canvas.height
    let faces: FaceSignal[] = []
    let hand: HandSignal | null = null
    if (plan.subject === 'hand') {
      const engine = await within(loadVision('hand'), CORE_WAIT).catch(() => { throw new PhotoReadError('tool') })
      const found = engine.detect(canvas)
      if (!found.landmarks.length) throw new PhotoReadError('no-hand')
      hand = handSignal(found.landmarks[0], aspect)
      // 개발 서버에서만 — 손 모양 문턱값을 맞출 때 쓰는 각도(사진은 남기지 않는다)
      if (process.env.NODE_ENV !== 'production') console.info('[kiosk] 손 모양', JSON.stringify(handAngles(found.landmarks[0], aspect)))
    } else {
      const engine = await within(loadVision('faces'), CORE_WAIT).catch(() => { throw new PhotoReadError('tool') })
      const found = engine.detect(canvas)
      faces = found.faceLandmarks
        .map((marks, i) => faceSignal(marks, Object.fromEntries((found.faceBlendshapes?.[i]?.categories ?? []).map((c) => [c.categoryName, c.score])), aspect))
        // 뒤로 지나가는 사람·포스터 속 얼굴처럼 아주 작은 얼굴은 뺀다
        .filter((face) => face.size >= 0.07)
        .sort((p, q) => q.size - p.size)
      if (!faces.length) throw new PhotoReadError('no-face')
      if (plan.subject !== 'face' && faces.length < 2) throw new PhotoReadError('need-two')
      if (plan.subject === 'pair') faces = faces.slice(0, 2)
    }

    // 옷 색 · 빛 — 작게 줄인 사진에서(분할 모델은 어차피 256 으로 줄여 본다)
    const scale = Math.min(1, 320 / Math.max(canvas.width, canvas.height))
    small.width = Math.round(canvas.width * scale)
    small.height = Math.round(canvas.height * scale)
    const ctx = small.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(canvas, 0, 0, small.width, small.height)
    const pixels = ctx.getImageData(0, 0, small.width, small.height).data
    let outfit: Swatch[] = []
    let outfitMissing = false
    let scene: PhotoReading['scene'] | null = null
    if (plan.outfit) {
      try {
        const segmenter = await within(loadVision('hair'), OUTFIT_WAIT)
        const result = segmenter.segment(small)
        try {
          // 0 배경 · 1 머리카락 · 2 몸 피부 · 3 얼굴 피부 · 4 옷 · 5 그 밖(액세서리)
          const clothes = result.confidenceMasks?.[4], background = result.confidenceMasks?.[0]
          if (!clothes || !background) throw new Error('분할 결과가 없습니다')
          const mw = clothes.width, mh = clothes.height
          let px = pixels
          if (mw !== small.width || mh !== small.height) {
            const fit = document.createElement('canvas')
            fit.width = mw
            fit.height = mh
            const fctx = fit.getContext('2d', { willReadFrequently: true })!
            fctx.drawImage(small, 0, 0, mw, mh)
            px = fctx.getImageData(0, 0, mw, mh).data
            fit.width = fit.height = 0
          }
          const wearing = clothes.getAsFloat32Array(), behind = background.getAsFloat32Array()
          const step = Math.max(1, Math.floor((mw * mh) / MAX_PIXELS))
          const wear: number[] = [], back: number[] = []
          for (let i = 0; i < mw * mh; i += step) {
            const target = wearing[i] > 0.6 ? wear : behind[i] > 0.7 ? back : null
            if (target) target.push(...rgbToLab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]))
          }
          outfit = dominantColors(wear)
          if (back.length >= 300 * 3) scene = sceneLight(back)
        } finally { result.close() }
      } catch (error) {
        console.warn('[kiosk] 옷 색을 읽지 못했습니다:', error)
        outfitMissing = true
      }
    }
    const made = { subject: plan.subject, faces, hand, outfit, outfitMissing, scene: scene ?? wholeScene(pixels) }
    if (process.env.NODE_ENV !== 'production') console.info('[kiosk] 사진에서 읽은 값', JSON.stringify(made))
    return made
  } finally {
    canvas.width = canvas.height = 0
    small.width = small.height = 0
  }
}
