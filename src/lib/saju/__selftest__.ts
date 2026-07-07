// 사주 엔진 자체 검증 스크립트 — 실행: npx tsx src/lib/saju/__selftest__.ts
// 검증 축: (1) KASI 발표 절기 앵커 (2) 독립 Meeus 천문 근사 교차검증 (3) korean-lunar-calendar 교차검증
//          (4) 위키백과 일진 앵커 (5) 리서치 dossier 전체 사주 앵커 (6) 관계·향 매핑·결정성

import KoreanLunarCalendar from 'korean-lunar-calendar'
import { perfumes } from '../../data/perfumes'
import {
    dayGanjiIndex, ganjiName, kstMinuteOf, monthGanIndex, monthJiIndex, toJDN, GAN, JI,
} from './calendar'
import { computePairRelations, computeSajuChart } from './chart'
import { lunarToSolar, solarToLunar } from './lunar'
import { getIpchun, getJeolOfYear, getSolarTermsOfYearKst, monthTermAt, sajuYearAt } from './solar-terms'
import { countScentsByElement, getScentCandidates, SCENT_ELEMENT_MAP } from './scent-map'
import type { Element, SajuBirthInput } from './types'

let passed = 0
let failed = 0
const fails: string[] = []

function check(name: string, cond: boolean, detail = ''): void {
    if (cond) {
        passed += 1
    } else {
        failed += 1
        fails.push(`${name}${detail ? ` — ${detail}` : ''}`)
        console.error(`  ✗ FAIL: ${name} ${detail}`)
    }
}

const solarInput = (year: number, month: number, day: number, hour?: number, minute?: number): SajuBirthInput => ({
    date: { year, month, day },
    calendar: 'solar',
    time: hour == null ? null : { hour, minute: minute ?? 0 },
    gender: 'male',
})

// ─── 독립 검증기: Meeus 저정밀 태양황경 + ΔT (엔진과 무관한 별도 구현) ───
const D2R = Math.PI / 180
function meeusSolarLongitude(jde: number): number {
    const T = (jde - 2451545.0) / 36525
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
        + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M)
    const T1 = (jde - 2415020.0) / 36525
    const pert = 0.00134 * Math.cos((153.23 + 22518.7541 * T1) * D2R)
        + 0.00154 * Math.cos((216.57 + 45037.5082 * T1) * D2R)
        + 0.002 * Math.cos((312.69 + 32964.3577 * T1) * D2R)
        + 0.00179 * Math.sin((350.74 + 445267.1142 * T1 - 0.00144 * T1 * T1) * D2R)
        + 0.00178 * Math.sin((231.19 + 20.2 * T1) * D2R)
    const omega = (125.04 - 1934.136 * T) * D2R
    return (((L0 + C + pert - 0.00569 - 0.00478 * Math.sin(omega)) % 360) + 360) % 360
}
function meeusDeltaT(y: number): number {
    let t: number
    if (y < 1941) { t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3 }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - (t * t) / 233 + t ** 3 / 2547 }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - (t * t) / 260 - t ** 3 / 718 }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5 }
    t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t
}
/** 목표 황경 도달 시각을 KST 절대 분으로 (독립 계산) */
function meeusTermKstMinute(year: number, targetLon: number, guessMonth: number, guessDay: number): number {
    let jde = toJDN(year, guessMonth, guessDay) - 0.5
    for (let i = 0; i < 8; i++) {
        let diff = targetLon - meeusSolarLongitude(jde)
        diff = (((diff + 180) % 360) + 360) % 360 - 180
        jde += diff / 0.9856473
    }
    const jdKst = jde - meeusDeltaT(year) / 86400 + 9 / 24
    const jdn = Math.floor(jdKst + 0.5)
    return jdn * 1440 + Math.round((jdKst + 0.5 - jdn) * 1440)
}

