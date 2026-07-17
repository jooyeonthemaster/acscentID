"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { BirthdayCouponContent } from './BirthdayCouponContent'
import { ReferralCouponContent } from './ReferralCouponContent'
import { RepurchaseCouponContent } from './RepurchaseCouponContent'
import { WelcomeCouponContent } from './WelcomeCouponContent'

// 키컬러 기반 통일된 디자인
const MODAL_HEADERS: Record<string, { emoji: string; title: string; subtitle: string }> = {
  birthday: {
    emoji: '🎂',
    title: '생일 축하해요!',
    subtitle: '특별한 날, 특별한 향기를 선물할게요',
  },
  referral: {
    emoji: '💝',
    title: '친구와 함께 향기로운 여정을',
    subtitle: '초대하면 둘 다 10% 할인!',
  },
  repurchase: {
    emoji: '✨',
    title: '다시 찾아주셨군요!',
    subtitle: '두 번째 향기는 더 특별하게',
  },
  welcome: {
    emoji: '🎉',
    title: "AC'SCENT에 오신 것을 환영해요!",
    subtitle: '첫 만남 기념 특별 할인',
  },
}

export function CouponClaimModal() {
  const { isClaimModalOpen, selectedCouponType, selectedCoupon, closeClaimModal } = useCoupon()

  if (!selectedCouponType) return null

  const header = MODAL_HEADERS[selectedCouponType]

  const renderContent = () => {
    switch (selectedCouponType) {
      case 'birthday':
        return <BirthdayCouponContent coupon={selectedCoupon} />
      case 'referral':
        return <ReferralCouponContent coupon={selectedCoupon} />
      case 'repurchase':
        return <RepurchaseCouponContent coupon={selectedCoupon} />
      case 'welcome':
        return <WelcomeCouponContent coupon={selectedCoupon} />
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {isClaimModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeClaimModal}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-[90]"
          >
            <div className="bg-[#0E1016] rounded-[12px] overflow-hidden border-3 border-[#262A38]">
              {/* Header - 키컬러 핑크 */}
              <div className="bg-[#161925] px-5 py-4 relative">
                {/* Close Button */}
                <button
                  onClick={closeClaimModal}
                  className="absolute top-3 right-3 w-7 h-7 bg-stone-900/20 hover:bg-stone-900/30 rounded-full flex items-center justify-center transition-colors border-2 border-white/30"
                >
                  <X className="w-4 h-4 text-[#E9E2D0]" />
                </button>

                {/* Header Content */}
                <div className="text-center text-[#E9E2D0] pr-8">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.1, stiffness: 300 }}
                    className="text-4xl mb-1"
                  >
                    {header.emoji}
                  </motion.div>
                  <h2 className="text-lg font-black tracking-tight">
                    {header.title}
                  </h2>
                  <p className="text-xs lg:text-sm opacity-90 mt-0.5 font-bold">
                    {header.subtitle}
                  </p>
                </div>

                {/* Decorative elements */}
                <Sparkles className="absolute top-3 left-3 w-5 h-5 text-white/40" />
                <Sparkles className="absolute bottom-3 right-16 w-4 h-4 text-white/30" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#0E1016] rounded-t-full" />
              </div>

              {/* Content */}
              <div className="p-4 pt-3">
                {renderContent()}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
