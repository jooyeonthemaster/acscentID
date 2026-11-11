// 키오스크 캐리커처(서버 전용) — 손님이 찍은 한 컷 + 스타일·과장 정도 → 같은 사람의 손그림 캐리커처.
// 생성(키·모델·상한)은 image-gen.ts 가 맡는다. 무엇을 어떻게 그릴지(프롬프트)는 포토부스 DRAW! 와 같이 쓰는 caricature-prompt.ts 에 있다.

import { generateKioskImage } from './image-gen'
import { buildCaricaturePrompt, type CaricatureLevel, type CaricatureStyle } from './caricature-prompt'

export { CARICATURE_LEVELS, CARICATURE_STYLES, buildCaricaturePrompt, type CaricatureLevel, type CaricatureStyle } from './caricature-prompt'

/** 캐리커처 한 장(JPEG data: 주소). 사진은 data:image/jpeg|png|webp, 약 1.5MB 이하. group: 여럿이 함께 찍은 가로 사진 */
export async function generateCaricature(photo: string, style: CaricatureStyle, level: CaricatureLevel, group = false): Promise<string> {
  return generateKioskImage({ tag: 'caricature', prompt: buildCaricaturePrompt(style, level, group), photos: [photo], aspect: group ? '4:3' : '3:4' })
}
