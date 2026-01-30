"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Share2, ShoppingCart, MessageSquarePlus, History, CreditCard } from 'lucide-react'

interface ResultBottomActionsProps {
  onShare: () => void
  onAddToCart: () => void
  onCheckout: () => void
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
  onFeedback,
  onFeedbackHistory,
  isShareSaving = false,
  isAddingToCart = false,
  serviceMode
}: ResultBottomActionsProps) {
  const [isNavVisible, setIsNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // 스크롤 방향 감지 - MobileBottomNav와 동일한 로직
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY.current

          // 스크롤 임계값 (10px 이상 움직여야 반응)
          if (Math.abs(scrollDelta) > 10) {
            if (scrollDelta > 0 && currentScrollY > 100) {
              // 아래로 스크롤 - 네비 숨김 (버튼은 하단으로)
              setIsNavVisible(false)
            } else if (scrollDelta < 0) {
              // 위로 스크롤 - 네비 보임 (버튼은 네비 위로)
              setIsNavVisible(true)
            }
            lastScrollY.current = currentScrollY
          }

          // 페이지 최상단에서는 항상 네비 보임
          if (currentScrollY < 50) {
            setIsNavVisible(true)
          }

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
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`
        fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-[455px] px-4 py-3
        bg-white border-t-2 border-black safe-area-bottom
        transition-all duration-300 ease-out
        ${isNavVisible
          ? "bottom-16 shadow-none"
          : "bottom-0 shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]"
        }
      `}
    >
      {/* 2개 버튼 가로 배치 */}
      <div className="flex gap-2">
        {/* 결과 공유하기 버튼 */}
        <button
          onClick={onShare}
          disabled={isShareSaving}
          className="flex-1 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Share2 size={16} />
          <span>{isShareSaving ? '저장 중...' : '공유'}</span>
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
              <span>{isAddingToCart ? '담는 중...' : '담기'}</span>
            </button>
            <button
              onClick={onCheckout}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={16} />
              <span>구매</span>
            </button>
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
              <span>피드백 기록</span>
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
