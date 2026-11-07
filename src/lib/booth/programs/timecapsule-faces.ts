// ANSAN 얼굴 참고 사진 — 한 참고 사진에는 한 사람의 머리만 담는다.
// 머리 상자를 큰 정사각형으로 넓히면 옆 사람·안긴 아기 얼굴까지 들어가므로,
// 작은 여유만 둔 직사각형을 자르고 정사각형의 빈 곳은 중립색으로 채운다.
import sharp from 'sharp'

interface FaceReferencePerson {
  box: { x0: number; y0: number; x1: number; y1: number }
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

interface FaceCrop {
  rect: Rect
  masks: Rect[]
}

const BACKGROUND = '#e8e8e8'
const PADDING = 0.06
// 원본 픽셀 기준. 2048px 단체 사진의 정상적인 머리 크기는 통과시키면서,
// 32px도 안 되는 얼굴을 512px로 늘려 정체성 참고로 쓰는 경우만 막는다.
const MIN_HEAD_PIXELS = 32
// 머리카락·안긴 아기 때문에 상자가 조금 닿는 경우는 허용하되,
// 직사각 trim은 머리 면적과 각 방향의 90%를 남긴다. 작은 코너만 겹칠 때는
// 얼굴 중앙을 건드리지 않는 10% 이하 마스크로 불필요한 전체 잘림을 피한다.
const MIN_HEAD_RETAINED = 0.9
const MAX_EDGE_TRIM = 0.1

const width = (rect: Rect) => rect.right - rect.left
const height = (rect: Rect) => rect.bottom - rect.top
const area = (rect: Rect) => Math.max(0, width(rect)) * Math.max(0, height(rect))
const intersect = (a: Rect, b: Rect): Rect => ({
  left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom),
})

/** 참고 사진을 못 만든 이유 — 손님 안내(다시 촬영)에 쓴다. invalid 는 상자·사진 자체가 이상한 경우 */
export type FaceReferenceProblem = 'too-small' | 'overlap' | 'invalid'

function headRect(box: FaceReferencePerson['box'], imageWidth: number, imageHeight: number): Rect | 'invalid' | 'too-small' {
  const values = [box?.x0, box?.y0, box?.x1, box?.y1]
  if (!values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) return 'invalid'
  if (box.x1 <= box.x0 || box.y1 <= box.y0) return 'invalid'
  const rect = {
    left: Math.floor(box.x0 * imageWidth), top: Math.floor(box.y0 * imageHeight),
    right: Math.ceil(box.x1 * imageWidth), bottom: Math.ceil(box.y1 * imageHeight),
  }
  return width(rect) >= MIN_HEAD_PIXELS && height(rect) >= MIN_HEAD_PIXELS ? rect : 'too-small'
}

function keepsHead(candidate: Rect, head: Rect): boolean {
  const retained = intersect(candidate, head)
  return width(retained) >= MIN_HEAD_PIXELS && height(retained) >= MIN_HEAD_PIXELS
    && area(retained) >= area(head) * MIN_HEAD_RETAINED
    && candidate.left <= head.left + width(head) * MAX_EDGE_TRIM
    && candidate.right >= head.right - width(head) * MAX_EDGE_TRIM
    && candidate.top <= head.top + height(head) * MAX_EDGE_TRIM
    && candidate.bottom >= head.bottom - height(head) * MAX_EDGE_TRIM
}

function paddedRect(head: Rect, imageWidth: number, imageHeight: number): Rect {
  const padX = Math.round(width(head) * PADDING), padY = Math.round(height(head) * PADDING)
  return {
    left: Math.max(0, head.left - padX), top: Math.max(0, head.top - padY),
    right: Math.min(imageWidth, head.right + padX), bottom: Math.min(imageHeight, head.bottom + padY),
  }
}

/** 옆 사람 머리가 들어오면 그 방향의 여유부터 줄인다. 자기 머리를 크게 잘라야 하면 실패. */
function isolatedRect(head: Rect, others: Rect[], imageWidth: number, imageHeight: number): Rect | null {
  let crop = paddedRect(head, imageWidth, imageHeight)
  for (const other of others) {
    if (area(intersect(crop, other)) === 0) continue
    const candidates = [
      { ...crop, left: Math.max(crop.left, other.right) },
      { ...crop, right: Math.min(crop.right, other.left) },
      { ...crop, top: Math.max(crop.top, other.bottom) },
      { ...crop, bottom: Math.min(crop.bottom, other.top) },
    ].filter((candidate) => keepsHead(candidate, head))
      .sort((a, b) => area(b) - area(a))
    if (!candidates.length) return null
    crop = candidates[0]
  }
  return crop
}

