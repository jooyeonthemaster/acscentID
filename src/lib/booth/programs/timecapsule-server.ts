// ANSAN 타임캡슐(서버 전용) — 한 컷 단체 사진 → 10·20·30년 후 세 장(가로 3:2, 2×6 사진 칸).
//
// 여럿이 한 컷에 서면 모델이 얼굴을 섞거나(아빠 얼굴을 자란 아이에게) 아기·어린이를 놓친다. 그래서 미래 가족 상상(FAMILY!)이
// 사람마다 사진을 따로 넣던 방식을 한 컷에 맞게 옮겼다:
//   1) 사람 읽기 — 비전 모델이 앞에 선 사람을 왼쪽부터 하나씩: 머리 상자·지금 나이·성별 표현·옷/머리(구별용). 안긴 아기·작은 아이도.
//      브라우저 얼굴 검출기(MediaPipe)는 아기·옆얼굴을 자주 놓쳐서 여기 결과를 기준으로 삼는다.
//   2) 얼굴 클로즈업 — 상자대로 서버가 사람마다 잘라 '정체성 참고' 사진으로 본 사진 뒤에 사람 순서대로 붙인다.
//   3) 프롬프트 — 사람마다 "왼쪽 1번, 참고 IMAGE 2, 지금 약 2살 → 이 장면에서 약 12살 아이"처럼 한 줄씩 못 박는다.
//      모두 같은 햇수만큼 나이 들고(나이 차 유지), 서로 얼굴을 주고받지 않게, 몸 비율은 새 나이에 맞게(어른 비율 문구 금지).
// 사람 읽기에 실패하면 프롬프트만으로(모델이 직접 세게) 만든다 — 부스가 멈추면 안 된다.
// 손님 사진은 생성에만 쓰고 저장·기록하지 않는다.

import sharp from 'sharp'
import { askBoothVision, generateBoothImage, IdolError } from '../idol-generate'
import { STRIP_MAX_PEOPLE, STRIP_STEPS, type StripYears } from './timecapsule-strip'

export type Presentation = 'boy' | 'girl' | 'man' | 'woman' | 'unclear'

export interface StripPerson {
  /** 머리(얼굴+머리카락) 상자 — 사진 폭·높이에 대한 0~1 비율 */
  box: { x0: number; y0: number; x1: number; y1: number }
  /** 지금 나이 추정(살) */
  age: number
  presentation: Presentation
  /** 사람 구별용 짧은 묘사(머리·옷, 영어) */
  look: string
}

/**
 * 사람 읽기 모델 — 첫 모델이 안 되거나 상자가 이상하면 다음.
 * 2026-11-05 시험(가상 인물 10컷 × 5회): 3-flash 는 겹침 · 옆으로 긴 상자 0/50, 2.5-flash 는 겹침 7/50 · 긴 상자 10/50
 */
const VISION_MODELS: [string, number][] = [['google/gemini-3-flash-preview', 12_000], ['google/gemini-2.5-flash', 14_000]]

const PEOPLE_PROMPT = [
  'You help a photo booth at a family science festival. Look at this booth photo.',
  'Find EVERY real person posing in the foreground — including babies held in arms, toddlers, small children in front, and people partly hidden behind others.',
  'Ignore people far away in the background, people on posters, screens or photos, dolls, plush toys and mascots.',
  'Return JSON only, in this exact shape:',
  '{"people":[{"box_2d":[ymin,xmin,ymax,xmax],"age":7,"presentation":"girl","look":"long black hair in pigtails, yellow t-shirt"}]}',
  '- box_2d: tight box around that person\'s HEAD (face and hair), coordinates normalized to 0-1000.',
  // 3-flash 는 어른 나이를 높게 본다(30살 → 46살, 그러면 30년 뒤가 75살로 나온다) — 2026-11-05 시험: 평균 오차 4.0 → 3.1살
  '- age: your best estimate of their current age in whole years (a baby under one year is 0). Do not overestimate adults: many guests are East Asian and look younger than people often assume. Smooth skin with no gray hair usually means 20s to 30s; use 40s only with visible smile lines or first gray hairs, 50s only with clear wrinkles or noticeable gray hair, and 60+ only with mostly gray hair and deep wrinkles.',
  '- presentation: one of "boy", "girl", "man", "woman", "unclear". For babies and toddlers give your best guess from hair and clothing; use "unclear" only if there is no hint at all.',
  '- look: at most 12 words about hair and clothing, only to tell people apart. No judgments about looks.',
  '- Order the people from left to right as they appear in the image. At most 8 people. If nobody is visible return {"people":[]}.',
].join('\n')

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const boxOverlap = (a: StripPerson['box'], b: StripPerson['box']) => {
  const area = (x: StripPerson['box']) => (x.x1 - x.x0) * (x.y1 - x.y0)
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return w > 0 && h > 0 ? (w * h) / Math.min(area(a), area(b)) : 0
}
const OVERLAP_LIMIT = 0.6
/** 부스 사진은 가로 3:2 */
const PHOTO_ASPECT = 1.5

