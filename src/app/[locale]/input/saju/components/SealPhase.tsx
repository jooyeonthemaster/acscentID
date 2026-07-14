'use client'

// ============================================================
// 封印 — SealPhase (UI-SPEC §3.6)
// 입력 요약을 사주 단자(單子) 한지 카드로 확인 → 봉인(제출)
// 봉인 시: 낙관(印) 찍힘 → 카드 침잠 → 0.9s 시점 제출 (훅 handleSeal)
// '고치기'는 페이즈로 점프하지 않고 해당 항목 편집기를 이 화면에서 인라인으로 펼친다.
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BrushDivider, HanjiCard, HOUR_BRANCHES, SealStamp, SAJU_EASE_INK } from '@/components/saju'
import { SAJU_PURPOSE_HANJA, type SajuBirthFieldsState, type SajuFormState, type SajuPhase } from '../constants'
import { PhaseHeader } from './SajuAtoms'
import { GatePhase } from './GatePhase'
import { PurposePhase } from './PurposePhase'
import { BirthPhase } from './BirthPhase'
import { PartnerPhase } from './PartnerPhase'
import { WishPhase } from './WishPhase'

interface SealPhaseProps {
    formData: SajuFormState
    setFormData: React.Dispatch<React.SetStateAction<SajuFormState>>
    isOnline: boolean
    isSealing: boolean
}

// 족자 축(軸) — 두루마리 상·하 나무대. 원통 음영 + 양끝 축머리(knob)로 입체감을 준다.
function ScrollRod() {
    return (
        <div className="relative z-10 h-3.5 w-full">
            {/* 축머리(좌) */}
            <span
                aria-hidden
                className="absolute -left-2 top-1/2 h-[22px] w-3.5 -translate-y-1/2 rounded-full"
                style={{
                    background: 'linear-gradient(to bottom, #E8C766 0%, #A5801F 45%, #5A4715 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.4)',
                }}
            />
            {/* 축머리(우) */}
            <span
                aria-hidden
                className="absolute -right-2 top-1/2 h-[22px] w-3.5 -translate-y-1/2 rounded-full"
                style={{
                    background: 'linear-gradient(to bottom, #E8C766 0%, #A5801F 45%, #5A4715 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.4)',
                }}
            />
            {/* 축대(원통 본체) */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background:
                        'linear-gradient(to bottom, #F2DA8A 0%, #C9A227 30%, #8A6D1F 62%, #4E3D12 100%)',
                    boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.4)',
                }}
            />
        </div>
    )
}

