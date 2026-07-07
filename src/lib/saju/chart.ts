// 사주 원국 계산 + 궁합 관계 — 대원칙: AI는 계산하지 않는다. 이 코드가 계산하고 AI는 해석만 한다.
//
// 계산 규약 (근거는 README.md):
// - 만세력 코어: manseryeok v2.0.0 (KASI 절기 분 단위 데이터·서머타임/1954~61 UTC+8:30 자동 처리)
// - 진태양시: 서울 경도 126.978°E + 균시차 보정 (trueSolarTime 옵션)
// - 일 경계: splitJasi — 일주는 자정(00:00) 경계 유지, 23시대 출생의 시주 천간만 익일 일간 기준 (국내 관행)
// - 년주/월주 경계: 입춘·절기 절입 시각의 exact datetime 비교 (표준시 순간 기준 — 절입은 절대 순간)
// - 시간 모름: 정오(12:00)로 년/월/일주 계산, 시주 null → 삼주(三柱)

import { calculateFourPillars } from 'manseryeok'
import {
    banhapOf, cheonganHap, CONTROLS, ELEMENT_HANJA, fromJDN, GAN_ELEMENT, GAN_HANJA, ganIndex,
    ganYinYang, GENERATES, GENERATOR_OF, hiddenStemsOf, isChung, isHae, isHyeong, isPa,
    JI_ANIMAL, JI_ELEMENT, JI_HANJA, jiIndex, jiYinYang, principalStemOf, samhapOf, sipseongOf,
    toJDN, yukhapOf,
} from './calendar'
import { lunarToSolar, solarToLunar } from './lunar'
import { SAJU_YEAR_RANGE } from './solar-terms'
import type {
    Element, ElementCount, Gan, Ji, JijiRelationHit, PairCharRef, PairRelationHit, PairRelations,
    Pillar, PillarPosition, SajuBirthInput, SajuChart, Sipseong, SipseongGroup, YongsinInfo,
    YongsinReason,
} from './types'

export const SEOUL_LONGITUDE = 126.978

const ELEMENTS: readonly Element[] = ['목', '화', '토', '금', '수']
const POSITIONS: readonly PillarPosition[] = ['년주', '월주', '일주', '시주']
const SIPSEONG_KEYS: readonly Sipseong[] = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
const SIPSEONG_GROUP_OF: Record<Sipseong, SipseongGroup> = {
    비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성',
    정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
}

const emptyCount = (): ElementCount => ({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 })
const round2 = (n: number): number => Math.round(n * 100) / 100

function makePillar(gan: Gan, ji: Ji): Pillar {
    const gi = ganIndex(gan)
    const ji12 = jiIndex(ji)
    return {
        gan,
        ji,
        ganHanja: GAN_HANJA[gi],
        jiHanja: JI_HANJA[ji12],
        ganElement: GAN_ELEMENT[gi],
        jiElement: JI_ELEMENT[ji12],
        ganYinYang: ganYinYang(gi),
        jiYinYang: jiYinYang(ji12),
        jiAnimal: JI_ANIMAL[ji12],
        hiddenStems: hiddenStemsOf(ji),
    }
}

function validateInput(input: SajuBirthInput): void {
    const { year, month, day } = input.date
    if (year < SAJU_YEAR_RANGE.from || year > SAJU_YEAR_RANGE.to) {
        throw new Error(`생년은 ${SAJU_YEAR_RANGE.from}~${SAJU_YEAR_RANGE.to} 범위여야 합니다: ${year}`)
    }
    if (month < 1 || month > 12) throw new Error(`월이 올바르지 않습니다: ${month}`)
    if (day < 1 || day > 31) throw new Error(`일이 올바르지 않습니다: ${day}`)
    if (input.calendar === 'solar') {
        const back = fromJDN(toJDN(year, month, day))
        if (back.year !== year || back.month !== month || back.day !== day) {
            throw new Error(`존재하지 않는 양력 날짜입니다: ${year}-${month}-${day}`)
        }
    }
    const t = input.time
    if (t != null && (t.hour < 0 || t.hour > 23 || t.minute < 0 || t.minute > 59)) {
        throw new Error(`시각이 올바르지 않습니다: ${t.hour}:${t.minute}`)
    }
}

interface CountResult {
    weighted: ElementCount
    raw: ElementCount
    totalUnits: number
}

/** 오행 분포 — 천간 글자당 1.0, 지지 글자당 1.0을 지장간 일수비로 분배 (README '지장간 가중' 항목) */
function countElements(pillars: Pillar[]): CountResult {
    const weighted = emptyCount()
    const raw = emptyCount()
    for (const p of pillars) {
        weighted[p.ganElement] += 1
        raw[p.ganElement] += 1
        raw[p.jiElement] += 1
        for (const h of p.hiddenStems) weighted[h.element] += h.weight
    }
    for (const el of ELEMENTS) weighted[el] = round2(weighted[el])
    return { weighted, raw, totalUnits: pillars.length * 2 }
}

