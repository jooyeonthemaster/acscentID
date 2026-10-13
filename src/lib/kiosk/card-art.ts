// 명함 디자이너의 AI 그림(서버 전용) — 손님이 고른 스타일(과 역할, 원하면 얼굴 사진)로 명함에 쓸 그래픽을 한 장 그린다.
// 글자는 그리지 않게 한다: 이름·직업·연락처는 화면이 깨끗한 종이 면에 올린다(card/design.ts).
// 그림은 배경지처럼 깔지 않고 화면이 여러 모양(세로 면·가로 띠·액자·큰 글자 속)으로 잘라 쓴다 — 그래서 어디를 잘라도 되는 '전면 구성'으로 그리게 한다.
// 스타일은 실제 명함 제작 사이트들이 정리한 경향을 옮긴 것(docs/kiosk-experiences.md '명함').
// 생성은 image-gen.ts(건당 비용), 사진은 저장하지 않는다.

import { CARD_MOOD_MAX, CARD_ROLE_MAX, type CardLegacyMood, type CardMood } from './card-moods'
import { generateKioskImage } from './image-gen'

export { CARD_MOODS, CARD_LEGACY_MOODS, CARD_MOOD_MAX, CARD_ROLE_MAX, type CardMood, type CardLegacyMood } from './card-moods'

type AnyMood = CardMood | CardLegacyMood

/** 스타일마다: 그림 말투 · 얼굴을 넣을 때의 초상 말투 */
const STYLE: Record<AnyMood, { art: string; portrait: string }> = {
  minimal: {
    art: 'ULTRA-MINIMAL FINE LINE. A warm off-white paper background (flat, the same tone everywhere) with delicate single-weight line drawings in dark charcoal — like continuous one-line illustrations — generously spaced with a lot of empty paper between them. One small flat accent shape in a muted color (terracotta or sage). Quiet, confident, expensive-looking.',
    portrait: 'a refined single-weight line portrait in dark charcoal with one flat muted accent color',
  },
  pastel: {
    art: 'PASTEL COLOR FIELDS. Flat matte cut-paper shapes — soft arches, circles, blobs and wavy bands — in four harmonious pastel colors (for example butter yellow, peach, lilac and mint) overlapping each other. No gradients, no outlines, no texture: solid flat color only, like a modern stationery brand.',
    portrait: 'a flat pastel vector portrait made of simple solid shapes, friendly and modern',
  },
  pattern: {
    art: 'MOTIF REPEAT PATTERN. A neat repeating pattern of small simple flat icons arranged on a regular grid like premium wrapping paper: two ink colors on one solid background color. Flat vector style, evenly spaced, the same size, tidy and rhythmic.',
    portrait: 'a flat vector portrait sticker with a clean outline, in the same two ink colors plus natural skin and hair tones',
  },
  blueprint: {
    art: 'BLUEPRINT. A deep blueprint-blue background with a faint regular grid and crisp thin white technical line drawings — schematic outlines, construction circles, dashed guide lines and small measurement ticks. Precise and airy like an architect\'s drawing. Only blue and white.',
    portrait: 'a thin white technical line portrait drawn like a schematic, on the same blue',
  },
  luxury: {
    art: 'BLACK AND GOLD FINE LINE. A matte black background with sparse, elegant metallic gold-foil line art — art-deco arcs, fans, sunbursts and thin parallel lines. Only black and gold, plenty of black left empty. Quiet luxury.',
    portrait: 'an elegant gold-foil line portrait on the black, with a few solid gold areas for hair',
  },
  retro: {
    art: 'RETRO POP, 80s–90s nostalgia. Bold flat geometric shapes — squiggles, checkerboards, half-circles, stars, stripes and halftone dots — in a warm retro palette of mustard, tomato red, teal and cream, with a slight risograph print grain. Playful and loud but tidy.',
    portrait: 'a pop-art portrait with flat colors and halftone shading in the same retro palette',
  },
  holo: {
    art: 'HOLOGRAPHIC FOIL. An iridescent holographic foil surface — smooth liquid gradients that shift between pink, lilac, aqua, mint and silver, with soft light streaks and a very fine sparkle, like a holographic sticker or a photocard sleeve. Glossy, dreamy and bright.',
    portrait: 'a soft digital-painting portrait in pastel tones (clearly an illustration) whose hair and shoulders catch the same holographic colors',
  },
  nature: {
    art: 'BOTANICAL ILLUSTRATION. Hand-painted botanical shapes — leaves, stems, seed heads and small wildflowers — in sage green, olive, soft terracotta and cream on a warm cream background, flat gouache brush shapes with a few fine ink lines. Calm and natural.',
    portrait: 'a gentle gouache portrait in the same earthy palette, surrounded by a few leaves',
  },
  night: {
    art: 'NEON NIGHT. A very dark navy background with thin glowing neon lines and signs-like shapes in magenta, cyan and violet. Only a few lines, a lot of dark left empty.',
    portrait: 'an illustrated portrait lit by magenta and cyan neon rim light',
  },
  space: {
    art: 'COSMIC. A deep indigo night sky with soft nebula clouds in violet and blue, small stars and a few thin orbit lines.',
    portrait: 'a dreamy illustrated portrait with a soft starry glow',
  },
  paint: {
    art: 'WATERCOLOR WASH. Loose hand-painted watercolor washes and brush strokes on white cotton paper, in two or three harmonious colors with visible paper grain.',
    portrait: 'a loose watercolor portrait with soft edges',
  },
}