export function SealPhase({ formData, setFormData, isOnline, isSealing }: SealPhaseProps) {
    const t = useTranslations('saju.input.seal')
    const tGate = useTranslations('saju.input.gate')
    const tBirth = useTranslations('saju.input.birth')
    const tPartner = useTranslations('saju.input.partner')
    const tPurpose = useTranslations('saju.input.purpose')

    // 인라인 편집 중인 항목(페이즈). null이면 단자 요약을 보여준다.
    const [editing, setEditing] = useState<SajuPhase | null>(null)

    const closeEditor = () => {
        setEditing(null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    }

    const isIdol = formData.targetType === 'idol'
    const isCompat = formData.purpose === 'compatibility'

    // 한자 병기 토큰('시(時)', '진시(辰時)')이 여는 괄호 앞에서 줄바꿈되지 않도록 word-joiner(U+2060)로 묶는다
    const glueParens = (v: string): string => v.replace(/\(/g, '⁠(')

    const sijinOf = (fields: SajuBirthFieldsState): string => {
        // '시(時) 미상'이 줄 끝에서 갈라져 '미상' 고아 단어가 생기지 않도록 non-breaking space로 묶는다
        if (fields.timeUnknown || fields.hourBranch === null) return t('timeUnknownDisplay').replace(/ /g, ' ')
        const branch = HOUR_BRANCHES[fields.hourBranch]
        return glueParens(`${branch.ji}시(${branch.hanja}時)`)
    }

    const birthDisplayOf = (fields: SajuBirthFieldsState): string => {
        const isLunar = fields.calendar === 'lunar'
        const cal = isLunar ? tBirth('calendarLunar') : tBirth('calendarSolar')
        // 음력 윤달 출생은 봉인 확인 단계에서도 검증 가능해야 한다 (§3.6) — '(음력 윤달)'로 함께 표기
        const calDisplay = isLunar && fields.isLeapMonth ? `${cal} ${t('leapDisplay')}` : cal
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

    // 인라인 편집기 — 봉인 페이즈를 벗어나지 않고 해당 항목만 이 화면에서 고친다
    const renderEditor = (phase: SajuPhase) => {
        switch (phase) {
            case 'gate':
                return <GatePhase formData={formData} setFormData={setFormData} isOnline={isOnline} />
            case 'purpose':
                return <PurposePhase formData={formData} setFormData={setFormData} />
            case 'birth':
                return <BirthPhase formData={formData} setFormData={setFormData} />
            case 'partner':
                return <PartnerPhase formData={formData} setFormData={setFormData} />
            case 'wish':
                return <WishPhase formData={formData} setFormData={setFormData} onSkip={closeEditor} />
            default:
                return null
        }
    }

    return (
        <AnimatePresence mode="wait">
            {editing ? (
                <motion.div
                    key={`edit-${editing}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: SAJU_EASE_INK }}
                >
                    {renderEditor(editing)}

                    {/* 편집 완료 — 단자 요약으로 복귀 */}
                    <button
                        type="button"
                        onClick={closeEditor}
                        className="font-serif-kr mt-10 h-[52px] w-full rounded-lg border border-[#C9A227]/50 bg-[#12141D] text-[15px] font-semibold text-[#E9E2D0] transition-colors duration-300 hover:border-[#C9A227]"
                    >
                        {t('editDone')}
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: SAJU_EASE_INK }}
                >
                    <PhaseHeader title={t('title')} sub={t('sub')} />

                    <motion.div
                        className="relative"
                        initial={false}
                        animate={isSealing ? { scale: 0.98 } : { scale: 1 }}
                        transition={{ duration: 0.4, ease: SAJU_EASE_INK }}
                        style={{ filter: 'drop-shadow(0 18px 34px rgba(0,0,0,0.5))' }}
                    >
                        {/* 상축(上軸) — 두루마리 윗대 */}
                        <ScrollRod />

                        {/* 지면 — 펼칠 땐 상축에서 흘러내리고, 봉인 시 하축이 올라와 말려 닫힌다 (§3.6 봉인 의식) */}
                        <motion.div
                            initial={{ height: 0, opacity: 0.5 }}
                            animate={isSealing ? { height: 0, opacity: 1 } : { height: 'auto', opacity: 1 }}
                            transition={
                                isSealing
                                    ? { height: { duration: 0.5, ease: SAJU_EASE_INK, delay: 0.08 }, opacity: { duration: 0.3 } }
                                    : {
                                          height: { duration: 1.15, ease: SAJU_EASE_INK, delay: 0.15 },
                                          opacity: { duration: 0.5, delay: 0.15 },
                                      }
                            }
                            style={{ overflow: 'hidden', transformOrigin: 'top' }}
                        >
                            <HanjiCard padding="lg" scroll verticalLabel="四柱單子">
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
                                                        onClick={() => setEditing(row.editPhase)}
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
                        </motion.div>

                        {/* 하축(下軸) — 두루마리 아랫대. 지면이 펼쳐지며 함께 내려오고, 봉인 시 상축까지 말려 올라온다 */}
                        <ScrollRod />

                        {/* 봉인 낙관 — 두루마리가 다 말린 뒤 중앙에 눌러 찍힌다 (§3.6) */}
                        {isSealing && (
                            <motion.div
                                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                                initial={{ opacity: 0, scale: 1.35, rotate: -8 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ duration: 0.28, ease: SAJU_EASE_INK, delay: 0.5 }}
                            >
                                <SealStamp chars="印" size="lg" tone="cinnabar" stamped />
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
