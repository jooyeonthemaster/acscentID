"use client"

import { Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { useInputForm } from "./hooks/useInputForm"
import { Step1, Step2, Step3, Step4, Step5 } from "./components"
import { TOTAL_STEPS } from "./constants"

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
        isCompressing,
        isIdol,
        isStepValid,
        toggleStyle,
        togglePersonality,
        toggleCharmPoint,
        handleNext,
        handlePrev,
        handleImageUpload,
        removeImage,
        handleComplete
    } = useInputForm()

    return (
        <div className="relative flex flex-col h-screen bg-[#FAFAFA] font-sans overflow-hidden text-slate-800">
            {/* 배경 */}
            <Background />

            {/* 헤더 */}
            <Header />

            {/* 프로그레스 바 */}
            <ProgressBar currentStep={currentStep} />

            {/* 메인 콘텐츠 */}
            <main className="relative z-10 flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <Step1
                            key="step1"
                            formData={formData}
                            setFormData={setFormData}
                            isIdol={isIdol}
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
                        />
                    )}
                </AnimatePresence>
            </main>

            {/* 하단 버튼 */}
            <NavigationButtons
                currentStep={currentStep}
                isValid={isStepValid(currentStep)}
                isSubmitting={isSubmitting}
                onPrev={handlePrev}
                onNext={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
            />
        </div>
    )
}

// ===== 배경 컴포넌트 =====
function Background() {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-multiply" />
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[30%] -right-[30%] w-[80%] h-[80%] bg-yellow-100/40 rounded-full blur-[100px]"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[0%] -left-[20%] w-[70%] h-[70%] bg-purple-100/30 rounded-full blur-[80px]"
            />
        </div>
    )
}

// ===== 헤더 컴포넌트 =====
function Header() {
    return (
        <header className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
                <ChevronLeft size={24} className="text-slate-800" />
            </Link>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                AC&apos;SCENT IDENTITY
            </div>
            <div className="w-10" />
        </header>
    )
}

// ===== 프로그레스 바 컴포넌트 =====
function ProgressBar({ currentStep }: { currentStep: number }) {
    return (
        <div className="relative z-10 px-6 py-2">
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
        <div className="relative z-10 px-6 pb-6 pt-2">
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
                            ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>분석 중...</span>
                            </>
                        ) : (
                            <>
                                <span>{currentStep === TOTAL_STEPS ? "완료" : "다음"}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </div>
                </motion.button>
            </div>
            {isSubmitting && (
                <div className="text-xs text-slate-500 text-center mt-3 animate-pulse">
                    AI가 향수를 분석하는 중... ✨ (최대 30초 소요)
                </div>
            )}
        </div>
    )
}

// ===== 메인 Export =====
export default function InputPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
            <InputForm />
        </Suspense>
    )
}
