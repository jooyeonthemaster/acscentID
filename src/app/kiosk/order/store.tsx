'use client'

// AI 주문 키오스크 상태 — 화면 단계·나라/언어·손님 조건·장바구니·AI 대화를 한 곳에서 든다.
// 처음으로(RESET)는 session 을 올려 화면 전체를 새로 그린다(이전 손님 흔적이 남지 않게).

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { AiAnswer } from '@/lib/kiosk/order/ai-engine'
import { EMPTY_PROFILE, defaultSelection, fitFor, priceFor, type Profile, type Selection } from '@/lib/kiosk/order/diet'
import { defaultSpiceFor } from '@/lib/kiosk/order/format'
import { ORDER_TEXT, type OrderText } from '@/lib/kiosk/order/i18n'
import { menuItem } from '@/lib/kiosk/order/menu'
import type { Country, OrderLang } from '@/lib/kiosk/order/types'

export type Screen = 'attract' | 'country' | 'preparing' | 'prefs' | 'menu' | 'pay' | 'done'

export type Sheet =
  | { kind: 'item'; id: string; sel?: Selection }
  | { kind: 'cart' }
  | { kind: 'ai'; ask?: string }
  | { kind: 'lang' }
  | { kind: 'prefs' }

export interface CartLine {
  key: string
  id: string
  sel: Selection
  qty: number
}

export interface ChatMsg {
  id: number
  role: 'user' | 'ai'
  text: string
  answer?: AiAnswer
  /** AI 가 아직 생각 중(단계 연출) */
  pending?: boolean
}

export interface OrderState {
  session: number
  screen: Screen
  country: Country | null
  lang: OrderLang
  profile: Profile
  cart: CartLine[]
  dineIn: boolean
  sheet: Sheet | null
  arId: string | null
  chat: ChatMsg[]
  lastDishId?: string
  orderNo?: string
  paidWith?: string
  /** 화면 위 잠깐 뜨는 알림 */
  toast?: { id: number; text: string }
}

export type OrderAction =
  | { type: 'go'; screen: Screen }
  | { type: 'country'; country: Country; keepScreen?: boolean }
  | { type: 'profile'; patch: Partial<Profile> }
  | { type: 'sheet'; sheet: Sheet | null }
  | { type: 'ar'; id: string | null }
  | { type: 'add'; id: string; sel?: Selection; qty?: number }
  | { type: 'qty'; key: string; qty: number }
  | { type: 'line-sel'; key: string; sel: Selection }
  | { type: 'dine'; dineIn: boolean }
  | { type: 'chat'; msg: ChatMsg }
  /** 대화가 비어 있을 때만 첫 인사를 넣는다(두 번 불려도 하나) */
  | { type: 'greet'; msg: ChatMsg }
  | { type: 'chat-resolve'; id: number; answer: AiAnswer }
  | { type: 'focus-dish'; id: string }
  | { type: 'paid'; orderNo: string; method: string }
  | { type: 'toast'; text: string }
  | { type: 'reset' }

const initial = (session = 0): OrderState => ({
  session,
  screen: 'attract',
  country: null,
  lang: 'en',
  profile: EMPTY_PROFILE,
  cart: [],
  dineIn: true,
  sheet: null,
  arId: null,
  chat: [],
})

const lineKey = (id: string, sel: Selection) => `${id}|${Object.entries(sel).sort().map(([k, v]) => `${k}=${v}`).join(',')}`

let toastSeq = 0

function reducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen, sheet: null, arId: null }
    case 'country': {
      const switching = state.country !== null
      return {
        ...state,
        country: action.country,
        lang: action.country.ui,
        // 처음 고를 때만 나라 입맛으로 매운 정도를 맞춘다 — 손님이 이미 바꾼 값은 지킨다
        profile: switching ? state.profile : { ...state.profile, spiceMax: defaultSpiceFor(action.country) },
        screen: action.keepScreen ? state.screen : 'preparing',
        sheet: action.keepScreen ? null : state.sheet,
        // 언어가 바뀌면 지난 대화는 그 언어로 다시 시작
        chat: switching && action.country.ui !== state.lang ? [] : state.chat,
      }
    }
    case 'profile':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'sheet': {
      const leavingAi = state.sheet?.kind === 'ai' && action.sheet?.kind !== 'ai'
      // AI 가 생각하는 중에 창을 닫으면 그 답을 바로 확정한다 — '생각 중'으로 남으면 무입력 초기화가 멈춘다
      const pending = leavingAi ? state.chat.filter((m) => m.pending && m.answer) : []
      let profile = state.profile
      for (const m of pending) if (m.answer?.profilePatch) profile = { ...profile, ...m.answer.profilePatch }
      return {
        ...state,
        sheet: action.sheet,
        lastDishId: action.sheet?.kind === 'item' ? action.sheet.id : state.lastDishId,
        chat: pending.length ? state.chat.map((m) => (m.pending && m.answer ? { ...m, pending: false, text: m.answer.text } : m)) : state.chat,
        profile,
      }
    }
    case 'ar':
      return { ...state, arId: action.id }
    case 'add': {
      const item = menuItem(action.id)
      if (!item) return state
      const sel = action.sel ?? fitFor(item, state.profile).fix ?? defaultSelection(item)
      const key = lineKey(action.id, sel)
      const qty = action.qty ?? 1
      const found = state.cart.find((l) => l.key === key)
      const cart = found
        ? state.cart.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + qty) } : l))
        : [...state.cart, { key, id: action.id, sel, qty }]
      return { ...state, cart, lastDishId: action.id }
    }
    case 'qty':
      return {
        ...state,
        cart: action.qty <= 0 ? state.cart.filter((l) => l.key !== action.key) : state.cart.map((l) => (l.key === action.key ? { ...l, qty: Math.min(20, action.qty) } : l)),
      }
    case 'line-sel': {
      const line = state.cart.find((l) => l.key === action.key)
      if (!line) return state
      const key = lineKey(line.id, action.sel)
      return { ...state, cart: state.cart.map((l) => (l.key === action.key ? { ...l, key, sel: action.sel } : l)) }
    }
    case 'dine':
      return { ...state, dineIn: action.dineIn }
    case 'chat':
      return { ...state, chat: [...state.chat, action.msg] }
    case 'greet':
      return state.chat.length ? state : { ...state, chat: [action.msg] }
    case 'chat-resolve':
      return {
        ...state,
        chat: state.chat.map((m) => (m.id === action.id ? { ...m, pending: false, answer: action.answer, text: action.answer.text } : m)),
        lastDishId: action.answer.focusDishId ?? state.lastDishId,
        profile: action.answer.profilePatch ? { ...state.profile, ...action.answer.profilePatch } : state.profile,
      }
    case 'focus-dish':
      return { ...state, lastDishId: action.id }
    case 'paid':
      return { ...state, orderNo: action.orderNo, paidWith: action.method, screen: 'done', sheet: null, arId: null }
    case 'toast':
      return { ...state, toast: { id: ++toastSeq, text: action.text } }
    case 'reset':
      return initial(state.session + 1)
  }
}

interface OrderCtx {
  state: OrderState
  dispatch: Dispatch<OrderAction>
  t: OrderText
}

const Ctx = createContext<OrderCtx | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initial())
  const value = useMemo(() => ({ state, dispatch, t: ORDER_TEXT[state.lang] }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOrder(): OrderCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOrder must be used inside OrderProvider')
  return ctx
}

export function cartTotals(cart: CartLine[]) {
  let total = 0
  let count = 0
  for (const line of cart) {
    const item = menuItem(line.id)
    if (!item) continue
    total += priceFor(item, line.sel) * line.qty
    count += line.qty
  }
  return { total, count }
}

/** 주문 번호 — 매장 카운터 호출용 짧은 번호(A + 세 자리) */
export function nextOrderNo(): string {
  const n = 100 + Math.floor((Date.now() / 1000) % 900)
  return `A${n}`
}
