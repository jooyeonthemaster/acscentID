'use client'

// Aible AI 주문 키오스크 — 외국인 관광객용 매장 주문 화면(가상 매장 '모락 MORAK' 레퍼런스).
// 화면은 560×996(매장 키오스크 1080×1920 의 CSS 크기)으로 그리고, 다른 크기의 화면에서는 9:16 무대째 비율을 맞춰 키운다.
// 움직임은 prefers-reduced-motion 을 따르지 않는다 — 매장 PC 는 윈도우 애니메이션이 꺼져 있어 늘 reduce 로 알린다.

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Wifi } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { notoSansJP } from '../fonts'
import { AdminGate } from './AdminGate'
import { IdleGuard } from './IdleGuard'
import { Attract } from './screens/Attract'
import { CartSheet } from './screens/CartSheet'
import { CountryScreen, LangSheet } from './screens/CountryPicker'
import { Done } from './screens/Done'
import { ItemSheet } from './screens/ItemSheet'
import { MenuScreen } from './screens/Menu'
import { Pay } from './screens/Pay'
import { Preparing } from './screens/Preparing'
import { PrefsScreen, PrefsSheet } from './screens/Prefs'
import { OrderProvider, useOrder } from './store'
import { usePressGlow } from './ui'
import './order.css'

// 대화 창과 3D 보기는 처음 열 때 싣는다 — 첫 화면을 가볍게
const Concierge = dynamic(() => import('./screens/Concierge').then((m) => m.Concierge), { ssr: false })
const ArViewer = dynamic(() => import('./screens/ArViewer').then((m) => m.ArViewer), { ssr: false })

const STAGE_W = 560
const STAGE_H = 996

/**
 * 무대 크기 — 매장 키오스크(560×996)와 PC 브라우저는 9:16 그대로 가운데에 놓고,
 * 9:16 보다 세로로 긴 화면(휴대폰 웹)은 폭에 맞춘 뒤 무대 높이를 늘려 화면을 꽉 채운다.
 */
function useStage(box: React.RefObject<HTMLDivElement | null>) {
  const [stage, setStage] = useState({ scale: 1, height: STAGE_H, phone: false })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    // 아이폰 노치·홈 막대를 뺀 안전 영역(.ok-viewport-safe)의 크기에 맞춘다
    const fit = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      if (w / h < STAGE_W / STAGE_H - 0.01) {
        const scale = w / STAGE_W
        setStage({ scale, height: Math.round(h / scale), phone: true })
      } else setStage({ scale: h / STAGE_H, height: STAGE_H, phone: false })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [box])
  return stage
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return <span className="ok-status-time">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
}

const SCREENS = {
  attract: Attract,
  country: CountryScreen,
  preparing: Preparing,
  prefs: PrefsScreen,
  menu: MenuScreen,
  pay: Pay,
  done: Done,
} as const

function Shell() {
  const { state, dispatch } = useOrder()
  const stageRef = useRef<HTMLDivElement>(null)
  usePressGlow(stageRef)
  const Screen = SCREENS[state.screen]
  // 대화 창은 처음 열 때 싣고, 대화가 남아 있는 동안은 붙여 둔다(닫히는 움직임까지 보이게)
  const aiLoaded = state.sheet?.kind === 'ai' || state.chat.length > 0

  const reset = useCallback(() => dispatch({ type: 'reset' }), [dispatch])

  return (
    <div
      ref={stageRef}
      className={`ok-stage ${notoSansJP.variable}`}
      data-lang={state.lang}
      data-screen={state.screen}
      lang={state.lang}
    >
      <div className="ok-ambient" aria-hidden="true">
        <i className="ok-blob ok-blob--a" />
        <i className="ok-blob ok-blob--b" />
        <i className="ok-blob ok-blob--c" />
        <i className="ok-grain" />
      </div>

      <header className="ok-status" aria-hidden="true">
        <Clock />
        <span className="ok-status-store">MORAK · 모락</span>
        <span className="ok-status-icons"><Wifi size={14} strokeWidth={2.6} /><i className="ok-status-battery" /></span>
      </header>

      <AnimatePresence initial={false}>
        <motion.main
          key={`${state.session}-${state.screen}`}
          className="ok-screen"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Screen />
        </motion.main>
      </AnimatePresence>

      <ItemSheet />
      <CartSheet />
      <LangSheet />
      <PrefsSheet />
      {aiLoaded && <Concierge key={state.session} />}
      {state.arId && <ArViewer />}

      <Toast />
      <IdleGuard onReset={reset} />
      <AdminGate key={state.session} onReset={reset} />
    </div>
  )
}

function Toast() {
  const { state } = useOrder()
  // 2.2초 뒤 그 알림 번호를 '본 것'으로 — 새 알림이 오면 다시 보인다
  const [doneId, setDoneId] = useState(0)
  useEffect(() => {
    if (!state.toast) return
    const toastId = state.toast.id
    const id = window.setTimeout(() => setDoneId(toastId), 2200)
    return () => window.clearTimeout(id)
  }, [state.toast])
  const shown = state.toast && state.toast.id !== doneId ? state.toast : null
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.id}
          className="ok-toast lg lg-strong"
          role="status"
          initial={{ y: -30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          {shown.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OrderKiosk() {
  const safeRef = useRef<HTMLDivElement>(null)
  const { scale, height, phone } = useStage(safeRef)
  // 키오스크 화면은 끌어서 확대·문자 선택·우클릭 메뉴가 없어야 한다
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', block)
    document.addEventListener('gesturestart', block)
    const prevBg = document.body.style.background
    document.body.style.background = '#0b0806'
    return () => {
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('gesturestart', block)
      document.body.style.background = prevBg
    }
  }, [])
  return (
    <MotionConfig reducedMotion="never">
      <OrderProvider>
        <div className="ok-viewport" data-fit={phone ? 'phone' : 'kiosk'}>
          <div className="ok-viewport-bg" aria-hidden="true" />
          <div className="ok-viewport-safe" ref={safeRef}>
            <div className="ok-stage-frame" style={{ height, transform: `translate(-50%, -50%) scale(${scale})` }}>
              <Shell />
            </div>
          </div>
        </div>
      </OrderProvider>
    </MotionConfig>
  )
}
