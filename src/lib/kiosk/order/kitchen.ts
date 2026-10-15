// 주방 전달 메모 — 손님 말(어느 나라 말이든)로 고른 조건을 주방이 읽는 한국어로 바꾼다.
// 장바구니 화면·완료 화면·영수증·휴대폰 페이지가 모두 이 문장을 쓴다.

import { conflictsFor, defaultSelection, type Profile, type Selection } from './diet'
import { countryName } from './format'
import { ORDER_TEXT } from './i18n'
import { INGREDIENTS, menuItem } from './menu'
import type { Country } from './types'

export interface KitchenNote {
  /** 주방이 꼭 봐야 하는 줄(알레르기·식습관) */
  alerts: string[]
  /** 그 밖의 안내(맵기·국적·인원) */
  notes: string[]
  /** 메뉴별 한국어 이름 + 옵션 */
  lines: { name: string; options: string; qty: number; warn?: string }[]
}

const ko = ORDER_TEXT.ko

interface CartLine {
  id: string
  sel: Selection
  qty: number
}

export function kitchenNote(cart: CartLine[], profile: Profile, country: Country | null, dineIn: boolean): KitchenNote {
  const alerts: string[] = []
  if (profile.allergens.length) alerts.push(`알레르기: ${profile.allergens.map((a) => ko.allergens[a]).join(', ')} — 조리도구 분리 부탁드립니다`)
  if (profile.diets.length) alerts.push(`식습관: ${profile.diets.map((d) => ko.diets[d]).join(', ')}`)
  const notes: string[] = []
  if (profile.spiceMax <= 1) notes.push(`매운맛 약하게 (손님 기준 ${ko.spiceTolerance[profile.spiceMax]})`)
  if (country && country.code !== 'kr') notes.push(`${countryName(country, 'ko')} 손님 · 화면 언어 ${ORDER_TEXT[country.ui].langLabel}`)
  notes.push(dineIn ? `매장 식사 · ${profile.party}명` : '포장')
  const lines = cart.map((line) => {
    const item = menuItem(line.id)
    if (!item) return { name: line.id, options: '', qty: line.qty }
    const options = (item.options ?? [])
      .map((g) => {
        const choice = g.choices.find((c) => c.id === (line.sel[g.id] ?? g.defaultChoice))
        return choice && choice.id !== g.defaultChoice ? choice.label.ko : null
      })
      .filter(Boolean)
      .join(', ')
    const conflicts = conflictsFor(item, line.sel ?? defaultSelection(item), profile)
    const warn = conflicts.length ? `확인 필요: ${conflicts.map((c) => INGREDIENTS[c.ingredient]?.name.ko).join(', ')} 포함` : undefined
    return { name: item.name.ko, options, qty: line.qty, warn }
  })
  return { alerts, notes, lines }
}
