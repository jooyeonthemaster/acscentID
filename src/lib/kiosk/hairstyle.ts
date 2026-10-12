// 버추얼 메이크업의 헤어 스타일 바꾸기(서버 전용) — 손님 사진에서 머리 모양만 바꾼 사진을 만든다.
// 얼굴·표정·옷·배경은 그대로 두라고 못 박는다. 생성은 image-gen.ts(건당 비용), 사진은 저장하지 않는다.

import type { HairStyle } from './hair-styles'
import { generateKioskImage } from './image-gen'

export { HAIR_STYLES, type HairStyle } from './hair-styles'

const STYLE_PROMPT: Record<HairStyle, string> = {
  bob: 'a neat chin-length bob cut with the ends curling softly inward',
  'long-wave': 'long hair falling below the shoulders in loose, soft waves',
  short: 'a short cropped cut, neat around the ears and the nape',
  ponytail: 'hair pulled back and tied in a high ponytail, forehead clear',
  bangs: 'the same length as now, with soft, wispy see-through bangs across the forehead',
  perm: 'a voluminous curly perm with well-defined curls',
}

export function buildHairPrompt(style: HairStyle): string {
  return [
    `Edit this photo: change ONLY the person's hairstyle to ${STYLE_PROMPT[style]}.`,
    'Keep everything else exactly as it is — the same person with an identical face, facial features, expression, skin and makeup, the same head position and pose, the same clothing, background, lighting, colors and framing. Do not beautify, slim or retouch the face.',
    'Keep the current hair color. The new hair must look natural and photorealistic, as if the same photo had been taken right after a visit to the hair salon.',
    'If there are several people, change only the hair of the person nearest the center.',
    'Do not add any text, logo, frame or watermark.',
  ].join('\n')
}

/** 머리 모양만 바꾼 사진(JPEG data: 주소). 사진은 data:image/jpeg|png|webp, 약 1.5MB 이하 */
export async function restyleHair(photo: string, style: HairStyle): Promise<string> {
  return generateKioskImage({ tag: 'hairstyle', prompt: buildHairPrompt(style), photos: [photo], aspect: '3:4', longEdge: 1280 })
}
