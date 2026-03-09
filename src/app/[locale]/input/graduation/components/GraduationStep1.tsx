"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { StepHeader } from "../../components/StepHeader"
import { InputField } from "../../components/InputField"
import { GRADUATION_THEME } from "../constants"
import type { GraduationFormDataType } from "@/types/analysis"

interface GraduationStep1Props {
    formData: GraduationFormDataType
    setName: (name: string) => void
    setGender: (gender: string) => void
    setGraduationType: (type: string) => void
    setPin: (pin: string) => void
    isOffline: boolean
    focusedField: string | null
    setFocusedField: (field: string | null) => void
}

export function GraduationStep1({
    formData,
    setName,
    setGender,
    setGraduationType,
    setPin,
    isOffline,
    focusedField,
    setFocusedField
}: GraduationStep1Props) {
    const t = useTranslations('graduationInput')

    const GENDER_OPTIONS_TRANSLATED = [
        { key: "Male", label: t('genders.Male') },
        { key: "Female", label: t('genders.Female') },
        { key: "Other", label: t('genders.Other') }
    ]

    const GRADUATION_TYPES_TRANSLATED = [
        { key: "elementary", label: t('types.elementary'), emoji: "🎒" },
        { key: "middle", label: t('types.middle'), emoji: "📚" },
        { key: "high", label: t('types.high'), emoji: "🏫" },
        { key: "university", label: t('types.university'), emoji: "🎓" },
        { key: "graduate", label: t('types.graduate'), emoji: "📜" },
        { key: "other", label: t('types.other'), emoji: "✨" }
    ]

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "")
        if (val.length <= 4) {
            setPin(val)
        }
    }
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={t('step1.title')}
                step={1}
                description={t('step1.description')}
            />

            <div className="flex-1 space-y-4 mt-4">
                {/* 오프라인 모드에서만 인증 번호 표시 */}
                {isOffline && (
                    <InputField
                        label={t('step1.pinLabel')}
                        value={formData.pin || ""}
                        onChange={handlePinChange}
                        placeholder="0000"
                        isFocused={focusedField === "pin"}
                        onFocus={() => setFocusedField("pin")}
                        onBlur={() => setFocusedField(null)}
                        type="tel"
                        center
                        letterSpacing
                    />
                )}

                {/* 이름 */}
                <InputField
                    label={t('step1.nameLabel')}
                    value={formData.name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('step1.namePlaceholder')}
                    isFocused={focusedField === "name"}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                />

                {/* 성별 */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('step1.genderLabel')}
                    </label>
                    <div className="flex gap-2">
                        {GENDER_OPTIONS_TRANSLATED.map(({ key, label }) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setGender(key)}
                                className={`relative flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden backdrop-blur-md border ${
                                    formData.gender === key
                                        ? "text-white shadow-lg border-[#1e3a5f]"
                                        : "bg-white/80 text-slate-500 border-white/60 shadow-md shadow-slate-900/5 hover:bg-white/90 hover:border-white"
                                }`}
                            >
                                {formData.gender === key && (
                                    <motion.div
                                        layoutId="gender-active-graduation"
                                        className="absolute inset-0"
                                        style={{ backgroundColor: GRADUATION_THEME.primary }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                <span className="relative z-10">{label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* 졸업 유형 */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('step1.graduationTypeLabel')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {GRADUATION_TYPES_TRANSLATED.map(({ key, label, emoji }) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setGraduationType(key)}
                                className={`relative py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-300 overflow-hidden backdrop-blur-md border ${
                                    formData.graduationType === key
                                        ? "text-white shadow-lg border-[#d4af37]"
                                        : "bg-white/80 text-slate-600 border-white/60 shadow-md shadow-slate-900/5 hover:bg-white/90"
                                }`}
                            >
                                {formData.graduationType === key && (
                                    <motion.div
                                        layoutId="graduation-type-active"
                                        className="absolute inset-0"
                                        style={{ backgroundColor: GRADUATION_THEME.primary }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                <span className="relative z-10 flex flex-col items-center gap-1">
                                    <span className="text-base">{emoji}</span>
                                    <span>{label}</span>
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>

            </div>
        </motion.div>
    )
}
