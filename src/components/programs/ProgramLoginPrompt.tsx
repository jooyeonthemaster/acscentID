"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"

interface ProgramLoginPromptProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
  onGuest?: () => void
}

export function ProgramLoginPrompt({
  isOpen,
  onClose,
  onLogin,
  onGuest,
}: ProgramLoginPromptProps) {
  const t = useTranslations()

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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-black"
          >
            <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-yellow-50 to-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                <AlertTriangle size={28} className="text-black" />
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-2">{t('auth.guestWarningTitle')}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('auth.guestWarningText')}
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-slate-600">{t('auth.guestBenefit1')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-slate-600">{t('auth.guestBenefit2')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">!</span>
                  <span className="text-slate-600">{t('auth.guestWarning')}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={onLogin}
                className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FACC15] transition-all border-2 border-black"
              >
                {t('buttons.loginSignup')}
              </button>

              {onGuest && (
                <button
                  onClick={onGuest}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t('buttons.startAsGuest')}</span>
                  <span className="text-xs text-slate-400">{t('auth.notSaved')}</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
