// ============================================================
// 사주 분석 퍼퓸 사주 문진 위저드 입력 위저드 — 상수/폼 상태 (UI-SPEC §3.0)
// 타입 계약(SajuAnalyzeRequest / SAJU_RELATION_OPTIONS 등)은
// src/types/analysis.ts 가 SSOT — 절대 재정의하지 않는다.
// ============================================================

import type { SajuBirthInput, SajuPurpose, SAJU_RELATION_OPTIONS } from '@/types/analysis'

export type SajuPhase = 'gate' | 'purpose' | 'birth' | 'partner' | 'wish' | 'seal'

export type SajuRelationId = (typeof SAJU_RELATION_OPTIONS)[number]['id']

/** ProgressThread 단계 (일반 5 / 궁합 6 — §3.0) */
export const SAJU_PHASE_STEPS: { key: SajuPhase; hanja: string }[] = [
    { key: 'gate', hanja: '入' },
    { key: 'purpose', hanja: '望' },
    { key: 'birth', hanja: '時' },
    { key: 'partner', hanja: '對' },
    { key: 'wish', hanja: '願' },
    { key: 'seal', hanja: '封' },
]

/** 목적 낙관 한자 (UI-SPEC §3.2 표 — 命/緣/財/業/合) */
export const SAJU_PURPOSE_HANJA: Record<SajuPurpose, string> = {
    general: '命',
    love: '緣',
    wealth: '財',
    career: '業',
    compatibility: '合',
}

/** 위저드 표시 순서 (2×2 + 궁합 full-width) */
export const SAJU_PURPOSE_ORDER: SajuPurpose[] = ['general', 'love', 'wealth', 'career', 'compatibility']

/** 계산 엔진 테이블 범위 (DESIGN.md §3) */
export const SAJU_YEAR_MIN = 1930
export const SAJU_YEAR_MAX = 2035

// ---------- 폼 상태 (§3.0) ----------

export interface SajuBirthFieldsState {
    calendar: 'solar' | 'lunar'
    isLeapMonth: boolean
    birthYear: string
    birthMonth: string
    birthDay: string
    /** 0(자)~11(해) */
    hourBranch: number | null
    /** 'HH:MM' — 정확한 시각 직접 입력 시 */
    exactTime: string | null
    timeUnknown: boolean
}

export interface SajuPartnerState extends SajuBirthFieldsState {
    name: string
    gender: 'male' | 'female' | 'other' | ''
    relation: SajuRelationId | null
}

export interface SajuFormState extends SajuBirthFieldsState {
    pin: string
    targetType: 'idol' | 'self'
    name: string
    gender: 'male' | 'female' | 'other' | ''
    purpose: SajuPurpose | null
    partner: SajuPartnerState
    wish: string
}

export const INITIAL_BIRTH_FIELDS: SajuBirthFieldsState = {
    calendar: 'solar',
    isLeapMonth: false,
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    hourBranch: null,
    exactTime: null,
    timeUnknown: false,
}

export const INITIAL_SAJU_FORM: SajuFormState = {
    ...INITIAL_BIRTH_FIELDS,
    pin: '',
    targetType: 'self',
    name: '',
    gender: '',
    purpose: null,
    partner: {
        ...INITIAL_BIRTH_FIELDS,
        name: '',
        gender: '',
        relation: null,
    },
    wish: '',
}

// ---------- 생년월일 검증 (§3.3) ----------

export type SajuBirthErrorKey = 'yearRange' | 'invalidDate' | 'futureDate'

function daysInSolarMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

/**
 * 입력이 "완성된" 시점에만 오류 키를 돌려준다(미완성 = null, 단 버튼은 비활성).
 * - 연 1930~2035 / 월 1~12 / 일 1~31 + 월별·윤년 검증 / 미래 날짜 불가 / 음력 30일 상한
 */
export function getBirthDateError(fields: SajuBirthFieldsState): SajuBirthErrorKey | null {
    const { birthYear, birthMonth, birthDay, calendar } = fields
    if (birthYear.length === 4) {
        const y = Number(birthYear)
        if (y < SAJU_YEAR_MIN || y > SAJU_YEAR_MAX) return 'yearRange'
    }
    if (birthYear.length !== 4 || birthMonth.length === 0 || birthDay.length === 0) return null

    const y = Number(birthYear)
    const m = Number(birthMonth)
    const d = Number(birthDay)
    if (m < 1 || m > 12 || d < 1) return 'invalidDate'
    const maxDay = calendar === 'lunar' ? 30 : daysInSolarMonth(y, m)
    if (d > maxDay) return 'invalidDate'

    const today = new Date()
    const todayNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    if (y * 10000 + m * 100 + d > todayNum) return 'futureDate'
    return null
}

/** 생년월일 + 시간 선택이 제출 가능한 상태인가 */
export function isBirthFieldsValid(fields: SajuBirthFieldsState): boolean {
    const filled =
        fields.birthYear.length === 4 && fields.birthMonth.length > 0 && fields.birthDay.length > 0
    if (!filled) return false
    if (getBirthDateError(fields) !== null) return false
    return fields.timeUnknown || fields.hourBranch !== null
}

// ---------- 시진 유틸 (§3.3) ----------

/** 'HH:MM' → 12지시 인덱스 (자시 23:00–00:59 경계) */
export function branchIndexOfTime(exactTime: string): number | null {
    const h = Number(exactTime.slice(0, 2))
    if (Number.isNaN(h) || h < 0 || h > 23) return null
    return Math.floor(((h + 1) % 24) / 2)
}

/** 12지시 인덱스 → 대표 시각 (자시=00:00 조자시 기준, 이후 2시간 간격 정각) */
export function representativeHourOfBranch(branchIndex: number): number {
    return (branchIndex * 2) % 24
}

/** 폼 필드 → SajuAnalyzeRequest.birth (frozen 계약 — types/analysis.ts) */
export function buildBirthInput(fields: SajuBirthFieldsState): SajuBirthInput {
    let hour: number | null = null
    let minute: number | null = null
    if (!fields.timeUnknown) {
        if (fields.exactTime) {
            hour = Number(fields.exactTime.slice(0, 2))
            minute = Number(fields.exactTime.slice(3, 5))
            if (Number.isNaN(hour)) hour = null
            if (Number.isNaN(minute)) minute = hour === null ? null : 0
        } else if (fields.hourBranch !== null) {
            hour = representativeHourOfBranch(fields.hourBranch)
            minute = 0
        }
    }
    return {
        year: Number(fields.birthYear),
        month: Number(fields.birthMonth),
        day: Number(fields.birthDay),
        hour,
        minute,
        calendar: fields.calendar,
        ...(fields.calendar === 'lunar' && { isLeapMonth: fields.isLeapMonth }),
    }
}
