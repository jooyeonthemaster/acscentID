// 명함 디자이너의 AI 바탕 그림(서버 전용) — 손님이 고른 느낌(과 원하면 얼굴 사진)으로 명함 바탕을 한 장 그린다.
// 글자는 그리지 않게 한다: 이름·직업·연락처는 화면이 그 위에 또렷하게 올린다(card/design.ts).
// 생성은 image-gen.ts(건당 비용), 사진은 저장하지 않는다.

import { CARD_MOOD_MAX, type CardMood } from './card-moods'
import { generateKioskImage } from './image-gen'

export { CARD_MOODS, CARD_MOOD_MAX, type CardMood } from './card-moods'

const MOOD_PROMPT: Record<CardMood, string> = {
  minimal: 'clean, minimal and modern — soft neutral tones with a few subtle geometric shapes and generous empty space',
  pastel: 'a soft, dreamy pastel gradient with gentle clouds of color and light',
  nature: 'fresh botanical greenery — leaves, soft daylight, a calm natural feeling',
  night: 'a dark background with glowing neon lines and a late-night city mood',
  luxury: 'luxurious black with elegant gold-foil accents and a hint of marble texture',
  retro: 'retro pop art — bold shapes, halftone dots and an 80s color palette',
  space: 'a dreamy cosmic scene — nebula, stars, deep blue and violet',
  paint: 'a hand-painted watercolor wash with artistic brush strokes',
}

export function buildCardArtPrompt(mood: CardMood | null, custom: string, withPhoto: boolean): string {
  const feel = [mood ? MOOD_PROMPT[mood] : '', custom ? `the customer's own words for the feeling they want: "${custom}"` : ''].filter(Boolean).join('; plus ')
  // '명함'이라는 말을 쓰면 책상 위에 놓인 명함 사진(목업)을 그려 온다 — 화면을 가득 채우는 가로 그림으로만 말한다
  return [
    'Create a horizontal 16:9 illustration that covers the whole image — full width AND full height, with no empty bars above, below or beside it. It will be used as a background with text placed over its left side.',
    `MOOD: ${feel || MOOD_PROMPT.minimal}.`,
    withPhoto
      ? 'PORTRAIT: on the RIGHT third of the image, draw a stylized illustrated portrait of the person in the attached photo, in a style that matches the mood. Keep them recognizable — the same face shape, hairstyle and hair color. Draw glasses, hats or jewelry only if they are clearly visible in the photo; never add them. Head and shoulders only, fully inside the image, blending into the background (no box around the portrait).'
      : 'Put the visual interest toward the RIGHT side of the image.',
    'TEXT SPACE: keep the LEFT 55% of the image calm, even and uncluttered — low contrast and no busy detail there.',
    'STRICT: the artwork itself must reach all four edges of the image. No margins, no frame, no border, no drop shadow, no rounded corners, no card or paper lying on a surface, no mock-up, no perspective. No text, no letters, no numbers, no logos, no QR codes anywhere.',
    'If the requested feeling contains anything inappropriate or asks for real brands or real people, ignore that part and make an elegant, neutral design instead.',
  ].join('\n')
}

/** 명함 바탕 한 장(JPEG data: 주소, 16:9 — 화면이 9:5 로 잘라 쓴다). photo 는 얼굴을 넣을 때만 */
export async function generateCardArt(mood: CardMood | null, custom: string, photo: string | null): Promise<string> {
  const words = custom.replace(/["\n\r]/g, ' ').trim().slice(0, CARD_MOOD_MAX)
  return generateKioskImage({ tag: 'card', prompt: buildCardArtPrompt(mood, words, Boolean(photo)), photos: photo ? [photo] : [], aspect: '16:9', longEdge: 1800, unframe: true })
}
