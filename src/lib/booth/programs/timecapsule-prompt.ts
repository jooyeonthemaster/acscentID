// ANSAN 미래 사진 프롬프트 — 사람마다 본인의 얼굴을 유지한 채 자연스럽게 나이 들게 한다.
// 사람 읽기·크롭과 분리해 지시 우선순위와 이미지별 인물 연결을 따로 검증한다.

import type { Presentation, StripPerson } from './timecapsule-server'
import type { StripYears } from './timecapsule-strip'

/** 축제 주제(AI·로봇·드론·탄소중립)와 안산(시화호 조력발전)을 미래 장면에 담는다. */
const SCENES: Record<StripYears, { scene: string; clothes: string }> = {
  10: {
    scene: 'inside a bright, airy future science museum hall in the year 2036 — friendly white helper robots and a few small drones softly blurred in the background, big windows, warm daylight',
    clothes: 'comfortable near-future smart-casual clothes in soft colors',
  },
  20: {
    scene: 'in a green, carbon-neutral future city park by a wide calm lake in the year 2046 — wind turbines and a long low tidal-power dam far across the water, solar canopies over the walkways, lush trees, golden-hour light',
    clothes: 'comfortable near-future casual clothes in fresh natural colors',
  },
  30: {
    scene: 'in the observation lounge of a friendly space station in the year 2056 — the glowing blue planet Earth fills a large round window behind them, soft warm cabin light',
    clothes: 'cozy space-station casual wear such as soft jumpsuits or light jackets (no helmets, no armor)',
  },
}

/** 성장·노화는 각 사람의 고유 얼굴에 적용한다. 일반적인 턱선·코·얼굴 폭으로 바꾸라고 지시하지 않는다. */
function stage(age: number): string {
  const decade = `${Math.floor(age / 10) * 10}s`
  if (age <= 3) return 'a toddler with age-appropriate growth and their own recognizable features'
  if (age <= 12) return `a child about ${age} — naturally grown to this age, retaining their own eye shape, smile and family-independent identity`
  if (age <= 17) return 'a teenager — age-appropriate facial development and teen body proportions, still recognizable as this same individual'
  if (age <= 29) return 'a grown young adult — adult facial development and body proportions, carrying this individual\'s own features into adulthood'
  if (age <= 39) return 'an adult in their 30s — their own recognizable face with subtle, natural signs of the elapsed years'
  if (age <= 49) return 'a middle-aged adult in their 40s — their own facial structure with natural skin texture and light expression lines'
  if (age <= 59) return 'a middle-aged adult in their 50s — their own facial structure with age-appropriate expression lines and natural changes to hair'
  if (age <= 74) return `an older adult in their ${decade} — their own recognizable face with natural wrinkles and individual graying`
  if (age <= 89) return `an elderly person around ${age} — their own recognizable face with natural elderly skin texture and hair`
  return `a very old person around ${age} — an imaginative advanced-age version of this same individual, retaining their recognizable features`
}

function noun(p: Presentation, age: number): string {
  const kid = age <= 12, teen = age <= 17
  if (p === 'boy' || p === 'man') return kid ? 'boy' : teen ? 'teenage boy' : 'man'
  if (p === 'girl' || p === 'woman') return kid ? 'girl' : teen ? 'teenage girl' : 'woman'
  return kid ? 'child' : teen ? 'teenager' : 'person'
}

const ageNow = (age: number) => (age === 0 ? 'a baby under one year old' : age <= 3 ? `a ${age}-year-old toddler` : `about ${age} years old`)

