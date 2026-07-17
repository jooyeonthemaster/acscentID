"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Users, Gift, Heart, Share2 } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { AvailableCoupon } from '@/types/coupon'

interface ReferralCouponContentProps {
  coupon: AvailableCoupon | null
}

export function ReferralCouponContent({ coupon }: ReferralCouponContentProps) {
  const { closeClaimModal } = useCoupon()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [inviteCount, setInviteCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReferralCode()
  }, [])

  const fetchReferralCode = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/referral/code')
      const data = await response.json()

      if (data.success) {
        setReferralCode(data.code)
        setInviteCount(data.inviteCount || 0)
      } else if (data.requireLogin) {
        setError('로그인 후 추천인 코드를 확인할 수 있어요!')
      } else {
        setError(data.error || '추천인 코드를 불러오는데 실패했어요')
      }
    } catch (e) {
      setError('네트워크 오류가 발생했어요')
    }
    setIsLoading(false)
  }

  const handleCopy = async () => {
    if (!referralCode) return

    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  const handleShare = () => {
    if (!referralCode) return

    const shareUrl = `${window.location.origin}?ref=${referralCode}`
    const text = `AC'SCENT에서 나만의 퍼퓸을 만들어보세요! 이 코드로 가입하면 10% 할인!\n\n추천인 코드: ${referralCode}`

    if (navigator.share) {
      navigator.share({
        title: "AC'SCENT 친구 초대",
        text: text,
        url: shareUrl,
      }).catch(() => handleCopy())
    } else {
      handleCopy()
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-[#262A38] border-t-[#9F9F9F] rounded-full mx-auto"
        />
        <p className="text-[#8B8578] mt-3 text-sm lg:text-base font-bold">추천인 코드를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-[#1B1F2C] text-[#E9E2D0] px-4 py-3 rounded-[12px] text-sm lg:text-base font-bold border-2 border-[#262A38] text-center">
          {error}
        </div>
        {error.includes('로그인') && (
          <a
            href="/api/auth/kakao"
            className="block w-full py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#E9E2D0] font-black text-center rounded-[12px] transition-colors border-2 border-[#262A38]"
          >
            카카오로 로그인하기
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 할인율 + 추천인 코드 통합 */}
      <div className="bg-gradient-to-br from-[#0E1016] to-[#1B1F2C] rounded-[12px] p-4 border-2 border-[#262A38] text-center">
        <div className="mb-3">
          <span className="text-4xl font-black text-[#9F9F9F]">10%</span>
          <span className="text-lg font-black text-[#A69F8D] ml-2">할인</span>
          <p className="text-xs lg:text-sm text-[#A69F8D] font-bold mt-1">친구와 나, 둘 다 받아요!</p>
        </div>

        {/* 추천인 코드 */}
        <p className="text-xs lg:text-sm text-[#8B8578] font-bold mb-2">내 추천 코드</p>
        <div className="bg-[#161925] text-[#E9E2D0] text-2xl font-black py-3 px-6 rounded-[12px] tracking-[0.3em] inline-block">
          {referralCode}
        </div>
      </div>

      {/* 공유 버튼들 */}
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className={`py-3 px-3 rounded-[12px] border-2 transition-all flex items-center justify-center gap-2 ${
            copied
              ? 'bg-[#1B1F2C] border-[#262A38]'
              : 'bg-[#12141D] border-[#262A38]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#E9E2D0]" />
              <span className="font-bold text-sm lg:text-base text-[#E9E2D0]">복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#A69F8D]" />
              <span className="font-bold text-sm lg:text-base text-[#A69F8D]">코드 복사</span>
            </>
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          className="py-3 px-3 bg-[#161925] rounded-[12px] border-2 border-[#262A38] flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4 text-[#E9E2D0]" />
          <span className="font-bold text-sm lg:text-base text-[#E9E2D0]">공유하기</span>
        </motion.button>
      </div>

      {/* 안내 + 초대 현황 통합 */}
      <div className="flex gap-2">
        <div className="flex-1 bg-[#151823] rounded-[12px] p-3 border-2 border-[#262A38]">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-[#9F9F9F]" />
            <span className="font-bold text-xs lg:text-sm text-[#E9E2D0]">친구가 가입하면</span>
          </div>
          <p className="text-xs lg:text-sm text-[#A69F8D] font-bold">친구도 10% 할인 쿠폰을 받아요</p>
        </div>
        <div className="bg-[#0E1016] rounded-[12px] p-3 border-2 border-[#262A38] text-center min-w-[80px]">
          <p className="text-xs lg:text-sm text-[#8B8578] font-bold">초대한 친구</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Users className="w-4 h-4 text-[#9F9F9F]" />
            <span className="text-2xl font-black text-[#E9E2D0]">{inviteCount}</span>
            <span className="text-sm lg:text-base font-bold text-[#A69F8D]">명</span>
          </div>
        </div>
      </div>

      {/* 확인 버튼 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={closeClaimModal}
        className="w-full py-3 bg-[#F5EFE2] hover:bg-[#FFFDF5] text-[#12141D] font-black rounded-[12px] transition-colors border-2 border-[#262A38]"
      >
        💝 확인했어요!
      </motion.button>
    </div>
  )
}