/**
 * 안긴 아기처럼 코너만 겹치면 한 변 전체를 자르는 대신 이웃 머리 부분만 가린다.
 * 면적 합을 보수적으로 세고 눈·코·입이 있는 중앙은 가리지 않는다.
 */
function isolatedCrop(head: Rect, others: Rect[], imageWidth: number, imageHeight: number): FaceCrop | null {
  const trimmed = isolatedRect(head, others, imageWidth, imageHeight)
  if (trimmed) return { rect: trimmed, masks: [] }
  const rect = paddedRect(head, imageWidth, imageHeight)
  const masks = others.map((other) => intersect(rect, other)).filter((mask) => area(mask) > 0)
  const core = {
    left: head.left + width(head) * 0.2, right: head.left + width(head) * 0.8,
    top: head.top + height(head) * 0.2, bottom: head.top + height(head) * 0.85,
  }
  if (masks.some((mask) => area(intersect(mask, core)) > 0)) return null
  const removed = masks.reduce((sum, mask) => sum + area(intersect(mask, head)), 0)
  if (removed > area(head) * (1 - MIN_HEAD_RETAINED)) return null
  return { rect, masks }
}

/**
 * 원본 방향 보정 → 개인별 머리 직사각형 → 비율 유지 512×512 참고 사진.
 * 사람 순서는 입력 그대로. 하나라도 분리할 수 없거나 너무 작으면 전체 []:
 * 일부 참고만 보내면 IMAGE 번호와 사람이 어긋나기 때문이다.
 * 흐림의 임의 임계값은 쓰지 않는다(현장 조명·피부·안경에 따른 오탐 방지).
 */
export async function createFaceReferences(photo: string, people: readonly FaceReferencePerson[]): Promise<string[]> {
  return (await buildFaceReferences(photo, people)).faces
}

/** createFaceReferences 와 같고, 못 만들었으면 이유도 — 너무 작은 얼굴이 있으면 too-small, 이웃과 나눌 수 없으면 overlap */
export async function buildFaceReferences(photo: string, people: readonly FaceReferencePerson[]): Promise<{ faces: string[]; problem: FaceReferenceProblem | null }> {
  const fail = (problem: FaceReferenceProblem) => ({ faces: [] as string[], problem })
  if (!people.length || !/^data:image\/(jpeg|png|webp);base64,/.test(photo)) return fail('invalid')
  try {
    // 방향 적용 후의 동일한 픽셀에서 크기를 읽고 자른다. 중간 JPEG 재압축도 피한다.
    const { data, info } = await sharp(Buffer.from(photo.slice(photo.indexOf(',') + 1), 'base64'))
      .rotate().flatten({ background: BACKGROUND }).toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    const heads = people.map((person) => headRect(person?.box, info.width, info.height))
    if (heads.includes('too-small')) return fail('too-small')
    if (heads.includes('invalid')) return fail('invalid')
    const validHeads = heads as Rect[]
    const crops = validHeads.map((head, index) => isolatedCrop(head, validHeads.filter((_, other) => other !== index), info.width, info.height))
    if (crops.some((crop) => crop === null)) return fail('overlap')
    const faces = await Promise.all((crops as FaceCrop[]).map(async ({ rect: crop, masks }) => {
      let image = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .extract({ left: crop.left, top: crop.top, width: width(crop), height: height(crop) })
      if (masks.length) {
        const { data: masked, info: maskInfo } = await image.raw().toBuffer({ resolveWithObject: true })
        for (const mask of masks) {
          const left = mask.left - crop.left, right = mask.right - crop.left
          for (let y = mask.top - crop.top; y < mask.bottom - crop.top; y++) {
            // BACKGROUND=#e8e8e8, 모든 RGB 채널이 232. resize 전에 이웃 픽셀을 제거한다.
            masked.fill(232, (y * maskInfo.width + left) * maskInfo.channels, (y * maskInfo.width + right) * maskInfo.channels)
          }
        }
        image = sharp(masked, { raw: { width: maskInfo.width, height: maskInfo.height, channels: maskInfo.channels } })
      }
      const jpeg = await image
        .resize(512, 512, { fit: 'contain', background: BACKGROUND })
        .jpeg({ quality: 94 }).toBuffer()
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    }))
    return { faces, problem: null }
  } catch {
    return fail('invalid')
  }
}
