"use client"

import { motion } from "framer-motion"
import { Package, Star, Sparkles, Check, Palette, GraduationCap, Bird, Plus, Minus, Heart, Gift, ShoppingBag } from "lucide-react"
import { useTranslations } from 'next-intl'
import type { ProductType } from "@/types/cart"
import { FREE_SHIPPING_THRESHOLD, formatPrice, isScentPaperSize } from "@/types/cart"
import { useProductPricing } from "@/hooks/useProductPricing"

// 가격 옵션은 admin_product_pricing(DB) 기반이라 동적. selectedSize 는 임의 옵션 코드 허용.
interface OrderSummaryProps {
  perfumeName: string
  perfumeBrand: string
  userImage: string | null
  productType?: ProductType
  selectedSize: string
  onSizeChange: (size: string) => void
  price: number
  keywords: string[]
  isFreeShippingPromo?: boolean
  quantity: number
  onQuantityChange: (quantity: number) => void
  isRepurchaser?: boolean
}

export function OrderSummary({
  perfumeName,
  perfumeBrand,
  userImage,
  productType = "image_analysis",
  selectedSize,
  onSizeChange,
  price,
  keywords,
  isFreeShippingPromo = false,
  quantity = 1,
  onQuantityChange,
  isRepurchaser,
}: OrderSummaryProps) {
  const t = useTranslations()
  const { getOptions } = useProductPricing()
  const isFigureDiffuser = productType === "figure_diffuser"
  const isGraduation = productType === "graduation"
  const isSignature = productType === "signature"
  const isStoreProduct = productType === "store_product"
  // [FIX] CRITICAL #2: chemistry_set 분기 추가
  const isChemistrySet = productType === "chemistry_set"
  // 시향지 애드온 선택 시 — 포함 사항을 시향지 전용으로 표기 (퍼퓸/세트 구성 안내가 맞지 않으므로)
  const isScentPaper = isScentPaperSize(selectedSize)

  // 동적 가격 옵션 — DB(admin_product_pricing) 기반. 추가/삭제/순서변경 즉시 반영.
  const options = getOptions(productType)

  const computeDiscount = (price?: number, original?: number | null): number | null => {
    if (!price || !original || original <= price) return null
    return Math.round(((original - price) / original) * 100)
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#000] space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#FBCFE8] border-2 border-slate-900 flex items-center justify-center">
          <Package size={16} className="text-slate-900" />
        </div>
        <h3 className="font-black text-lg text-slate-900">{t('checkout.orderProduct')}</h3>
      </div>

      {/* 상품 정보 */}
      <div className="flex gap-4">
        {/* 이미지 */}
        <div className="w-24 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#FEF9C3] border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
          {userImage ? (
            <img
              src={userImage}
              alt={t('checkout.analysisImage')}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Star size={20} className="text-slate-400" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm text-[#F472B6] font-black tracking-wide">{perfumeBrand}</p>
            <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">{perfumeName}</h4>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 bg-[#FEF9C3] text-slate-900 rounded-full font-bold border border-slate-900"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          <p className="text-xl font-black text-slate-900">
            {quantity > 1 ? (
              <>
                {(price * quantity).toLocaleString()}{t('currency.suffix')}
                <span className="text-xs text-slate-500 font-bold ml-1">
                  ({price.toLocaleString()}{t('currency.suffix')} × {quantity})
                </span>
              </>
            ) : (
              <>{price.toLocaleString()}{t('currency.suffix')}</>
            )}
          </p>
        </div>
      </div>

      {/* 용량/상품 선택 */}
      <div className="space-y-3">
        <p className="text-sm font-black text-slate-900 flex items-center gap-2">
          {isFigureDiffuser ? (
            <>
              <Palette size={14} className="text-cyan-500" />
              {t('checkout.productSelection')}
            </>
          ) : isGraduation ? (
            <>
              <GraduationCap size={14} className="text-emerald-500" />
              {t('checkout.graduationPerfumeSelection')}
            </>
          ) : isSignature ? (
            <>
              <Bird size={14} className="text-amber-500" />
              {t('checkout.signaturePerfumeLabel')}
            </>
          ) : isStoreProduct ? (
            <>
              <ShoppingBag size={14} className="text-lime-500" />
              상품 선택
            </>
          ) : isChemistrySet ? (
            <>
              <Heart size={14} className="text-violet-500" />
              {t('chemistry.result.purchase')}
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-[#F472B6]" />
              {t('checkout.sizeSelection')}
            </>
          )}
        </p>

        {/* 가격 옵션 — DB(admin_product_pricing) 기반 동적 렌더링 */}
        {options.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-sm font-bold text-slate-400">
            {t('checkout.sizeSelection')}
          </div>
        ) : options.length === 1 ? (
          /* 단일 옵션 — 카드형 (항상 선택됨) */
          (() => {
            const option = options[0]
            const discount = computeDiscount(option.price, option.original_price)
            return (
              <div className="grid grid-cols-1 gap-3">
                <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-[#FEF9C3] to-amber-50 shadow-[3px_3px_0px_#000]">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {option.image_url && (
                        <img
                          src={option.image_url}
                          alt={option.label}
                          className="w-12 h-12 rounded-xl border-2 border-slate-900 object-cover bg-white"
                        />
                      )}
                      <p className="font-black text-slate-900 text-lg truncate">{option.label}</p>
                    </div>
                    <div className="flex items-end gap-2 shrink-0">
                      <p className="text-xl font-black text-slate-900">{formatPrice(option.price)}{t('currency.suffix')}</p>
                      {option.original_price && option.original_price > option.price && (
                        <>
                          <span className="text-xs text-slate-400 line-through">{formatPrice(option.original_price)}{t('currency.suffix')}</span>
                          {discount !== null && (
                            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded">{discount}% OFF</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          /* 다중 옵션 — 버튼 그리드 */
          <div className={`grid items-stretch gap-3 ${options.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {options.map((option) => {
              const discount = computeDiscount(option.price, option.original_price)
              const selected = selectedSize === option.size
              return (
                <button
                  key={option.size}
                  onClick={() => onSizeChange(option.size)}
                  className={`relative flex h-full min-h-[172px] flex-col rounded-xl border-2 p-2.5 text-left transition-all ${
                    selected
                      ? "border-slate-900 bg-[#FEF9C3] shadow-[2px_2px_0px_#000]"
                      : "border-slate-300 bg-white hover:border-slate-900 hover:shadow-[2px_2px_0px_#000]"
                  }`}
                >
                  {selected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {option.image_url ? (
                      <img
                        src={option.image_url}
                        alt={option.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50">
                        <Package size={20} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div>
                      <p className="text-[15px] font-black leading-tight text-slate-900">{option.label}</p>
                      <p className="mt-0.5 text-sm font-black leading-tight text-slate-900">
                        {formatPrice(option.price)}{t('currency.suffix')}
                      </p>
                      {option.original_price && option.original_price > option.price ? (
                        <span className="mt-1 block text-[10px] leading-none text-slate-400 line-through">
                          {formatPrice(option.original_price)}{t('currency.suffix')}
                        </span>
                      ) : (
                        <span aria-hidden className="mt-1 block h-[10px]" />
                      )}
                    </div>
                    <div className="mt-1">
                      {discount !== null ? (
                        <span className="inline-block rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                          {discount}% OFF
                        </span>
                      ) : (
                        <span aria-hidden className="inline-block h-[18px]" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 수량 선택 */}
      <div className="space-y-3">
        <p className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Package size={14} className="text-amber-500" />
          {t('checkout.quantitySelection')}
        </p>
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border-2 border-slate-200">
          <div className="flex items-center bg-white rounded-lg border-2 border-slate-300">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center font-black text-lg text-slate-900">{quantity}</span>
            <button
              onClick={() => onQuantityChange(Math.min(10, quantity + 1))}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
              disabled={quantity >= 10}
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="font-black text-xl text-slate-900">
            {(price * quantity).toLocaleString()}{t('currency.suffix')}
          </span>
        </div>
        {isRepurchaser === true && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl px-3 py-2.5 border-2 border-emerald-400"
          >
            <Check size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-emerald-800 font-black">재구매 고객님, 감사합니다! 🎉</p>
              <p className="text-[11px] text-emerald-700 font-bold mt-0.5">10% 할인 쿠폰을 아래에서 선택하여 적용해보세요</p>
            </div>
          </motion.div>
        )}
        {isRepurchaser === false && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl px-3 py-2.5 border-2 border-pink-300"
          >
            <Gift size={16} className="text-pink-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-pink-700 font-black">첫 구매 후 다음 주문부터 계속 10% 할인! 💝</p>
              <p className="text-[11px] text-pink-600 font-bold mt-0.5">재구매 쿠폰이 자동 발급되어 횟수 제한 없이 사용 가능해요</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* 포함 사항 */}
      {/* [FIX] CRITICAL #2: chemistry_set 포함 사항 색상 분기 */}
      <div className={`${isScentPaper ? 'bg-yellow-100' : isFigureDiffuser ? 'bg-cyan-100' : isGraduation ? 'bg-emerald-100' : isSignature ? 'bg-amber-100' : isStoreProduct ? 'bg-lime-100' : isChemistrySet ? 'bg-violet-100' : 'bg-[#E9D5FF]'} border-2 border-slate-900 rounded-xl p-4`}>
        <p className="text-sm font-black text-slate-900 mb-3">{t('checkout.included')}</p>
        <ul className="space-y-2 text-sm text-slate-800 font-bold">
          {isScentPaper ? (
            /* 시향지 애드온 포함 사항 — 퍼퓸 구성 대신 시향지만 안내 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeScentPaper')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isFigureDiffuser ? (
            /* 피규어 디퓨저 세트 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeFigure')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeEssence')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePotBase')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isGraduation ? (
            /* 졸업 퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeGradPerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeReport')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeGradCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : t('checkout.shippingFeeAmount')}
              </li>
            </>
          ) : isSignature ? (
            /* 시그니처 뿌덕퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeSignaturePerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeKeyring')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                : t('checkout.freeShippingOverInfo')}
              </li>
            </>
          ) : isStoreProduct ? (
            /* 상품 섹션 일반 상품 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isScentPaper ? '선택한 향 시향지' : `${selectedSize} 향수 (스프레이 타입)`}
              </li>
              {!isScentPaper && (
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                  프리미엄 패키지
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isChemistrySet ? (
            /* [FIX] CRITICAL #2: 레이어링 퍼퓸 세트 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('chemistry.result.purchase')} ({selectedSize === 'set_50ml' ? '50ml' : '10ml'} x 2)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeAnalysisCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : (
            /* 향수 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeAnalysisPerfume', { size: selectedSize })}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeAnalysisCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-pink-600 font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          )}
        </ul>
      </div>
    </motion.div>
  )
}
