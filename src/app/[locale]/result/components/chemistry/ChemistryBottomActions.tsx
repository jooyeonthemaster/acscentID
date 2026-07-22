"use client"

import { motion } from 'framer-motion'
import { ShoppingCart, CreditCard, MessageSquarePlus, History, Share2, Ticket } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChemistryBottomActionsProps {
  onShare?: () => void
  onScentPaperCheckout?: () => void
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
  onShare,
  onScentPaperCheckout,
  onAddToCart,
  onCheckout,
  isShareSaving = false,
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
      className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[455px] px-4 py-3 bg-[var(--paper)] border-t-2 border-[var(--line)] safe-area-bottom lg:max-w-[760px]"
    >
      {isOffline ? (
        /* 오프라인 모드: 취향 반영하기 (메인 강조) + 히스토리 */
        <div className="flex items-stretch gap-2">
          {/* 취향 반영하기 — 메인 액션 */}
          {handleFeedback && (
            <button
              onClick={handleFeedback}
              className="flex-1 py-4 bg-[var(--soft)] text-[var(--ink)] font-bold text-base rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center gap-2"
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
              className="px-4 bg-[var(--paper)] text-[var(--ink)] rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center"
            >
              <History size={18} />
            </button>
          )}
        </div>
      ) : (
        /* 온라인 모드: 시향지 + 공유/담기/구매 — 이미지 분석 결과와 동일 배치 */
        <>
        {onScentPaperCheckout && (
          <button
            onClick={onScentPaperCheckout}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm lg:text-base font-bold text-[var(--ink)] transition-all"
          >
            <Ticket size={16} className="text-[var(--muted-ink)]" />
            <span>{t('bottomActions.scentPaperCta')}</span>
          </button>
        )}
        <div className="flex gap-2">
          {onShare && (
            <button
              onClick={onShare}
              disabled={isShareSaving}
              aria-label={isShareSaving ? t('bottomActions.saving') : t('bottomActions.share')}
              className="shrink-0 aspect-square p-3.5 bg-[var(--soft)] text-[var(--ink)] font-bold text-sm lg:text-base rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center disabled:opacity-70"
            >
              <Share2 size={16} />
            </button>
          )}
          <button
            onClick={onAddToCart}
            disabled={isAddingToCart}
            className="flex-1 py-3.5 bg-[var(--soft)] text-[var(--ink)] font-bold text-sm lg:text-base rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <ShoppingCart size={16} />
            <span>{isAddingToCart ? t('chemistry.buttons.addingToCart') : t('bottomActions.addToCart')}</span>
          </button>
          <button
            onClick={onCheckout}
            className="flex-1 py-3.5 bg-[var(--ink)] text-white font-bold text-sm lg:text-base rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            <span>{t('bottomActions.buy')}</span>
          </button>
        </div>
        </>
      )}
    </motion.div>
  )
}
