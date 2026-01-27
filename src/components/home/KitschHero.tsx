"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Camera, Sparkles, ImageIcon, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { StickerCartridge, StickerStar } from "./Stickers"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { compressImage } from "@/lib/image/compressor"
import { HeroAnalysisModal, type HeroAnalysisData } from "./HeroAnalysisModal"

// --- Slide Data (2개: Experience + Programs) ---
const SLIDES = [
    { id: "experience", bg: "bg-[#FEFCE2]" },
    { id: "programs", bg: "bg-[#FEFCE2]" }
]

export function KitschHero() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [direction, setDirection] = useState(0)

    const nextSlide = () => {
        setDirection(1)
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }

    const prevSlide = () => {
        setDirection(-1)
        setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1))
    }

    const goToSlide = (index: number) => {
        setDirection(index > currentSlide ? 1 : -1)
        setCurrentSlide(index)
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? "100%" : "-100%",
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? "100%" : "-100%",
            opacity: 0
        })
    }

    return (
        <section data-hero-section className="fixed top-0 left-0 w-full h-[100vh] z-0 overflow-hidden bg-[#1a2f1a] flex flex-col font-sans selection:bg-yellow-200 selection:text-yellow-900 border-b-4 border-slate-900">

            {/* --- Background Image Layer --- */}
            <div className="absolute inset-0 z-0">
                {/* Desktop & Mobile - hero background (살짝 블러) */}
                <Image
                    src="/images/hero/here.png"
                    alt="Hero Background"
                    fill
                    className="object-cover blur-[2px] scale-105"
                    style={{ objectPosition: 'center center' }}
                    priority
                />
                {/* 어두운 오버레이 - 텍스트 가독성 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />
            </div>

            {/* --- Main Carousel --- */}
            <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentSlide}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "tween", duration: 0.3, ease: "easeOut" },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0 flex flex-col justify-center items-center w-full h-full p-4 will-change-transform"
                    >
                        {currentSlide === 0 && <ExperienceSlide goToSlide={goToSlide} />}
                        {currentSlide === 1 && <ProgramSlide />}
                    </motion.div>
                </AnimatePresence>

                {/* --- Controls --- */}
                <div className="flex absolute bottom-20 md:bottom-12 z-50 items-center gap-4 md:gap-8">
                    <button onClick={prevSlide} className="group">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur-sm border-3 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-yellow-400">
                            <ArrowLeft className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>

                    {/* Pagination Indicators */}
                    <div className="flex gap-3 md:gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 md:px-6 md:py-3 rounded-full border-3 md:border-4 border-slate-900 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]">
                        {SLIDES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all border-2 border-slate-900 ${index === currentSlide ? "bg-yellow-400 scale-125" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            />
                        ))}
                    </div>

                    <button onClick={nextSlide} className="group">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur-sm border-3 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-yellow-400">
                            <ArrowRight className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>
                </div>
            </div>

        </section>
    )
}

