// 체험 6종의 이미지 합성 지시문 — 손님 사진을 참고로 새 사진·그림을 만든다(스타 무드 화보 · 오라 사진 · 문화유산 타임머신 ·
// 커플/팀 포스터 · 코디 룩북). 생성은 lib/kiosk/image-gen.ts(장당 약 $0.04, 분·하루 상한)가 맡는다.
// 이 파일은 요청 검사와 지시문만(시험 가능). 이미지 모델이 그림 안에 글자를 그리지 않도록, 사람을 바꾸지 않도록 매번 같은 원칙을 붙인다.

import { colorFamily, colorName, hexToLab } from './photo'
import { HOME_SCENES, HOME_STYLES, type HomeScene, type HomeStyle } from './housing'
import type { ExpansionId } from './types'

export const IMAGE_MODES = ['lookalike', 'aura', 'heritage', 'couple', 'team', 'coord', 'housing-home'] as const
export type ImageMode = (typeof IMAGE_MODES)[number]
export const isImageMode = (id: string): id is ImageMode => (IMAGE_MODES as readonly string[]).includes(id)

export type ImageParams =
  | { id: 'lookalike'; mood: 'soft' | 'chic' | 'bright' }
  | { id: 'aura'; colors: string[] }
  | { id: 'heritage'; scene: 'court' | 'pond'; era: 'past' | 'present'; light: 'day' | 'dusk' | 'night' }
  | { id: 'couple' | 'team'; activity: PosterScene; count: number }
  | { id: 'coord'; pieces: string[]; colors: string[] }
  | { id: 'housing-home'; scene: HomeScene; style: HomeStyle }

/** 결과 화면·카드·영수증에 붙는 그림 이름 */
export const IMAGE_LABEL: Record<ImageMode, string> = { lookalike: '스타 무드 화보', aura: '오라 컬러 사진', heritage: '타임머신 사진', couple: '두 사람의 포스터', team: '우리 팀 포스터', coord: '오늘의 코디 룩북', 'housing-home': '2036 우리 집 캐리커처' }
export const IMAGE_WAIT: Record<ImageMode, string> = { lookalike: '스타 무드 화보를 찍고 있어요', aura: '오라 컬러를 사진에 입히고 있어요', heritage: '타임머신을 타고 궁궐로 가고 있어요', couple: '두 사람의 포스터를 그리고 있어요', team: '우리 팀 포스터를 그리고 있어요', coord: '추천 코디를 입혀 보고 있어요', 'housing-home': '10년 뒤 우리 집에 나를 그리고 있어요' }

/**
 * 포스터 장면 — 관심사(INTERESTS 의 id)마다 정해 둔 영어 장면. 한국어 활동 이름을 그대로 넣었더니 그림 안에 글자로 써 넣고
 * ('우리 팀 간식 지도'), 거리 장면에는 간판·지나가는 사람을 그렸다(2026-10-14 실호출) — 글자·군중이 없는 장면만 고른다
 */
export const POSTER_SCENES = {
  food: 'sharing homemade snacks and tea around a small table at home',
  art: 'making a colorful paper collage together at a big wooden table',
  nature: 'having a picnic on a blanket in a quiet, empty sunny park',
  games: 'playing a cooperative board game with blank colorful tiles at a table',
  learning: 'teaching each other a simple craft at a table full of tools and yarn',
  music: 'listening to music together around a record player with headphones',
} as const
export type PosterScene = keyof typeof POSTER_SCENES
const HEX = /^#[0-9a-f]{6}$/i
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f"`“”]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''

