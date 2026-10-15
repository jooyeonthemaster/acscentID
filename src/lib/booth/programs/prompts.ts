// 포토부스 프로그램 생성 프롬프트(서버 전용) — 프로그램마다 따로. 아이돌 메이크업만 기존 AI 아이돌 프롬프트(idol-concepts.ts)를 그대로 쓴다.
// 공통 원칙은 AI 아이돌과 같다: '새 사진'이 아니라 '이 사진을 고쳐라'로 말하고 얼굴(정체성)을 가장 먼저 못 박는다.
// 글자·로고·실존 인물 닮게·노출 의상은 넣지 않는다. 화면에서 온 문장은 쓰지 않고 옵션 id 로 catalog 의 조각을 찾는다.

import { buildIdolPrompt, findIdolConcept } from '../idol-concepts'
import { optionOf, type ProgramDef } from './catalog'

const NO_TEXT = 'DO NOT add any text, captions, logos, watermarks or signatures, and no readable letters or numbers anywhere in the image. Do not make anyone resemble a real celebrity. Clothing is modest and age-appropriate.'

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

const photo = (framing: string) =>
  `PHOTOGRAPHY: professional quality, sharp focus on the eyes, light natural retouching that keeps skin texture, realistic adult body proportions, vertical 2:3 image that fills the entire frame edge to edge (no borders, frames, split panels or collage), ${framing}.`

const pick = (program: ProgramDef, choices: Record<string, string>, group: string) => optionOf(program, group, choices[group])?.prompt ?? ''

/** 프로그램 · 고른 옵션 · 사람 수 · 넣는 사진 수 → 생성 프롬프트 */
export function buildProgramPrompt(program: ProgramDef, choices: Record<string, string>, inputs: number): string {
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
    default:
      throw new Error(`no prompt for ${program.id}`)
  }
}
