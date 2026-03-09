"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "../../components/StepHeader"
import { CURRENT_FEELINGS, GRADUATION_THEME } from "../constants"
import type { GraduationFormDataType } from "@/types/analysis"

interface GraduationStep3Props {
    formData: GraduationFormDataType
    setCurrentFeeling: (feeling: string) => void
}

export function GraduationStep3({
    formData,
    setCurrentFeeling,
}: GraduationStep3Props) {
    const t = useTranslations('graduationInput')

    const CURRENT_FEELINGS_TRANSLATED = CURRENT_FEELINGS.map(f => ({
        ...f,
        label: t(`step3.feelings.${f.key}`)
    }))

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={t('step3.title')}
                step={3}
                description={t('step3.description')}
            />

            <div className="flex-1 mt-4 overflow-y-auto">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('step3.selectLabel')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {CURRENT_FEELINGS_TRANSLATED.map(({ key, label, emoji, color }) => {
                            const isSelected = formData.currentFeeling === key
                            return (
                                <motion.button
                                    key={key}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setCurrentFeeling(key)}
                                    className={`relative py-4 px-4 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden border-2 ${
                                        isSelected
                                            ? `${color} shadow-lg`
                                            : "bg-white/80 text-slate-600 border-white/60 shadow-md shadow-slate-900/5 hover:bg-white/90"
                                    }`}
                                >
                                    {isSelected && (
                                        <motion.div
                                            layoutId="current-feeling-active"
                                            className="absolute inset-0 opacity-30"
                                            style={{ backgroundColor: GRADUATION_THEME.secondary }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <span className="text-2xl">{emoji}</span>
                                        <span className={`text-base ${isSelected ? "font-bold" : ""}`}>{label}</span>
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
