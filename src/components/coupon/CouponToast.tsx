"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { useCouponPolicy } from '@/hooks/useCouponPolicy'
import { useState } from 'react'

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
          <div className="bg-white border-4 border-slate-900 rounded-2xl shadow-[6px_6px_0px_#000] overflow-hidden">
            {/* 닫기 버튼 */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            {/* 상단 배너 */}
            <div className="bg-[#F472B6] px-4 py-2">
              <p className="text-sm font-black text-white flex items-center gap-2">
                <Gift className="w-4 h-4" />
                선물이 도착했어요!
              </p>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="px-5 py-4">
              <h3 className="text-lg font-black text-slate-900 mb-1 break-keep">
                당신을 위한 특별 쿠폰
              </h3>
              <p className="text-sm text-slate-600 mb-4">
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
                    className="w-16 h-10 bg-gradient-to-br from-[#F472B6] to-[#EC4899] rounded-lg border-2 border-slate-900 flex items-center justify-center"
                  >
                    <span className="text-xs font-black text-white">
                      {coupon.discount_percent}%
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* 버튼 그룹 */}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenCoupons}
                  className="flex-1 bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                >
                  쿠폰 받기
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 text-slate-500 font-bold hover:text-slate-700 transition-colors text-sm"
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
                  className="w-4 h-4 rounded border-2 border-slate-300 text-[#F472B6] focus:ring-[#F472B6]"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
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
