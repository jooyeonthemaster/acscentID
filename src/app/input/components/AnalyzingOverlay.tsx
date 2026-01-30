"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// 향기 관련 재미있는 멘트들
const SCENT_QUOTES = [
    "당신의 최애, 향기까지 완벽하시군요...",
    "향기란, 보이지 않는 영혼의 옷이다.",
    "이 향기 맡으면 심장이 뛰어요... 두근두근",
    "좋은 향기는 기억 속에 영원히 남는다.",
    "당신의 덕력이 향기가 됩니다...",
    "향기는 시간을 초월하는 사랑의 언어다.",
    "이 향기, 심쿵 주의보입니다...",
    "사랑하는 마음을 향기에 담는 중...",
    "향수는 보이지 않는 포옹이다.",
    "당신의 덕심, 향기로 증명합니다!",
    "향기는 추억의 가장 강력한 트리거다.",
    "당신의 최애를 위한 세상에 하나뿐인 향기...",
    "좋은 향기는 자기 소개서보다 강하다.",
    "향기는 기억의 문을 여는 열쇠다.",
]

interface AnalyzingOverlayProps {
    isVisible: boolean
    userName: string
    isComplete?: boolean
    onDoorOpened?: () => void
}

export function AnalyzingOverlay({ isVisible, userName, isComplete = false, onDoorOpened }: AnalyzingOverlayProps) {
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
    const [doorState, setDoorState] = useState<'closed' | 'opening'>('closed')

    // 랜덤한 순서로 멘트를 보여주기 위해 셔플
    const [shuffledQuotes] = useState(() => {
        const shuffled = [...SCENT_QUOTES]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    })

    // 멘트 순환 (부드럽게)
    useEffect(() => {
        if (!isVisible || isComplete) return

        const interval = setInterval(() => {
            setCurrentQuoteIndex(prev => (prev + 1) % shuffledQuotes.length)
        }, 3500)

        return () => clearInterval(interval)
    }, [isVisible, isComplete, shuffledQuotes.length])

    // 분석 완료 시 문 열기
    useEffect(() => {
        if (isComplete && doorState === 'closed') {
            setDoorState('opening')
        }
    }, [isComplete, doorState])

    // 문이 열리면 콜백 호출
    const handleDoorAnimationComplete = () => {
        if (doorState === 'opening' && onDoorOpened) {
            onDoorOpened()
        }
    }

    const currentQuote = shuffledQuotes[currentQuoteIndex]

    // 문 위치 계산
    const doorPosition = doorState === 'opening' ? { left: "-100%", right: "100%" } : { left: "0%", right: "0%" }

    if (!isVisible) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center"
        >
            {/* 뒤가 안 보이게 불투명 배경 & 글래스모피즘 */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-xl z-10" />

            {/* 문 배경 */}
            <div className="absolute inset-0 flex">
                {/* 문 디자인 (기존 SVG 유지) */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {/* 왼쪽 문 */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: doorPosition.left }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        onAnimationComplete={handleDoorAnimationComplete}
                        className="w-1/2 h-full bg-amber-400 border-r-4 border-amber-600 relative flex items-center justify-end"
                    >
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <defs>
                                <pattern id="wood-pattern-analyze" width="100" height="100" patternUnits="userSpaceOnUse">
                                    <path d="M0 0h100v100H0z" fill="#fbbf24" />
                                    <path d="M0 20h100M0 40h100M0 60h100M0 80h100" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.3" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#wood-pattern-analyze)" />
                            <rect x="20" y="20" width="calc(100% - 40px)" height="calc(30% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                            <rect x="20" y="32%" width="calc(100% - 40px)" height="calc(70% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                        </svg>
                        <div className="relative z-10 mr-4 w-4 h-16 bg-amber-700 rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-2 h-12 bg-amber-600 rounded-full" />
                        </div>
                    </motion.div>

                    {/* 오른쪽 문 */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: doorPosition.right }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-1/2 h-full bg-amber-400 border-l-4 border-amber-600 relative flex items-center justify-start"
                    >
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <rect width="100%" height="100%" fill="url(#wood-pattern-analyze)" />
                            <rect x="20" y="20" width="calc(100% - 40px)" height="calc(30% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                            <rect x="20" y="32%" width="calc(100% - 40px)" height="calc(70% - 40px)" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                        </svg>
                        <div className="relative z-10 ml-4 w-4 h-16 bg-amber-700 rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-2 h-12 bg-amber-600 rounded-full" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* 로딩 콘텐츠 - 상하 분산 배치 (손잡이 피하기) */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-between pt-[18vh] pb-[12vh]">
                {/* 상단 섹션: 타이틀 및 프로그레스 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                        opacity: doorState === 'opening' ? 0 : 1,
                        y: doorState === 'opening' ? -40 : 0
                    }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-sm px-8 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <p className="text-2xl md:text-3xl font-black text-amber-950 mb-1 drop-shadow-md">
                            <span className="text-amber-800">{userName}</span>님의
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-amber-950 drop-shadow-md">
                            퍼퓸 분석 중...
                        </p>
                    </motion.div>

                    {/* 로딩 바 - 프리미엄 글래스 스타일 */}
                    <div className="relative w-64 md:w-80 h-6 bg-white/20 rounded-full overflow-hidden border-2 border-amber-600/30 backdrop-blur-md shadow-inner mx-auto">
                        <motion.div
                            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full shadow-[0_0_15px_rgba(217,119,6,0.4)]"
                            initial={{ width: "0%" }}
                            animate={{ width: isComplete ? "100%" : "90%" }}
                            transition={{ duration: isComplete ? 0.3 : 25, ease: "linear" }}
                        />
                        {/* 진행률 텍스트 인라인 */}
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">
                            {isComplete ? '100%' : 'ANALYZING...'}
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
                    className="w-full max-w-sm px-8"
                >
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl text-center relative overflow-hidden">
                        {/* 미니 장식 요소 */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

                        <div className="min-h-[64px] flex flex-col items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={currentQuoteIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4 }}
                                    className="text-amber-950 text-base md:text-lg font-bold leading-relaxed italic"
                                >
                                    "{currentQuote}"
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mt-6 text-amber-800/80 text-xs font-black uppercase tracking-[0.3em]"
                        >
                            Est. Time: 30 Seconds
                        </motion.p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