// ═══ 1. 율리우스일·일진 앵커 ═══
console.log('■ 1. 율리우스일·일진 60갑자')
check('JDN(2000-01-01)=2451545', toJDN(2000, 1, 1) === 2451545)
const dayName = (y: number, m: number, d: number): string => ganjiName(dayGanjiIndex(toJDN(y, m, d)))
check('일진 2024-01-01=갑자 (위키백과)', dayName(2024, 1, 1) === '갑자', dayName(2024, 1, 1))
check('일진 2000-01-01=무오 (dossier)', dayName(2000, 1, 1) === '무오', dayName(2000, 1, 1))
check('일진 1990-02-04=경자 (dossier)', dayName(1990, 2, 4) === '경자', dayName(1990, 2, 4))
check('일진 1949-10-01=갑자', dayName(1949, 10, 1) === '갑자')
check('일진 2025-02-24=갑자 (위키백과)', dayName(2025, 2, 24) === '갑자')
check('일진 2026-12-16=갑자 (위키백과)', dayName(2026, 12, 16) === '갑자')
// 연속성: 60일 주기 및 하루 +1
let continuity = true
const base = toJDN(2024, 1, 1)
for (let i = 0; i < 120; i++) {
    if (dayGanjiIndex(base + i) !== i % 60) { continuity = false; break }
}
check('일진 연속성 120일 (하루 +1, 60일 주기)', continuity)

// ═══ 2. 절기 — KASI 발표값 앵커 ═══
console.log('■ 2. 절기 시각 (KASI 앵커)')
function termKst(year: number, name: string): string {
    const t = getSolarTermsOfYearKst(year).find((x) => x.name === name)!
    const p = (n: number): string => String(n).padStart(2, '0')
    return `${t.kst.year}-${p(t.kst.month)}-${p(t.kst.day)} ${p(t.kst.hour)}:${p(t.kst.minute)}`
}
const exactAnchors: Array<[number, string, string]> = [
    [2024, '소한', '2024-01-06 05:49'], [2024, '입춘', '2024-02-04 17:27'], [2024, '경칩', '2024-03-05 11:23'],
    [2024, '청명', '2024-04-04 16:02'], [2024, '입하', '2024-05-05 09:10'], [2024, '망종', '2024-06-05 13:10'],
    [2024, '소서', '2024-07-06 23:20'], [2024, '입추', '2024-08-07 09:09'], [2024, '백로', '2024-09-07 12:11'],
    [2024, '한로', '2024-10-08 04:00'], [2024, '입동', '2024-11-07 07:20'], [2024, '대설', '2024-12-07 00:17'],
    [1990, '입춘', '1990-02-04 11:14'],
]
for (const [y, name, expect] of exactAnchors) {
    check(`${y} ${name} = ${expect}`, termKst(y, name) === expect, termKst(y, name))
}
// 2025/2026 입춘 — 2차 출처 간 ±1분 편차 → 허용오차 3분
const near = (y: number, name: string, em: number, tol: number): boolean => {
    const t = getSolarTermsOfYearKst(y).find((x) => x.name === name)!
    return Math.abs(t.kstMinute - em) <= tol
}
check('2025 입춘 ≈ 02-03 23:10 (±3분)', near(2025, '입춘', kstMinuteOf(2025, 2, 3, 23, 10), 3), termKst(2025, '입춘'))
check('2026 입춘 ≈ 02-04 05:02 (±3분)', near(2026, '입춘', kstMinuteOf(2026, 2, 4, 5, 2), 3), termKst(2026, '입춘'))

// 독립 Meeus 교차검증: 1930~2035 전 구간 12절, 허용 30분
const JEOL_LON: Array<[number, number, number]> = [
    [315, 2, 4], [345, 3, 6], [15, 4, 5], [45, 5, 6], [75, 6, 6], [105, 7, 7],
    [135, 8, 8], [165, 9, 8], [195, 10, 8], [225, 11, 7], [255, 12, 7], [285, 1, 6],
]
let maxDev = 0
let devCount = 0
for (let y = 1930; y <= 2035; y += 5) {
    const jeol = getJeolOfYear(y)
    for (const t of jeol) {
        const order = (t.index / 2 + 11) % 12
        const [lon, gm, gd] = JEOL_LON[order]
        const independent = meeusTermKstMinute(t.kst.year, lon, gm, gd)
        const dev = Math.abs(independent - t.kstMinute)
        maxDev = Math.max(maxDev, dev)
        if (dev > 30) devCount += 1
    }
}
check(`Meeus 독립 교차검증 1930~2035 (최대 편차 ${maxDev}분 ≤ 30분)`, devCount === 0 && maxDev <= 30)
console.log(`  (독립 천문 근사 vs KASI 테이블 최대 편차: ${maxDev}분)`)
check('사주년 경계 함수: 2024-02-04 17:26 → 2023', sajuYearAt(kstMinuteOf(2024, 2, 4, 17, 26), 2024) === 2023)
check('사주년 경계 함수: 2024-02-04 17:27 → 2024', sajuYearAt(kstMinuteOf(2024, 2, 4, 17, 27), 2024) === 2024)
check('입춘 조회 1930 동작', getIpchun(1930).kst.year === 1930)

