'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { isFocusedExperiencePath } from '@/lib/route-visibility'
import { subscribeMobileOverlayChange } from '@/lib/mobile-overlay'

const STORAGE_KEY = 'acscent-cookie-consent'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false)
  const shouldHideForFocusedExperience = isFocusedExperiencePath(pathname)

  useEffect(() => {
    if (shouldHideForFocusedExperience) return

    const syncPopupState = () => {
      setPopupOpen(document.body.dataset.acscentPopupOpen === 'true')
    }

    syncPopupState()
    window.addEventListener('acscent-popup-visibility-change', syncPopupState)

    return () => {
      window.removeEventListener('acscent-popup-visibility-change', syncPopupState)
    }
  }, [shouldHideForFocusedExperience])

  useEffect(() => {
    return subscribeMobileOverlayChange(setMobileOverlayOpen)
  }, [])

  useEffect(() => {
    if (shouldHideForFocusedExperience || popupOpen || mobileOverlayOpen) return

    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [mobileOverlayOpen, popupOpen, shouldHideForFocusedExperience])

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
      {visible && !shouldHideForFocusedExperience && !popupOpen && !mobileOverlayOpen && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[423px] bg-[#12141D] border-2 border-black/80 rounded-[12px] px-5 py-5"
        >
          <div className="flex flex-col gap-3">
            <p className="text-[13px] lg:text-[15px] text-[#8B8578] leading-relaxed">
              {t('message')}{' '}
              <button
                onClick={() => router.push(`/${locale}/privacy`)}
                className="underline hover:text-[#A69F8D] transition-colors cursor-pointer"
              >
                {t('privacy')}
              </button>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleReject}
                className="text-[13px] lg:text-[15px] text-[#8B8578] px-4 py-2 rounded-[12px] hover:bg-[#151823] transition-colors cursor-pointer"
              >
                {t('reject')}
              </button>
              <button
                onClick={handleAccept}
                className="text-[13px] lg:text-[15px] font-semibold px-5 py-2 rounded-[12px] bg-[#161925] text-[#E9E2D0] hover:bg-[#161925] transition-colors cursor-pointer"
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
