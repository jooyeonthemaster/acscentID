"use client"

import { motion } from "framer-motion"
import { StepHeader } from "../../components/StepHeader"
import { InputField } from "../../components/InputField"
import { GRADUATION_TYPES, GENDER_OPTIONS, GRADUATION_THEME } from "../constants"
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
                title="기본 정보"
                step={1}
                description="졸업 기념 퍼퓸의 주인공을 알려주세요 🎓"
            />

            <div className="flex-1 space-y-4 mt-4">
                {/* 오프라인 모드에서만 인증 번호 표시 */}
                {isOffline && (
                    <InputField
                        label="인증 번호 (숫자 4자리)"
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
                    label="이름 (또는 애칭)"
                    value={formData.name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김졸업"
                    isFocused={focusedField === "name"}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                />

                {/* 성별 */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        성별
                    </label>
                    <div className="flex gap-2">
                        {GENDER_OPTIONS.map(({ key, label }) => (
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
                        졸업 유형
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {GRADUATION_TYPES.map(({ key, label, emoji }) => (
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