// ═══ 3. 음양력 변환 ═══
console.log('■ 3. 음양력 변환 (설날·윤달 앵커 + korean-lunar-calendar 교차)')
const l2s = (y: number, m: number, d: number, leap = false): string => {
    const s = lunarToSolar(y, m, d, leap)
    return `${s.year}-${s.month}-${s.day}`
}
check('설날 1990 음1/1 → 1990-1-27', l2s(1990, 1, 1) === '1990-1-27', l2s(1990, 1, 1))
check('설날 2024 음1/1 → 2024-2-10', l2s(2024, 1, 1) === '2024-2-10')
check('설날 2025 음1/1 → 2025-1-29', l2s(2025, 1, 1) === '2025-1-29')
check('윤달 2023 윤2/1 → 2023-3-22', l2s(2023, 2, 1, true) === '2023-3-22')
check('평달 2023 2/1 → 2023-2-20', l2s(2023, 2, 1, false) === '2023-2-20')
const rt = solarToLunar(2024, 2, 10)
check('양 2024-2-10 → 음 2024-1-1(평)', rt.year === 2024 && rt.month === 1 && rt.day === 1 && !rt.isLeapMonth)

// korean-lunar-calendar 교차검증 (결정적 의사난수 300일: 음양력 + 일진 갑자)
const mulberry32 = (seed: number) => (): number => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rand = mulberry32(20260707)
const jdnLo = toJDN(1930, 1, 15)
const jdnHi = toJDN(2035, 12, 15)
let lunarMismatch = 0
let ganjiMismatch = 0
for (let i = 0; i < 300; i++) {
    const jdn = jdnLo + Math.floor(rand() * (jdnHi - jdnLo))
    const g: { year: number; month: number; day: number } = (() => {
        // fromJDN 인라인 (calendar.ts 재사용 없이 klc와만 대조하려는 게 아니라 날짜 산출용)
        const a = jdn + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((146097 * b) / 4)
        const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153)
        return { day: e - Math.floor((153 * m + 2) / 5) + 1, month: m + 3 - 12 * Math.floor(m / 10), year: 100 * b + d - 4800 + Math.floor(m / 10) }
    })()
    const klc = new KoreanLunarCalendar()
    if (!klc.setSolarDate(g.year, g.month, g.day)) continue
    const kl = klc.getLunarCalendar()
    const ours = solarToLunar(g.year, g.month, g.day)
    if (ours.year !== kl.year || ours.month !== kl.month || ours.day !== kl.day || ours.isLeapMonth !== (kl.intercalation === true)) lunarMismatch += 1
    const gapja = klc.getKoreanGapja()
    if (!gapja.day.startsWith(ganjiName(dayGanjiIndex(jdn)))) ganjiMismatch += 1
}
check('음양력 300일 무작위 교차검증 (manseryeok ↔ korean-lunar-calendar)', lunarMismatch === 0, `${lunarMismatch}건 불일치`)
check('일진 300일 무작위 교차검증 ((JDN+49) mod 60 ↔ korean-lunar-calendar)', ganjiMismatch === 0, `${ganjiMismatch}건 불일치`)

