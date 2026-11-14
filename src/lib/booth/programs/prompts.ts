// 포토부스 프로그램 생성 프롬프트(서버 전용) — 프로그램마다 따로. 아이돌 메이크업만 기존 AI 아이돌 프롬프트(idol-concepts.ts)를 그대로 쓴다.
// 공통 원칙은 AI 아이돌과 같다: '새 사진'이 아니라 '이 사진을 고쳐라'로 말하고 얼굴(정체성)을 가장 먼저 못 박는다.
// 글자·로고·실존 인물 닮게·노출 의상은 넣지 않는다. 화면에서 온 문장은 쓰지 않고 옵션 id 로 catalog 의 조각을 찾는다.

import { buildIdolPrompt, findIdolConcept } from '../idol-concepts'
import type { BoothImageOptions } from '../idol-generate'
import { buildCaricaturePrompt, isCaricatureLevel, isCaricatureStyle, type CaricatureFrame } from '@/lib/kiosk/caricature-prompt'
import { optionOf, type ProgramDef } from './catalog'

/** DRAW! 캐리커처 — 4×6 인화지에 맞춘 비율(혼자 세로 2:3 · 여럿 가로 3:2). programImageOptions 의 aspectRatio 와 같다 */
const BOOTH_CARICATURE_FRAME: CaricatureFrame = { tall: '2:3', wide: '3:2' }

/** 여럿이 찍은 사진인가 — 부스가 센 얼굴 수(못 세면 0 또는 -1 → 혼자로 그린다. 혼자 프롬프트도 '여럿이면 모두 그려라'를 담고 있다) */
const isGroupShot = (faces: number | undefined) => typeof faces === 'number' && faces >= 2

/**
 * 프로그램별 생성 모양 — 기본은 인화 원판(세로 2:3, 첫 모델 60초 → 빠른 예비 모델).
 * DRAW! 를 여럿이 찍으면 가로 3:2 로 그리고, AI 아이돌 단체처럼 같은 모델로 한 번 더(작은 모델은 여러 얼굴을 한꺼번에 지키기 어렵다)
 */
export function programImageOptions(program: ProgramDef, faces?: number): BoothImageOptions {
  if (program.id === 'caricature' && isGroupShot(faces)) return { aspectRatio: '3:2', retryModel: 'primary', timeouts: [60_000, 50_000] }
  return {}
}

const NO_TEXT = 'DO NOT add any text, captions, logos, watermarks or signatures, and no readable letters or numbers anywhere in the image. Do not make anyone resemble a real celebrity. Clothing is modest and age-appropriate.\nGLASSES: anyone wearing glasses in IMAGE 1 keeps the very same glasses on (same frame shape and color) — never remove or add glasses.'

function identity(people: number, inputs: number): string {
  const many = people > 1
  return [
    inputs > 1
      ? `IMAGE 1 and IMAGE 2 are photos of two different real adults (person A and person B).`
      : `IMAGE 1 is a photo of ${many ? `${people} real people` : 'a real person'}.`,
    'IDENTITY LOCK — the most important rule:',
    `- Preserve ${many ? "every person's" : "the person's"} real face exactly: face shape, eyes and eyelids, brows, nose, lips, jawline, moles and marks, skin tone, ethnicity, age and gender presentation.`,
    '- They must be instantly recognizable as themselves. Do not beautify, swap or regenerate the face, enlarge the eyes, change the nose or lips, or lighten/darken the skin.',
    `- Keep ${many ? "each person's" : 'their'} own hairstyle and hair color (only neatly styled).`,
    ...(many ? ['- Show both people together in ONE scene; never drop, merge or blend their faces.'] : []),
  ].join('\n')
}

/** 혼자도 여럿도 — 찍힌 사람 수 그대로(입주 기념사진). keepClothes=false 면 옷은 프로그램이 정한 옷으로(펀그라운드 QUEST! · MVP!) */
function identityGroup(keepClothes = true): string {
  return [
    'IMAGE 1 is a photo of one or more real people. Count them and keep EXACTLY that many people — never add, remove, duplicate or merge anyone.',
    'IDENTITY LOCK — the most important rule:',
    "- Preserve every person's real face exactly: face shape, eyes and eyelids, brows, nose, lips, jawline, moles and marks, skin tone, ethnicity, age and gender presentation. Children stay children.",
    '- Everyone must be instantly recognizable as themselves. Do not beautify, swap or regenerate faces, enlarge the eyes, change the nose or lips, or lighten/darken the skin.',
    keepClothes
      ? "- Keep each person's own hairstyle, hair color and glasses; keep their own clothes (only neatened)."
      : "- Keep each person's own hairstyle, hair color and glasses. Only the clothes and the background change.",
    '- Keep their relative positions from the photo, all faces clearly visible and similar in size.',
  ].join('\n')
}

