"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

// 향기 관련 재미있는 멘트들
const SCENT_QUOTES = [
    { text: "당신의 최애, 향기까지 완벽하시군요... 💕", type: "주접" },
    { text: "향기란, 보이지 않는 영혼의 옷이다.", type: "명언" },
    { text: "이 향기 맡으면 심장이 뛰어요... 두근두근", type: "주접" },
    { text: "좋은 향기는 기억 속에 영원히 남는다.", type: "명언" },
    { text: "최애 옆자리 향수 아니고요, 최애 향수입니다!", type: "드립" },
    { text: "당신의 덕력이 향기가 됩니다... ✨", type: "주접" },
    { text: "향기는 시간을 초월하는 사랑의 언어다.", type: "명언" },
    { text: "덕질하다 보니 향수까지 만들었네요 ㅋㅋㅋ", type: "드립" },
    { text: "이 향기, 심쿵 주의보입니다... 💘", type: "주접" },
    { text: "사랑하는 마음을 향기에 담는 중...", type: "주접" },
    { text: "향수는 보이지 않는 포옹이다.", type: "명언" },
    { text: "최애한테서 이런 향기 났으면... (현실도피)", type: "드립" },
    { text: "당신의 덕심, 향기로 증명합니다!", type: "주접" },
    { text: "향기는 추억의 가장 강력한 트리거다.", type: "명언" },
    { text: "이 향 뿌리면 최애가 저한테... (망상 중)", type: "드립" },
    { text: "당신의 최애를 위한 세상에 하나뿐인 향기...", type: "주접" },
    { text: "좋은 향기는 자기 소개서보다 강하다.", type: "명언" },
    { text: "향수 뿌리면 덕력 +10 상승 (확정)", type: "드립" },
    { text: "이미지에서 향기가 느껴져요... 어떻게 그게 가능하죠?", type: "주접" },
    { text: "향기는 기억의 문을 여는 열쇠다.", type: "명언" },
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
            {/* 뒤가 안 보이게 불투명 배경 */}
            <div className="absolute inset-0 bg-[#FFFDF5]" />

            {/* 문 배경 */}
            <div className="absolute inset-0 flex">
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

            {/* 뿌덕 캐릭터 + 말풍선 (문 위에 표시) - 문 열릴 때 페이드아웃 */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{
                    opacity: doorState === 'opening' ? 0 : 1,
                    y: doorState === 'opening' ? -30 : 0
                }}
                transition={{ duration: 0.4 }}
                className="relative z-10 flex flex-col items-center"
            >
                {/* 말풍선 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative mb-4 max-w-[320px] mx-4"
                >
                    <div className="bg-white rounded-3xl px-6 py-5 shadow-2xl border-2 border-black relative">
                        {/* 말풍선 꼬리 */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-2 border-b-2 border-black rotate-45" />

                        {/* 분석 중 상태 */}
                        <div className="text-center mb-3">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="inline-block text-2xl mb-2"
                            >
                                🌸
                            </motion.div>
                            <p className="font-bold text-slate-800 text-sm">
                                <span className="text-amber-500">{userName}</span>님의 향수 분석 중...
                            </p>
                        </div>

                        {/* 로딩 바 */}
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: isComplete ? "100%" : "90%" }}
                                transition={{ duration: isComplete ? 0.3 : 25, ease: "linear" }}
                            />
                        </div>

                        {/* 재미있는 멘트 - 부드러운 전환 */}
                        <div className="text-center min-h-[40px] flex flex-col items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={currentQuoteIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-slate-700 text-sm leading-relaxed break-keep"
                                >
                                    "{currentQuote.text}"
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* 뿌덕 캐릭터 */}
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                >
                    <Image
                        src="/images/hero/ppuduck_fullbody_v2.png"
                        alt="뿌덕"
                        width={200}
                        height={200}
                        className="drop-shadow-2xl"
                        priority
                    />
                    {/* 반짝이 이펙트 */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute -top-2 -right-2 text-2xl"
                    >
                        ✨
                    </motion.div>
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
                        className="absolute top-4 -left-4 text-xl"
                    >
                        💫
                    </motion.div>
                </motion.div>

                {/* 하단 안내 문구 */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-amber-900/70 text-sm font-medium"
                >
                    최대 30초 정도 소요됩니다 🕐
                </motion.p>
            </motion.div>
        </motion.div>
    )
}
