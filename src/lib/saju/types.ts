// 사주 계산 엔진 — 공용 타입 (SSOT: docs/saju/DESIGN.md §3)

export type Element = '목' | '화' | '토' | '금' | '수'

export type Gan = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계'

export type Ji = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해'

export type ZodiacAnimal =
    | '쥐' | '소' | '호랑이' | '토끼' | '용' | '뱀'
    | '말' | '양' | '원숭이' | '닭' | '개' | '돼지'

export type YinYang = '양' | '음'

export type Sipseong =
    | '비견' | '겁재' | '식신' | '상관' | '편재'
    | '정재' | '편관' | '정관' | '편인' | '정인'

export type SipseongGroup = '비겁' | '식상' | '재성' | '관성' | '인성'

export type Gender = 'male' | 'female'

export type StrengthLevel = '신강' | '중화' | '신약'

/** 용신 판정 근거 키 — 'lacking': 오행 결핍 보완(1차 규칙), season_*: 조후 타이브레이크 */
export type YongsinReason = 'lacking' | 'season_cold' | 'season_hot'

/** 지장간 한 글자 (weight = 장간 일수/30) */
export interface HiddenStem {
    gan: Gan
    element: Element
    weight: number
}

export interface Pillar {
    gan: Gan
    ji: Ji
    ganHanja: string
    jiHanja: string
    ganElement: Element
    jiElement: Element
    ganYinYang: YinYang
    jiYinYang: YinYang
    jiAnimal: ZodiacAnimal
    /** 지지 속 지장간 (여기→중기→본기 순, 본기가 마지막) */
    hiddenStems: HiddenStem[]
}

export interface SajuDate {
    year: number
    month: number
    day: number
}

export interface SajuTime {
    hour: number
    minute: number
}

export interface SajuBirthInput {
    /** calendar 기준 날짜 (음력 입력이면 음력 날짜) */
    date: SajuDate
    calendar: 'solar' | 'lunar'
    /** 음력 윤달 여부 (calendar='lunar'일 때만 의미) */
    isLeapMonth?: boolean
    /** KST 벽시계 시각. null/생략 = 시간 모름 → 삼주(三柱) 분석 */
    time?: SajuTime | null
    gender: Gender
}

export type ElementCount = Record<Element, number>

export interface DayMasterInfo {
    gan: Gan
    hanja: string
    element: Element
    yinYang: YinYang
    strength: StrengthLevel
    /** 득령(+3)/득지(+2)/득세(개별 +1) 합산 점수 */
    strengthScore: number
    strengthMax: number
    deukryeong: boolean
    deukji: boolean
    deukse: boolean
}

export interface YongsinInfo {
    element: Element
    reason: YongsinReason
    /** AI 프롬프트에 그대로 주입 가능한 한국어 근거 문장 */
    reasonText: string
    /** 희신 — 용신을 생(生)하는 오행 */
    heesin: Element
}

export type JijiRelationKind = '육합' | '삼합' | '반합' | '충' | '형' | '해' | '파'

export type PillarPosition = '년주' | '월주' | '일주' | '시주'

/** 원국 내부 지지 관계 (궁합에서는 두 원국 간 관계) */
export interface JijiRelationHit {
    kind: JijiRelationKind
    branches: Ji[]
    /** 관계에 참여한 기둥 위치 (branches와 같은 순서) */
    positions: PillarPosition[]
    /** 합이 이루는 오행 (육합/삼합/반합만) */
    element?: Element
}

export interface SajuChart {
    input: SajuBirthInput
    /** 실제 계산에 사용한 양력 날짜 */
    solarDate: SajuDate
    /** 참고용 음력 날짜 */
    lunarDate: SajuDate & { isLeapMonth: boolean }
    pillars: {
        year: Pillar
        month: Pillar
        day: Pillar
        hour: Pillar | null
    }
    /** 시간 모름 → 삼주 분석 */
    isThreePillar: boolean
    /** 보정 후 자시(子時) 출생 — 유파에 따라 일주가 달라질 수 있음을 UI가 고지 */
    isJasiBirth: boolean
    /** 띠 (년지 기준, 입춘 경계) */
    zodiacAnimal: ZodiacAnimal
    /** 지장간 가중 오행 분포 (천간 1.0 + 지지 1.0을 장간 일수비로 분배) */
    elementCount: ElementCount
    /** 겉글자 그대로 센 정수 분포 (지지는 지지 자체 오행) */
    rawElementCount: ElementCount
    /** 8 (사주) | 6 (삼주) */
    totalUnits: number
    dayMaster: DayMasterInfo
    /** 일간 제외 겉글자(천간 + 지지 본기) 십성 분포 */
    sipseong: Record<Sipseong, number>
    sipseongGroups: Record<SipseongGroup, number>
    yongsin: YongsinInfo
    /** 부족 오행 (가중치 오름차순) — "부족한 기운을 향으로 채운다" 서사의 근거 */
    lackingElements: Element[]
    /** 과다 오행 (가중치 내림차순) */
    dominantElements: Element[]
    /** 원국 내부 지지 합충형해파 */
    jijiRelations: JijiRelationHit[]
    /** 계산 조건 메타 (디버그/프롬프트 투명성) */
    meta: {
        longitude: number
        dayBoundary: 'splitJasi'
        trueSolarTime: boolean
        engine: string
    }
}

/** 궁합 — 두 원국 간 글자 관계 */
export interface PairCharRef {
    /** 'A' | 'B' 중 누구의 글자인지 */
    owner: 'A' | 'B'
    position: PillarPosition
    char: string
}

export interface PairRelationHit {
    kind: '천간합' | JijiRelationKind
    a: PairCharRef
    b: PairCharRef
    element?: Element
    /** 한국어 한 줄 설명 (AI 프롬프트 주입용) */
    description: string
}

export interface PairRelations {
    hits: PairRelationHit[]
    /** 일지↔일지 관계만 추림 (궁합의 핵심) */
    iljiRelations: PairRelationHit[]
    /** 일간↔일간 천간합 여부 */
    ilganHap: PairRelationHit | null
    /** 두 원국 가중 오행 합산 */
    combinedElementCount: ElementCount
    /** 오행 상보 점수 0~100 (합산 분포가 고를수록 높음) */
    elementComplementScore: number
    /** 서로의 결핍을 상대의 과다가 채워주는 오행 */
    mutualFill: {
        aFilledByB: Element[]
        bFilledByA: Element[]
    }
}

/** 오행 → 향 매핑 (scent-map.ts) */
export interface ScentElementEntry {
    /** perfumes.ts의 id (예: "AC'SCENT 01") */
    id: string
    name: string
    primaryElement: Element
    secondaryElement: Element
    /** 노트 근거 한국어 1문장 */
    rationale: string
}

export interface ScentCandidate extends ScentElementEntry {
    score: number
}
