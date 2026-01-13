"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cake, Star, PartyPopper, Gift } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { AvailableCoupon } from '@/types/coupon'

interface BirthdayCouponContentProps {
  coupon: AvailableCoupon | null
}

type ProofType = 'self' | 'idol'

export function BirthdayCouponContent({ coupon }: BirthdayCouponContentProps) {
  const { claimBirthdayCoupon, closeClaimModal } = useCoupon()
  const [proofType, setProofType] = useState<ProofType | null>(null)
  const [idolName, setIdolName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    try {
      const userInfo = localStorage.getItem('userInfo')
      if (userInfo) {
        const data = JSON.parse(userInfo)
        if (data.name) {
          setIdolName(data.name)
        }
      }
    } catch (e) {
      console.error('Failed to load idol name:', e)
    }
  }, [])

  const handleSubmit = async () => {
    if (!proofType) {
      setError('생일 유형을 선택해주세요')
      return
    }
    if (!coupon) {
      setError('쿠폰 정보를 찾을 수 없어요')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await claimBirthdayCoupon(
      coupon.id,
      proofType,
      proofType === 'idol' ? idolName : undefined
    )

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

  const currentMonth = new Date().getMonth() + 1

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
        <p className="text-sm text-slate-600 mt-1 font-bold">결제할 때 20% 할인 적용하세요</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 할인율 카드 */}
      <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FBCFE8] rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000] text-center relative overflow-hidden">
        <div className="absolute -top-3 -right-3 text-5xl opacity-20">🎂</div>
        <div className="relative">
          <span className="text-4xl font-black text-[#F472B6]">20%</span>
          <span className="text-lg font-black text-slate-700 ml-2">할인</span>
          <p className="text-xs text-slate-600 mt-1 font-bold">
            {currentMonth}월 생일이면 누구나!
          </p>
        </div>
      </div>

      {/* 유형 선택 */}
      <div>
        <p className="text-sm font-black text-slate-900 mb-2">누구의 생일인가요?</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setProofType('self')}
            className={`p-3 rounded-xl border-2 transition-all ${
              proofType === 'self'
                ? 'border-slate-900 bg-[#FBCFE8] shadow-[3px_3px_0_#000]'
                : 'border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 ${
              proofType === 'self'
                ? 'bg-[#F472B6] border-slate-900'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <Cake className={`w-5 h-5 ${proofType === 'self' ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-black ${proofType === 'self' ? 'text-slate-900' : 'text-slate-600'}`}>
              내 생일
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setProofType('idol')}
            className={`p-3 rounded-xl border-2 transition-all ${
              proofType === 'idol'
                ? 'border-slate-900 bg-[#FBCFE8] shadow-[3px_3px_0_#000]'
                : 'border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 ${
              proofType === 'idol'
                ? 'bg-[#F472B6] border-slate-900'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <Star className={`w-5 h-5 ${proofType === 'idol' ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-black ${proofType === 'idol' ? 'text-slate-900' : 'text-slate-600'}`}>
              최애 생일
            </span>
          </motion.button>
        </div>
      </div>

      {/* 최애 이름 표시 (최애 생일 선택 시) */}
      <AnimatePresence>
        {proofType === 'idol' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#FFF8E7] rounded-lg p-3 border-2 border-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F472B6] rounded-full flex items-center justify-center border-2 border-slate-900">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-bold">분석한 최애</p>
                <p className="font-black text-sm text-slate-900">{idolName || '(이름 없음)'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 안내 카드 */}
      <div className="bg-[#FEF9C3] rounded-lg p-3 border-2 border-slate-900 flex items-start gap-2">
        <Gift className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 font-bold">
          쿠폰은 바로 발급되고, 결제할 때 생일 증빙을 첨부하면 돼요!
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

      {/* 제출 버튼 */}
      <motion.button
        whileTap={{ scale: proofType ? 0.98 : 1 }}
        onClick={handleSubmit}
        disabled={isSubmitting || !proofType}
        className="w-full py-3 bg-[#F472B6] hover:bg-[#EC4899] disabled:bg-slate-300 text-white font-black rounded-xl transition-colors disabled:cursor-not-allowed border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
      >
        {isSubmitting ? '발급 중...' : '🎂 20% 쿠폰 받기!'}
      </motion.button>
    </div>
  )
}
