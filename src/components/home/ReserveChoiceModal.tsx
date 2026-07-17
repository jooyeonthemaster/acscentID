'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'

// 사이트 예약은 오픈 전 — 이 계정으로만 접근 허용 (내부 테스트용)
const SITE_RESERVE_ALLOWED_EMAIL = 'nadr110619@gmail.com'

interface ReserveChoiceModalProps {
  open: boolean
  onClose: () => void
  naverUrl: string
}

export function ReserveChoiceModal({ open, onClose, naverUrl }: ReserveChoiceModalProps) {
  const t = useTranslations('reserve.choice')
  const { unifiedUser } = useAuth()
  const canUseSiteReserve =
    unifiedUser?.email?.toLowerCase() === SITE_RESERVE_ALLOWED_EMAIL

  useEffect(() => {
    setMobileOverlayOpen('reserve-choice', open)
    return () => setMobileOverlayOpen('reserve-choice', false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[340px] rounded-[12px] border-2 border-[#262A38] bg-[#12141D] p-5"
          >
            <button
              onClick={onClose}
              aria-label={t('close')}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#262A38] bg-[#12141D] hover:bg-[#1B1F2C] transition-colors"
            >
              <X size={16} className="text-[#A69F8D]" />
            </button>

            <h3 className="text-lg font-black text-[#E9E2D0]">{t('title')}</h3>
            <p className="mt-1 text-sm lg:text-base text-[#8B8578]">{t('subtitle')}</p>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href={naverUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="group flex items-center gap-3 rounded-[12px] border-2 border-[#262A38] bg-[#F5EFE2] px-4 py-3.5 transition-all active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 border-[#262A38] bg-[#03C75A]">
                  <span className="text-base font-black leading-none text-white">N</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm lg:text-base font-black leading-tight text-[#1A1610]">{t('naver')}</span>
                  <span className="mt-0.5 block text-xs lg:text-sm font-medium text-[#5C564A]">{t('naverDesc')}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-[#1A1610] transition-transform group-hover:translate-x-0.5" strokeWidth={2.8} />
              </a>

              {canUseSiteReserve ? (
                <Link
                  href="/reserve"
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-[12px] border-2 border-[#262A38] bg-[#12141D] px-4 py-3.5 transition-all active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 border-[#262A38] bg-[#12141D]">
                    <CalendarCheck size={19} className="text-[#E9E2D0]" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm lg:text-base font-black leading-tight text-[#E9E2D0]">{t('site')}</span>
                    <span className="mt-0.5 block text-xs lg:text-sm font-medium text-[#8B8578]">{t('siteDesc')}</span>
                  </span>
                  <ChevronRight size={18} className="flex-shrink-0 text-[#E9E2D0] transition-transform group-hover:translate-x-0.5" strokeWidth={2.8} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed select-none items-center gap-3 rounded-[12px] border-2 border-[#262A38] bg-[#1B1F2C] px-4 py-3.5"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 border-[#262A38] bg-[#12141D]">
                    <CalendarCheck size={19} className="text-[#8B8578]" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm lg:text-base font-black leading-tight text-[#8B8578]">{t('site')}</span>
                    <span className="mt-0.5 block text-xs lg:text-sm font-medium text-[#8B8578]">{t('siteDesc')}</span>
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-[#232838] px-2.5 py-1 text-[11px] lg:text-[13px] font-black text-[#A69F8D]">
                    {t('comingSoon')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
