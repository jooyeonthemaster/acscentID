'use client'

// 나라를 고른 뒤 2~3초 — 그 나라 말 인사가 크게 뜨고, AI 가 메뉴를 그 언어·통화·입맛으로 맞추는 단계를 보여 준다.

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { countryName } from '@/lib/kiosk/order/format'
import { MENU } from '@/lib/kiosk/order/menu'
import { useOrder } from '../store'
import { Flag } from '../ui'

const STEP_MS = 520

export function Preparing() {
  const { state, dispatch, t } = useOrder()
  const country = state.country
  const [done, setDone] = useState(0)

  const steps = t.preparing.steps(MENU.length, country?.currency.code ?? 'KRW', countryName(country, state.lang))

  useEffect(() => {
    const timers = steps.map((_, i) => window.setTimeout(() => setDone(i + 1), 700 + STEP_MS * (i + 1)))
    timers.push(window.setTimeout(() => dispatch({ type: 'go', screen: 'prefs' }), 700 + STEP_MS * (steps.length + 1) + 250))
    return () => timers.forEach((id) => window.clearTimeout(id))
    // 한 번만 — 단계 문구는 언어가 바뀌지 않는 한 같다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  if (!country) return null
  return (
    <div className="ok-prep">
      <motion.div className="ok-prep-flag" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
        <span className="ok-prep-ring" aria-hidden="true" />
        <Flag code={country.code} size={132} />
      </motion.div>
      <motion.h1
        className="ok-prep-greet"
        dir="auto"
        initial={{ opacity: 0, y: 20, filter: 'blur(12px)', letterSpacing: '0.12em' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '-0.02em' }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {country.greeting}
      </motion.h1>
      <motion.p className="ok-prep-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
        {t.preparing.title(t.langLabel)}
      </motion.p>
      <ul className="ok-prep-steps lg">
        {steps.map((s, i) => (
          <motion.li key={s} className={i < done ? 'is-done' : i === done ? 'is-active' : ''} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }}>
            <span className="ok-prep-tick">{i < done ? <Check size={15} strokeWidth={3} /> : <i />}</span>
            {s}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
