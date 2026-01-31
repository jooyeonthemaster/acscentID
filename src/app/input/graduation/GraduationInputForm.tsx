"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"

import { useGraduationForm } from "./hooks/useGraduationForm"
import {
    GraduationStep1,
    GraduationStep2,
    GraduationStep3,
    GraduationStep4,
    GraduationStep5,
    GraduationAnalyzingOverlay
} from "./components"
import { GRADUATION_TOTAL_STEPS, GRADUATION_THEME } from "./constants"
import { Header } from "@/components/layout/Header"

export function GraduationInputForm() {
    const {
        currentStep,
        totalSteps,
        formData,
        imagePreview,
        transformedImagePreview,
        showImageGuide,
        setShowImageGuide,
        focusedField,
        setFocusedField,
        isSubmitting,
        isAnalysisComplete,
        isCompressing,
        isTransforming,
        isOffline,
        isStepValid,
        setName,
        setGender,
        setGraduationType,
        setPin,
        togglePastStyle,
        togglePastPersonality,
        setPastMemories,
        setCurrentFeeling,
        toggleCurrentGrowth,
        setCurrentAchievements,
        toggleFutureDream,
        toggleFuturePersonality,
        setFutureWish,
        handleNext,
        handlePrev,
        navigateToResult,
        handleImageUpload,
        removeImage,
        handleTransformImage,
        skipTransform,
        handleComplete
    } = useGraduationForm()

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">
            {/* 분석 중 로딩 오버레이 */}
            <GraduationAnalyzingOverlay
                isVisible={isSubmitting}
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
                {/* 배경 - jollduck 이미지 또는 그라데이션 */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(135deg, ${GRADUATION_THEME.background} 0%, ${GRADUATION_THEME.accent} 50%, ${GRADUATION_THEME.highlight} 100%)`
                        }}
                    />
                    {/* 장식 패턴 */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-10 left-10 text-6xl">🎓</div>
                        <div className="absolute top-20 right-20 text-4xl">🌸</div>
                        <div className="absolute bottom-40 left-20 text-5xl">📜</div>
                        <div className="absolute bottom-20 right-10 text-4xl">✨</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50" />
                </div>

                {/* 헤더 높이만큼 여백 */}
                <div className="h-24 flex-shrink-0" />

                {/* 프로그레스 바 */}
                <GraduationProgressBar currentStep={currentStep} totalSteps={totalSteps} />

                {/* 메인 콘텐츠 Container */}
                <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col w-full px-4 pt-8 pb-32">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <GraduationStep1
                                key="step1"
                                formData={formData}
                                setName={setName}
                                setGender={setGender}
                                setGraduationType={setGraduationType}
                                setPin={setPin}
                                isOffline={isOffline}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                            />
                        )}
                        {currentStep === 2 && (
                            <GraduationStep2
                                key="step2"
                                formData={formData}
                                togglePastStyle={togglePastStyle}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                            />
                        )}
                        {currentStep === 3 && (
                            <GraduationStep3
                                key="step3"
                                formData={formData}
                                setCurrentFeeling={setCurrentFeeling}
                            />
                        )}
                        {currentStep === 4 && (
                            <GraduationStep4
                                key="step4"
                                formData={formData}
                                toggleFutureDream={toggleFutureDream}
                            />
                        )}
                        {currentStep === 5 && (
                            <GraduationStep5
                                key="step5"
                                imagePreview={imagePreview}
                                showImageGuide={showImageGuide}
                                isCompressing={isCompressing}
                                handleImageUpload={handleImageUpload}
                                removeImage={removeImage}
                                setShowImageGuide={setShowImageGuide}
                            />
                        )}
                    </AnimatePresence>

                    {/* 네비게이션 버튼 */}
                    <div>
                        <GraduationNavigationButtons
                            currentStep={currentStep}
                            totalSteps={totalSteps}
                            isValid={isStepValid(currentStep)}
                            isSubmitting={isSubmitting}
                            onPrev={handlePrev}
                            onNext={currentStep === totalSteps ? handleComplete : handleNext}
                            isLastStep={currentStep === totalSteps}
                        />
                    </div>
                </main>
            </div>
        </div>
    )
}

// ===== 프로그레스 바 컴포넌트 =====
function GraduationProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="relative z-10 px-4 py-2 w-full">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">
                    STEP {currentStep} / {totalSteps}
                </span>
                <span className="text-xs text-slate-400">
                    {currentStep === 1 && "기본 정보"}
                    {currentStep === 2 && "학창 시절"}
                    {currentStep === 3 && "지금 감정"}
                    {currentStep === 4 && "앞으로"}
                    {currentStep === 5 && "사진 업로드"}
                </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GRADUATION_THEME.primary }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </div>
    )
}

// ===== 네비게이션 버튼 컴포넌트 =====
interface GraduationNavigationButtonsProps {
    currentStep: number
    totalSteps: number
    isValid: boolean
    isSubmitting: boolean
    onPrev: () => void
    onNext: () => void
    isLastStep?: boolean
}

function GraduationNavigationButtons({
    currentStep,
    isValid,
    isSubmitting,
    onPrev,
    onNext,
    isLastStep = false
}: GraduationNavigationButtonsProps) {
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
                    className={`flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                        isValid && !isSubmitting
                            ? "text-white shadow-lg shadow-slate-900/20 hover:shadow-xl"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    style={{
                        backgroundColor: isValid && !isSubmitting
                            ? (isLastStep ? GRADUATION_THEME.secondary : GRADUATION_THEME.primary)
                            : undefined
                    }}
                >
                    {isSubmitting ? (
                        <span>분석 중...</span>
                    ) : isLastStep ? (
                        <>
                            <span>분석 시작</span>
                            <span className="text-lg">🎓</span>
                        </>
                    ) : (
                        <>
                            <span>다음</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    )
}
