"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { KeyRound } from "lucide-react"
import { StepHeader } from "./StepHeader"
import { InputField } from "./InputField"
import type { Step1Props } from "../types"

export function Step1({ formData, setFormData, isIdol, isOnline, focusedField, setFocusedField }: Step1Props) {
    const t = useTranslations()
    const [showPinToast, setShowPinToast] = useState(false)
    const pinToastShownRef = useRef(false)

    const GENDER_ITEMS = [
        { key: "Male", label: t('input.genders.male') },
        { key: "Female", label: t('input.genders.female') },
        { key: "Other", label: t('input.genders.other') }
    ]
    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "")
        if (val.length <= 4) {
            setFormData(prev => ({ ...prev, pin: val }))
        }
    }

    // 4자리 입력 완료 시 토스트 표시
    useEffect(() => {
        if (formData.pin.length === 4 && !pinToastShownRef.current) {
            pinToastShownRef.current = true
            setShowPinToast(true)
            const timer = setTimeout(() => setShowPinToast(false), 4000)
            return () => clearTimeout(timer)
        }
        if (formData.pin.length < 4) {
            pinToastShownRef.current = false
        }
    }, [formData.pin])

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={t('input.step1.title')}
                step={1}
                description={isIdol ? t('input.step1.descriptionIdol') : t('input.step1.descriptionPersonal')}
            />

            <div className="flex-1 space-y-4 mt-4">
                {/* 오프라인 모드에서만 인증 번호 표시 */}
                {!isOnline && (
                    <div className="space-y-2">
                        <InputField
                            label={t('input.step1.pinLabel')}
                            value={formData.pin}
                            onChange={handlePinChange}
                            placeholder="0000"
                            isFocused={focusedField === "pin"}
                            onFocus={() => setFocusedField("pin")}
                            onBlur={() => setFocusedField(null)}
                            type="tel"
                            center
                            letterSpacing
                            accentColor="rose"
                        />
                        {/* 핀번호 안내 배너 */}
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-start gap-2.5 bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-xl px-3.5 py-3"
                        >
                            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-rose-400 border-2 border-rose-500 flex items-center justify-center mt-0.5">
                                <KeyRound size={14} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-rose-700 leading-tight">
                                    {t('input.step1.pinHintTitle')}
                                </p>
                                <p className="text-[11px] text-rose-600/80 mt-0.5 leading-snug">
                                    {t('input.step1.pinHintDescription')}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 핀번호 확인 토스트 */}
                <AnimatePresence>
                    {showPinToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
                        >
                            <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-4 shadow-2xl shadow-rose-500/30 border-2 border-rose-400">
                                <div className="text-center">
                                    <p className="text-white/80 text-xs font-medium">
                                        {t('input.step1.pinToastTitle')}
                                    </p>
                                    <p className="text-white text-2xl font-black tracking-[0.4em] mt-1">
                                        {formData.pin}
                                    </p>
                                </div>
                                <p className="text-white/70 text-[11px] mt-2 text-center">
                                    {t('input.step1.pinToastReminder')}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <InputField
                    label={isIdol ? t('input.step1.nameIdolLabel') : t('input.step1.namePersonalLabel')}
                    value={formData.name}
                    onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 5) {
                            setFormData(prev => ({ ...prev, name: value }))
                        }
                    }}
                    placeholder={isIdol ? t('input.step1.namePlaceholderIdol') : t('input.step1.namePlaceholderPersonal')}
                    isFocused={focusedField === "name"}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    maxLength={5}
                />

                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {isIdol ? t('input.step1.genderIdolLabel') : t('input.step1.genderPersonalLabel')}
                    </label>
                    <div className="flex gap-2">
                        {GENDER_ITEMS.map(({ key, label }) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFormData(prev => ({ ...prev, gender: key }))}
                                className={`relative flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden backdrop-blur-md border ${
                                    formData.gender === key
                                        ? "text-slate-900 shadow-lg border-yellow-300"
                                        : "bg-white/80 text-slate-500 border-white/60 shadow-md shadow-slate-900/5 hover:bg-white/90 hover:border-white"
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