interface StrengthResult {
    strength: SajuChart['dayMaster']['strength']
    score: number
    max: number
    deukryeong: boolean
    deukji: boolean
    deukse: boolean
}

/** 신강약 — 득령(월지 본기 +3)·득지(일지 본기 +2)·득세(그 외 글자 개당 +1) 점수제 (README 문서화) */
function judgeStrength(dayGan: Gan, pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): StrengthResult {
    const dayEl = GAN_ELEMENT[ganIndex(dayGan)]
    const supports = (el: Element): boolean => el === dayEl || GENERATES[el] === dayEl

    const branchEl = (p: Pillar): Element => GAN_ELEMENT[ganIndex(principalStemOf(p.ji))]
    const deukryeong = supports(branchEl(pillars.month))
    const deukji = supports(branchEl(pillars.day))

    // 그 외 글자: 년간·월간·(시간)·년지·(시지) — 월지/일지/일간 제외
    const others: Element[] = [
        pillars.year.ganElement,
        pillars.month.ganElement,
        branchEl(pillars.year),
    ]
    if (pillars.hour) {
        others.push(pillars.hour.ganElement, branchEl(pillars.hour))
    }
    const supportCount = others.filter(supports).length
    const deukse = supportCount >= Math.ceil(others.length * 0.6)

    const score = (deukryeong ? 3 : 0) + (deukji ? 2 : 0) + supportCount
    const max = 5 + others.length
    const ratio = score / max
    const strength = ratio >= 0.55 ? '신강' : ratio <= 0.38 ? '신약' : '중화'
    return { strength, score, max, deukryeong, deukji, deukse }
}

/**
 * 용신 — 1차 규칙: 오행 분포 최소치(결핍)를 보완 대상으로 삼는다.
 * 동률(±0.01)일 때 조후 타이브레이크: 겨울(해자축월)생이면 화, 여름(사오미월)생이면 수를 우선.
 * 그래도 남으면 목화토금수 순서 중 첫 후보. (리서치 dossier 확정 규칙)
 */
function decideYongsin(weighted: ElementCount, monthJi: Ji): YongsinInfo {
    const min = Math.min(...ELEMENTS.map((el) => weighted[el]))
    const candidates = ELEMENTS.filter((el) => weighted[el] <= min + 0.01)

    let element: Element = candidates[0]
    let reason: YongsinReason = 'lacking'
    if (candidates.length > 1) {
        const winter = ['해', '자', '축'].includes(monthJi)
        const summer = ['사', '오', '미'].includes(monthJi)
        if (winter && candidates.includes('화')) {
            element = '화'
            reason = 'season_cold'
        } else if (summer && candidates.includes('수')) {
            element = '수'
            reason = 'season_hot'
        }
    }

    const hanja = ELEMENT_HANJA[element]
    const reasonText =
        reason === 'season_cold'
            ? `추운 계절(${monthJi}월)에 태어나 원국의 온기가 부족하므로, 조후상 따뜻한 화(火) 기운을 용신으로 삼습니다.`
            : reason === 'season_hot'
                ? `더운 계절(${monthJi}월)에 태어나 원국의 열기가 강하므로, 조후상 서늘한 수(水) 기운을 용신으로 삼습니다.`
                : `원국의 오행 가운데 ${element}(${hanja}) 기운이 ${weighted[element]}으로 가장 약하여, 이 부족한 기운을 채우는 것을 용신으로 삼습니다.`

    return { element, reason, reasonText, heesin: GENERATOR_OF[element] }
}

