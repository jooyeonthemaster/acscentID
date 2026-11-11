// 캐리커처 프롬프트 — 키오스크 DRAW!(caricature.ts)와 포토부스 DRAW!(src/lib/booth/programs/prompts.ts)가 같이 쓴다.
// 서버 전용 모듈에서만 부르지만 여기에는 생성 호출이 없다(키·모델은 각자: 키오스크 image-gen.ts, 부스 idol-generate.ts).
// 무엇을 어떻게 그릴지만 둔다 — 닮음·머리·착용물·말투 규칙은 두 기기에서 똑같아야 한다.

export const CARICATURE_STYLES = ['line', 'water', 'comic'] as const
export type CaricatureStyle = (typeof CARICATURE_STYLES)[number]
export const CARICATURE_LEVELS = ['soft', 'fun'] as const
export type CaricatureLevel = (typeof CARICATURE_LEVELS)[number]

export const isCaricatureStyle = (value: unknown): value is CaricatureStyle => (CARICATURE_STYLES as readonly unknown[]).includes(value)
export const isCaricatureLevel = (value: unknown): value is CaricatureLevel => (CARICATURE_LEVELS as readonly unknown[]).includes(value)

// 세 스타일은 한눈에 달라 보여야 한다 — 선화는 색이 전혀 없고, 수채화는 번지는 물감, 코믹은 굵은 선과 원색·망점
const STYLE_PROMPT: Record<CaricatureStyle, string> = {
  line: 'STYLE — INK LINE ART, STRICTLY BLACK AND WHITE: the whole image contains only black ink lines on plain white paper. Zero color anywhere — no skin tone, no hair color, no clothing color, no gray wash, no tinted paper. Only small solid-black accents (hair shadows, pupils) are allowed as fills. Confident contour lines with sparse cross-hatching, like a skilled street artist\'s quick pen sketch. If any color appears, the image is wrong.',
  water: 'STYLE — WATERCOLOR PAINTING: loose wet-on-wet watercolor with soft, bleeding edges, visible pigment blooms and paper grain, gentle pastel palette. Almost no outlines (only a few faint pencil marks). Abstract watercolor splashes behind the figure.',
  comic: 'STYLE — POP COMIC: bold thick black outlines, flat saturated colors with halftone-dot shading, strong highlights, and a bright colored burst panel with action lines behind the figure, like a comic-book cover.',
}

const LEVEL_PROMPT: Record<CaricatureLevel, string> = {
  soft: 'EXAGGERATION — SUBTLE: keep proportions close to the photo. Only a slightly larger head and eyes (about 10%), so it reads as a warm portrait sketch more than a caricature.',
  fun: 'EXAGGERATION — PLAYFUL: a clearly bigger head on a smaller body (head about 1.5× the natural proportion), a wider smile and brighter eyes, and the most charming distinctive features the person really has (their smile, dimples, the shape and volume of their hair) emphasized. Exaggerate proportions only — never restyle anything.',
}

/** 머리 모양은 닮음의 큰 부분인데 모델이 자주 바꿔 그린다(앞머리를 만들거나 길이를 줄인다) — 따로 한 문단으로 못 박는다 */
const HAIR_PROMPT = 'HAIR — reproduce each person\'s hair exactly as in the photo: the same length (where it ends: ears, chin, shoulders, chest), the same volume and texture (straight, wavy, curly, coily), the same parting, the same fringe (bangs or no bangs), tied up or worn down exactly as shown, and the same color including dyed tones, roots and highlights. Hats, hairbands and hair clips stay. Do not tidy, shorten, lengthen or restyle the hair.'

/** 없는 안경을 씌워 그리는 일이 있었다(안경을 예로 들자 모두에게 씌웠다) — 있는 것만, 없는 것은 더하지 않게 */
const WEAR_PROMPT = 'WORN ITEMS — draw glasses, hats, earrings, necklaces, piercings and facial hair ONLY if they are clearly visible on that person in the photo, and then exactly as they are. Never add glasses or any accessory that is not in the photo.'

/**
 * 그림 비율 — 키오스크는 세로 3:4(혼자) · 가로 4:3(여럿), 포토부스는 4×6 인화지에 맞춰 세로 2:3 · 가로 3:2.
 * 이미지 모델에 주는 비율(aspect_ratio)과 같아야 한다.
 */
export interface CaricatureFrame {
  tall: string
  wide: string
}
export const KIOSK_CARICATURE_FRAME: CaricatureFrame = { tall: '3:4', wide: '4:3' }

export function buildCaricaturePrompt(style: CaricatureStyle, level: CaricatureLevel, group = false, frame: CaricatureFrame = KIOSK_CARICATURE_FRAME): string {
  return [
    group
      ? 'Redraw the group of people in this photo as one hand-drawn group caricature.'
      : 'Redraw the person in this photo as a hand-drawn caricature portrait.',
    group
      ? 'PEOPLE — count the people in the photo first, then draw EVERY one of them: the same number of people, in the same left-to-right order and the same relative positions and heights. Do not drop, merge, duplicate or invent anyone. Each person must be individually recognizable — treat each face separately (face shape, eyes, eyebrows, nose, smile), and keep each person\'s own clothing colors. Give every person the same level of care and the same amount of exaggeration; nobody is a background figure.'
      : 'LIKENESS — the person must stay clearly recognizable: keep their face shape, eyes, eyebrows, nose, smile, expression, and clothing colors from the photo. If more than one person is in the photo, draw every one of them.',
    HAIR_PROMPT,
    WEAR_PROMPT,
    STYLE_PROMPT[style],
    LEVEL_PROMPT[level],
    'TONE: kind and flattering, the way a friendly artist would draw a guest. Never mocking. Do not exaggerate skin tone, ethnicity-related features, body weight, age, blemishes or anything that could feel insulting.',
    group
      ? `COMPOSITION: horizontal ${frame.wide} picture. The group fills most of the picture: everyone from the chest up, side by side as in the photo, all heads fully inside the frame with only a little space above, nobody cropped at the edges. Clean off-white paper background (plus the style's own backdrop, if any). No photo background, no frame, no border.`
      : `COMPOSITION: vertical ${frame.tall} bust portrait that fills most of the picture — the head (with all of its hair) about half the image height, shoulders reaching the bottom edge, only a little space above the hair. Clean off-white paper background (plus the style's own backdrop, if any). No photo background, no frame, no border.`,
    'Do not write any text, letters, signature, logo or watermark anywhere in the image.',
  ].join('\n')
}
