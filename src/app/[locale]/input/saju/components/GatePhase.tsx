'use client'

// ============================================================
// 入門 — GatePhase (UI-SPEC §3.1)
// 대상(我/愛) 선택 · [오프라인] PIN · 이름 · 성별
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SealStamp } from '@/components/saju'
import type { SajuFormState } from '../constants'
import { PhaseHeader, FieldLabel, UnderlineField, GenderPills, HelperNote } from './SajuAtoms'

interface GatePhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
    isOnline: boolean
}

export function GatePhase({ formData, setFormData, isOnline }: GatePhaseProps) {
    const t = useTranslations('saju.input.gate')
    const isIdol = formData.targetType === 'idol'

    // PIN 4자리 완성 안내 (chemistry SummonPhase의 타이밍 로직 재사용 — 사주 스킨)
    const [showPinToast, setShowPinToast] = useState(false)
    const pinToastShownRef = useRef(false)

    useEffect(() => {
        if (formData.pin.length === 4 && !pinToastShownRef.current) {
            pinToastShownRef.current = true
            const showTimer = setTimeout(() => setShowPinToast(true), 0)
            const hideTimer = setTimeout(() => setShowPinToast(false), 3000)
            return () => {
                clearTimeout(showTimer)
                clearTimeout(hideTimer)
            }
        }
        if (formData.pin.length < 4) {
            pinToastShownRef.current = false
        }
    }, [formData.pin])

    const cards = [
        { key: 'self' as const, hanja: '我', label: t('self'), desc: t('selfDesc') },
        { key: 'idol' as const, hanja: '愛', label: t('idol'), desc: t('idolDesc') },
    ]

    return (
        <div>
            <PhaseHeader title={t('title')} sub={t('sub')} />

            {/* 대상 선택 — 2열 카드 */}
            <div className="grid grid-cols-2 gap-3">
                {cards.map(({ key, hanja, label, desc }) => {
                    const isActive = formData.targetType === key
                    return (
                        <motion.button
                            key={key}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFormData((prev) => ({ ...prev, targetType: key }))}
                            className={`flex min-h-[112px] flex-col items-center gap-1.5 rounded-lg border p-4 transition-colors duration-300 ${
                                isActive ? 'border-[#C9A227] bg-[#12141D]' : 'border-[#262A38] bg-[#12141D]'
                            }`}
                            style={isActive ? { boxShadow: '0 0 20px rgba(201,162,39,0.15)' } : undefined}
                        >
                            {isActive ? (
                                <SealStamp chars={hanja} size="sm" tone="cinnabar" stamped />
                            ) : (
                                <span className="text-[#A69F8D]">
                                    <SealStamp chars={hanja} size="sm" tone="outline" />
                                </span>
                            )}
                            <span
                                className={`font-serif-kr break-keep mt-1 text-[15px] font-semibold leading-[1.4] transition-colors duration-300 ${
                                    isActive ? 'text-[#E9E2D0]' : 'text-[#A69F8D]'
                                }`}
                            >
                                {label}
                            </span>
                            <span
                                className={`font-serif-kr break-keep text-center text-[11px] leading-[1.5] transition-colors duration-300 ${
                                    isActive ? 'text-[#A69F8D]' : 'text-[#5C564A]'
                                }`}
                            >
                                {desc}
                            </span>
                        </motion.button>
                    )
                })}
            </div>

            {/* 오프라인 전용: PIN */}
            {!isOnline && (
                <div className="mt-6 space-y-3">
                    <div className="rounded-lg border border-[#262A38] bg-[#12141D] p-4">
                        <FieldLabel className="mb-2 text-[#C9A227]">{t('pin.label')}</FieldLabel>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={4}
                            value={formData.pin}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))
                            }
                            placeholder="0000"
                            className="h-12 w-full rounded-md border border-[#262A38] bg-[#0C0E16] text-center text-2xl tracking-[0.5em] text-[#E9E2D0] outline-none transition-colors placeholder:text-[#3A3E4C] focus:border-[#C9A227]"
                        />
                    </div>

                    {/* PIN 안내 배너 */}
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-start gap-2.5 rounded-lg border border-[#C9A227]/40 bg-[#12141D] px-3.5 py-3"
                    >
                        <KeyRound size={14} className="mt-0.5 flex-shrink-0 text-[#C9A227]" />
                        <div className="font-serif-kr break-keep">
                            <p className="text-[12px] font-semibold leading-[1.6] text-[#E9E2D0]">
                                {t('pin.helpTitle')}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-[1.6] text-[#A69F8D]">
                                {t('pin.helpDesc')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 이름 */}
            <div className="mt-8">
                <UnderlineField
                    label={isIdol ? t('nameLabelIdol') : t('nameLabel')}
                    value={formData.name}
                    onChange={(name) => setFormData((prev) => ({ ...prev, name }))}
                    placeholder={isIdol ? t('namePlaceholderIdol') : t('namePlaceholder')}
                    maxLength={10}
                    name="saju-name"
                />
            </div>

            {/* 성별 */}
            <div className="mt-8">
                <GenderPills
                    label={t('genderLabel')}
                    value={formData.gender}
                    onChange={(gender) => setFormData((prev) => ({ ...prev, gender }))}
                    labels={{
                        male: t('genderMale'),
                        female: t('genderFemale'),
                        other: t('genderOther'),
                    }}
                />
                {isIdol && (
                    <div className="mt-3">
                        <HelperNote>{t('genderHelperIdol')}</HelperNote>
                    </div>
                )}
            </div>

            {/* PIN 확인 팝업 — 직접 닫기(X) + 3초 자동 닫힘 (§3.1) */}
            <AnimatePresence>
                {showPinToast && (
                    <motion.div
                        key="pin-popup"
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="fixed inset-x-0 bottom-24 z-[60] mx-auto w-[calc(100%-48px)] max-w-[407px]"
                    >
                        <div className="relative rounded-xl border border-[#C9A227]/50 bg-[#12141D] px-4 py-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
                            <button
                                type="button"
                                onClick={() => setShowPinToast(false)}
                                aria-label={t('pin.toastClose')}
                                className="absolute right-2.5 top-2.5 text-[#5C564A] transition-colors hover:text-[#E9E2D0]"
                            >
                                <X size={16} />
                            </button>
                            <div className="flex items-start gap-2.5 pr-5">
                                <KeyRound size={15} className="mt-0.5 flex-shrink-0 text-[#C9A227]" />
                                <div className="font-serif-kr break-keep">
                                    <p className="text-[13px] leading-[1.6] text-[#E9E2D0]">
                                        {t('pin.toastLabel')}{' '}
                                        <span className="font-sans text-[15px] font-semibold tracking-[0.3em] text-[#C9A227]">
                                            {formData.pin}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] leading-[1.6] text-[#A69F8D]">
                                        {t('pin.toastHelp')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
