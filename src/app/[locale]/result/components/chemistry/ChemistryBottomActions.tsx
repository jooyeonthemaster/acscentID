"use client"

import { motion } from 'framer-motion'
import { ShoppingCart, CreditCard, MessageSquarePlus, History } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChemistryBottomActionsProps {
  onShare?: () => void
  onAddToCart: () => void
  onCheckout: () => void
  isShareSaving?: boolean
  isAddingToCart?: boolean
  // 오프라인 피드백
  onFeedback?: () => void
  onFeedbackHistory?: () => void
  characterAName?: string
  characterBName?: string
  isOffline?: boolean
  // 하위 호환 (무시)
  onFeedbackA?: () => void
  onFeedbackB?: () => void
}

export function ChemistryBottomActions({
  onAddToCart,
  onCheckout,
  isAddingToCart = false,
  onFeedback,
  onFeedbackA,
  onFeedbackHistory,
  isOffline = false,
}: ChemistryBottomActionsProps) {
  const t = useTranslations()
  const handleFeedback = onFeedback || onFeedbackA

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[455px] px-4 py-3 bg-[#12141D] border-t-2 border-[#262A38] safe-area-bottom lg:max-w-[760px]"
    >
      {isOffline ? (
        /* 오프라인 모드: 취향 반영하기 (메인 강조) + 히스토리 */
        <div className="flex items-stretch gap-2">
          {/* 취향 반영하기 — 메인 액션 */}
          {handleFeedback && (
            <button
              onClick={handleFeedback}
              className="flex-1 py-4 bg-[#F5EFE2] text-[#12141D] font-black text-base rounded-[12px] border-2 border-[#F5EFE2] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus size={18} />
              <span>{t('chemistry.feedback.applyTaste')}</span>
            </button>
          )}

          {/* 히스토리 (보조) */}
          {onFeedbackHistory && (
            <button
              onClick={onFeedbackHistory}
              aria-label={t('chemistry.feedback.history')}
              className="px-4 bg-[#12141D] text-[#E9E2D0] rounded-[12px] border-2 border-[#262A38] transition-all flex items-center justify-center"
            >
              <History size={18} />
            </button>
          )}
        </div>
      ) : (
        /* 온라인 모드: 담기 + 구매 */
        <div className="flex gap-2">
          <button
            onClick={onAddToCart}
            disabled={isAddingToCart}
            className="flex-1 py-3.5 bg-[#F5EFE2] text-[#12141D] font-black text-sm lg:text-base rounded-[12px] border-2 border-[#F5EFE2] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <ShoppingCart size={16} />
            <span>{isAddingToCart ? t('chemistry.buttons.addingToCart') : t('bottomActions.addToCart')}</span>
          </button>
          <button
            onClick={onCheckout}
            className="flex-1 py-3.5 bg-[#EEB62B] text-[#1A1610] font-black text-sm lg:text-base rounded-[12px] border-2 border-[#B8880F] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            <span>{t('bottomActions.buy')}</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}
