"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"
import { ImageIcon } from "lucide-react"
import { quoteText, quoteWrapClass } from "@/lib/typography"

interface AnalyzingOverlayProps {
    isVisible: boolean
    userName: string
    isComplete?: boolean
    onDoorOpened?: () => void
}

export function AnalyzingOverlay({ isVisible, userName, isComplete = false, onDoorOpened }: AnalyzingOverlayProps) {
    const t = useTranslations()
    const locale = useLocale()
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
    const [doorState, setDoorState] = useState<'closed' | 'opening'>('closed')

    const SCENT_QUOTES = t.raw('input.analyzing.quotes') as string[]

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
            const openTimer = setTimeout(() => setDoorState('opening'), 0)
            return () => clearTimeout(openTimer)
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
            <div className="absolute inset-0 bg-[#0B0E16] z-10" />

            {/* 사진 리포트 봉투처럼 열리는 문 */}
            <div className="absolute inset-0 z-20 flex pointer-events-none overflow-hidden">
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: doorPosition.left }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    onAnimationComplete={handleDoorAnimationComplete}
                    className="relative h-full w-1/2 overflow-hidden border-r border-[var(--line)]"
                >
                    <ImageReportDoorHalf side="left" />
                </motion.div>

                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: doorPosition.right }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-full w-1/2 overflow-hidden border-l border-[var(--line)]"
                >
                    <ImageReportDoorHalf side="right" />
                </motion.div>
            </div>

            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                        opacity: doorState === 'opening' ? 0 : 1,
                        y: doorState === 'opening' ? -40 : 0
                    }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[360px]"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)] shadow-[0_30px_70px_-20px_rgba(11,14,22,0.7)]"
                    >
                        <div className="bg-[var(--paper)] px-6 py-5 text-center">
                            <Image
                                src="/images/logo/acscent-wordmark-cream.png"
                                alt="AC'SCENT"
                                width={2053}
                                height={285}
                                priority
                                className="mx-auto h-[18px] w-auto select-none"
                            />
                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#8B8371]">{t('products.idolImage')}</p>
                        </div>

                        <div className="px-6 py-7">
                            <div className="mb-6 flex justify-center">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--soft)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-ink)]">
                                    <ImageIcon size={12} strokeWidth={2} className="text-[#9A8B5E]" />
                                    {t('footer.aiImageAnalysis')}
                                </span>
                            </div>

                            <div className="mb-7 text-center">
                                <p className="font-heading text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[var(--ink)]">
                                    {t('input.analyzing.userName', { name: userName })}
                                </p>
                                <p className="mt-0.5 font-heading text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[var(--ink)]">
                                    {t('input.analyzing.perfumeAnalyzing')}
                                </p>
                            </div>

                            <div className="mb-6 overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-5 py-6">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={currentQuoteIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4 }}
                                        className={`min-h-[52px] text-center text-sm lg:text-[15px] font-normal italic leading-relaxed text-[var(--muted-ink)] ${quoteWrapClass(locale)}`}
                                    >
                                        &ldquo;{quoteText(currentQuote)}&rdquo;
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--paper)]/10">
                                <motion.div
                                    className="h-full rounded-full bg-[var(--paper)]"
                                    initial={{ width: "0%" }}
                                    animate={{ width: isComplete ? "100%" : "90%" }}
                                    transition={{ duration: isComplete ? 0.3 : 25, ease: "linear" }}
                                />
                            </div>
                            <p className="mt-3 text-right text-[10px] font-medium uppercase tracking-[0.22em] text-[#8B8371]">
                                {isComplete ? '100%' : 'Analyzing'}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    )
}

function ImageReportDoorHalf({ side }: { side: 'left' | 'right' }) {
    const isLeft = side === 'left'
    const lineClassName = isLeft ? 'left-10' : 'right-10'
    const spineClassName = isLeft ? 'right-0' : 'left-0'

    return (
        <>
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(160deg, #FBF7EF 0%, #ECE3D0 100%)' }}
            />
            <div className="absolute left-1/2 top-[15%] flex -translate-x-1/2 flex-col items-center gap-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)]/70">
                    <ImageIcon size={20} strokeWidth={1.6} className="text-[#9A8B5E]" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#9A9179]">Photo</span>
            </div>
            {[34, 50, 66, 82].map((top) => (
                <div
                    key={top}
                    className={`absolute h-px w-16 bg-[var(--ink)]/10 ${lineClassName}`}
                    style={{ top: `${top}%` }}
                />
            ))}
            <div className={`absolute inset-y-0 w-px bg-[var(--line)] ${spineClassName}`} />
        </>
    )
}