// ═══ 4. 년주 경계 (입춘 절입 시각) ═══
console.log('■ 4. 년주·월주 경계')
const pil = (c: ReturnType<typeof computeSajuChart>): string[] => [
    `${c.pillars.year.gan}${c.pillars.year.ji}`,
    `${c.pillars.month.gan}${c.pillars.month.ji}`,
    `${c.pillars.day.gan}${c.pillars.day.ji}`,
    c.pillars.hour ? `${c.pillars.hour.gan}${c.pillars.hour.ji}` : '-',
]
const b1990a = pil(computeSajuChart(solarInput(1990, 2, 4, 10, 30)))
const b1990b = pil(computeSajuChart(solarInput(1990, 2, 4, 11, 30)))
check('1990-02-04 10:30 (입춘 11:14 전) → 기사년 정축월', b1990a[0] === '기사' && b1990a[1] === '정축', b1990a.join(' '))
check('1990-02-04 11:30 (입춘 후) → 경오년 무인월', b1990b[0] === '경오' && b1990b[1] === '무인', b1990b.join(' '))
const b2024a = pil(computeSajuChart(solarInput(2024, 2, 4, 17, 0)))
const b2024b = pil(computeSajuChart(solarInput(2024, 2, 4, 18, 0)))
check('2024-02-04 17:00 (입춘 17:27 전) → 계묘년 을축월', b2024a[0] === '계묘' && b2024a[1] === '을축', b2024a.join(' '))
check('2024-02-04 18:00 (입춘 후) → 갑진년 병인월', b2024b[0] === '갑진' && b2024b[1] === '병인', b2024b.join(' '))

// 월주 12절 전체 스윕 (갑진년) — 엔진 결과 vs 독립 월두법(오호둔)
const MONTH_SWEEP: Array<[number, number, number, string]> = [
    [2024, 2, 15, '병인'], [2024, 3, 15, '정묘'], [2024, 4, 15, '무진'], [2024, 5, 15, '기사'],
    [2024, 6, 15, '경오'], [2024, 7, 15, '신미'], [2024, 8, 15, '임신'], [2024, 9, 15, '계유'],
    [2024, 10, 15, '갑술'], [2024, 11, 15, '을해'], [2024, 12, 15, '병자'], [2025, 1, 15, '정축'],
]
for (const [y, mo, d, expect] of MONTH_SWEEP) {
    const got = pil(computeSajuChart(solarInput(y, mo, d, 12, 0)))[1]
    const km = kstMinuteOf(y, mo, d, 12, 0)
    const { monthOrder } = monthTermAt(km, y)
    const independent = `${GAN[monthGanIndex(0, monthOrder)]}${JI[monthJiIndex(monthOrder)]}` // 갑진년: 년간 갑=0
    check(`월주 ${y}-${mo}-${d} = ${expect}`, got === expect && independent === expect, `엔진=${got} 독립=${independent}`)
}

// ═══ 5. 시주 — 진태양시(서울 126.978 + 균시차)·자시 경계·splitJasi ═══
console.log('■ 5. 시주·진태양시·자시')
const h1 = computeSajuChart(solarInput(2024, 6, 15, 12, 10))
check('2024-06-15 12:10 → 보정 ~11:37 → 오시', h1.pillars.hour?.ji === '오', pil(h1)[3])
const h2 = computeSajuChart(solarInput(2024, 6, 15, 11, 20))
check('2024-06-15 11:20 → 보정 ~10:47 → 사시', h2.pillars.hour?.ji === '사', pil(h2)[3])
const h3 = computeSajuChart(solarInput(2024, 1, 1, 23, 40))
check('2024-01-01 23:40 → splitJasi: 일주 갑자 유지 + 시주 병자(익일 을 기준)', pil(h3)[2] === '갑자' && pil(h3)[3] === '병자', pil(h3).join(' '))
check('  └ isJasiBirth = true', h3.isJasiBirth === true)
const h4 = computeSajuChart(solarInput(2024, 1, 1, 23, 10))
check('2024-01-01 23:10 → 보정 ~22:35 → 을해시 (자시 이탈)', pil(h4)[3] === '을해', pil(h4)[3])
check('  └ isJasiBirth = false', h4.isJasiBirth === false)
const h5 = computeSajuChart(solarInput(2024, 1, 2, 0, 30))
check('2024-01-02 00:30 → 보정 후 전일 23:54 야자시: 일주 갑자 + 병자시', pil(h5)[2] === '갑자' && pil(h5)[3] === '병자' && h5.isJasiBirth, pil(h5).join(' '))

// 서머타임: 1988-05-08~10-09 (KST+1h) — 벽시계 12:00 = 표준 11:00 → 보정 ~10:22 → 사시
const dst = computeSajuChart(solarInput(1988, 7, 15, 12, 0))
check('1988-07-15 12:00 (서머타임) → 신미일 계사시', pil(dst)[2] === '신미' && pil(dst)[3] === '계사', pil(dst).join(' '))
// 1954~1961 UTC+8:30 표준시대: 1958-06-15 12:00 (서머타임 중복 기간) → 계해일 정사시
const era = computeSajuChart(solarInput(1958, 6, 15, 12, 0))
check('1958-06-15 12:00 (UTC+8:30+서머타임) → 계해일 정사시', pil(era)[2] === '계해' && pil(era)[3] === '정사', pil(era).join(' '))

