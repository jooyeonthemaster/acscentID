"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"

import { useInputForm } from "./hooks/useInputForm"
import { Step1, Step2, Step3, Step4, Step5, AnalyzingOverlay } from "./components"
import { TOTAL_STEPS } from "./constants"
import { GraduationInputForm } from "./graduation/GraduationInputForm"

import { Header } from "@/components/layout/Header"

// ===== 메인 폼 컴포넌트 =====
function InputForm() {
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

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">
            {/* 분석 중 로딩 오버레이 */}
            <AnalyzingOverlay
                isVisible={isSubmitting}
                userName={formData.name}
                isComplete={isAnalysisComplete}
                onDoorOpened={navigateToResult}
            />

            {/* 헤더 */}
            <Header
                showBack={currentStep > 1}
                backHref="back"
            />

            {/* 455px 고정 너비 컨테이너 */}
            <div className="relative w-full max-w-[455px] mx-auto min-h-screen flex flex-col">
                {/* 배경 - 숲 이미지 + 오버레이 */}
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

                {/* 헤더 높이만큼 여백 (fixed 헤더: marquee 32px + main 64px = 96px) */}
                <div className="h-24 flex-shrink-0" />

                {/* 프로그레스 바 */}
                <ProgressBar currentStep={currentStep} />

                {/* 메인 콘텐츠 Container */}
                <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col w-full px-4 pt-8 pb-32">
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

                {/* 버튼 - 폼 바로 아래 */}
                <div>
                    <NavigationButtons
                        currentStep={currentStep}
                        isValid={isStepValid(currentStep)}
                        isSubmitting={isSubmitting}
                        onPrev={handlePrev}
                        onNext={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
                    />
                </div>
            </main>
            </div>
        </div>
    )
}

// ===== 프로그레스 바 컴포넌트 =====
function ProgressBar({ currentStep }: { currentStep: number }) {
    return (
        <div className="relative z-10 px-4 py-2 w-full">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-yellow-400 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
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
    return (
        <div className="relative z-10 px-4 pb-4 pt-2">
            <div className="flex gap-3">
                {currentStep > 1 && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onPrev}
                        className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                )}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={onNext}
                    disabled={!isValid || isSubmitting}
                    className={`flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${isValid && !isSubmitting
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                >
                    <span>{currentStep === TOTAL_STEPS ? "완료" : "다음"}</span>
                    <ArrowRight size={18} />
                </motion.button>
            </div>
        </div>
    )
}

// ===== 메인 Export =====
function InputPageContent() {
    const searchParams = useSearchParams()
    const type = searchParams.get("type")

    // 졸업 프로그램인 경우 전용 폼 렌더링
    if (type === "graduation") {
        return <GraduationInputForm />
    }

    // 기본 폼 (idol_image, figure 등)
    return <InputForm />
}

export default function InputPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
            <InputPageContent />
        </Suspense>
    )
}
