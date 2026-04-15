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
  titleLabel?: string  // 헤더 라벨 (예: "힙토리의 향")
  headerEmoji?: string  // 헤더 이모지
  headerColor?: 'green' | 'violet' | 'pink'  // 테마 색상
  showProductSelector?: boolean  // 제품 선택 탭 표시 여부 (케미처럼 공유하는 경우 false)
  externalSelectedProduct?: ProductType  // 외부에서 제품 선택 제어 시
  onProductChange?: (product: ProductType) => void  // 외부 제어 시 콜백
}

/**
 * 그람 단위 레시피 표시 공통 컴포넌트
 * - 이미지 분석 퍼퓸 & 케미 향수 공통으로 사용
 * - 제품 선택(10ml/50ml/5ml) → 방울 수 → 그램 변환 표시
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

  const handleCopyRecipe = async () => {
    const recipeText = `[${perfumeName} - ${productInfo.label}]

총 향료량: ${totalAmount.ml.toFixed(2)}g

${granuleAmounts
  .map((g) => `- ${getLocalizedName(g.id, g.name)} (${g.id}): ${g.amountMl.toFixed(2)}g (${g.ratio}%)`)
  .join('\n')}

AC'SCENT IDENTITY`

    try {
      await navigator.clipboard.writeText(recipeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  const themeColors = {
    green: { headerBg: 'bg-green-100', headerText: 'text-green-700', accentText: 'text-green-600', accentBg: 'bg-green-50', accentBorder: 'border-green-400', ratioBg: 'bg-green-100', ratioText: 'text-green-700' },
    violet: { headerBg: 'bg-violet-100', headerText: 'text-violet-700', accentText: 'text-violet-600', accentBg: 'bg-violet-50', accentBorder: 'border-violet-400', ratioBg: 'bg-violet-100', ratioText: 'text-violet-700' },
    pink: { headerBg: 'bg-pink-100', headerText: 'text-pink-700', accentText: 'text-pink-600', accentBg: 'bg-pink-50', accentBorder: 'border-pink-400', ratioBg: 'bg-pink-100', ratioText: 'text-pink-700' },
  }[headerColor]

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0_0_black]">
      {/* 헤더 */}
      {titleLabel && (
        <div className={`px-4 py-3 ${themeColors.headerBg} border-b-2 border-black flex items-center gap-2`}>
          {headerEmoji && <span className="text-lg">{headerEmoji}</span>}
          <span className={`text-sm font-black ${themeColors.headerText}`}>{titleLabel}</span>
        </div>
      )}

      <div className="p-4 bg-white space-y-4">
        {/* 제품 타입 선택 */}
        {showProductSelector && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Beaker size={14} className="text-purple-500" />
              {t('sizeSelection')}
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((product) => {
                const isSelected = selectedProduct === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? `${themeColors.accentBorder} ${themeColors.accentBg} shadow-md`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl block mb-0.5">{product.icon}</span>
                    <p className={`text-[11px] font-bold ${isSelected ? themeColors.headerText : 'text-slate-700'}`}>
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
          className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3 border border-green-200/50`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{productInfo.icon}</span>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {productInfo.id === 'perfume_10ml' ? t('productPerfume10Label') : productInfo.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
                </p>
                <p className="text-[10px] text-slate-500">{t('totalVolumeOf', { volume: productInfo.totalVolumeMl })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">{t('totalIngredient')}</p>
              <p className="text-lg font-black text-green-600">{productInfo.fragranceVolumeMl}g</p>
            </div>
          </div>

          <div className="bg-white/60 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600">
            {productInfo.id === 'perfume_10ml' && <p>{t('formulaPerfume10')}</p>}
            {productInfo.id === 'perfume_50ml' && <p>{t('formulaPerfume50')}</p>}
            {productInfo.id === 'diffuser_5ml' && <p>{t('formulaDiffuser5')}</p>}
          </div>
        </motion.div>

        {/* 소수점 경고 배너 */}
        <div className="relative overflow-hidden rounded-xl border-2 border-red-400 bg-gradient-to-r from-red-50 via-red-50 to-orange-50 p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-xs font-black text-red-700">{t('scaleWarningTitle')}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-red-100 rounded-lg p-1.5 text-center border border-red-300">
                  <p className="text-sm text-red-400 font-bold line-through">0.08g</p>
                </div>
                <span className="text-sm font-black text-slate-400">&rarr;</span>
                <div className="flex-1 bg-green-100 rounded-lg p-1.5 text-center border-2 border-green-400">
                  <p className="text-base font-black text-green-700">0.80g</p>
                </div>
              </div>
              <p className="text-[10px] text-red-600 font-medium">{t('scaleWarningDesc2')}</p>
            </div>
          </div>
        </div>

        {/* 향료별 계량 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              {t('ingredientMeasurement')}
            </h3>
            <button
              onClick={handleCopyRecipe}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-green-600 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span className="text-green-600">{t('recipeCopied')}</span>
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
                const textColorClass = isLightColor(bgColor) ? 'text-slate-800' : 'text-white'

                return (
                  <motion.div
                    key={`${granule.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-slate-200' : ''}`}
                        style={{ backgroundColor: bgColor }}
                      >
                        <span className="text-sm font-black">{granule.amountMl.toFixed(1)}</span>
                        <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>g</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {getLocalizedName(granule.id, granule.name)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 ${themeColors.ratioBg} ${themeColors.ratioText} rounded-full`}>
                            {granule.ratio}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{granule.id}</p>
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
        <div className="bg-slate-100 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Scale size={13} />
              {t('totalIngredient')}
            </span>
            <p className="text-lg font-black text-slate-900">{totalAmount.ml.toFixed(2)}g</p>
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200/50">
          <p className="text-[11px] text-amber-700 leading-relaxed">{t('measurementTipFull')}</p>
        </div>
      </div>
    </div>
  )
}
