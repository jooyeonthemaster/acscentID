'use client'

// 주문 확인 — 담은 메뉴·수량, AI 가 권하는 곁들임, 주방에 한국어로 넘어가는 메모, 매장/포장, 결제로.

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChefHat, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { AI_COPY } from '@/lib/kiosk/order/ai-copy'
import { conflictsFor, fitFor, priceFor } from '@/lib/kiosk/order/diet'
import { foodSrc, won } from '@/lib/kiosk/order/format'
import { kitchenNote } from '@/lib/kiosk/order/kitchen'
import { MENU, menuItem } from '@/lib/kiosk/order/menu'
import { cartTotals, useOrder } from '../store'
import { BottomSheet, CloseButton, Price, Stepper } from '../ui'
import { conflictText } from './Menu'

export function CartSheet() {
  const { state, dispatch, t } = useOrder()
  const open = state.sheet?.kind === 'cart'
  const close = () => dispatch({ type: 'sheet', sheet: null })
  const { total, count } = cartTotals(state.cart)
  const copy = AI_COPY[state.lang]

  // 곁들임 — 담은 메뉴의 단짝 중 아직 안 담았고 조건에 맞는 것. 음료·디저트가 없으면 그쪽을 먼저
  const upsell = useMemo(() => {
    const inCart = new Set(state.cart.map((l) => l.id))
    const hasDrink = state.cart.some((l) => menuItem(l.id)?.category === 'drink')
    const hasDessert = state.cart.some((l) => menuItem(l.id)?.category === 'dessert')
    const seen = new Set<string>()
    const out: { id: string; from: string }[] = []
    for (const line of state.cart) {
      for (const p of menuItem(line.id)?.pairsWith ?? []) {
        if (inCart.has(p) || seen.has(p)) continue
        const item = menuItem(p)
        if (!item || fitFor(item, state.profile).status === 'conflict') continue
        seen.add(p)
        out.push({ id: p, from: line.id })
      }
    }
    const weight = (id: string) => {
      const c = menuItem(id)?.category
      return (c === 'drink' && !hasDrink ? -2 : 0) + (c === 'dessert' && !hasDessert ? -1 : 0)
    }
    return out.sort((a, b) => weight(a.id) - weight(b.id)).slice(0, 2)
  }, [state.cart, state.profile])

  const note = kitchenNote(state.cart, state.profile, state.country, state.dineIn)

  return (
    <BottomSheet open={open} onClose={close} label={t.cart.title} height="94%" className="ok-sheet--cart">
      <div className="ok-sheet-head">
        <h2>{t.cart.title} <small>{t.common.count(count)}</small></h2>
        <CloseButton onClick={close} label={t.common.close} />
      </div>
      <div className="ok-sheet-scroll">
        {state.cart.length === 0 ? (
          <div className="ok-empty">
            <ShoppingBag size={44} strokeWidth={1.6} />
            <p>{t.cart.empty}</p>
          </div>
        ) : (
          <ul className="ok-lines">
            <AnimatePresence initial={false}>
              {state.cart.map((line) => {
                const item = menuItem(line.id)
                if (!item) return null
                const opts = (item.options ?? []).map((g) => g.choices.find((c) => c.id === (line.sel[g.id] ?? g.defaultChoice))?.label[state.lang]).filter(Boolean).join(' · ')
                const conflicts = conflictsFor(item, line.sel, state.profile)
                return (
                  <motion.li key={line.key} className="ok-line lg" layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0, padding: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foodSrc(item.id, true)} alt="" draggable={false} />
                    <div className="ok-line-body">
                      <b>{item.name[state.lang]}</b>
                      <small lang="ko">{item.name.ko}{opts ? ` · ${opts}` : ''}</small>
                      {conflicts.length > 0 && <span className="ok-line-warn"><AlertTriangle size={13} strokeWidth={2.4} />{conflicts.map((c) => conflictText(c, t)).join(' · ')}</span>}
                      <div className="ok-line-foot">
                        <Stepper value={line.qty} min={0} onChange={(n) => dispatch({ type: 'qty', key: line.key, qty: n })} label="quantity" />
                        <em>{won(priceFor(item, line.sel) * line.qty)}</em>
                      </div>
                    </div>
                    <button type="button" className="ok-line-del lg-press" onClick={() => dispatch({ type: 'qty', key: line.key, qty: 0 })} aria-label={t.cart.remove}>
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}

        {upsell.length > 0 && (
          <section className="ok-upsell">
            <h3 className="ok-ai-title is-small"><Sparkles size={15} strokeWidth={2.4} />{t.cart.upsell}</h3>
            {upsell.map(({ id, from }) => {
              const item = menuItem(id)!
              const fit = fitFor(item, state.profile)
              return (
                <div key={id} className="ok-upsell-card lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foodSrc(id, true)} alt="" draggable={false} />
                  <div>
                    <b>{item.name[state.lang]}</b>
                    <small>{copy.reason.pairs(menuItem(from)!.name[state.lang])}</small>
                    <em>+{won(priceFor(item, fit.fix ?? undefined))}</em>
                  </div>
                  <button type="button" className="ok-mini-add lg-press" onClick={() => dispatch({ type: 'add', id })} aria-label={t.common.add}><Plus size={18} strokeWidth={3} /></button>
                </div>
              )
            })}
          </section>
        )}

        {state.cart.length > 0 && (
          <section className="ok-kitchen lg">
            <h3><ChefHat size={17} strokeWidth={2.2} />{t.cart.kitchen}<span className="ok-kr">KR</span></h3>
            <div className="ok-kitchen-paper" lang="ko">
              {note.alerts.length ? note.alerts.map((a) => <p key={a} className="is-alert">⚠ {a}</p>) : <p className="is-muted">특이 사항 없음</p>}
              {note.notes.map((n) => <p key={n}>· {n}</p>)}
              <hr />
              {note.lines.map((l, i) => (
                <p key={i}><b>{l.name}</b>{l.options ? ` (${l.options})` : ''} × {l.qty}{l.warn ? <span className="is-alert"> — {l.warn}</span> : null}</p>
              ))}
            </div>
          </section>
        )}

        {state.cart.length === 0 && (
          <section className="ok-upsell">
            <h3 className="ok-ai-title is-small"><Sparkles size={15} strokeWidth={2.4} />{t.menu.forYou}</h3>
            {MENU.filter((m) => m.badges.includes('signature')).slice(0, 2).map((item) => (
              <div key={item.id} className="ok-upsell-card lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foodSrc(item.id, true)} alt="" draggable={false} />
                <div>
                  <b>{item.name[state.lang]}</b>
                  <small>{item.tagline[state.lang]}</small>
                  <em>{won(item.price)}</em>
                </div>
                <button type="button" className="ok-mini-add lg-press" onClick={() => dispatch({ type: 'add', id: item.id })} aria-label={t.common.add}><Plus size={18} strokeWidth={3} /></button>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="ok-cart-foot">
        <div className="ok-segment lg is-dine">
          {[true, false].map((d) => (
            <button key={String(d)} type="button" className={`lg-press${state.dineIn === d ? ' is-on' : ''}`} onClick={() => dispatch({ type: 'dine', dineIn: d })}>
              {d ? t.cart.dineIn : t.cart.takeout}
              {state.dineIn === d && <motion.i layoutId="ok-dine-thumb" className="ok-segment-thumb" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            </button>
          ))}
        </div>
        <div className="ok-cart-total">
          <span>{t.common.total}</span>
          <Price krw={total} country={state.country} lang={state.lang} size="xl" />
        </div>
        <button type="button" className="ok-btn ok-btn--primary ok-btn--block lg-press" disabled={!count} onClick={() => dispatch({ type: 'go', screen: 'pay' })}>
          {t.cart.pay} · {won(total)}
        </button>
      </footer>
    </BottomSheet>
  )
}
