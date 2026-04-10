"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Share2, ShoppingCart, CreditCard, MessageSquarePlus, History } from 'lucide-react'

interface ChemistryBottomActionsProps {
  onShare: () => void
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
  onAddToCart,
  onCheckout,
  isShareSaving = false,
  isAddingToCart = false,
  onFeedback,
  onFeedbackA,
  onFeedbackHistory,
  isOffline = false,
}: ChemistryBottomActionsProps) {
  const handleFeedback = onFeedback || onFeedbackA
  const [isVisible, setIsVisible] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY.current
          const pageHeight = document.documentElement.scrollHeight
          const viewportHeight = window.innerHeight

          if (currentScrollY > 300) {
            if (scrollDelta > 10) setIsVisible(true)
            else if (scrollDelta < -10 && currentScrollY < pageHeight - viewportHeight - 200) setIsVisible(false)
          }
          if (currentScrollY + viewportHeight > pageHeight - 200) setIsVisible(true)
          if (currentScrollY < 100) setIsVisible(false)

          lastScrollY.current = currentScrollY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[455px] px-4 py-3 bg-white border-t-2 border-black safe-area-bottom shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]"
    >
      {isOffline ? (
        /* 오프라인 모드: 공유 + 피드백 A + 피드백 B + 히스토리 */
        <div className="space-y-2">
          <div className="flex gap-2">
            {/* 공유 */}
            <button
              onClick={onShare}
              disabled={isShareSaving}
              className="flex-1 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Share2 size={16} />
              <span>{isShareSaving ? '저장 중...' : '공유'}</span>
            </button>

            {/* 히스토리 */}
            {onFeedbackHistory && (
              <button
                onClick={onFeedbackHistory}
                className="py-3.5 px-4 bg-white text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center"
              >
                <History size={16} />
              </button>
            )}
          </div>

          {/* 취향 반영하기 버튼 */}
          {handleFeedback && (
            <button
              onClick={handleFeedback}
              className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus size={16} />
              <span>취향 반영하기</span>
            </button>
          )}
        </div>
      ) : (
        /* 온라인 모드: 공유 + 담기 + 구매 */
        <div className="flex gap-2">
          <button
            onClick={onShare}
            disabled={isShareSaving}
            className="flex-1 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Share2 size={16} />
            <span>{isShareSaving ? '저장 중...' : '공유'}</span>
          </button>
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
