'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Check, ChevronLeft, Scale, Beaker, Sparkles, Copy, CheckCircle2, LogIn, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GeneratedRecipe,
  ProductType,
  PRODUCT_TYPES,
  calculateGranuleAmounts,
} from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'

interface RecipeConfirmProps {
  recipe: GeneratedRecipe
  perfumeName: string
  resultId?: string  // 분석 결과 ID - 레시피를 분석 결과와 연결
  onBack: () => void
  onComplete: () => void
}

export function RecipeConfirm({
  recipe,
  perfumeName,
  resultId,
  onBack,
  onComplete,
}: RecipeConfirmProps) {
  const t = useTranslations('feedback')
  const { getLocalizedName } = useLocalizedPerfumes()
  const { unifiedUser } = useAuth()
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('perfume_10ml')
  const [copied, setCopied] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 레시피 저장 (로그인된 경우)
  const handleSaveRecipe = async () => {
    if (!unifiedUser) {
      setShowAuthModal(true)
      return
    }

    try {
      setIsSaving(true)
      // 레시피를 계정에 저장하는 API 호출
      const fingerprint = localStorage.getItem('user_fingerprint')

      await fetch('/api/feedback/save-to-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fingerprint && { 'x-fingerprint': fingerprint }),
        },
        body: JSON.stringify({
          recipe,
          perfumeName,
          selectedProduct,
          resultId,  // 분석 결과와 연결
        }),
      })

      onComplete()
    } catch (error) {
      console.error('레시피 저장 실패:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 확정 버튼 핸들러
  const handleComplete = () => {
    if (unifiedUser) {
      // 로그인된 경우: 저장 후 완료
      handleSaveRecipe()
    } else {
      // 비로그인: 로그인 모달 표시
      setShowAuthModal(true)
    }
  }

  // 선택된 제품 정보
  const productInfo = useMemo(() => {
    return PRODUCT_TYPES.find((p) => p.id === selectedProduct)!
  }, [selectedProduct])

  // 용량 계산
  const granuleAmounts = useMemo(() => {
    return calculateGranuleAmounts(recipe, selectedProduct)
  }, [recipe, selectedProduct])

  // 총 용량 계산
  const totalAmount = useMemo(() => {
    return {
      ml: granuleAmounts.reduce((sum, g) => sum + g.amountMl, 0),
      g: granuleAmounts.reduce((sum, g) => sum + g.amountG, 0),
    }
  }, [granuleAmounts])

  // 향수 색상 가져오기
  const getGranuleColor = (id: string) => {
    const perfume = perfumes.find((p) => p.id === id)
    return perfume?.primaryColor || '#6B7280'
  }

  // 배경색이 밝은지 어두운지 판단 (밝으면 true)
  const isLightColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    // 밝기 계산 (YIQ 공식)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180
  }

  // 선택된 제품 라벨 (번역)
  const productLabel = productInfo.id === 'perfume_10ml' ? t('productPerfume10Label') : productInfo.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')

  // 레시피 텍스트 복사
  const handleCopyRecipe = async () => {
    const localizedMainName = recipe.granules[0] ? getLocalizedName(recipe.granules[0].id, perfumeName) : perfumeName
    const recipeText = `[${localizedMainName} ${t('customRecipeOf', { name: '' }).trim()} - ${productLabel}]

${t('totalIngredient')}: ${totalAmount.ml.toFixed(2)}g

${granuleAmounts.map((g) => `- ${g.name} (${g.id}): ${g.amountMl.toFixed(2)}g (${g.ratio}%)`).join('\n')}

AC'SCENT IDENTITY`

    try {
      await navigator.clipboard.writeText(recipeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">{t('confirmRecipe')}</h2>
          <p className="text-xs text-slate-500">{t('customRecipeOf', { name: recipe.granules[0] ? getLocalizedName(recipe.granules[0].id, perfumeName) : perfumeName })}</p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <Scale size={18} className="text-white" />
        </div>
      </div>

      {/* 제품 타입 선택 */}
      <div className="space-y-3">
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
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-green-400 bg-green-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/50'
                }`}
              >
                <span className="text-2xl block mb-1">{product.icon}</span>
                <p className={`text-xs font-bold ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>
                  {product.id === 'perfume_10ml' ? t('productPerfume10Label') : product.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {product.id === 'perfume_10ml' ? t('productPerfume10Desc') : product.id === 'perfume_50ml' ? t('productPerfume50Desc') : t('productDiffuser5Desc')}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 용량 정보 카드 */}
      <motion.div
        key={selectedProduct}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200/50"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{productInfo.icon}</span>
            <div>
              <p className="font-bold text-slate-900">
                {productInfo.id === 'perfume_10ml' ? t('productPerfume10Label') : productInfo.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
              </p>
              <p className="text-xs text-slate-500">{t('totalVolumeOf', { volume: productInfo.totalVolumeMl })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{t('totalIngredient')}</p>
            <p className="text-xl font-black text-green-600">{productInfo.fragranceVolumeMl}g</p>
          </div>
        </div>

        <div className="bg-white/60 rounded-lg px-3 py-2 text-xs text-slate-600">
          {productInfo.id === 'perfume_10ml' && (
            <p>{t('formulaPerfume10')}</p>
          )}
          {productInfo.id === 'perfume_50ml' && (
            <p>{t('formulaPerfume50')}</p>
          )}
          {productInfo.id === 'diffuser_5ml' && (
            <p>{t('formulaDiffuser5')}</p>
          )}
        </div>
      </motion.div>

      {/* 소수점 주의 경고 배너 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border-2 border-red-400 bg-gradient-to-r from-red-50 via-red-50 to-orange-50 p-4 shadow-lg shadow-red-200/40"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-black text-red-700">{t('scaleWarningTitle')}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-red-100 rounded-xl p-2.5 text-center border border-red-300">
                <p className="text-lg text-red-400 font-bold line-through">0.08g</p>
                <p className="text-sm text-red-500 font-bold mt-0.5">X</p>
              </div>
              <span className="text-lg font-black text-slate-400">&rarr;</span>
              <div className="flex-1 bg-green-100 rounded-xl p-2.5 text-center border-2 border-green-400">
                <p className="text-xl font-black text-green-700">0.80g</p>
                <p className="text-xs text-green-600 font-bold mt-0.5">O</p>
              </div>
            </div>
            <div className="text-xs text-red-600 font-medium space-y-0.5">
              <p>{t('scaleWarningDesc1')}</p>
              <p className="font-bold">{t('scaleWarningDesc2')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 향료별 계산 결과 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            {t('ingredientMeasurement')}
          </h3>
          <button
            onClick={handleCopyRecipe}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-green-600">{t('recipeCopied')}</span>
              </>
            ) : (
              <>
                <Copy size={14} />
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
                key={granule.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* 향료 컬러 박스 */}
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-slate-200' : ''}`}
                    style={{ backgroundColor: bgColor }}
                  >
                    <span className="text-sm font-black">{granule.amountMl.toFixed(1)}</span>
                    <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>g</span>
                  </div>

                  {/* 향료 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{getLocalizedName(granule.id, granule.name)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {granule.ratio}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{granule.id}</p>
                  </div>

                  {/* 용량 표시 */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-600">{granule.amountMl.toFixed(2)}g</p>
                  </div>
                </div>
              </motion.div>
            )})}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 합계 */}
      <div className="bg-slate-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">{t('totalIngredient')}</span>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">{totalAmount.ml.toFixed(2)}g</p>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/50">
        <p className="text-xs text-amber-700 leading-relaxed">
          {t('measurementTipFull')}
        </p>
      </div>

      {/* 확정 버튼 */}
      <div className="space-y-2 pb-16 md:pb-0">
        {unifiedUser ? (
          // 로그인된 경우
          <Button
            onClick={handleComplete}
            disabled={isSaving}
            className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check size={18} />
            {isSaving ? t('saving') : t('confirmThisRecipe')}
          </Button>
        ) : (
          // 비로그인인 경우
          <Button
            onClick={handleComplete}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {t('saveMyRecipe')}
          </Button>
        )}
        <p className="text-[10px] text-slate-400 text-center">
          {unifiedUser ? t('confirmNote') : t('loginNote')}
        </p>
      </div>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={t('saveRecipeTitle')}
        description={t('saveRecipeDesc')}
        onSuccess={() => {
          setShowAuthModal(false)
          handleSaveRecipe()
        }}
      />
    </motion.div>
  )
}
