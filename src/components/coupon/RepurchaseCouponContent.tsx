"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, Loader2, Heart, PartyPopper } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { AvailableCoupon } from '@/types/coupon'

interface RepurchaseCouponContentProps {
  coupon: AvailableCoupon | null
}

export function RepurchaseCouponContent({ coupon }: RepurchaseCouponContentProps) {
  const { claimCoupon, closeClaimModal } = useCoupon()
  const [isLoading, setIsLoading] = useState(true)
  const [isEligible, setIsEligible] = useState(false)
  const [completedOrders, setCompletedOrders] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    checkEligibility()
  }, [])

  const checkEligibility = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/coupons/repurchase/eligible')
      const data = await response.json()

      if (data.requireLogin) {
        setError('로그인 후 확인할 수 있어요!')
        setIsEligible(false)
      } else {
        setIsEligible(data.eligible)
        setCompletedOrders(data.completedOrders || 0)
      }
    } catch (e) {
      setError('자격 확인에 실패했어요')
    }
    setIsLoading(false)
  }

  const handleClaim = async () => {
    if (!coupon || !isEligible) return

    setIsSubmitting(true)
    setError(null)

    const result = await claimCoupon(coupon.id)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        closeClaimModal()
      }, 2000)
    } else if (result.requireLogin) {
      setError('로그인 후 쿠폰을 받을 수 있어요!')
    } else {
      setError(result.error || '쿠폰 발급에 실패했습니다')
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 text-[#F472B6] animate-spin mx-auto" />
        <p className="text-slate-600 mt-3 text-sm font-bold">자격을 확인하는 중...</p>
      </div>
    )
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 bg-[#F472B6] rounded-full flex items-center justify-center mx-auto mb-3 border-3 border-slate-900 shadow-[3px_3px_0_#000]"
        >
          <PartyPopper className="w-10 h-10 text-white" />
        </motion.div>
        <h3 className="text-xl font-black text-slate-900">쿠폰 GET!</h3>
        <p className="text-sm text-slate-600 mt-1 font-bold">결제할 때 10% 할인 적용하세요</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 할인율 카드 */}
      <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FBCFE8] rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000] text-center relative overflow-hidden">
        <div className="absolute -top-3 -right-3 text-5xl opacity-20">✨</div>
        <div className="relative">
          <span className="text-4xl font-black text-[#F472B6]">10%</span>
          <span className="text-lg font-black text-slate-700 ml-2">할인</span>
          <p className="text-xs text-slate-600 mt-1 font-bold">
            재구매 고객님께 드리는 감사 할인
          </p>
        </div>
      </div>

      {/* 자격 상태 */}
      {isEligible ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FBCFE8] rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F472B6] rounded-full flex items-center justify-center border-2 border-slate-900">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900">자격 확인 완료!</p>
              <p className="text-xs text-slate-700 font-bold">완료된 주문 {completedOrders}건</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-100 rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center border-2 border-slate-900">
              <ShoppingBag className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="font-black text-slate-700">아직 사용할 수 없어요</p>
              <p className="text-xs text-slate-500 font-bold">첫 구매 완료 후 사용 가능해요</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 안내 카드 */}
      <div className="bg-[#FEF9C3] rounded-lg p-3 border-2 border-slate-900 flex items-start gap-2">
        <Heart className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 font-bold">
          다시 찾아주셔서 감사해요! 두 번째 향기는 더 특별하게 만들어 드릴게요.
        </p>
      </div>

      {/* 에러 메시지 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-bold border-2 border-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 버튼 */}
      {isEligible ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleClaim}
          disabled={isSubmitting}
          className="w-full py-3 bg-[#F472B6] hover:bg-[#EC4899] disabled:bg-slate-300 text-white font-black rounded-xl transition-colors disabled:cursor-not-allowed border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
        >
          {isSubmitting ? '발급 중...' : '✨ 10% 쿠폰 받기!'}
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={closeClaimModal}
          className="w-full py-3 bg-slate-400 text-white font-black rounded-xl transition-colors border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
        >
          확인했어요
        </motion.button>
      )}
    </div>
  )
}
