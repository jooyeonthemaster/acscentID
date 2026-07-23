"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

import { useInputForm } from "./hooks/useInputForm"
import { Step1, Step2, Step3, Step4, Step5, AnalyzingOverlay } from "./components"
import { TOTAL_STEPS, GENDER_OPTIONS } from "./constants"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { GraduationInputForm } from "./graduation/GraduationInputForm"
import ChemistryInputPage from "./chemistry/ChemistryInputPage"
import SajuInputPage from "./saju/SajuInputPage"

import { Header } from "@/components/layout/Header"
import { AuthModal } from "@/components/auth/AuthModal"
import { InactiveProductGuard } from "@/components/programs/InactiveProductGuard"

// input type → product slug 매핑
const INPUT_TYPE_TO_SLUG: Record<string, string> = {
  idol_image: 'idol-image',
  figure: 'figure',
  graduation: 'graduation',
  personal: 'personal',
  le_quack: 'le-quack',
  chemistry: 'chemistry',
  saju: 'saju',
}

// input type → 프로그램 명패 라벨 (사주 위저드의 명패 위치·역할을 따른다)
const INPUT_TYPE_TO_TITLE_KEY: Record<string, string> = {
  idol_image: 'products.idolImage',
  figure: 'products.figureDiffuser',
  personal: 'products.personal',
  le_quack: 'products.leQuack',
}

