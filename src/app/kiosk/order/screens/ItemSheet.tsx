'use client'

// 메뉴 상세 — 사진·3D 보기·내 조건과의 궁합(바꿀 옵션까지)·사장님 한마디·숨은 재료·알레르기 14종·나라별 주문 비율·AI 질문.

import { motion } from 'framer-motion'
import { AlertTriangle, Box, ChefHat, Clock, Flame, ShieldCheck, Snowflake, Sparkles, ThermometerSun, Users, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { insightFor } from '@/lib/kiosk/order/ai-engine'
import { allergensFor, conflictsFor, defaultSelection, fitFor, hasConstraints, ingredientsFor, priceFor, spiceFor, type Selection } from '@/lib/kiosk/order/diet'
import { countryName, foodSrc, won } from '@/lib/kiosk/order/format'
import { INGREDIENTS, menuItem } from '@/lib/kiosk/order/menu'
import { countryByCode } from '@/lib/kiosk/order/countries'
import { ALLERGEN_IDS, type MenuItem } from '@/lib/kiosk/order/types'
import { useOrder } from '../store'
import { AiOrb, AllergenIcon, BottomSheet, CloseButton, Flag, Price, SpiceMeter, Stepper } from '../ui'
import { conflictText } from './Menu'

function ItemDetail({ item, initialSel, onClose }: { item: MenuItem; initialSel?: Selection; onClose: () => void }) {
  const { state, dispatch, t } = useOrder()
  const { profile, lang, country } = state
  const [sel, setSel] = useState<Selection>(initialSel ?? defaultSelection(item))
  const [qty, setQty] = useState(1)
  const [flash, setFlash] = useState(false)
  const fit = fitFor(item, profile, sel)
  const conflicts = conflictsFor(item, sel, profile)
  const spice = spiceFor(item, sel)
  const ingredients = ingredientsFor(item, sel)
  const allergens = allergensFor(item, sel)
  const price = priceFor(item, sel)
  const constrained = hasConstraints(profile)

  const apply = (next: Selection) => {
    setSel(next)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 900)
  }

  const ask = (q: string) => {
    dispatch({ type: 'focus-dish', id: item.id })
    dispatch({ type: 'sheet', sheet: { kind: 'ai', ask: q } })
  }

  const banner = (() => {
    if (conflicts.length && fit.fix) {
      return (
        <div className="ok-banner is-warn">
          <Wand2 size={22} strokeWidth={2.2} />
          <div>
            <b>{t.item.fitAdjust}</b>
            <p>{conflicts.map((c) => `${conflictText(c, t)} — ${INGREDIENTS[c.ingredient]?.name[lang]}`).join(' · ')}</p>
            <p className="ok-banner-fix">→ {fit.fixChanges.map((c) => `${c.group.label[lang]}: ${c.choice.label[lang]}`).join(' · ')}</p>
          </div>
          <button type="button" className="ok-btn ok-btn--small lg-press" onClick={() => apply(fit.fix!)}>{t.item.apply}</button>
        </div>
      )
    }
    if (conflicts.length) {
      return (
        <div className="ok-banner is-bad">
          <AlertTriangle size={22} strokeWidth={2.2} />
          <div>
            <b>{t.item.fitConflict}</b>
            {conflicts.map((c) => {
              const ing = INGREDIENTS[c.ingredient]
              return <p key={`${c.kind}-${c.ingredient}`}>{conflictText(c, t)} — {ing?.name[lang]}{ing?.hidden && ing.hiddenNote ? ` (${ing.hiddenNote[lang]})` : ''}</p>
            })}
          </div>
        </div>
      )
    }
    if (fit.tooSpicy) {
      return (
        <div className="ok-banner is-hot">
          <Flame size={22} strokeWidth={2.2} />
          <div>
            <b>{t.item.tooSpicy}</b>
            <p>{t.spiceLevels[spice]} · ≤ {t.spiceLevels[profile.spiceMax]}</p>
          </div>
          {fit.milder && <button type="button" className="ok-btn ok-btn--small lg-press" onClick={() => apply(fit.milder!)}>{t.item.milder}</button>}
        </div>
      )
    }
    return (
      <div className={`ok-banner is-ok${flash ? ' is-flash' : ''}`}>
        <ShieldCheck size={22} strokeWidth={2.2} />
        <div>
          <b>{flash ? t.item.applied : constrained ? t.item.fitOk : t.item.fitOkNone}</b>
          {constrained && <p>{[...profile.diets.map((d) => t.diets[d]), ...profile.allergens.map((a) => t.allergens[a])].join(' · ')} ✓</p>}
        </div>
      </div>
    )
  })()

  return (
    <>
      <div className="ok-item-scroll">
        <div className="ok-item-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foodSrc(item.id)} alt="" draggable={false} />
          <span className="ok-item-photo-shade" />
          <div className="ok-item-photo-bar">
            <CloseButton onClick={onClose} label={t.common.close} />
            {item.has3D && (
              <button type="button" className="ok-pill ok-pill--3d lg lg-press" onClick={() => dispatch({ type: 'ar', id: item.id })}>
                <Box size={18} strokeWidth={2.2} /> {t.item.view3d}
              </button>
            )}
          </div>
        </div>

        <div className="ok-item-body">
          <header className="ok-item-head">
            <h2>{item.name[lang]}</h2>
            <p className="ok-item-sub">{item.romanized} · <span lang="ko">{item.name.ko}</span></p>
            <p className="ok-item-tagline">{item.tagline[lang]}</p>
            <div className="ok-item-price">
              <Price krw={price} country={country} lang={lang} size="lg" />
              {price !== item.price && <span className="ok-item-delta">+{won(price - item.price)}</span>}
            </div>
          </header>

          <motion.div key={`${fit.status}-${conflicts.length}-${fit.tooSpicy}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {banner}
          </motion.div>

          <div className="ok-facts">
            <span className="ok-fact"><SpiceMeter level={spice} label={t.spiceLevels[spice]} /></span>
            <span className="ok-fact">{item.temperature === 'cold' ? <Snowflake size={15} /> : <ThermometerSun size={15} />}{item.temperature === 'cold' ? t.item.cold : t.item.hot}</span>
            <span className="ok-fact"><Users size={15} />{t.common.serves(item.servings)}</span>
            <span className="ok-fact"><Clock size={15} />{t.common.minutes(item.prepMinutes)}</span>
            <span className="ok-fact">{t.common.kcal(item.kcal)}</span>
          </div>

          <p className="ok-insight"><Sparkles size={15} strokeWidth={2.4} />{insightFor(item.id, { lang, country, profile })}</p>
          {item.adultsOnly && <p className="ok-note-line">{t.item.adults}</p>}

          {item.options?.map((group) => (
            <section key={group.id} className="ok-opt">
              <h3 className="ok-section-label">{group.label[lang]}</h3>
              <div className="ok-opt-row">
                {group.choices.map((c) => {
                  const on = (sel[group.id] ?? group.defaultChoice) === c.id
                  return (
                    <button key={c.id} type="button" className={`ok-opt-choice lg-press${on ? ' is-on' : ''}`} onClick={() => setSel({ ...sel, [group.id]: c.id })}>
                      <span>{c.label[lang]}</span>
                      {c.priceDelta ? <small>+{won(c.priceDelta)}</small> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          <section className="ok-item-section">
            <h3 className="ok-section-label">{t.item.about}</h3>
            <p className="ok-prose">{item.description[lang]}</p>
          </section>

          <section className="ok-chef lg">
            <span className="ok-chef-avatar"><ChefHat size={22} strokeWidth={2} /></span>
            <div>
              <h3>{t.item.chefNote}</h3>
              <p>“{item.ownerNote[lang]}”</p>
              <small>— {t.item.chefName}</small>
            </div>
          </section>

          <section className="ok-item-section">
            <h3 className="ok-section-label">{t.item.howToEat}</h3>
            <p className="ok-prose">{item.howToEat[lang]}</p>
          </section>

          <section className="ok-item-section">
            <h3 className="ok-section-label">{t.item.ingredients}</h3>
            <div className="ok-ing-list">
              {ingredients.map((id) => {
                const ing = INGREDIENTS[id]
                const hit = conflicts.some((c) => c.ingredient === id)
                return (
                  <span key={id} className={`ok-ing${ing.hidden ? ' is-hidden' : ''}${hit ? ' is-hit' : ''}`}>
                    {ing.name[lang]}
                    {ing.hidden && <em>{t.item.hidden}</em>}
                  </span>
                )
              })}
            </div>
            {ingredients.some((id) => INGREDIENTS[id].hidden && INGREDIENTS[id].hiddenNote) && (
              <ul className="ok-hidden-notes">
                {ingredients.filter((id) => INGREDIENTS[id].hidden && INGREDIENTS[id].hiddenNote).map((id) => (
                  <li key={id}><b>{INGREDIENTS[id].name[lang]}</b> — {INGREDIENTS[id].hiddenNote![lang]}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="ok-item-section">
            <h3 className="ok-section-label">{t.item.allergens}</h3>
            {allergens.length === 0 && <p className="ok-note-line is-ok">{t.item.noAllergens}</p>}
            <div className="ok-allergen-map">
              {ALLERGEN_IDS.map((id) => {
                const has = allergens.includes(id)
                const mine = profile.allergens.includes(id)
                return (
                  <span key={id} className={`ok-amap${has ? ' is-has' : ''}${has && mine ? ' is-mine' : ''}`}>
                    <AllergenIcon id={id} size={20} />
                    <small>{t.allergens[id]}</small>
                  </span>
                )
              })}
            </div>
          </section>

          {item.lovedBy.length > 0 && (
            <section className="ok-item-section">
              <h3 className="ok-section-label">{t.item.lovedBy}</h3>
              <div className="ok-loved">
                {item.lovedBy.map((l) => {
                  const c = countryByCode(l.country)
                  return (
                    <div key={l.country} className={`ok-loved-row${c && c.code === country?.code ? ' is-me' : ''}`}>
                      <Flag code={l.country.toLowerCase()} size={22} />
                      <span>{c ? countryName(c, lang) : l.country}</span>
                      <i><motion.b initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, l.pct * 2)}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} /></i>
                      <em>{l.pct}%</em>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="ok-item-section">
            <h3 className="ok-section-label"><AiOrb size={18} /> {t.item.ask}</h3>
            <div className="ok-ask-chips">
              {t.item.askChips.map((q) => (
                <button key={q} type="button" className="ok-chip lg-press" onClick={() => ask(q)}>{q}</button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="ok-item-foot">
        <Stepper value={qty} min={1} onChange={setQty} label="quantity" />
        <button
          type="button"
          className={`ok-btn ok-btn--primary ok-btn--grow lg-press${conflicts.length ? ' is-caution' : ''}`}
          onClick={() => {
            dispatch({ type: 'add', id: item.id, sel, qty })
            dispatch({ type: 'toast', text: `${item.name[lang]} ×${qty} · ${t.ai.added}` })
            onClose()
          }}
        >
          {t.item.add(won(price * qty))}
        </button>
      </footer>
    </>
  )
}

export function ItemSheet() {
  const { state, dispatch } = useOrder()
  const sheet = state.sheet?.kind === 'item' ? state.sheet : null
  const item = sheet ? menuItem(sheet.id) : undefined
  // 닫히는 동안에도 내용을 그대로 그린다 — 마지막으로 연 메뉴를 기억해 둔다
  const [shown, setShown] = useState<{ item: MenuItem; sel?: Selection } | null>(null)
  if (item && (shown?.item !== item || shown?.sel !== sheet?.sel)) setShown({ item, sel: sheet?.sel })
  const close = () => dispatch({ type: 'sheet', sheet: null })
  useEffect(() => {
    if (!item) return
    const el = document.querySelector('.ok-item-scroll')
    el?.scrollTo({ top: 0 })
  }, [item])
  return (
    <BottomSheet open={!!item} onClose={close} label={shown?.item.name.en ?? ''} className="ok-sheet--item" height="95%">
      {shown && <ItemDetail key={`${shown.item.id}-${JSON.stringify(shown.sel ?? {})}`} item={shown.item} initialSel={shown.sel} onClose={close} />}
    </BottomSheet>
  )
}
