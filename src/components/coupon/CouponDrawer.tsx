"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, LogIn } from 'lucide-react'
import { useCoupon } from '@/contexts/CouponContext'
import { StickerTicket } from '@/components/home/Stickers'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TICKET_COLORS: Record<string, string> = {
  birthday: '#FBCFE8',
  referral: '#BAE6FD',
  repurchase: '#FEF08A',
  welcome: '#D9F99D',
}

export function CouponDrawer() {
  const { isDrawerOpen, closeDrawer, availableCoupons, claimCoupon } = useCoupon()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClaimCoupon = async (couponId: string) => {
    setClaimingId(couponId)
    setError(null)

    const result = await claimCoupon(couponId)

    if (result.success) {
      setClaimedIds((prev) => [...prev, couponId])
    } else if (result.requireLogin) {
      setError('로그인 후 쿠폰을 받을 수 있어요!')
    } else {
      setError(result.error || '쿠폰 발급에 실패했습니다')
    }

    setClaimingId(null)
  }

  const handleLogin = () => {
    closeDrawer()
    router.push('/api/auth/kakao')
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#FEFCE2] z-[70] shadow-[-8px_0_24px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">특별 혜택</h2>
                <p className="text-sm text-slate-300">오늘의 쿠폰을 받아가세요</p>
              </div>
              <button
                onClick={closeDrawer}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 에러 메시지 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between"
                >
                  <span>{error}</span>
                  {error.includes('로그인') && (
                    <button
                      onClick={handleLogin}
                      className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      <LogIn className="w-3 h-3" />
                      로그인
                    </button>
                  )}
                </motion.div>
              )}

              {/* 쿠폰 목록 */}
              {availableCoupons.map((coupon, index) => {
                const isClaimed = coupon.isClaimed || claimedIds.includes(coupon.id)
                const isClaiming = claimingId === coupon.id

                return (
                  <motion.div
                    key={coupon.id}
                    initial={{ opacity: 0, y: 20, rotate: 5 }}
                    animate={{ opacity: 1, y: 0, rotate: [-3, 2, -2][index % 3] }}
                    transition={{ delay: index * 0.1, type: 'spring' }}
                    className="relative"
                  >
                    <StickerTicket
                      title={coupon.title}
                      discount={`${coupon.discount_percent}%`}
                      color={TICKET_COLORS[coupon.type] || '#BAE6FD'}
                      className={`w-full ${isClaimed ? 'opacity-60' : ''}`}
                    />

                    {/* 쿠폰 받기 버튼 */}
                    <div className="absolute bottom-4 right-4">
                      {isClaimed ? (
                        <div className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-bold">
                          <Check className="w-4 h-4" />
                          받음
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimCoupon(coupon.id)}
                          disabled={isClaiming}
                          className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isClaiming ? '받는 중...' : '쿠폰 받기'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {availableCoupons.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-lg font-bold">현재 사용 가능한 쿠폰이 없어요</p>
                  <p className="text-sm mt-2">나중에 다시 확인해주세요!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t-4 border-slate-900 bg-white/50 px-6 py-4">
              <p className="text-xs text-slate-500 text-center">
                쿠폰은 마이페이지에서 확인할 수 있어요
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
