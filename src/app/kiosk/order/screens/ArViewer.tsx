'use client'

// AI 3D 메뉴 — 메뉴 사진으로 만든 3D 모델(데모는 손으로 짠 절차적 모델)을 돌려 보고, 스마트폰 옆에 실제 크기로 놓아 본다.
// QR 로 같은 3D 를 손님 휴대폰에서 연다.

import { AnimatePresence, motion } from 'framer-motion'
import { Hand, Ruler, Smartphone } from 'lucide-react'
import dynamic from 'next/dynamic'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { menuItem } from '@/lib/kiosk/order/menu'
import type { Dish3DId } from '../three/DishViewer'
import { useOrder } from '../store'
import { AiOrb, CloseButton } from '../ui'

const DishViewer = dynamic(() => import('../three/DishViewer').then((m) => m.DishViewer), { ssr: false })

export function ArViewer() {
  const { state, dispatch, t } = useOrder()
  const item = state.arId ? menuItem(state.arId) : undefined
  const [ready, setReady] = useState(false)
  const [real, setReal] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    const url = `${window.location.origin}/kiosk/order/m?ar=${item.id}&l=${state.lang}`
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#14100d', light: '#ffffff' } }).then(setQr).catch(() => setQr(null))
  }, [item, state.lang])

  if (!item) return null
  const close = () => dispatch({ type: 'ar', id: null })

  return (
    <motion.div className="ok-ar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={t.ar.title}>
      <div className="ok-ar-glow" aria-hidden="true" />
      <header className="ok-ar-head">
        <div>
          <span className="ok-eyebrow"><AiOrb size={16} /> {t.ar.title}</span>
          <h2>{item.name[state.lang]}</h2>
          <p>{t.ar.generated}</p>
        </div>
        <CloseButton onClick={close} label={t.common.close} />
      </header>

      <div className="ok-ar-canvas">
        <DishViewer
          dishId={item.id as Dish3DId}
          sizeCm={item.sizeCm}
          showReference={real}
          measureLabel={real ? t.ar.diameter(item.sizeCm) : undefined}
          autoRotate
          onReady={() => setReady(true)}
        />
        <AnimatePresence>
          {!ready && (
            <motion.div key="building" className="ok-ar-building" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <AiOrb size={28} thinking />
              <span>{t.ar.building}</span>
              <i className="ok-ar-bar" />
            </motion.div>
          )}
        </AnimatePresence>
        {ready && (
          <motion.p className="ok-ar-hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Hand size={16} strokeWidth={2.2} /> {t.ar.rotate}
          </motion.p>
        )}
      </div>

      <footer className="ok-ar-foot">
        <button type="button" className={`ok-ar-toggle lg lg-press${real ? ' is-on' : ''}`} onClick={() => setReal((v) => !v)} aria-pressed={real}>
          <Ruler size={22} strokeWidth={2.2} />
          <span>
            <b>{t.ar.actualSize}</b>
            <small>{t.ar.phone} · {t.ar.diameter(item.sizeCm)}</small>
          </span>
          <i className="ok-switch" />
        </button>
        <div className="ok-ar-qr lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="" /> : <span className="ok-qr-skel" />}
          <span>
            <b><Smartphone size={16} strokeWidth={2.2} /> {t.ar.onPhone}</b>
            <small>{t.ar.onPhoneSub}</small>
          </span>
        </div>
      </footer>
    </motion.div>
  )
}
