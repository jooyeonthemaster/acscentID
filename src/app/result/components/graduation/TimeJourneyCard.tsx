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
            color: "from-amber-100 to-yellow-100",
            borderColor: "border-amber-400",
            textColor: "text-amber-700",
            data: graduationAnalysis.pastScent
        },
        {
            icon: "🎓",
            label: "졸업하는 지금",
            note: "미들노트",
            color: "from-blue-100 to-indigo-100",
            borderColor: "border-blue-400",
            textColor: "text-blue-700",
            data: graduationAnalysis.presentScent
        },
        {
            icon: "🚀",
            label: "빛나는 미래",
            note: "베이스노트",
            color: "from-purple-100 to-pink-100",
            borderColor: "border-purple-400",
            textColor: "text-purple-700",
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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 via-blue-100 to-purple-100 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#000] mb-4">
                    <span className="text-lg">✨</span>
                    <span className="text-sm font-black text-slate-900">시간을 담은 향수 스토리</span>
                    <span className="text-lg">✨</span>
                </div>
                <h2 className={`font-black text-slate-900 leading-tight ${isDesktop ? 'text-2xl' : 'text-xl'}`}>
                    {timeJourney.storyTitle}
                </h2>
            </motion.div>

            {/* 타임라인 */}
            <div className="relative">
                {/* 연결선 */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-amber-300 via-blue-300 to-purple-300 hidden md:block" />

                <div className={`space-y-4 ${isDesktop ? 'lg:space-y-6' : ''}`}>
                    {timelineItems.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className={`relative bg-gradient-to-br ${item.color} rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#000] p-4 ${isDesktop ? 'lg:p-5' : ''}`}
                        >
                            {/* 헤더 */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-xl border-2 ${item.borderColor} bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] flex-shrink-0`}>
                                    <span className="text-2xl">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className={`font-black text-slate-900 ${isDesktop ? 'text-lg' : 'text-base'}`}>
                                        {item.label}
                                    </h3>
                                    <span className={`text-xs font-bold ${item.textColor} bg-white px-2 py-0.5 rounded-full border ${item.borderColor}`}>
                                        {item.note}
                                    </span>
                                </div>
                            </div>

                            {/* 설명 */}
                            <p className={`text-slate-700 leading-relaxed mb-3 ${isDesktop ? 'text-base' : 'text-sm'}`}>
                                {item.data.description}
                            </p>

                            {/* 키워드 */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {item.data.keywords.map((keyword, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${item.borderColor} ${item.textColor} bg-white`}
                                    >
                                        #{keyword}
                                    </span>
                                ))}
                            </div>

                            {/* 노트 연결 설명 */}
                            <div className={`bg-white/70 rounded-xl p-3 border ${item.borderColor}`}>
                                <p className={`${item.textColor} font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
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
                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#000] p-5"
            >
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📖</span>
                    <h3 className={`font-black text-slate-900 ${isDesktop ? 'text-lg' : 'text-base'}`}>
                        나의 졸업 향수 이야기
                    </h3>
                </div>
                <p className={`text-slate-700 leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm'}`}>
                    {timeJourney.storyNarrative}
                </p>
            </motion.div>
        </div>
    )
}