// ===== 메인 폼 컴포넌트 =====
function InputForm() {
    const searchParams = useSearchParams()
    const t = useTranslations()
    const inputType = searchParams.get('type') || 'idol_image'
    const programTitle = t(INPUT_TYPE_TO_TITLE_KEY[inputType] ?? 'products.idolImage')

    const {
        currentStep,
        formData,
        setFormData,
        imagePreview,
        showImageGuide,
        setShowImageGuide,
        focusedField,
        setFocusedField,
        isSubmitting,
        isAnalysisComplete,
        isCompressing,
        isIdol,
        isOnline,
        // 피규어 온라인 모드 전용
        isFigureOnline,
        modelingImagePreview,
        isModelingCompressing,
        // QR 로그인 게이트
        showQrAuthGate,
        isStepValid,
        navigateToResult,
        toggleStyle,
        togglePersonality,
        toggleCharmPoint,
        handleNext,
        handlePrev,
        handleImageUpload,
        removeImage,
        handleModelingImageUpload,
        removeModelingImage,
        setModelingRequest,
        handleComplete
    } = useInputForm()

    // QR 로그인 후 복귀할 경로 (현재 URL 파라미터 보존)
    const qrRedirectPath = `/input?${searchParams.toString()}`

    // 스텝 본문 — 모바일/데스크탑 두 트리가 동일 JSX를 공유 (하이드레이션 후 한쪽만 마운트)
    const stepContent = (
                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <Step1
                            key="step1"
                            formData={formData}
                            setFormData={setFormData}
                            isIdol={isIdol}
                            isOnline={isOnline}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />
                    )}
                    {currentStep === 2 && (
                        <Step2
                            key="step2"
                            formData={formData}
                            setFormData={setFormData}
                            toggleStyle={toggleStyle}
                            isIdol={isIdol}
                        />
                    )}
                    {currentStep === 3 && (
                        <Step3
                            key="step3"
                            formData={formData}
                            setFormData={setFormData}
                            togglePersonality={togglePersonality}
                            isIdol={isIdol}
                        />
                    )}
                    {currentStep === 4 && (
                        <Step4
                            key="step4"
                            formData={formData}
                            setFormData={setFormData}
                            toggleCharmPoint={toggleCharmPoint}
                            isIdol={isIdol}
                        />
                    )}
                    {currentStep === 5 && (
                        <Step5
                            key="step5"
                            imagePreview={imagePreview}
                            showImageGuide={showImageGuide}
                            setShowImageGuide={setShowImageGuide}
                            handleImageUpload={handleImageUpload}
                            removeImage={removeImage}
                            isIdol={isIdol}
                            isCompressing={isCompressing}
                            // 피규어 온라인 모드 전용
                            isFigureOnline={isFigureOnline}
                            modelingImagePreview={modelingImagePreview}
                            modelingRequest={formData.modelingRequest}
                            setModelingRequest={setModelingRequest}
                            handleModelingImageUpload={handleModelingImageUpload}
                            removeModelingImage={removeModelingImage}
                            isModelingCompressing={isModelingCompressing}
                        />
                    )}
                </AnimatePresence>
    )

    // 데스크탑 레일용 스텝 라벨 (각 StepN이 StepHeader에 넘기는 타이틀 키 재사용)
    const railStepLabels = [
        t('input.step1.title'),
        isIdol ? t('input.step2.titleIdol') : t('input.step2.titlePersonal'),
        isIdol ? t('input.step3.titleIdol') : t('input.step3.titlePersonal'),
        isIdol ? t('input.step4.titleIdol') : t('input.step4.titlePersonal'),
        isFigureOnline ? t('input.step5.title') : (isIdol ? t('input.step5.titleIdol') : t('input.step5.titlePersonal')),
    ]

    // 완료 스텝 아래 표시할 입력 요약값 (표시 전용)
    const genderLabel = GENDER_OPTIONS.find((o) => o.key === formData.gender)?.label
    const railStepValues: (string | null)[] = [
        [formData.name, genderLabel].filter(Boolean).join(' · ') || null,
        [...formData.styles, formData.customStyle].filter(Boolean).join(' · ') || null,
        [...formData.personalities, formData.customPersonality].filter(Boolean).join(' · ') || null,
        [...formData.charmPoints, formData.customCharm].filter(Boolean).join(' · ') || null,
        null, // 이미지: 썸네일로 별도 표시
    ]

    const mobileWizard = (
        <>
            {/* 헤더 */}
            <Header
                showBack={currentStep > 1}
                backHref="back"
                compact
            />

            {/* 455px 고정 너비 컨테이너 */}
            <div className="relative w-full max-w-[455px] mx-auto min-h-screen flex flex-col">
                {/* 배경 — 이미지 분석 퍼퓸 */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <Image
                        src="/images/hero/analysis-bg-portrait-perfume-candidate.png"
                        alt=""
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-[var(--canvas)]/80" />
                </div>

                {/* compact 헤더 높이만큼 여백 */}
                <div className="relative z-10 h-14 flex-shrink-0" />

                {/* 프로그램 명패 — 사주 위저드의 낙관 로고 위치를 따른다 */}
                <div className="relative z-10 flex items-center justify-center gap-2.5 pb-1 pt-4">
                    <Image
                        src="/images/logo/acscent-wordmark-cream.png"
                        alt="AC'SCENT"
                        width={2053}
                        height={285}
                        priority
                        className="h-[11px] w-auto select-none opacity-90"
                    />
                    <span aria-hidden className="h-3 w-px bg-[var(--muted-ink)]/40" />
                    <span className="text-[11px] lg:text-[13px] font-semibold leading-[1.4] tracking-[0.14em] text-[var(--muted-ink)]">
                        {programTitle}
                    </span>
                </div>

                {/* 진행 실 — 매듭(노드) 방식 */}
                <div className="relative z-10 px-6 pt-2">
                    <ProgressBar currentStep={currentStep} />
                </div>

                {/* 메인 콘텐츠 Container — 하단 고정 내비 바 높이만큼 여백 확보 */}
                <main className="relative z-10 flex-1 flex flex-col w-full px-4 pt-8 pb-40">
                {stepContent}
            </main>
            </div>

            {/* 하단 고정 내비게이션 바 — 사주 위저드 방식 */}
            <NavigationButtons
                currentStep={currentStep}
                isValid={isStepValid(currentStep)}
                isSubmitting={isSubmitting}
                onPrev={handlePrev}
                onNext={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
            />
        </>
    )

    const desktopWizard = (
        <div className="relative min-h-screen">
            {/* 배경 — 풀블리드 데스크탑 사본 */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <Image
                    src="/images/hero/analysis-bg-portrait-perfume-candidate.png"
                    alt=""
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-[var(--canvas)]/85" />
            </div>

            {/* pt: 고정 데스크탑 헤더(84px) 아래로 콘텐츠 시작 */}
            <div className="relative z-10 mx-auto grid w-full max-w-[1060px] grid-cols-[340px_minmax(0,1fr)] gap-12 px-8 pb-16 pt-[116px]">
                {/* 좌측 레일: 브랜드 + 스텝 진행 + 입력 요약 */}
                <aside className="sticky top-[116px] self-start">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            aria-label={t('buttons.prev')}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted-ink)] transition-colors hover:border-[var(--line)] hover:text-[var(--ink)]"
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
                        <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-[var(--soft)]/70" />
                        <span className="text-[13px] font-semibold leading-[1.4] tracking-[0.14em] text-[var(--muted-ink)]">
                            {programTitle}
                        </span>
                    </div>

                    {/* 세로 스텝 리스트 — done/current/todo + 완료 항목 입력 요약 */}
                    <ol className="mt-8 space-y-1">
                        {railStepLabels.map((label, i) => {
                            const stepNo = i + 1
                            const state = stepNo < currentStep ? 'done' : stepNo === currentStep ? 'now' : 'todo'
                            return (
                                <li key={stepNo} className="relative pl-7 pb-4">
                                    {/* 세로 실 */}
                                    {stepNo < TOTAL_STEPS && (
                                        <span
                                            aria-hidden
                                            className={`absolute left-[5px] top-5 bottom-0 w-px ${state === 'done' ? 'bg-[var(--muted-ink)]' : 'bg-[var(--soft)]'}`}
                                        />
                                    )}
                                    {/* 매듭 */}
                                    <span
                                        aria-hidden
                                        className={`absolute left-0 top-1.5 ${
                                            state === 'done'
                                                ? 'h-[11px] w-[11px] rounded-full bg-[var(--soft)]'
                                                : state === 'now'
                                                    ? 'h-[11px] w-[11px] rounded-full border-[1.5px] border-[var(--line)] bg-[var(--canvas)]'
                                                    : 'ml-[2px] mt-[2px] h-[7px] w-[7px] rounded-full border border-[var(--line)] bg-[var(--canvas)]'
                                        }`}
                                    />
                                    <span
                                        className={`text-[14px] leading-tight ${
                                            state === 'now'
                                                ? 'font-semibold text-[var(--ink)]'
                                                : state === 'done'
                                                    ? 'text-[var(--muted-ink)]'
                                                    : 'text-[var(--muted-ink)]'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                    {state === 'done' && railStepValues[i] && (
                                        <p className="mt-1 truncate text-[12px] leading-snug text-[var(--muted-ink)]">
                                            {railStepValues[i]}
                                        </p>
                                    )}
                                    {state === 'done' && stepNo === 5 && imagePreview && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imagePreview}
                                            alt=""
                                            className="mt-1.5 h-12 w-12 rounded-[8px] border border-[var(--line)] object-cover"
                                        />
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                </aside>

                {/* 우측 입력 패널 */}
                <section className="min-w-0">
                    <div className="max-w-[640px] rounded-[6px] border border-[var(--line)] bg-[var(--paper)]/70 p-8">
                        {stepContent}

                        {/* 인라인 내비 — 고정 바 대신 폼 하단 */}
                        <div className="mt-10 flex items-center gap-4 border-t border-[var(--line)] pt-6">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={isSubmitting}
                                    className="flex flex-shrink-0 items-center gap-1 px-2 py-3 text-[14px] text-[var(--muted-ink)] transition-colors hover:text-[var(--ink)]"
                                >
                                    <ArrowLeft size={15} />
                                    {t('buttons.prev')}
                                </button>
                            )}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
                                disabled={!isStepValid(currentStep) || isSubmitting}
                                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[6px] text-[16px] font-semibold transition-colors duration-300 ${
                                    isStepValid(currentStep) && !isSubmitting
                                        ? "bg-[var(--ink)] text-white ring-1 ring-[var(--ink)]/40 hover:bg-black"
                                        : "bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed"
                                }`}
                            >
                                <span>{currentStep === TOTAL_STEPS ? t('buttons.complete') : t('buttons.next')}</span>
                                <ArrowRight size={18} />
                            </motion.button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[var(--canvas)] font-wanted text-[var(--ink)]">
            {/* 분석 중 로딩 오버레이 — 뷰포트 모드 무관 단일 인스턴스 */}
            <AnalyzingOverlay
                isVisible={isSubmitting}
                userName={formData.name}
                isComplete={isAnalysisComplete}
                onDoorOpened={navigateToResult}
            />

            <ViewportSwitch mobile={mobileWizard} desktop={desktopWizard} />

            {/* QR 오프라인 모드: 로그인 필수 게이트 */}
            <AuthModal
                isOpen={showQrAuthGate}
                onClose={() => {}}
                closeable={false}
                showGuestOption={false}
                title={t('auth.qrLoginTitle')}
                description={t('auth.qrLoginDescription')}
                redirectPath={qrRedirectPath}
            />
        </div>
    )
}

// ===== 프로그레스 바 — 실과 매듭(노드) 방식 (사주 ProgressThread의 구조를 따르되 아이보리 톤) =====
function ProgressBar({ currentStep }: { currentStep: number }) {
    const fraction = TOTAL_STEPS > 1 ? (currentStep - 1) / (TOTAL_STEPS - 1) : 0
    return (
        <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={currentStep}
            className="relative z-10 h-7 w-full"
        >
            <style>{`
                @keyframes input-knot-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(233,226,208,0.25); }
                    100% { box-shadow: 0 0 0 5px rgba(233,226,208,0); }
                }
            `}</style>
            {/* 미도달 구간 — 헤어라인 */}
            <div aria-hidden className="absolute inset-x-0 bg-[var(--soft)]" style={{ top: 23.5, height: 1 }} />
            {/* 아이보리 실 — 현재 매듭까지 채움 */}
            <motion.div
                aria-hidden
                className="absolute inset-x-0 bg-gradient-to-r from-[var(--muted-ink)] to-[var(--soft)]"
                style={{ top: 23.25, height: 1.5, transformOrigin: 'left' }}
                initial={false}
                animate={{ scaleX: fraction }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {/* 매듭 — 완료: 채움 / 현재: 링 + 펄스 + 숫자 / 미래: 작은 링 */}
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const pos = TOTAL_STEPS > 1 ? (i / (TOTAL_STEPS - 1)) * 100 : 0
                const state = i < currentStep - 1 ? 'done' : i === currentStep - 1 ? 'now' : 'todo'
                return (
                    <div
                        key={i}
                        aria-hidden
                        className="absolute"
                        style={{ left: `${pos}%`, top: 24, transform: 'translate(-50%, -50%)' }}
                    >
                        {state === 'now' && (
                            <span className="absolute -top-[18px] left-1/2 -translate-x-1/2 text-[10px] lg:text-[12px] font-bold tracking-widest text-[var(--ink)]">
                                {i + 1}
                            </span>
                        )}
                        <span
                            className={
                                state === 'done'
                                    ? 'block h-2 w-2 rounded-full bg-[var(--soft)]'
                                    : state === 'now'
                                        ? 'block h-[11px] w-[11px] rounded-full border-[1.5px] border-[var(--line)] bg-[var(--canvas)]'
                                        : 'block h-1.5 w-1.5 rounded-full border border-[var(--line)] bg-[var(--canvas)]'
                            }
                            style={state === 'now' ? { animation: 'input-knot-pulse 1.8s ease-out infinite' } : undefined}
                        />
                    </div>
                )
            })}
        </div>
    )
}

// ===== 네비게이션 버튼 컴포넌트 =====
interface NavigationButtonsProps {
    currentStep: number
    isValid: boolean
    isSubmitting: boolean
    onPrev: () => void
    onNext: () => void
}

function NavigationButtons({ currentStep, isValid, isSubmitting, onPrev, onNext }: NavigationButtonsProps) {
    const t = useTranslations()
    return (
        <div className="fixed inset-x-0 bottom-0 z-50">
            <div
                className="mx-auto w-full max-w-[455px] border-t border-[var(--line)] bg-[var(--paper)]/95 px-6 py-4 backdrop-blur"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
            >
                <div className="flex items-center gap-4">
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={onPrev}
                            disabled={isSubmitting}
                            className="flex-shrink-0 px-2 py-3 text-[14px] text-[var(--muted-ink)] flex items-center gap-1"
                        >
                            <ArrowLeft size={15} />
                            {t('buttons.prev')}
                        </button>
                    )}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={onNext}
                        disabled={!isValid || isSubmitting}
                        className={`h-[52px] flex-1 rounded-[6px] text-[16px] font-semibold flex items-center justify-center gap-2 transition-colors duration-300 ${
                            isValid && !isSubmitting
                                ? "bg-[var(--ink)] text-white ring-1 ring-[var(--ink)]/40"
                                : "bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed"
                        }`}
                    >
                        <span>{currentStep === TOTAL_STEPS ? t('buttons.complete') : t('buttons.next')}</span>
                        <ArrowRight size={18} />
                    </motion.button>
                </div>
            </div>
        </div>
    )
}

// ===== 메인 Export =====
function InputPageContent() {
    const searchParams = useSearchParams()
    const type = searchParams.get("type")
    const productSlug = INPUT_TYPE_TO_SLUG[type || ''] || 'idol-image'

    // 졸업 프로그램인 경우 전용 폼 렌더링
    if (type === "graduation") {
        return (
            <InactiveProductGuard productSlug={productSlug}>
                <GraduationInputForm />
            </InactiveProductGuard>
        )
    }

    // 케미 프로그램인 경우 전용 폼 렌더링
    if (type === "chemistry") {
        return (
            <InactiveProductGuard productSlug={productSlug}>
                <ChemistryInputPage />
            </InactiveProductGuard>
        )
    }

    // 사주 분석 퍼퓸 — 문진 위저드
    if (type === "saju") {
        return (
            <InactiveProductGuard productSlug={productSlug}>
                <SajuInputPage />
            </InactiveProductGuard>
        )
    }

    // 기본 폼 (idol_image, figure 등)
    return (
        <InactiveProductGuard productSlug={productSlug}>
            <InputForm />
        </InactiveProductGuard>
    )
}

export default function InputPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]" />}>
            <InputPageContent />
        </Suspense>
    )
}
