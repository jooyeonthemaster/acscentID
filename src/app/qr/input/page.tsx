"use client"

import { Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Heart, Star } from "lucide-react"

import { useInputForm } from "@/app/input/hooks/useInputForm"
import { Step1, Step2, Step3, Step4, Step5, CrazyTyper } from "@/app/input/components"
import { TOTAL_STEPS } from "@/app/input/constants"

import { Header } from "@/components/layout/Header"

// ===== QR 오프라인 전용 입력 폼 =====
// 기존 input 페이지와 동일 - QR 코드로만 접근
function QRInputForm() {
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
        <div className="relative w-full h-screen bg-[#FAFAFA] font-sans overflow-hidden text-slate-800 flex">

            {/* Desktop Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 h-full relative bg-[#FFD700] overflow-hidden items-center justify-center p-12 border-r-4 border-black">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

                {/* Decorative Stickers */}
                <div className="absolute top-10 left-10 animate-float">
                    <div className="w-12 h-12 bg-pink-400 rounded-full border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Heart className="text-white fill-white" size={24} />
                    </div>
                </div>
                <div className="absolute bottom-20 right-10 animate-spin-slow">
                    <div className="w-16 h-16 bg-blue-400 rounded-full border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Star className="text-white fill-white" size={32} />
                    </div>
                </div>

                <div className="relative z-10 text-center w-full px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                    >
                        <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
                            AC&apos;SCENT<br />
                            <span className="text-white drop-shadow-md">IDENTITY</span>
                        </h2>

                        {/* CrazyTyper Animation */}
                        <div className="min-h-[240px] flex items-center justify-center">
                            <CrazyTyper step={currentStep} formData={formData} />
                        </div>
                    </motion.div>
                </div>

                {/* Marquee Bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-black py-2 overflow-hidden">
                    <div className="animate-ticker whitespace-nowrap flex gap-4 text-white text-[10px] font-black tracking-[0.2em]">
                        {Array(10).fill("FIND YOUR SIGNATURE SCENT • ").map((s, i) => (
                            <span key={i}>{s}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side (Mobile: Full Width, Desktop: 1/2) */}
            <div className="flex-1 h-full flex flex-col relative bg-[#FAFAFA] z-0 pt-24">
                {/* Mobile Background (Light) */}
                <div className="lg:hidden">
                    <Background />
                </div>

                {/* 헤더 */}
                <Header
                    showBack={currentStep > 1}
                    backHref="back"
                />

                {/* 프로그레스 바 */}
                <ProgressBar currentStep={currentStep} />

                {/* 메인 콘텐츠 Container */}
                <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-start max-w-xl mx-auto w-full px-4">
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
                    {/* Mobile Only CrazyTyper - 컴팩트 버전 */}
                    <div className="lg:hidden w-full py-2 min-h-[50px] flex items-center justify-center pointer-events-none">
                        <div className="scale-75 origin-center">
                            <CrazyTyper step={currentStep} formData={formData} />
                        </div>
                    </div>
                </main>

                {/* 하단 버튼 */}
                <div className="w-full max-w-xl mx-auto">
                    <NavigationButtons
                        currentStep={currentStep}
                        isValid={isStepValid(currentStep)}
                        isSubmitting={isSubmitting}
                        onPrev={handlePrev}
                        onNext={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
                    />
                </div>
            </div>
        </div>
    )
}

// ===== 배경 컴포넌트 =====
function Background({ isDark = false }: { isDark?: boolean }) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute inset-0 bg-noise opacity-[0.03] ${isDark ? 'mix-blend-overlay' : 'mix-blend-multiply'}`} />
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                className={`absolute -top-[30%] -right-[30%] w-[80%] h-[80%] rounded-full blur-[100px] ${isDark ? 'bg-indigo-500/20' : 'bg-yellow-100/40'
                    }`}
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                className={`absolute bottom-[0%] -left-[20%] w-[70%] h-[70%] rounded-full blur-[80px] ${isDark ? 'bg-purple-900/30' : 'bg-purple-100/30'
                    }`}
            />
        </div>
    )
}


// ===== 프로그레스 바 컴포넌트 =====
function ProgressBar({ currentStep }: { currentStep: number }) {
    return (
        <div className="relative z-10 px-4 py-2">
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
                    AI가 향수를 분석하는 중... (최대 30초 소요)
                </div>
            )}
        </div>
    )
}

// ===== 메인 Export =====
export default function QRInputPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
            <QRInputForm />
        </Suspense>
    )
}
