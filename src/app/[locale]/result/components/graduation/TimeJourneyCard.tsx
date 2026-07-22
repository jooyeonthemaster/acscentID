"use client"

import { motion } from "framer-motion"
import type { GraduationAnalysisResult } from "@/types/analysis"

interface TimeJourneyCardProps {
    displayedAnalysis: GraduationAnalysisResult
    isDesktop?: boolean
}

export function TimeJourneyCard({ displayedAnalysis, isDesktop = false }: TimeJourneyCardProps) {
    const { graduationAnalysis, timeJourney } = displayedAnalysis

    if (!graduationAnalysis || !timeJourney) {
        return null
    }

    const timelineItems = [
        {
            icon: "🕰️",
            label: "학창 시절",
            note: "탑노트",
            color: "from-[var(--soft)] to-[var(--soft)]",
            borderColor: "border-[var(--line)]",
            textColor: "text-[var(--muted-ink)]",
            data: graduationAnalysis.pastScent
        },
        {
            icon: "🎓",
            label: "졸업하는 지금",
            note: "미들노트",
            color: "from-[var(--soft)] to-[var(--soft)]",
            borderColor: "border-[var(--line)]",
            textColor: "text-[var(--muted-ink)]",
            data: graduationAnalysis.presentScent
        },
        {
            icon: "🚀",
            label: "빛나는 미래",
            note: "베이스노트",
            color: "from-[var(--soft)] to-[var(--soft)]",
            borderColor: "border-[var(--line)]",
            textColor: "text-[var(--muted-ink)]",
            data: graduationAnalysis.futureScent
        }
    ]

    return (
        <div className={`space-y-6 ${isDesktop ? 'lg:space-y-8' : ''}`}>
            {/* 스토리 타이틀 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--soft)] via-[var(--soft)] to-[var(--soft)] rounded-full border border-[var(--line)] mb-4">
                    <span className="text-lg">✨</span>
                    <span className="text-sm lg:text-base font-black text-[var(--ink)]">시간을 담은 향수 스토리</span>
                    <span className="text-lg">✨</span>
                </div>
                <h2 className={`font-black text-[var(--ink)] leading-tight ${isDesktop ? 'text-2xl' : 'text-xl'}`}>
                    {timeJourney.storyTitle}
                </h2>
            </motion.div>

            {/* 타임라인 */}
            <div className="relative">
                {/* 연결선 */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[var(--line)] via-[var(--line)] to-[var(--line)] hidden md:block" />

                <div className={`space-y-4 ${isDesktop ? 'lg:space-y-6' : ''}`}>
                    {timelineItems.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className={`relative bg-gradient-to-br ${item.color} rounded-[6px] border border-[var(--line)] p-4 ${isDesktop ? 'lg:p-5' : ''}`}
                        >
                            {/* 헤더 */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-[6px] border-2 ${item.borderColor} bg-[var(--soft)] flex items-center justify-center flex-shrink-0`}>
                                    <span className="text-2xl">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                                        {item.label}
                                    </h3>
                                    <span className={`text-xs lg:text-sm font-bold ${item.textColor} bg-[var(--soft)] px-2 py-0.5 rounded-full border ${item.borderColor}`}>
                                        {item.note}
                                    </span>
                                </div>
                            </div>

                            {/* 설명 */}
                            <p className={`text-[var(--muted-ink)] leading-relaxed mb-3 ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                {item.data.description}
                            </p>

                            {/* 키워드 */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {item.data.keywords.map((keyword, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-3 py-1 rounded-full text-xs lg:text-sm font-bold border ${item.borderColor} ${item.textColor} bg-[var(--soft)]`}
                                    >
                                        #{keyword}
                                    </span>
                                ))}
                            </div>

                            {/* 노트 연결 설명 */}
                            <div className={`bg-[var(--soft)]/70 rounded-[6px] p-3 border ${item.borderColor}`}>
                                <p className={`${item.textColor} font-medium ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>
                                    💫 {item.data.noteConnection}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 전체 스토리 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)] p-5"
            >
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📖</span>
                    <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                        나의 졸업 향수 이야기
                    </h3>
                </div>
                <p className={`text-[var(--muted-ink)] leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                    {timeJourney.storyNarrative}
                </p>
            </motion.div>
        </div>
    )
}
