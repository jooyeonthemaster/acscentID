// 손님 식습관·알레르기와 메뉴의 궁합 — 사장님이 입력한 재료표(INGREDIENTS)만 보고 판정한다.
// AI 가 지어내는 정보가 아니라 데이터 대조라서, 화면·AI 답변·주방 전달이 모두 같은 결과를 쓴다(사업계획서 리스크 2 대응).
// 옵션(두부로 바꾸기·다시마 육수 등)으로 피할 수 있으면 'adjust' — 바꿀 옵션까지 찾아 준다.

import { INGREDIENTS, MENU } from './menu'
import type { AllergenId, MenuItem, OptionChoice, OptionGroup, SpiceLevel } from './types'

export const DIET_IDS = ['no-pork', 'no-beef', 'halal', 'vegetarian', 'vegan', 'no-alcohol'] as const
export type DietId = (typeof DIET_IDS)[number]

export interface Profile {
  diets: DietId[]
  allergens: AllergenId[]
  /** 괜찮은 매운 정도(한국 기준 0~4) */
  spiceMax: SpiceLevel
  party: number
}

export const EMPTY_PROFILE: Profile = { diets: [], allergens: [], spiceMax: 2, party: 2 }

/** 옵션 그룹 id → 고른 선택지 id */
export type Selection = Record<string, string>

export function defaultSelection(item: MenuItem): Selection {
  const sel: Selection = {}
  for (const group of item.options ?? []) sel[group.id] = group.defaultChoice
  return sel
}

function chosen(item: MenuItem, sel: Selection): OptionChoice[] {
  const out: OptionChoice[] = []
  for (const group of item.options ?? []) {
    const choice = group.choices.find((c) => c.id === (sel[group.id] ?? group.defaultChoice))
    if (choice) out.push(choice)
  }
  return out
}

export function ingredientsFor(item: MenuItem, sel: Selection = defaultSelection(item)): string[] {
  const set = new Set(item.ingredients)
  for (const choice of chosen(item, sel)) {
    for (const id of choice.removeIngredients ?? []) set.delete(id)
    for (const id of choice.addIngredients ?? []) set.add(id)
  }
  return [...set].filter((id) => INGREDIENTS[id])
}

export function spiceFor(item: MenuItem, sel: Selection = defaultSelection(item)): SpiceLevel {
  const delta = chosen(item, sel).reduce((sum, c) => sum + (c.spiceDelta ?? 0), 0)
  return Math.max(0, Math.min(4, item.spice + delta)) as SpiceLevel
}

export function priceFor(item: MenuItem, sel: Selection = defaultSelection(item)): number {
  return item.price + chosen(item, sel).reduce((sum, c) => sum + (c.priceDelta ?? 0), 0)
}

export function allergensFor(item: MenuItem, sel: Selection = defaultSelection(item)): AllergenId[] {
  const set = new Set<AllergenId>()
  for (const id of ingredientsFor(item, sel)) for (const a of INGREDIENTS[id].allergens) set.add(a)
  return [...set]
}

export type Conflict =
  | { kind: 'allergen'; allergen: AllergenId; ingredient: string }
  | { kind: 'diet'; diet: DietId; ingredient: string }

/** 이 재료가 이 식습관에 걸리는가 */
export function dietBlocks(diet: DietId, ingredientId: string): boolean {
  const ing = INGREDIENTS[ingredientId]
  if (!ing) return false
  switch (diet) {
    case 'no-pork': return ing.meat === 'pork'
    case 'no-beef': return ing.meat === 'beef'
    // 할랄 인증 매장이 아니다 — 돼지고기·술이 없는 것까지만 판정하고, 화면·AI 는 인증이 없음을 함께 말한다
    case 'halal': return ing.meat === 'pork' || !!ing.alcohol
    case 'vegetarian': return !!ing.animal && !ing.vegetarianOk
    case 'vegan': return !!ing.animal
    case 'no-alcohol': return !!ing.alcohol
  }
}

export function conflictsFor(item: MenuItem, sel: Selection, profile: Pick<Profile, 'diets' | 'allergens'>): Conflict[] {
  const out: Conflict[] = []
  const all = ingredientsFor(item, sel)
  // 알레르기는 숨은 재료(새우젓·멸치 육수 등)를 먼저 — '김치'보다 '새우젓'이 정확한 이유다
  const hiddenFirst = [...all].sort((a, b) => Number(!!INGREDIENTS[b].hidden) - Number(!!INGREDIENTS[a].hidden))
  // 식습관은 주재료 고기를 먼저 — 비건에게 삼겹살의 이유는 '새우젓'이 아니라 '삼겹살'이다
  const meatFirst = [...all].sort((a, b) => Number(!!INGREDIENTS[b].meat) - Number(!!INGREDIENTS[a].meat) || Number(!!INGREDIENTS[a].hidden) - Number(!!INGREDIENTS[b].hidden))
  for (const id of hiddenFirst) {
    const ing = INGREDIENTS[id]
    for (const allergen of ing.allergens) {
      if (profile.allergens.includes(allergen) && !out.some((c) => c.kind === 'allergen' && c.allergen === allergen)) {
        out.push({ kind: 'allergen', allergen, ingredient: id })
      }
    }
  }
  for (const id of meatFirst) {
    for (const diet of profile.diets) {
      if (dietBlocks(diet, id) && !out.some((c) => c.kind === 'diet' && c.diet === diet)) {
        out.push({ kind: 'diet', diet, ingredient: id })
      }
    }
  }
  return out
}

