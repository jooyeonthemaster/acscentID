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
          className="w-20 h-20 bg-[#161925] rounded-full flex items-center justify-center mx-auto mb-3 border-3 border-[#262A38]"
        >
          <PartyPopper className="w-10 h-10 text-[#E9E2D0]" />
        </motion.div>
        <h3 className="text-xl font-black text-[#E9E2D0]">쿠폰 GET!</h3>
        <p className="text-sm lg:text-base text-[#A69F8D] mt-1 font-bold">결제할 때 20% 할인 적용하세요</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 할인율 카드 */}
      <div className="bg-gradient-to-br from-[#0E1016] to-[#1B1F2C] rounded-[12px] p-4 border-2 border-[#262A38] text-center relative overflow-hidden">
        <div className="absolute -top-3 -right-3 text-5xl opacity-20">🎂</div>
        <div className="relative">
          <span className="text-4xl font-black text-[#9F9F9F]">20%</span>
          <span className="text-lg font-black text-[#A69F8D] ml-2">할인</span>
          <p className="text-xs lg:text-sm text-[#A69F8D] mt-1 font-bold">
            {currentMonth}월 생일이면 누구나!
          </p>
        </div>
      </div>

      {/* 유형 선택 */}
      <div>
        <p className="text-sm lg:text-base font-black text-[#E9E2D0] mb-2">누구의 생일인가요?</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setProofType('self')}
            className={`p-3 rounded-[12px] border-2 transition-all ${
              proofType === 'self'
                ? 'border-[#262A38] bg-[#1B1F2C]'
                : 'border-[#262A38] bg-[#12141D]'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 ${
              proofType === 'self'
                ? 'bg-[#9F9F9F] border-[#262A38]'
                : 'bg-[#1B1F2C] border-[#262A38]'
            }`}>
              <Cake className={`w-5 h-5 ${proofType === 'self' ? 'text-[#E9E2D0]' : 'text-[#8B8578]'}`} />
            </div>
            <span className={`text-sm lg:text-base font-black ${proofType === 'self' ? 'text-[#E9E2D0]' : 'text-[#A69F8D]'}`}>
              내 생일
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setProofType('idol')}
            className={`p-3 rounded-[12px] border-2 transition-all ${
              proofType === 'idol'
                ? 'border-[#262A38] bg-[#1B1F2C]'
                : 'border-[#262A38] bg-[#12141D]'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 ${
              proofType === 'idol'
                ? 'bg-[#9F9F9F] border-[#262A38]'
                : 'bg-[#1B1F2C] border-[#262A38]'
            }`}>
              <Star className={`w-5 h-5 ${proofType === 'idol' ? 'text-[#E9E2D0]' : 'text-[#8B8578]'}`} />
            </div>
            <span className={`text-sm lg:text-base font-black ${proofType === 'idol' ? 'text-[#E9E2D0]' : 'text-[#A69F8D]'}`}>
              특별한 생일
            </span>
          </motion.button>
        </div>
      </div>

      {/* 분석 대상 이름 표시 (특별한 생일 선택 시) */}
      <AnimatePresence>
        {proofType === 'idol' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0E1016] rounded-[12px] p-3 border-2 border-[#262A38] flex items-center gap-2">
              <div className="w-8 h-8 bg-[#161925] rounded-full flex items-center justify-center border-2 border-[#262A38]">
                <Star className="w-4 h-4 text-[#E9E2D0]" />
              </div>
              <div className="flex-1">
                <p className="text-xs lg:text-sm text-[#8B8578] font-bold">분석 대상</p>
                <p className="font-black text-sm lg:text-base text-[#E9E2D0]">{idolName || '(이름 없음)'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 안내 카드 */}
      <div className="bg-[#151823] rounded-[12px] p-3 border-2 border-[#262A38] flex items-start gap-2">
        <Gift className="w-4 h-4 text-[#A69F8D] flex-shrink-0 mt-0.5" />
        <p className="text-xs lg:text-sm text-[#A69F8D] font-bold">
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
            className="bg-red-100 text-red-700 px-3 py-2 rounded-[12px] text-xs lg:text-sm font-bold border-2 border-red-300"
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
        className="w-full py-3 bg-[#F5EFE2] hover:bg-[#FFFDF5] disabled:bg-[#232838] text-[#12141D] font-black rounded-[12px] transition-colors disabled:cursor-not-allowed border-2 border-[#262A38]"
      >
        {isSubmitting ? '발급 중...' : '🎂 20% 쿠폰 받기!'}
      </motion.button>
    </div>
  )
}