/** 요청 본문(id 와 params) 검사 — 틀리면 null */
export function readImageParams(id: string, raw: unknown): ImageParams | null {
  if (!isImageMode(id) || !raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const colors = (max: number) => Array.isArray(p.colors) ? p.colors.filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, max) : []
  switch (id) {
    case 'lookalike': return ['soft', 'chic', 'bright'].includes(String(p.mood)) ? { id, mood: p.mood as 'soft' | 'chic' | 'bright' } : null
    case 'aura': { const c = colors(3); return c.length ? { id, colors: c } : null }
    case 'heritage': return ['court', 'pond'].includes(String(p.scene)) && ['past', 'present'].includes(String(p.era)) && ['day', 'dusk', 'night'].includes(String(p.light)) ? { id, scene: p.scene as 'court' | 'pond', era: p.era as 'past' | 'present', light: p.light as 'day' | 'dusk' | 'night' } : null
    case 'couple': case 'team': { const activity = String(p.activity); const count = Number(p.count); return activity in POSTER_SCENES && Number.isInteger(count) && count >= 2 && count <= 6 ? { id, activity: activity as PosterScene, count } : null }
    case 'coord': { const pieces = Array.isArray(p.pieces) ? p.pieces.map((x) => clean(x, 48)).filter(Boolean).slice(0, 6) : []; return pieces.length >= 2 ? { id, pieces, colors: colors(3) } : null }
    case 'housing-home': return String(p.scene) in HOME_SCENES && String(p.style) in HOME_STYLES ? { id, scene: p.scene as HomeScene, style: p.style as HomeStyle } : null
  }
}

/**
 * 모든 합성에 붙는 원칙 — 사람을 바꾸지 않고, 연예인처럼 만들지 않고, 글자를 그리지 않는다.
 * 2026-10-14 실호출로 고친 것: 포스터 배경에 지나가는 작은 사람들을 그려 넣었다(→ 배경까지 아무도 더하지 말 것),
 * 오라는 색을 '크게'라고 하지 않으면 얼굴 둘레에 옅은 얼룩만 생겼다.
 */
const KEEP = 'Use the attached photo as the only reference for the real person(s) in it. Keep every person\'s face, facial features, skin tone, hairstyle, glasses and apparent age exactly as in the photo so they are clearly recognizable — do not beautify, slim, de-age, change ethnicity or make anyone look like a celebrity. Do not add any text, letters, numbers, logos, watermarks, borders or frames anywhere in the image.'
const MOOD: Record<'soft' | 'chic' | 'bright', string> = {
  soft: 'a bright, airy magazine portrait in a calm and comfortable mood: soft diffused window light, ivory and oatmeal tones, cozy natural-fabric styling, a relaxed gentle expression',
  chic: 'a refined, high-contrast fashion editorial portrait: moody side light, a deep plain backdrop, sleek dark single-color styling with clean lines, a composed confident expression',
  bright: 'a bright, upbeat pop editorial portrait: even high-key lighting, a cheerful clean colored backdrop, fresh accent-color styling, a lively natural smile',
}
const SCENE = { court: 'the open stone-paved courtyard of a traditional Korean palace, with a wooden hall and gently curved tiled roof behind', pond: 'a traditional Korean wooden pavilion beside a calm lotus pond, its roof reflected in the water' }
const ERA = { past: 'in the Joseon era, wearing an elegant traditional Korean hanbok fitting a palace visitor, with paper lanterns and no modern objects anywhere', present: 'today, as a visitor in their own clothes from the photo, with a tidy visitor path' }
const LIGHT = { day: 'in clear daylight', dusk: 'in a warm sunset glow', night: 'on a quiet moonlit night lit by warm lanterns' }
/**
 * 2036 우리 집의 나(주거복지대전) — 장면은 글자·간판·다른 사람이 없게(포스터에서 배운 것), 선화는 감열지 영수증에 또렷하도록 색 없이.
 * 캐리커처 원칙(lib/kiosk/caricature.ts)처럼 닮음·머리 모양을 지키고 놀리지 않는다.
 */
