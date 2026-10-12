// 미래 직업 탐색(NEXT!) — 좋아하는 활동과 상황 선택으로 '탐색해 볼 직업' 세 가지를 제안한다.
// 중심은 관심사다: 좋아하는 활동(8개 중 여럿)과 상황 질문 다섯 개가 점수의 대부분을 만든다.
// MBTI 와 관상(2026-10-13 추가, 둘 다 건너뛸 수 있다)은 재미로 곁들이는 단서라 점수를 조금만 보탠다 —
// 능력이나 미래를 단정해 말하지 않고, 결과 문구도 '탐색해 볼'·'재미로 보는'으로 쓴다.
// 네 가지 관심 축(만들기·문제 풀기·사람 돕기·이야기하기)의 점수로 고른다 — 같은 답이면 늘 같은 결과.

export type CareerAxis = 'make' | 'solve' | 'help' | 'talk'
export const CAREER_AXES: CareerAxis[] = ['make', 'solve', 'help', 'talk']

/** 첫 질문 — 마음이 가는 활동(축마다 둘). 아이콘 이름은 화면의 ICONS 와 맞춘다 */
export const CAREER_INTERESTS = [
  { id: 'craft', axis: 'make', icon: 'hammer' }, { id: 'design', axis: 'make', icon: 'palette' },
  { id: 'puzzle', axis: 'solve', icon: 'puzzle' }, { id: 'explore', axis: 'solve', icon: 'flask' },
  { id: 'care', axis: 'help', icon: 'heart' }, { id: 'teach', axis: 'help', icon: 'cap' },
  { id: 'story', axis: 'talk', icon: 'chat' }, { id: 'lead', axis: 'talk', icon: 'megaphone' },
] as const satisfies readonly { id: string; axis: CareerAxis; icon: string }[]
export type CareerInterest = (typeof CAREER_INTERESTS)[number]['id']
const interestAxis = (id: CareerInterest): CareerAxis => CAREER_INTERESTS.find((item) => item.id === id)!.axis

/** MBTI — 글자마다 가까운 축에 조금씩(유형 전체가 3~4점쯤. 질문 하나가 2점이다) */
export const MBTI_TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'] as const
export type MbtiType = (typeof MBTI_TYPES)[number]
export type MbtiLetter = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P'
const MBTI_WEIGHT: Record<MbtiLetter, Partial<Record<CareerAxis, number>>> = {
  E: { talk: 1 }, I: { solve: 0.5, make: 0.5 }, S: { make: 0.5, help: 0.5 }, N: { solve: 0.5, talk: 0.5 },
  T: { solve: 1 }, F: { help: 1 }, J: { solve: 0.5, help: 0.5 }, P: { make: 0.5, talk: 0.5 },
}
export const mbtiLetters = (type: MbtiType) => [...type] as MbtiLetter[]

/** 관상(재미로 보는 인상) — 얼굴 비율에서 읽은 특징마다 가까운 축에 1점(face.ts) */
export const FACE_TRAITS = {
  'forehead-wide': 'solve', 'forehead-neat': 'make', 'eyes-big': 'talk', 'eyes-calm': 'solve', 'brow-open': 'help', 'brow-close': 'talk',
  'nose-long': 'solve', 'nose-soft': 'help', 'mouth-wide': 'talk', 'mouth-neat': 'make', 'jaw-firm': 'make', 'jaw-slim': 'make',
} as const satisfies Record<string, CareerAxis>
export type FaceTrait = keyof typeof FACE_TRAITS

/** 상황 질문 다섯 개 — 보기마다 어느 축에 점수를 주는지(문구는 text.ts 의 questions 와 같은 순서) */
export const CAREER_QUESTIONS: { options: CareerAxis[]; icons: string[] }[] = [
  { options: ['make', 'solve', 'talk'], icons: ['palette', 'puzzle', 'chat'] },
  { options: ['solve', 'help', 'talk'], icons: ['search', 'team', 'present'] },
  { options: ['make', 'solve', 'talk'], icons: ['poster', 'plan', 'megaphone'] },
  { options: ['help', 'solve', 'make'], icons: ['ear', 'bulb', 'gift'] },
  { options: ['make', 'help', 'talk'], icons: ['hammer', 'heart', 'spark'] },
]
/** 단계 수 — 활동 고르기 · MBTI · 상황 질문 다섯 · 관상 */
export const CAREER_TOTAL = 2 + CAREER_QUESTIONS.length + 1

