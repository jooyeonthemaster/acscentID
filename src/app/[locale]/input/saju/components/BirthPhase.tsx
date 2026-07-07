'use client'

// ============================================================
// 生時 — BirthPhase (UI-SPEC §3.3)
// 생년월일(양력/음력+윤달) + 12지시/정확한 시각/시간 모름
// ============================================================

import { useTranslations } from 'next-intl'
import type { SajuBirthFieldsState, SajuFormState } from '../constants'
import { BirthFields } from './BirthFields'
import { PhaseHeader } from './SajuAtoms'

interface BirthPhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
}

export function BirthPhase({ formData, setFormData }: BirthPhaseProps) {
    const t = useTranslations('saju.input.birth')
    const isIdol = formData.targetType === 'idol'

    const handleChange = (patch: Partial<SajuBirthFieldsState>) =>
        setFormData((prev) => ({ ...prev, ...patch }))

    return (
        <div>
            <PhaseHeader
                title={isIdol ? t('titleIdol') : t('title')}
                sub={isIdol ? t('subIdol') : t('sub')}
            />
            <BirthFields value={formData} onChange={handleChange} timeLabel={t('timeLabel')} />
        </div>
    )
}