const HOME_SCENE_PROMPT: Record<HomeScene, string> = {
  smart: 'a bright, cozy future smart-home living room in 2036: soft voice-controlled ceiling lights, a small friendly rounded home-helper robot beside the sofa, large windows with plants, warm wood and fabric furniture',
  share: 'the shared courtyard garden of a future co-living house in 2036 where several generations live together: raised vegetable beds, a long wooden bench, string lights and a shared outdoor table — but nobody else in the picture',
  care: 'a warm, barrier-free future home in 2036 designed for every age: no door thresholds, wide doorways, sturdy handrails along the hallway, a comfortable reading chair by the window and soft safe lighting',
  youth: 'a compact, smartly designed future studio apartment for a young person in 2036: a loft bed with a ladder, a tidy desk by a big window with a city view, foldable furniture and plants',
}
const HOME_STYLE_PROMPT: Record<HomeStyle, string> = {
  line: 'STYLE — INK LINE ART, STRICTLY BLACK AND WHITE: only black ink lines on plain white paper, zero color and no gray wash; confident contour lines with sparse hatching, like a skilled illustrator\'s pen drawing. It will be printed on a thermal receipt, so keep lines clean and bold and leave plenty of white space.',
  color: 'STYLE — SOFT WATERCOLOR ILLUSTRATION: warm pastel watercolor with gentle ink outlines, visible paper texture, cozy and hopeful mood.',
}

const named = (hexes: string[]) => hexes.map((h) => `${colorName(colorFamily(hexToLab(h)))}(${h})`).join(', ')

/** 지시문과 비율 */
export function buildImagePrompt(params: ImageParams): { prompt: string; aspect: '3:4' | '4:3' } {
  switch (params.id) {
    case 'lookalike': return { aspect: '3:4', prompt: `Create a professional photo-shoot portrait of the person in the photo, styled as ${MOOD[params.mood]}. Restyle the clothes, lighting and background to fit this mood, framed from the chest up, photorealistic, 3:4 portrait. ${KEEP}` }
    case 'aura': return { aspect: '3:4', prompt: `Create an aura photograph of the person in the photo: keep the person, their clothes and pose as photographed, replace the background with deep dark tones, and surround the whole upper body with a large, vivid aura of glowing colored light that fills much of the frame, blending these colors: ${named(params.colors)} — like a vintage instant-film aura camera print with gentle grain and light leaks. Photorealistic, 3:4 portrait. ${KEEP}` }
    case 'heritage': return { aspect: '3:4', prompt: `Create a "time machine" souvenir photo: the person from the photo standing in ${SCENE[params.scene]}, ${ERA[params.era]}, ${LIGHT[params.light]}. Frame the person from the knees up, clearly visible in the scene, with lighting that matches the scene. Photorealistic, 3:4 portrait. This is a generic concept scene, not a specific real landmark. ${KEEP}` }
    case 'couple': case 'team': return { aspect: '4:3', prompt: `Create a warm, playful illustrated poster of ${params.count === 2 ? 'the two people' : `all ${params.count} people`} in the photo ${POSTER_SCENES[params.activity]}. Draw each person with their recognizable face, hairstyle and outfit colors in a friendly flat illustration style with soft paper texture and a cozy background. Everyone in the photo appears exactly once, and nobody else appears anywhere — not even small figures in the background. Absolutely no writing of any kind: no signs, labels, menus, book titles or letters on any object. 4:3 landscape. ${KEEP}` }
    case 'housing-home': return { aspect: '3:4', prompt: `Draw a friendly hand-drawn caricature of the person in the photo living happily in ${HOME_SCENE_PROMPT[params.scene]}. The person is the clear main subject, shown from the waist up in the front half of the picture (head about a quarter of the image height), with a slightly larger head and a warm natural smile (a gentle caricature, never mocking); the home scene fills the background. LIKENESS — keep their face shape, eyes, eyebrows, nose, smile, the exact hair length, fringe and color, glasses only if worn, and their clothing colors. ${HOME_STYLE_PROMPT[params.style]} Vertical 3:4. Nobody else appears anywhere — no other people, no figures in windows or photos. ${KEEP}` }
    case 'coord': return { aspect: '3:4', prompt: `Create a fashion lookbook photo of the person in the photo wearing this outfit: ${params.pieces.join('; ')}${params.colors.length ? `, in a palette of ${named(params.colors)}` : ''}. Show the whole outfit from head to shoes, standing naturally in a plain light studio with soft even light, photorealistic, 3:4 portrait. Change only the clothes, shoes and bag; keep the head exactly as photographed. ${KEEP}` }
  }
}

/** 이미지 합성을 쓰는 체험인가 */
export const usesImage = (id: ExpansionId): id is ImageMode => isImageMode(id)