export const CAREER_IDS = [
  'brand-designer', 'space-designer', 'product-designer', 'food-creator',
  'developer', 'data-analyst', 'service-planner', 'researcher',
  'social-worker', 'teacher', 'service-designer', 'counselor',
  'content-planner', 'host', 'marketer', 'community-manager',
] as const
export type CareerId = (typeof CAREER_IDS)[number]

/** 직업마다 가장 가까운 축과 곁들이는 축(없으면 한 축에 집중) */
export const CAREERS: Record<CareerId, { primary: CareerAxis; secondary: CareerAxis | null }> = {
  'brand-designer': { primary: 'make', secondary: 'talk' },
  'space-designer': { primary: 'make', secondary: null },
  'product-designer': { primary: 'make', secondary: 'solve' },
  'food-creator': { primary: 'make', secondary: 'help' },
  developer: { primary: 'solve', secondary: 'make' },
  'data-analyst': { primary: 'solve', secondary: null },
  'service-planner': { primary: 'solve', secondary: 'help' },
  researcher: { primary: 'solve', secondary: 'talk' },
  'social-worker': { primary: 'help', secondary: 'solve' },
  teacher: { primary: 'help', secondary: null },
  'service-designer': { primary: 'help', secondary: 'make' },
  counselor: { primary: 'help', secondary: 'talk' },
  'content-planner': { primary: 'talk', secondary: 'make' },
  host: { primary: 'talk', secondary: null },
  marketer: { primary: 'talk', secondary: 'solve' },
  'community-manager': { primary: 'talk', secondary: 'help' },
}

export interface CareerResult {
  /** 점수가 높은 순서의 축 */
  axes: CareerAxis[]
  careers: CareerId[]
}

const careerFor = (primary: CareerAxis, secondary: CareerAxis | null) =>
  CAREER_IDS.find((id) => CAREERS[id].primary === primary && CAREERS[id].secondary === secondary)!

/**
 * interests: 첫 질문에서 고른 활동(고른 순서) · answers: 상황 질문마다 고른 보기 번호 · mbti·traits: 곁들이는 단서(없어도 된다).
 * 활동마다 2점, 상황 질문은 고른 보기의 축에 2점, MBTI 는 글자마다 0.5~1점, 관상 특징은 1점씩.
 * 점수가 같으면 첫 질문에서 먼저 고른 쪽이 앞선다.
 * 제안: ① 1위×2위 ② 2위×1위 ③ 1위 한 축(둘이 같은 축이면 1위×3위)
 */
export function exploreCareers(interests: CareerInterest[], answers: number[], mbti: MbtiType | null = null, traits: FaceTrait[] = []): CareerResult {
  const score: Record<CareerAxis, number> = { make: 0, solve: 0, help: 0, talk: 0 }
  const picks = interests.map(interestAxis)
  picks.forEach((axis) => { score[axis] += 2 })
  answers.forEach((choice, i) => { const axis = CAREER_QUESTIONS[i]?.options[choice]; if (axis) score[axis] += 2 })
  if (mbti) for (const letter of mbtiLetters(mbti)) for (const [axis, value] of Object.entries(MBTI_WEIGHT[letter])) score[axis as CareerAxis] += value
  traits.forEach((trait) => { score[FACE_TRAITS[trait]] += 1 })
  const order = (axis: CareerAxis) => { const at = picks.indexOf(axis); return at < 0 ? 10 + CAREER_AXES.indexOf(axis) : at }
  const axes = [...CAREER_AXES].sort((a, b) => score[b] - score[a] || order(a) - order(b))
  const [first, second, third] = axes
  const careers = [careerFor(first, second), careerFor(second, first), careerFor(first, null)]
  // 2위 축의 점수가 0이면(한쪽으로만 골랐다) 2위 중심 직업 대신 1위×3위를 보여 준다
  if (score[second] === 0) careers[1] = careerFor(first, third)
  return { axes, careers: [...new Set(careers)] }
}
