'use client'

// 결제 — 외국인 손님이 쓰는 결제 수단(해외 카드·Apple Pay·Alipay+·WeChat Pay)과 카운터 결제.
// 레퍼런스 앱이라 실제 결제는 하지 않는다: 단말기 안내 연출 뒤 승인으로 넘어간다(화면에 '데모' 표시).

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, Check, ChevronLeft, CreditCard, Nfc, QrCode, Receipt, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { won } from '@/lib/kiosk/order/format'
import { cartTotals, nextOrderNo, useOrder } from '../store'
import { Price } from '../ui'

type Method = 'card' | 'apple' | 'alipay' | 'wechat' | 'counter'

export function Pay() {
  const { state, dispatch, t } = useOrder()
  const { total } = cartTotals(state.cart)
  const [method, setMethod] = useState<Method | null>(null)
  const [phase, setPhase] = useState<'choose' | 'processing' | 'approved'>('choose')
  const [qr, setQr] = useState<string | null>(null)

  const METHODS: { id: Method; label: string; sub?: string; Icon: typeof CreditCard; tone: string }[] = [
    { id: 'card', label: t.pay.card, sub: t.pay.cardSub, Icon: CreditCard, tone: 'ember' },
    { id: 'apple', label: t.pay.apple, Icon: Smartphone, tone: 'mono' },
    { id: 'alipay', label: t.pay.alipay, Icon: QrCode, tone: 'blue' },
    { id: 'wechat', label: t.pay.wechat, Icon: QrCode, tone: 'green' },
    { id: 'counter', label: t.pay.counter, sub: t.pay.counterNote, Icon: Receipt, tone: 'mono' },
  ]

  const choose = (id: Method) => {
    if (method) return
    if (id === 'counter') {
      dispatch({ type: 'paid', orderNo: nextOrderNo(), method: id })
      return
    }
    setMethod(id)
    setPhase('processing')
    if (id === 'alipay' || id === 'wechat') {
      QRCode.toDataURL(`AIBLE-DEMO-PAY:${id}:${total}`, { margin: 1, width: 300, color: { dark: '#14100d', light: '#ffffff' } }).then(setQr).catch(() => setQr(null))
    }
  }

  // 데모 승인 — 단말기 안내를 3.6초 보여 준 뒤 승인, 1.3초 뒤 완료 화면
  useEffect(() => {
    if (phase !== 'processing' || !method) return
    const a = window.setTimeout(() => setPhase('approved'), 3600)
    const b = window.setTimeout(() => dispatch({ type: 'paid', orderNo: nextOrderNo(), method }), 4900)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [phase, method, dispatch])

  const back = () => {
    dispatch({ type: 'go', screen: 'menu' })
    dispatch({ type: 'sheet', sheet: { kind: 'cart' } })
  }

  return (
    <div className="ok-pay">
      <header className="ok-pay-head">
        {phase === 'choose' && <button type="button" className="ok-iconbtn lg lg-press" onClick={back} aria-label={t.common.back}><ChevronLeft size={24} strokeWidth={2.4} /></button>}
        <div className="ok-pay-total">
          <span>{t.common.total}</span>
          <Price krw={total} country={state.country} lang={state.lang} size="xl" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {phase === 'choose' && (
          <motion.section key="choose" className="ok-pay-choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h1>{t.pay.title}</h1>
            <div className="ok-pay-grid">
              {METHODS.map(({ id, label, sub, Icon, tone }, i) => (
                <motion.button
                  key={id}
                  type="button"
                  className={`ok-pay-method lg lg-press is-${tone}${id === 'card' ? ' is-wide' : ''}`}
                  onClick={() => choose(id)}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <span className="ok-pay-icon"><Icon size={26} strokeWidth={2} /></span>
                  <b>{label}</b>
                  {sub && <small>{sub}</small>}
                </motion.button>
              ))}
            </div>
            <p className="ok-demo-note">{t.pay.demo}</p>
          </motion.section>
        )}

        {phase === 'processing' && method && (
          <motion.section key="proc" className="ok-pay-proc" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }}>
            {method === 'card' && (
              <div className="ok-pay-card-anim" aria-hidden="true">
                <motion.div className="ok-paycard" animate={{ y: [0, 120, 120], rotateX: [0, 0, 18] }} transition={{ duration: 2.2, times: [0, 0.7, 1], repeat: Infinity, repeatDelay: 0.4 }}>
                  <i className="ok-paycard-chip" />
                  <span>•••• 4242</span>
                </motion.div>
                <div className="ok-reader"><i /></div>
              </div>
            )}
            {method === 'apple' && (
              <div className="ok-pay-phone-anim" aria-hidden="true">
                <motion.div className="ok-payphone" animate={{ y: [0, 40, 40, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
                  <Nfc size={34} strokeWidth={1.8} />
                </motion.div>
                <span className="ok-nfc-waves"><i /><i /><i /></span>
              </div>
            )}
            {(method === 'alipay' || method === 'wechat') && (
              <div className={`ok-pay-qr is-${method}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt="" /> : <span className="ok-qr-skel" />}
                <i className="ok-qr-scan" aria-hidden="true" />
              </div>
            )}
            <h2>{method === 'card' ? t.pay.insert : method === 'apple' ? t.pay.hold : t.pay.scan}</h2>
            {(method === 'card' || method === 'apple') && <ArrowDown className="ok-pay-down" size={40} strokeWidth={2.4} />}
            <div className="ok-pay-progress"><i /></div>
            <p className="ok-pay-status">{t.pay.processing} · {won(total)}</p>
            <p className="ok-demo-note">{t.pay.demo}</p>
          </motion.section>
        )}

        {phase === 'approved' && (
          <motion.section key="ok" className="ok-pay-approved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            <span className="ok-bigcheck"><Check size={64} strokeWidth={3} /></span>
            <h2>{t.pay.approved}</h2>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
