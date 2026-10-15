'use client'

// 메뉴 — 맨 위 'AI 추천'(취향 + 이 매장 주문 데이터), 그 아래 분류별 메뉴판. 손님 조건에 걸리는 메뉴는 흐리게 하고 이유를 붙인다.
// 아래 떠 있는 독(dock): 왼쪽 'AI 에게 물어보기', 오른쪽 장바구니.

import { AnimatePresence, motion } from 'framer-motion'
import { Box, ChevronDown, Flame, Plus, ShoppingBag, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { recommendPicks, type AiCard } from '@/lib/kiosk/order/ai-engine'
import { defaultSelection, fitFor, hasConstraints, priceFor, spiceFor, type Conflict, type Fit } from '@/lib/kiosk/order/diet'
import { foodSrc } from '@/lib/kiosk/order/format'
import type { OrderText } from '@/lib/kiosk/order/i18n'
import { CATEGORIES, MENU } from '@/lib/kiosk/order/menu'
import type { CategoryId, MenuItem } from '@/lib/kiosk/order/types'
import { cartTotals, useOrder } from '../store'
import { AiOrb, AllergenIcon, DietIcon, Flag, Price, RollingNumber, SpiceMeter } from '../ui'

export function conflictText(c: Conflict, t: OrderText): string {
  return c.kind === 'allergen' ? t.conflict.allergen(t.allergens[c.allergen]) : t.conflict.diet[c.diet]
}

export function FitPill({ fit, t, size = 'sm' }: { fit: Fit; t: OrderText; size?: 'sm' | 'md' }) {
  if (fit.status === 'conflict') return <span className={`ok-fit is-bad is-${size}`}>{conflictText(fit.conflicts[0], t)}</span>
  if (fit.status === 'adjust') return <span className={`ok-fit is-warn is-${size}`}>{t.menu.fit.adjust}</span>
  if (fit.tooSpicy) return <span className={`ok-fit is-hot is-${size}`}><Flame size={11} strokeWidth={2.8} />{t.menu.fit.spicy}</span>
  return null
}

function DishCard({ item, index }: { item: MenuItem; index: number }) {
  const { state, dispatch, t } = useOrder()
  const fit = fitFor(item, state.profile)
  const sel = fit.fix ?? defaultSelection(item)
  const bad = fit.status === 'conflict'
  const sub = state.lang === 'ko' ? item.romanized : item.name.ko
  const badge = item.badges.includes('signature') ? t.menu.badge.signature : item.badges.includes('vegan') ? t.menu.badge.vegan : item.rank <= 3 ? t.menu.badge.best : item.badges.includes('chef') ? t.menu.badge.chef : null
  return (
    <motion.article
      className={`ok-dish${bad ? ' is-bad' : ''}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: (index % 2) * 0.06, type: 'spring', stiffness: 260, damping: 26 }}
    >
      <button type="button" className="ok-dish-hit lg-press" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'item', id: item.id } })}>
        <span className="ok-dish-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foodSrc(item.id, true)} alt="" loading="lazy" draggable={false} />
          <span className="ok-dish-tags">
            {badge && <span className="ok-tag">{badge}</span>}
            {item.has3D && <span className="ok-tag is-3d"><Box size={11} strokeWidth={2.6} />3D</span>}
            {item.adultsOnly && <span className="ok-tag">{t.menu.adults}</span>}
          </span>
          <span className="ok-dish-fit"><FitPill fit={fit} t={t} /></span>
        </span>
        <span className="ok-dish-body">
          <b className="ok-dish-name">{item.name[state.lang]}</b>
          <small className="ok-dish-sub">{sub}</small>
          <span className="ok-dish-meta">
            <Price krw={priceFor(item, sel)} country={state.country} lang={state.lang} size="sm" />
            {spiceFor(item, sel) > 0 && <SpiceMeter level={spiceFor(item, sel)} compact />}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="ok-dish-add lg lg-press"
        aria-label={`${t.common.add} ${item.name[state.lang]}`}
        onClick={() => {
          dispatch({ type: 'add', id: item.id, sel })
          dispatch({ type: 'toast', text: `${item.name[state.lang]} · ${t.ai.added}` })
        }}
      >
        <Plus size={20} strokeWidth={2.8} />
      </button>
    </motion.article>
  )
}

function PickCard({ card, index }: { card: AiCard; index: number }) {
  const { state, dispatch, t } = useOrder()
  const item = MENU.find((m) => m.id === card.id)
  if (!item) return null
  return (
    <motion.article
      className="ok-pick"
      initial={{ opacity: 0, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.08, type: 'spring', stiffness: 240, damping: 24 }}
    >
      <button type="button" className="ok-pick-hit lg-press" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'item', id: item.id, sel: card.sel } })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foodSrc(item.id)} alt="" draggable={false} />
        <span className="ok-pick-shade" />
        <span className="ok-pick-rank">{index + 1}</span>
        {item.has3D && <span className="ok-tag is-3d ok-pick-3d"><Box size={11} strokeWidth={2.6} />3D</span>}
        <span className="ok-pick-body">
          <span className="ok-pick-reason"><Sparkles size={13} strokeWidth={2.4} />{card.reason}</span>
          <b>{item.name[state.lang]}</b>
          <Price krw={priceFor(item, card.sel)} country={state.country} lang={state.lang} size="sm" />
        </span>
      </button>
      <button
        type="button"
        className="ok-dish-add lg lg-press"
        aria-label={`${t.common.add} ${item.name[state.lang]}`}
        onClick={() => {
          dispatch({ type: 'add', id: item.id, sel: card.sel })
          dispatch({ type: 'toast', text: `${item.name[state.lang]} · ${t.ai.added}` })
        }}
      >
        <Plus size={20} strokeWidth={2.8} />
      </button>
    </motion.article>
  )
}

function FilterChips() {
  const { state, dispatch, t } = useOrder()
  const { profile } = state
  const edit = () => dispatch({ type: 'sheet', sheet: { kind: 'prefs' } })
  return (
    <div className="ok-chips-row ok-filter-row">
      <button type="button" className="ok-chip is-edit lg-press" onClick={edit}>
        <SlidersHorizontal size={15} strokeWidth={2.4} /> {hasConstraints(profile) ? t.menu.filters : t.menu.noFilters}
      </button>
      {profile.diets.map((d) => (
        <button key={d} type="button" className="ok-chip is-on lg-press" onClick={() => dispatch({ type: 'profile', patch: { diets: profile.diets.filter((x) => x !== d) } })}>
          <DietIcon id={d} size={15} /> {t.diets[d]} <X size={13} strokeWidth={2.6} />
        </button>
      ))}
      {profile.allergens.map((a) => (
        <button key={a} type="button" className="ok-chip is-on is-allergen lg-press" onClick={() => dispatch({ type: 'profile', patch: { allergens: profile.allergens.filter((x) => x !== a) } })}>
          <AllergenIcon id={a} size={15} /> {t.allergens[a]} <X size={13} strokeWidth={2.6} />
        </button>
      ))}
      <button type="button" className="ok-chip lg-press" onClick={edit}>
        <Flame size={14} strokeWidth={2.4} /> ≤ {t.spiceLevels[profile.spiceMax]}
      </button>
    </div>
  )
}

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : 'evening'
}

export function MenuScreen() {
  const { state, dispatch, t } = useOrder()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<CategoryId>(CATEGORIES[0].id)
  const picks = useMemo(
    () => recommendPicks({ lang: state.lang, country: state.country, profile: state.profile }),
    [state.lang, state.country, state.profile],
  )
  const { total, count } = cartTotals(state.cart)

  // 보이는 분류에 맞춰 탭 표시를 옮긴다
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const heads = [...root.querySelectorAll<HTMLElement>('[data-cat]')]
    const onScroll = () => {
      const top = root.scrollTop + 170
      let current = heads[0]?.dataset.cat
      for (const h of heads) if (h.offsetTop <= top) current = h.dataset.cat
      if (current) setActive(current as CategoryId)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id: CategoryId) => {
    const root = scrollRef.current
    const el = root?.querySelector<HTMLElement>(`[data-cat="${id}"]`)
    if (root && el) root.scrollTo({ top: el.offsetTop - 118, behavior: 'smooth' })
    setActive(id)
  }

  return (
    <div className="ok-menu">
      <div className="ok-menu-scroll" ref={scrollRef}>
        <header className="ok-menu-top">
          <div className="ok-menu-title">
            <span className="ok-eyebrow">{t.menu.greeting[greetingKey()]}</span>
            <h1>{t.menu.title}</h1>
          </div>
          <button type="button" className="ok-langpill lg lg-press" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'lang' } })} aria-label={t.lang.title}>
            {state.country && <Flag code={state.country.code} size={24} />}
            <b>{state.lang.toUpperCase()}</b>
            <ChevronDown size={16} strokeWidth={2.6} />
          </button>
        </header>
        <FilterChips />

        <section className="ok-picks">
          <div className="ok-picks-head">
            <h2 className="ok-ai-title"><Sparkles size={18} strokeWidth={2.4} />{t.menu.forYou}</h2>
            <p>{t.menu.forYouSub}</p>
          </div>
          <div className="ok-picks-row">
            {picks.map((card, i) => <PickCard key={`${card.id}-${state.profile.diets.join()}-${state.profile.allergens.join()}`} card={card} index={i} />)}
          </div>
        </section>

        <nav className="ok-tabs lg lg-strong" aria-label="categories">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`lg-press${active === c.id ? ' is-on' : ''}`} onClick={() => jump(c.id)}>
              {c.label[state.lang]}
              {active === c.id && <motion.i layoutId="ok-tab-thumb" className="ok-tab-thumb" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            </button>
          ))}
        </nav>

        {CATEGORIES.map((c) => {
          const items = MENU.filter((m) => m.category === c.id)
          if (!items.length) return null
          return (
            <section key={c.id} className="ok-cat" data-cat={c.id}>
              <h2 className="ok-cat-title">{c.label[state.lang]}<small>{t.common.count(items.length)}</small></h2>
              <div className="ok-dish-grid">
                {items.map((item, i) => <DishCard key={item.id} item={item} index={i} />)}
              </div>
            </section>
          )
        })}
        <p className="ok-menu-end">MORAK · {t.item.fitOkNone}</p>
      </div>

      <Dock total={total} count={count} />
    </div>
  )
}

function Dock({ total, count }: { total: number; count: number }) {
  const { state, dispatch, t } = useOrder()
  const [hint, setHint] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setHint((v) => (v + 1) % t.ai.suggestions.length), 3200)
    return () => window.clearInterval(id)
  }, [t])
  // 담을 때마다 장바구니 버튼이 한 번 튄다 — 이전 개수를 상태로 들고 비교한다
  const [bump, setBump] = useState(0)
  const [prevCount, setPrevCount] = useState(count)
  if (count !== prevCount) {
    if (count > prevCount) setBump(bump + 1)
    setPrevCount(count)
  }

  return (
    <div className="ok-dock">
      <button type="button" className="ok-dock-ai lg lg-strong lg-press" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'ai' } })}>
        <AiOrb size={44} />
        <span>
          <b>{t.menu.ask}</b>
          <AnimatePresence mode="wait">
            <motion.small key={`${state.lang}-${hint}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              “{t.ai.suggestions[hint]}”
            </motion.small>
          </AnimatePresence>
        </span>
      </button>
      <motion.button
        type="button"
        key={bump}
        className={`ok-dock-cart lg lg-press${count ? ' is-full' : ''}`}
        onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'cart' } })}
        animate={bump ? { scale: [1, 1.08, 0.97, 1] } : undefined}
        transition={{ duration: 0.45 }}
      >
        <span className="ok-dock-bag">
          <ShoppingBag size={24} strokeWidth={2.2} />
          {count > 0 && <i><RollingNumber value={count} /></i>}
        </span>
        <span>
          <b>{t.menu.cart}</b>
          <small>{count ? `₩${total.toLocaleString('en-US')}` : t.menu.emptyCart}</small>
        </span>
      </motion.button>
    </div>
  )
}
