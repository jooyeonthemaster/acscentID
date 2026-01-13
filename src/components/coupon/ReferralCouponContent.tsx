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
    const text = `AC'SCENT에서 나만의 향수를 만들어보세요! 이 코드로 가입하면 10% 할인!\n\n추천인 코드: ${referralCode}`

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
          className="w-10 h-10 border-4 border-slate-200 border-t-[#F472B6] rounded-full mx-auto"
        />
        <p className="text-slate-500 mt-3 text-sm font-bold">추천인 코드를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-[#FBCFE8] text-slate-800 px-4 py-3 rounded-xl text-sm font-bold border-2 border-slate-900 text-center">
          {error}
        </div>
        {error.includes('로그인') && (
          <a
            href="/api/auth/kakao"
            className="block w-full py-3 bg-[#FEE500] hover:bg-[#FDD835] text-slate-900 font-black text-center rounded-xl transition-colors border-2 border-slate-900 shadow-[3px_3px_0_#000]"
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
      <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FBCFE8] rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000] text-center">
        <div className="mb-3">
          <span className="text-4xl font-black text-[#F472B6]">10%</span>
          <span className="text-lg font-black text-slate-700 ml-2">할인</span>
          <p className="text-xs text-slate-600 font-bold mt-1">친구와 나, 둘 다 받아요!</p>
        </div>

        {/* 추천인 코드 */}
        <p className="text-xs text-slate-500 font-bold mb-2">내 추천 코드</p>
        <div className="bg-slate-900 text-white text-2xl font-black py-3 px-6 rounded-lg tracking-[0.3em] inline-block">
          {referralCode}
        </div>
      </div>

      {/* 공유 버튼들 */}
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className={`py-3 px-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
            copied
              ? 'bg-[#A5F3FC] border-slate-900 shadow-[2px_2px_0_#000]'
              : 'bg-white border-slate-900 shadow-[2px_2px_0_#000]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-slate-900" />
              <span className="font-bold text-sm text-slate-900">복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-700" />
              <span className="font-bold text-sm text-slate-700">코드 복사</span>
            </>
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          className="py-3 px-3 bg-[#F472B6] rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#000] flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span className="font-bold text-sm text-white">공유하기</span>
        </motion.button>
      </div>

      {/* 안내 + 초대 현황 통합 */}
      <div className="flex gap-2">
        <div className="flex-1 bg-[#FEF9C3] rounded-lg p-3 border-2 border-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-[#F472B6]" />
            <span className="font-bold text-xs text-slate-800">친구가 가입하면</span>
          </div>
          <p className="text-xs text-slate-600 font-bold">친구도 10% 할인 쿠폰을 받아요</p>
        </div>
        <div className="bg-[#FFF8E7] rounded-lg p-3 border-2 border-slate-900 text-center min-w-[80px]">
          <p className="text-xs text-slate-500 font-bold">초대한 친구</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Users className="w-4 h-4 text-[#F472B6]" />
            <span className="text-2xl font-black text-slate-900">{inviteCount}</span>
            <span className="text-sm font-bold text-slate-600">명</span>
          </div>
        </div>
      </div>

      {/* 확인 버튼 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={closeClaimModal}
        className="w-full py-3 bg-[#F472B6] hover:bg-[#EC4899] text-white font-black rounded-xl transition-colors border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
      >
        💝 확인했어요!
      </motion.button>
    </div>
  )
}