/** 원국 내부 지지 합충형해파 — 완성 삼합의 구성 반합은 중복 보고하지 않음 */
function findJijiRelations(pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): JijiRelationHit[] {
    const entries: Array<{ ji: Ji; position: PillarPosition }> = [
        { ji: pillars.year.ji, position: '년주' },
        { ji: pillars.month.ji, position: '월주' },
        { ji: pillars.day.ji, position: '일주' },
    ]
    if (pillars.hour) entries.push({ ji: pillars.hour.ji, position: '시주' })

    const hits: JijiRelationHit[] = []
    const samhapMembers = new Set<string>()

    // 삼합 (3글자 조합)
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            for (let k = j + 1; k < entries.length; k++) {
                const el = samhapOf(entries[i].ji, entries[j].ji, entries[k].ji)
                if (el) {
                    hits.push({
                        kind: '삼합',
                        branches: [entries[i].ji, entries[j].ji, entries[k].ji],
                        positions: [entries[i].position, entries[j].position, entries[k].position],
                        element: el,
                    })
                    for (const key of [`${i}-${j}`, `${j}-${k}`, `${i}-${k}`]) samhapMembers.add(key)
                }
            }
        }
    }

    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const a = entries[i]
            const b = entries[j]
            const push = (kind: JijiRelationHit['kind'], element?: Element): void => {
                hits.push({ kind, branches: [a.ji, b.ji], positions: [a.position, b.position], ...(element ? { element } : {}) })
            }
            const yukhap = yukhapOf(a.ji, b.ji)
            if (yukhap) push('육합', yukhap)
            const banhap = banhapOf(a.ji, b.ji)
            if (banhap && !samhapMembers.has(`${i}-${j}`)) push('반합', banhap)
            if (isChung(a.ji, b.ji)) push('충')
            if (isHyeong(a.ji, b.ji)) push('형')
            if (isHae(a.ji, b.ji)) push('해')
            if (isPa(a.ji, b.ji)) push('파')
        }
    }
    return hits
}

/** 사주 원국 계산 — DESIGN.md §3 계약 */
export function computeSajuChart(input: SajuBirthInput): SajuChart {
    validateInput(input)

    const solarDate =
        input.calendar === 'lunar'
            ? lunarToSolar(input.date.year, input.date.month, input.date.day, input.isLeapMonth === true)
            : input.date
    if (solarDate.year < SAJU_YEAR_RANGE.from || solarDate.year > SAJU_YEAR_RANGE.to) {
        throw new Error(`변환된 양력 연도가 서비스 범위를 벗어납니다: ${solarDate.year}`)
    }
    const lunarDate = solarToLunar(solarDate.year, solarDate.month, solarDate.day)

    const hasTime = input.time != null
    const result = calculateFourPillars({
        year: solarDate.year,
        month: solarDate.month,
        day: solarDate.day,
        hour: hasTime ? input.time!.hour : 12,
        minute: hasTime ? input.time!.minute : 0,
        trueSolarTime: { longitude: SEOUL_LONGITUDE },
        dayBoundary: 'splitJasi',
        gender: input.gender,
    })

    const yearPillar = makePillar(result.year.heavenlyStem as Gan, result.year.earthlyBranch as Ji)
    const monthPillar = makePillar(result.month.heavenlyStem as Gan, result.month.earthlyBranch as Ji)
    const dayPillar = makePillar(result.day.heavenlyStem as Gan, result.day.earthlyBranch as Ji)
    const hourPillar = hasTime ? makePillar(result.hour.heavenlyStem as Gan, result.hour.earthlyBranch as Ji) : null
    const pillars = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar }

    const activePillars = hourPillar ? [yearPillar, monthPillar, dayPillar, hourPillar] : [yearPillar, monthPillar, dayPillar]
    const { weighted, raw, totalUnits } = countElements(activePillars)

    // 십성 — 일간 제외 천간 + 전체 지지 본기
    const dayGan = dayPillar.gan
    const sipseong = Object.fromEntries(SIPSEONG_KEYS.map((k) => [k, 0])) as Record<Sipseong, number>
    const stemTargets: Gan[] = [yearPillar.gan, monthPillar.gan]
    if (hourPillar) stemTargets.push(hourPillar.gan)
    const branchTargets = activePillars.map((p) => principalStemOf(p.ji))
    for (const gan of [...stemTargets, ...branchTargets]) sipseong[sipseongOf(dayGan, gan)] += 1
    const sipseongGroups: Record<SipseongGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
    for (const k of SIPSEONG_KEYS) sipseongGroups[SIPSEONG_GROUP_OF[k]] += sipseong[k]

    const st = judgeStrength(dayGan, pillars)
    const yongsin = decideYongsin(weighted, monthPillar.ji)

    // 결핍/과다 — 임계치는 README 문서화 (결핍: 총량의 12.5% 미만, 과다: 28% 이상)
    const lackThreshold = totalUnits * 0.125
    const domThreshold = totalUnits * 0.28
    const asc = [...ELEMENTS].sort((x, y) => weighted[x] - weighted[y])
    const lacking = asc.filter((el) => weighted[el] < lackThreshold)
    const lackingElements = lacking.length > 0 ? lacking : [asc[0]]
    const desc = [...asc].reverse()
    const dominant = desc.filter((el) => weighted[el] >= domThreshold)
    const dominantElements = dominant.length > 0 ? dominant : [desc[0]]

    const dayGanIdx = ganIndex(dayGan)
    return {
        input,
        solarDate,
        lunarDate,
        pillars,
        isThreePillar: !hasTime,
        isJasiBirth: hasTime && hourPillar!.ji === '자',
        zodiacAnimal: yearPillar.jiAnimal,
        elementCount: weighted,
        rawElementCount: raw,
        totalUnits,
        dayMaster: {
            gan: dayGan,
            hanja: GAN_HANJA[dayGanIdx],
            element: GAN_ELEMENT[dayGanIdx],
            yinYang: ganYinYang(dayGanIdx),
            strength: st.strength,
            strengthScore: st.score,
            strengthMax: st.max,
            deukryeong: st.deukryeong,
            deukji: st.deukji,
            deukse: st.deukse,
        },
        sipseong,
        sipseongGroups,
        yongsin,
        lackingElements,
        dominantElements,
        jijiRelations: findJijiRelations(pillars),
        meta: {
            longitude: SEOUL_LONGITUDE,
            dayBoundary: 'splitJasi',
            trueSolarTime: true,
            engine: 'manseryeok@2',
        },
    }
}

