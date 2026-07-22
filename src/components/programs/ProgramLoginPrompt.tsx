"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
import { setMobileOverlayOpen } from "@/lib/mobile-overlay"

interface ProgramLoginPromptProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
}

export function ProgramLoginPrompt({
  isOpen,
  onClose,
  onLogin,
}: ProgramLoginPromptProps) {
  const t = useTranslations()

  useEffect(() => {
    setMobileOverlayOpen('program-login-prompt', isOpen)
    return () => setMobileOverlayOpen('program-login-prompt', false)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-[6px] shadow-sm overflow-hidden border border-[var(--line)]"
          >
            <div className="relative p-6 pb-4 text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--soft)] transition-colors"
              >
                <X size={20} className="text-[var(--muted-ink)]" />
              </button>

              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                <AlertTriangle size={28} className="text-[var(--ink)]" />
              </div>

              <h2 className="text-xl font-black text-[var(--ink)] mb-2">{t('auth.guestWarningTitle')}</h2>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed">
                {t('auth.guestWarningText')}
              </p>
            </div>

            <div className="px-6 py-4 bg-[var(--soft)] border-y border-[var(--line-soft)]">
              <div className="space-y-2 text-sm lg:text-base">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--ink)] font-bold">✓</span>
                  <span className="text-[var(--muted-ink)]">{t('auth.guestBenefit1')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--ink)] font-bold">✓</span>
                  <span className="text-[var(--muted-ink)]">{t('auth.guestBenefit2')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--ink)] font-bold">!</span>
                  <span className="text-[var(--muted-ink)]">{t('auth.guestWarning')}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={onLogin}
                className="w-full h-14 bg-[var(--ink)] text-white rounded-[5px] font-bold text-lg transition-all hover:bg-black"
              >
                {t('buttons.loginSignup')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
