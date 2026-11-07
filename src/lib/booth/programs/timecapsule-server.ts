// ANSAN 타임캡슐(서버 전용) — 한 컷 단체 사진 → 10·20·30년 후 세 장(가로 3:2, 2×6 사진 칸).
//
// 여럿이 한 컷에 서면 모델이 얼굴을 섞거나(아빠 얼굴을 자란 아이에게) 아기·어린이를 놓친다. 그래서 미래 가족 상상(FAMILY!)이
// 사람마다 사진을 따로 넣던 방식을 한 컷에 맞게 옮겼다:
//   1) 사람 읽기 — 비전 모델이 앞에 선 사람을 왼쪽부터 하나씩: 머리 상자·지금 나이·성별 표현·옷/머리(구별용). 안긴 아기·작은 아이도.
//      브라우저 얼굴 검출기(MediaPipe)는 아기·옆얼굴을 자주 놓쳐서 여기 결과를 기준으로 삼는다.
//   2) 얼굴 클로즈업 — 상자대로 서버가 사람마다 잘라 '정체성 참고' 사진으로 본 사진 뒤에 사람 순서대로 붙인다.
//   3) 프롬프트 — 사람마다 "왼쪽 1번, 참고 IMAGE 2, 지금 약 2살 → 이 장면에서 약 12살 아이"처럼 한 줄씩 못 박는다.
//      모두 같은 햇수만큼 나이 들고(나이 차 유지), 서로 얼굴을 주고받지 않게, 몸 비율은 새 나이에 맞게(어른 비율 문구 금지).
// 얼굴을 안전하게 구분하지 못하면 생성 표를 쓰기 전에 다시 촬영하도록 안내한다.
// 손님 사진은 생성에만 쓰고 저장·기록하지 않는다.

import sharp from 'sharp'
import { askBoothVision, generateBoothImage, IdolError } from '../idol-generate'
import { STRIP_MAX_PEOPLE, STRIP_STEPS, stripRetakeCopy, type StripRetake, type StripYears } from './timecapsule-strip'
import { buildFaceReferences, createFaceReferences } from './timecapsule-faces'
import { buildStepPrompt } from './timecapsule-prompt'

export { buildStepPrompt } from './timecapsule-prompt'

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
 * 이러면 얼굴 클로즈업이 엉뚱한 사람(또는 두 사람)을 담아 얼굴이 섞인다 → 다음 모델에 다시 묻고, 그래도 이상하면 다시 촬영한다
 */
export function boxesLookWrong(people: StripPerson[]): boolean {
  return boxProblem(people) !== null
}

