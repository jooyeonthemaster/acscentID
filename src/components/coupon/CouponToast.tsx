"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { useCouponPolicy } from '@/hooks/useCouponPolicy'
import { useState } from 'react'
import { getCouponDiscountLabel } from '@/types/coupon'

export function CouponToast() {
  const { isToastVisible, openDrawer, availableCoupons } = useCoupon()
  const { handleDismissToast } = useCouponPolicy()
  const [neverShow, setNeverShow] = useState(false)

  // 받을 수 있는 쿠폰 수
  const unclaimedCount = availableCoupons.filter((c) => !c.isClaimed).length

  const handleOpenCoupons = () => {
    handleDismissToast(false)
    openDrawer()
  }

  const handleDismiss = () => {
    handleDismissToast(neverShow)
  }

  return (
    <AnimatePresence>
      {isToastVisible && (
        <motion.div
          initial={{ x: 120, opacity: 0, rotate: 15 }}
          animate={{ x: 0, opacity: 1, rotate: -2 }}
          exit={{ x: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          className="fixed bottom-32 right-6 z-[55] max-w-[320px]"
        >
          <div className="bg-[#12141D] border-4 border-[#262A38] rounded-[12px] overflow-hidden">
            {/* 닫기 버튼 */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-6 h-6 bg-[#1B1F2C] hover:bg-[#232838] rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-[#A69F8D]" />
            </button>

            {/* 상단 배너 */}
            <div className="bg-[#161925] px-4 py-2">
              <p className="text-sm lg:text-base font-black text-[#E9E2D0] flex items-center gap-2">
                <Gift className="w-4 h-4" />
                선물이 도착했어요!
              </p>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="px-5 py-4">
              <h3 className="text-lg font-black text-[#E9E2D0] mb-1 break-keep">
                당신을 위한 특별 쿠폰
              </h3>
              <p className="text-sm lg:text-base text-[#A69F8D] mb-4">
                {unclaimedCount > 0
                  ? `최대 20% 할인 쿠폰 ${unclaimedCount}장이 대기중!`
                  : '지금 확인해보세요!'}
              </p>

              {/* 미니 티켓 프리뷰 */}
              <div className="flex gap-2 mb-4">
                {availableCoupons.slice(0, 3).map((coupon, i) => (
                  <motion.div
                    key={coupon.id}
                    initial={{ scale: 0, rotate: 20 }}
                    animate={{ scale: 1, rotate: [-5, 0, 5][i] }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                    className="w-16 h-10 bg-gradient-to-br from-[#9F9F9F] to-[#888888] rounded-[12px] border-2 border-[#262A38] flex items-center justify-center"
                  >
                    <span className="text-xs lg:text-sm font-black text-[#E9E2D0]">
                      {getCouponDiscountLabel(coupon)}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* 버튼 그룹 */}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenCoupons}
                  className="flex-1 bg-[#161925] text-[#E9E2D0] font-bold py-2.5 px-4 rounded-[12px] hover:bg-[#161925] transition-colors text-sm lg:text-base"
                >
                  쿠폰 받기
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 text-[#8B8578] font-bold hover:text-[#A69F8D] transition-colors text-sm lg:text-base"
                >
                  나중에
                </button>
              </div>

              {/* 다시 보지 않기 체크박스 */}
              <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={neverShow}
                  onChange={(e) => setNeverShow(e.target.checked)}
                  className="w-4 h-4 rounded-[12px] border-2 border-[#262A38] text-[#9F9F9F] focus:ring-[#9F9F9F]"
                />
                <span className="text-xs lg:text-sm text-[#8B8578] group-hover:text-[#A69F8D] transition-colors">
                  다시 보지 않기
                </span>
              </label>
            </div>
          </div>

          {/* 장식: 떠다니는 별 */}
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-3 -left-3 text-2xl"
          >
            ✨
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
