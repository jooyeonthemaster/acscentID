'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFeedbackForm } from '../hooks/useFeedbackForm'
import { FeedbackStep1 } from './feedback/FeedbackStep1'
import { FeedbackStep2New } from './feedback/FeedbackStep2New'
import { FeedbackStep3NL } from './feedback/FeedbackStep3NL'
import { FeedbackSuccess } from './feedback/FeedbackSuccess'
import { RecipeConfirm } from './feedback/RecipeConfirm'
import { RetryFeedbackGuide } from './feedback/RetryFeedbackGuide'
import { ScentCategoryScores } from '@/types/analysis'
import { PerfumeFeedback } from '@/types/feedback'

// 모달 뷰 상태 타입
type ModalView = 'form' | 'success' | 'confirm' | 'retry-guide'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  perfumeId: string
  perfumeName: string
  perfumeCharacteristics: ScentCategoryScores
  perfumeCategory: string
  resultId?: string
  characterName?: string // 분석된 캐릭터 이름
}

// 3단계 구조 (Step 3: 자연어 피드백)
const STEP_INFO = [
  {
    title: '추천 향 비율',
    subtitle: '추천받은 향을 얼마나 유지할까요?',
    icon: '🧪',
  },
  {
    title: '향료 선택',
    subtitle: '추가하고 싶은 향료를 골라주세요',
    icon: '✨',
  },
  {
    title: '원하는 느낌',
    subtitle: '추가로 원하는 느낌이 있나요?',
    icon: '💬',
  },
  {
    title: '레시피 완성!',
    subtitle: '커스텀 레시피가 완성됐어요!',
    icon: '🎉',
  },
]

// 로딩 메시지
const LOADING_MESSAGES = [
  '레시피 만드는 중... 🧪',
  '향을 섞는 중... 💫',
  '완벽한 조합 찾는 중... ✨',
  '마법을 부리는 중... 🪄',
  '거의 다 됐어요... 🎯',
]

