"use client"

import { motion } from "framer-motion"
import { StepHeader } from "./StepHeader"
import { InputField } from "./InputField"
import { GENDER_OPTIONS } from "../constants"
import type { Step1Props } from "../types"

export function Step1({ formData, setFormData, isIdol, focusedField, setFocusedField }: Step1Props) {
    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "")
        if (val.length <= 4) {
            setFormData(prev => ({ ...prev, pin: val }))
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full px-6 py-4 flex flex-col"
        >
            <StepHeader
                title="기본 정보를 입력해주세요"
                step={1}
                description={`더 정확한 ${isIdol ? "최애" : "퍼스널"} 향기 분석을 위해 필요한 정보입니다.`}
            />

            <div className="flex-1 space-y-6 mt-6">
                <InputField
                    label="인증 번호 (숫자 4자리)"
                    value={formData.pin}
                    onChange={handlePinChange}
                    placeholder="0000"
                    isFocused={focusedField === "pin"}
                    onFocus={() => setFocusedField("pin")}
                    onBlur={() => setFocusedField(null)}
                    type="tel"
                    center
                    letterSpacing
                />

                <InputField
                    label={isIdol ? "최애 이름 (또는 애칭)" : "본인 이름 (또는 닉네임)"}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={isIdol ? "예: 변우석" : "예: 김주연"}
                    isFocused={focusedField === "name"}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                />

                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {isIdol ? "최애 성별" : "본인 성별"}
                    </label>
                    <div className="flex gap-2">
                        {GENDER_OPTIONS.map(({ key, label }) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFormData(prev => ({ ...prev, gender: key }))}
                                className={`relative flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                                    formData.gender === key
                                        ? "text-slate-900 shadow-md"
                                        : "bg-white/60 text-slate-400 hover:bg-white"
                                }`}
                            >
                                {formData.gender === key && (
                                    <motion.div
                                        layoutId="gender-active"
                                        className="absolute inset-0 bg-yellow-400"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                <span className="relative z-10">{label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
