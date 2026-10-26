// 주거복지대전 키오스크 3종의 조향 레시피 — 실제 향료 30종(src/data/perfumes.ts)에서 최대 둘을 골라 비율을 정한 '블렌딩 레시피'.
// 2026-10-22 사용자 지시: "조향 레시피는 두 개까지만 혼합" — 향료 하나(100%) 또는 둘(각 20~80%).
// 규칙(답변 → 향 계열 가중치)이 향료 순위를 매기고, AI 가 그 순위 위쪽에서 주향을 고른 뒤 보조 향료 하나와 비율을 짠다(ai.ts recipe).
// 검사는 여기 한 곳: 향료 1~2개 · 서로 다름 · 실제 id · 둘이면 비율 정수 20~80 · 합 100 · 주향은 규칙 상위 후보 안.
// AI 를 건너뛰면(기다리지 않기) 규칙 상위 둘(다른 계열)을 60/40 으로 — 화면·영수증에 '기본 레시피'라고 적는다.
// DOM·네트워크 없음(화면·서버·시험이 같이 쓴다).

import { perfumes, type Perfume } from '@/data/perfumes'

export const FAMILIES = ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy'] as const
export type Family = (typeof FAMILIES)[number]
export const FAMILY_KO: Record<Family, string> = { citrus: '시트러스', floral: '플로럴', woody: '우디', musky: '머스크', fruity: '프루티', spicy: '스파이시' }
export type FamilyWeights = Partial<Record<Family, number>>

/** 레시피를 짜는 제품 — 퍼퓸 10ml(향료 2ml + 퍼퓸 베이스 8ml, 매장 키오스크 기본 제품과 같은 구성) */
export const RECIPE_PRODUCT = { label: '퍼퓸 10ml', fragranceMl: 2, baseMl: 8 } as const
/** 계량 환산 — 2026-10-22 사용자: "그람수와 미리수가 같게" → 1ml = 1g(매장 키오스크 기본 제품의 0.9 비중과 다르다) */
const DENSITY = 1
/** AI 에 넘기는 주향 후보 수 — 규칙 순위 위에서부터 */
export const PREFER_COUNT = 8
/** 한 레시피에 섞는 향료 수 상한 */
export const MAX_NOTES = 2

export interface RecipeNote {
  id: string
  /** 두 자리 번호 '07' */
  no: string
  name: string
  family: Family
  ratio: number
  ml: number
  g: number
  /** 이 향료를 넣은 이유 한 줄 */
  reason: string
}
export interface ScentRecipe {
  /** 이 블렌드의 이름(예: 햇살 드는 오후의 거실) */
  name: string
  story: string
  notes: RecipeNote[]
  product: string
  baseMl: number
  /** AI 가 짠 레시피인지 — 아니면 규칙 기본 레시피 */
  ai: boolean
}

export const perfumeNo = (id: string) => id.replace(/^AC'SCENT\s*/, '').padStart(2, '0')
const byId = new Map(perfumes.map((p) => [p.id, p]))
export const findPerfume = (id: string) => byId.get(id)
const familyOf = (p: Perfume): Family => ((FAMILIES as readonly string[]).includes(p.category) ? p.category : 'woody') as Family

/** 'AC'SCENT 7', 'ACSCENT 07', '07' 같은 표기를 실제 id 로 */
export function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/(\d{1,2})\s*$/)
  if (!m) return null
  const id = `AC'SCENT ${m[1].padStart(2, '0')}`
  return byId.has(id) ? id : null
}

/** 답변에서 나온 계열 가중치로 향료 30종 순위 — 피하는 계열이 강한(7 이상) 향료는 뺀다 */
export function rankPerfumes(weights: FamilyWeights, avoid: Family[] = []): Perfume[] {
  const pool = perfumes.filter((p) => !avoid.some((f) => p.characteristics[f] >= 7))
  const score = (p: Perfume) => FAMILIES.reduce((n, f) => n + (weights[f] ?? 0) * p.characteristics[f], 0)
  return (pool.length >= 3 ? pool : perfumes).slice().sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
}

export const preferIds = (ranked: Perfume[]) => ranked.slice(0, PREFER_COUNT).map((p) => p.id)

/** AI 지시문에 넣는 향료 목록 한 줄씩(서버가 실제 데이터로 만든다 — 화면에서 온 문장을 쓰지 않는다) */
export function catalogForPrompt(): string {
  return perfumes.map((p) => `${p.id} ${p.name} [${FAMILY_KO[familyOf(p)]}] 노트: ${p.mainScent.name}·${p.subScent1.name}·${p.subScent2.name} / ${p.mood}`).join('\n')
}

const round2 = (n: number) => Math.round(n * 100) / 100

function note(id: string, ratio: number, reason: string): RecipeNote {
  const p = byId.get(id)!
  const ml = round2((RECIPE_PRODUCT.fragranceMl * ratio) / 100)
  return { id, no: perfumeNo(id), name: p.name, family: familyOf(p), ratio, ml, g: round2(ml * DENSITY), reason }
}

