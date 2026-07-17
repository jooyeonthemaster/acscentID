"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, ChevronDown, X, Check, Ticket, AlertCircle, Loader2, Gift } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CheckoutCoupon, calculateCouponDiscount, getCouponDiscountLabel } from '@/types/coupon'

interface CouponSelectorProps {
  selectedCoupon: CheckoutCoupon | null
  onSelectCoupon: (coupon: CheckoutCoupon | null) => void
  productPrice: number
  cheapestItemPrice?: number
  enabled?: boolean
}

const COUPON_COLORS: Record<string, string> = {
  birthday: '#1B1F2C',
  referral: '#DFDFDF',
  repurchase: '#1B1F2C',
  welcome: '#EDEDED',
}

export function CouponSelector({ selectedCoupon, onSelectCoupon, productPrice, enabled = true }: CouponSelectorProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [coupons, setCoupons] = useState<CheckoutCoupon[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    fetchAllCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const fetchAllCoupons = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const couponRes = await fetch('/api/checkout/coupons')
      const couponData = await couponRes.json()

      let allCoupons: CheckoutCoupon[] = []

      if (couponData.success) {
        allCoupons = couponData.coupons || []
      } else if (couponData.requireLogin) {
        setError(t('coupon.loginToUseCoupon'))
      }

      setCoupons(allCoupons)
    } catch (e) {
      setError(t('errors.network'))
    }
    setIsLoading(false)
  }

  // 재구매 쿠폰이 맨 위로 오도록 정렬
  const eligibleCoupons = coupons
    .filter(c => c.isEligible)
    .sort((a, b) => (a.type === 'repurchase' ? -1 : 0) - (b.type === 'repurchase' ? -1 : 0))
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
    ? calculateCouponDiscount(productPrice, selectedCoupon)
    : 0
  const selectedCouponFaceValue = selectedCoupon?.discount_type === 'fixed_amount'
    ? Number(selectedCoupon.discount_amount || 0)
    : 0
  const selectedCouponUnusedAmount = selectedCouponFaceValue > discountAmount
    ? selectedCouponFaceValue - discountAmount
    : 0

  const isRepurchase = (coupon: CheckoutCoupon) => coupon.type === 'repurchase'

  return (
    <div className="space-y-3">
      {/* 쿠폰 선택 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-[#9F9F9F]" />
          <span className="font-bold text-[#E9E2D0] text-sm lg:text-base">{t('checkout.couponApply')}</span>
        </div>
        {selectedCoupon && (
          <span className="text-sm lg:text-base font-bold text-[#9F9F9F]">
            -{discountAmount.toLocaleString()}{t('currency.suffix')}
          </span>
        )}
      </div>

      {/* 선택된 쿠폰 또는 선택 버튼 */}
      {selectedCoupon ? (
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-[#12141D] rounded-[12px] p-3 flex items-center justify-between ${
              isRepurchase(selectedCoupon)
                ? 'border-2 border-[#343A4C] ring-2 ring-[#262A38]'
                : 'border-2 border-[#262A38]'
            }`}
            style={{ backgroundColor: COUPON_COLORS[selectedCoupon.type] || '#DFDFDF' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#12141D] rounded-[12px] border-2 border-[#262A38] flex items-center justify-center">
                {isRepurchase(selectedCoupon) ? (
                  <Gift size={20} className="text-[#8B8578]" />
                ) : (
                  <Ticket size={20} className="text-[#E9E2D0]" />
                )}
              </div>
              <div>
                <p className="font-black text-[#E9E2D0] flex items-center gap-1.5">
                  {selectedCoupon.title}
                  {isRepurchase(selectedCoupon) && (
                    <span className="bg-[#232838] text-[#E9E2D0] font-black text-[10px] lg:text-[12px] rounded-full px-1.5 py-0.5">
                      무제한 사용
                    </span>
                  )}
                </p>
                <p className="text-sm lg:text-base font-bold text-[#A69F8D]">
                  {getCouponDiscountLabel(selectedCoupon)} 할인권
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="w-8 h-8 bg-[#12141D]/50 hover:bg-[#12141D]/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-[#A69F8D]" />
            </button>
          </motion.div>
          {selectedCouponUnusedAmount > 0 && (
            <div className="flex items-start gap-2 rounded-[12px] border border-[#262A38] bg-[#0C0E16] px-3 py-2 text-xs lg:text-sm font-bold leading-relaxed text-[#E9E2D0]">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                이 주문에서는 {discountAmount.toLocaleString()}원만 할인되고, 남은 {selectedCouponUnusedAmount.toLocaleString()}원은 사용 후 소멸됩니다.
              </span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!enabled || isLoading || coupons.length === 0}
          className="w-full bg-[#12141D] border-2 border-[#262A38] hover:border-[#262A38] rounded-[12px] p-3 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 size={16} className="text-[#8B8578] animate-spin" />
            ) : (
              <Ticket size={16} className="text-[#8B8578]" />
            )}
            <span className="text-[#8B8578] font-bold text-sm lg:text-base">
              {isLoading
                ? t('coupon.loadingCoupons')
                : eligibleCoupons.length > 0
                  ? t('coupon.availableCount', { count: eligibleCoupons.length })
                  : t('coupon.noAvailableCoupons')}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-[#8B8578] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-[12px] text-xs lg:text-sm font-bold flex items-center gap-2">
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
            <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] overflow-hidden">
              {/* 사용 가능한 쿠폰 */}
              {eligibleCoupons.length > 0 && (
                <div className="divide-y-2 divide-[#1E222E]">
                  {eligibleCoupons.map((coupon) => {
                    const repurchase = isRepurchase(coupon)
                    const couponDiscount = calculateCouponDiscount(productPrice, coupon)
                    const couponFaceValue = coupon.discount_type === 'fixed_amount'
                      ? Number(coupon.discount_amount || 0)
                      : 0
                    const couponUnusedAmount = couponFaceValue > couponDiscount
                      ? couponFaceValue - couponDiscount
                      : 0

                    return (
                      <button
                        key={coupon.id}
                        onClick={() => handleSelect(coupon)}
                        className={`w-full p-3 hover:bg-[#151823] transition-colors flex items-center gap-3 text-left ${
                          repurchase ? 'bg-gradient-to-r from-[#0C0E16] to-[#0C0E16]' : ''
                        }`}
                      >
                        {/* 재구매 강조 배지 */}
                        {repurchase && (
                          <div className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-[#161925] to-[#161925] text-[#E9E2D0] text-[10px] lg:text-[12px] font-black rounded-full border-2 border-[#262A38] whitespace-nowrap">
                            🎁 재구매 혜택
                          </div>
                        )}
                        <div
                          className={`w-12 h-12 rounded-[12px] border-2 flex items-center justify-center flex-shrink-0 ${
                            repurchase ? 'border-[#343A4C] ring-2 ring-[#262A38]' : 'border-[#262A38]'
                          }`}
                          style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#DFDFDF' }}
                        >
                          {repurchase ? (
                            <Gift size={20} className="text-[#A69F8D]" />
                          ) : (
                            <span className="text-[10px] lg:text-[12px] font-black text-[#E9E2D0]">
                              {coupon.discount_percent === 100 && coupon.discount_type !== 'fixed_amount' ? 'FREE' : getCouponDiscountLabel(coupon)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[#E9E2D0] flex items-center gap-1.5 flex-wrap">
                            {coupon.title}
                            {repurchase && (
                              <span className="bg-[#232838] text-[#E9E2D0] font-black text-[10px] lg:text-[12px] rounded-full px-1.5 py-0.5">
                                무제한 사용
                              </span>
                            )}
                          </p>
                          <p className="text-xs lg:text-sm text-[#9F9F9F] font-bold">
                            -{couponDiscount.toLocaleString()}{t('currency.suffix')} {t('coupon.discount')}
                          </p>
                          {couponUnusedAmount > 0 && (
                            <p className="mt-1 text-[11px] lg:text-[13px] font-bold leading-snug text-[#A69F8D]">
                              남은 {couponUnusedAmount.toLocaleString()}원은 사용 후 소멸
                            </p>
                          )}
                        </div>
                        <Check size={16} className="text-[#8B8578] opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 사용 불가 쿠폰 */}
              {ineligibleCoupons.length > 0 && (
                <div className="bg-[#151823] divide-y divide-[#262A38]">
                  <div className="px-3 py-2">
                    <p className="text-xs lg:text-sm text-[#8B8578] font-bold">{t('coupon.notUsable')}</p>
                  </div>
                  {ineligibleCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="w-full p-3 opacity-50 flex items-center gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-[12px] border-2 border-[#262A38] flex items-center justify-center flex-shrink-0 grayscale"
                        style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#DFDFDF' }}
                      >
                        <span className="text-[10px] lg:text-[12px] font-black text-[#8B8578]">
                          {getCouponDiscountLabel(coupon)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#8B8578]">{coupon.title}</p>
                        <p className="text-xs lg:text-sm text-[#8B8578] font-bold">
                          {coupon.ineligibleReason || t('coupon.checkCondition')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 쿠폰 없음 */}
              {coupons.length === 0 && !isLoading && (
                <div className="p-6 text-center">
                  <Ticket size={32} className="text-[#5C564A] mx-auto mb-2" />
                  <p className="text-sm lg:text-base text-[#8B8578] font-bold">{t('coupon.noCouponsOwned')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