/**
 * 펀그라운드 별내(9~19세 공공시설) 데모 — 아이 · 청소년을 어른처럼 만들지 않게, 안경을 벗기지 않게(2026-11-14 Seedream 아이돌 메이크업 시험에서 안경이 빠졌다).
 * 생성 서버가 펀그라운드 생성(site=funground)일 때만 프롬프트 끝에 붙인다. 위 photo() 의 'realistic adult body proportions' 보다 우선한다고 밝힌다.
 */
const GLASSES_RULE = 'GLASSES: anyone wearing glasses in IMAGE 1 keeps the very same glasses on (same frame shape and color) — never remove or add glasses.'
export const FUNGROUND_RULES = `AGE RULE (overrides anything above): many guests are children or teenagers aged 9 to 19. Keep every person exactly their real age with the natural body proportions of that age — never make anyone look older, taller or more mature. Keep any makeup light and youthful for children and teenagers. Clothing is modest and age-appropriate.\n${GLASSES_RULE}`
/**
 * 나이 들기 프로그램(타임캡슐) — 위 나이 규칙 대신: 요청한 햇수만큼만 자연스럽게, 그 밖의 얼굴 특징 · 안경은 그대로.
 * 2026-11-14 가상 어린이 시험(Gemini 3 Pro): 아이는 목표보다 덜 자란다(+10년에 +4~5, 7세 +20년에 20세). 「지금 나이를 어림하고 예를 든」 규칙으로
 * 바꾸면 남자아이는 제 나이만큼 자랐지만 얼굴 유사도가 떨어졌고(0.75 → 0.51), 어린 여자아이는 어느 쪽이든 12세쯤에 머물렀다 —
 * 아이 얼굴 유사도를 우선해(메모 booth-ai-photo-quality-over-cost) 이 규칙을 그대로 둔다.
 */
const FUNGROUND_AGING_RULES = `AGE RULE (overrides anything above): many guests are children or teenagers. Age each person by exactly the requested number of years from their real current age (a 12-year-old in 10 years looks about 22), naturally and kindly, keeping them clearly recognizable. Clothing is modest and appropriate.\n${GLASSES_RULE}`
/** 펀그라운드 생성에 붙이는 규칙 — 프로그램에 맞게 */
export const fungroundRules = (programId: string) => (programId === 'timecapsule' ? FUNGROUND_AGING_RULES : FUNGROUND_RULES)

const photo = (framing: string) =>
  `PHOTOGRAPHY: professional quality, sharp focus on the eyes, light natural retouching that keeps skin texture, realistic adult body proportions, vertical 2:3 image that fills the entire frame edge to edge (no borders, frames, split panels or collage), ${framing}.`

const pick = (program: ProgramDef, choices: Record<string, string>, group: string) => optionOf(program, group, choices[group])?.prompt ?? ''

