'use client'

// 나라 고르기 — 200여 나라가 다 있는 것처럼 보이지만, 고르면 그 나라에 맞는 화면 언어(ko/en/ja/fr)로 이어진다.
// 영어로 나라 이름을 치면 맨 위 후보 나라의 인사말이 제목 자리에 바로 떠오른다.

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Globe2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { COUNTRIES, COUNTRY_COUNT, KOREA_CODE, countryByCode, searchCountries } from '@/lib/kiosk/order/countries'
import { WHERE_FROM } from '@/lib/kiosk/order/i18n'
import type { Country, Region } from '@/lib/kiosk/order/types'
import { useOrder } from '../store'
import { TouchKeyboard } from '../TouchKeyboard'
import { BottomSheet, CloseButton, Flag } from '../ui'

const REGIONS: { id: Region | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'asia', label: 'Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'americas', label: 'Americas' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'africa', label: 'Africa' },
  { id: 'oceania', label: 'Oceania' },
]

const FEATURED = COUNTRIES.filter((c) => c.featured).sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0))

function CountryPicker({ onPick, onBack, inSheet }: { onPick: (c: Country) => void; onBack?: () => void; inSheet?: boolean }) {
  const { state } = useOrder()
  const [query, setQuery] = useState('')
  const [typing, setTyping] = useState(false)
  const [browse, setBrowse] = useState(false)
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [titleIdx, setTitleIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const results = useMemo(() => (query.trim() ? searchCountries(query).slice(0, 40) : []), [query])
  const preview = results[0]

  useEffect(() => {
    if (preview) return
    const id = window.setInterval(() => setTitleIdx((v) => (v + 1) % WHERE_FROM.length), 2600)
    return () => window.clearInterval(id)
  }, [preview])

  const pick = (c: Country) => {
    if (picked) return
    setPicked(c.code)
    // 고른 칸이 한 번 반짝인 뒤 넘어간다
    window.setTimeout(() => onPick(c), 260)
  }

  const list = browse ? COUNTRIES.filter((c) => region === 'all' || c.region === region) : []
  const title = WHERE_FROM[titleIdx]

  return (
    <div className={`ok-country${typing ? ' is-typing' : ''}${inSheet ? ' is-sheet' : ''}`}>
      <div className="ok-country-head">
        <div className="ok-country-bar">
          {onBack ? (
            <button type="button" className="ok-iconbtn lg lg-press" onClick={onBack} aria-label="Back"><ChevronLeft size={24} strokeWidth={2.4} /></button>
          ) : <span />}
          {!inSheet && (
            <button type="button" className="ok-pill lg lg-press" onClick={() => pick(countryByCode(KOREA_CODE)!)}>
              <Flag code={KOREA_CODE} size={20} /> 한국어로 주문
            </button>
          )}
        </div>

        <div className="ok-country-title" aria-live="polite">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div key={`p-${preview.code}`} className="ok-country-preview" initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }} transition={{ duration: 0.35 }}>
                <Flag code={preview.code} size={54} className="is-glow" />
                <div>
                  <h1 dir="auto">{preview.greeting}</h1>
                  <p>{preview.name} · <span dir="auto">{preview.native}</span></p>
                </div>
              </motion.div>
            ) : (
              <motion.h1 key={`t-${titleIdx}`} lang={title.lang} initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }} transition={{ duration: 0.45 }}>
                {title.text}
              </motion.h1>
            )}
          </AnimatePresence>
          {!preview && <p className="ok-country-sub">Choose your country — the menu, AI concierge and prices switch to your language.</p>}
        </div>

        <button type="button" className={`ok-search lg lg-press${typing ? ' is-active' : ''}`} onClick={() => setTyping(true)}>
          <Search size={20} strokeWidth={2.4} />
          <span className={query ? 'ok-search-value' : 'ok-search-placeholder'}>
            {query || 'Type your country in English'}
            {typing && <i className="ok-caret" />}
          </span>
          {query && (
            <span
              role="button"
              tabIndex={-1}
              className="ok-search-clear"
              onClick={(e) => { e.stopPropagation(); setQuery('') }}
              aria-label="Clear"
            >
              <X size={18} strokeWidth={2.6} />
            </span>
          )}
        </button>
      </div>

      <div className="ok-country-body">
        {query.trim() ? (
          results.length ? (
            <ul className="ok-country-list">
              {results.map((c, n) => (
                <CountryRow key={c.code} c={c} top={n === 0} picked={picked === c.code} current={state.country?.code === c.code} onPick={pick} />
              ))}
            </ul>
          ) : (
            <p className="ok-country-empty">No match — try the English name, e.g. “Japan”, “France”.</p>
          )
        ) : browse ? (
          <>
            <div className="ok-chips-row">
              {REGIONS.map((r) => (
                <button key={r.id} type="button" className={`ok-chip lg-press${region === r.id ? ' is-on' : ''}`} onClick={() => setRegion(r.id)}>{r.label}</button>
              ))}
            </div>
            <ul className="ok-country-list">
              {list.map((c) => <CountryRow key={c.code} c={c} picked={picked === c.code} current={state.country?.code === c.code} onPick={pick} />)}
            </ul>
          </>
        ) : (
          <>
            <p className="ok-section-label">Popular with our guests</p>
            <div className="ok-country-grid">
              {FEATURED.map((c, n) => (
                <motion.button
                  type="button"
                  key={c.code}
                  className={`ok-country-tile lg lg-press${picked === c.code ? ' is-picked' : ''}${state.country?.code === c.code ? ' is-current' : ''}`}
                  onClick={() => pick(c)}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.04 * n, type: 'spring', stiffness: 300, damping: 26 }}
                >
                  <Flag code={c.code} size={44} />
                  <b dir="auto">{c.native}</b>
                  <small>{c.native === c.name ? c.language : c.name}</small>
                </motion.button>
              ))}
            </div>
            <button type="button" className="ok-browse lg lg-press" onClick={() => setBrowse(true)}>
              <Globe2 size={20} strokeWidth={2.2} />
              <span>All {COUNTRY_COUNT} countries &amp; regions</span>
              <span className="ok-browse-flags" aria-hidden="true">
                {['de', 'es', 'it', 'br', 'in', 'au'].map((code) => <Flag key={code} code={code} size={22} />)}
              </span>
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {typing && (
          <motion.div key="kb" className="ok-country-kb" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }}>
            <div className="ok-kb-top">
              <span>{results.length ? `${results.length} found` : 'English names, e.g. Japan'}</span>
              <button type="button" className="ok-kb-done lg-press" onClick={() => setTyping(false)}>Done</button>
            </div>
            <TouchKeyboard layout="search" value={query} onChange={setQuery} onEnter={() => (preview ? pick(preview) : setTyping(false))} enterLabel={preview ? 'Go' : 'Done'} maxLength={28} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CountryRow({ c, top, picked, current, onPick }: { c: Country; top?: boolean; picked: boolean; current: boolean; onPick: (c: Country) => void }) {
  return (
    <li>
      <button type="button" className={`ok-country-row lg-press${top ? ' is-top' : ''}${picked ? ' is-picked' : ''}${current ? ' is-current' : ''}`} onClick={() => onPick(c)}>
        <Flag code={c.code} size={36} />
        <span className="ok-country-row-name">
          <b>{c.name}</b>
          <small dir="auto">{c.native}</small>
        </span>
        <span className="ok-country-row-lang" dir="auto">{c.language}</span>
      </button>
    </li>
  )
}

export function CountryScreen() {
  const { dispatch } = useOrder()
  return (
    <CountryPicker
      onBack={() => dispatch({ type: 'go', screen: 'attract' })}
      onPick={(country) => dispatch({ type: 'country', country })}
    />
  )
}

/** 메뉴 화면에서 언어·나라 바꾸기 — 장바구니와 조건은 그대로 둔다 */
export function LangSheet() {
  const { state, dispatch, t } = useOrder()
  const open = state.sheet?.kind === 'lang'
  const close = () => dispatch({ type: 'sheet', sheet: null })
  return (
    <BottomSheet open={open} onClose={close} label={t.lang.title} height="94%">
      <div className="ok-sheet-head">
        <h2>{t.lang.title}</h2>
        <CloseButton onClick={close} label={t.common.close} />
      </div>
      <CountryPicker
        inSheet
        onPick={(country) => {
          dispatch({ type: 'country', country, keepScreen: true })
          dispatch({ type: 'toast', text: `${country.greeting} · ${country.name}` })
        }}
      />
    </BottomSheet>
  )
}
