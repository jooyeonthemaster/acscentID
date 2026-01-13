"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { StickerPerfume, StickerStar, StickerCartridge } from "./Stickers"
import { KitschScene } from "./KitschScene"
import { CouponRocketGame } from "./CouponRocketGame"

// --- Slide Data (2개: Brand + Programs) ---
const SLIDES = [
    { id: "brand", bg: "bg-[#FEFCE2]" },
    { id: "programs", bg: "bg-[#FEFCE2]" }
]

export function KitschHero() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [direction, setDirection] = useState(0)

    // Mouse Parallax Logic
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springConfig = { damping: 25, stiffness: 150 }
    const springX = useSpring(mouseX, springConfig)
    const springY = useSpring(mouseY, springConfig)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { innerWidth, innerHeight } = window
            mouseX.set(e.clientX / innerWidth - 0.5)
            mouseY.set(e.clientY / innerHeight - 0.5)
        }
        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [mouseX, mouseY])

    const nextSlide = () => {
        setDirection(1)
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }

    const prevSlide = () => {
        setDirection(-1)
        setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1))
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 0.8,
            rotate: direction > 0 ? 5 : -5
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotate: 0
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 0.8,
            rotate: direction < 0 ? 5 : -5
        })
    }

    return (
        <section data-hero-section className="fixed top-0 left-0 w-full h-[100vh] z-0 overflow-hidden bg-[#FEFCE2] flex flex-col font-sans selection:bg-pink-200 selection:text-pink-900 border-b-4 border-slate-900">

            {/* --- Background --- */}
            {/* 1. Infinite Marquee Text */}
            <div className="absolute top-20 left-0 w-full overflow-hidden opacity-5 pointer-events-none select-none z-0">
                <motion.div
                    animate={{ x: [0, -1000] }}
                    transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                    className="whitespace-nowrap font-black text-[18vh] text-slate-900 leading-none"
                >
                    나만의 향기를 찾아서 FIND YOUR SCENT 나만의 향기를 찾아서 FIND YOUR SCENT
                </motion.div>
            </div>
            <div className="absolute bottom-20 left-0 w-full overflow-hidden opacity-5 pointer-events-none select-none z-0">
                <motion.div
                    animate={{ x: [-1000, 0] }}
                    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                    className="whitespace-nowrap font-black text-[18vh] text-slate-900 leading-none"
                >
                    PREMIUM KITSCH 뿌덕뿌덕 PREMIUM KITSCH 뿌덕뿌덕
                </motion.div>
            </div>

            {/* 2. 3D Scene Backdrop (Simplified) */}
            <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                <KitschScene />
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
                            x: { type: "spring", stiffness: 200, damping: 25 },
                            opacity: { duration: 0.2 },
                            rotate: { duration: 0.4 }
                        }}
                        className="absolute inset-0 flex flex-col justify-center items-center w-full h-full p-4 perspective-1000"
                    >
                        {currentSlide === 0 && <BrandSlideX springX={springX} springY={springY} />}
                        {currentSlide === 1 && <ProgramSlideX />}
                    </motion.div>
                </AnimatePresence>

                {/* --- Controls --- */}
                <div className="absolute bottom-6 md:bottom-12 z-50 flex items-center gap-3 md:gap-8">
                    <button onClick={prevSlide} className="group">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-2 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[3px_3px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-[#F472B6] group-hover:text-white">
                            <ArrowLeft className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>

                    {/* Pagination Indicators */}
                    <div className="flex gap-2 md:gap-4 bg-white px-4 py-2 md:px-6 md:py-3 rounded-full border-2 md:border-4 border-slate-900 shadow-[2px_2px_0px_#000] md:shadow-[4px_4px_0px_#000]">
                        {SLIDES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setDirection(index > currentSlide ? 1 : -1)
                                    setCurrentSlide(index)
                                }}
                                className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all border-2 border-slate-900 ${index === currentSlide ? "bg-[#F472B6] scale-125" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            />
                        ))}
                    </div>

                    <button onClick={nextSlide} className="group">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-2 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[3px_3px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-[#F472B6] group-hover:text-white">
                            <ArrowRight className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>
                </div>
            </div>

            {/* 쿠폰 로켓 미니게임 */}
            <CouponRocketGame />
        </section>
    )
}

