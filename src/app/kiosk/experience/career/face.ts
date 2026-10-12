// 관상(재미로 보는 인상 읽기) — 얼굴 특징점에서 여섯 가지 비율을 재고, 평균에서 가장 멀리 있는 셋을 그 사람의 '눈에 띄는 인상'으로 고른다.
// 능력이나 미래를 재는 것이 아니다: 옛 관상 풀이의 좋은 말만 붙여 재미로 보여 준다(문구는 text.ts 의 traits).
// 사진은 기기 안에서만 보고 올리지 않는다. 피부색·성별·나이는 보지 않는다 — 길이의 비율만 쓴다.

import { loadVision } from '../kx-vision'
import type { FaceTrait } from './data'

interface P { x: number; y: number }

export interface FaceReading {
  traits: FaceTrait[]
  /** 화면에 찍어 보일 특징점(사진 픽셀) — 얼굴 윤곽은 이어 그린다 */
  outline: P[]
  points: P[]
}

type Measure = 'forehead' | 'eye' | 'brow' | 'nose' | 'mouth' | 'jaw'
/** 비율의 [평균, 흩어진 정도] — 시험 얼굴 여섯으로 잡은 값(2026-10-13). 웃으면 입이 커지니 입은 넉넉하게 본다 */
const NORMS: Record<Measure, [number, number]> = { forehead: [0.194, 0.012], eye: [0.208, 0.01], brow: [0.132, 0.007], nose: [0.301, 0.016], mouth: [0.47, 0.05], jaw: [0.804, 0.018] }
/** [평균보다 클 때, 작을 때] */
const POLES: Record<Measure, [FaceTrait, FaceTrait]> = {
  forehead: ['forehead-wide', 'forehead-neat'], eye: ['eyes-big', 'eyes-calm'], brow: ['brow-open', 'brow-close'],
  nose: ['nose-long', 'nose-soft'], mouth: ['mouth-wide', 'mouth-neat'], jaw: ['jaw-firm', 'jaw-slim'],
}
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
const FEATURES = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300, 33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380, 168, 6, 197, 195, 5, 4, 98, 327, 2, 61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91]

/** 사진에서 얼굴 한 명의 인상 셋. 얼굴이 없으면 null */
export async function readFace(photo: HTMLCanvasElement): Promise<FaceReading | null> {
  const engine = await loadVision('face')
  const marks = engine.detect(photo).faceLandmarks[0]
  if (!marks) return null
  const pt = (index: number): P => ({ x: marks[index].x * photo.width, y: marks[index].y * photo.height })
  const span = (a: number, b: number) => Math.hypot(pt(a).x - pt(b).x, pt(a).y - pt(b).y)
  const width = span(234, 454), height = span(10, 152)
  const eye = (span(33, 133) + span(362, 263)) / 2
  const values: Record<Measure, number> = {
    forehead: span(10, 9) / height,
    eye: eye / width,
    brow: (span(105, 159) + span(334, 386)) / 2 / height,
    nose: span(168, 2) / height,
    mouth: span(61, 291) / width,
    jaw: span(172, 397) / width,
  }
  const ranked = (Object.keys(values) as Measure[])
    .map((key) => ({ key, z: (values[key] - NORMS[key][0]) / NORMS[key][1] }))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
  return { traits: ranked.slice(0, 3).map(({ key, z }) => POLES[key][z >= 0 ? 0 : 1]), outline: OVAL.map(pt), points: FEATURES.map(pt) }
}
