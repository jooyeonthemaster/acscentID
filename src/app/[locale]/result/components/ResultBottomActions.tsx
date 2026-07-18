"use client"

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Share2, ShoppingCart, MessageSquarePlus, History, CreditCard, Ticket } from 'lucide-react'

interface ResultBottomActionsProps {
  onShare: () => void
  onAddToCart: () => void
  onCheckout: () => void
  onScentPaperCheckout?: () => void
  onFeedback?: () => void
  onFeedbackHistory?: () => void
  isShareSaving?: boolean
  isAddingToCart?: boolean
  serviceMode: 'online' | 'offline'
}

export function ResultBottomActions({
  onShare,
  onAddToCart,
  onCheckout,
  onScentPaperCheckout,
  onFeedback,
  onFeedbackHistory,
  isShareSaving = false,
  isAddingToCart = false,
  serviceMode
}: ResultBottomActionsProps) {
  const t = useTranslations('bottomActions')

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`
        fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[455px] px-4 py-3
        bg-[#12141D] border-t-2 border-[#262A38] safe-area-bottom
        
      `}
    >
      {serviceMode === 'online' && onScentPaperCheckout && (
        <button
          onClick={onScentPaperCheckout}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#D8CFBB] bg-[#F5EFE2] px-4 py-3 text-sm lg:text-base font-bold text-[#1A1610] transition-all"
        >
          <Ticket size={16} className="text-[#5C564A]" />
          <span>{t('scentPaperCta')}</span>
        </button>
      )}

      {/* 2개 버튼 가로 배치 */}
      <div className="flex gap-2">
        {/* 결과 공유하기 버튼 */}
        <button
          onClick={onShare}
          disabled={isShareSaving}
          aria-label={isShareSaving ? t('saving') : t('share')}
          className="shrink-0 aspect-square p-3.5 bg-[#F5EFE2] text-[#12141D] font-bold text-sm lg:text-base rounded-[12px] border border-[#F5EFE2] transition-all flex items-center justify-center disabled:opacity-70"
        >
          <Share2 size={16} />
        </button>

        {/* 장바구니 담기 + 바로 구매 버튼 (online 모드) */}
        {serviceMode === 'online' && (
          <>
            <button
              onClick={onAddToCart}
              disabled={isAddingToCart}
              className="flex-1 py-3.5 bg-[#F5EFE2] text-[#12141D] font-bold text-sm lg:text-base rounded-[12px] border border-[#F5EFE2] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <ShoppingCart size={16} />
              <span>{isAddingToCart ? t('adding') : t('addToCart')}</span>
            </button>
            <button
              onClick={onCheckout}
              className="flex-1 py-3.5 bg-[#EEB62B] text-[#1A1610] font-bold text-sm lg:text-base rounded-[12px] border border-[#B8880F] flex items-center justify-center gap-2"
            >
              <CreditCard size={16} />
              <span>{t('buy')}</span>
            </button>
          </>
        )}

        {/* 피드백 기록 + 히스토리 버튼 (offline 모드) */}
        {serviceMode === 'offline' && (
          <>
            <button
              onClick={onFeedback}
              className="flex-1 py-3.5 bg-[#F5EFE2] text-[#12141D] font-bold text-sm lg:text-base rounded-[12px] border border-[#F5EFE2] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus size={16} />
              <span>{t('feedback')}</span>
            </button>
            <button
              onClick={onFeedbackHistory}
              className="py-3.5 px-4 bg-[#12141D] text-[#E9E2D0] font-bold text-sm lg:text-base rounded-[12px] border border-[#262A38] transition-all flex items-center justify-center"
            >
              <History size={16} />
            </button>
          </>
        )}
      </div>

    </motion.div>
  )
}