/**
 * 머리 상자가 믿을 만한가 — 두 사람 상자가 크게 겹치거나 머리 모양이 아니게 길쭉하면 모델이 자리를 잘못 잡은 것.
 * 이러면 얼굴 클로즈업이 엉뚱한 사람(또는 두 사람)을 담아 얼굴이 섞인다 → 다음 모델에 다시 묻고, 그래도 이상하면 클로즈업 없이 만든다
 */
export function boxesLookWrong(people: StripPerson[]): boolean {
  return people.some((a, i) => {
    const ratio = ((a.box.x1 - a.box.x0) * PHOTO_ASPECT) / (a.box.y1 - a.box.y0)
    return ratio > 1.6 || ratio < 0.5 || people.slice(i + 1).some((b) => boxOverlap(a.box, b.box) > OVERLAP_LIMIT)
  })
}

/** 모델 답 → 사람 목록(검사·정렬·겹침 제거). 형식이 틀리면 null */
export function parsePeople(text: string): StripPerson[] | null {
  let data: unknown
  try {
    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    data = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text)
  } catch {
    return null
  }
  const list = (data as { people?: unknown })?.people
  if (!Array.isArray(list)) return null
  const people: StripPerson[] = []
  for (const item of list.slice(0, 8)) {
    const raw = (item as { box_2d?: unknown })?.box_2d
    if (!Array.isArray(raw) || raw.length !== 4 || !raw.every((n) => typeof n === 'number' && Number.isFinite(n))) continue
    const [ymin, xmin, ymax, xmax] = (raw as number[]).map((n) => clamp(n, 0, 1000) / 1000)
    if (xmax - xmin < 0.01 || ymax - ymin < 0.01) continue
    const ageRaw = Number((item as { age?: unknown }).age)
    const age = Number.isFinite(ageRaw) ? clamp(Math.round(ageRaw), 0, 100) : 30
    const p = String((item as { presentation?: unknown }).presentation ?? '').toLowerCase()
    const presentation: Presentation = p === 'boy' || p === 'girl' || p === 'man' || p === 'woman' ? p : 'unclear'
    // 묘사는 프롬프트에 들어간다 — 글자·숫자·기본 문장부호만, 짧게
    const look = String((item as { look?: unknown }).look ?? '').replace(/[^a-zA-Z0-9 ,'-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
    people.push({ box: { x0: xmin, y0: ymin, x1: xmax, y1: ymax }, age, presentation, look })
  }
  // 같은 사람을 두 번 적은 것(상자가 겹치고 묘사까지 같음)만 하나로. 상자만 겹친다고 지우면 실제 사람이 사라진다
  // — 2.5-flash 가 넷째 사람 상자를 셋째 자리에 잘못 줘서 4명 사진이 3명으로 나왔다(2026-11-05 시험)
  const kept: StripPerson[] = []
  for (const person of people) if (!kept.some((k) => k.look === person.look && boxOverlap(k.box, person.box) > OVERLAP_LIMIT)) kept.push(person)
  return kept.sort((a, b) => (a.box.x0 + a.box.x1) - (b.box.x0 + b.box.x1))
}

/** 사진 속 사람 읽기 — 상자가 믿을 만한 첫 답. 모두 이상하면 가장 많이 찾은 답, 모델 둘 다 안 되면 null(프롬프트만으로 만든다) */
export async function readPeople(photo: string): Promise<StripPerson[] | null> {
  let best: StripPerson[] | null = null
  for (const [model, timeout] of VISION_MODELS) {
    const text = await askBoothVision(model, timeout, PEOPLE_PROMPT, [photo])
    const people = text ? parsePeople(text) : null
    if (!people) {
      if (text) console.error('[timecapsule] 사람 읽기 형식 오류', model, text.slice(0, 200))
      continue
    }
    if (people.length > 0 && !boxesLookWrong(people)) return people
    if (people.length > 0) console.error('[timecapsule] 머리 상자가 이상해 다시 묻는다', model, people.length)
    if (!best || people.length > best.length) best = people
  }
  return best
}

const toBuffer = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
const toDataUrl = (jpeg: Buffer) => `data:image/jpeg;base64,${jpeg.toString('base64')}`

/** 생성에 넣는 본 사진 — 가로 3:2 긴 변 1536(모델 입력 크기, 요청을 가볍게) */
export async function mainPhoto(photo: string): Promise<string> {
  const jpeg = await sharp(toBuffer(photo)).rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()
  return toDataUrl(jpeg)
}

/**
 * 사람마다 얼굴 클로즈업 512×512 — 머리 상자를 가운데 두고 1.7배 정사각. 작은 아이 얼굴도 크게 보여 주려고
 * 원본(부스가 보낸 큰 사진)에서 자른다. 너무 작게 잡힌 상자는 최소 크기로 넓힌다.
 */
export async function faceCloseups(photo: string, people: StripPerson[]): Promise<string[]> {
  // 방향 정보를 먼저 적용한 한 장으로 — 크기를 읽는 사진과 자르는 사진이 같아야 상자가 맞는다
  const input = await sharp(toBuffer(photo)).rotate().jpeg({ quality: 95 }).toBuffer()
  const meta = await sharp(input).metadata()
  const W = meta.width ?? 0, H = meta.height ?? 0
  if (!W || !H) return []
  return Promise.all(people.map(async ({ box }) => {
    const w = (box.x1 - box.x0) * W, h = (box.y1 - box.y0) * H
    const side = Math.round(clamp(Math.max(w, h) * 1.7, Math.min(W, H) * 0.12, Math.min(W, H)))
    const cx = ((box.x0 + box.x1) / 2) * W, cy = ((box.y0 + box.y1) / 2) * H
    const left = Math.round(clamp(cx - side / 2, 0, W - side)), top = Math.round(clamp(cy - side / 2, 0, H - side))
    const jpeg = await sharp(input).extract({ left, top, width: side, height: side }).resize(512, 512).jpeg({ quality: 90 }).toBuffer()
    return toDataUrl(jpeg)
  }))
}

// ───────────────────────── 프롬프트 ─────────────────────────

/** 컷마다 장면 · 옷(글자·로고 없이). 축제 주제(AI·로봇·드론·탄소중립)와 안산(시화호 조력발전)을 장면에 */
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

/**
 * 새 나이의 생김새 — 그냥 '약 16살'이라고만 하면 아이 얼굴 참고 사진을 그대로 베껴 아이로 남았다(2026-11-04 시험: 6살 → 16·26·36살이
 * 모두 10~13살, 8살 → 28살이 원래 옷 입은 아이 그대로). 자란 티가 나는 특징을 나이대마다 적는다
 */
function stage(age: number): string {
  const decade = `${Math.floor(age / 10) * 10}s`
  if (age <= 3) return 'a toddler'
  if (age <= 12) return `a child about ${age} — taller, with a longer and less round face than a younger child`
  if (age <= 17) return 'a teenager — teen height and a longer, slimmer face with no baby fat; clearly older than a child'
  if (age <= 29) return 'a grown young adult — adult height and an adult face (longer face, defined jawline and cheekbones, mature nose bridge); clearly NOT a child or a young teen'
  // 2026-11-05 시험: '40대 어른'이라고만 하면 30년 뒤(목표 44~70살)가 10년쯤 젊게 나왔다 — 나이 든 티를 나이대마다 적는다
  if (age <= 39) return 'an adult in their 30s — a settled, mature face with faint smile lines; clearly past their twenties'
  if (age <= 49) return 'a middle-aged adult in their 40s — visible smile lines, faint crow\'s feet, a slightly fuller face and the first gray hairs'
  if (age <= 59) return 'a middle-aged adult in their 50s — clear lines around the eyes and mouth, noticeable gray in the hair and a softer jawline'
  if (age <= 74) return `an older adult in their ${decade} — mostly gray or silver hair, clear wrinkles around the eyes, mouth and forehead`
  if (age <= 89) return `an elderly person around ${age} — white or silver hair, deep wrinkles, a thinner face, healthy and cheerful`
  return `a very old person around ${age} — thin white hair, very deep wrinkles and a small frame, visibly older than someone in their eighties, healthy and cheerful`
}

function noun(p: Presentation, age: number): string {
  const kid = age <= 12, teen = age <= 17
  if (p === 'boy' || p === 'man') return kid ? 'boy' : teen ? 'teenage boy' : 'man'
  if (p === 'girl' || p === 'woman') return kid ? 'girl' : teen ? 'teenage girl' : 'woman'
  return kid ? 'child' : teen ? 'teenager' : 'person'
}

const ageNow = (age: number) => (age === 0 ? 'a baby under one year old' : age <= 3 ? `a ${age}-year-old toddler` : `about ${age} years old`)

/**
 * 한 컷(years 년 후) 프롬프트. people 이 없으면(사람 읽기 실패) 모델이 직접 세고 나이를 짐작하게 한다.
 * withRefs: 얼굴 클로즈업을 사람 순서대로 붙였는가
 */
export function buildStepPrompt(years: StripYears, people: StripPerson[] | null, withRefs: boolean): string {
  const { scene, clothes } = SCENES[years]
  const n = people?.length ?? 0
  // 'EDIT IMAGE 1' 로 시작하면 혼자 찍은 아이 얼굴을 그대로 남겨 16·26살이 아이로 나왔다(2026-11-04 시험) — 새 사진을 만들게 하고
  // IMAGE 1 은 '누구인지·어떻게 섰는지' 참고로
  const lines: string[] = [
    `Create a new, realistic "time capsule" photo of the SAME real ${n === 1 ? 'person' : 'people'} from IMAGE 1 as they will look exactly ${years} years later, ${scene}. Use IMAGE 1 to know who they are and how they stand together — do not simply retouch IMAGE 1. This is a fun creative imagining for a family science festival, not a prediction.`,
  ]
  if (people && n > 0) {
    if (withRefs) {
      lines.push(n === 1
        ? 'IMAGE 2 is a close-up of this person\'s face from IMAGE 1 — use it only as the identity reference for exact facial details. Do not paste it into the result.'
        : `IMAGES 2 to ${n + 1} are close-ups of each person's face from IMAGE 1, in left-to-right order (IMAGE 2 = person 1, the leftmost). Use them only as identity references for exact facial details. Do not paste them into the result.`)
    }
    lines.push('', `PEOPLE — exactly ${n} ${n === 1 ? 'person' : 'people'}${n > 1 ? ', in the same left-to-right order as IMAGE 1. Never add, remove, duplicate, merge or swap anyone' : ''}:`)
    people.forEach((p, i) => {
      const target = p.age + years
      const where = n === 1 ? 'the person' : i === 0 ? 'leftmost' : i === n - 1 ? 'rightmost' : `${['', '', '2nd', '3rd'][i + 1] ?? `${i + 1}th`} from the left`
      lines.push(`${i + 1}. Person ${i + 1} (${where}${withRefs ? `; face reference IMAGE ${i + 2}` : ''}${p.look ? `; today in IMAGE 1: ${p.look}` : ''}): now ${ageNow(p.age)} → in THIS image about ${target} years old, shown as a ${noun(p.presentation, target)}: ${stage(target)}.`)
    })
  } else {
    lines.push('', 'PEOPLE — count the real people posing in IMAGE 1 (including any baby or small child) and keep EXACTLY that many, in the same left-to-right order. Never add, remove, duplicate, merge or swap anyone. Estimate each person\'s current age and show each of them about ' + `${years} years older — a child who becomes 18 or older must look like a grown adult.`)
  }
  lines.push(
    '',
    'AGING RULES — the most important part:',
    `- The new ages are mandatory. Everyone ages by the same ${years} years from their own current age, so the age gaps between them stay the same. Check every person against their listed new age before finishing: anyone listed as 18 or older must look like a grown adult, never like the child in the photo.`,
    `- ${withRefs ? 'The face references and IMAGE 1 show everyone TODAY.' : 'IMAGE 1 shows everyone TODAY.'} Each person must stay recognizable as an older version of themselves: keep their own eye shape and eyelids, eye spacing, brow line, nose shape, lips and smile, ear shape, skin tone, ethnicity and natural hair color (graying with age is fine).`,
    '- Babies and children grow up: use their face only for the features they keep for life (eye shape and spacing, brow line, nose shape, smile, skin tone), then grow the WHOLE face and body to the new age — the face gets longer and slimmer, baby fat disappears, the jaw, cheekbones and nose bridge mature, and they grow much taller. Do not copy the child\'s face as it is.',
    '- Every person is a distinct individual. Never give one person another person\'s face, even within a family — a light family resemblance is fine, blended or swapped faces are not. A grown-up child must not look like a copy of a parent.',
    '- Body size and proportions match each person\'s NEW age: only people whose new age is 12 or younger are children; teenagers have teen bodies, adults have adult height and bodies.',
    '- Everyone wears new clothes for this new time — not the clothes from IMAGE 1. Hairstyles may change to suit the new age (a grown-up child should not keep a little-kid haircut), keeping their natural hair color.',
    '- The aging must clearly show: wrinkles, gray hair and a more mature face are expected, and nobody may look younger than their listed new age. Keep it natural and healthy: no sad or tired faces, everyone smiling warmly.',
    '',
    `COMPOSITION: one shared, natural scene; landscape 3:2 photo that fills the whole frame edge to edge (no borders, frames, split panels or collage). A close ${n === 1 ? 'portrait' : 'group portrait'}: ${n === 1 ? 'the person is' : 'everyone is'} framed from the chest or waist up with large, clearly visible faces, facing the camera — never a full-body shot, no legs or feet in the picture (this prints small, so faces must be big). Same left-to-right order and a similar arrangement as IMAGE 1. Poses may change naturally for their new ages (a baby who was held in arms becomes a child or adult standing beside the others).`,
    'NOBODY ELSE in the picture: no bystanders, visitors or other people anywhere, even far away in the background (robots and drones are fine).',
    `STYLING: ${clothes}; modest and age-appropriate.`,
    'PHOTOGRAPHY: professional, sharp focus on the eyes, soft flattering light, realistic photo (not a painting or cartoon).',
    'DO NOT add any text, captions, logos, watermarks, signs or readable letters or numbers anywhere. Do not make anyone resemble a real celebrity.',
  )
  return lines.join('\n')
}

// ───────────────────────── 만들기 ─────────────────────────

/** 이미지 두 번 시도(첫 모델 48초 → 예비 38초) — 사람 읽기(최대 26초)까지 합쳐도 함수 시간 120초 안 */
const STEP_TIMEOUTS: [number, number] = [48_000, 38_000]

export interface StripPlan {
  people: StripPerson[] | null
  photo: string
  faces: string[]
}

/** 생성 준비 — 사람 읽기 · 본 사진 · 얼굴 클로즈업. 4명을 넘으면 IdolError(422, 다시 찍기 안내) */
export async function planStrip(photo: string): Promise<StripPlan> {
  const [people, main] = await Promise.all([readPeople(photo), mainPhoto(photo)])
  if (people && people.length > STRIP_MAX_PEOPLE) {
    throw new IdolError(`사진에 ${people.length}명이 보여요. ${STRIP_MAX_PEOPLE}명까지 함께 다시 찍어 주세요.`, 422)
  }
  const usable = people && people.length > 0 ? people : null
  // 상자가 끝내 이상하면 클로즈업 없이 — 엉뚱한 얼굴을 참고로 주느니 본 사진만 본다
  const faces = usable && !boxesLookWrong(usable) ? await faceCloseups(photo, usable).catch(() => []) : []
  return { people: usable, photo: main, faces: faces.length === usable?.length ? faces : [] }
}

/** 고른 햇수만큼 동시에 — 못 만든 칸은 null(부스가 그 칸만 다시 부탁한다) */
export async function generateSteps(plan: StripPlan, steps: StripYears[]): Promise<(string | null)[]> {
  const withRefs = plan.faces.length > 0
  return Promise.all(steps.map((years) =>
    generateBoothImage(buildStepPrompt(years, plan.people, withRefs), plan.photo, plan.faces, { aspectRatio: '3:2', imageSize: '1K', timeouts: STEP_TIMEOUTS })
      .catch((error) => { console.error('[timecapsule] 컷 실패', years, error instanceof Error ? error.message : error); return null }),
  ))
}

export const ALL_STRIP_YEARS: StripYears[] = STRIP_STEPS.map((s) => s.years)
