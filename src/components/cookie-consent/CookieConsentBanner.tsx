'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { isFocusedExperiencePath } from '@/lib/route-visibility'

const STORAGE_KEY = 'acscent-cookie-consent'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const shouldHideForFocusedExperience = isFocusedExperiencePath(pathname)

  useEffect(() => {
    if (shouldHideForFocusedExperience) return

    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [shouldHideForFocusedExperience])

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
      {visible && !shouldHideForFocusedExperience && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[423px] bg-white border-2 border-black/80 rounded-xl px-5 py-5 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
        >
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              {t('message')}{' '}
              <button
                onClick={() => router.push(`/${locale}/privacy`)}
                className="underline hover:text-gray-600 transition-colors cursor-pointer"
              >
                {t('privacy')}
              </button>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleReject}
                className="text-[13px] text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t('reject')}
              </button>
              <button
                onClick={handleAccept}
                className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
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
