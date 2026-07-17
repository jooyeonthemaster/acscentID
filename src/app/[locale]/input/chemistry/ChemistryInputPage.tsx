"use client"

import { Suspense } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { useChemistryForm } from "./hooks/useChemistryForm"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
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

  // 페이즈 본문 — 모바일/데스크탑 공유 (하이드레이션 후 한쪽만 마운트)
  const phaseContent = (
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
  )

  const mobileWizard = (
    <>
      {/* 헤더 */}
      <Header showBack backHref="back" compact />

      {/* 455px 고정 너비 컨테이너 */}
      <div className="relative w-full max-w-[455px] mx-auto min-h-[100svh] flex flex-col">
        {/* 배경 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/hero/chemistry-layering-bg-no-smoke-candidate.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[#12141D]/80" />
        </div>

        {/* compact 헤더 높이 여백 */}
        <div className="h-14 flex-shrink-0" />

        {/* 프로그레스 */}
        <ChemistryProgress phase={phase} currentCard={currentCard} totalCards={TOTAL_CARDS} />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10 flex-1 flex flex-col w-full px-4 pt-4 pb-4">
          <div className="flex-1">
            {phaseContent}
          </div>

          {/* 네비게이션 버튼 */}
          <div className="sticky bottom-0 z-20 -mx-4 mt-5 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F5EFE2] via-[#F5EFE2]/95 to-[#F5EFE2]/0">
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
    </>
  )

  const phaseLabels = [
    { key: 'summon', label: t('chemistry.progress.summon') },
    { key: 'deck', label: t('chemistry.progress.deck') },
    { key: 'catalyst', label: t('chemistry.progress.catalyst') },
  ]
  const phaseOrder = ['summon', 'deck', 'catalyst']
  const phaseIdx = phaseOrder.indexOf(phase)

  const desktopWizard = (
    <div className="relative min-h-screen">
      {/* 배경 — 풀블리드 데스크탑 사본 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/images/hero/chemistry-layering-bg-no-smoke-candidate.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#12141D]/85" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1060px] grid-cols-[340px_minmax(0,1fr)] gap-12 px-8 pb-16 pt-10">
        {/* 좌측 레일 */}
        <aside className="sticky top-10 self-start">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label={t('buttons.prev')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#262A38] text-[#A69F8D] transition-colors hover:border-[#3A4051] hover:text-[#E9E2D0]"
            >
              <ArrowLeft size={16} />
            </button>
            <Link href="/" className="flex flex-col">
              <Image
                src="/images/logo/acscent-wordmark-cream.png"
                alt="AC'SCENT"
                width={2053}
                height={285}
                className="h-[15px] w-auto select-none"
              />
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-[#E9E2D0]/70" />
            <span className="text-[13px] font-semibold leading-[1.4] tracking-[0.14em] text-[#A69F8D]">
              {t('products.chemistry')}
            </span>
          </div>

          {/* 세로 페이즈 리스트 */}
          <ol className="mt-8 space-y-1">
            {phaseLabels.map((p, i) => {
              const state = i < phaseIdx ? 'done' : i === phaseIdx ? 'now' : 'todo'
              return (
                <li key={p.key} className="relative pl-7 pb-4">
                  {i < phaseLabels.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[5px] top-5 bottom-0 w-px ${state === 'done' ? 'bg-[#A69F8D]' : 'bg-[#262A38]'}`}
                    />
                  )}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1.5 ${
                      state === 'done'
                        ? 'h-[11px] w-[11px] rounded-full bg-[#E9E2D0]'
                        : state === 'now'
                          ? 'h-[11px] w-[11px] rounded-full border-[1.5px] border-[#E9E2D0] bg-[#10131C]'
                          : 'ml-[2px] mt-[2px] h-[7px] w-[7px] rounded-full border border-[#3A4051] bg-[#10131C]'
                    }`}
                  />
                  <span
                    className={`text-[14px] leading-tight ${
                      state === 'now'
                        ? 'font-semibold text-[#E9E2D0]'
                        : state === 'done'
                          ? 'text-[#A69F8D]'
                          : 'text-[#5C564A]'
                    }`}
                  >
                    {p.label}
                    {p.key === 'deck' && state === 'now' && (
                      <span className="ml-2 text-[12px] font-bold text-[#8B8578]">
                        {Math.min(currentCard + 1, TOTAL_CARDS)}/{TOTAL_CARDS}
                      </span>
                    )}
                  </span>
                  {/* summon 완료 요약: 캐릭터 썸네일 + 이름 */}
                  {p.key === 'summon' && state === 'done' && (image1Preview || image2Preview) && (
                    <div className="mt-2 flex items-center gap-2">
                      {image1Preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image1Preview} alt="" className="h-10 w-10 rounded-[8px] border border-[#262A38] object-cover" />
                      )}
                      {image2Preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image2Preview} alt="" className="h-10 w-10 rounded-[8px] border border-[#262A38] object-cover" />
                      )}
                      <span className="min-w-0 truncate text-[12px] text-[#8B8578]">
                        {[formData.character1Name, formData.character2Name].filter(Boolean).join(' × ')}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </aside>

        {/* 우측 패널 — 페이즈가 자체 카드 비주얼을 가지므로 투명 컨테이너 */}
        <section className="min-w-0">
          <div className="max-w-[640px]">
            {phaseContent}

            <div className="mt-8">
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
          </div>
        </section>
      </div>
    </div>
  )

  return (
    <div className="min-h-[100svh] bg-[#10131C] font-wanted text-[#E9E2D0]">
      {/* 분석 중 오버레이 — 뷰포트 모드 무관 단일 인스턴스 */}
      <ChemistryAnalyzingOverlay
        isVisible={isSubmitting}
        character1Name={formData.character1Name}
        character2Name={formData.character2Name}
        image1Preview={image1Preview}
        image2Preview={image2Preview}
        isComplete={isAnalysisComplete}
        onDoorOpened={navigateToResult}
      />

      <ViewportSwitch mobile={mobileWizard} desktop={desktopWizard} />

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
  const t = useTranslations('chemistry')
  let progress = 0
  if (phase === 'summon') progress = 10
  else if (phase === 'deck') progress = 20 + (currentCard / totalCards) * 60
  else if (phase === 'catalyst') progress = 90

  return (
    <div className="relative z-10 px-4 py-2 w-full">
      <div className="h-1.5 bg-[#EDE5D2] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] lg:text-[12px] font-bold text-[#8B8578]">
        <span className={phase === 'summon' ? 'text-[#8B8578]' : ''}>{t('progress.summon')}</span>
        <span className={phase === 'deck' ? 'text-[#8B8578]' : ''}>{t('progress.deck')}</span>
        <span className={phase === 'catalyst' ? 'text-[#8B8578]' : ''}>{t('progress.catalyst')}</span>
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
  const t = useTranslations('chemistry.buttons')

  if (phase === 'summon') {
    return (
      <div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSummonNext}
          disabled={!isSummonValid}
          className={`w-full h-14 rounded-[12px] font-bold text-base flex items-center justify-center gap-2 transition-all border-2 border-[#12141D] ${
            isSummonValid
              ? "bg-[#EEB62B] text-[#1A1610] hover:bg-[#E0B02A]"
            : "bg-[#EDE5D2] text-[#5C564A] cursor-not-allowed border-[#D8CFBB]"
          }`}
        >
          <span>{t('analyze')}</span>
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
          className="flex-shrink-0 w-14 h-14 rounded-[12px] bg-[#F5EFE2] border-2 border-[#D8CFBB] flex items-center justify-center text-[#5C564A] hover:bg-[#EDE5D2]"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCardNext}
          disabled={!isCardValid}
          className={`flex-1 h-14 rounded-[12px] font-bold text-base flex items-center justify-center gap-2 transition-all border-2 border-[#12141D] ${
            isCardValid
              ? "bg-[#EEB62B] text-[#1A1610] hover:bg-[#E0B02A]"
            : "bg-[#EDE5D2] text-[#5C564A] cursor-not-allowed border-[#D8CFBB]"
          }`}
        >
          <span>{t('nextCard')}</span>
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
        className="flex-shrink-0 w-14 h-14 rounded-[12px] bg-[#F5EFE2] border-2 border-[#D8CFBB] flex items-center justify-center text-[#5C564A] hover:bg-[#EDE5D2]"
      >
        <ArrowLeft size={20} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        disabled={isSubmitting}
        className="flex-1 h-14 rounded-[12px] font-black text-base flex items-center justify-center gap-2 bg-[#EEB62B] text-[#1A1610] border-2 border-[#B8880F] transition-all"
      >
        <span>{t('startAnalysis')}</span>
        <ArrowRight size={18} />
      </motion.button>
    </div>
  )
}

export default function ChemistryInputPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[#10131C]" />}>
      <ChemistryInputFormInner />
    </Suspense>
  )
}
