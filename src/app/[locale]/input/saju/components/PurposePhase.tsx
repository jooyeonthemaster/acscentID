'use client'

// ============================================================
// 所望 — PurposePhase (UI-SPEC §3.2)
// 단일 선택: 종합(命)/연애(緣)/재물(財)/직업·진로(業) 2×2 + 궁합(合) full-width
// 선택 시 해당 낙관 stamped, 나머지 카드 opacity 0.55 침잠
// ============================================================

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { SajuPurpose } from '@/types/analysis'
import { SealStamp } from '@/components/saju'
import { SAJU_PURPOSE_HANJA, SAJU_PURPOSE_ORDER, type SajuFormState } from '../constants'
import { PhaseHeader } from './SajuAtoms'

interface PurposePhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
}

export function PurposePhase({ formData, setFormData }: PurposePhaseProps) {
    const t = useTranslations('saju.input.purpose')
    const isIdol = formData.targetType === 'idol'
    const selected = formData.purpose

    const select = (purpose: SajuPurpose) =>
        setFormData((prev) => ({ ...prev, purpose }))

    const renderCard = (purpose: SajuPurpose, hero = false) => {
        const isActive = selected === purpose
        const dimmed = selected !== null && !isActive
        return (
            <motion.button
                key={purpose}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => select(purpose)}
                animate={{ opacity: dimmed ? 0.55 : 1 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-4 transition-colors duration-300 ${
                    hero ? 'col-span-2 min-h-[148px] justify-center' : 'min-h-[124px]'
                } ${isActive ? 'border-[#C9A227] bg-[#12141D]' : 'border-[#262A38] bg-[#12141D]'}`}
                style={isActive ? { boxShadow: '0 0 20px rgba(201,162,39,0.15)' } : undefined}
            >
                {isActive ? (
                    <SealStamp chars={SAJU_PURPOSE_HANJA[purpose]} size={hero ? 'lg' : 'md'} tone="cinnabar" stamped />
                ) : (
                    <span className="text-[#A69F8D]">
                        <SealStamp chars={SAJU_PURPOSE_HANJA[purpose]} size={hero ? 'lg' : 'md'} tone="outline" />
                    </span>
                )}
                <span
                    className={`font-serif-kr break-keep mt-1 font-semibold leading-[1.4] transition-colors duration-300 ${
                        hero ? 'text-[18px]' : 'text-[16px]'
                    } ${isActive ? 'text-[#E9E2D0]' : 'text-[#A69F8D]'}`}
                >
                    {t(`options.${purpose}.label`)}
                </span>
                <span
                    className={`font-serif-kr break-keep text-center text-[11px] leading-[1.5] transition-colors duration-300 ${
                        isActive ? 'text-[#A69F8D]' : 'text-[#5C564A]'
                    }`}
                >
                    {isIdol ? t(`options.${purpose}.descIdol`) : t(`options.${purpose}.desc`)}
                </span>
            </motion.button>
        )
    }

    return (
        <div>
            <PhaseHeader title={t('title')} sub={isIdol ? t('subIdol') : t('sub')} />

            <div className="grid grid-cols-2 gap-3">
                {renderCard('general', true)}
                {SAJU_PURPOSE_ORDER.filter((p) => p !== 'general').map((p) => renderCard(p))}
            </div>
        </div>
    )
}
