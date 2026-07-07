'use client'

// ============================================================
// 相對 — PartnerPhase (UI-SPEC §3.4, 궁합 전용)
// 관계 선택 → 이름/성별 → 생시(BirthFields 재사용)
// ============================================================

import { useTranslations } from 'next-intl'
import { SAJU_RELATION_OPTIONS } from '@/types/analysis'
import type { SajuBirthFieldsState, SajuFormState, SajuRelationId } from '../constants'
import { BirthFields } from './BirthFields'
import { FieldLabel, GenderPills, HelperNote, PhaseHeader, UnderlineField } from './SajuAtoms'

interface PartnerPhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
}

export function PartnerPhase({ formData, setFormData }: PartnerPhaseProps) {
    const t = useTranslations('saju.input.partner')
    const tGate = useTranslations('saju.input.gate')
    const partner = formData.partner
    const isIdolCompat = formData.targetType === 'idol'

    const patchPartner = (patch: Partial<SajuFormState['partner']>) =>
        setFormData((prev) => ({ ...prev, partner: { ...prev.partner, ...patch } }))

    const handleBirthChange = (patch: Partial<SajuBirthFieldsState>) => patchPartner(patch)

    return (
        <div>
            <PhaseHeader title={t('title')} sub={t('sub')} />

            {/* 최애 × 궁합 안내 배너 */}
            {isIdolCompat && (
                <div className="mb-6">
                    <HelperNote>{t('idolCompatBanner')}</HelperNote>
                </div>
            )}

            {/* 관계 선택 — 3열×2행 필 */}
            <div className="space-y-1.5">
                <FieldLabel>{t('relationLabel')}</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                    {SAJU_RELATION_OPTIONS.map((option) => {
                        const isActive = partner.relation === option.id
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => patchPartner({ relation: option.id as SajuRelationId })}
                                className={`font-serif-kr break-keep h-11 rounded-md border px-1 text-[13px] transition-colors duration-300 ${
                                    isActive
                                        ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#E9E2D0]'
                                        : 'border-[#262A38] bg-transparent text-[#A69F8D]'
                                }`}
                            >
                                {t(`relations.${option.id}`)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 이름 */}
            <div className="mt-8">
                <UnderlineField
                    label={t('nameLabel')}
                    value={partner.name}
                    onChange={(name) => patchPartner({ name })}
                    placeholder={t('namePlaceholder')}
                    maxLength={10}
                    name="saju-partner-name"
                />
            </div>

            {/* 성별 */}
            <div className="mt-8">
                <GenderPills
                    label={tGate('genderLabel')}
                    value={partner.gender}
                    onChange={(gender) => patchPartner({ gender })}
                    labels={{
                        male: tGate('genderMale'),
                        female: tGate('genderFemale'),
                        other: tGate('genderOther'),
                    }}
                />
            </div>

            {/* 생시 — BirthPhase 블록 그대로 재사용 */}
            <div className="mt-9">
                <BirthFields value={partner} onChange={handleBirthChange} timeLabel={t('timeLabel')} />
            </div>
        </div>
    )
}