/** 프로그램 · 고른 옵션 · 넣는 사진 수 · (여럿 프로그램이면) 부스가 센 얼굴 수 → 생성 프롬프트 */
export function buildProgramPrompt(program: ProgramDef, choices: Record<string, string>, inputs: number, faces?: number): string {
  const people = program.capture.people
  const c = (group: string) => pick(program, choices, group)
  switch (program.id) {
    case 'idol-makeup': {
      const concept = findIdolConcept(choices.concept)
      if (!concept) throw new Error('unknown idol concept')
      return `${buildIdolPrompt(concept, 1, 0)}\n\nMAKEUP INTENSITY: ${c('intensity')}`
    }
    case 'runway':
      return [
        `EDIT IMAGE 1 into a high-fashion runway photo of the SAME real person, full-length or knee-up, confident walking pose.`,
        identity(people, inputs), '',
        `OUTFIT: ${c('look')}.`, `SCENE: ${c('stage')}.`,
        photo('fashion-week editorial photography with dramatic spotlights, the face clearly visible in the upper part of the frame'), NO_TEXT,
      ].join('\n')
    case 'fashion-time':
      return [
        `EDIT IMAGE 1 into a fashion photo of the SAME real person as if taken in a past decade.`,
        identity(people, inputs), '',
        `ERA STYLING (hair finish, clothes, props and setting only): ${c('era')}.`, `COLOR: ${c('tone')}.`,
        photo('a seated or standing portrait from the knees up, period-accurate photographic look'), NO_TEXT,
      ].join('\n')
    case 'fan-card':
      return [
        `EDIT IMAGE 1 into a polished K-pop style photocard portrait of the SAME real person — same pose and expression, cleaned up like an official photocard.`,
        identity(people, inputs), '',
        'STYLE: soft pastel lavender-blue studio background with gentle bokeh, bright flattering beauty lighting, fresh natural makeup, their own outfit kept and neatened.',
        photo('framed from the chest up with the face in the upper-middle'), NO_TEXT,
      ].join('\n')
    case 'graduation':
      return [
        `EDIT IMAGE 1 into a graduation portrait of the SAME real person.`,
        identity(people, inputs), '',
        `OUTFIT: ${c('gown')}, ${c('cap')}, optionally holding a rolled diploma with a ribbon and a small white flower bouquet.`, `SCENE: ${c('place')}.`,
        photo('a warm, joyful graduation-album portrait framed from the waist up'), NO_TEXT,
      ].join('\n')
    case 'history':
      return [
        `Create a painted illustration, inspired by Korean history, that shows the SAME real person from IMAGE 1 ${c('role')}, ${c('scene')}. This is an imaginative scene inspired by history, not a historical record.`,
        identity(people, inputs), '',
        'STYLE: a delicate traditional Korean painting look with soft colors on aged paper, the person wearing a historically inspired hanbok, face painted with the exact likeness.',
        'vertical 2:3 composition that fills the frame, the person from the waist up in the foreground.', NO_TEXT,
      ].join('\n')
    case 'timecapsule':
      return [
        `EDIT IMAGE 1 into an imaginative portrait of the SAME real person in the future, ${c('years')}. This is a playful creative imagining, not a prediction.`,
        identity(people, inputs).replace('age and gender presentation', 'gender presentation (age changes only as requested)').replace(' Do not beautify,', ' Apart from the requested aging, do not beautify,'), '',
        `SCENE: ${c('place')}; smart casual clothes; content and warm expression.`,
        photo('a natural candid portrait framed from the chest up'), NO_TEXT,
      ].join('\n')
    case 'brand-avatar':
      return [
        `Turn the real person in IMAGE 1 into a stylized 3D character avatar that clearly resembles them: same hairstyle and hair color, same glasses or accessories if any, same face shape, skin tone and expression mood.`,
        `STYLE: ${c('mood')}, with ${c('color')} as the point color in the clothes and background.`, `FORMAT: ${c('format')}.`,
        'Keep it friendly and non-photorealistic, like a polished animated-film character. Vertical 2:3 image filling the frame.', NO_TEXT,
      ].join('\n')
    case 'hanbok':
      return [
        `EDIT IMAGE 1 into a portrait of the SAME real person wearing ${c('hanbok')}, styled according to their own gender presentation (a man wears a men's hanbok).`,
        identity(people, inputs), '',
        `SCENE: ${c('place')}.`,
        photo('an elegant portrait framed from the waist up, soft natural daylight'), NO_TEXT,
      ].join('\n')
    case 'traditional':
      return [
        `Paint a portrait of the SAME real person from IMAGE 1 as ${c('style')}.`,
        identity(people, inputs), '',
        'The face keeps the exact likeness rendered with brush strokes; clothes become a soft traditional robe; vertical 2:3 composition filling the frame, the person from the chest up.', NO_TEXT,
      ].join('\n')
    case 'caricature': {
      // 키오스크 DRAW! 와 같은 그림 규칙 — 비율만 인화지에 맞춘다
      if (!isCaricatureStyle(choices.style) || !isCaricatureLevel(choices.level)) throw new Error('unknown caricature option')
      return buildCaricaturePrompt(choices.style, choices.level, isGroupShot(faces), BOOTH_CARICATURE_FRAME)
    }
    case 'wedding':
      return [
        `EDIT IMAGE 1 into a romantic wedding photo of the SAME two real people from the photo, standing close together as a couple — styled according to each person's own gender presentation (wedding dress, suit or tuxedo).`,
        identity(2, inputs), '',
        `SCENE: ${c('place')}. COLOR: ${c('tone')}. A soft bouquet of pale roses.`,
        photo('framed from the waist up with both faces clearly visible, natural happy expressions'), NO_TEXT,
      ].join('\n')
    case 'future-family':
      return [
        `Create an imaginative, playful family picture: person A (IMAGE 1) and person B (IMAGE 2), with an imagined young child of about 5 years old sitting between them. This is a just-for-fun creative image, not a prediction.`,
        identity(2, inputs), '',
        `SCENE: ${c('scene')}. STYLE: ${c('style')}. Everyone smiling warmly, wholesome and family-friendly, fully clothed.`,
        'Vertical 2:3 composition filling the frame with all three faces clearly visible.', NO_TEXT,
      ].join('\n')
    case 'housing-movein':
      return [
        `EDIT IMAGE 1 into a joyful move-in day commemorative photo of the SAME real people, ${c('home')}.`,
        identityGroup(), '',
        `PROP: ${c('prop')}. Everyone smiles naturally like on a happy moving day; casual comfortable clothes.`,
        photo('framed from the knees or waist up so every face is clearly visible, bright natural daylight, warm and hopeful mood'), NO_TEXT,
      ].join('\n')
    case 'housing-cover':
      return [
        `EDIT IMAGE 1 into an interior-design magazine cover photo of the SAME real person at home in ${c('room')}, ${c('pose')}.`,
        identity(people, inputs), '',
        'STYLING: tasteful smart-casual outfit that suits the interior; the home looks real, lived-in and beautifully styled.',
        photo('an editorial lifestyle portrait from the waist or knees up, the face in the upper-middle of the frame with calm empty wall or ceiling space above the head for a magazine title'), NO_TEXT,
      ].join('\n')
    case 'housing-2046':
      return [
        `EDIT IMAGE 1 into an imaginative photo of the SAME real person as a happy resident of ${c('city')}, ${c('time')}. This is a playful creative imagining, not a prediction or a real plan.`,
        identity(people, inputs), '',
        'STYLING: comfortable near-future casual clothes in soft tones (no costumes, no armor, no helmets); hopeful, peaceful, people-friendly city — not dystopian.',
        photo('the person framed from the waist up in the foreground with the future city clearly visible behind them'), NO_TEXT,
      ].join('\n')
    // 펀그라운드 QUEST! — 얼굴은 그대로, 모험가 옷과 배경만(1~4명)
    case 'quest':
      return [
        `EDIT IMAGE 1 into a fantasy adventure movie still of the SAME real people in ${c('world')}.`,
        identityGroup(false), '',
        `CAPE: everyone wears ${c('cape')} over the outfit described above.`,
        'MOOD: wonder and excitement, friendly and family-safe — nothing scary, no weapons, no blood.',
        photo('framed from the knees or waist up so every face is clearly visible, cinematic magical lighting'), NO_TEXT,
      ].join('\n')
    // 펀그라운드 MVP! — 경기장 우승 장면. 유니폼에 글자 · 번호 · 로고 없이
    case 'mvp':
      return [
        `EDIT IMAGE 1 into a championship celebration sports photo of the SAME real people, ${c('sport')}.`,
        identityGroup(false), '',
        `UNIFORM: ${c('kit')}, completely plain — no letters, no numbers, no names, no badges, no team crests and no sponsor or brand logos anywhere on clothes, caps, trophy, balls, banners or scoreboards.`,
        photo('framed from the knees or waist up so every face is clearly visible, joyful winning expressions, bright sports photography'), NO_TEXT,
      ].join('\n')
    // 펀그라운드 DREAM! — 꿈의 직업 옷과 일터만(얼굴 · 나이 그대로, 1~4명). 옷에 글자 · 이름표 · 로고 없이
    case 'dream':
      return [
        `EDIT IMAGE 1 into a joyful career-day photo of the SAME real people ${c('job')}, ${c('moment')}.`,
        identityGroup(false), '',
        'UNIFORM RULES: real job clothing sized for each person as they are now (children stay children in kid-sized outfits) — no name tags, no letters, no numbers, no badges, no logos or emblems anywhere.',
        photo('framed from the knees or waist up so every face is clearly visible, bright and hopeful lighting'), NO_TEXT,
      ].join('\n')
    default:
      throw new Error(`no prompt for ${program.id}`)
  }
}