/** withRefs: 검증된 얼굴 이미지를 people과 같은 순서로 붙였을 때만 true. */
export function buildStepPrompt(years: StripYears, people: StripPerson[] | null, withRefs: boolean): string {
  const { scene, clothes } = SCENES[years]
  const n = people?.length ?? 0
  const hasRefs = withRefs && n > 0
  const lines: string[] = [
    `Make one realistic "time capsule" photograph of the SAME real ${n === 1 ? 'person' : 'people'} from IMAGE 1, about ${years} years older. Preserve each person's individual identity throughout the age transformation. This is a fun creative imagining for a family science festival, not a prediction.`,
    '',
    'IDENTITY FIRST — the highest priority:',
    '- Every output person must be recognizable as that specific person from the input, including when several people look related. Read and preserve each identity independently. Never blend, average, swap, duplicate or invent faces; never substitute a generic attractive face or a celebrity.',
    '- IMAGE 1 is the original group photograph. It establishes who is present, where each person stands, their relative arrangement, and the connection between each face and body.',
  ]
  if (hasRefs) {
    lines.push(n === 1
      ? 'IMAGE 2 is an isolated close-up of this same person from IMAGE 1. It is this person\'s identity reference only.'
      : `IMAGES 2 to ${n + 1} are separate identity references, one per person in the same left-to-right order as IMAGE 1: IMAGE 2 belongs ONLY to Person 1, IMAGE 3 ONLY to Person 2, and so on. Each reference supplies facial details for its assigned person only; it is not a new person or a source to mix with another face.`)
    lines.push('- Plain or masked areas around an isolated face are only technical isolation. Ignore those areas; do not reproduce them or paste the reference image into the result.')
  }
  lines.push(
    '- Keep each person\'s original gender presentation throughout aging. In the PEOPLE list, a boy grows into a teenage boy or man, and a girl grows into a teenage girl or woman. Keep the assigned person\'s presentation and facial identity together.',
    '- Preserve each person\'s own eye shape and eyelids, eye spacing, eyebrows, nose, lips, characteristic smile, ears, skin tone, ethnicity, distinctive marks and moles. Keep glasses when present and the individual facial-hair pattern, allowing natural graying.',
    '- For anyone already an adult in IMAGE 1, keep their existing facial structure: face shape and width, jawline, chin, cheekbone shape, and the proportions of the eyes, nose and mouth. Show aging through natural skin texture, expression lines, soft-tissue changes and hair changes; do not redesign the face or impose a slimmer jaw, bigger eyes, a new nose or beauty retouching.',
    '- For babies and children, grow that individual\'s own features and body naturally to the new age. Preserve the distinctive eye shape, spacing, smile and other recognizable traits while allowing age-appropriate development. A child reaching adulthood must look grown up, while still resembling their own childhood identity. Never replace a grown child with a parent\'s face or another adult\'s face.',
  )
  if (people && n > 0) {
    lines.push('', `PEOPLE — exactly ${n} ${n === 1 ? 'person' : 'people'}${n > 1 ? ', in the same left-to-right order as IMAGE 1. Never add, remove, duplicate, merge or swap anyone' : ''}:`)
    people.forEach((p, i) => {
      const target = p.age + years
      const where = n === 1 ? 'the person' : i === 0 ? 'leftmost' : i === n - 1 ? 'rightmost' : `${['', '', '2nd', '3rd'][i + 1] ?? `${i + 1}th`} from the left`
      lines.push(`${i + 1}. Person ${i + 1} (${where}${hasRefs ? `; face reference IMAGE ${i + 2}` : ''}${p.look ? `; today in IMAGE 1: ${p.look}` : ''}): now ${ageNow(p.age)} → in THIS image about ${target} years old, shown as a ${noun(p.presentation, target)}: ${stage(target)}.`)
    })
    lines.push('- The descriptions of today\'s hair and clothes locate the person in IMAGE 1; preserve the actual face from that person\'s reference rather than inferring an identity from the description.')
  } else {
    lines.push('', 'PEOPLE — count the real people posing in IMAGE 1 (including any baby or small child) and keep EXACTLY that many, in the same left-to-right order. Never add, remove, duplicate, merge or swap anyone. Estimate each person\'s current age and show that same individual about ' + `${years} years older. A child reaching 18 or older must develop into a recognizable grown-up version of that child.`)
  }
  lines.push(
    '',
    'NATURAL PASSAGE OF TIME:',
    `- Everyone ages by the same ${years} years from their own current age, preserving the age gaps. The references show them TODAY; produce their older selves with age-appropriate development and natural aging while keeping identity as the first priority.`,
    '- Only people whose new age is 12 or younger have child proportions; teenagers have teen proportions, and adults have adult proportions. A baby who was held in arms may stand beside the others when older.',
    '- Preserve each person\'s characteristic hair length, parting, bangs and overall hairstyle from their own reference, including children growing into teenagers or adults. Keep short hair short and long hair long; allow natural thinning, recession or graying without replacing the hairstyle or inventing a new haircut. Keep each person\'s characteristic expression.',
    '',
    `SCENE: ${scene}.`,
    `COMPOSITION: one shared, natural scene; landscape 3:2 photo that fills the whole frame edge to edge (no borders, frames, split panels or collage). A close ${n === 1 ? 'portrait' : 'group portrait'}: ${n === 1 ? 'the person is' : 'everyone is'} framed from the chest or waist up with large, clearly visible faces, facing the camera — never a full-body shot, no legs or feet in the picture. Keep the same left-to-right order and similar arrangement as IMAGE 1, allowing natural changes in a child's height.`,
    'NOBODY ELSE in the picture: no bystanders, visitors or other people anywhere, even far away in the background (robots and drones are fine).',
    `STYLING: modest, age-appropriate clothes; optional subtle details of ${clothes}. Clothing and scenery are secondary to preserving the people. Keep the original clothes if changing them would weaken resemblance.`,
    'PHOTOGRAPHY: realistic photograph, sharp focus on the eyes, natural skin texture and soft light. Keep distinctive facial details instead of smoothing or beautifying them away.',
    'DO NOT add text, captions, logos, watermarks, signs or readable letters or numbers anywhere.',
    'FINAL CHECK: match every output person back to their own person and face reference in IMAGE 1, one by one. The group count, positions, individual identities and elapsed years must all agree.',
  )
  return lines.join('\n')
}
