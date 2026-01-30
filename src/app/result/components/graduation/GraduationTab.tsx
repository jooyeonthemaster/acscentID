"use client"

import { motion } from "framer-motion"
import type { GraduationAnalysisResult } from "@/types/analysis"
import { TimeJourneyCard } from "./TimeJourneyCard"
import { GraduationMessageCard } from "./GraduationMessageCard"
import { GraduationScentAnalysis } from "./GraduationScentAnalysis"

interface GraduationTabProps {
    displayedAnalysis: GraduationAnalysisResult
    userName?: string
    isDesktop?: boolean
}

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" as const }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.3, ease: "easeIn" as const }
    }
}

export function GraduationTab({ displayedAnalysis, userName, isDesktop = false }: GraduationTabProps) {
    return (
        <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`space-y-8 ${isDesktop ? 'lg:space-y-10' : ''}`}
        >
            {/* 졸업 축하 메시지 */}
            <section>
                <GraduationMessageCard
                    displayedAnalysis={displayedAnalysis}
                    userName={userName}
                    isDesktop={isDesktop}
                />
            </section>

            {/* 시간 여정 카드 (과거-현재-미래 타임라인) */}
            <section>
                <TimeJourneyCard
                    displayedAnalysis={displayedAnalysis}
                    isDesktop={isDesktop}
                />
            </section>

            {/* 향기 분석 상세 */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 border-2 border-slate-900 shadow-[2px_2px_0px_#000] flex items-center justify-center">
                        <span className="text-xl">🔬</span>
                    </div>
                    <h2 className={`font-black text-slate-900 ${isDesktop ? 'text-xl' : 'text-lg'}`}>
                        AI 향기 분석 결과
                    </h2>
                </div>
                <GraduationScentAnalysis
                    displayedAnalysis={displayedAnalysis}
                    isDesktop={isDesktop}
                />
            </section>
        </motion.div>
    )
}
