"use client"

import { motion } from "framer-motion"
import { StepHeader } from "../../components/StepHeader"
import { GRADUATION_THEME } from "../constants"
import type { GraduationFormDataType } from "@/types/analysis"

// 학창 시절 키워드 (스타일 + 성격 통합)
const PAST_KEYWORDS = [
    { key: "active", label: "활발했던", emoji: "🏃" },
    { key: "quiet", label: "조용했던", emoji: "📖" },
    { key: "diligent", label: "성실했던", emoji: "✏️" },
    { key: "shy", label: "수줍었던", emoji: "🌸" },
    { key: "bright", label: "밝았던", emoji: "☀️" },
    { key: "passionate", label: "열정적이었던", emoji: "🔥" },
    { key: "curious", label: "호기심 많았던", emoji: "🔍" },
    { key: "warm", label: "따뜻했던", emoji: "💕" },
    { key: "artistic", label: "예술적이었던", emoji: "🎨" },
    { key: "athletic", label: "활동적이었던", emoji: "⚽" },
] as const

interface GraduationStep2Props {
    formData: GraduationFormDataType
    togglePastStyle: (style: string) => void
    focusedField: string | null
    setFocusedField: (field: string | null) => void
}

export function GraduationStep2({
    formData,
    togglePastStyle,
}: GraduationStep2Props) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title="학창 시절의 모습"
                step={2}
                description="어떤 학생이었나요? 🕰️"
            />

            <div className="flex-1 mt-4 overflow-y-auto">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>학창 시절을 표현하는 키워드</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">
                            최대 3개
                        </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {PAST_KEYWORDS.map(({ key, label, emoji }) => {
                            const isSelected = formData.pastStyles.includes(key)
                            const isDisabled = !isSelected && formData.pastStyles.length >= 3
                            return (
                                <motion.button
                                    key={key}
                                    whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                                    onClick={() => !isDisabled && togglePastStyle(key)}
                                    disabled={isDisabled}
                                    className={`relative py-3.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden backdrop-blur-md border text-left ${
                                        isSelected
                                            ? "text-white shadow-lg border-[#d4af37]"
                                            : isDisabled
                                            ? "bg-slate-100/50 text-slate-300 border-slate-200/50 cursor-not-allowed"
                                            : "bg-white/80 text-slate-600 border-white/60 shadow-md shadow-slate-900/5 hover:bg-white/90"
                                    }`}
                                >
                                    {isSelected && (
                                        <motion.div
                                            layoutId={`past-keyword-${key}`}
                                            className="absolute inset-0"
                                            style={{ backgroundColor: GRADUATION_THEME.primary }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <span className="text-lg">{emoji}</span>
                                        <span>{label}</span>
                                    </span>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