// --- SLIDE 1: BRAND INTRO (Kinetic) ---
function BrandSlideX({ springX, springY }: any) {
    return (
        <div className="relative w-full max-w-7xl h-full flex flex-col justify-center items-center pointer-events-none px-4">

            {/* Floating Stickers (Parallax) - 모바일에서 숨김 또는 축소 */}
            <motion.div
                style={{ x: useTransform(springX, [-0.5, 0.5], [-50, 50]), y: useTransform(springY, [-0.5, 0.5], [-50, 50]) }}
                className="absolute top-[15%] left-2 md:top-1/4 md:left-32 z-20 pointer-events-auto hidden md:block"
            >
                <StickerStar className="w-16 h-16 md:w-24 md:h-24" />
            </motion.div>
            <motion.div
                style={{ x: useTransform(springX, [-0.5, 0.5], [-80, 80]), y: useTransform(springY, [-0.5, 0.5], [-20, 20]) }}
                className="absolute top-[20%] right-4 md:top-1/3 md:right-20 z-10 opacity-80 rotate-12 pointer-events-auto hidden md:block"
            >
                <StickerPerfume className="w-20 h-20 md:w-32 md:h-32" />
            </motion.div>

            {/* Main Content */}
            <div className="relative z-30 text-center w-full max-w-[90vw] md:max-w-none">
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="inline-block bg-[#F472B6] text-white text-sm md:text-lg font-black px-4 md:px-6 py-1.5 md:py-2 rounded-full border-2 md:border-4 border-slate-900 shadow-[2px_2px_0px_#000] md:shadow-[4px_4px_0px_#000] rotate-[-2deg] mb-4 md:mb-8"
                >
                    ✨ NO.1 AI 향수 큐레이션
                </motion.div>

                <h1 className="text-[7.5vw] sm:text-[6vw] md:text-[4rem] font-black text-slate-900 leading-[1.3] tracking-tight drop-shadow-sm mb-2 md:mb-4">
                    <span className="block">나만의 향기를 찾아주는</span>
                    <span className="block text-[#F59E0B] relative">
                        가장 유쾌한 브랜드
                        {/* Underline Scribble */}
                        <svg className="absolute w-[100%] left-0 -bottom-1 md:-bottom-2 h-3 md:h-6 text-[#D97706] opacity-80" viewBox="0 0 200 20" preserveAspectRatio="none">
                            <path d="M0 10 Q 50 20 100 10 T 200 10" fill="none" stroke="currentColor" strokeWidth="3" />
                        </svg>
                    </span>
                </h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 md:mt-8 text-xl md:text-5xl font-black text-slate-900 tracking-wider"
                >
                    AC'SCENT IDENTITY
                </motion.p>
            </div>
        </div>
    )
}

// --- SLIDE 2: PROGRAMS (Game Cartridges) ---
function ProgramSlideX() {
    return (
        <div className="w-full max-w-6xl flex flex-col items-center px-2 md:px-4 pt-12 md:pt-0">
            <h2 className="text-xl sm:text-3xl md:text-6xl font-black text-slate-900 mb-4 md:mb-12 relative inline-block text-center break-keep">
                원하는 테마를 선택하세요
                <StickerStar className="absolute -top-6 -right-6 md:-top-10 md:-right-12 w-10 h-10 md:w-20 md:h-20 hidden sm:block" />
            </h2>

            {/* 모바일: 3개 카트리지를 한 줄에 (래퍼로 크기 제어) / 데스크톱: 기존 레이아웃 */}
            <div className="w-full flex justify-center">
                <div className="flex flex-row items-center md:items-end justify-center gap-0 md:gap-8">
                    {/* 래퍼로 실제 레이아웃 크기 제어 - 모바일 크기 증가 */}
                    <Link href="/programs/idol-image" className="w-[115px] h-[150px] sm:w-[170px] sm:h-[220px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div whileHover={{ y: -20 }} className="relative">
                            <StickerCartridge
                                title="최애 향수"
                                subtitle="AI 이미지 분석"
                                color="bg-[#C084FC]" // Purple
                                className="scale-[0.5] sm:scale-[0.7] md:scale-100 origin-center -rotate-6 md:translate-y-4"
                            />
                        </motion.div>
                    </Link>

                    <Link href="/programs/figure" className="w-[130px] h-[170px] sm:w-[185px] sm:h-[240px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div whileHover={{ y: -30 }} className="relative">
                            <StickerCartridge
                                title="피규어"
                                subtitle="디퓨저"
                                color="bg-[#F87171]" // Red
                                className="scale-[0.55] sm:scale-[0.75] md:scale-110 origin-center"
                            />
                        </motion.div>
                    </Link>

                    <Link href="/programs/personal" className="w-[115px] h-[150px] sm:w-[170px] sm:h-[220px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div whileHover={{ y: -20 }} className="relative">
                            <StickerCartridge
                                title="데일리"
                                subtitle="나만의 시그니처"
                                color="bg-[#4ADE80]" // Green
                                className="scale-[0.5] sm:scale-[0.7] md:scale-100 origin-center rotate-6 md:translate-y-4"
                            />
                        </motion.div>
                    </Link>
                </div>
            </div>

        </div>
    )
}