// ─── 궁합 ───

interface CharEntry {
    ref: PairCharRef
    gan?: Gan
    ji?: Ji
}

function collectChars(chart: SajuChart, owner: 'A' | 'B'): { stems: CharEntry[]; branches: CharEntry[] } {
    const stems: CharEntry[] = []
    const branches: CharEntry[] = []
    const list: Array<[PillarPosition, Pillar | null]> = POSITIONS.map((pos, i) => [
        pos,
        [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour][i],
    ])
    for (const [position, pillar] of list) {
        if (!pillar) continue
        stems.push({ ref: { owner, position, char: pillar.gan }, gan: pillar.gan })
        branches.push({ ref: { owner, position, char: pillar.ji }, ji: pillar.ji })
    }
    return { stems, branches }
}

/** 두 원국 간 천간합·지지 육합/반합/충/형/해/파 + 오행 상보 점수 — 궁합 해석의 계산 근거 */
export function computePairRelations(chartA: SajuChart, chartB: SajuChart): PairRelations {
    const a = collectChars(chartA, 'A')
    const b = collectChars(chartB, 'B')
    const hits: PairRelationHit[] = []

    for (const sa of a.stems) {
        for (const sb of b.stems) {
            const el = cheonganHap(sa.gan!, sb.gan!)
            if (el) {
                hits.push({
                    kind: '천간합',
                    a: sa.ref,
                    b: sb.ref,
                    element: el,
                    description: `천간합(${sa.gan}+${sb.gan}→${el}): A의 ${sa.ref.position} 천간 ↔ B의 ${sb.ref.position} 천간`,
                })
            }
        }
    }

    for (const ba of a.branches) {
        for (const bb of b.branches) {
            const pos = `A의 ${ba.ref.position} 지지 ↔ B의 ${bb.ref.position} 지지`
            const push = (kind: PairRelationHit['kind'], element?: Element): void => {
                hits.push({
                    kind,
                    a: ba.ref,
                    b: bb.ref,
                    ...(element ? { element } : {}),
                    description: `${kind}(${ba.ji}${bb.ji}${element ? `→${element}` : ''}): ${pos}`,
                })
            }
            const yukhap = yukhapOf(ba.ji!, bb.ji!)
            if (yukhap) push('육합', yukhap)
            const banhap = banhapOf(ba.ji!, bb.ji!)
            if (banhap) push('반합', banhap)
            if (isChung(ba.ji!, bb.ji!)) push('충')
            if (isHyeong(ba.ji!, bb.ji!)) push('형')
            if (isHae(ba.ji!, bb.ji!)) push('해')
            if (isPa(ba.ji!, bb.ji!)) push('파')
        }
    }

    const iljiRelations = hits.filter((h) => h.kind !== '천간합' && h.a.position === '일주' && h.b.position === '일주')
    const ilganHap = hits.find((h) => h.kind === '천간합' && h.a.position === '일주' && h.b.position === '일주') ?? null

    const combined = emptyCount()
    for (const el of ELEMENTS) combined[el] = round2(chartA.elementCount[el] + chartB.elementCount[el])
    const total = chartA.totalUnits + chartB.totalUnits
    // 합산 분포가 5행 균등(각 20%)에 가까울수록 100점 (최대 편차 1.6 = 한 오행 몰빵)
    const deviation = ELEMENTS.reduce((sum, el) => sum + Math.abs(combined[el] / total - 0.2), 0)
    const elementComplementScore = Math.round((1 - deviation / 1.6) * 100)

    return {
        hits,
        iljiRelations,
        ilganHap,
        combinedElementCount: combined,
        elementComplementScore,
        mutualFill: {
            aFilledByB: chartA.lackingElements.filter((el) => chartB.dominantElements.includes(el)),
            bFilledByA: chartB.lackingElements.filter((el) => chartA.dominantElements.includes(el)),
        },
    }
}
