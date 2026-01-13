"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, ChevronDown, X, Check, Ticket, AlertCircle, Loader2 } from 'lucide-react'
import { CheckoutCoupon } from '@/types/coupon'

interface CouponSelectorProps {
  selectedCoupon: CheckoutCoupon | null
  onSelectCoupon: (coupon: CheckoutCoupon | null) => void
  productPrice: number
}

const COUPON_COLORS: Record<string, string> = {
  birthday: '#FBCFE8',
  referral: '#BAE6FD',
  repurchase: '#FEF08A',
  welcome: '#D9F99D',
}

export function CouponSelector({ selectedCoupon, onSelectCoupon, productPrice }: CouponSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coupons, setCoupons] = useState<CheckoutCoupon[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/checkout/coupons')
      const data = await response.json()

      if (data.success) {
        setCoupons(data.coupons || [])
      } else if (data.requireLogin) {
        setError('로그인 후 쿠폰을 사용할 수 있어요')
      } else {
        setError(data.error || '쿠폰을 불러오는데 실패했어요')
      }
    } catch (e) {
      setError('네트워크 오류가 발생했어요')
    }
    setIsLoading(false)
  }

  const eligibleCoupons = coupons.filter(c => c.isEligible)
  const ineligibleCoupons = coupons.filter(c => !c.isEligible)

  const handleSelect = (coupon: CheckoutCoupon) => {
    if (!coupon.isEligible) return
    onSelectCoupon(coupon)
    setIsOpen(false)
  }

  const handleRemove = () => {
    onSelectCoupon(null)
  }

  const discountAmount = selectedCoupon
    ? Math.floor(productPrice * (selectedCoupon.discount_percent / 100))
    : 0

  return (
    <div className="space-y-3">
      {/* 쿠폰 선택 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-[#F472B6]" />
          <span className="font-bold text-slate-900 text-sm">쿠폰 적용</span>
        </div>
        {selectedCoupon && (
          <span className="text-sm font-bold text-[#F472B6]">
            -{discountAmount.toLocaleString()}원
          </span>
        )}
      </div>

      {/* 선택된 쿠폰 또는 선택 버튼 */}
      {selectedCoupon ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-slate-900 rounded-xl p-3 flex items-center justify-between"
          style={{ backgroundColor: COUPON_COLORS[selectedCoupon.type] || '#BAE6FD' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg border-2 border-slate-900 flex items-center justify-center">
              <Ticket size={20} className="text-slate-900" />
            </div>
            <div>
              <p className="font-black text-slate-900">{selectedCoupon.title}</p>
              <p className="text-sm font-bold text-slate-700">
                {selectedCoupon.discount_percent}% 할인
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="w-8 h-8 bg-white/50 hover:bg-white/80 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-slate-700" />
          </button>
        </motion.div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || coupons.length === 0}
          className="w-full bg-white border-2 border-slate-300 hover:border-slate-900 rounded-xl p-3 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 size={16} className="text-slate-400 animate-spin" />
            ) : (
              <Ticket size={16} className="text-slate-400" />
            )}
            <span className="text-slate-500 font-bold text-sm">
              {isLoading
                ? '쿠폰 불러오는 중...'
                : eligibleCoupons.length > 0
                  ? `사용 가능한 쿠폰 ${eligibleCoupons.length}장`
                  : '사용 가능한 쿠폰이 없어요'}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* 쿠폰 목록 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-[4px_4px_0_#000]">
              {/* 사용 가능한 쿠폰 */}
              {eligibleCoupons.length > 0 && (
                <div className="divide-y-2 divide-slate-100">
                  {eligibleCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      onClick={() => handleSelect(coupon)}
                      className="w-full p-3 hover:bg-slate-50 transition-colors flex items-center gap-3 text-left"
                    >
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-900 flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#BAE6FD' }}
                      >
                        <span className="font-black text-slate-900">
                          {coupon.discount_percent}%
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{coupon.title}</p>
                        <p className="text-xs text-[#F472B6] font-bold">
                          -{Math.floor(productPrice * (coupon.discount_percent / 100)).toLocaleString()}원 할인
                        </p>
                      </div>
                      <Check size={16} className="text-green-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}

              {/* 사용 불가 쿠폰 */}
              {ineligibleCoupons.length > 0 && (
                <div className="bg-slate-50 divide-y divide-slate-200">
                  <div className="px-3 py-2">
                    <p className="text-xs text-slate-400 font-bold">사용 불가</p>
                  </div>
                  {ineligibleCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="w-full p-3 opacity-50 flex items-center gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-300 flex items-center justify-center flex-shrink-0 grayscale"
                        style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#BAE6FD' }}
                      >
                        <span className="font-black text-slate-500">
                          {coupon.discount_percent}%
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-500">{coupon.title}</p>
                        <p className="text-xs text-slate-400 font-bold">
                          {coupon.ineligibleReason || '사용 조건을 확인해주세요'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 쿠폰 없음 */}
              {coupons.length === 0 && !isLoading && (
                <div className="p-6 text-center">
                  <Ticket size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-bold">보유한 쿠폰이 없어요</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
