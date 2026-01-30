"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GRADUATION_ANALYZING_QUOTES, GRADUATION_THEME } from "../constants"

interface GraduationAnalyzingOverlayProps {
    isVisible: boolean
    isComplete: boolean
    onDoorOpened: () => void
}

export function GraduationAnalyzingOverlay({
    isVisible,
    isComplete,
    onDoorOpened
}: GraduationAnalyzingOverlayProps) {
    const [progress, setProgress] = useState(0)
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
    const [doorState, setDoorState] = useState<'closed' | 'opening'>('closed')

    // 프로그레스 바 애니메이션
    useEffect(() => {
        if (!isVisible) return

        const duration = 25000 // 25초
        const interval = 100
        const increment = (90 / (duration / interval))

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(timer)
                    return 90
                }
                return prev + increment
            })
        }, interval)

        return () => clearInterval(timer)
    }, [isVisible])

    // 멘트 순환
    useEffect(() => {
        if (!isVisible) return

        const timer = setInterval(() => {
            setCurrentQuoteIndex(prev =>
                (prev + 1) % GRADUATION_ANALYZING_QUOTES.length
            )
        }, 3500)

        return () => clearInterval(timer)
    }, [isVisible])

    // 분석 완료 시
    useEffect(() => {
        if (isComplete && isVisible) {
            // 프로그레스 100%로
            setProgress(100)

            // 잠시 후 문 열기
            const openTimer = setTimeout(() => {
                setDoorState('opening')
            }, 500)

            return () => clearTimeout(openTimer)
        }
    }, [isComplete, isVisible])

    // 문 열림 완료 시
    const handleDoorOpened = () => {
        if (doorState === 'opening') {
            onDoorOpened()
        }
    }

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden">
            {/* 배경 - 전체 글래스모피즘 적용 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: doorState === 'opening' ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-[#1e3a5f]/40 backdrop-blur-xl z-10"
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: doorState === 'opening' ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/20 via-transparent to-[#1e3a5f]/20 z-10"
            />

            {/* 콘텐츠 - 배경 글래스모피즘과 조화롭게 배치 (z-30) */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-between pt-[20vh] pb-[10vh]">
                {/* 상단 섹션: 타이틀 및 프로그레스 (상단 패널 영역에서 더 아래로) */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                        opacity: doorState === 'opening' ? 0 : 1,
                        y: doorState === 'opening' ? -40 : 0
                    }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[300px] text-center"
                >
                    <motion.h2
                        className="text-white font-bold text-2xl mb-2 tracking-tight drop-shadow-lg"
                    >
                        졸업 기념 퍼퓸 조합 중
                    </motion.h2>
                    <motion.p
                        className="text-white/70 text-[11px] mb-8 uppercase tracking-[0.3em] font-light"
                    >
                        PREMIUM FRAGRANCE ANALYSIS
                    </motion.p>

                    {/* 프로그레스 바 - 글래스모피즘 스타일 */}
                    <div className="relative h-7 bg-white/5 rounded-full border border-white/10 overflow-hidden backdrop-blur-md shadow-inner">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#d4af37] to-[#f8f4e8] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                        {/* 반짝임 효과 */}
                        <motion.div
                            className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: [-120, 320] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                        {/* 진행률 텍스트 */}
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white mix-blend-difference tracking-widest">
                            {Math.round(progress)}%
                        </div>
                    </div>
                </motion.div>

                {/* 하단 섹션: 멘트 카드 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                        opacity: doorState === 'opening' ? 0 : 1,
                        scale: doorState === 'opening' ? 0.9 : 1
                    }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[340px] px-4"
                >
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl text-center relative">
                        {/* 미니멀한 장식 라인 */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-[#d4af37]/40" />

                        <AnimatePresence mode="wait">
                            <motion.p
                                key={currentQuoteIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                className="text-white text-[15px] font-medium leading-relaxed italic"
                            >
                                "{GRADUATION_ANALYZING_QUOTES[currentQuoteIndex]}"
                            </motion.p>
                        </AnimatePresence>

                        {/* 완료 메시지 */}
                        <AnimatePresence>
                            {isComplete && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-6 pt-6 border-t border-white/5"
                                >
                                    <span className="text-[#d4af37] font-black text-[10px] uppercase tracking-[0.4em] block">
                                        ANALYSIS COMPLETE
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* 졸업식 문 애니메이션 */}
            <div className="absolute inset-0 z-20 pointer-events-none flex">
                {/* 왼쪽 문 */}
                <motion.div
                    initial={{ x: "0%" }}
                    animate={{ x: doorState === 'opening' ? "-100%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    onAnimationComplete={handleDoorOpened}
                    className="w-1/2 h-full relative"
                    style={{ backgroundColor: GRADUATION_THEME.primary }}
                >
                    {/* 문 디자인 - 왼쪽 */}
                    <div className="absolute inset-0 border-r-4" style={{ borderColor: GRADUATION_THEME.secondary }}>
                        {/* 장식 패널 */}
                        <div className="absolute top-[10%] left-[15%] right-[15%] h-[25%] rounded-lg border-2" style={{ borderColor: GRADUATION_THEME.secondary, backgroundColor: 'rgba(212, 175, 55, 0.1)' }} />
                        <div className="absolute top-[40%] left-[15%] right-[15%] h-[45%] rounded-lg border-2" style={{ borderColor: GRADUATION_THEME.secondary, backgroundColor: 'rgba(212, 175, 55, 0.1)' }} />
                    </div>
                    {/* 손잡이 */}
                    <div
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-14 rounded-full"
                        style={{ backgroundColor: GRADUATION_THEME.secondary }}
                    />
                    {/* 문구 */}
                    {doorState === 'closed' && (
                        <div
                            className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap font-black text-4xl rotate-90"
                            style={{ color: `${GRADUATION_THEME.secondary}40` }}
                        >
                            GRADUATION
                        </div>
                    )}
                </motion.div>

                {/* 오른쪽 문 */}
                <motion.div
                    initial={{ x: "0%" }}
                    animate={{ x: doorState === 'opening' ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-1/2 h-full relative"
                    style={{ backgroundColor: GRADUATION_THEME.primary }}
                >
                    {/* 문 디자인 - 오른쪽 */}
                    <div className="absolute inset-0 border-l-4" style={{ borderColor: GRADUATION_THEME.secondary }}>
                        {/* 장식 패널 */}
                        <div className="absolute top-[10%] left-[15%] right-[15%] h-[25%] rounded-lg border-2" style={{ borderColor: GRADUATION_THEME.secondary, backgroundColor: 'rgba(212, 175, 55, 0.1)' }} />
                        <div className="absolute top-[40%] left-[15%] right-[15%] h-[45%] rounded-lg border-2" style={{ borderColor: GRADUATION_THEME.secondary, backgroundColor: 'rgba(212, 175, 55, 0.1)' }} />
                    </div>
                    {/* 손잡이 */}
                    <div
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-14 rounded-full"
                        style={{ backgroundColor: GRADUATION_THEME.secondary }}
                    />
                    {/* 문구 */}
                    {doorState === 'closed' && (
                        <div
                            className="absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap font-black text-4xl -rotate-90"
                            style={{ color: `${GRADUATION_THEME.secondary}40` }}
                        >
                            CONGRATULATIONS
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
