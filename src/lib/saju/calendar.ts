// 율리우스일·60갑자·년두법/월두법(오호둔)/시두법(오서둔) — 순수 계산 코어
// 일진 앵커 검증: (JDN+49) mod 60 = 0 → 갑자. 2024-01-01=갑자, 2000-01-01=무오, 1949-10-01=갑자 (위키백과·리서치 dossier 대조)

import type { Element, Gan, HiddenStem, Ji, Sipseong, YinYang, ZodiacAnimal } from './types'

export const GAN: readonly Gan[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
export const GAN_HANJA: readonly string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const JI: readonly Ji[] = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
export const JI_HANJA: readonly string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const GAN_ELEMENT: readonly Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']
export const JI_ELEMENT: readonly Element[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수']
export const JI_ANIMAL: readonly ZodiacAnimal[] = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

export const ganYinYang = (ganIdx: number): YinYang => (ganIdx % 2 === 0 ? '양' : '음')
export const jiYinYang = (jiIdx: number): YinYang => (jiIdx % 2 === 0 ? '양' : '음')

export const ganIndex = (gan: Gan): number => GAN.indexOf(gan)
export const jiIndex = (ji: Ji): number => JI.indexOf(ji)

// 오행 상생·상극
export const GENERATES: Record<Element, Element> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
export const CONTROLS: Record<Element, Element> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
export const GENERATOR_OF: Record<Element, Element> = { 화: '목', 토: '화', 금: '토', 수: '금', 목: '수' }
export const ELEMENT_HANJA: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// 지장간 (여기→중기→본기, [간, 일수]. 일수 합 = 30)
const HIDDEN: Record<Ji, ReadonlyArray<readonly [Gan, number]>> = {
    자: [['임', 10], ['계', 20]],
    축: [['계', 9], ['신', 3], ['기', 18]],
    인: [['무', 7], ['병', 7], ['갑', 16]],
    묘: [['갑', 10], ['을', 20]],
    진: [['을', 9], ['계', 3], ['무', 18]],
    사: [['무', 7], ['경', 7], ['병', 16]],
    오: [['병', 10], ['기', 9], ['정', 11]],
    미: [['정', 9], ['을', 3], ['기', 18]],
    신: [['무', 7], ['임', 7], ['경', 16]],
    유: [['경', 10], ['신', 20]],
    술: [['신', 9], ['정', 3], ['무', 18]],
    해: [['무', 7], ['갑', 7], ['임', 16]],
}

export function hiddenStemsOf(ji: Ji): HiddenStem[] {
    return HIDDEN[ji].map(([gan, days]) => ({
        gan,
        element: GAN_ELEMENT[ganIndex(gan)],
        weight: days / 30,
    }))
}

/** 지지의 본기(정기) 천간 — 십성 판단은 본기 기준 (자→계, 오→정 등 용사 기준) */
export function principalStemOf(ji: Ji): Gan {
    const list = HIDDEN[ji]
    return list[list.length - 1][0]
}

const mod = (n: number, m: number): number => ((n % m) + m) % m

/** 그레고리력 → 율리우스일 번호 (정오 기준 정수, Fliegel–Van Flandern) */
export function toJDN(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12)
    const y = year + 4800 - a
    const m = month + 12 * a - 3
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

/** 율리우스일 번호 → 그레고리력 */
export function fromJDN(jdn: number): { year: number; month: number; day: number } {
    const a = jdn + 32044
    const b = Math.floor((4 * a + 3) / 146097)
    const c = a - Math.floor(146097 * b / 4)
    const d = Math.floor((4 * c + 3) / 1461)
    const e = c - Math.floor(1461 * d / 4)
    const m = Math.floor((5 * e + 2) / 153)
    return {
        day: e - Math.floor((153 * m + 2) / 5) + 1,
        month: m + 3 - 12 * Math.floor(m / 10),
        year: 100 * b + d - 4800 + Math.floor(m / 10),
    }
}

/** KST 절대 분 인덱스 (시각 비교용 단조 키) */
export function kstMinuteOf(year: number, month: number, day: number, hour = 0, minute = 0): number {
    return toJDN(year, month, day) * 1440 + hour * 60 + minute
}

/** 일진 60갑자 인덱스 (0=갑자). 앵커: JDN 2460311(2024-01-01) → 0 */
export function dayGanjiIndex(jdn: number): number {
    return mod(jdn + 49, 60)
}

/** 년두법 — 사주년(입춘 경계 적용 후) → 60갑자 인덱스. 앵커: 1984=갑자년 */
export function yearGanjiIndex(sajuYear: number): number {
    return mod(sajuYear - 4, 60)
}

/** 월두법(오호둔) — monthOrder: 0=인월 … 11=축월 */
export function monthGanIndex(yearGanIdx: number, monthOrder: number): number {
    return mod((yearGanIdx % 5) * 2 + 2 + monthOrder, 10)
}

export const monthJiIndex = (monthOrder: number): number => mod(monthOrder + 2, 12)

/** 시두법(오서둔) — hourOrder: 0=자시 … 11=해시 */
export function hourGanIndex(dayGanIdx: number, hourOrder: number): number {
    return mod((dayGanIdx % 5) * 2 + hourOrder, 10)
}

/** 시지 — 자시 23:00 시작, 2시간 간격 (보정 후 시각 기준) */
export function hourBranchOrder(hour: number, minute: number): number {
    return Math.floor((hour * 60 + minute + 60) / 120) % 12
}

export function splitGanjiIndex(idx60: number): { ganIdx: number; jiIdx: number } {
    return { ganIdx: idx60 % 10, jiIdx: idx60 % 12 }
}

export function ganjiName(idx60: number): string {
    const { ganIdx, jiIdx } = splitGanjiIndex(idx60)
    return `${GAN[ganIdx]}${JI[jiIdx]}`
}

/** 십성 — 일간 vs 다른 천간 (지지는 본기 천간으로 환산 후 호출) */
export function sipseongOf(dayGan: Gan, otherGan: Gan): Sipseong {
    const dIdx = ganIndex(dayGan)
    const oIdx = ganIndex(otherGan)
    const dEl = GAN_ELEMENT[dIdx]
    const oEl = GAN_ELEMENT[oIdx]
    const samePolarity = dIdx % 2 === oIdx % 2
    if (oEl === dEl) return samePolarity ? '비견' : '겁재'
    if (GENERATES[dEl] === oEl) return samePolarity ? '식신' : '상관'
    if (CONTROLS[dEl] === oEl) return samePolarity ? '편재' : '정재'
    if (CONTROLS[oEl] === dEl) return samePolarity ? '편관' : '정관'
    return samePolarity ? '편인' : '정인' // GENERATES[oEl] === dEl
}

// 천간합 (갑기합토 을경합금 병신합수 정임합목 무계합화)
const CHEONGAN_HAP_ELEMENT: readonly Element[] = ['토', '금', '수', '목', '화']

/** 두 천간이 합이면 합화 오행, 아니면 null */
export function cheonganHap(a: Gan, b: Gan): Element | null {
    const ai = ganIndex(a)
    const bi = ganIndex(b)
    if (mod(ai - bi, 10) !== 5) return null
    return CHEONGAN_HAP_ELEMENT[Math.min(ai, bi)]
}

// 지지 관계 페어 테이블 (무순서 쌍)
type JiPair = readonly [Ji, Ji]
const pairKey = (a: Ji, b: Ji): string => [a, b].sort().join('')
const toSet = (pairs: ReadonlyArray<JiPair>): Set<string> => new Set(pairs.map(([a, b]) => pairKey(a, b)))

export const YUKHAP: ReadonlyArray<readonly [Ji, Ji, Element]> = [
    ['자', '축', '토'], ['인', '해', '목'], ['묘', '술', '화'],
    ['진', '유', '금'], ['사', '신', '수'], ['오', '미', '화'],
]
export const SAMHAP: ReadonlyArray<readonly [Ji, Ji, Ji, Element]> = [
    ['신', '자', '진', '수'], ['인', '오', '술', '화'],
    ['사', '유', '축', '금'], ['해', '묘', '미', '목'],
]
// 반합 — 삼합 중 왕지(子午卯酉)를 포함한 2자
export const BANHAP: ReadonlyArray<readonly [Ji, Ji, Element]> = [
    ['신', '자', '수'], ['자', '진', '수'], ['인', '오', '화'], ['오', '술', '화'],
    ['사', '유', '금'], ['유', '축', '금'], ['해', '묘', '목'], ['묘', '미', '목'],
]
const CHUNG: ReadonlyArray<JiPair> = [['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해']]
// 형 — 인사신 삼형(인사·사신·인신), 축술미 삼형(축술·술미·축미), 자묘 상형, 자형(진·오·유·해)
const HYEONG: ReadonlyArray<JiPair> = [
    ['인', '사'], ['사', '신'], ['인', '신'],
    ['축', '술'], ['술', '미'], ['축', '미'],
    ['자', '묘'],
    ['진', '진'], ['오', '오'], ['유', '유'], ['해', '해'],
]
const HAE: ReadonlyArray<JiPair> = [['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술']]
const PA: ReadonlyArray<JiPair> = [['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['미', '술']]

const CHUNG_SET = toSet(CHUNG)
const HYEONG_SET = toSet(HYEONG)
const HAE_SET = toSet(HAE)
const PA_SET = toSet(PA)

export function yukhapOf(a: Ji, b: Ji): Element | null {
    const key = pairKey(a, b)
    const hit = YUKHAP.find(([x, y]) => pairKey(x, y) === key)
    return hit ? hit[2] : null
}

export function banhapOf(a: Ji, b: Ji): Element | null {
    if (a === b) return null
    const key = pairKey(a, b)
    const hit = BANHAP.find(([x, y]) => pairKey(x, y) === key)
    return hit ? hit[2] : null
}

export const isChung = (a: Ji, b: Ji): boolean => CHUNG_SET.has(pairKey(a, b))
export const isHyeong = (a: Ji, b: Ji): boolean => HYEONG_SET.has(pairKey(a, b))
export const isHae = (a: Ji, b: Ji): boolean => HAE_SET.has(pairKey(a, b))
export const isPa = (a: Ji, b: Ji): boolean => PA_SET.has(pairKey(a, b))

/** 세 지지가 삼합을 이루면 그 오행 */
export function samhapOf(a: Ji, b: Ji, c: Ji): Element | null {
    const key = [a, b, c].sort().join('')
    const hit = SAMHAP.find(([x, y, z]) => [x, y, z].sort().join('') === key)
    return hit ? hit[3] : null
}
