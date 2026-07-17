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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-[#F5EFE2] rounded-[12px] shadow-2xl overflow-hidden border-2 border-[#D8CFBB]"
          >
            <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-[#FDFAF1] to-[#F5EFE2]">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#EDE5D2] transition-colors"
              >
                <X size={20} className="text-[#8B8578]" />
              </button>

              <div className="w-16 h-16 mx-auto mb-4 bg-[#EFE4C8] rounded-[12px] flex items-center justify-center shadow-lg border-2 border-[#D8CFBB]">
                <AlertTriangle size={28} className="text-[#1A1610]" />
              </div>

              <h2 className="text-xl font-black text-[#1A1610] mb-2">{t('auth.guestWarningTitle')}</h2>
              <p className="text-sm lg:text-base text-[#5C564A] leading-relaxed">
                {t('auth.guestWarningText')}
              </p>
            </div>

            <div className="px-6 py-4 bg-[#EDE5D2] border-y-2 border-[#D8CFBB]">
              <div className="space-y-2 text-sm lg:text-base">
                <div className="flex items-start gap-2">
                  <span className="text-[#8B8578] font-bold">✓</span>
                  <span className="text-[#5C564A]">{t('auth.guestBenefit1')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#8B8578] font-bold">✓</span>
                  <span className="text-[#5C564A]">{t('auth.guestBenefit2')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#8B8578] font-bold">!</span>
                  <span className="text-[#5C564A]">{t('auth.guestWarning')}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={onLogin}
                className="w-full h-14 bg-[#12141D] text-[#F5EFE2] rounded-[12px] font-bold text-lg transition-all border-2 border-[#12141D]"
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
