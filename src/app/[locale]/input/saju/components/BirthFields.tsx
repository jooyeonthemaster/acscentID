'use client'

// ============================================================
// BirthFields — 생시 입력 블록 (UI-SPEC §3.3, PartnerPhase §3.4 재사용)
// 양력/음력 세그먼트(+윤달) · 숫자 3필드 자동 이동 · 12지시 4×3 격자
// · 정확한 시각(보조 경로) · 시간 모름(삼주)
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HOUR_BRANCHES, SAJU_EASE_SETTLE } from '@/components/saju'
import {
    branchIndexOfTime,
    getBirthDateError,
    type SajuBirthFieldsState,
} from '../constants'
import { FieldLabel, HelperNote } from './SajuAtoms'
import { DateWheels } from './WheelDatePicker'

interface BirthFieldsProps {
    value: SajuBirthFieldsState
    onChange: (patch: Partial<SajuBirthFieldsState>) => void
    /** 12지시 라벨 (본인: "태어난 시간" / 상대: "상대가 태어난 시간") */
    timeLabel: string
}

export function BirthFields({ value, onChange, timeLabel }: BirthFieldsProps) {
    const t = useTranslations('saju.input.birth')
    const [exactOpen, setExactOpen] = useState(!!value.exactTime)

    const error = getBirthDateError(value)

    // 커밋된 생년월일 (문자열 → 숫자). 미입력이면 null.
    const yearNum = value.birthYear.length === 4 ? Number(value.birthYear) : null
    const monthNum = value.birthMonth ? Number(value.birthMonth) : null
    const dayNum = value.birthDay ? Number(value.birthDay) : null

    const handleDateChange = ({ year, month, day }: { year: number; month: number; day: number }) => {
        onChange({ birthYear: String(year), birthMonth: String(month), birthDay: String(day) })
    }

    const handleCalendarChange = (calendar: 'solar' | 'lunar') => {
        onChange({
            calendar,
            // 양력 전환 시 윤달 해제
            ...(calendar === 'solar' && { isLeapMonth: false }),
            // 음력은 최대 30일 — 31일이 남아 있으면 당겨온다
            ...(calendar === 'lunar' && Number(value.birthDay) > 30 && { birthDay: '30' }),
        })
    }

    const selectBranch = (index: number) => {
        onChange({ hourBranch: index, timeUnknown: false, exactTime: null })
    }

    const handleExactTime = (time: string) => {
        if (!time) {
            onChange({ exactTime: null })
            return
        }
        const idx = branchIndexOfTime(time)
        onChange({
            exactTime: time,
            timeUnknown: false,
            ...(idx !== null && { hourBranch: idx }),
        })
    }

    const toggleTimeUnknown = () => {
        if (value.timeUnknown) {
            onChange({ timeUnknown: false })
        } else {
            onChange({ timeUnknown: true, hourBranch: null, exactTime: null })
            setExactOpen(false)
        }
    }

    const matchedBranch = value.exactTime !== null ? branchIndexOfTime(value.exactTime) : null

    return (
        <div>
            {/* 생년월일 — 무한롤(휠) 인라인 선택: 양력/음력 · 년 · 월 · 일 (§3.3) */}
            <div className="mt-2">
                <DateWheels
                    calendar={value.calendar}
                    year={yearNum}
                    month={monthNum}
                    day={dayNum}
                    labels={{ year: t('yearSuffix'), month: t('monthSuffix'), day: t('daySuffix') }}
                    calendarLabels={{ solar: t('calendarSolar'), lunar: t('calendarLunar') }}
                    onChange={handleDateChange}
                    onCalendarChange={handleCalendarChange}
                />
            </div>

            {/* 윤달 (음력일 때만) */}
            <AnimatePresence>
                {value.calendar === 'lunar' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col items-center gap-1.5 pt-4">
                            <button
                                type="button"
                                onClick={() => onChange({ isLeapMonth: !value.isLeapMonth })}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    aria-hidden
                                    className={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border transition-colors duration-300 ${
                                        value.isLeapMonth ? 'border-[#C0392B] bg-[#C0392B]' : 'border-[#262A38] bg-transparent'
                                    }`}
                                >
                                    {value.isLeapMonth && (
                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                            <path d="M1.5 4.2 L3.2 6 L6.5 2" stroke="#F5EFE2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </span>
                                <span className="font-serif-kr break-keep text-[12px] leading-[1.4] text-[#A69F8D]">
                                    {t('leapMonth')}
                                </span>
                            </button>
                            <p className="font-serif-kr break-keep text-center text-[12px] leading-[1.6] text-[#5C564A]">
                                {t('leapHelper')}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 인라인 오류 — 1줄 caption */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="font-serif-kr break-keep mt-2.5 text-center text-[12px] leading-[1.6] text-[#E2604E]"
                    >
                        {t(`errors.${error}`)}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* 12지시 — 4×3 격자 */}
            <div className="mt-9">
                <div className="mb-2.5 flex items-baseline justify-between">
                    <FieldLabel>{timeLabel}</FieldLabel>
                    {!value.timeUnknown && (
                        <button
                            type="button"
                            onClick={() => setExactOpen((prev) => !prev)}
                            className="font-serif-kr text-[12px] leading-[1.6] text-[#C9A227] underline underline-offset-4"
                        >
                            {t('exactTimeLink')}
                        </button>
                    )}
                </div>

                <div
                    className={`grid grid-cols-4 gap-2 transition-opacity duration-300 ${
                        value.timeUnknown ? 'pointer-events-none opacity-35' : 'opacity-100'
                    }`}
                >
                    {HOUR_BRANCHES.map((branch) => {
                        const isSelected = value.hourBranch === branch.index && !value.timeUnknown
                        return (
                            <motion.button
                                key={branch.index}
                                type="button"
                                disabled={value.timeUnknown}
                                onClick={() => selectBranch(branch.index)}
                                animate={isSelected ? { scale: [1.06, 1] } : { scale: 1 }}
                                transition={{ duration: 0.25, ease: SAJU_EASE_SETTLE }}
                                className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-md border py-2 transition-colors duration-300 ${
                                    isSelected
                                        ? 'border-[#C0392B] bg-[#C0392B]/15'
                                        : 'border-[#262A38] bg-[#12141D]'
                                }`}
                            >
                                <span
                                    className={`font-serif-kr text-[18px] font-black leading-none ${
                                        isSelected ? 'text-[#E2604E]' : 'text-[#E9E2D0]'
                                    }`}
                                >
                                    {branch.hanja}
                                </span>
                                <span className="font-sans text-[10px] leading-[1.3] text-[#A69F8D]">
                                    {branch.range}
                                </span>
                                <span className="font-serif-kr text-[9px] leading-[1.3] text-[#5C564A]">
                                    {t(`branches.${branch.index}.animal`)}
                                </span>
                            </motion.button>
                        )
                    })}
                </div>

                {/* 정확한 시각 입력 — 헤더의 "정확한 시각으로 입력하기" 버튼으로 토글 */}
                {!value.timeUnknown && (
                    <AnimatePresence>
                        {exactOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <input
                                    type="time"
                                    value={value.exactTime ?? ''}
                                    onChange={(e) => handleExactTime(e.target.value)}
                                    className="mt-3 h-12 w-full rounded-md border border-[#262A38] bg-[#12141D] px-4 font-sans text-[15px] text-[#E9E2D0] outline-none transition-colors focus:border-[#C9A227]"
                                    style={{ colorScheme: 'dark' }}
                                />
                                {value.exactTime && matchedBranch !== null && (
                                    <p className="font-serif-kr break-keep mt-2 text-center text-[12px] leading-[1.6] text-[#A69F8D]">
                                        {t('exactTimeMatch', {
                                            time: value.exactTime,
                                            branch: HOUR_BRANCHES[matchedBranch].ji,
                                            hanja: HOUR_BRANCHES[matchedBranch].hanja,
                                        })}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* 시간 모름 — 삼주 분석 */}
                <button
                    type="button"
                    onClick={toggleTimeUnknown}
                    className={`font-serif-kr mt-4 h-12 w-full rounded-md border text-[14px] transition-colors duration-300 ${
                        value.timeUnknown
                            ? 'border-[#C9A227]/50 bg-[#12141D] text-[#E9E2D0]'
                            : 'border-dashed border-[#262A38] bg-transparent text-[#A69F8D]'
                    }`}
                >
                    {t('timeUnknown')}
                </button>

                <AnimatePresence>
                    {value.timeUnknown && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3">
                                <HelperNote>{t('timeUnknownHelper')}</HelperNote>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
