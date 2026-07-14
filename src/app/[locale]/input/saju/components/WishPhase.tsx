'use client'

// ============================================================
// 心願 — WishPhase (UI-SPEC §3.5, 선택 입력)
// 고민 한 줄 textarea (max 100) + "건너뛰어도 됩니다"
// ============================================================

import { useTranslations } from 'next-intl'
import type { SajuFormState } from '../constants'
import { PhaseHeader } from './SajuAtoms'

interface WishPhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
    /** wish를 비운 채 다음 페이즈로 */
    onSkip: () => void
}

const WISH_MAX = 100

export function WishPhase({ formData, setFormData, onSkip }: WishPhaseProps) {
    const t = useTranslations('saju.input.wish')
    const isIdol = formData.targetType === 'idol'

    return (
        <div>
            <PhaseHeader
                title={isIdol ? t('titleIdol') : t('title')}
                sub={isIdol ? t('subIdol') : t('sub')}
            />

            <textarea
                value={formData.wish}
                onChange={(e) => setFormData((prev) => ({ ...prev, wish: e.target.value.slice(0, WISH_MAX) }))}
                maxLength={WISH_MAX}
                placeholder={isIdol ? t('placeholderIdol') : t('placeholder')}
                className="font-serif-kr break-keep min-h-[clamp(160px,42vh,460px)] w-full resize-none rounded-md border border-[#262A38] bg-[#12141D] p-4 text-[15px] leading-[1.85] text-[#E9E2D0] outline-none transition-colors placeholder:text-[#3A3E4C] focus:border-[#C9A227]"
            />

            <div className="mt-1.5 text-right">
                <span className="font-sans text-[12px] leading-[1.6] text-[#5C564A]">
                    {formData.wish.length} / {WISH_MAX}
                </span>
            </div>

            <div className="mt-6 text-center">
                <button
                    type="button"
                    onClick={() => {
                        setFormData((prev) => ({ ...prev, wish: '' }))
                        onSkip()
                    }}
                    className="font-serif-kr text-[12px] leading-[1.6] text-[#5C564A] underline underline-offset-4"
                >
                    {t('skip')}
                </button>
            </div>
        </div>
    )
}
