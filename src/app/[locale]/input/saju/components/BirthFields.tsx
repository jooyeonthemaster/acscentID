'use client'

// ============================================================
// BirthFields — 생시 입력 블록 (UI-SPEC §3.3, PartnerPhase §3.4 재사용)
// 양력/음력 세그먼트(+윤달) · 숫자 3필드 자동 이동 · 12지시 4×3 격자
// · 정확한 시각(보조 경로) · 시간 모름(삼주)
// ============================================================

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HOUR_BRANCHES, SAJU_EASE_SETTLE } from '@/components/saju'
import {
    branchIndexOfTime,
    getBirthDateError,
    type SajuBirthFieldsState,
} from '../constants'
import { FieldLabel, HelperNote } from './SajuAtoms'

interface BirthFieldsProps {
    value: SajuBirthFieldsState
    onChange: (patch: Partial<SajuBirthFieldsState>) => void
    /** 12지시 라벨 (본인: "태어난 시간" / 상대: "상대가 태어난 시간") */
    timeLabel: string
}

const digitsOnly = (raw: string) => raw.replace(/\D/g, '')

export function BirthFields({ value, onChange, timeLabel }: BirthFieldsProps) {
    const t = useTranslations('saju.input.birth')
    const [exactOpen, setExactOpen] = useState(!!value.exactTime)

    const yearRef = useRef<HTMLInputElement>(null)
    const monthRef = useRef<HTMLInputElement>(null)
    const dayRef = useRef<HTMLInputElement>(null)

    const error = getBirthDateError(value)
    const yearInvalid = error === 'yearRange' || error === 'futureDate'
    const monthNum = Number(value.birthMonth)
    const monthInvalid =
        error === 'futureDate' || (error === 'invalidDate' && (monthNum < 1 || monthNum > 12))
    const dayInvalid = error === 'futureDate' || (error === 'invalidDate' && !monthInvalid)

    const numberFieldClass = (invalid: boolean) =>
        `h-12 rounded-none border-0 border-b bg-transparent text-center font-sans text-[22px] text-[#E9E2D0] outline-none transition-colors placeholder:text-[#3A3E4C] ${
            invalid ? 'border-[#E2604E]' : 'border-[#262A38] focus:border-[#C9A227]'
        }`

    const handleYear = (raw: string) => {
        const year = digitsOnly(raw).slice(0, 4)
        onChange({ birthYear: year })
        if (year.length === 4) monthRef.current?.focus()
    }

    const handleMonth = (raw: string) => {
        const month = digitsOnly(raw).slice(0, 2)
        onChange({ birthMonth: month })
        // 2자리 완성 또는 4~9 첫 입력 즉시 → 일 필드로
        if (month.length === 2 || (month.length === 1 && Number(month) >= 4)) {
            dayRef.current?.focus()
        }
    }

    const handleDay = (raw: string) => {
        onChange({ birthDay: digitsOnly(raw).slice(0, 2) })
    }

    const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // 빈 필드에서 backspace → 이전 필드 복귀 (§3.3)
        if (e.key === 'Backspace' && value.birthMonth.length === 0) {
            yearRef.current?.focus()
        }
    }

    const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && value.birthDay.length === 0) {
            monthRef.current?.focus()
        }
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
            {/* 양력/음력 세그먼트 + 윤달 (날짜 필드보다 먼저 — §3.3) */}
            <div className="flex items-center gap-3">
                <div className="flex h-11 flex-1 rounded-md border border-[#262A38] bg-[#12141D] p-1">
                    {(['solar', 'lunar'] as const).map((cal) => {
                        const isActive = value.calendar === cal
                        return (
                            <button
                                key={cal}
                                type="button"
                                onClick={() => onChange({ calendar: cal, ...(cal === 'solar' && { isLeapMonth: false }) })}
                                className={`font-serif-kr flex-1 rounded text-[14px] transition-colors duration-300 ${
                                    isActive
                                        ? 'border border-[#C9A227]/50 bg-[#C9A227]/15 text-[#E9E2D0]'
                                        : 'border border-transparent text-[#A69F8D]'
                                }`}
                            >
                                {cal === 'solar' ? t('calendarSolar') : t('calendarLunar')}
                            </button>
                        )
                    })}
                </div>

                <AnimatePresence>
                    {value.calendar === 'lunar' && (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => onChange({ isLeapMonth: !value.isLeapMonth })}
                            className="flex flex-shrink-0 items-center gap-1.5"
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
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {value.calendar === 'lunar' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <p className="font-serif-kr break-keep pt-2.5 text-[12px] leading-[1.6] text-[#5C564A]">
                            {t('leapHelper')}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 생년월일 — 숫자 3필드 + 자동 포커스 이동 */}
            <div className="mt-7 flex items-end justify-center gap-2">
                <input
                    ref={yearRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    value={value.birthYear}
                    onChange={(e) => handleYear(e.target.value)}
                    placeholder="1998"
                    className={`w-[96px] ${numberFieldClass(yearInvalid)}`}
                />
                <span className="font-serif-kr pb-2 text-[15px] leading-none text-[#A69F8D]">{t('yearSuffix')}</span>
                <input
                    ref={monthRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-month"
                    value={value.birthMonth}
                    onChange={(e) => handleMonth(e.target.value)}
                    onKeyDown={handleMonthKeyDown}
                    placeholder="3"
                    className={`w-[64px] ${numberFieldClass(monthInvalid)}`}
                />
                <span className="font-serif-kr pb-2 text-[15px] leading-none text-[#A69F8D]">{t('monthSuffix')}</span>
                <input
                    ref={dayRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-day"
                    value={value.birthDay}
                    onChange={(e) => handleDay(e.target.value)}
                    onKeyDown={handleDayKeyDown}
                    placeholder="14"
                    className={`w-[64px] ${numberFieldClass(dayInvalid)}`}
                />
                <span className="font-serif-kr pb-2 text-[15px] leading-none text-[#A69F8D]">{t('daySuffix')}</span>
            </div>

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
                    <span className="font-serif-kr break-keep text-[12px] leading-[1.6] text-[#5C564A]">
                        {t('timeSub')}
                    </span>
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

                {/* 정확한 시각으로 입력하기 (보조 경로) */}
                {!value.timeUnknown && (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => setExactOpen((prev) => !prev)}
                            className="font-serif-kr text-[12px] leading-[1.6] text-[#C9A227] underline underline-offset-4"
                        >
                            {t('exactTimeLink')}
                        </button>

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
                                        className="mt-2.5 h-12 w-full rounded-md border border-[#262A38] bg-[#12141D] px-4 font-sans text-[15px] text-[#E9E2D0] outline-none transition-colors focus:border-[#C9A227]"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    {value.exactTime && matchedBranch !== null && (
                                        <p className="font-serif-kr break-keep mt-2 text-[12px] leading-[1.6] text-[#A69F8D]">
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
                    </div>
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
