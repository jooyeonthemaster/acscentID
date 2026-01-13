'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Clock, Check, Sparkles, Gift, Users, ShoppingBag, Cake, Loader2, LucideIcon } from 'lucide-react'
import { CouponUsageModal } from './CouponUsageModal'

interface UserCoupon {
  id: string
  coupon_id: string
  is_used: boolean
  used_at: string | null
  claimed_at: string
  coupon: {
    code: string
    type: string
    discount_percent: number
    title: string
    description: string
    valid_until: string | null
  }
}

interface CouponListProps {
  viewMode: 'grid' | 'list'
}

const COUPON_TYPE_INFO: Record<string, { icon: LucideIcon; color: string; bgGradient: string }> = {
  welcome: { icon: Gift, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  birthday: { icon: Cake, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  referral: { icon: Users, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  repurchase: { icon: ShoppingBag, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
}

export function CouponList({ viewMode }: CouponListProps) {
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all')
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCouponClick = (userCoupon: UserCoupon) => {
    if (!userCoupon.is_used) {
      setSelectedCoupon(userCoupon)
      setIsModalOpen(true)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/coupons/my')
      const data = await response.json()
      if (response.ok) {
        setCoupons(data.coupons || [])
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
    }
    setLoading(false)
  }

  const filteredCoupons = coupons.filter((coupon) => {
    if (filter === 'available') return !coupon.is_used
    if (filter === 'used') return coupon.is_used
    return true
  })

  const availableCount = coupons.filter((c) => !c.is_used).length
  const usedCount = coupons.filter((c) => c.is_used).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#F472B6] animate-spin" />
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-200">
          <Ticket className="w-12 h-12 text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-slate-700 mb-2">아직 쿠폰이 없어요</h3>
        <p className="text-slate-500 font-bold">메인 페이지에서 로켓을 클릭해 쿠폰을 받아보세요!</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 필터 버튼 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'all'
              ? 'bg-[#F472B6] text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-pink-50'
          }`}
        >
          전체 ({coupons.length})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'available'
              ? 'bg-[#F472B6] text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-pink-50'
          }`}
        >
          사용 가능 ({availableCount})
        </button>
        <button
          onClick={() => setFilter('used')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'used'
              ? 'bg-slate-400 text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-slate-50'
          }`}
        >
          사용 완료 ({usedCount})
        </button>
      </div>

      {/* 쿠폰 목록 */}
      <AnimatePresence mode="popLayout">
        {filteredCoupons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-slate-500 font-bold">
              {filter === 'available' ? '사용 가능한 쿠폰이 없어요' : '사용 완료된 쿠폰이 없어요'}
            </p>
          </motion.div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {filteredCoupons.map((userCoupon, index) => {
              const typeInfo = COUPON_TYPE_INFO[userCoupon.coupon.type] || COUPON_TYPE_INFO.welcome
              const Icon = typeInfo.icon
              const validUntil = userCoupon.coupon.valid_until
              const isExpired = validUntil ? new Date(validUntil) < new Date() : false
              const isUsable = !userCoupon.is_used && !isExpired

              return (
                <motion.div
                  key={userCoupon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCouponClick(userCoupon)}
                  className={`relative bg-white rounded-2xl border-3 border-slate-900 overflow-hidden ${
                    isUsable ? 'shadow-[4px_4px_0_#000] cursor-pointer hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all' : 'opacity-60'
                  }`}
                >
                  {/* 쿠폰 헤더 */}
                  <div className={`bg-gradient-to-br ${typeInfo.bgGradient} px-4 py-3 border-b-2 border-slate-900`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-[#F472B6] flex items-center justify-center border-2 border-slate-900`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-slate-900">{userCoupon.coupon.title}</span>
                      </div>
                      {userCoupon.is_used && (
                        <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full border border-slate-300">
                          사용완료
                        </span>
                      )}
                      {!userCoupon.is_used && isExpired && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">
                          만료됨
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 쿠폰 바디 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl font-black text-[#F472B6]">
                        {userCoupon.coupon.discount_percent}%
                      </span>
                      <span className="text-lg font-black text-slate-600">할인</span>
                    </div>
                    <p className="text-sm text-slate-600 font-bold mb-3">
                      {userCoupon.coupon.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">
                        {userCoupon.is_used
                          ? `사용일: ${new Date(userCoupon.used_at!).toLocaleDateString('ko-KR')}`
                          : validUntil
                            ? `만료일: ${new Date(validUntil).toLocaleDateString('ko-KR')}`
                            : '만료일: 무제한'}
                      </span>
                    </div>
                  </div>

                  {/* 점선 구분선 */}
                  <div className="absolute left-0 right-0 bottom-16 flex items-center px-4">
                    <div className="w-4 h-4 bg-[#FFF8E7] rounded-full -ml-6 border-r-2 border-slate-900" />
                    <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                    <div className="w-4 h-4 bg-[#FFF8E7] rounded-full -mr-6 border-l-2 border-slate-900" />
                  </div>

                  {/* 쿠폰 코드 */}
                  <div className="px-4 pb-4 pt-2">
                    <div className="bg-slate-100 rounded-lg px-3 py-2 text-center border-2 border-slate-200">
                      <span className="text-sm font-mono font-bold text-slate-600">
                        {userCoupon.coupon.code}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* 쿠폰 사용 안내 모달 */}
      <CouponUsageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        coupon={selectedCoupon?.coupon || null}
      />
    </div>
  )
}