/** 옵션 조합 전부(그룹 셋 × 선택지 넷이어도 64가지) */
function allSelections(item: MenuItem): Selection[] {
  let combos: Selection[] = [{}]
  for (const group of item.options ?? []) {
    combos = combos.flatMap((base) => group.choices.map((c) => ({ ...base, [group.id]: c.id })))
  }
  return combos
}

function changes(item: MenuItem, from: Selection, to: Selection): { group: OptionGroup; choice: OptionChoice }[] {
  const out: { group: OptionGroup; choice: OptionChoice }[] = []
  for (const group of item.options ?? []) {
    if ((from[group.id] ?? group.defaultChoice) !== (to[group.id] ?? group.defaultChoice)) {
      const choice = group.choices.find((c) => c.id === to[group.id])
      if (choice) out.push({ group, choice })
    }
  }
  return out
}

export interface Fit {
  status: 'ok' | 'adjust' | 'conflict'
  /** 지금 고른(또는 기본) 옵션으로 걸리는 것 */
  conflicts: Conflict[]
  /** 걸리는 것을 모두 피하는 옵션(adjust 일 때) */
  fix?: Selection
  fixChanges: { group: OptionGroup; choice: OptionChoice }[]
  /** 판정에 쓴 옵션(fix 가 있으면 fix)의 매운 정도 */
  spice: SpiceLevel
  tooSpicy: boolean
  /** 매운 것만 걸릴 때 덜 맵게 하는 옵션 */
  milder?: Selection
  milderChanges: { group: OptionGroup; choice: OptionChoice }[]
}

export function fitFor(item: MenuItem, profile: Profile, sel: Selection = defaultSelection(item)): Fit {
  const conflicts = conflictsFor(item, sel, profile)
  let fix: Selection | undefined
  let fixChanges: Fit['fixChanges'] = []
  if (conflicts.length) {
    // 걸리는 게 없는 조합 중 바꾸는 옵션이 가장 적고, 같으면 덜 매운 것
    const candidates = allSelections(item)
      .filter((s) => conflictsFor(item, s, profile).length === 0)
      .map((s) => ({ s, n: changes(item, sel, s).length, spice: spiceFor(item, s) }))
      .sort((a, b) => a.n - b.n || a.spice - b.spice)
    if (candidates.length) {
      fix = candidates[0].s
      fixChanges = changes(item, sel, fix)
    }
  }
  const basis = fix ?? sel
  const spice = spiceFor(item, basis)
  const tooSpicy = spice > profile.spiceMax
  let milder: Selection | undefined
  let milderChanges: Fit['milderChanges'] = []
  if (tooSpicy && (!conflicts.length || fix)) {
    const calmer = allSelections(item)
      .filter((s) => conflictsFor(item, s, profile).length === 0 && spiceFor(item, s) <= profile.spiceMax)
      .map((s) => ({ s, n: changes(item, basis, s).length }))
      .sort((a, b) => a.n - b.n)
    if (calmer.length) {
      milder = calmer[0].s
      milderChanges = changes(item, basis, milder)
    }
  }
  return {
    status: !conflicts.length ? 'ok' : fix ? 'adjust' : 'conflict',
    conflicts,
    fix,
    fixChanges,
    spice,
    tooSpicy,
    milder,
    milderChanges,
  }
}

/** 손님 조건에 맞는(옵션으로 맞출 수 있는 것 포함) 메뉴 수 */
export function fittingCount(profile: Profile): number {
  return MENU.filter((item) => fitFor(item, profile).status !== 'conflict').length
}

export function hasConstraints(profile: Profile): boolean {
  return profile.diets.length > 0 || profile.allergens.length > 0
}

/** 비건이면 채식도, 할랄이면 돼지고기 X·술 X 도 겸한다 — 칩을 켤 때 겹치는 것을 정리 */
export function toggleDiet(diets: DietId[], id: DietId): DietId[] {
  if (diets.includes(id)) return diets.filter((d) => d !== id)
  const next = [...diets, id]
  if (id === 'vegan') return next.filter((d) => d !== 'vegetarian')
  if (id === 'vegetarian') return next.filter((d) => d !== 'vegan')
  return next
}
