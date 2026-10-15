'use client'

// 주문 완료 — 주문 번호, 준비 시간, 주방에 한국어로 넘긴 메모, 영수증(프린터가 있으면 바로 인쇄), 휴대폰 QR, 근처 관광지.
// 60초 뒤 저절로 처음 화면으로 돌아간다.

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChefHat, Footprints, Printer, RotateCcw, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { kitchenNote } from '@/lib/kiosk/order/kitchen'
import { STORE, menuItem } from '@/lib/kiosk/order/menu'
import { phonePayload, renderReceipt } from '@/lib/kiosk/order/receipt'
import { useOrder } from '../store'
import { CloseButton } from '../ui'

const AUTO_S = 60

function fontFamilies(): { base: string; ja: string } {
  const stage = document.querySelector('.ok-stage') ?? document.body
  const css = getComputedStyle(stage)
  const base = css.getPropertyValue('--font-heading-serif').trim() || 'Pretendard'
  const ja = css.getPropertyValue('--font-noto-jp').trim() || "'Noto Sans JP'"
  return { base, ja }
}

export function Done() {
  const { state, dispatch, t } = useOrder()
  const [left, setLeft] = useState(AUTO_S)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [print, setPrint] = useState<'idle' | 'printing' | 'printed' | 'failed'>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const orderNo = state.orderNo ?? 'A000'
  const ready = Math.max(8, ...state.cart.map((l) => menuItem(l.id)?.prepMinutes ?? 0))
  const note = kitchenNote(state.cart, state.profile, state.country, state.dineIn)

  const phoneUrl = useMemo(() => {
    const code = phonePayload({ orderNo, lang: state.lang, country: state.country, profile: state.profile, cart: state.cart, dineIn: state.dineIn })
    return `${window.location.origin}/kiosk/order/m?o=${code}`
  }, [orderNo, state.lang, state.country, state.profile, state.cart, state.dineIn])

  useEffect(() => {
    QRCode.toDataURL(phoneUrl, { margin: 1, width: 260, color: { dark: '#14100d', light: '#ffffff' } }).then(setQr).catch(() => setQr(null))
  }, [phoneUrl])

  // 영수증 원판을 만들고, 프린터가 달린 기기면 바로 찍는다
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const made = await renderReceipt({ orderNo, lang: state.lang, country: state.country, profile: state.profile, cart: state.cart, dineIn: state.dineIn, phoneUrl, fonts: fontFamilies() })
        if (!alive) return
        setReceipt(made.dataUrl)
        const kiosk = getKioskBridge()
        if (!kiosk?.hasPrinter) return
        setPrint('printing')
        const result = await kiosk.printReceipt({ receiptImageBase64: made.base64 })
        if (alive) setPrint(result.success ? 'printed' : 'failed')
      } catch (error) {
        console.error('[aible] 영수증을 만들지 못했습니다:', error)
        if (alive) setPrint('failed')
      }
    })()
    return () => { alive = false }
    // 주문 하나에 한 번
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo])

  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (left <= 0) dispatch({ type: 'reset' })
  }, [left, dispatch])
  // 화면을 만지면 시계를 다시 채운다
  useEffect(() => {
    const touch = () => setLeft(AUTO_S)
    window.addEventListener('pointerdown', touch)
    return () => window.removeEventListener('pointerdown', touch)
  }, [])

  return (
    <div className="ok-done">
      <div className="ok-done-scroll">
        <motion.span className="ok-bigcheck" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}>
          <Check size={52} strokeWidth={3.2} />
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{t.done.title}</motion.h1>

        <motion.div className="ok-orderno lg lg-strong" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}>
          <span>{t.done.number}</span>
          <b>{orderNo}</b>
          <small>{t.done.ready(ready)}</small>
          <i className="ok-orderno-ring" style={{ ['--ready' as string]: `${ready}` }} aria-hidden="true" />
        </motion.div>

        {state.paidWith === 'counter' && <p className="ok-note-line">{t.pay.counterNote}</p>}

        <div className="ok-done-print">
          <Printer size={18} strokeWidth={2.2} />
          <span>{print === 'printing' ? t.done.printing : print === 'printed' ? t.done.printed : print === 'failed' ? '—' : ''}</span>
          {receipt && <button type="button" className="ok-chip lg-press" onClick={() => setPreview(true)}>{t.done.preview}</button>}
        </div>

        <section className="ok-kitchen lg">
          <h3><ChefHat size={17} strokeWidth={2.2} />{t.done.kitchen}<span className="ok-kr">KR</span></h3>
          <div className="ok-kitchen-paper" lang="ko">
            {note.alerts.map((a) => <p key={a} className="is-alert">⚠ {a}</p>)}
            {note.notes.map((n) => <p key={n}>· {n}</p>)}
            <hr />
            {note.lines.map((l, i) => <p key={i}><b>{l.name}</b>{l.options ? ` (${l.options})` : ''} × {l.qty}{l.warn ? <span className="is-alert"> — {l.warn}</span> : null}</p>)}
          </div>
        </section>

        <section className="ok-phone lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="" /> : <span className="ok-qr-skel" />}
          <div>
            <h3><Smartphone size={18} strokeWidth={2.2} />{t.done.phone}</h3>
            <p>{t.done.phoneSub}</p>
          </div>
        </section>

        <section className="ok-nearby">
          <h3 className="ok-section-label"><Footprints size={15} strokeWidth={2.4} />{t.done.nearby}</h3>
          <div className="ok-nearby-row">
            {STORE.nearby.map((spot, i) => (
              <motion.div key={spot.id} className="ok-spot lg" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07 }}>
                <em>{t.done.walk(spot.walkMin)}</em>
                <b>{spot.name[state.lang]}</b>
                <small>{spot.note[state.lang]}</small>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <footer className="ok-done-foot">
        <p>{t.done.thanks}</p>
        <button type="button" className="ok-btn ok-btn--ghost lg-press" onClick={() => dispatch({ type: 'reset' })}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t.done.again}
          <span className="ok-countdown">{t.done.auto(Math.max(0, left))}</span>
        </button>
      </footer>

      <AnimatePresence>
        {preview && receipt && (
          <motion.div key="receipt" className="ok-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(false)}>
            <motion.div className="ok-receipt" initial={{ y: 60, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <CloseButton onClick={() => setPreview(false)} label={t.common.close} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receipt} alt="receipt" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
