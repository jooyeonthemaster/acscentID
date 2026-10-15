'use client'

// 손님이 떠난 화면 정리 — 한동안 손대지 않으면 가운데 안내창을 띄우고, 그래도 없으면 처음으로(장바구니·조건·대화 모두 지움).
// 대기 화면·준비 연출·완료 화면(자기 시계가 있다)에서는 세지 않는다. AI 창이 열려 답을 쓰는 동안도 멈춘다.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useOrder } from './store'

const SILENT_S = 45
const WARN_S = 12

export function IdleGuard({ onReset }: { onReset: () => void }) {
  const { state, t } = useOrder()
  const [warn, setWarn] = useState<number | null>(null)
  const last = useRef(0)
  // 결제 화면도 센다(결제 연출은 5초라 걸리지 않는다) — 수단을 고르다 떠난 손님의 장바구니가 남지 않게
  const watching = !['attract', 'preparing', 'done'].includes(state.screen)
  const thinking = state.sheet?.kind === 'ai' && state.chat.some((m) => m.pending)

  useEffect(() => {
    const touch = () => { last.current = Date.now(); setWarn(null) }
    window.addEventListener('pointerdown', touch, true)
    window.addEventListener('keydown', touch, true)
    return () => {
      window.removeEventListener('pointerdown', touch, true)
      window.removeEventListener('keydown', touch, true)
    }
  }, [])

  // 화면·시트가 바뀌면 손님이 움직인 것 — 시계를 다시 채운다(안내창은 다음 확인 때 걷힌다)
  useEffect(() => {
    last.current = Date.now()
  }, [state.screen, state.sheet])

  useEffect(() => {
    if (!watching) return
    const id = window.setInterval(() => {
      if (thinking) { last.current = Date.now(); return }
      const quiet = (Date.now() - last.current) / 1000
      if (quiet >= SILENT_S + WARN_S) { setWarn(null); onReset(); return }
      setWarn(quiet >= SILENT_S ? Math.ceil(SILENT_S + WARN_S - quiet) : null)
    }, 250)
    return () => window.clearInterval(id)
  }, [watching, thinking, onReset])

  return (
    <AnimatePresence>
      {watching && warn !== null && (
        <motion.div key="idle" className="ok-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="ok-idle lg lg-strong" role="alertdialog" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
            <span className="ok-idle-ring" style={{ ['--p' as string]: warn / WARN_S }}><b>{warn}</b></span>
            <h2>{t.idle.title}</h2>
            <p>{t.idle.sub(warn)}</p>
            <div className="ok-idle-actions">
              <button type="button" className="ok-btn ok-btn--ghost lg-press" onClick={() => { setWarn(null); onReset() }}>{t.idle.reset}</button>
              <button type="button" className="ok-btn ok-btn--primary lg-press" onClick={() => { last.current = Date.now(); setWarn(null) }}>{t.idle.stay}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
