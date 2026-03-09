'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

// Step info icons (titles come from translations)
const STEP_ICONS = ['🧪', '✨', '💬', '🎉']

// Loading message keys
const LOADING_MESSAGE_KEYS = [
  'loading1', 'loading2', 'loading3', 'loading4', 'loading5'
] as const

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

  const router = useRouter()
  const t = useTranslations('feedback')

  // Step info with translations
  const STEP_INFO = [
    { title: t('step1Title'), subtitle: t('step1Subtitle'), icon: STEP_ICONS[0] },
    { title: t('step2Title'), subtitle: t('step2Subtitle'), icon: STEP_ICONS[1] },
    { title: t('step3Title'), subtitle: t('step3Subtitle'), icon: STEP_ICONS[2] },
    { title: t('step4Title'), subtitle: t('step4Subtitle'), icon: STEP_ICONS[3] },
  ]

  // Loading messages with translations
  const LOADING_MESSAGES = LOADING_MESSAGE_KEYS.map(key => t(key))

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

  // 저장된 임시 데이터가 있으면 복원 알림 (모달 열릴 때)
  const [showRestoredNotice, setShowRestoredNotice] = useState(false)
  useEffect(() => {
    if (isOpen && step > 1) {
      // step이 1보다 크면 이전에 저장된 데이터가 복원된 것
      setShowRestoredNotice(true)
      const timer = setTimeout(() => setShowRestoredNotice(false), 4000)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
    // 레시피 확정 후 마이페이지로 이동
    handleClose()
    router.push('/mypage')
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
                    <span className="text-slate-600 font-medium">📊 {t('ratioStatus')}</span>
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
                      {t('recommendedScent')} {feedback.retentionPercentage}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isOverLimit ? 'bg-red-400' : 'bg-green-400'}`}></span>
                      {t('additionalScent')} {totalAdditionalRatio}%
                    </span>
                    {currentTotalRatio < 100 && (
                      <span className="text-slate-300">{t('unset')} {100 - currentTotalRatio}%</span>
                    )}
                  </div>
                  {isOverLimit && (
                    <p className="text-xs text-red-500 mt-2 font-medium text-center">
                      {t('ratioOverWarning')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* 이전 작업 복원 알림 */}
              <AnimatePresence>
                {showRestoredNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between"
                  >
                    <p className="text-blue-600 text-sm">
                      {t('restoredNotice')}
                    </p>
                    <button
                      onClick={() => setShowRestoredNotice(false)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

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
                      {t('loadingWait')}
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
              <div className="px-5 pt-4 pb-20 md:pb-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-2xl font-semibold border-2"
                  >
                    <ChevronLeft size={18} />
                    {t('prevButton')}
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
                      {t('generating')}
                    </>
                  ) : step === 2 && currentTotalRatio !== 100 ? (
                    currentTotalRatio > 100
                      ? t('ratioExceeded', { ratio: currentTotalRatio })
                      : t('ratioAdjust', { ratio: currentTotalRatio })
                  ) : step === 3 ? (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      {t('generateRecipe')}
                    </>
                  ) : step === 2 ? (
                    <>
                      {t('nextStep')}
                      <ChevronRight size={18} className="ml-1" />
                    </>
                  ) : (
                    <>
                      {t('nextButton')}
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
