"use client"

import { motion } from "framer-motion"
import { Package, Star, Sparkles, Check, Palette, GraduationCap, Bird, Plus, Minus, Heart, Gift } from "lucide-react"
import { useTranslations } from 'next-intl'
import type { ProductType } from "@/types/cart"
import { FREE_SHIPPING_THRESHOLD, formatPrice } from "@/types/cart"
import { useProductPricing } from "@/hooks/useProductPricing"

// [FIX] CRITICAL #1, #2: selectedSize 타입에 set_10ml/set_50ml 추가
interface OrderSummaryProps {
  perfumeName: string
  perfumeBrand: string
  userImage: string | null
  productType?: ProductType
  selectedSize: "10ml" | "50ml" | "set" | "set_10ml" | "set_50ml"
  onSizeChange: (size: "10ml" | "50ml" | "set" | "set_10ml" | "set_50ml") => void
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
  const { getOptions, getOption } = useProductPricing()
  const isFigureDiffuser = productType === "figure_diffuser"
  const isGraduation = productType === "graduation"
  const isSignature = productType === "signature"
  // [FIX] CRITICAL #2: chemistry_set 분기 추가
  const isChemistrySet = productType === "chemistry_set"

  // 동적 가격 — DB 기반 (admin 에서 변경 시 즉시 반영)
  const figureOpt = getOption('figure_diffuser', 'set')
  const graduationOpt = getOption('graduation', '10ml')
  const signatureOpt = getOption('signature', '10ml')
  const imageAnalysis10mlOpt = getOption('image_analysis', '10ml')
  const imageAnalysis50mlOpt = getOption('image_analysis', '50ml')
  const personalScent10mlOpt = getOption('personal_scent', '10ml')
  const personalScent50mlOpt = getOption('personal_scent', '50ml')
  const chemistryOptions = getOptions('chemistry_set')

  const computeDiscount = (price?: number, original?: number | null): number | null => {
    if (!price || !original || original <= price) return null
    return Math.round(((original - price) / original) * 100)
  }

  // 10ml/50ml 셀렉터에 사용할 옵션 — productType 에 따라 적절한 가격표 사용
  const tenMlOpt = productType === 'personal_scent' ? personalScent10mlOpt : imageAnalysis10mlOpt
  const fiftyMlOpt = productType === 'personal_scent' ? personalScent50mlOpt : imageAnalysis50mlOpt
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

        {isFigureDiffuser ? (
          /* 피규어 디퓨저 세트 (단일 옵션) */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-cyan-50 to-amber-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.figureSetTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.figureSetDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <p className="text-xl font-black text-slate-900">{formatPrice(figureOpt?.price ?? 48000)}{t('currency.suffix')}</p>
                  {figureOpt?.original_price && figureOpt.original_price > figureOpt.price && (
                    <>
                      <span className="text-xs text-slate-400 line-through">{formatPrice(figureOpt.original_price)}{t('currency.suffix')}</span>
                      {computeDiscount(figureOpt.price, figureOpt.original_price) !== null && (
                        <span className="px-1.5 py-0.5 bg-cyan-500 text-white text-[9px] font-black rounded">{computeDiscount(figureOpt.price, figureOpt.original_price)}% OFF</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isGraduation ? (
          /* 졸업 퍼퓸 (10ml 단일 옵션) - 에메랄드 테마 */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-emerald-50 to-amber-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.graduationPerfumeTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.graduationPerfumeDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <p className="text-xl font-black text-slate-900">{formatPrice(graduationOpt?.price ?? 34000)}{t('currency.suffix')}</p>
                  {graduationOpt?.original_price && graduationOpt.original_price > graduationOpt.price && (
                    <>
                      <span className="text-xs text-slate-400 line-through">{formatPrice(graduationOpt.original_price)}{t('currency.suffix')}</span>
                      {computeDiscount(graduationOpt.price, graduationOpt.original_price) !== null && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded">{computeDiscount(graduationOpt.price, graduationOpt.original_price)}% OFF</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isSignature ? (
          /* 시그니처 뿌덕퍼퓸 (10ml 단일 옵션) - 앰버 테마 */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🦆</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.signaturePerfumeTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.signaturePerfumeDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <p className="text-xl font-black text-slate-900">{formatPrice(signatureOpt?.price ?? 34000)}{t('currency.suffix')}</p>
                  {signatureOpt?.original_price && signatureOpt.original_price > signatureOpt.price && (
                    <>
                      <span className="text-xs text-slate-400 line-through">{formatPrice(signatureOpt.original_price)}{t('currency.suffix')}</span>
                      {computeDiscount(signatureOpt.price, signatureOpt.original_price) !== null && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded">{computeDiscount(signatureOpt.price, signatureOpt.original_price)}% OFF</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isChemistrySet ? (
          /* [FIX] CRITICAL #2: 레이어링 퍼퓸 세트 옵션 (set_10ml / set_50ml) */
          <div className="grid grid-cols-2 gap-3">
            {chemistryOptions.map((option) => (
              <button
                key={option.size}
                onClick={() => onSizeChange(option.size as "set_10ml" | "set_50ml")}
                className={`relative p-3 rounded-xl border-2 transition-all ${
                  selectedSize === option.size
                    ? "border-violet-500 bg-violet-50 shadow-[2px_2px_0px_#8b5cf6]"
                    : "border-slate-300 bg-white hover:border-violet-300 hover:shadow-[2px_2px_0px_#ddd]"
                }`}
              >
                {selectedSize === option.size && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
                <p className="font-black text-slate-900 text-base">{option.label}</p>
                <p className="text-sm font-black text-violet-600 mt-0.5">{formatPrice(option.price)}{t('currency.suffix')}</p>
              </button>
            ))}
          </div>
        ) : (
          /* 향수 옵션 (10ml / 50ml) */
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSizeChange("10ml")}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                selectedSize === "10ml"
                  ? "border-slate-900 bg-[#FEF9C3] shadow-[2px_2px_0px_#000]"
                  : "border-slate-300 bg-white hover:border-slate-900 hover:shadow-[2px_2px_0px_#000]"
              }`}
            >
              {selectedSize === "10ml" && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
              <p className="font-black text-slate-900 text-base">10ml</p>
              <p className="text-[10px] text-slate-500 font-bold">{t('checkout.sprayType')}</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{formatPrice(tenMlOpt?.price ?? 24000)}{t('currency.suffix')}</p>
            </button>
            <button
              onClick={() => onSizeChange("50ml")}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                selectedSize === "50ml"
                  ? "border-slate-900 bg-[#FEF9C3] shadow-[2px_2px_0px_#000]"
                  : "border-slate-300 bg-white hover:border-slate-900 hover:shadow-[2px_2px_0px_#000]"
              }`}
            >
              {selectedSize === "50ml" && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
              <p className="font-black text-slate-900 text-base">50ml</p>
              <p className="text-[10px] text-slate-500 font-bold">{t('checkout.sprayType')}</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{formatPrice(fiftyMlOpt?.price ?? 48000)}{t('currency.suffix')}</p>
            </button>
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
      <div className={`${isFigureDiffuser ? 'bg-cyan-100' : isGraduation ? 'bg-emerald-100' : isSignature ? 'bg-amber-100' : isChemistrySet ? 'bg-violet-100' : 'bg-[#E9D5FF]'} border-2 border-slate-900 rounded-xl p-4`}>
        <p className="text-sm font-black text-slate-900 mb-3">{t('checkout.included')}</p>
        <ul className="space-y-2 text-sm text-slate-800 font-bold">
          {isFigureDiffuser ? (
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
