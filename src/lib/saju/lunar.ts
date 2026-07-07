// 음력(윤달 포함) ↔ 양력 변환 — manseryeok(KASI 계열 데이터, 1391~2100) 래핑
//
// 선택 근거: npm `manseryeok` v2.0.0 (MIT)을 절기·사주 계산과 단일 SSOT로 채택.
// 후보였던 `korean-lunar-calendar` v0.4.0 (MIT, 1391~2050)은 devDependency로 유지하며
// __selftest__.ts에서 교차 검증 세컨드 오피니언으로만 사용한다.
// 앵커 검증: 설날 1990-01-27 / 2024-02-10 / 2025-01-29, 2023년 윤2월 1일 = 2023-03-22 (두 라이브러리 일치)

import { lunarToSolar as msLunarToSolar, solarToLunar as msSolarToLunar } from 'manseryeok'
import { SAJU_YEAR_RANGE } from './solar-terms'
import type { SajuDate } from './types'

function assertServiceYear(year: number, label: string): void {
    if (year < SAJU_YEAR_RANGE.from || year > SAJU_YEAR_RANGE.to) {
        throw new Error(`${label} 연도는 ${SAJU_YEAR_RANGE.from}~${SAJU_YEAR_RANGE.to} 범위여야 합니다: ${year}`)
    }
}

/** 음력 → 양력. 윤달 없는 달에 윤달 입력 등 잘못된 날짜는 한국어 메시지로 throw */
export function lunarToSolar(year: number, month: number, day: number, isLeapMonth = false): SajuDate {
    assertServiceYear(year, '음력')
    const solar = msLunarToSolar(year, month, day, isLeapMonth)
    return { year: solar.year, month: solar.month, day: solar.day }
}

/** 양력 → 음력 (연초 양력일은 전년도 음력으로 나올 수 있음) */
export function solarToLunar(year: number, month: number, day: number): SajuDate & { isLeapMonth: boolean } {
    assertServiceYear(year, '양력')
    const lunar = msSolarToLunar(year, month, day)
    return { year: lunar.year, month: lunar.month, day: lunar.day, isLeapMonth: lunar.isLeapMonth }
}
