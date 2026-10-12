// 미래 직업 탐색(NEXT!) — 좋아하는 활동과 상황 선택으로 '탐색해 볼 직업' 세 가지를 제안한다.
// 관심사 기반 탐색이다: 얼굴·목소리·성별로 능력을 짐작하지 않고, 적성이나 미래를 확정해 말하지 않는다.
// 네 가지 관심 축(만들기·문제 풀기·사람 돕기·이야기하기)의 점수로 고른다 — 같은 답이면 늘 같은 결과.

export type CareerAxis = 'make' | 'solve' | 'help' | 'talk'
export const CAREER_AXES: CareerAxis[] = ['make', 'solve', 'help', 'talk']

/** 상황 질문 다섯 개 — 보기마다 어느 축에 점수를 주는지(문구는 text.ts 의 questions 와 같은 순서) */
export const CAREER_QUESTIONS: { options: CareerAxis[]; icons: string[] }[] = [
  { options: ['make', 'solve', 'talk'], icons: ['palette', 'puzzle', 'chat'] },
  { options: ['solve', 'help', 'talk'], icons: ['search', 'team', 'present'] },
  { options: ['make', 'solve', 'talk'], icons: ['poster', 'plan', 'megaphone'] },
  { options: ['help', 'solve', 'make'], icons: ['ear', 'bulb', 'gift'] },
  { options: ['make', 'help', 'talk'], icons: ['hammer', 'heart', 'spark'] },
]
/** 첫 질문(여러 개 선택) + 상황 질문 */
export const CAREER_TOTAL = 1 + CAREER_QUESTIONS.length

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
 * picks: 첫 질문에서 고른 활동(고른 순서) · answers: 상황 질문마다 고른 보기 번호.
 * 첫 질문은 고른 활동마다 2점, 상황 질문은 고른 보기의 축에 2점. 점수가 같으면 첫 질문에서 먼저 고른 쪽이 앞선다.
 * 제안: ① 1위×2위 ② 2위×1위 ③ 1위 한 축(둘이 같은 축이면 1위×3위)
 */
export function exploreCareers(picks: CareerAxis[], answers: number[]): CareerResult {
  const score: Record<CareerAxis, number> = { make: 0, solve: 0, help: 0, talk: 0 }
  picks.forEach((axis) => { score[axis] += 2 })
  answers.forEach((choice, i) => { const axis = CAREER_QUESTIONS[i]?.options[choice]; if (axis) score[axis] += 2 })
  const order = (axis: CareerAxis) => { const at = picks.indexOf(axis); return at < 0 ? 10 + CAREER_AXES.indexOf(axis) : at }
  const axes = [...CAREER_AXES].sort((a, b) => score[b] - score[a] || order(a) - order(b))
  const [first, second, third] = axes
  const careers = [careerFor(first, second), careerFor(second, first), careerFor(first, null)]
  // 2위 축의 점수가 0이면(한쪽으로만 골랐다) 2위 중심 직업 대신 1위×3위를 보여 준다
  if (score[second] === 0) careers[1] = careerFor(first, third)
  return { axes, careers: [...new Set(careers)] }
}
