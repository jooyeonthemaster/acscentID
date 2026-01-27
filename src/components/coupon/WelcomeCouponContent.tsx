"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Rocket, Sparkles, PartyPopper } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { AvailableCoupon } from '@/types/coupon'

interface WelcomeCouponContentProps {
  coupon: AvailableCoupon | null
}

export function WelcomeCouponContent({ coupon }: WelcomeCouponContentProps) {
  const { claimCoupon, closeClaimModal } = useCoupon()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClaim = async () => {
    if (!coupon) {
      setError('쿠폰 정보를 찾을 수 없어요')
      return
    }

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
        <p className="text-sm text-slate-600 mt-1 font-bold">결제할 때 15% 할인 적용하세요</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 할인율 + 환영 메시지 통합 */}
      <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FBCFE8] rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000] text-center relative overflow-hidden">
        <div className="absolute -top-3 -right-3 text-5xl opacity-20">🎉</div>
        <motion.div
          animate={{
            y: [0, -3, 0],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-4xl mb-2"
        >
          🎁
        </motion.div>
        <div className="relative">
          <span className="text-4xl font-black text-[#F472B6]">15%</span>
          <span className="text-lg font-black text-slate-700 ml-2">할인</span>
          <p className="text-xs text-slate-600 mt-1 font-bold">
            첫 만남을 축하하는 특별 선물
          </p>
        </div>
      </div>

      {/* 안내 카드들 */}
      <div className="space-y-2">
        <div className="bg-white rounded-lg p-3 flex items-center gap-3 border-2 border-slate-900">
          <div className="w-8 h-8 bg-[#F472B6] rounded-full flex items-center justify-center flex-shrink-0 border-2 border-slate-900">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">첫 방문 감사 선물</p>
            <p className="text-xs text-slate-600 font-bold">처음 방문해주신 분께 드리는 특별 할인</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 flex items-center gap-3 border-2 border-slate-900">
          <div className="w-8 h-8 bg-[#F472B6] rounded-full flex items-center justify-center flex-shrink-0 border-2 border-slate-900">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">AI가 찾아주는 나만의 향기</p>
            <p className="text-xs text-slate-600 font-bold">이미지 분석으로 시그니처 퍼퓸을 만들어보세요</p>
          </div>
        </div>
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

      {/* 제출 버튼 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleClaim}
        disabled={isSubmitting}
        className="w-full py-3 bg-[#F472B6] hover:bg-[#EC4899] disabled:bg-slate-300 text-white font-black rounded-xl transition-colors disabled:cursor-not-allowed border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
      >
        {isSubmitting ? '발급 중...' : '🎉 15% 웰컴 쿠폰 받기!'}
      </motion.button>
    </div>
  )
}
