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
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[340px] rounded-[6px] border border-[var(--line)] bg-white p-5"
          >
            <button
              onClick={onClose}
              aria-label={t('close')}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--soft)]"
            >
              <X size={16} className="text-[var(--muted-ink)]" />
            </button>

            <h3 className="break-keep text-lg font-black text-[var(--ink)]">{t('title')}</h3>
            <p className="mt-1 break-keep text-sm text-[var(--muted-ink)]">{t('subtitle')}</p>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href={naverUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="group flex items-center gap-3 rounded-[5px] border border-[var(--line)] bg-white px-4 py-3.5 transition-colors hover:border-[var(--ink)] active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[#03C75A]">
                  <span className="text-base font-black leading-none text-white">N</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-keep text-sm font-extrabold leading-tight text-[var(--ink)]">{t('naver')}</span>
                  <span className="mt-0.5 block break-keep text-xs text-[var(--muted-ink)]">{t('naverDesc')}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-[var(--ink)] transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
              </a>

              {canUseSiteReserve ? (
                <Link
                  href="/reserve"
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-[5px] bg-[var(--ink)] px-4 py-3.5 transition-colors hover:bg-black active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/10">
                    <CalendarCheck size={19} className="text-white" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-keep text-sm font-extrabold leading-tight text-white">{t('site')}</span>
                    <span className="mt-0.5 block break-keep text-xs text-white/70">{t('siteDesc')}</span>
                  </span>
                  <ChevronRight size={18} className="flex-shrink-0 text-white transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed select-none items-center gap-3 rounded-[5px] border border-[var(--line)] bg-[var(--soft)] px-4 py-3.5"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white">
                    <CalendarCheck size={19} className="text-[var(--muted-ink)]" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-keep text-sm font-extrabold leading-tight text-[var(--muted-ink)]">{t('site')}</span>
                    <span className="mt-0.5 block break-keep text-xs text-[var(--muted-ink)]">{t('siteDesc')}</span>
                  </span>
                  <span className="flex-shrink-0 rounded-[3px] border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[var(--muted-ink)]">
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
