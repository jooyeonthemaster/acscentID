'use client'

// 맞춤 조건 — 식습관·종교, 알레르기(EU 14), 매운맛, 인원. 칩을 누를 때마다 '잘 맞는 메뉴 수'가 바로 바뀐다.
// 메뉴 화면에서는 같은 내용을 시트로 연다(PrefsSheet).

import { motion } from 'framer-motion'
import { Check, Flame, Users } from 'lucide-react'
import { DIET_IDS, fittingCount, toggleDiet, type Profile } from '@/lib/kiosk/order/diet'
import { countryName, spicePalate } from '@/lib/kiosk/order/format'
import { MENU } from '@/lib/kiosk/order/menu'
import { ALLERGEN_IDS, type SpiceLevel } from '@/lib/kiosk/order/types'
import { useOrder } from '../store'
import { AiOrb, AllergenIcon, BottomSheet, CloseButton, DietIcon, RollingNumber } from '../ui'

function FitCounter({ profile }: { profile: Profile }) {
  const { t } = useOrder()
  const n = fittingCount(profile)
  const all = n === MENU.length
  return (
    <div className="ok-fit-counter">
      <AiOrb size={30} />
      <RollingNumber value={all ? t.prefs.fitAll : t.prefs.fit(n, MENU.length)} className="ok-fit-text" />
    </div>
  )
}

function PrefsPanel() {
  const { state, dispatch, t } = useOrder()
  const { profile, country, lang } = state
  const set = (patch: Partial<Profile>) => dispatch({ type: 'profile', patch })
  const palate = spicePalate(country)
  const cname = countryName(country, lang)
  const note = palate === 'neutral' ? t.spiceNote.neutral : t.spiceNote[palate](cname)

  return (
    <div className="ok-prefs-body">
      <section>
        <h3 className="ok-section-label">{t.prefs.diet}</h3>
        <div className="ok-diet-grid">
          {DIET_IDS.map((id) => {
            const on = profile.diets.includes(id)
            return (
              <button key={id} type="button" className={`ok-diet lg lg-press${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => set({ diets: toggleDiet(profile.diets, id) })}>
                <DietIcon id={id} size={22} />
                <span>{t.diets[id]}</span>
                {on && <motion.i className="ok-check" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={12} strokeWidth={3.4} /></motion.i>}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="ok-section-label">{t.prefs.allergy} <small>EU 14</small></h3>
        <div className="ok-allergen-grid">
          {ALLERGEN_IDS.map((id) => {
            const on = profile.allergens.includes(id)
            return (
              <button
                key={id}
                type="button"
                className={`ok-allergen lg-press${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => set({ allergens: on ? profile.allergens.filter((a) => a !== id) : [...profile.allergens, id] })}
              >
                <span className="ok-allergen-icon"><AllergenIcon id={id} size={24} /></span>
                <span className="ok-allergen-label">{t.allergens[id]}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="ok-section-label"><Flame size={15} strokeWidth={2.4} /> {t.prefs.spice}</h3>
        <div className="ok-spice-pick lg">
          <div className="ok-spice-track" style={{ ['--lv' as string]: profile.spiceMax }}>
            <i className="ok-spice-fill" />
            {[0, 1, 2, 3, 4].map((lv) => (
              <button
                key={lv}
                type="button"
                className={`ok-spice-stop lg-press${lv <= profile.spiceMax ? ' is-on' : ''}${lv === profile.spiceMax ? ' is-current' : ''}`}
                onClick={() => set({ spiceMax: lv as SpiceLevel })}
                aria-label={t.spiceTolerance[lv]}
              >
                {lv === 0 ? <span className="ok-spice-zero">0</span> : Array.from({ length: lv }, (_, k) => <Flame key={k} size={lv > 2 ? 11 : 13} strokeWidth={2.6} />)}
              </button>
            ))}
          </div>
          <motion.p key={profile.spiceMax} className="ok-spice-choice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {t.spiceTolerance[profile.spiceMax]}
          </motion.p>
          <p className="ok-spice-note"><AiOrb size={18} /> {note}</p>
        </div>
      </section>

      <section>
        <h3 className="ok-section-label"><Users size={15} strokeWidth={2.4} /> {t.prefs.party}</h3>
        <div className="ok-segment lg">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" className={`lg-press${profile.party === n ? ' is-on' : ''}`} onClick={() => set({ party: n })}>
              {n === 6 ? t.prefs.partyPlus : n}
              {profile.party === n && <motion.i layoutId="ok-party-thumb" className="ok-segment-thumb" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export function PrefsScreen() {
  const { state, dispatch, t } = useOrder()
  const go = () => dispatch({ type: 'go', screen: 'menu' })
  return (
    <div className="ok-prefs">
      <header className="ok-prefs-head">
        <span className="ok-eyebrow">{t.prefs.eyebrow}</span>
        <h1>{t.prefs.title}</h1>
        <p>{t.prefs.sub}</p>
      </header>
      <div className="ok-prefs-scroll">
        <PrefsPanel />
      </div>
      <footer className="ok-prefs-foot lg lg-strong">
        <FitCounter profile={state.profile} />
        <div className="ok-prefs-actions">
          <button type="button" className="ok-btn ok-btn--ghost lg-press" onClick={go}>{t.common.skip}</button>
          <button type="button" className="ok-btn ok-btn--primary lg-press" onClick={go}>{t.prefs.cta}</button>
        </div>
      </footer>
    </div>
  )
}

export function PrefsSheet() {
  const { state, dispatch, t } = useOrder()
  const open = state.sheet?.kind === 'prefs'
  const close = () => dispatch({ type: 'sheet', sheet: null })
  return (
    <BottomSheet open={open} onClose={close} label={t.prefs.title} height="92%">
      <div className="ok-sheet-head">
        <h2>{t.prefs.title}</h2>
        <CloseButton onClick={close} label={t.common.close} />
      </div>
      <div className="ok-sheet-scroll">
        <PrefsPanel />
      </div>
      <footer className="ok-sheet-foot">
        <FitCounter profile={state.profile} />
        <button type="button" className="ok-btn ok-btn--primary lg-press" onClick={close}>{t.prefs.cta}</button>
      </footer>
    </BottomSheet>
  )
}