// --- SLIDE 1: AI 이미지 분석 체험 ---
function ExperienceSlide({ goToSlide }: { goToSlide: (index: number) => void }) {
    const router = useRouter()
    const { user, unifiedUser } = useAuth()
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isCompressing, setIsCompressing] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<HeroAnalysisData | null>(null)
    const [showAnalysisModal, setShowAnalysisModal] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isLoggedIn = !!(user || unifiedUser)

    const handleImageUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.')
            return
        }

        setIsCompressing(true)
        setAnalysisResult(null)

        try {
            // compressImage는 이미 base64 문자열을 반환함
            const base64 = await compressImage(file, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8
            })

            setImagePreview(base64)
            setIsCompressing(false)

            // 이미지 데이터를 sessionStorage에 저장
            sessionStorage.setItem('hero_uploaded_image', base64)

            // Gemini Flash로 간단 분석 요청
            setIsAnalyzing(true)
            try {
                const response = await fetch('/api/hero-analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64 })
                })
                const result = await response.json()
                if (result.success && result.data) {
                    setAnalysisResult(result.data)
                }
            } catch (error) {
                console.error('Analysis failed:', error)
            } finally {
                setIsAnalyzing(false)
            }
        } catch (error) {
            console.error('Image compression failed:', error)
            setIsCompressing(false)
        }
    }, [])

    const handleDetailClick = () => {
        if (isLoggedIn) {
            router.push('/input?type=idol_image&mode=online&from=hero')
        } else {
            setShowAuthModal(true)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleImageUpload(file)
    }, [handleImageUpload])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleImageUpload(file)
    }, [handleImageUpload])

    const clearImage = () => {
        setImagePreview(null)
        setAnalysisResult(null)
        sessionStorage.removeItem('hero_uploaded_image')
    }

    return (
        <>
            {/* === MOBILE LAYOUT === */}
            <div className="md:hidden relative w-full h-full flex flex-col px-4 pt-20 pb-28">
                {/* 상단 타이틀 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                        <span className="text-yellow-400">이미지</span>로<br />
                        나만의 향수 만들기
                    </h1>
                    <p className="text-sm text-white/80 font-medium">
                        사진을 올리면 AI가 분석해드려요 ✨
                    </p>
                </motion.div>

                {/* 업로드 영역 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 flex items-center justify-center"
                >
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-full max-w-[320px] aspect-square rounded-3xl border-4 border-dashed transition-all cursor-pointer overflow-hidden
                            ${isDragging
                                ? 'border-yellow-400 bg-yellow-400/20 scale-105'
                                : imagePreview
                                    ? 'border-white/50 bg-white/10'
                                    : 'border-white/50 bg-white/10 hover:border-yellow-400 hover:bg-yellow-400/10'
                            }`}
                    >
                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        clearImage()
                                    }}
                                    className="absolute top-3 right-3 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white z-10"
                                >
                                    <X size={18} />
                                </button>
                                {/* 분석 상태 오버레이 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-4">
                                    {isCompressing || isAnalyzing ? (
                                        <div className="flex items-center justify-center gap-2 py-4">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
                                            <p className="text-white text-sm font-bold">
                                                {isCompressing ? '이미지 처리 중...' : 'AI가 분석 중... ✨'}
                                            </p>
                                        </div>
                                    ) : analysisResult ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1 text-yellow-400">
                                                <Sparkles size={14} className="fill-yellow-400" />
                                                <span className="text-xs font-bold">분석 완료!</span>
                                            </div>
                                            <p className="text-white text-sm font-medium">
                                                {analysisResult.teaser}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowAnalysisModal(true)
                                                }}
                                                className="w-full mt-2 py-2.5 bg-yellow-400 text-slate-900 font-bold text-sm rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Sparkles size={16} />
                                                분석 결과 보기
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                {isCompressing ? (
                                    <div className="w-12 h-12 border-4 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4 border-4 border-slate-900 shadow-[4px_4px_0px_#000]">
                                            <Camera size={36} className="text-slate-900" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-1">
                                            사진 올리기
                                        </p>
                                        <p className="text-white/60 text-sm text-center">
                                            탭하거나 이미지를<br />드래그해서 놓으세요
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 하단 버튼 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-3 mt-4"
                >
                    <button
                        onClick={() => goToSlide(1)}
                        className="w-full py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl border-2 border-white/30 hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18} />
                        다른 프로그램 보기
                    </button>
                </motion.div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* === DESKTOP LAYOUT === */}
            <div className="hidden md:flex relative w-full max-w-6xl h-full flex-col md:flex-row items-center justify-center gap-12 px-8">
                {/* 왼쪽: 텍스트 & CTA */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 max-w-xl"
                >
                    <div className="inline-block px-4 py-2 bg-yellow-400 text-slate-900 text-sm font-black rounded-full border-3 border-slate-900 shadow-[3px_3px_0px_#000] mb-6">
                        ✨ AI 이미지 분석 향수
                    </div>

                    <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6 drop-shadow-lg">
                        <span className="text-yellow-400">이미지</span>로<br />
                        나만의 향수 만들기
                    </h1>

                    <p className="text-lg text-white/80 font-medium mb-8 leading-relaxed">
                        좋아하는 사진을 업로드하면<br />
                        AI가 색감과 분위기를 분석하여<br />
                        세상에 하나뿐인 향수 레시피를 만들어드려요.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => goToSlide(1)}
                            className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-bold text-lg rounded-2xl border-3 border-white/50 hover:bg-white/30 transition-all"
                        >
                            프로그램 둘러보기
                        </button>
                    </div>
                </motion.div>

                {/* 오른쪽: 업로드 영역 */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 max-w-md flex items-center justify-center"
                >
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-full aspect-square rounded-3xl border-4 border-dashed transition-all cursor-pointer overflow-hidden
                            ${isDragging
                                ? 'border-yellow-400 bg-yellow-400/30 scale-105'
                                : imagePreview
                                    ? 'border-white/50 bg-white/10'
                                    : 'border-white/50 bg-white/10 hover:border-yellow-400 hover:bg-yellow-400/10'
                            }`}
                    >
                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        clearImage()
                                    }}
                                    className="absolute top-4 right-4 w-10 h-10 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors z-10"
                                >
                                    <X size={24} />
                                </button>
                                {/* 분석 상태 오버레이 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-6">
                                    {isCompressing || isAnalyzing ? (
                                        <div className="flex items-center justify-center gap-3 py-6">
                                            <div className="w-8 h-8 border-3 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
                                            <p className="text-white font-bold text-lg">
                                                {isCompressing ? '이미지 처리 중...' : 'AI가 분석 중... ✨'}
                                            </p>
                                        </div>
                                    ) : analysisResult ? (
                                        <div className="space-y-3 text-center">
                                            <div className="flex items-center justify-center gap-2 text-yellow-400">
                                                <Sparkles size={20} className="fill-yellow-400" />
                                                <span className="text-lg font-black">분석 완료!</span>
                                            </div>
                                            <p className="text-white font-medium">
                                                {analysisResult.teaser}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowAnalysisModal(true)
                                                }}
                                                className="w-full mt-3 py-3 bg-yellow-400 text-slate-900 font-black text-base rounded-xl border-3 border-slate-900 shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Sparkles size={20} />
                                                분석 결과 보기
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                                {isCompressing ? (
                                    <div className="w-16 h-16 border-4 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <div className="w-24 h-24 bg-yellow-400 rounded-3xl flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[6px_6px_0px_#000]">
                                            <ImageIcon size={48} className="text-slate-900" />
                                        </div>
                                        <p className="text-white font-black text-xl mb-2">
                                            사진을 여기에
                                        </p>
                                        <p className="text-white/60 text-center">
                                            클릭하거나 이미지를<br />
                                            드래그해서 놓으세요
                                        </p>
                                        <div className="mt-6 flex gap-2">
                                            {['AI분석', '맞춤향수', '커스텀'].map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                redirectPath="/input?type=idol_image&mode=online&from=hero"
            />

            {/* Analysis Result Modal */}
            <HeroAnalysisModal
                isOpen={showAnalysisModal}
                onClose={() => setShowAnalysisModal(false)}
                data={analysisResult}
                onDetailClick={handleDetailClick}
            />
        </>
    )
}

// --- SLIDE 2: PROGRAMS (Game Cartridges) ---
function ProgramSlide() {
    return (
        <div className="w-full max-w-4xl flex flex-col items-center px-4 md:px-8 pt-16 md:pt-0 relative">
            {/* 모바일 타이틀 */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="md:hidden text-center mb-8"
            >
                <h2 className="text-2xl font-black text-white drop-shadow-lg">
                    원하는 테마를<br />선택하세요
                </h2>
            </motion.div>

            {/* 데스크톱 전용 타이틀 */}
            <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden md:block text-5xl font-black text-white mb-16 relative text-center break-keep drop-shadow-lg"
            >
                원하는 테마를 선택하세요
                <StickerStar className="absolute -top-8 -right-16 w-16 h-16" />
            </motion.h2>

            {/* 2개 카트리지 균형 잡힌 배치 */}
            <div className="w-full flex justify-center">
                <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 md:gap-16">
                    {/* 최애 향수 - 왼쪽 기울임 */}
                    <a href="/programs/idol-image" className="w-[140px] h-[180px] sm:w-[180px] sm:h-[230px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ y: -20, rotate: -3 }}
                            className="relative"
                        >
                            <StickerCartridge
                                title="최애 향수"
                                subtitle="AI 이미지 분석"
                                color="bg-[#C084FC]"
                                className="scale-[0.55] sm:scale-[0.75] md:scale-105 origin-center -rotate-3"
                            />
                        </motion.div>
                    </a>

                    {/* 피규어 - 오른쪽 기울임 */}
                    <a href="/programs/figure" className="w-[140px] h-[180px] sm:w-[180px] sm:h-[230px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ y: -20, rotate: 3 }}
                            className="relative"
                        >
                            <StickerCartridge
                                title="피규어"
                                subtitle="디퓨저"
                                color="bg-[#F87171]"
                                className="scale-[0.55] sm:scale-[0.75] md:scale-105 origin-center rotate-3"
                            />
                        </motion.div>
                    </a>
                </div>
            </div>

            {/* 하단 안내 */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 md:mt-12 text-white/70 text-sm md:text-base font-medium text-center"
            >
                카트리지를 클릭하여 프로그램을 시작하세요
            </motion.p>
        </div>
    )
}