export function FeedbackModal({
  isOpen,
  onClose,
  perfumeId,
  perfumeName,
  perfumeCharacteristics,
  perfumeCategory,
  resultId,
  characterName,
}: FeedbackModalProps) {
  const {
    step,
    feedback,
    userDirectRecipe,
    aiRecommendedRecipe,
    isSubmitting,
    isGenerating,
    error,
    updateRetention,
    addSpecificScent,
    removeSpecificScent,
    updateScentRatio,
    updateFeedback,
    nextStep,
    prevStep,
    submit,
    reset,
    clearError,
  } = useFeedbackForm({
    perfumeId,
    perfumeName,
    perfumeCharacteristics,
    perfumeCategory,
    resultId,
    characterName,
  })

  // 현재 모달 뷰 상태
  const [modalView, setModalView] = useState<ModalView>('form')

  // 이전 피드백 저장 (재피드백용)
  const [previousFeedback, setPreviousFeedback] = useState<PerfumeFeedback | null>(null)

  // 확정할 레시피 저장
  const [selectedRecipe, setSelectedRecipe] = useState<typeof userDirectRecipe>(null)

  // 로딩 메시지 순환
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0)

  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [isGenerating])

  // 바디 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  // 닫기 핸들러
  const handleClose = () => {
    reset()
    setModalView('form')
    setPreviousFeedback(null)
    setSelectedRecipe(null)
    onClose()
  }

  // 다음 단계 핸들러 (3단계에서 제출)
  const handleNext = () => {
    if (step === 3) {
      submit()
    } else {
      nextStep()
    }
  }

  // 레시피 완성 시 success 뷰로 전환
  useEffect(() => {
    if (step === 4 && userDirectRecipe) {
      setModalView('success')
    }
  }, [step, userDirectRecipe])

  // 레시피 확정 버튼 핸들러 (선택된 레시피를 받음)
  const handleConfirmRecipe = (recipe: NonNullable<typeof userDirectRecipe>) => {
    setSelectedRecipe(recipe)
    setModalView('confirm')
  }

  // 다시 피드백 버튼 핸들러
  const handleRetryFeedback = () => {
    // 현재 피드백 저장
    setPreviousFeedback({ ...feedback })
    setModalView('retry-guide')
  }

  // 재피드백 확인 후 폼으로 돌아가기
  const handleConfirmRetry = () => {
    reset()
    setModalView('form')
  }

  // 확정 페이지에서 뒤로가기
  const handleBackFromConfirm = () => {
    setModalView('success')
  }

  // 확정 완료 핸들러
  const handleCompleteConfirm = () => {
    // TODO: 필요시 확정 데이터 저장 로직 추가
    handleClose()
  }

  // 재피드백 취소 (이전 레시피로 돌아가기)
  const handleCancelRetry = () => {
    setModalView('success')
  }

  const currentStepInfo = STEP_INFO[step - 1]

  // Step 2에서 현재 비율 계산
  const totalAdditionalRatio = useMemo(() => {
    return feedback.specificScents.reduce((sum, s) => sum + s.ratio, 0)
  }, [feedback.specificScents])

  const currentTotalRatio = feedback.retentionPercentage + totalAdditionalRatio
  const isOverLimit = currentTotalRatio > 100

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentStepInfo.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {currentStepInfo.title}
                  </h2>
                  <p className="text-xs text-slate-500">{currentStepInfo.subtitle}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* 단계 표시 (성공 화면 제외) - 3단계 표시 */}
            {step < 4 && (
              <div className="px-5 py-3 flex gap-2 flex-shrink-0">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      s <= step ? 'bg-amber-400' : 'bg-slate-200'
                    }`}
                    initial={s === step ? { scaleX: 0 } : {}}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            )}

            {/* Step 2: 현재 비율 상태 고정 표시 */}
            {step === 2 && (
              <div className="px-5 pb-2 flex-shrink-0 sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200/50">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-600 font-medium">📊 현재 비율 상태</span>
                    <span className={`font-bold ${isOverLimit ? 'text-red-500' : currentTotalRatio === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                      {currentTotalRatio}% / 100%
                    </span>
                  </div>
                  <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-inner">
                    <div className="h-full flex">
                      <div
                        className="bg-amber-400 transition-all duration-300"
                        style={{ width: `${Math.min(feedback.retentionPercentage, 100)}%` }}
                      />
                      <div
                        className={`transition-all duration-300 ${isOverLimit ? 'bg-red-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(totalAdditionalRatio, 100 - feedback.retentionPercentage)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] mt-1.5 text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      추천 향 {feedback.retentionPercentage}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isOverLimit ? 'bg-red-400' : 'bg-green-400'}`}></span>
                      추가 향료 {totalAdditionalRatio}%
                    </span>
                    {currentTotalRatio < 100 && (
                      <span className="text-slate-300">미설정 {100 - currentTotalRatio}%</span>
                    )}
                  </div>
                  {isOverLimit && (
                    <p className="text-xs text-red-500 mt-2 font-medium text-center">
                      ⚠️ 비율 합계 100% 초과! 줄여주세요
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* 에러 메시지 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                    <button
                      onClick={clearError}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 로딩 오버레이 */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/40 mb-4"
                    >
                      <Sparkles size={28} className="text-white" />
                    </motion.div>
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-lg font-bold text-slate-700"
                    >
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </motion.p>
                    <p className="text-sm text-slate-400 mt-2">
                      조금만 기다려주세요! 💕
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 뷰별 컴포넌트 렌더링 */}
              <AnimatePresence mode="wait">
                {/* 폼 뷰: Step 1, 2, 3 */}
                {modalView === 'form' && step === 1 && (
                  <FeedbackStep1
                    key="step1"
                    retention={feedback.retentionPercentage}
                    onRetentionChange={updateRetention}
                    previousFeedback={previousFeedback}
                  />
                )}
                {modalView === 'form' && step === 2 && (
                  <FeedbackStep2New
                    key="step2"
                    recommendedPerfumeId={perfumeId}
                    recommendedPerfumeName={perfumeName}
                    recommendedPerfumeCategory={perfumeCategory}
                    retentionPercentage={feedback.retentionPercentage}
                    selectedScents={feedback.specificScents}
                    notes={feedback.notes || ''}
                    onAddScent={addSpecificScent}
                    onRemoveScent={removeSpecificScent}
                    onUpdateRatio={updateScentRatio}
                    onNotesChange={(notes) => updateFeedback({ notes })}
                    previousFeedback={previousFeedback}
                  />
                )}
                {modalView === 'form' && step === 3 && (
                  <FeedbackStep3NL
                    key="step3"
                    feedback={feedback}
                    naturalLanguageFeedback={feedback.naturalLanguageFeedback || ''}
                    onNaturalLanguageFeedbackChange={(value) => updateFeedback({ naturalLanguageFeedback: value })}
                  />
                )}

                {/* 성공 뷰 */}
                {modalView === 'success' && userDirectRecipe && (
                  <FeedbackSuccess
                    key="success"
                    userDirectRecipe={userDirectRecipe}
                    aiRecommendedRecipe={aiRecommendedRecipe}
                    perfumeName={perfumeName}
                    previousFeedback={previousFeedback || undefined}
                    onClose={handleClose}
                    onConfirmRecipe={handleConfirmRecipe}
                    onRetryFeedback={handleRetryFeedback}
                  />
                )}

                {/* 레시피 확정 뷰 */}
                {modalView === 'confirm' && selectedRecipe && (
                  <RecipeConfirm
                    key="confirm"
                    recipe={selectedRecipe}
                    perfumeName={perfumeName}
                    resultId={resultId}
                    onBack={handleBackFromConfirm}
                    onComplete={handleCompleteConfirm}
                  />
                )}

                {/* 재피드백 안내 뷰 */}
                {modalView === 'retry-guide' && previousFeedback && (
                  <RetryFeedbackGuide
                    key="retry-guide"
                    previousFeedback={previousFeedback}
                    perfumeName={perfumeName}
                    onConfirm={handleConfirmRetry}
                    onCancel={handleCancelRetry}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* 푸터 (폼 뷰에서만 표시) */}
            {modalView === 'form' && step < 4 && (
              <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-2xl font-semibold border-2"
                  >
                    <ChevronLeft size={18} />
                    이전
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting || (step === 2 && currentTotalRatio !== 100)}
                  className={`flex-1 h-12 rounded-2xl font-bold text-white transition-all ${
                    step === 2 && currentTotalRatio !== 100
                      ? 'bg-slate-400 cursor-not-allowed'
                      : step === 3
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/30'
                        : step === 2
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-lg shadow-amber-500/30'
                          : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      생성 중...
                    </>
                  ) : step === 2 && currentTotalRatio !== 100 ? (
                    currentTotalRatio > 100
                      ? `비율 초과! (${currentTotalRatio}%)`
                      : `비율을 100%로 맞춰주세요 (${currentTotalRatio}%)`
                  ) : step === 3 ? (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      레시피 생성하기
                    </>
                  ) : step === 2 ? (
                    <>
                      다음 단계로
                      <ChevronRight size={18} className="ml-1" />
                    </>
                  ) : (
                    <>
                      다음
                      <ChevronRight size={18} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