export interface RawRecipe { name: string; story: string; notes: { id: string; ratio: number; reason: string }[] }

/** AI 가 낸 레시피 검사 — 어긋나면 이유를 담은 오류(다시 받는다) */
export function validateRecipe(value: unknown, prefer: string[]): RawRecipe {
  if (!value || typeof value !== 'object') throw new Error('recipe 는 객체여야 합니다.')
  const v = value as Record<string, unknown>
  const name = typeof v.name === 'string' ? v.name.trim() : ''
  if (name.length < 2 || name.length > 20 || !/[가-힣]/.test(name)) throw new Error('recipe.name 은 한국어 2~20자의 블렌드 이름이어야 합니다.')
  const story = typeof v.story === 'string' ? v.story.trim() : ''
  if (story.length < 20 || story.length > 200) throw new Error('recipe.story 는 20~200자여야 합니다.')
  const raw = Array.isArray(v.notes) ? v.notes : []
  if (raw.length < 1 || raw.length > MAX_NOTES) throw new Error(`recipe.notes 는 향료 1~${MAX_NOTES}개여야 합니다(보통 2개).`)
  const single = raw.length === 1
  const notes = raw.map((x, i) => {
    const n = (x ?? {}) as Record<string, unknown>
    const id = normalizeId(n.id)
    if (!id) throw new Error(`recipe.notes[${i}].id 는 향료 목록의 id(예: AC'SCENT 07) 중 하나여야 합니다.`)
    const ratio = typeof n.ratio === 'number' ? n.ratio : Number(n.ratio)
    if (!Number.isInteger(ratio) || (single ? ratio !== 100 : ratio < 20 || ratio > 80)) throw new Error(single ? '향료가 하나면 ratio 는 100 이어야 합니다.' : `recipe.notes[${i}].ratio 는 20~80 사이 정수(%)여야 합니다.`)
    const reason = typeof n.reason === 'string' ? n.reason.trim().slice(0, 50) : ''
    if (reason.length < 4) throw new Error(`recipe.notes[${i}].reason 이 비었습니다.`)
    return { id, ratio, reason }
  })
  if (new Set(notes.map((n) => n.id)).size !== notes.length) throw new Error('recipe.notes 의 향료는 서로 달라야 합니다.')
  const sum = notes.reduce((s, n) => s + n.ratio, 0)
  if (sum !== 100) throw new Error(`recipe.notes 의 ratio 합은 100 이어야 합니다(지금 ${sum}).`)
  notes.sort((a, b) => b.ratio - a.ratio)
  if (!prefer.includes(notes[0].id)) throw new Error(`가장 비율이 큰 주향은 추천 후보(${prefer.join(', ')}) 중 하나여야 합니다.`)
  return { name, story, notes }
}

export function toRecipe(raw: RawRecipe, ai: boolean): ScentRecipe {
  return { name: raw.name, story: raw.story, notes: raw.notes.map((n) => note(n.id, n.ratio, n.reason)), product: RECIPE_PRODUCT.label, baseMl: RECIPE_PRODUCT.baseMl, ai }
}

/** AI 없이 — 규칙 1위를 주향, 다른 계열 중 가장 높은 것을 보조로 60/40 */
export function ruleRecipe(ranked: Perfume[], name: string, story: string): ScentRecipe {
  const second = ranked.slice(1).find((p) => familyOf(p) !== familyOf(ranked[0])) ?? ranked[1]
  const picked: Perfume[] = [ranked[0], second]
  const ratios = [60, 40]
  const reasons = ['주향 — 답변과 가장 잘 맞는 향', '보조 — 분위기를 넓혀 주는 향']
  return toRecipe({ name, story, notes: picked.map((p, i) => ({ id: p.id, ratio: ratios[i], reason: reasons[i] })) }, false)
}

/** 화면·카드·영수증 공용 한 줄 — 'No.07 로즈' / '50% · 1.0ml (0.9g)' */
export const noteLabel = (n: RecipeNote) => `No.${n.no} ${n.name}`
/** 계량은 무게(g)가 기준 — 2026-10-22 사용자: "중요한 건 퍼센트가 아니라 그람수" */
export const noteGrams = (n: RecipeNote) => `${n.g.toFixed(2)}g`
export const noteDetail = (n: RecipeNote) => `${n.ratio}% · ${n.ml.toFixed(2)}ml`
export const noteAmount = (n: RecipeNote) => `${noteGrams(n)} (${noteDetail(n)})`
export const RECIPE_STEPS = ['레시피의 향료를 순서대로 계량해요.', '퍼퓸 베이스와 섞은 뒤 가볍게 흔들어요.', '서늘하고 어두운 곳에서 하루 이상 숙성하면 더 잘 어우러져요.']
/** 2026-10-26 주거복지대전 제안서: 결과물은 '레시피 인쇄 + 향수 10ml 증정품' */
export const RECIPE_COUNTER = '이 영수증을 조향 스태프에게 보여 주시면 레시피대로 향수 10ml를 만들어 드려요(증정).'
