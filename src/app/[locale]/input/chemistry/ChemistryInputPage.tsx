"use client"

import { Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { useChemistryForm } from "./hooks/useChemistryForm"
import { SummonPhase } from "./components/SummonPhase"
import { CardDeck } from "./components/CardDeck"
import { CatalystPhase } from "./components/CatalystPhase"
import { ChemistryAnalyzingOverlay } from "./components/ChemistryAnalyzingOverlay"
import { Header } from "@/components/layout/Header"
import { AuthModal } from "@/components/auth/AuthModal"

function ChemistryInputFormInner() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const {
    phase,
    currentCard,
    formData,
    setFormData,
    isSubmitting,
    isAnalysisComplete,
    isCompressing1,
    isCompressing2,
    isOffline,
    showAuthGate,
    TOTAL_CARDS,
    isSummonValid,
    isCardValid,
    goToDeck,
    nextCard,
    prevCard,
    toggleEmotion,
    handleImage1Upload,
    handleImage2Upload,
    removeImage1,
    removeImage2,
    handleComplete,
    navigateToResult,
    image1Preview,
    image2Preview,
  } = useChemistryForm()

  // 로그인 후 복귀할 경로 (현재 URL 파라미터 보존 — type=chemistry 포함)
  const authRedirectPath = `/input?${searchParams.toString()}`

  return (
    <div className="min-h-[100svh] bg-[#FAFAFA] font-sans text-slate-800">
      {/* 분석 중 오버레이 */}
      <ChemistryAnalyzingOverlay
        isVisible={isSubmitting}
        character1Name={formData.character1Name}
        character2Name={formData.character2Name}
        image1Preview={image1Preview}
        image2Preview={image2Preview}
        isComplete={isAnalysisComplete}
        onDoorOpened={navigateToResult}
      />

      {/* 헤더 */}
      <Header showBack backHref="back" />

      {/* 455px 고정 너비 컨테이너 */}
      <div className="relative w-full max-w-[455px] mx-auto min-h-[100svh] flex flex-col">
        {/* 배경 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/hero/forest_bg.png"
            alt="Forest Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/70" />
        </div>

        {/* 헤더 높이 여백 */}
        <div className="h-[84px] flex-shrink-0" />

        {/* 프로그레스 */}
        <ChemistryProgress phase={phase} currentCard={currentCard} totalCards={TOTAL_CARDS} />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10 flex-1 flex flex-col w-full px-4 pt-4 pb-4">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {phase === 'summon' && (
                <motion.div
                  key="summon"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SummonPhase
                    formData={formData}
                    setFormData={setFormData}
                    handleImage1Upload={handleImage1Upload}
                    handleImage2Upload={handleImage2Upload}
                    removeImage1={removeImage1}
                    removeImage2={removeImage2}
                    isCompressing1={isCompressing1}
                    isCompressing2={isCompressing2}
                    isOffline={isOffline}
                  />
                </motion.div>
              )}

              {phase === 'deck' && (
                <motion.div
                  key="deck"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardDeck
                    currentCard={currentCard}
                    formData={formData}
                    setFormData={setFormData}
                    toggleEmotion={toggleEmotion}
                    character1Name={formData.character1Name}
                    character2Name={formData.character2Name}
                  />
                </motion.div>
              )}

              {phase === 'catalyst' && (
                <motion.div
                  key="catalyst"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CatalystPhase
                    formData={formData}
                    setFormData={setFormData}
                    character1Name={formData.character1Name}
                    character2Name={formData.character2Name}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 네비게이션 버튼 */}
          <div className="sticky bottom-0 z-20 -mx-4 mt-5 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/95 to-[#FAFAFA]/0">
            <ChemistryNavButtons
              phase={phase}
              isSummonValid={isSummonValid()}
              isCardValid={isCardValid(currentCard)}
              isSubmitting={isSubmitting}
              onSummonNext={goToDeck}
              onCardNext={nextCard}
              onCardPrev={prevCard}
              onComplete={handleComplete}
            />
          </div>
        </main>
      </div>

      {/* 케미 분석: 온라인/오프라인 무관 로그인 필수 게이트 */}
      <AuthModal
        isOpen={showAuthGate}
        onClose={() => {}}
        closeable={false}
        showGuestOption={false}
        title={t('auth.qrLoginTitle')}
        description={t('auth.qrLoginDescription')}
        redirectPath={authRedirectPath}
      />
    </div>
  )
}

// 프로그레스 표시
function ChemistryProgress({ phase, currentCard, totalCards }: {
  phase: string
  currentCard: number
  totalCards: number
}) {
  let progress = 0
  if (phase === 'summon') progress = 10
  else if (phase === 'deck') progress = 20 + (currentCard / totalCards) * 60
  else if (phase === 'catalyst') progress = 90

  return (
    <div className="relative z-10 px-4 py-2 w-full">
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400">
        <span className={phase === 'summon' ? 'text-violet-500' : ''}>소환</span>
        <span className={phase === 'deck' ? 'text-violet-500' : ''}>카드 덱</span>
        <span className={phase === 'catalyst' ? 'text-violet-500' : ''}>촉매</span>
      </div>
    </div>
  )
}

// 네비게이션 버튼
function ChemistryNavButtons({
  phase, isSummonValid, isCardValid, isSubmitting,
  onSummonNext, onCardNext, onCardPrev, onComplete,
}: {
  phase: string
  isSummonValid: boolean
  isCardValid: boolean
  isSubmitting: boolean
  onSummonNext: () => void
  onCardNext: () => void
  onCardPrev: () => void
  onComplete: () => void
}) {
  if (phase === 'summon') {
    return (
      <div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSummonNext}
          disabled={!isSummonValid}
          className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[4px_4px_0_0_black] ${
            isSummonValid
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 shadow-none"
          }`}
        >
          <span>분석하기</span>
          <ArrowRight size={18} />
        </motion.button>
      </div>
    )
  }

  if (phase === 'deck') {
    return (
      <div className="flex gap-3">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onCardPrev}
          className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0_0_black] flex items-center justify-center text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCardNext}
          disabled={!isCardValid}
          className={`flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[4px_4px_0_0_black] ${
            isCardValid
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 shadow-none"
          }`}
        >
          <span>다음 카드</span>
          <ArrowRight size={18} />
        </motion.button>
      </div>
    )
  }

  // catalyst phase
  return (
    <div className="flex gap-3">
      <motion.button
        onClick={onCardPrev}
        className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0_0_black] flex items-center justify-center text-slate-600 hover:bg-slate-50"
      >
        <ArrowLeft size={20} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        disabled={isSubmitting}
        className="flex-1 h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-[2px_2px_0_0_black] transition-all"
      >
        <span>케미 분석 시작하기</span>
        <ArrowRight size={18} />
      </motion.button>
    </div>
  )
}

export default function ChemistryInputPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[#FAFAFA]" />}>
      <ChemistryInputFormInner />
    </Suspense>
  )
}