// ═══ 6. 전체 사주 재현 (dossier 앵커) + 명식 파생값 ═══
console.log('■ 6. 전체 사주 재현·오행·십성·용신')
const full = computeSajuChart(solarInput(1995, 8, 15, 4, 30))
check('1995-08-15 04:30 → 을해 갑신 무인 갑인', pil(full).join(' ') === '을해 갑신 무인 갑인', pil(full).join(' '))
check('  └ 띠 = 돼지 (해년)', full.zodiacAnimal === '돼지')
const raw = full.rawElementCount
check('  └ 겉글자 오행: 목5 화0 토1 금1 수1', raw.목 === 5 && raw.화 === 0 && raw.토 === 1 && raw.금 === 1 && raw.수 === 1, JSON.stringify(raw))
const wsum = (Object.values(full.elementCount) as number[]).reduce((a, b) => a + b, 0)
check('  └ 가중 오행 합 = 8 (±0.05)', Math.abs(wsum - 8) < 0.05, String(wsum))
check('  └ 일간 무토·신약 (득령·득지·득세 모두 없음)', full.dayMaster.gan === '무' && full.dayMaster.strength === '신약' && !full.dayMaster.deukryeong && !full.dayMaster.deukji, `${full.dayMaster.gan} ${full.dayMaster.strength}`)
check('  └ 용신 = 화 (결핍 규칙)', full.yongsin.element === '화' && full.yongsin.reason === 'lacking', `${full.yongsin.element}/${full.yongsin.reason}`)
check('  └ 결핍 오행 최전순위 = 화', full.lackingElements[0] === '화', full.lackingElements.join(','))
check('  └ 희신 = 목 (화를 생함)', full.yongsin.heesin === '목')
const sipSum = (Object.values(full.sipseong) as number[]).reduce((a, b) => a + b, 0)
check('  └ 십성 합 = 7 (일간 제외 겉글자)', sipSum === 7, String(sipSum))
const kinds = full.jijiRelations.map((r) => `${r.kind}:${r.branches.join('')}`)
check('  └ 지지관계: 인해육합·인신충 검출', kinds.some((k) => k.startsWith('육합:')) && kinds.some((k) => k.startsWith('충:')), kinds.join(' '))

// 음력 입력 → 입춘 경계와 교차: 음력 1990-01-01(설날, 양 1990-01-27) → 아직 기사년
const lunarChart = computeSajuChart({ date: { year: 1990, month: 1, day: 1 }, calendar: 'lunar', time: { hour: 12, minute: 0 }, gender: 'female' })
check('음력 1990-1-1 입력 → 양력 1990-01-27 변환', lunarChart.solarDate.year === 1990 && lunarChart.solarDate.month === 1 && lunarChart.solarDate.day === 27)
check('  └ 설날생이지만 입춘 전 → 년주 기사 (경오 아님)', `${lunarChart.pillars.year.gan}${lunarChart.pillars.year.ji}` === '기사', pil(lunarChart)[0])

// 시간 모름 → 삼주
const three = computeSajuChart(solarInput(1995, 8, 15))
check('시간 모름 → hour null·isThreePillar·6유닛', three.pillars.hour === null && three.isThreePillar && three.totalUnits === 6)
const sipSum3 = (Object.values(three.sipseong) as number[]).reduce((a, b) => a + b, 0)
check('  └ 삼주 십성 합 = 5, 신강약 만점 8', sipSum3 === 5 && three.dayMaster.strengthMax === 8, `${sipSum3}/${three.dayMaster.strengthMax}`)

// 결정성
const detA = JSON.stringify(computeSajuChart(solarInput(1995, 8, 15, 4, 30)))
const detB = JSON.stringify(computeSajuChart(solarInput(1995, 8, 15, 4, 30)))
check('결정성: 동일 입력 → 동일 출력', detA === detB)

