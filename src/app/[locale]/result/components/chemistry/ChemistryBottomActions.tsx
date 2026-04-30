"use client"

import { motion } from 'framer-motion'
import { ShoppingCart, CreditCard, MessageSquarePlus, History } from 'lucide-react'

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
  const handleFeedback = onFeedback || onFeedbackA

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[455px] px-4 py-3 bg-white border-t-2 border-black safe-area-bottom shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]"
    >
      {isOffline ? (
        /* 오프라인 모드: 취향 반영하기 (메인 강조) + 히스토리 */
        <div className="flex items-stretch gap-2">
          {/* 취향 반영하기 — 메인 액션 */}
          {handleFeedback && (
            <button
              onClick={handleFeedback}
              className="flex-1 py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus size={18} />
              <span>취향 반영하기</span>
            </button>
          )}

          {/* 히스토리 (보조) */}
          {onFeedbackHistory && (
            <button
              onClick={onFeedbackHistory}
              aria-label="피드백 히스토리"
              className="px-4 bg-white text-black rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center"
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
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-400 to-green-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <ShoppingCart size={16} />
            <span>{isAddingToCart ? '추가 중...' : '담기'}</span>
          </button>
          <button
            onClick={onCheckout}
            className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            <span>구매</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}
