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
  const getOptionLabel = (option: { size: string; label: string; product_type?: ProductType }) => {
    const optionProductType = option.product_type || productType

    if (isScentPaperSize(option.size)) {
      return optionProductType === 'chemistry_set'
        ? t('checkout.optionScentPaperTwo')
        : t('checkout.optionScentPaper')
    }
    if (option.size === '10ml') {
      if (optionProductType === 'graduation') return t('checkout.optionGraduation10')
      if (optionProductType === 'signature') return t('checkout.optionSignature10')
      if (optionProductType === 'payment_test') return t('checkout.optionPaymentTest')
      // 사주 분석 퍼퓸 — 전용 라벨 키가 있으면 사용
      if (optionProductType === 'saju_perfume' && t.has('checkout.optionSaju10')) return t('checkout.optionSaju10')
      return t('checkout.optionPerfume10')
    }
    if (option.size === '50ml') {
      if (optionProductType === 'saju_perfume' && t.has('checkout.optionSaju50')) return t('checkout.optionSaju50')
      return t('checkout.optionPerfume50')
    }
    if (option.size === 'set') {
      if (optionProductType === 'image_analysis_paper') return t('checkout.optionImageAnalysisPaper')
      if (optionProductType === 'figure_diffuser') return t('checkout.optionFigureSet')
      return t('checkout.setProduct')
    }
    if (option.size === 'set_10ml') return t('checkout.optionChemistrySet10')
    if (option.size === 'set_50ml') return t('checkout.optionChemistrySet50')
    return option.label
  }
  const getStoreProductTitle = () => {
    if (isScentPaper) return t.has('store.items.scent-paper.title') ? t('store.items.scent-paper.title') : t('checkout.optionScentPaper')
    if (selectedSize === '50ml') return t.has('store.items.perfume-50ml.title') ? t('store.items.perfume-50ml.title') : t('checkout.optionPerfume50')
    if (selectedSize === '10ml') return t.has('store.items.perfume-10ml.title') ? t('store.items.perfume-10ml.title') : t('checkout.optionPerfume10')
    return selectedSize
  }

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
      className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-5 space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
          <Package size={16} className="text-[var(--ink)]" />
        </div>
        <h3 className="font-black text-lg text-[var(--ink)]">{t('checkout.orderProduct')}</h3>
      </div>

      {/* 상품 정보 */}
      <div className="flex gap-4">
        {/* 이미지 */}
        <div className="w-24 h-28 flex-shrink-0 rounded-[6px] overflow-hidden bg-[var(--soft)] border border-[var(--line)]">
          {userImage ? (
            <img
              src={userImage}
              alt={t('checkout.analysisImage')}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Star size={20} className="text-[var(--muted-ink)]" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm lg:text-base text-[var(--muted-ink)] font-black tracking-wide">{perfumeBrand}</p>
            <h4 className="font-black text-[var(--ink)] text-base leading-tight mt-0.5">{perfumeName}</h4>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-[10px] lg:text-[12px] px-2 py-0.5 bg-[var(--soft)] text-[var(--ink)] rounded-full font-bold border border-[var(--line)]"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          <p className="text-xl font-black text-[var(--ink)]">
            {quantity > 1 ? (
              <>
                {(price * quantity).toLocaleString()}{t('currency.suffix')}
                <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold ml-1">
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
        <p className="text-sm lg:text-base font-black text-[var(--ink)] flex items-center gap-2">
          {isFigureDiffuser ? (
            <>
              <Palette size={14} className="text-[var(--muted-ink)]" />
              {t('checkout.productSelection')}
            </>
          ) : isGraduation ? (
            <>
              <GraduationCap size={14} className="text-[var(--muted-ink)]" />
              {t('checkout.graduationPerfumeSelection')}
            </>
          ) : isSignature ? (
            <>
              <Bird size={14} className="text-[var(--muted-ink)]" />
              {t('checkout.signaturePerfumeLabel')}
            </>
          ) : isStoreProduct ? (
            <>
              <ShoppingBag size={14} className="text-[var(--muted-ink)]" />
              {t('checkout.productSelection')}
            </>
          ) : isChemistrySet ? (
            <>
              <Heart size={14} className="text-[var(--muted-ink)]" />
              {t('chemistry.result.purchase')}
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-[var(--muted-ink)]" />
              {t('checkout.sizeSelection')}
            </>
          )}
        </p>

        {/* 가격 옵션 — DB(admin_product_pricing) 기반 동적 렌더링 */}
        {options.length === 0 ? (
          <div className="rounded-[6px] border-2 border-dashed border-[var(--line)] p-4 text-center text-sm lg:text-base font-bold text-[var(--muted-ink)]">
            {t('checkout.sizeSelection')}
          </div>
        ) : options.length === 1 ? (
          /* 단일 옵션 — 카드형 (항상 선택됨) */
          (() => {
            const option = options[0]
            const optionLabel = getOptionLabel(option)
            const discount = computeDiscount(option.price, option.original_price)
            return (
              <div className="grid grid-cols-1 gap-3">
                <div className="relative p-4 rounded-[6px] border border-[var(--line)] bg-gradient-to-br from-[var(--soft)] to-[var(--canvas)]">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--soft)] rounded-full border border-[var(--line)] flex items-center justify-center">
                    <Check size={12} className="text-[var(--ink)]" strokeWidth={3} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {option.image_url && (
                        <img
                          src={option.image_url}
                          alt={optionLabel}
                          className="w-12 h-12 rounded-[6px] border border-[var(--line)] object-cover bg-[var(--paper)]"
                        />
                      )}
                      <p className="font-black text-[var(--ink)] text-lg truncate">{optionLabel}</p>
                    </div>
                    <div className="flex items-end gap-2 shrink-0">
                      <p className="text-xl font-black text-[var(--ink)]">{formatPrice(option.price)}{t('currency.suffix')}</p>
                      {option.original_price && option.original_price > option.price && (
                        <>
                          <span className="text-xs lg:text-sm text-[var(--muted-ink)] line-through">{formatPrice(option.original_price)}{t('currency.suffix')}</span>
                          {discount !== null && (
                            <span className="px-1.5 py-0.5 bg-[var(--soft)] text-[var(--ink)] text-[9px] font-black rounded-[6px]">{discount}% OFF</span>
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
              const optionLabel = getOptionLabel(option)
              return (
                <button
                  key={option.size}
                  onClick={() => onSizeChange(option.size)}
                  className={`relative flex h-full min-h-[172px] flex-col rounded-[6px] border-2 p-2.5 text-left transition-all ${
                    selected
                      ? "border-[var(--line)] bg-[var(--soft)]"
                      : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line)]"
                  }`}
                >
                  {selected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--soft)] rounded-full border border-[var(--line)] flex items-center justify-center">
                      <Check size={10} className="text-[var(--ink)]" strokeWidth={3} />
                    </div>
                  )}
                  <div className="mb-2 aspect-square w-full overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--paper)]">
                    {option.image_url ? (
                      <img
                        src={option.image_url}
                        alt={optionLabel}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--soft)]">
                        <Package size={20} className="text-[var(--muted-ink)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div>
                      <p className="text-[15px] font-black leading-tight text-[var(--ink)]">{optionLabel}</p>
                      <p className="mt-0.5 text-sm lg:text-base font-black leading-tight text-[var(--ink)]">
                        {formatPrice(option.price)}{t('currency.suffix')}
                      </p>
                      {option.original_price && option.original_price > option.price ? (
                        <span className="mt-1 block text-[10px] lg:text-[12px] leading-none text-[var(--muted-ink)] line-through">
                          {formatPrice(option.original_price)}{t('currency.suffix')}
                        </span>
                      ) : (
                        <span aria-hidden className="mt-1 block h-[10px]" />
                      )}
                    </div>
                    <div className="mt-1">
                      {discount !== null ? (
                        <span className="inline-block rounded-[6px] bg-[var(--soft)] px-1.5 py-0.5 text-[9px] font-black text-[var(--ink)]">
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
        <p className="text-sm lg:text-base font-black text-[var(--ink)] flex items-center gap-2">
          <Package size={14} className="text-[var(--muted-ink)]" />
          {t('checkout.quantitySelection')}
        </p>
        <div className="flex items-center justify-between bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
          <div className="flex items-center bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-[var(--muted-ink)] hover:text-[var(--muted-ink)] transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center font-black text-lg text-[var(--ink)]">{quantity}</span>
            <button
              onClick={() => onQuantityChange(Math.min(10, quantity + 1))}
              className="w-10 h-10 flex items-center justify-center text-[var(--muted-ink)] hover:text-[var(--muted-ink)] transition-colors disabled:opacity-30"
              disabled={quantity >= 10}
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="font-black text-xl text-[var(--ink)]">
            {(price * quantity).toLocaleString()}{t('currency.suffix')}
          </span>
        </div>
        {isRepurchaser === true && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] px-3 py-2.5 border border-[var(--line)]"
          >
            <Check size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs lg:text-sm text-[var(--ink)] font-black">재구매 고객님, 감사합니다! 🎉</p>
              <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] font-bold mt-0.5">10% 할인 쿠폰을 아래에서 선택하여 적용해보세요</p>
            </div>
          </motion.div>
        )}
        {isRepurchaser === false && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] px-3 py-2.5 border border-[var(--line)]"
          >
            <Gift size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-black">첫 구매 후 다음 주문부터 계속 10% 할인! 💝</p>
              <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] font-bold mt-0.5">재구매 쿠폰이 자동 발급되어 횟수 제한 없이 사용 가능해요</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* 포함 사항 */}
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4">
        <p className="text-sm lg:text-base font-black text-[var(--ink)] mb-3">{t('checkout.included')}</p>
        <ul className="space-y-2 text-sm lg:text-base text-[var(--ink)] font-bold">
          {isScentPaper ? (
            /* 시향지 애드온 포함 사항 — 퍼퓸 구성 대신 시향지만 안내 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeScentPaper')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isFigureDiffuser ? (
            /* 피규어 디퓨저 세트 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeFigure')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeEssence')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includePotBase')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isGraduation ? (
            /* 졸업 퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeGradPerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeReport')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeGradCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : t('checkout.shippingFeeAmount')}
              </li>
            </>
          ) : isSignature ? (
            /* 시그니처 뿌덕퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeSignaturePerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeKeyring')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                : t('checkout.freeShippingOverInfo')}
              </li>
            </>
          ) : isStoreProduct ? (
            /* 상품 섹션 일반 상품 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isScentPaper ? getStoreProductTitle() : t('checkout.storeProductPerfumeIncluded', { product: getStoreProductTitle() })}
              </li>
              {!isScentPaper && (
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                  {t('checkout.includePremiumPackage')}
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : isChemistrySet ? (
            /* [FIX] CRITICAL #2: 레이어링 퍼퓸 세트 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('chemistry.result.purchase')} ({selectedSize === 'set_50ml' ? '50ml' : '10ml'} x 2)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeAnalysisCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          ) : (
            /* 향수 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeAnalysisPerfume', { size: selectedSize })}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {t('checkout.includeAnalysisCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
                {isFreeShippingPromo
                  ? <span className="text-[var(--muted-ink)] font-bold">{t('checkout.freeShippingLabel')} ({t('checkout.eventLabel')})</span>
                  : (price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount'))}
              </li>
            </>
          )}
        </ul>
      </div>
    </motion.div>
  )
}
