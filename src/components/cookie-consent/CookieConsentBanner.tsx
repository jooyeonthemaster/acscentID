'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'acscent-cookie-consent'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const locale = useLocale()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    window.dispatchEvent(new Event('cookie-consent-changed'))
    setVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    window.dispatchEvent(new Event('cookie-consent-changed'))
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[423px] bg-white border-2 border-black/80 rounded-xl px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400 leading-snug shrink">
              {t('message')}{' '}
              <button
                onClick={() => router.push(`/${locale}/privacy`)}
                className="underline hover:text-gray-500 transition-colors cursor-pointer"
              >
                {t('privacy')}
              </button>
            </p>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handleReject}
                className="text-[11px] text-gray-400 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t('reject')}
              </button>
              <button
                onClick={handleAccept}
                className="text-[11px] font-semibold px-3 py-1 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
