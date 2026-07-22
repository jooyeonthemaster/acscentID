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
  birthday: '#F0F0EB',
  referral: '#F6F6F2',
  repurchase: '#FFF4C8',
  welcome: '#F6F6F2',
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
          <Tag size={16} className="text-[var(--muted-ink)]" />
          <span className="font-bold text-[var(--ink)] text-sm lg:text-base">{t('checkout.couponApply')}</span>
        </div>
        {selectedCoupon && (
          <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">
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
            className={`bg-[var(--paper)] rounded-[6px] p-3 flex items-center justify-between ${
              isRepurchase(selectedCoupon)
                ? 'border border-[var(--line)] ring-2 ring-[var(--line)]'
                : 'border border-[var(--line)]'
            }`}
            style={{ backgroundColor: COUPON_COLORS[selectedCoupon.type] || '#DFDFDF' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] flex items-center justify-center">
                {isRepurchase(selectedCoupon) ? (
                  <Gift size={20} className="text-[var(--muted-ink)]" />
                ) : (
                  <Ticket size={20} className="text-[var(--ink)]" />
                )}
              </div>
              <div>
                <p className="font-black text-[var(--ink)] flex items-center gap-1.5">
                  {selectedCoupon.title}
                  {isRepurchase(selectedCoupon) && (
                    <span className="bg-[var(--soft)] text-[var(--ink)] font-black text-[10px] lg:text-[12px] rounded-full px-1.5 py-0.5">
                      무제한 사용
                    </span>
                  )}
                </p>
                <p className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">
                  {getCouponDiscountLabel(selectedCoupon)} 할인권
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="w-8 h-8 bg-[var(--paper)]/50 hover:bg-[var(--paper)]/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-[var(--muted-ink)]" />
            </button>
          </motion.div>
          {selectedCouponUnusedAmount > 0 && (
            <div className="flex items-start gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-xs lg:text-sm font-bold leading-relaxed text-[var(--ink)]">
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
          className="w-full bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--line)] rounded-[6px] p-3 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 size={16} className="text-[var(--muted-ink)] animate-spin" />
            ) : (
              <Ticket size={16} className="text-[var(--muted-ink)]" />
            )}
            <span className="text-[var(--muted-ink)] font-bold text-sm lg:text-base">
              {isLoading
                ? t('coupon.loadingCoupons')
                : eligibleCoupons.length > 0
                  ? t('coupon.availableCount', { count: eligibleCoupons.length })
                  : t('coupon.noAvailableCoupons')}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-[var(--muted-ink)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-[6px] text-xs lg:text-sm font-bold flex items-center gap-2">
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
            <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] overflow-hidden">
              {/* 사용 가능한 쿠폰 */}
              {eligibleCoupons.length > 0 && (
                <div className="divide-y-2 divide-[var(--line)]">
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
                        className={`w-full p-3 hover:bg-[var(--soft)] transition-colors flex items-center gap-3 text-left ${
                          repurchase ? 'bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)]' : ''
                        }`}
                      >
                        {/* 재구매 강조 배지 */}
                        {repurchase && (
                          <div className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] text-[var(--ink)] text-[10px] lg:text-[12px] font-black rounded-full border border-[var(--line)] whitespace-nowrap">
                            🎁 재구매 혜택
                          </div>
                        )}
                        <div
                          className={`w-12 h-12 rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 ${
                            repurchase ? 'border-[var(--line)] ring-2 ring-[var(--line)]' : 'border-[var(--line)]'
                          }`}
                          style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#DFDFDF' }}
                        >
                          {repurchase ? (
                            <Gift size={20} className="text-[var(--muted-ink)]" />
                          ) : (
                            <span className="text-[10px] lg:text-[12px] font-black text-[var(--ink)]">
                              {coupon.discount_percent === 100 && coupon.discount_type !== 'fixed_amount' ? 'FREE' : getCouponDiscountLabel(coupon)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[var(--ink)] flex items-center gap-1.5 flex-wrap">
                            {coupon.title}
                            {repurchase && (
                              <span className="bg-[var(--soft)] text-[var(--ink)] font-black text-[10px] lg:text-[12px] rounded-full px-1.5 py-0.5">
                                무제한 사용
                              </span>
                            )}
                          </p>
                          <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">
                            -{couponDiscount.toLocaleString()}{t('currency.suffix')} {t('coupon.discount')}
                          </p>
                          {couponUnusedAmount > 0 && (
                            <p className="mt-1 text-[11px] lg:text-[13px] font-bold leading-snug text-[var(--muted-ink)]">
                              남은 {couponUnusedAmount.toLocaleString()}원은 사용 후 소멸
                            </p>
                          )}
                        </div>
                        <Check size={16} className="text-[var(--muted-ink)] opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 사용 불가 쿠폰 */}
              {ineligibleCoupons.length > 0 && (
                <div className="bg-[var(--soft)] divide-y divide-[var(--line)]">
                  <div className="px-3 py-2">
                    <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">{t('coupon.notUsable')}</p>
                  </div>
                  {ineligibleCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="w-full p-3 opacity-50 flex items-center gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-[6px] border border-[var(--line)] flex items-center justify-center flex-shrink-0 grayscale"
                        style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#DFDFDF' }}
                      >
                        <span className="text-[10px] lg:text-[12px] font-black text-[var(--muted-ink)]">
                          {getCouponDiscountLabel(coupon)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[var(--muted-ink)]">{coupon.title}</p>
                        <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">
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
                  <Ticket size={32} className="text-[var(--muted-ink)] mx-auto mb-2" />
                  <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold">{t('coupon.noCouponsOwned')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
