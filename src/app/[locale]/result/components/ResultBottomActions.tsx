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
        bg-white border-t-2 border-black safe-area-bottom
        shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]
      `}
    >
      {serviceMode === 'online' && onScentPaperCheckout && (
        <button
          onClick={onScentPaperCheckout}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-[3px_3px_0_0_#FACC15] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#FACC15]"
        >
          <Ticket size={16} className="text-amber-500" />
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
          className="shrink-0 aspect-square p-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center disabled:opacity-70"
        >
          <Share2 size={16} />
        </button>

        {/* 장바구니 담기 + 바로 구매 버튼 (online 모드) */}
        {serviceMode === 'online' && (
          <>
            <button
              onClick={onAddToCart}
              disabled={isAddingToCart}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-400 to-green-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <ShoppingCart size={16} />
              <span>{isAddingToCart ? t('adding') : t('addToCart')}</span>
            </button>
            <motion.button
              onClick={onCheckout}
              animate={{
                boxShadow: [
                  "3px 3px 0 0 #000, 0 0 4px 1px rgba(251,146,60,0.3)",
                  "3px 3px 0 0 #000, 0 0 28px 8px rgba(251,146,60,1)",
                  "3px 3px 0 0 #000, 0 0 4px 1px rgba(251,146,60,0.3)",
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-sm rounded-xl border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-transform flex items-center justify-center gap-2"
            >
              <CreditCard size={16} />
              <span>{t('buy')}</span>
            </motion.button>
          </>
        )}

        {/* 피드백 기록 + 히스토리 버튼 (offline 모드) */}
        {serviceMode === 'offline' && (
          <>
            <button
              onClick={onFeedback}
              className="flex-1 py-3.5 bg-gradient-to-r from-pink-400 to-rose-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus size={16} />
              <span>{t('feedback')}</span>
            </button>
            <button
              onClick={onFeedbackHistory}
              className="py-3.5 px-4 bg-white text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center"
            >
              <History size={16} />
            </button>
          </>
        )}
      </div>

    </motion.div>
  )
}
