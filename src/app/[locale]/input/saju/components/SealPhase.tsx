'use client'

// ============================================================
// 封印 — SealPhase (UI-SPEC §3.6)
// 입력 요약을 사주 단자(單子) 한지 카드로 확인 → 봉인(제출)
// 봉인 시: 낙관(印) 찍힘 → 카드 침잠 → 0.9s 시점 제출 (훅 handleSeal)
// ============================================================

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BrushDivider, HanjiCard, HOUR_BRANCHES, SealStamp, SAJU_EASE_INK } from '@/components/saju'
import { SAJU_PURPOSE_HANJA, type SajuBirthFieldsState, type SajuFormState, type SajuPhase } from '../constants'
import { PhaseHeader } from './SajuAtoms'

interface SealPhaseProps {
    formData: SajuFormState
    isSealing: boolean
    onEdit: (phase: SajuPhase) => void
}

export function SealPhase({ formData, isSealing, onEdit }: SealPhaseProps) {
    const t = useTranslations('saju.input.seal')
    const tGate = useTranslations('saju.input.gate')
    const tBirth = useTranslations('saju.input.birth')
    const tPartner = useTranslations('saju.input.partner')
    const tPurpose = useTranslations('saju.input.purpose')

    const isIdol = formData.targetType === 'idol'
    const isCompat = formData.purpose === 'compatibility'

    // 한자 병기 토큰('시(時)', '진시(辰時)')이 여는 괄호 앞에서 줄바꿈되지 않도록 word-joiner(U+2060)로 묶는다
    const glueParens = (v: string): string => v.replace(/\(/g, '⁠(')

    const sijinOf = (fields: SajuBirthFieldsState): string => {
        // '시(時) 미상'이 줄 끝에서 갈라져 '미상' 고아 단어가 생기지 않도록 non-breaking space로 묶는다
        if (fields.timeUnknown || fields.hourBranch === null) return t('timeUnknownDisplay').replace(/ /g, '\u00A0')
        const branch = HOUR_BRANCHES[fields.hourBranch]
        return glueParens(`${branch.ji}시(${branch.hanja}時)`)
    }

    const birthDisplayOf = (fields: SajuBirthFieldsState): string => {
        const isLunar = fields.calendar === 'lunar'
        const cal = isLunar ? tBirth('calendarLunar') : tBirth('calendarSolar')
        // 음력 윤달 출생은 봉인 확인 단계에서도 검증 가능해야 한다 (§3.6) — '(음력 윤달)'로 함께 표기
        const calDisplay = isLunar && fields.isLeapMonth ? `${cal}\u00A0${t('leapDisplay')}` : cal
        return `${fields.birthYear}${tBirth('yearSuffix')} ${Number(fields.birthMonth)}${tBirth('monthSuffix')} ${Number(fields.birthDay)}${tBirth('daySuffix')} (${calDisplay}) · ${sijinOf(fields)}`
    }

    const genderDisplay = (gender: string): string => {
        if (gender === 'male') return t('genderDisplay.male')
        if (gender === 'female') return t('genderDisplay.female')
        return t('genderDisplay.other')
    }

    interface RowDef {
        key: string
        label: string
        value: string
        editPhase: SajuPhase
        quote?: boolean
    }

    const rows: (RowDef | 'divider')[] = [
        { key: 'target', label: t('rows.target'), value: isIdol ? tGate('idol') : tGate('self'), editPhase: 'gate' },
        { key: 'name', label: t('rows.name'), value: formData.name.trim(), editPhase: 'gate' },
        { key: 'gender', label: t('rows.gender'), value: genderDisplay(formData.gender), editPhase: 'gate' },
        'divider',
        { key: 'birth', label: t('rows.birth'), value: birthDisplayOf(formData), editPhase: 'birth' },
        {
            key: 'purpose',
            label: t('rows.purpose'),
            value: formData.purpose
                ? `${SAJU_PURPOSE_HANJA[formData.purpose]} — ${tPurpose(`options.${formData.purpose}.label`)}`
                : '',
            editPhase: 'purpose',
        },
    ]

    if (isCompat && formData.partner.relation) {
        rows.push({
            key: 'partner',
            label: t('rows.partner'),
            value: `${formData.partner.name.trim()} · ${tPartner(`relations.${formData.partner.relation}`)} · ${birthDisplayOf(formData.partner)}`,
            editPhase: 'partner',
        })
    }
    if (formData.wish.trim().length > 0) {
        if (isCompat) rows.push('divider')
        rows.push({
            key: 'wish',
            label: t('rows.wish'),
            value: formData.wish.trim(),
            editPhase: 'wish',
            quote: true,
        })
    }

    return (
        <div>
            <PhaseHeader title={t('title')} sub={t('sub')} />

            <motion.div
                className="relative"
                initial={false}
                animate={isSealing ? { scale: 0.96, opacity: 0.8 } : { scale: 1, opacity: 1 }}
                transition={{ delay: isSealing ? 0.5 : 0, duration: 0.4, ease: SAJU_EASE_INK }}
            >
                <HanjiCard padding="lg" verticalLabel="四柱單子">
                    {/* 세로 라벨 겹침 방지 여백 */}
                    <div className="space-y-4 pr-8">
                        {rows.map((row, i) =>
                            row === 'divider' ? (
                                <div key={`divider-${i}`} className="flex justify-center py-1">
                                    <BrushDivider tone="ink-on-cream" width={160} draw={false} />
                                </div>
                            ) : (
                                <div key={row.key} className="flex items-start gap-3">
                                    <span className="font-serif-kr w-14 flex-shrink-0 pt-0.5 text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#5C564A]">
                                        {row.label}
                                    </span>
                                    <span
                                        className={`font-serif-kr break-keep flex-1 text-[15px] font-semibold leading-[1.6] text-[#1A1610] ${
                                            row.quote ? 'line-clamp-2 font-normal' : ''
                                        }`}
                                    >
                                        {row.quote ? `“${row.value}”` : row.value}
                                    </span>
                                    {!isSealing && (
                                        <button
                                            type="button"
                                            onClick={() => onEdit(row.editPhase)}
                                            className="font-serif-kr flex-shrink-0 pt-0.5 text-[12px] leading-[1.6] text-[#A93226] underline underline-offset-2"
                                        >
                                            {t('edit')}
                                        </button>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </HanjiCard>

                {/* 봉인 낙관 — 봉인 순간에만 찍힌다 (§3.6) */}
                {isSealing && (
                    <div className="absolute bottom-5 right-5">
                        <SealStamp chars="印" size="lg" tone="cinnabar" stamped />
                    </div>
                )}
            </motion.div>
        </div>
    )
}
