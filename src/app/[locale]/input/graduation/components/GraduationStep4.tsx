"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "../../components/StepHeader"
import { GRADUATION_THEME } from "../constants"
import type { GraduationFormDataType } from "@/types/analysis"

interface GraduationStep4Props {
    formData: GraduationFormDataType
    toggleFutureDream: (dream: string) => void
}

export function GraduationStep4({
    formData,
    toggleFutureDream,
}: GraduationStep4Props) {
    const t = useTranslations('graduationInput')

    const FUTURE_KEYWORDS = [
        { key: "career", label: t('step4.futureKeywords.career'), emoji: "💼" },
        { key: "travel", label: t('step4.futureKeywords.travel'), emoji: "✈️" },
        { key: "confident", label: t('step4.futureKeywords.confident'), emoji: "👊" },
        { key: "warm_hearted", label: t('step4.futureKeywords.warm_hearted'), emoji: "🫶" },
        { key: "free", label: t('step4.futureKeywords.free'), emoji: "🕊️" },
        { key: "challenging", label: t('step4.futureKeywords.challenging'), emoji: "🔥" },
        { key: "stable", label: t('step4.futureKeywords.stable'), emoji: "🏠" },
        { key: "creative", label: t('step4.futureKeywords.creative'), emoji: "🎨" },
        { key: "influential", label: t('step4.futureKeywords.influential'), emoji: "💫" },
        { key: "happy", label: t('step4.futureKeywords.happy'), emoji: "😊" },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={t('step4.title')}
                step={4}
                description={t('step4.description')}
            />

            <div className="flex-1 mt-4 overflow-y-auto">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>{t('step4.keywordLabel')}</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">
                            {t('step4.maxItems')}
                        </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {FUTURE_KEYWORDS.map(({ key, label, emoji }) => {
                            const isSelected = formData.futureDreams.includes(key)
                            const isDisabled = !isSelected && formData.futureDreams.length >= 3
                            return (
                                <motion.button
                                    key={key}
                                    whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                                    onClick={() => !isDisabled && toggleFutureDream(key)}
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
                                            layoutId={`future-keyword-${key}`}
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
