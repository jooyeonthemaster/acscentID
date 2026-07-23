"use client"

import { motion } from "framer-motion"
import { Package, Star, Minus, Plus, Trash2, Check, Gift } from "lucide-react"
import { useTranslations } from 'next-intl'
import type { CartItem, ProductType } from "@/types/cart"
import { PRODUCT_TYPE_BADGES, formatPrice, isScentPaperSize } from "@/types/cart"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useStoreProductText } from "@/hooks/useStoreProductText"
import { getEffectiveProductType } from "@/lib/products/store-products"

interface MultiItemOrderSummaryProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onUpdateSize: (itemId: string, size: string) => void
  onRemoveItem: (itemId: string) => void
  isFreeShippingPromo?: boolean
  promoName?: string
  isRepurchaser?: boolean
}

function getStoreProductMeta(analysisData: CartItem['analysis_data']) {
  if (!analysisData || typeof analysisData !== 'object' || !('storeProduct' in analysisData)) return null
  const storeProduct = (analysisData as { storeProduct?: unknown }).storeProduct
  if (!storeProduct || typeof storeProduct !== 'object') return null
  return storeProduct as {
    slug?: string
    title?: string
    size?: string
    scentName?: string
    perfumeId?: string
    requestNote?: string
  }
}

export function MultiItemOrderSummary({
  items,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
  isFreeShippingPromo = false,
  promoName,
  isRepurchaser,
}: MultiItemOrderSummaryProps) {
  const t = useTranslations()
  const { getOptions } = useProductPricing()
  const storeText = useStoreProductText()
  const getOptionLabel = (productType: ProductType, option: { size: string; label: string; product_type?: ProductType }) => {
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
  const getStoreProductTitle = (slug: string | undefined, title: string | undefined, size: string) => {
    if (slug) {
      return storeText({
        slug,
        title: title || size,
        shortLabel: title || size,
        description: '',
        included: [],
      }).title
    }
    if (size === 'scent_paper') return t.has('store.items.scent-paper.title') ? t('store.items.scent-paper.title') : t('checkout.optionScentPaper')
    if (size === '50ml') return t.has('store.items.perfume-50ml.title') ? t('store.items.perfume-50ml.title') : t('checkout.optionPerfume50')
    if (size === '10ml') return t.has('store.items.perfume-10ml.title') ? t('store.items.perfume-10ml.title') : t('checkout.optionPerfume10')
    return title || size
  }
  const renderProductTypeBadge = (productType: ProductType) => {
    const badge = PRODUCT_TYPE_BADGES[productType] || { bg: 'bg-[var(--soft)]', text: 'text-[var(--muted-ink)]', border: 'border-[var(--line)]', labelShort: productType }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold rounded-[6px] ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.labelShort}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-5 space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
            <Package size={16} className="text-[var(--ink)]" />
          </div>
          <h3 className="font-black text-lg text-[var(--ink)]">{t('checkout.orderProduct')}</h3>
        </div>
        <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">{t('checkout.itemCountSuffix', { count: items.length })}</span>
      </div>

      {/* 재구매 쿠폰 배너 */}
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

      {/* 상품 목록 */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const effectiveProductType = getEffectiveProductType(item.product_type, item.analysis_data)
          const storeMeta = effectiveProductType === 'store_product'
            ? getStoreProductMeta(item.analysis_data)
            : null
          const storeProductTitle = storeMeta
            ? getStoreProductTitle(storeMeta.slug, storeMeta.title, storeMeta.size || item.size)
            : null
          const imageAlt = storeMeta && storeProductTitle
            ? `${storeMeta.scentName || item.perfume_name} · ${storeProductTitle}`
            : item.perfume_name

          return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]"
          >
            {/* 이미지 */}
            <div className="w-16 h-16 flex-shrink-0 rounded-[6px] overflow-hidden bg-[var(--soft)] border border-[var(--line)]">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={imageAlt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Star size={20} className="text-[var(--muted-ink)]" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderProductTypeBadge(effectiveProductType)}
                  </div>
                  <p className="font-black text-sm lg:text-base truncate text-[var(--ink)]">
                    {storeMeta?.scentName || item.perfume_name}
                  </p>
                  {storeMeta && (
                    <p className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">
                      {storeProductTitle || getStoreProductTitle(undefined, undefined, item.size)}
                      {storeMeta.perfumeId && ` · ${storeMeta.perfumeId}`}
                    </p>
                  )}
                  {storeMeta?.requestNote && (
                    <p className="mt-1 rounded-[6px] border border-[var(--line)] bg-[var(--canvas)] px-2 py-1 text-[11px] lg:text-[13px] font-medium text-[var(--ink)] break-words whitespace-pre-wrap">
                      <span className="font-black text-[var(--muted-ink)]">{t('store.detail.requestOnlyLabel')} </span>
                      {storeMeta.requestNote}
                    </p>
                  )}
                  {item.twitter_name && (
                    <p className="text-xs lg:text-sm text-[var(--muted-ink)]">@{item.twitter_name}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-[var(--muted-ink)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 사이즈 선택 */}
              <div className="mt-2 flex items-center gap-2">
                {effectiveProductType === 'figure_diffuser' || effectiveProductType === 'store_product' ? (
                  <span className="px-2 py-0.5 bg-[var(--soft)] text-[var(--muted-ink)] rounded-[6px] text-xs lg:text-sm font-bold border border-[var(--line)]">
                    {effectiveProductType === 'figure_diffuser'
                      ? t('checkout.setProduct')
                      : storeProductTitle || getStoreProductTitle(undefined, undefined, item.size)}
                  </span>
                ) : (
                  <select
                    value={item.size}
                    onChange={(e) => onUpdateSize(item.id, e.target.value)}
                    className="px-2 py-1 bg-[var(--paper)] rounded-[6px] text-xs lg:text-sm font-bold border border-[var(--line)]"
                  >
                    {getOptions(effectiveProductType).map(option => (
                      <option key={option.size} value={option.size}>
                        {getOptionLabel(effectiveProductType, option)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 수량 & 가격 */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 border border-[var(--line)] rounded-[6px] overflow-hidden">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    disabled={item.quantity <= 1}
                    className="p-1 hover:bg-[var(--soft)] disabled:opacity-50"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-xs lg:text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    disabled={item.quantity >= 10}
                    className="p-1 hover:bg-[var(--soft)] disabled:opacity-50"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="font-black text-[var(--ink)]">
                  {formatPrice(item.price * item.quantity)}{t('currency.suffix')}
                </span>
              </div>
            </div>
          </motion.div>
          )
        })}
      </div>

      {/* 안내 */}
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4">
        <p className="text-sm lg:text-base font-black text-[var(--ink)] mb-2">{t('checkout.orderGuide')}</p>
        <ul className="space-y-1.5 text-xs lg:text-sm text-[var(--muted-ink)] font-bold">
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
            {isFreeShippingPromo ? (
              <span className="text-[var(--muted-ink)] font-bold">
                {t('checkout.promoFreeShipping', { promoName: promoName || t('checkout.eventLabel') })}
              </span>
            ) : (
              t('checkout.freeShippingOver')
            )}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">✓</span>
            {t('checkout.shippingAfterDeposit')}
          </li>
        </ul>
      </div>
    </motion.div>
  )
}
