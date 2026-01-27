'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, Scale, Beaker, Sparkles, Copy, CheckCircle2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GeneratedRecipe,
  ProductType,
  PRODUCT_TYPES,
  calculateGranuleAmounts,
} from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
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

  // 레시피 텍스트 복사
  const handleCopyRecipe = async () => {
    const recipeText = `[${perfumeName} 커스텀 레시피 - ${productInfo.label}]

총 향료량: ${totalAmount.ml.toFixed(2)}ml

${granuleAmounts.map((g) => `- ${g.name} (${g.id}): ${g.amountMl.toFixed(2)}ml (${g.ratio}%)`).join('\n')}

AC'SCENT IDENTITY에서 생성됨`

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
          <h2 className="text-lg font-bold text-slate-900">레시피 확정</h2>
          <p className="text-xs text-slate-500">{perfumeName} 커스텀 레시피</p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <Scale size={18} className="text-white" />
        </div>
      </div>

      {/* 제품 타입 선택 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Beaker size={14} className="text-purple-500" />
          제품 용량 선택
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
                  {product.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{product.description}</p>
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
              <p className="font-bold text-slate-900">{productInfo.label}</p>
              <p className="text-xs text-slate-500">전체 {productInfo.totalVolumeMl}ml 중</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">총 향료량</p>
            <p className="text-xl font-black text-green-600">{productInfo.fragranceVolumeMl}ml</p>
          </div>
        </div>

        <div className="bg-white/60 rounded-lg px-3 py-2 text-xs text-slate-600">
          {productInfo.id === 'perfume_10ml' && (
            <p>향료 2ml + 에탄올 8ml = 총 10ml (휴대용)</p>
          )}
          {productInfo.id === 'perfume_50ml' && (
            <p>향료 10ml + 에탄올 40ml = 총 50ml (정품)</p>
          )}
          {productInfo.id === 'diffuser_5ml' && (
            <p>향료 5ml</p>
          )}
        </div>
      </motion.div>

      {/* 향료별 계산 결과 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            향료별 계량
          </h3>
          <button
            onClick={handleCopyRecipe}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-green-600">복사됨!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>레시피 복사</span>
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
                    <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>ml</span>
                  </div>

                  {/* 향료 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{granule.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {granule.ratio}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{granule.id}</p>
                  </div>

                  {/* 용량 표시 */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-600">{granule.amountMl.toFixed(2)}ml</p>
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
          <span className="text-sm font-bold text-slate-700">총 향료량</span>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">{totalAmount.ml.toFixed(2)}ml</p>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/50">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-bold">계량 팁!</span> 스포이드나 피펫을 사용하면 더 정확하게 계량할 수 있어요.
          소수점 이하는 반올림해도 괜찮아요!
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
            {isSaving ? '저장 중...' : '이 레시피로 확정하기'}
          </Button>
        ) : (
          // 비로그인인 경우
          <Button
            onClick={handleComplete}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            내 레시피 저장하기
          </Button>
        )}
        <p className="text-[10px] text-slate-400 text-center">
          {unifiedUser
            ? '확정 후에도 언제든 다시 레시피를 생성할 수 있어요'
            : '로그인하면 내 레시피를 안전하게 보관할 수 있어요'}
        </p>
      </div>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="내 레시피 저장하기"
        description="로그인하면 분석 결과와 레시피를 안전하게 보관할 수 있어요!"
        onSuccess={() => {
          setShowAuthModal(false)
          handleSaveRecipe()
        }}
      />
    </motion.div>
  )
}