/** 상자가 왜 이상한가 — 두 머리가 크게 겹치면 overlap(손님이 얼굴을 띄우면 된다), 머리 모양이 아니게 길쭉하면 unclear */
function boxProblem(people: StripPerson[]): 'overlap' | 'unclear' | null {
  if (people.some((a, i) => people.slice(i + 1).some((b) => boxOverlap(a.box, b.box) > OVERLAP_LIMIT))) return 'overlap'
  const odd = people.some((a) => {
    const ratio = ((a.box.x1 - a.box.x0) * PHOTO_ASPECT) / (a.box.y1 - a.box.y0)
    return ratio > 1.6 || ratio < 0.5
  })
  return odd ? 'unclear' : null
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

/** 사람 읽기 모델이 둘 다 답하지 않음(호출 실패 · 시간 초과 · 잔액 부족 · 키 없음) — 손님 사진 탓이 아니라 다시 찍지 않는다 */
const VISION_DOWN = 'AI 서버가 잠시 응답하지 않아요. [다시 만들기]를 눌러 같은 사진으로 다시 시도해 주세요. 계속되면 직원에게 알려 주세요.'

/**
 * 사진 속 사람 읽기 — 상자가 믿을 만한 첫 답. 모두 이상하면 가장 많이 찾은 답, 답은 왔는데 형식이 모두 틀리면 null(다시 촬영).
 * 두 모델 모두 답이 없으면 503 — 다시 촬영이 아니라 같은 사진으로 다시 시도(생성 표는 아직 쓰지 않았다)
 */
export async function readPeople(photo: string): Promise<StripPerson[] | null> {
  let best: StripPerson[] | null = null
  let answered = false
  for (const [model, timeout] of VISION_MODELS) {
    const text = await askBoothVision(model, timeout, PEOPLE_PROMPT, [photo])
    if (text) answered = true
    const people = text ? parsePeople(text) : null
    if (!people) {
      if (text) console.error('[timecapsule] 사람 읽기 형식 오류', model, text.slice(0, 200))
      continue
    }
    if (people.length > 0 && !boxesLookWrong(people)) return people
    if (people.length > 0) console.error('[timecapsule] 머리 상자가 이상해 다시 묻는다', model, people.length)
    if (!best || people.length > best.length) best = people
  }
  if (!answered) {
    console.error('[timecapsule] 사람 읽기 모델이 모두 응답하지 않음 — 다시 시도 안내(503)')
    throw new IdolError(VISION_DOWN, 503)
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

/** 한 사람만 담긴 얼굴 참고 사진 — 비율 유지·이웃 얼굴 제외, 분리할 수 없으면 빈 배열. */
export const faceCloseups = createFaceReferences

// ───────────────────────── 만들기 ─────────────────────────

/** 이미지 두 번 시도(첫 모델 48초 → 예비 38초) — 사람 읽기(최대 26초)까지 합쳐도 함수 시간 120초 안 */
const STEP_TIMEOUTS: [number, number] = [48_000, 38_000]

export interface StripPlan {
  people: StripPerson[]
  photo: string
  faces: string[]
}

/** 다시 촬영(422) — 이유를 함께 보내 화면이 무엇이 문제고 어떻게 찍으면 되는지 안내한다(timecapsule-strip.ts stripRetakeCopy) */
export class StripRetakeError extends IdolError {
  constructor(public retake: StripRetake) {
    const { title, tip } = stripRetakeCopy(retake)
    super(`${title}. ${tip}`, 422)
  }
}

/** 이유를 기록에 남긴다(사진은 남기지 않는다) — 다시 촬영이 몰릴 때 원인별로 세려고 */
function retake(value: StripRetake): StripRetakeError {
  console.warn('[timecapsule] 다시 촬영', value.reason, value.people ?? '')
  return new StripRetakeError(value)
}

function requirePeople(people: StripPerson[] | null): StripPerson[] {
  if (people && people.length > STRIP_MAX_PEOPLE) throw retake({ reason: 'too-many', people: people.length })
  if (!people) throw retake({ reason: 'unclear' })
  if (!people.length) throw retake({ reason: 'no-people', people: 0 })
  const problem = boxProblem(people)
  if (problem) throw retake({ reason: problem, people: people.length })
  return people
}

function requireReferences(people: StripPerson[], faces: string[], problem: 'too-small' | 'overlap' | 'invalid' | null = null) {
  if (faces.length === people.length) return
  throw retake({ reason: problem === 'too-small' || problem === 'overlap' ? problem : 'unclear', people: people.length })
}

/** 생성 준비 — 각자 깨끗한 얼굴 참고를 확보해야 생성 표를 사용한다. 실패하면 422(이유와 함께)로 다시 촬영. */
export async function planStrip(photo: string): Promise<StripPlan> {
  const [read, main] = await Promise.all([readPeople(photo), mainPhoto(photo)])
  const people = requirePeople(read)
  const { faces, problem } = await buildFaceReferences(photo, people).catch(() => ({ faces: [] as string[], problem: 'invalid' as const }))
  requireReferences(people, faces, problem)
  return { people, photo: main, faces }
}

/** 고른 햇수만큼 동시에 — 못 만든 칸은 null(부스가 그 칸만 다시 부탁한다) */
export async function generateSteps(plan: StripPlan, steps: StripYears[]): Promise<(string | null)[]> {
  const people = requirePeople(plan.people)
  requireReferences(people, plan.faces)
  return Promise.all(steps.map((years) =>
    generateBoothImage(buildStepPrompt(years, people, true), plan.photo, plan.faces, {
      aspectRatio: '3:2', imageSize: '1K', timeouts: STEP_TIMEOUTS,
      // 단체는 같은 모델로 재시도해 여러 얼굴 참고를 다루는 생성 품질을 유지한다.
      retryModel: people.length > 1 ? 'primary' : 'fast',
    })
      .catch((error) => { console.error('[timecapsule] 컷 실패', years, error instanceof Error ? error.message : error); return null }),
  ))
}

export const ALL_STRIP_YEARS: StripYears[] = STRIP_STEPS.map((s) => s.years)