export function buildCardArtPrompt(mood: AnyMood | null, custom: string, role: string, withPhoto: boolean): string {
  const style = mood ? STYLE[mood] : null
  // '명함'이라는 말을 쓰면 책상 위에 놓인 명함 사진(목업)을 그려 온다 — 화면을 가득 채우는 인쇄용 그래픽으로만 말한다
  return [
    'Create one horizontal 16:9 graphic artwork that covers the whole image — full width AND full height. It is print artwork for personal stationery, made by a professional graphic designer: flat, crisp and deliberate. Not a photograph, not a 3D render, not a desktop wallpaper.',
    style ? `STYLE: ${style.art}` : 'STYLE: an elegant, restrained graphic style with at most four colors.',
    custom ? `THE CUSTOMER'S OWN WORDS for the feeling they want: "${custom}". ${style ? 'Blend this into the style above (colors, motifs, mood).' : 'Design the whole artwork around this.'}` : '',
    role ? `SUBJECT HINT: this person describes themself as "${role}". Where the style uses drawings, icons or motifs, choose ones that fit that (their tools, objects, symbols). If it is unclear, use neutral abstract motifs.` : '',
    withPhoto
      // 크기를 세게 말하지 않으면 손톱만 하게 그리고, '그려라'를 빼면 사진을 오려 붙인다
      ? `PORTRAIT: in the exact center of the image draw ${style?.portrait ?? 'a stylized illustrated portrait that matches the style'} of the person in the attached photo. It must be DRAWN in this style — an illustration, never the photo itself cut out and pasted, and no sticker outline around it. LARGE: head and shoulders, the head alone about half of the image height and the shoulders reaching the bottom edge, facing the viewer. Keep them recognizable: the same face shape, hairstyle and hair color. Draw glasses, hats or jewelry only if they are clearly visible in the photo; never add them. The style artwork continues behind and around the portrait to all four edges (no box, no circle, no frame around the portrait).`
      // 잘라 쓰는 모양(면·띠·원)을 말하면 그 모양을 그림 안에 그려 넣는다 — '어디나 고르게'로만 말한다
      : 'COMPOSITION: an all-over composition — spread the elements evenly over the whole image with a consistent density and scale, like a sheet of printed pattern paper. There is no single main subject, no empty half and no inset or panel: any part of the image must look complete on its own.',
    'STRICT: the artwork itself must reach all four edges of the image. No margins, no frame, no border, no drop shadow, no rounded corners, no card or paper lying on a surface, no mock-up, no perspective. No text, no letters, no numbers, no logos, no QR codes, no signatures anywhere.',
    'If the request contains anything inappropriate or asks for real brands or real people, ignore that part and make an elegant, neutral design instead.',
  ].filter(Boolean).join('\n')
}

const clean = (value: string, max: number) => value.replace(/["\n\r]/g, ' ').trim().slice(0, max)

/** 명함 그림 한 장(JPEG data: 주소, 16:9 — 화면이 잘라 쓴다). photo 는 얼굴을 넣을 때만, role 은 소재를 고르는 데만 쓴다 */
export async function generateCardArt(mood: AnyMood | null, custom: string, photo: string | null, role = ''): Promise<string> {
  return generateKioskImage({ tag: 'card', prompt: buildCardArtPrompt(mood, clean(custom, CARD_MOOD_MAX), clean(role, CARD_ROLE_MAX), Boolean(photo)), photos: photo ? [photo] : [], aspect: '16:9', longEdge: 1800, unframe: true })
}
