'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { FeedbackTheme, SJ, SJ_SEAL_TILE, SAJU_STEP_HANJA, useFeedbackTranslations } from './feedback/sajuFeedbackTheme'
import { CloudDrift } from '@/components/saju'

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
  /** 프로그램별 스킨 — 사주는 한지 처방전 스킨 */
  theme?: FeedbackTheme
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
  theme = 'default',
}: FeedbackModalProps) {
  const saju = theme === 'saju'
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
    theme,
  })

  const router = useRouter()
  const t = useFeedbackTranslations(theme)

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
  const [selectedRecipeType, setSelectedRecipeType] = useState<'user_direct' | 'ai_recommended'>('user_direct')

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

  // 레시피 확정 버튼 핸들러 (선택된 레시피와 타입을 받음)
  const handleConfirmRecipe = (recipe: NonNullable<typeof userDirectRecipe>, recipeType: 'user_direct' | 'ai_recommended') => {
    setSelectedRecipe(recipe)
    setSelectedRecipeType(recipeType)
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
            className={`fixed inset-0 z-50 ${saju ? SJ.backdrop : 'bg-black/60 backdrop-blur-sm'}`}
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[90vh] ${saju ? SJ.sheet : 'bg-white'} rounded-t-3xl shadow-2xl overflow-hidden flex flex-col`}
          >
            {/* 헤더 */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${saju ? SJ.hairline : 'border-slate-100'} flex-shrink-0`}>
              <div className="flex items-center gap-3">
                {saju ? (
                  <span aria-hidden className={SJ_SEAL_TILE}>{SAJU_STEP_HANJA[step - 1]}</span>
                ) : (
                  <span className="text-2xl">{currentStepInfo.icon}</span>
                )}
                <div>
                  <h2 className={`text-lg font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-slate-900'}`}>
                    {currentStepInfo.title}
                  </h2>
                  <p className={`text-xs ${saju ? SJ.inkMuted : 'text-slate-500'}`}>{currentStepInfo.subtitle}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className={`p-2 -mr-2 rounded-full ${saju ? SJ.iconHover : 'hover:bg-slate-100'} transition-colors`}
              >
                <X size={20} className={saju ? 'text-[#5C564A]' : 'text-slate-500'} />
              </button>
            </div>

            {/* 단계 표시 (성공 화면 제외) - 3단계 표시 */}
            {step < 4 && (
              <div className="px-5 py-3 flex gap-2 flex-shrink-0">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      s <= step
                        ? saju ? SJ.progressActive : 'bg-amber-400'
                        : saju ? SJ.progressInactive : 'bg-slate-200'
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
              <div className={`px-5 pb-2 flex-shrink-0 sticky top-0 z-10 border-b shadow-sm ${saju ? `bg-[#F5EFE2] ${SJ.hairline}` : 'bg-white border-slate-100'}`}>
                <div className={`rounded-xl p-3 border ${saju ? SJ.cardSoft : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/50'}`}>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className={`font-medium ${saju ? SJ.inkMuted : 'text-slate-600'}`}>{saju ? t('ratioStatus') : `📊 ${t('ratioStatus')}`}</span>
                    <span className={`font-bold ${
                      isOverLimit
                        ? saju ? SJ.cinnabarText : 'text-red-500'
                        : currentTotalRatio === 100
                          ? saju ? SJ.goldText : 'text-green-600'
                          : saju ? SJ.inkMuted : 'text-amber-600'
                    }`}>
                      {currentTotalRatio}% / 100%
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full overflow-hidden shadow-inner ${saju ? 'bg-[#FDFAF1]' : 'bg-white'}`}>
                    <div className="h-full flex">
                      <div
                        className={`transition-all duration-300 ${saju ? SJ.fillGold : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(feedback.retentionPercentage, 100)}%` }}
                      />
                      <div
                        className={`transition-all duration-300 ${
                          isOverLimit
                            ? saju ? SJ.fillCinnabar : 'bg-red-400'
                            : saju ? SJ.fillBlue : 'bg-green-400'
                        }`}
                        style={{ width: `${Math.min(totalAdditionalRatio, 100 - feedback.retentionPercentage)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`flex justify-between text-[10px] mt-1.5 ${saju ? SJ.inkMuted : 'text-slate-500'}`}>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${saju ? SJ.fillGold : 'bg-amber-400'}`}></span>
                      {t('recommendedScent')} {feedback.retentionPercentage}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        isOverLimit
                          ? saju ? SJ.fillCinnabar : 'bg-red-400'
                          : saju ? SJ.fillBlue : 'bg-green-400'
                      }`}></span>
                      {t('additionalScent')} {totalAdditionalRatio}%
                    </span>
                    {currentTotalRatio < 100 && (
                      <span className={saju ? SJ.inkFaint : 'text-slate-300'}>{t('unset')} {100 - currentTotalRatio}%</span>
                    )}
                  </div>
                  {isOverLimit && (
                    <p className={`text-xs mt-2 font-medium text-center ${saju ? SJ.cinnabarText : 'text-red-500'}`}>
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
                    className={`mb-4 p-3 border rounded-xl flex items-center justify-between ${saju ? SJ.cardSoft : 'bg-blue-50 border-blue-200'}`}
                  >
                    <p className={`text-sm ${saju ? SJ.blueInk : 'text-blue-600'}`}>
                      {t('restoredNotice')}
                    </p>
                    <button
                      onClick={() => setShowRestoredNotice(false)}
                      className={saju ? 'text-[#8B8578] hover:text-[#2C3E50]' : 'text-blue-400 hover:text-blue-600'}
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
                    className={`mb-4 p-3 border rounded-xl flex items-center justify-between ${saju ? SJ.cardCinnabar : 'bg-red-50 border-red-200'}`}
                  >
                    <p className={`text-sm ${saju ? SJ.cinnabarText : 'text-red-600'}`}>{error}</p>
                    <button
                      onClick={clearError}
                      className={saju ? 'text-[#C0392B]/60 hover:text-[#A93226]' : 'text-red-400 hover:text-red-600'}
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
                    className={`absolute inset-0 backdrop-blur-sm z-10 flex flex-col items-center justify-center ${saju ? 'bg-[#F5EFE2]/95' : 'bg-white/90'}`}
                  >
                    {saju ? (
                      // 운문 로딩 — 구름 사이로 금달이 차오른다 (상품 아트 모티프, SAJU_CLOUDS)
                      <div className="relative mb-4 h-20 w-44 overflow-hidden">
                        <motion.div
                          aria-hidden
                          className="absolute left-1/2 top-1 h-11 w-11 -translate-x-1/2 rounded-full"
                          style={{
                            background: 'radial-gradient(circle at 40% 35%, #F2DA8A, #C9A227 75%)',
                            boxShadow: '0 0 18px rgba(201,162,39,0.45)',
                          }}
                          animate={{ y: [6, 0, 6], opacity: [0.85, 1, 0.85] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <CloudDrift
                          tone="blue"
                          width={96}
                          sway={9}
                          duration={7}
                          strokeOpacity={0.3}
                          style={{ position: 'absolute', bottom: -3, left: 2 }}
                        />
                        <CloudDrift
                          tone="raised"
                          width={76}
                          flip
                          sway={-8}
                          duration={9}
                          delay={1.2}
                          strokeOpacity={0.26}
                          style={{ position: 'absolute', bottom: -6, right: 4 }}
                        />
                      </div>
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/40 mb-4"
                      >
                        <Sparkles size={28} className="text-white" />
                      </motion.div>
                    )}
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`text-lg font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-slate-700'}`}
                    >
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </motion.p>
                    <p className={`text-sm mt-2 ${saju ? SJ.inkMuted : 'text-slate-400'}`}>
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
                    theme={theme}
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
                    theme={theme}
                  />
                )}
                {modalView === 'form' && step === 3 && (
                  <FeedbackStep3NL
                    key="step3"
                    feedback={feedback}
                    naturalLanguageFeedback={feedback.naturalLanguageFeedback || ''}
                    onNaturalLanguageFeedbackChange={(value) => updateFeedback({ naturalLanguageFeedback: value })}
                    theme={theme}
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
                    theme={theme}
                  />
                )}

                {/* 레시피 확정 뷰 */}
                {modalView === 'confirm' && selectedRecipe && (
                  <RecipeConfirm
                    key="confirm"
                    recipe={selectedRecipe}
                    perfumeName={perfumeName}
                    resultId={resultId}
                    selectedRecipeType={selectedRecipeType}
                    onBack={handleBackFromConfirm}
                    onComplete={handleCompleteConfirm}
                    theme={theme}
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
                    theme={theme}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* 푸터 (폼 뷰에서만 표시) */}
            {modalView === 'form' && step < 4 && (
              <div className={`px-5 pt-4 pb-20 md:pb-4 border-t flex gap-3 flex-shrink-0 ${saju ? `${SJ.hairline} bg-transparent` : 'border-slate-100 bg-white'}`}>
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className={`flex-1 h-12 rounded-2xl font-semibold border-2 ${saju ? SJ.ctaOutline : ''}`}
                  >
                    <ChevronLeft size={18} />
                    {t('prevButton')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting || (step === 2 && currentTotalRatio !== 100)}
                  className={`flex-1 h-12 rounded-2xl font-bold transition-all ${
                    step === 2 && currentTotalRatio !== 100
                      ? saju ? SJ.ctaDisabled : 'text-white bg-slate-400 cursor-not-allowed'
                      : saju
                        ? SJ.ctaCinnabar
                        : step === 3
                          ? 'text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/30'
                          : step === 2
                            ? 'text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-lg shadow-amber-500/30'
                            : 'text-white bg-slate-900 hover:bg-slate-800'
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
