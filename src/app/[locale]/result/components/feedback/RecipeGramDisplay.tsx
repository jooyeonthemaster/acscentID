'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Scale, Beaker, Sparkles, Copy, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  GeneratedRecipe,
  ProductType,
  PRODUCT_TYPES,
  calculateGranuleAmounts,
} from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'

interface RecipeGramDisplayProps {
  recipe: GeneratedRecipe
  perfumeName: string
  titleLabel?: string
  headerEmoji?: string
  headerColor?: 'green' | 'violet' | 'pink'
  showProductSelector?: boolean
  externalSelectedProduct?: ProductType
  onProductChange?: (product: ProductType) => void
}

/**
 * Shared gram-based recipe display for image analysis and chemistry perfumes.
 */
export function RecipeGramDisplay({
  recipe,
  perfumeName,
  titleLabel,
  headerEmoji,
  headerColor = 'green',
  showProductSelector = true,
  externalSelectedProduct,
  onProductChange,
}: RecipeGramDisplayProps) {
  const t = useTranslations('feedback')
  const { getLocalizedName } = useLocalizedPerfumes()
  const [internalSelectedProduct, setInternalSelectedProduct] = useState<ProductType>('perfume_10ml')
  const [copied, setCopied] = useState(false)

  const selectedProduct = externalSelectedProduct ?? internalSelectedProduct
  const setSelectedProduct = (p: ProductType) => {
    if (onProductChange) onProductChange(p)
    else setInternalSelectedProduct(p)
  }

  const getGranuleColor = (id: string) => {
    const perfume = perfumes.find((p) => p.id === id)
    return perfume?.primaryColor || '#6B7280'
  }

  const isLightColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180
  }

  const productInfo = useMemo(
    () => PRODUCT_TYPES.find((p) => p.id === selectedProduct)!,
    [selectedProduct]
  )

  const granuleAmounts = useMemo(
    () => calculateGranuleAmounts(recipe, selectedProduct),
    [recipe, selectedProduct]
  )

  const totalAmount = useMemo(
    () => ({
      ml: granuleAmounts.reduce((sum, g) => sum + g.amountMl, 0),
      g: granuleAmounts.reduce((sum, g) => sum + g.amountG, 0),
    }),
    [granuleAmounts]
  )
  const getProductLabel = (productType: ProductType) => {
    if (productType === 'perfume_10ml') return t('productPerfume10Label')
    if (productType === 'perfume_50ml') return t('productPerfume50Label')
    return t('productDiffuser5Label')
  }

  const handleCopyRecipe = async () => {
    const recipeText = `[${perfumeName} - ${getProductLabel(productInfo.id)}]

${t('totalIngredient')}: ${totalAmount.ml.toFixed(2)}g

${granuleAmounts
  .map((g) => `- ${getLocalizedName(g.id, g.name)} (${g.id}): ${g.amountMl.toFixed(2)}g (${g.ratio}%)`)
  .join('\n')}

AC'SCENT IDENTITY`

    try {
      await navigator.clipboard.writeText(recipeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const themeColors = {
    green: { headerBg: 'bg-[var(--soft)]', headerText: 'text-[var(--muted-ink)]', accentText: 'text-[var(--muted-ink)]', accentBg: 'bg-[var(--canvas)]', accentBorder: 'border-[var(--line)]', ratioBg: 'bg-[var(--soft)]', ratioText: 'text-[var(--muted-ink)]' },
    violet: { headerBg: 'bg-[var(--soft)]', headerText: 'text-[var(--muted-ink)]', accentText: 'text-[var(--muted-ink)]', accentBg: 'bg-[var(--canvas)]', accentBorder: 'border-[var(--line)]', ratioBg: 'bg-[var(--soft)]', ratioText: 'text-[var(--muted-ink)]' },
    pink: { headerBg: 'bg-[var(--soft)]', headerText: 'text-[var(--muted-ink)]', accentText: 'text-[var(--muted-ink)]', accentBg: 'bg-[var(--canvas)]', accentBorder: 'border-[var(--line)]', ratioBg: 'bg-[var(--soft)]', ratioText: 'text-[var(--muted-ink)]' },
  }[headerColor]

  return (
    <div className="border border-[var(--line)] rounded-[6px] overflow-hidden">
      {/* 헤더 */}
      {titleLabel && (
        <div className={`px-4 py-3 ${themeColors.headerBg} border-b-2 border-[var(--line)] flex items-center gap-2`}>
          {headerEmoji && <span className="text-lg">{headerEmoji}</span>}
          <span className={`text-sm lg:text-base font-black ${themeColors.headerText}`}>{titleLabel}</span>
        </div>
      )}

      <div className="p-4 bg-[var(--paper)] space-y-4">
        {/* 제품 타입 선택 */}
        {showProductSelector && (
          <div className="space-y-2">
            <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-2">
              <Beaker size={14} className="text-[var(--muted-ink)]" />
              {t('sizeSelection')}
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((product) => {
                const isSelected = selectedProduct === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`p-2.5 rounded-[6px] border-2 transition-all text-center ${
                      isSelected
                        ? `${themeColors.accentBorder} ${themeColors.accentBg} shadow-md`
                        : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line)]'
                    }`}
                  >
                    <span className="text-xl block mb-0.5">{product.icon}</span>
                    <p className={`text-[11px] lg:text-[13px] font-bold ${isSelected ? themeColors.headerText : 'text-[var(--muted-ink)]'}`}>
                      {product.id === 'perfume_10ml' ? t('productPerfume10Label') : product.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 용량 정보 카드 */}
        <motion.div
          key={selectedProduct}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] p-3 border border-stone-200/50`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{productInfo.icon}</span>
              <div>
                <p className="font-bold text-[var(--ink)] text-sm lg:text-base">
                  {productInfo.id === 'perfume_10ml' ? t('productPerfume10Label') : productInfo.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
                </p>
                <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)]">{t('totalVolumeOf', { volume: productInfo.totalVolumeMl })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)]">{t('totalIngredient')}</p>
              <p className="text-lg font-black text-[var(--muted-ink)]">{productInfo.fragranceVolumeMl}g</p>
            </div>
          </div>

          <div className="bg-[var(--paper)]/60 rounded-[6px] px-2.5 py-1.5 text-[10px] lg:text-[12px] text-[var(--muted-ink)]">
            {productInfo.id === 'perfume_10ml' && <p>{t('formulaPerfume10')}</p>}
            {productInfo.id === 'perfume_50ml' && <p>{t('formulaPerfume50')}</p>}
            {productInfo.id === 'diffuser_5ml' && <p>{t('formulaDiffuser5')}</p>}
          </div>
        </motion.div>

        {/* 소수점 경고 배너 */}
        <div className="relative overflow-hidden rounded-[6px] border-2 border-red-400 bg-gradient-to-r from-red-50 via-red-50 to-[var(--canvas)] p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-red-500 rounded-[6px] flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertTriangle size={16} className="text-[var(--ink)]" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-xs lg:text-sm font-black text-red-700">{t('scaleWarningTitle')}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-red-100 rounded-[6px] p-1.5 text-center border border-red-300">
                  <p className="text-sm lg:text-base text-red-400 font-bold line-through">0.08g</p>
                </div>
                <span className="text-sm lg:text-base font-black text-[var(--muted-ink)]">&rarr;</span>
                <div className="flex-1 bg-[var(--soft)] rounded-[6px] p-1.5 text-center border border-[var(--line)]">
                  <p className="text-base font-black text-[var(--muted-ink)]">0.80g</p>
                </div>
              </div>
              <p className="text-[10px] lg:text-[12px] text-red-600 font-medium">{t('scaleWarningDesc2')}</p>
            </div>
          </div>
        </div>

        {/* 향료별 계량 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--muted-ink)]" />
              {t('ingredientMeasurement')}
            </h3>
            <button
              onClick={handleCopyRecipe}
              className="flex items-center gap-1 text-[11px] lg:text-[13px] text-[var(--muted-ink)] hover:text-[var(--muted-ink)] transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={12} className="text-[var(--muted-ink)]" />
                  <span className="text-[var(--muted-ink)]">{t('recipeCopied')}</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>{t('copyRecipe')}</span>
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedProduct}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {granuleAmounts.map((granule, index) => {
                const bgColor = getGranuleColor(granule.id)
                const textColorClass = isLightColor(bgColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'

                return (
                  <motion.div
                    key={`${granule.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[var(--paper)] rounded-[6px] p-3 border border-[var(--line)] shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-[6px] flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-[var(--line)]' : ''}`}
                        style={{ backgroundColor: bgColor }}
                      >
                        <span className="text-sm lg:text-base font-black">{granule.amountMl.toFixed(1)}</span>
                        <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>g</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ink)] text-sm lg:text-base">
                            {getLocalizedName(granule.id, granule.name)}
                          </span>
                          <span className={`text-[10px] lg:text-[12px] px-1.5 py-0.5 ${themeColors.ratioBg} ${themeColors.ratioText} rounded-full`}>
                            {granule.ratio}%
                          </span>
                        </div>
                        <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] font-medium">{granule.id}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${themeColors.accentText}`}>{granule.amountMl.toFixed(2)}g</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 합계 */}
        <div className="bg-[var(--soft)] rounded-[6px] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-1.5">
              <Scale size={13} />
              {t('totalIngredient')}
            </span>
            <p className="text-lg font-black text-[var(--ink)]">{totalAmount.ml.toFixed(2)}g</p>
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-[var(--canvas)] rounded-[6px] p-2.5 border border-stone-200/50">
          <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] leading-relaxed">{t('measurementTipFull')}</p>
        </div>
      </div>
    </div>
  )
}
