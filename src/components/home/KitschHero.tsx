"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { StickerCartridge, StickerStar } from "./Stickers"

// --- Slide Data (2개: Brand + Programs) ---
const SLIDES = [
    { id: "brand", bg: "bg-[#FEFCE2]" },
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
        <section data-hero-section className="fixed top-0 left-0 w-full h-[100vh] z-0 overflow-hidden bg-[#FEFCE2] flex flex-col font-sans selection:bg-yellow-200 selection:text-yellow-900 border-b-4 border-slate-900">

            {/* --- Background Image Layer --- */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                {/* Desktop background - 16:9 ratio, centered and scaled to fit */}
                <div className="hidden md:block relative w-full h-full">
                    <Image
                        src="/images/hero/hf_20260126_101725_e5d21415-948c-4a81-a5f5-5959169a43d4.avif"
                        alt="Forest Background"
                        fill
                        className="object-contain"
                        style={{ objectPosition: 'center center' }}
                        priority
                    />
                </div>
                {/* Mobile background */}
                <Image
                    src="/images/hero/mhero.svg"
                    alt="Mobile Hero Background"
                    fill
                    className="object-cover md:hidden"
                    priority
                />
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
                        {currentSlide === 0 && <BrandSlideX goToSlide={goToSlide} />}
                        {currentSlide === 1 && <ProgramSlideX />}
                    </motion.div>
                </AnimatePresence>

                {/* --- Controls --- */}
                <div className="flex absolute bottom-24 md:bottom-12 z-50 items-center gap-4 md:gap-8">
                    <button onClick={prevSlide} className="group">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-3 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-yellow-400">
                            <ArrowLeft className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>

                    {/* Pagination Indicators */}
                    <div className="flex gap-3 md:gap-4 bg-white px-4 py-2 md:px-6 md:py-3 rounded-full border-3 md:border-4 border-slate-900 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]">
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
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-3 md:border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group-hover:bg-yellow-400">
                            <ArrowRight className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                    </button>
                </div>
            </div>

        </section>
    )
}

// --- SLIDE 1: BRAND INTRO (Kinetic) ---
function BrandSlideX({ goToSlide }: { goToSlide: (index: number) => void }) {
    return (
        <>
            {/* === MOBILE LAYOUT === */}
            <div className="md:hidden relative w-full h-full flex flex-col px-4 pt-14 pb-20">
                    {/* Middle: Title Image */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 flex items-start justify-center w-full mt-28"
                >
                    <Image
                        src="/images/hero/title.png"
                        alt="악센트 아이디 - 나만의 향을 찾아주는 가장 유쾌한 브랜드"
                        width={400}
                        height={300}
                        className="w-[85vw] max-w-[400px] h-auto object-contain"
                        priority
                    />
                </motion.div>

                {/* Bottom: CTA Buttons - Image Buttons (Horizontal) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-row justify-center gap-3 pointer-events-auto mt-auto mb-24 px-4 w-full"
                >
                    <button
                        onClick={() => goToSlide(1)}
                        className="active:scale-95 transition-transform"
                    >
                        <Image
                            src="/images/hero/4.png"
                            alt="프로그램 둘러보기"
                            width={200}
                            height={60}
                            className="h-auto w-[42vw] max-w-[200px]"
                        />
                    </button>
                    <a
                        href="https://map.naver.com/p/entry/place/1274492663?placePath=/home?entry=plt&from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601242226&locale=ko&svcName=map_pcv5&searchType=place&lng=126.9267345&lat=37.5549328&c=15.00,0,0,0,dh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="active:scale-95 transition-transform"
                    >
                        <Image
                            src="/images/hero/5.png"
                            alt="현장방문 예약하기"
                            width={200}
                            height={60}
                            className="h-auto w-[42vw] max-w-[200px]"
                        />
                    </a>
                </motion.div>
            </div>

            {/* === DESKTOP LAYOUT === */}
            <div className="hidden md:flex relative w-full max-w-7xl h-full flex-row items-end justify-start pointer-events-none px-4 pb-32">
                {/* CTA Buttons Only - Title is in background image */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-row gap-4 pointer-events-auto ml-8"
                >
                    <button
                        onClick={() => goToSlide(1)}
                        className="bg-yellow-400 border-4 border-slate-900 px-8 py-4 font-black text-lg text-slate-900 rounded-xl shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                        프로그램 둘러보기
                    </button>
                    <a
                        href="https://map.naver.com/p/entry/place/1274492663?placePath=/home?entry=plt&from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601242226&locale=ko&svcName=map_pcv5&searchType=place&lng=126.9267345&lat=37.5549328&c=15.00,0,0,0,dh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white border-4 border-slate-900 px-8 py-4 font-black text-lg text-slate-900 rounded-xl shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-center"
                    >
                        현장방문 예약하기
                    </a>
                </motion.div>
            </div>
        </>
    )
}

// --- SLIDE 2: PROGRAMS (Game Cartridges) ---
function ProgramSlideX() {
    return (
        <div className="w-full max-w-4xl flex flex-col items-center px-4 md:px-8 pt-12 md:pt-0 relative">
            <h2 className="text-xl sm:text-3xl md:text-6xl font-black text-slate-900 mb-6 md:mb-16 relative inline-block text-center break-keep drop-shadow-sm">
                원하는 테마를 선택하세요
                <StickerStar className="absolute -top-6 -right-6 md:-top-10 md:-right-12 w-10 h-10 md:w-20 md:h-20 hidden sm:block" />
            </h2>

            {/* 2개 카트리지 균형 잡힌 배치 */}
            <div className="w-full flex justify-center">
                <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 md:gap-16">
                    {/* 최애 향수 - 왼쪽 기울임 */}
                    <Link href="/programs/idol-image" className="w-[140px] h-[180px] sm:w-[180px] sm:h-[230px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div whileHover={{ y: -20, rotate: -3 }} className="relative">
                            <StickerCartridge
                                title="최애 향수"
                                subtitle="AI 이미지 분석"
                                color="bg-[#C084FC]"
                                className="scale-[0.55] sm:scale-[0.75] md:scale-105 origin-center -rotate-3"
                            />
                        </motion.div>
                    </Link>

                    {/* 피규어 - 오른쪽 기울임 */}
                    <Link href="/programs/figure" className="w-[140px] h-[180px] sm:w-[180px] sm:h-[230px] md:w-auto md:h-auto flex items-center justify-center">
                        <motion.div whileHover={{ y: -20, rotate: 3 }} className="relative">
                            <StickerCartridge
                                title="피규어"
                                subtitle="디퓨저"
                                color="bg-[#F87171]"
                                className="scale-[0.55] sm:scale-[0.75] md:scale-105 origin-center rotate-3"
                            />
                        </motion.div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
