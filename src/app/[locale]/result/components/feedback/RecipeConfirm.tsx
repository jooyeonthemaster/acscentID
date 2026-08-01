'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, Scale, Beaker, Sparkles, Copy, CheckCircle2, LogIn, AlertTriangle, Droplets } from 'lucide-react'
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
import { FeedbackTheme, SJ, useFeedbackTranslations } from './sajuFeedbackTheme'

interface RecipeConfirmProps {
  recipe: GeneratedRecipe
  perfumeName: string
  resultId?: string  // 분석 결과 ID - 레시피를 분석 결과와 연결
  selectedRecipeType?: 'user_direct' | 'ai_recommended'  // 선택된 레시피 타입
  onBack: () => void
  onComplete: () => void
  theme?: FeedbackTheme
}

export function RecipeConfirm({
  recipe,
  perfumeName,
  resultId,
  selectedRecipeType,
  onBack,
  onComplete,
  theme = 'default',
}: RecipeConfirmProps) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'
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
          selectedRecipeType: selectedRecipeType || 'user_direct',  // 선택된 레시피 타입
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

  // 방울 모드 — 사주 프로그램의 디퓨저는 저울(g/ml) 계량 대신 총 10방울로 처방한다.
  // 레시피 생성 단계(useFeedbackForm·customize API)에서 granules[].drops 합이
  // 정확히 totalDrops(10)로 보정되므로 여기서는 그 값을 그대로 표시만 한다.
  const dropsMode = saju && selectedProduct === 'diffuser_5ml'
  const totalDrops = recipe.totalDrops || 10
  const dropsById = useMemo(() => {
    const map = new Map<string, number>()
    recipe.granules.forEach((g) => map.set(g.id, g.drops))
    return map
  }, [recipe])
  // 과거 저장분 등 drops가 비어 있으면 비율로 환산(합 보정 없이 근사)
  const dropsOf = (id: string, ratio: number) =>
    dropsById.get(id) ?? Math.round((ratio / 100) * totalDrops)

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
    const amountLine = (g: (typeof granuleAmounts)[number]) =>
      dropsMode
        ? `- ${g.name} (${g.id}): ${t('dropsCount', { count: dropsOf(g.id, g.ratio) })} (${g.ratio}%)`
        : `- ${g.name} (${g.id}): ${g.amountMl.toFixed(2)}g (${g.ratio}%)`
    const recipeText = `[${localizedMainName} ${t('customRecipeOf', { name: '' }).trim()} - ${productLabel}]

${t('totalIngredient')}: ${dropsMode ? t('dropsCount', { count: totalDrops }) : `${totalAmount.ml.toFixed(2)}g`}

${granuleAmounts.map(amountLine).join('\n')}

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
          className={`p-2 rounded-[6px] transition-colors ${saju ? SJ.iconHover : 'hover:bg-[var(--soft)]'}`}
        >
          <ChevronLeft size={20} className={saju ? 'text-[#5C564A]' : 'text-[var(--muted-ink)]'} />
        </button>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>{t('confirmRecipe')}</h2>
          <p className={`text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('customRecipeOf', { name: recipe.granules[0] ? getLocalizedName(recipe.granules[0].id, perfumeName) : perfumeName })}</p>
        </div>
        {saju ? (
          <div className="w-10 h-10 rounded-[6px] bg-[#B03325] rotate-[-3deg] flex items-center justify-center shadow-md shadow-[#C0392B]/25">
            <span className="font-serif-kr text-lg leading-none text-[#F5EFE2]">定</span>
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-full flex items-center justify-center">
            <Scale size={18} className="text-[var(--ink)]" />
          </div>
        )}
      </div>

      {/* 제품 타입 선택 */}
      <div className="space-y-3">
        <h3 className={`text-sm lg:text-base font-bold flex items-center gap-2 ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>
          <Beaker size={14} className={saju ? 'text-[#2C3E50]' : 'text-[var(--muted-ink)]'} />
          {t('sizeSelection')}
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_TYPES.map((product) => {
            const isSelected = selectedProduct === product.id
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={`p-3 rounded-[6px] border-2 transition-all text-center ${
                  isSelected
                    ? saju ? `${SJ.cardGold} shadow-md` : 'border-[var(--line)] bg-[var(--canvas)] shadow-md'
                    : saju
                      ? 'border-[#D8CFBB] bg-[#FDFAF1] hover:border-[#C9A227]/60 hover:bg-[#C9A227]/5'
                      : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line)] hover:bg-[var(--canvas)]/50'
                }`}
              >
                <span className="text-2xl block mb-1">{product.icon}</span>
                <p className={`text-xs lg:text-sm font-bold ${
                  isSelected
                    ? saju ? SJ.goldText : 'text-[var(--muted-ink)]'
                    : saju ? SJ.ink : 'text-[var(--muted-ink)]'
                }`}>
                  {product.id === 'perfume_10ml' ? t('productPerfume10Label') : product.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
                </p>
                <p className={`text-[10px] lg:text-[12px] mt-0.5 ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>
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
        className={`rounded-[6px] p-4 border ${saju ? SJ.cardSoft : 'bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] border-stone-200/50'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{productInfo.icon}</span>
            <div>
              <p className={`font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>
                {productInfo.id === 'perfume_10ml' ? t('productPerfume10Label') : productInfo.id === 'perfume_50ml' ? t('productPerfume50Label') : t('productDiffuser5Label')}
              </p>
              {/* 방울 모드에서는 ml 단위를 일체 노출하지 않는다 — "전체 5ml 중" 대신 제품 설명 */}
              <p className={`text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
                {dropsMode ? t('productDiffuser5Desc') : t('totalVolumeOf', { volume: productInfo.totalVolumeMl })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('totalIngredient')}</p>
            <p className={`text-xl font-black ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>
              {dropsMode ? t('dropsCount', { count: totalDrops }) : `${productInfo.fragranceVolumeMl}g`}
            </p>
          </div>
        </div>

        <div className={`rounded-[6px] px-3 py-2 text-xs lg:text-sm ${saju ? `bg-[#FDFAF1]/70 ${SJ.inkMuted}` : 'bg-[var(--paper)]/60 text-[var(--muted-ink)]'}`}>
          {productInfo.id === 'perfume_10ml' && (
            <p>{t('formulaPerfume10')}</p>
          )}
          {productInfo.id === 'perfume_50ml' && (
            <p>{t('formulaPerfume50')}</p>
          )}
          {productInfo.id === 'diffuser_5ml' && (
            <p>{dropsMode ? t('formulaDiffuser5Drops') : t('formulaDiffuser5')}</p>
          )}
        </div>
      </motion.div>

      {/* 방울 안내 배너 — 방울 모드에서는 저울이 필요 없으므로 소수점 경고 대신 표시 */}
      {dropsMode ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-[6px] border-2 border-[#C9A227] bg-[#C9A227]/10 p-4 shadow-lg shadow-[#C9A227]/15"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#C9A227]" />
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[6px] flex items-center justify-center flex-shrink-0 shadow-md bg-[#C9A227]">
              <Droplets size={20} className="text-[#1A1610]" />
            </div>
            <div className="flex-1 space-y-1">
              <p className={`text-sm lg:text-base font-black ${SJ.serif} ${SJ.goldText}`}>{t('dropGuideTitle')}</p>
              <p className={`text-xs lg:text-sm font-medium ${SJ.inkMuted}`}>{t('dropGuideDesc')}</p>
            </div>
          </div>
        </motion.div>
      ) : (
      /* 소수점 주의 경고 배너 */
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`relative overflow-hidden rounded-[6px] border-2 p-4 shadow-lg ${
          saju
            ? 'border-[#C0392B] bg-[#C0392B]/8 shadow-[#C0392B]/15'
            : 'border-red-400 bg-gradient-to-r from-red-50 via-red-50 to-[var(--canvas)] shadow-red-200/40'
        }`}
      >
        <div className={`absolute top-0 left-0 w-full h-1 ${saju ? 'bg-[#C0392B]' : 'bg-gradient-to-r from-red-500 to-[var(--soft)]'}`} />
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center flex-shrink-0 shadow-md ${saju ? 'bg-[#B03325]' : 'bg-red-500'}`}>
            <AlertTriangle size={20} className={saju ? 'text-[#F5EFE2]' : 'text-[var(--ink)]'} />
          </div>
          <div className="flex-1 space-y-2">
            <p className={`text-sm lg:text-base font-black ${saju ? `${SJ.serif} ${SJ.cinnabarText}` : 'text-red-700'}`}>{t('scaleWarningTitle')}</p>
            <div className="flex items-center gap-3">
              <div className={`flex-1 rounded-[6px] p-2.5 text-center border ${saju ? 'bg-[#C0392B]/10 border-[#C0392B]/40' : 'bg-red-100 border-red-300'}`}>
                <p className={`text-lg font-bold line-through ${saju ? 'text-[#C0392B]/60' : 'text-red-400'}`}>0.08g</p>
                <p className={`text-sm lg:text-base font-bold mt-0.5 ${saju ? SJ.cinnabarText : 'text-red-500'}`}>X</p>
              </div>
              <span className={`text-lg font-black ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>&rarr;</span>
              <div className={`flex-1 rounded-[6px] p-2.5 text-center border-2 ${saju ? 'bg-[#C9A227]/15 border-[#C9A227]' : 'bg-[var(--soft)] border-[var(--line)]'}`}>
                <p className={`text-xl font-black ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>0.80g</p>
                <p className={`text-xs lg:text-sm font-bold mt-0.5 ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>O</p>
              </div>
            </div>
            <div className={`text-xs lg:text-sm font-medium space-y-0.5 ${saju ? SJ.cinnabarText : 'text-red-600'}`}>
              <p>{t('scaleWarningDesc1')}</p>
              <p className="font-bold">{t('scaleWarningDesc2')}</p>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* 향료별 계산 결과 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm lg:text-base font-bold flex items-center gap-2 ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>
            <Sparkles size={14} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
            {t('ingredientMeasurement')}
          </h3>
          <button
            onClick={handleCopyRecipe}
            className={`flex items-center gap-1 text-xs lg:text-sm transition-colors ${saju ? 'text-[#5C564A] hover:text-[#7A5C14]' : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'}`}
          >
            {copied ? (
              <>
                <CheckCircle2 size={14} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
                <span className={saju ? SJ.goldText : 'text-[var(--muted-ink)]'}>{t('recipeCopied')}</span>
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
              const textColorClass = isLightColor(bgColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'

              return (
              <motion.div
                key={granule.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-[6px] p-3 border shadow-sm ${saju ? SJ.card : 'bg-[var(--paper)] border-[var(--line)]'}`}
              >
                <div className="flex items-center gap-3">
                  {/* 향료 컬러 박스 */}
                  <div
                    className={`w-12 h-12 rounded-[6px] flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-[var(--line)]' : ''}`}
                    style={{ backgroundColor: bgColor }}
                  >
                    <span className="text-sm lg:text-base font-black">
                      {dropsMode ? dropsOf(granule.id, granule.ratio) : granule.amountMl.toFixed(1)}
                    </span>
                    <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>
                      {dropsMode ? t('drops') : 'g'}
                    </span>
                  </div>

                  {/* 향료 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm lg:text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{getLocalizedName(granule.id, granule.name)}</span>
                      <span className={`text-[10px] lg:text-[12px] px-1.5 py-0.5 rounded-full ${saju ? SJ.chipGold : 'bg-[var(--soft)] text-[var(--muted-ink)]'}`}>
                        {granule.ratio}%
                      </span>
                    </div>
                    <p className={`text-[11px] lg:text-[13px] font-medium ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>{granule.id}</p>
                  </div>

                  {/* 용량 표시 */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>
                      {dropsMode ? t('dropsCount', { count: dropsOf(granule.id, granule.ratio) }) : `${granule.amountMl.toFixed(2)}g`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )})}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 합계 */}
      <div className={`rounded-[6px] p-4 ${saju ? 'bg-[#EDE5D2] border border-[#D8CFBB]' : 'bg-[var(--soft)]'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm lg:text-base font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>{t('totalIngredient')}</span>
          <div className="text-right">
            <p className={`text-xl font-black ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>
              {dropsMode ? t('dropsCount', { count: totalDrops }) : `${totalAmount.ml.toFixed(2)}g`}
            </p>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className={`rounded-[6px] p-3 border ${saju ? 'bg-[#EDE5D2] border-[#C9A227]/40' : 'bg-[var(--canvas)] border-stone-200/50'}`}>
        <p className={`text-xs lg:text-sm leading-relaxed ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
          {dropsMode ? t('dropMeasurementTip') : t('measurementTipFull')}
        </p>
      </div>

      {/* 확정 버튼 */}
      <div className="space-y-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-0">
        {unifiedUser ? (
          // 로그인된 경우
          <Button
            onClick={handleComplete}
            disabled={isSaving}
            className={`w-full h-12 rounded-[6px] font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${
              saju ? SJ.ctaCinnabar : 'bg-[#F5EFE2] hover:from-[var(--soft)] hover:to-[var(--soft)] text-[var(--ink)] shadow-stone-500/30'
            }`}
          >
            <Check size={18} />
            {isSaving ? t('saving') : t('confirmThisRecipe')}
          </Button>
        ) : (
          // 비로그인인 경우
          <Button
            onClick={handleComplete}
            className={`w-full h-12 rounded-[6px] font-bold shadow-lg flex items-center justify-center gap-2 ${
              saju ? SJ.ctaGold : 'bg-[#F5EFE2] hover:from-[var(--soft)] hover:to-[var(--soft)] text-[var(--ink)] shadow-stone-500/30'
            }`}
          >
            <LogIn size={18} />
            {t('saveMyRecipe')}
          </Button>
        )}
        <p className={`text-[10px] lg:text-[12px] text-center ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>
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
