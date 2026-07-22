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
            const showTimer = setTimeout(() => setShowPinToast(true), 0)
            const hideTimer = setTimeout(() => setShowPinToast(false), 4000)
            return () => {
                clearTimeout(showTimer)
                clearTimeout(hideTimer)
            }
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
                            className="flex items-start gap-2.5 bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] border border-[var(--line)] rounded-[6px] px-3.5 py-3"
                        >
                            <div className="flex-shrink-0 w-7 h-7 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center mt-0.5">
                                <KeyRound size={14} className="text-[var(--ink)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs lg:text-sm font-black text-[var(--muted-ink)] leading-tight">
                                    {t('input.step1.pinHintTitle')}
                                </p>
                                <p className="text-[11px] lg:text-[13px] text-stone-600/80 mt-0.5 leading-snug">
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
                            <div className="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 shadow-2xl shadow-stone-500/30 border border-[var(--line)]">
                                <div className="text-center">
                                    <p className="text-white/80 text-xs lg:text-sm font-medium">
                                        {t('input.step1.pinToastTitle')}
                                    </p>
                                    <p className="text-[var(--ink)] text-2xl font-black tracking-[0.4em] mt-1">
                                        {formData.pin}
                                    </p>
                                </div>
                                <p className="text-white/70 text-[11px] lg:text-[13px] mt-2 text-center">
                                    {t('input.step1.pinToastReminder')}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 분석 대상 선택: 최애 vs 나 — 이름 입력 바로 위 */}
                <div className="space-y-2">
                    <label className="text-xs lg:text-sm font-bold text-[var(--muted-ink)] uppercase tracking-wider">
                        {t('input.step1.analysisTarget')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { key: "self", label: t('input.step1.targetSelf'), emoji: "🪞", desc: t('input.step1.targetSelfDesc') },
                            { key: "idol", label: t('input.step1.targetIdol'), emoji: "💖", desc: t('input.step1.targetIdolDesc') },
                        ] as const).map(({ key, label, emoji, desc }) => {
                            const isActive = (formData.targetType ?? "self") === key
                            return (
                                <motion.button
                                    key={key}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setFormData(prev => ({ ...prev, targetType: key }))}
                                    className={`relative flex min-h-[92px] flex-col items-center justify-center gap-1 py-3 rounded-[6px] text-sm lg:text-base font-bold border-2 transition-colors duration-300 ${
                                        isActive
                                            ? "border-[var(--line)] bg-[var(--soft)]"
                                            : "border-[var(--line)] bg-[var(--soft)] hover:border-[var(--line)]"
                                    }`}
                                    style={isActive ? { boxShadow: '0 0 0 3px rgba(212,160,23,0.22), 0 4px 14px rgba(212,160,23,0.28)' } : undefined}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base">{emoji}</span>
                                        <span className={`text-base font-black transition-colors duration-300 ${isActive ? "text-[var(--ink)]" : "text-[var(--muted-ink)]"}`}>{label}</span>
                                    </div>
                                    <span className={`text-[10px] lg:text-[12px] font-medium transition-colors duration-300 ${isActive ? "text-[var(--muted-ink)]" : "text-[var(--muted-ink)]"}`}>
                                        {desc}
                                    </span>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>

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
                    <label className="text-xs lg:text-sm font-bold text-[var(--muted-ink)] uppercase tracking-wider">
                        {isIdol ? t('input.step1.genderIdolLabel') : t('input.step1.genderPersonalLabel')}
                    </label>
                    <div className="flex gap-2">
                        {GENDER_ITEMS.map(({ key, label }) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFormData(prev => ({ ...prev, gender: key }))}
                                className={`relative flex-1 py-3.5 rounded-[6px] text-sm lg:text-base font-semibold border-2 transition-colors duration-300 ${
                                    formData.gender === key
                                        ? "border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] font-black"
                                        : "border-[var(--line)] bg-[var(--soft)] text-[var(--muted-ink)] hover:border-[var(--line)]"
                                }`}
                                style={formData.gender === key ? { boxShadow: '0 0 0 3px rgba(212,160,23,0.22), 0 4px 14px rgba(212,160,23,0.28)' } : undefined}
                            >
                                <span className="relative z-10">{label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
