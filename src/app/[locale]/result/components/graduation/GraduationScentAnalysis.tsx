"use client"

import { motion } from "framer-motion"
import type { GraduationAnalysisResult } from "@/types/analysis"

interface GraduationScentAnalysisProps {
    displayedAnalysis: GraduationAnalysisResult
    isDesktop?: boolean
}

export function GraduationScentAnalysis({ displayedAnalysis, isDesktop = false }: GraduationScentAnalysisProps) {
    const { comparisonAnalysis, analysis } = displayedAnalysis

    if (!comparisonAnalysis) {
        return null
    }

    // reflectionDetails를 섹션별로 파싱
    const parseReflectionDetails = (text: string) => {
        const sections: { title: string; icon: string; content: string }[] = []
        const sectionPatterns = [
            { pattern: /【학창 시절의 향기 🕰️】/g, title: "학창 시절의 향기", icon: "🕰️" },
            { pattern: /【졸업하는 지금의 향기 🎓】/g, title: "졸업하는 지금의 향기", icon: "🎓" },
            { pattern: /【미래의 향기 🚀】/g, title: "미래의 향기", icon: "🚀" },
            { pattern: /【시간을 담은 향수 ✨】/g, title: "시간을 담은 향수", icon: "✨" }
        ]

        // 줄바꿈 처리
        const cleanedText = text.replace(/\\n/g, '\n')
        const parts = cleanedText.split(/【/)

        parts.forEach((part, index) => {
            if (index === 0 && !part.includes('】')) return // 첫 번째 빈 부분 스킵

            for (const { title, icon } of sectionPatterns) {
                if (part.startsWith(title.replace('【', ''))) {
                    const content = part.replace(/.*】/, '').trim()
                    if (content) {
                        sections.push({ title, icon, content })
                    }
                    break
                }
            }
        })

        // 파싱 실패 시 전체 텍스트를 하나의 섹션으로
        if (sections.length === 0) {
            sections.push({
                title: "향기 분석",
                icon: "🌸",
                content: cleanedText
            })
        }

        return sections
    }

    const reflectionSections = comparisonAnalysis.reflectionDetails
        ? parseReflectionDetails(comparisonAnalysis.reflectionDetails)
        : []

    return (
        <div className={`space-y-5 ${isDesktop ? 'lg:space-y-6' : ''}`}>
            {/* 이미지 해석 */}
            {comparisonAnalysis.imageInterpretation && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)] p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                            <span className="text-xl">📸</span>
                        </div>
                        <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                            AI가 본 당신의 모습
                        </h3>
                    </div>
                    <p className={`text-[var(--muted-ink)] leading-relaxed ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                        {comparisonAnalysis.imageInterpretation}
                    </p>
                </motion.div>
            )}

            {/* 입력 정보 요약 */}
            {comparisonAnalysis.userInputSummary && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)] p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                            <span className="text-xl">✏️</span>
                        </div>
                        <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                            당신이 말해준 이야기
                        </h3>
                    </div>
                    <p className={`text-[var(--muted-ink)] leading-relaxed ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                        {comparisonAnalysis.userInputSummary}
                    </p>
                </motion.div>
            )}

            {/* 종합 분석 섹션 */}
            {reflectionSections.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🔍</span>
                        <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                            시간별 향기 종합 분석
                        </h3>
                    </div>

                    {reflectionSections.map((section, index) => {
                        // 시간대별 색상 매핑
                        const colorMap: Record<string, { bg: string; border: string }> = {
                            "학창 시절의 향기": { bg: "from-[var(--soft)] to-[var(--soft)]", border: "border-[var(--line)]" },
                            "졸업하는 지금의 향기": { bg: "from-[var(--soft)] to-[var(--soft)]", border: "border-[var(--line)]" },
                            "미래의 향기": { bg: "from-[var(--soft)] to-[var(--soft)]", border: "border-[var(--line)]" },
                            "시간을 담은 향수": { bg: "from-[var(--soft)] to-[var(--soft)]", border: "border-[var(--line)]" }
                        }
                        const colors = colorMap[section.title] || { bg: "from-[var(--soft)] to-[var(--soft)]", border: "border-[var(--line)]" }

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className={`bg-gradient-to-br ${colors.bg} rounded-[6px] border-2 ${colors.border} p-4`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{section.icon}</span>
                                    <h4 className={`font-bold text-[var(--ink)] ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                        {section.title}
                                    </h4>
                                </div>
                                <p className={`text-[var(--muted-ink)] leading-relaxed whitespace-pre-line ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>
                                    {section.content}
                                </p>
                            </motion.div>
                        )
                    })}
                </motion.div>
            )}

            {/* 분석 summary */}
            {analysis && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[var(--soft)] rounded-[6px] border border-[var(--line)] p-4"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">💫</span>
                        <h3 className={`font-black text-[var(--ink)] ${isDesktop ? 'text-lg' : 'text-base'}`}>
                            분석 요약
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.mood && (
                            <div className="bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span>🌈</span>
                                    <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">분위기</span>
                                </div>
                                <p className={`text-[var(--muted-ink)] ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>{analysis.mood}</p>
                            </div>
                        )}
                        {analysis.style && (
                            <div className="bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span>✨</span>
                                    <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">스타일</span>
                                </div>
                                <p className={`text-[var(--muted-ink)] ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>{analysis.style}</p>
                            </div>
                        )}
                        {analysis.expression && (
                            <div className="bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span>💎</span>
                                    <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">표현</span>
                                </div>
                                <p className={`text-[var(--muted-ink)] ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>{analysis.expression}</p>
                            </div>
                        )}
                        {analysis.concept && (
                            <div className="bg-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span>🎯</span>
                                    <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">콘셉트</span>
                                </div>
                                <p className={`text-[var(--muted-ink)] ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>{analysis.concept}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