// 입력 가드
const throws = (fn: () => unknown): boolean => { try { fn(); return false } catch { return true } }
check('1929년 입력 거부', throws(() => computeSajuChart(solarInput(1929, 5, 5, 12, 0))))
check('2036년 입력 거부', throws(() => computeSajuChart(solarInput(2036, 1, 1, 12, 0))))
check('없는 양력 날짜(2023-02-29) 거부', throws(() => computeSajuChart(solarInput(2023, 2, 29, 12, 0))))
check('없는 윤달(2024 윤2월) 거부', throws(() => lunarToSolar(2024, 2, 1, true)))

// ═══ 7. 궁합 관계 ═══
console.log('■ 7. 궁합 (합충형해파·상보 점수)')
const A = computeSajuChart(solarInput(2024, 1, 1, 12, 0)) // 갑자일
const B = computeSajuChart(solarInput(2024, 1, 2, 12, 0)) // 을축일
const AB = computePairRelations(A, B)
check('자축 육합(→토) 일지 관계 검출', AB.iljiRelations.some((h) => h.kind === '육합' && h.element === '토'), JSON.stringify(AB.iljiRelations.map((h) => h.kind)))
const C = computeSajuChart(solarInput(2024, 1, 3, 12, 0)) // 병인일
const D = computeSajuChart(solarInput(2024, 1, 9, 12, 0)) // 임신일
const CD = computePairRelations(C, D)
check('인신 충 일지 관계 검출', CD.iljiRelations.some((h) => h.kind === '충'), JSON.stringify(CD.iljiRelations.map((h) => h.kind)))
check('인신 형(인사신 부분형)도 함께 검출', CD.iljiRelations.some((h) => h.kind === '형'))
const E = computeSajuChart(solarInput(2024, 1, 6, 12, 0)) // 기사일
const AE = computePairRelations(A, E)
check('갑기 천간합(→토) 일간끼리 검출', AE.ilganHap !== null && AE.ilganHap.element === '토', String(AE.ilganHap?.description))
check('상보 점수 0~100', AB.elementComplementScore >= 0 && AB.elementComplementScore <= 100, String(AB.elementComplementScore))
const combSum = (Object.values(AB.combinedElementCount) as number[]).reduce((a, b) => a + b, 0)
check('합산 오행 = 16 (±0.1)', Math.abs(combSum - 16) < 0.1, String(combSum))

// ═══ 8. 향 매핑 ═══
console.log('■ 8. 오행→향 매핑')
check('30종 전수 태깅', SCENT_ELEMENT_MAP.length === 30)
const perfumeIds = new Set(perfumes.map((p) => p.id))
check('perfumes.ts id 전부 일치', SCENT_ELEMENT_MAP.every((e) => perfumeIds.has(e.id)) && new Set(SCENT_ELEMENT_MAP.map((e) => e.id)).size === 30)
check('이름 표기 일치', SCENT_ELEMENT_MAP.every((e) => perfumes.find((p) => p.id === e.id)?.name === e.name))
const counts = countScentsByElement()
check('전 오행 primary ≥ 4종', (Object.values(counts) as number[]).every((n) => n >= 4), JSON.stringify(counts))
check('primary ≠ secondary', SCENT_ELEMENT_MAP.every((e) => e.primaryElement !== e.secondaryElement))
check('근거 문장 형식 (노트 기반 1문장)', SCENT_ELEMENT_MAP.every((e) => e.rationale.length > 20 && e.rationale.endsWith('다.')))
const cands = getScentCandidates('화', ['화', '수'])
check('getScentCandidates(화, [화,수]) 상위는 화 primary', cands.length === 8 && cands.slice(0, 4).every((c) => c.primaryElement === '화'), cands.slice(0, 4).map((c) => c.id).join(','))
const els: Element[] = ['목', '화', '토', '금', '수']
check('모든 용신에 대해 후보 ≥ 5종 (score>0)', els.every((el) => getScentCandidates(el, [el]).filter((c) => c.score > 0).length >= 5))

// ═══ 결과 ═══
console.log(`  (오행별 primary 분포: ${JSON.stringify(counts)})`)
console.log(`\n═══ 자체 검증 완료: ${passed} PASS / ${failed} FAIL ═══`)
if (failed > 0) {
    console.error('실패 목록:')
    for (const f of fails) console.error(` - ${f}`)
    process.exit(1)
}
