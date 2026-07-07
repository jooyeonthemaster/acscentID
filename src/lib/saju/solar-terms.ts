// 절기 시각 — manseryeok(KASI 분 단위 데이터, 1800~2300) 래핑 + KST 변환/월지 매핑
// 정확도 검증: 2024 전 절기·1990 입춘(11:14)·2025/2026 입춘이 KASI 발표값과 분 단위 일치,
// 독립 Meeus 근사 계산과 1930~2035 전 구간 ±5분 이내 상호 일치 (__selftest__.ts)

import { getSolarTermsOfYear as msTermsOfYear } from 'manseryeok'
import { kstMinuteOf } from './calendar'

/** 엔진이 보증하는 서비스 연도 범위 (라이브러리 자체는 1800~2300 지원) */
export const SAJU_YEAR_RANGE = { from: 1930, to: 2035 } as const

export interface SolarTermKst {
    /** 0=소한 … 23=동지 (짝수 = 절節, 홀수 = 중기中氣) */
    index: number
    name: string
    hanja: string
    kst: { year: number; month: number; day: number; hour: number; minute: number }
    /** KST 절대 분 인덱스 (비교용) */
    kstMinute: number
}

const termCache = new Map<number, SolarTermKst[]>()

function utcDateToKst(date: Date): SolarTermKst['kst'] {
    const t = new Date(date.getTime() + 9 * 3600 * 1000)
    return {
        year: t.getUTCFullYear(),
        month: t.getUTCMonth() + 1,
        day: t.getUTCDate(),
        hour: t.getUTCHours(),
        minute: t.getUTCMinutes(),
    }
}

/** 해당 연도의 24절기 (KST, 시간순) */
export function getSolarTermsOfYearKst(year: number): SolarTermKst[] {
    const cached = termCache.get(year)
    if (cached) return cached
    const terms = msTermsOfYear(year).map((t) => {
        const kst = utcDateToKst(t.date)
        return {
            index: t.index,
            name: t.name,
            hanja: t.hanja,
            kst,
            kstMinute: kstMinuteOf(kst.year, kst.month, kst.day, kst.hour, kst.minute),
        }
    })
    termCache.set(year, terms)
    return terms
}

/** 해당 연도의 12절(節) — 월주 경계 (입춘~소한, 짝수 인덱스) */
export function getJeolOfYear(year: number): SolarTermKst[] {
    return getSolarTermsOfYearKst(year).filter((t) => t.index % 2 === 0)
}

/** 입춘 절입 시각 — 년주 경계 */
export function getIpchun(year: number): SolarTermKst {
    const term = getSolarTermsOfYearKst(year).find((t) => t.name === '입춘')
    if (!term) throw new Error(`입춘 데이터 없음: ${year}`)
    return term
}

/**
 * 주어진 KST 순간의 사주년 (입춘 절입 시각 경계, 시각 단위 비교).
 * 절기 비교는 표준시(KST) 순간 그대로 사용한다 — 절입은 절대 순간이므로 진태양시 보정 대상이 아님.
 */
export function sajuYearAt(kstMinute: number, civilYear: number): number {
    return kstMinute >= getIpchun(civilYear).kstMinute ? civilYear : civilYear - 1
}

/**
 * 주어진 KST 순간이 속한 절(節)과 월 순서(0=인월 … 11=축월).
 * 각 절기 절입 시각(exact datetime)이 월주 경계다.
 */
export function monthTermAt(kstMinute: number, civilYear: number): { term: SolarTermKst; monthOrder: number } {
    const jeol = [...getJeolOfYear(civilYear - 1), ...getJeolOfYear(civilYear)]
    let current: SolarTermKst | null = null
    for (const t of jeol) {
        if (t.kstMinute <= kstMinute) current = t
        else break
    }
    if (!current) throw new Error(`절기 범위 밖: ${civilYear}`)
    // 절 인덱스 → 월 순서: 입춘(2)→0(인월), 경칩(4)→1 … 소한(0)→11(축월)
    return { term: current, monthOrder: (current.index / 2 + 11) % 12 }
}
