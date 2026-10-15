'use client'

// 대기 화면 — 매장 사진 위로 김이 오르고, 여러 나라 말 인사가 돌아간다. 어디를 눌러도 시작.

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Box, Languages, MapPin, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { COUNTRY_COUNT } from '@/lib/kiosk/order/countries'
import { foodSrc } from '@/lib/kiosk/order/format'
import { WELCOMES } from '@/lib/kiosk/order/i18n'
import { MENU, STORE } from '@/lib/kiosk/order/menu'
import { useOrder } from '../store'
import { AiOrb } from '../ui'

/** 인사와 같은 말로 쓴 '눌러서 주문' */
const CTA: Record<string, string> = {
  en: 'Touch anywhere to start',
  ko: '화면을 터치해 주문을 시작하세요',
  ja: '画面にタッチして注文スタート',
  fr: 'Touchez l’écran pour commencer',
  'zh-Hans': '轻触屏幕开始点餐',
  de: 'Zum Bestellen berühren',
  es: 'Toca la pantalla para pedir',
  th: 'แตะหน้าจอเพื่อเริ่มสั่งอาหาร',
  vi: 'Chạm vào màn hình để gọi món',
  it: 'Tocca lo schermo per ordinare',
  id: 'Sentuh layar untuk memesan',
  pt: 'Toque na tela para pedir',
  'zh-Hant': '輕觸螢幕開始點餐',
  ru: 'Коснитесь экрана, чтобы заказать',
  tl: 'Pindutin ang screen para umorder',
  ar: 'المس الشاشة لبدء الطلب',
}

const STEAM = [0, 1, 2, 3, 4]

export function Attract() {
  const { dispatch } = useOrder()
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % WELCOMES.length), 2400)
    return () => window.clearInterval(id)
  }, [])
  const w = WELCOMES[i]
  const start = () => dispatch({ type: 'go', screen: 'country' })
  const strip = MENU.filter((m) => m.category !== 'drink')

  return (
    <div className="ok-attract" role="button" tabIndex={0} onClick={start} onKeyDown={(e) => e.key === 'Enter' && start()}>
      <div className="ok-attract-hero" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/kiosk-order/store-hero.webp" alt="" draggable={false} />
      </div>
      <div className="ok-attract-shade" aria-hidden="true" />
      <div className="ok-steam" aria-hidden="true">
        {STEAM.map((n) => <i key={n} style={{ ['--d' as string]: `${n * 1.3}s`, ['--x' as string]: `${18 + n * 15}%` }} />)}
      </div>

      <div className="ok-attract-top">
        <motion.span className="ok-attract-loc lg lg-pill" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <MapPin size={14} strokeWidth={2.4} /> {STORE.area.en} · since {STORE.since}
        </motion.span>
        <motion.h1 className="ok-wordmark" initial={{ letterSpacing: '0.42em', opacity: 0 }} animate={{ letterSpacing: '0.22em', opacity: 1 }} transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}>
          {STORE.name}
        </motion.h1>
        <p className="ok-wordmark-ko">{STORE.nameKo} · {STORE.tagline.ko}</p>
      </div>

      <div className="ok-attract-welcome" aria-live="off">
        <AnimatePresence initial={false}>
          <motion.p
            key={i}
            lang={w.lang}
            dir={w.lang === 'ar' ? 'rtl' : undefined}
            initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(10px)' }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {w.text}
          </motion.p>
        </AnimatePresence>
        <span className="ok-attract-langs">English · 日本語 · Français · 한국어 · +{COUNTRY_COUNT} countries</span>
      </div>

      <div className="ok-marquee" aria-hidden="true">
        <div className="ok-marquee-track">
          {[...strip, ...strip].map((m, n) => (
            <span className="ok-marquee-item" key={`${m.id}-${n}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foodSrc(m.id, true)} alt="" draggable={false} loading="lazy" />
            </span>
          ))}
        </div>
      </div>

      <div className="ok-attract-bottom">
        <div className="ok-cta lg lg-press">
          <AiOrb size={52} />
          <span className="ok-cta-text">
            <b>Touch to order</b>
            <AnimatePresence mode="wait">
              <motion.small key={i} lang={w.lang} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
                {CTA[w.lang] ?? CTA.en}
              </motion.small>
            </AnimatePresence>
          </span>
          <span className="ok-cta-arrow"><ArrowRight size={24} strokeWidth={2.4} /></span>
        </div>
        <ul className="ok-attract-features">
          <li><Languages size={16} strokeWidth={2.2} />Your language</li>
          <li><ShieldCheck size={16} strokeWidth={2.2} />Allergy-aware AI</li>
          <li><Box size={16} strokeWidth={2.2} />3D menu</li>
        </ul>
        <p className="ok-powered">Powered by <b>Aible</b> — the AI concierge for travelers</p>
      </div>
    </div>
  )
}
