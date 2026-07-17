"use client"

import { motion } from 'framer-motion'
import { useCoupon } from '@/contexts/CouponContext'
import { Ticket } from 'lucide-react'

export function CouponFloatingButton() {
  const { openDrawer, availableCoupons } = useCoupon()

  // 받을 수 있는 쿠폰 수
  const unclaimedCount = availableCoupons.filter((c) => !c.isClaimed).length

  return (
    <motion.button
      onClick={openDrawer}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 1,
      }}
      whileHover={{
        scale: 1.1,
        rotate: -5,
      }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-24 right-6 z-50 group"
      aria-label="쿠폰 보기"
    >
      {/* 티켓 모양 버튼 */}
      <div className="relative">
        {/* 메인 티켓 */}
        <div className="bg-[#F5EFE2] border-4 border-[#262A38] rounded-[12px] px-4 py-3 transition-shadow">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#E9E2D0]" />
            <div className="text-left">
              <p className="text-xs lg:text-sm font-bold text-white/80">혜택</p>
              <p className="text-sm lg:text-base font-black text-[#E9E2D0]">쿠폰</p>
            </div>
          </div>

          {/* 점선 구분 */}
          <div className="absolute top-2 bottom-2 right-10 border-l-2 border-dashed border-white/40" />
        </div>

        {/* 배지 - 받을 수 있는 쿠폰 수 */}
        {unclaimedCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-[#C8C8C8] border-2 border-[#262A38] rounded-full flex items-center justify-center"
          >
            <span className="text-xs lg:text-sm font-black text-[#E9E2D0]">{unclaimedCount}</span>
          </motion.div>
        )}

        {/* 펄스 효과 */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
          className="absolute inset-0 bg-[#161925] rounded-[12px] -z-10"
        />
      </div>
    </motion.button>
  )
}
