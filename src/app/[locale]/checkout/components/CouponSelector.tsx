"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, ChevronDown, X, Check, Ticket, AlertCircle, Loader2, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CheckoutCoupon } from '@/types/coupon'

interface CouponSelectorProps {
  selectedCoupon: CheckoutCoupon | null
  onSelectCoupon: (coupon: CheckoutCoupon | null) => void
  productPrice: number
  cheapestItemPrice?: number
  totalQuantity?: number // 현재 결제할 총 상품 수량 (스탬프 즉시할인 계산용)
}

const COUPON_COLORS: Record<string, string> = {
  birthday: '#FBCFE8',
  referral: '#BAE6FD',
  repurchase: '#FEF08A',
  welcome: '#D9F99D',
  stamp_10: '#C4B5FD',
  stamp_20: '#C084FC',
  stamp_free: '#F9A8D4',
}

export function CouponSelector({ selectedCoupon, onSelectCoupon, productPrice, cheapestItemPrice, totalQuantity = 1 }: CouponSelectorProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [coupons, setCoupons] = useState<CheckoutCoupon[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 쿠폰 + 스탬프 즉시할인 fetch
  useEffect(() => {
    fetchAllCoupons()
  }, [totalQuantity])

  const fetchAllCoupons = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 기존 쿠폰 + 스탬프 적격 할인 동시 fetch
      const [couponRes, stampRes] = await Promise.all([
        fetch('/api/checkout/coupons'),
        fetch(`/api/stamps/checkout-eligible?quantity=${totalQuantity}`),
      ])

      const couponData = await couponRes.json()
      const stampData = await stampRes.json()

      let allCoupons: CheckoutCoupon[] = []

      if (couponData.success) {
        allCoupons = couponData.coupons || []
      } else if (couponData.requireLogin) {
        setError(t('coupon.loginToUseCoupon'))
      }

      // 스탬프 즉시할인 (prospective) 쿠폰 추가
      if (stampData.success && stampData.eligibleDiscounts) {
        for (const discount of stampData.eligibleDiscounts) {
          // 이미 기존 쿠폰으로 존재하면 중복 추가 안 함
          const alreadyExists = allCoupons.some(
            c => c.type === discount.reward_type && c.isEligible
          )
          if (!alreadyExists) {
            if (discount.source === 'prospective') {
              // 아직 쿠폰이 발급되지 않았지만, 이번 구매로 마일스톤 달성 → 즉시 할인
              allCoupons.unshift({
                id: `prospective_${discount.reward_type}`,
                userCouponId: `prospective_${discount.reward_type}`,
                type: discount.reward_type,
                discount_percent: discount.discount_percent,
                title: `🎉 즉시 ${discount.label}`,
                isEligible: true,
                ineligibleReason: undefined,
              })
            } else if (discount.source === 'existing_coupon' && discount.userCouponId) {
              // 기존에 발급된 스탬프 쿠폰이 있는데 checkout/coupons에서 안 나온 경우
              const existsInCoupons = allCoupons.some(c => c.userCouponId === discount.userCouponId)
              if (!existsInCoupons) {
                allCoupons.unshift({
                  id: discount.reward_type,
                  userCouponId: discount.userCouponId,
                  type: discount.reward_type,
                  discount_percent: discount.discount_percent,
                  title: `스탬프 ${discount.label}`,
                  isEligible: true,
                })
              }
            }
          }
        }
      }

      setCoupons(allCoupons)
    } catch (e) {
      setError(t('errors.network'))
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
    ? selectedCoupon.type === 'stamp_free'
      ? (cheapestItemPrice || productPrice)
      : Math.floor(productPrice * (selectedCoupon.discount_percent / 100))
    : 0

  const isProspective = (coupon: CheckoutCoupon) =>
    coupon.userCouponId?.startsWith('prospective_')

  return (
    <div className="space-y-3">
      {/* 쿠폰 선택 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-[#F472B6]" />
          <span className="font-bold text-slate-900 text-sm">{t('checkout.couponApply')}</span>
        </div>
        {selectedCoupon && (
          <span className="text-sm font-bold text-[#F472B6]">
            -{discountAmount.toLocaleString()}{t('currency.suffix')}
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
              {isProspective(selectedCoupon) ? (
                <Zap size={20} className="text-purple-600" />
              ) : (
                <Ticket size={20} className="text-slate-900" />
              )}
            </div>
            <div>
              <p className="font-black text-slate-900">{selectedCoupon.title}</p>
              <p className="text-sm font-bold text-slate-700">
                {selectedCoupon.type === 'stamp_free'
                  ? `상품 1개 무료 (-${(cheapestItemPrice || productPrice).toLocaleString()}원)`
                  : t('coupon.discountPercent', { percent: selectedCoupon.discount_percent })}
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
                ? t('coupon.loadingCoupons')
                : eligibleCoupons.length > 0
                  ? t('coupon.availableCount', { count: eligibleCoupons.length })
                  : t('coupon.noAvailableCoupons')}
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
                  {eligibleCoupons.map((coupon) => {
                    const prospective = isProspective(coupon)
                    const couponDiscount = coupon.type === 'stamp_free'
                      ? (cheapestItemPrice || productPrice)
                      : Math.floor(productPrice * (coupon.discount_percent / 100))

                    return (
                      <button
                        key={coupon.id}
                        onClick={() => handleSelect(coupon)}
                        className="w-full p-3 hover:bg-slate-50 transition-colors flex items-center gap-3 text-left"
                      >
                        <div
                          className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                            prospective ? 'border-purple-500 ring-2 ring-purple-300' : 'border-slate-900'
                          }`}
                          style={{ backgroundColor: COUPON_COLORS[coupon.type] || '#BAE6FD' }}
                        >
                          {prospective ? (
                            <Zap size={20} className="text-purple-700" />
                          ) : (
                            <span className="font-black text-slate-900">
                              {coupon.discount_percent === 100 ? 'FREE' : `${coupon.discount_percent}%`}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">
                            {coupon.title}
                            {prospective && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full">
                                즉시할인
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#F472B6] font-bold">
                            -{couponDiscount.toLocaleString()}{t('currency.suffix')} {t('coupon.discount')}
                          </p>
                        </div>
                        <Check size={16} className="text-green-500 opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 사용 불가 쿠폰 */}
              {ineligibleCoupons.length > 0 && (
                <div className="bg-slate-50 divide-y divide-slate-200">
                  <div className="px-3 py-2">
                    <p className="text-xs text-slate-400 font-bold">{t('coupon.notUsable')}</p>
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
                  <Ticket size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-bold">{t('coupon.noCouponsOwned')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
