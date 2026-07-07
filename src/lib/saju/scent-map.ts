// 오행 → 향 매핑 SSOT — src/data/perfumes.ts 30종 전수 태깅
// 전통 오행 상응: 목=그린/허브/침엽(생장) 화=스파이시/웜/스모키(발산) 토=스위트/파우더리/흙·무화과/바닐라(안정)
//                금=시트러스/클린/화이트플로럴(수렴) 수=머스크/아쿠아틱/심연(응축)
// 분포: 목 8 · 화 6 · 토 4 · 금 8 · 수 4 (전 오행 ≥4종 보장 — __selftest__.ts 검증)

import type { Element, ScentCandidate, ScentElementEntry } from './types'

export const SCENT_ELEMENT_MAP: readonly ScentElementEntry[] = [
    {
        id: "AC'SCENT 01", name: '블랙베리', primaryElement: '수', secondaryElement: '목',
        rationale: '검붉게 농축된 블랙베리의 어두운 과즙이 수(水)의 깊은 응축을, 월계수 잎과 시더우드가 목(木)의 뼈대를 세웁니다.',
    },
    {
        id: "AC'SCENT 02", name: '만다린 오렌지', primaryElement: '금', secondaryElement: '화',
        rationale: '만다린 오렌지와 그레이프프루트의 맑은 시트러스가 금(金)의 산뜻한 수렴을, 밝게 번지는 활기가 화(火)의 온기를 더합니다.',
    },
    {
        id: "AC'SCENT 03", name: '스트로베리', primaryElement: '토', secondaryElement: '금',
        rationale: '스트로베리와 바닐라의 폭신한 달콤함이 토(土)의 안정감을, 자스민의 화이트 플로럴이 금(金)의 깨끗함을 얹습니다.',
    },
    {
        id: "AC'SCENT 04", name: '베르가못', primaryElement: '금', secondaryElement: '토',
        rationale: '베르가못의 정제된 시트러스와 오렌지 플라워가 금(金)의 우아한 수렴을, 엠버 베이스가 토(土)의 묵직한 안정을 받칩니다.',
    },
    {
        id: "AC'SCENT 05", name: '비터 오렌지', primaryElement: '화', secondaryElement: '목',
        rationale: '스파이시 우디 어코드의 강렬한 발산이 화(火)의 카리스마를, 쥬니퍼베리의 침엽 기운이 목(木)의 생기를 더합니다.',
    },
    {
        id: "AC'SCENT 06", name: '캐럿', primaryElement: '토', secondaryElement: '목',
        rationale: '당근 뿌리의 은은한 흙내음이 토(土)의 대지 기운을, 자몽과 로터스의 싱그러움이 목(木)의 맑은 생장을 불어넣습니다.',
    },
    {
        id: "AC'SCENT 07", name: '로즈', primaryElement: '화', secondaryElement: '수',
        rationale: '겹겹이 피어나는 다마스커스 로즈의 화려한 발산이 화(火)의 정열을, 머스크 베이스가 수(水)의 은근한 깊이를 남깁니다.',
    },
    {
        id: "AC'SCENT 08", name: '튜베로즈', primaryElement: '금', secondaryElement: '화',
        rationale: '튜베로즈와 화이트 플로럴의 순백 꽃향이 금(金)의 서늘한 수렴을, 강렬하게 퍼지는 존재감이 화(火)의 발산을 겸합니다.',
    },
    {
        id: "AC'SCENT 09", name: '오렌지 블라썸', primaryElement: '금', secondaryElement: '토',
        rationale: '오렌지 블라썸과 자스민의 화사한 화이트 플로럴이 금(金)의 세련된 수렴을, 퉁카 빈의 달콤함이 토(土)의 포근함을 더합니다.',
    },
    {
        id: "AC'SCENT 10", name: '튤립', primaryElement: '목', secondaryElement: '금',
        rationale: '튤립과 라일락, 시클라멘이 그리는 봄 새순의 생기가 목(木)의 생장을, 맑고 투명한 잔향이 금(金)의 깨끗함을 지닙니다.',
    },
    {
        id: "AC'SCENT 11", name: '라임', primaryElement: '금', secondaryElement: '목',
        rationale: '톡 쏘는 라임의 청량한 시트러스가 금(金)의 상쾌한 수렴을, 바질 허브의 푸른 잎이 목(木)의 생기를 더합니다.',
    },
    {
        id: "AC'SCENT 12", name: '은방울꽃', primaryElement: '금', secondaryElement: '목',
        rationale: '은방울꽃과 프리지아의 청초한 화이트 플로럴이 금(金)의 맑은 수렴을, 이슬 맺힌 줄기의 초록 기운이 목(木)의 청신함을 품습니다.',
    },
    {
        id: "AC'SCENT 13", name: '유자', primaryElement: '금', secondaryElement: '목',
        rationale: '샛노란 유자의 밝은 시트러스가 금(金)의 산뜻한 수렴을, 로즈마리와 민트의 허브가 목(木)의 활력을 불어넣습니다.',
    },
    {
        id: "AC'SCENT 14", name: '민트', primaryElement: '목', secondaryElement: '금',
        rationale: '민트와 마테 잎의 시린 초록이 목(木)의 곧은 생기를, 얼음처럼 깨끗한 청량감이 금(金)의 정갈한 수렴을 겸합니다.',
    },
    {
        id: "AC'SCENT 15", name: '페티그레인', primaryElement: '목', secondaryElement: '금',
        rationale: '오렌지 나무의 잎과 가지에서 얻는 페티그레인이 목(木)의 푸른 생장을, 비터오렌지와 자몽이 금(金)의 시트러스 수렴을 더합니다.',
    },
    {
        id: "AC'SCENT 16", name: '샌달우드', primaryElement: '목', secondaryElement: '토',
        rationale: '샌달우드와 파피루스의 부드러운 나무 결이 목(木)의 중심을, 크리미하게 가라앉는 온기가 토(土)의 안정을 이룹니다.',
    },
    {
        id: "AC'SCENT 17", name: '레몬페퍼', primaryElement: '화', secondaryElement: '금',
        rationale: '후추의 알싸함과 인센스의 연기가 화(火)의 발산을, 레몬의 시트러스 결이 금(金)의 날카로운 수렴을 교차시킵니다.',
    },
    {
        id: "AC'SCENT 18", name: '핑크페퍼', primaryElement: '화', secondaryElement: '수',
        rationale: '핑크페퍼와 넛맥의 따뜻한 스파이스가 화(火)의 에너지를, 머스키하게 가라앉는 잔향이 수(水)의 깊이를 남깁니다.',
    },
    {
        id: "AC'SCENT 19", name: '바다소금', primaryElement: '수', secondaryElement: '목',
        rationale: '바다소금의 짭짤한 물보라가 수(水)의 아쿠아틱 기운을, 세이지 허브가 목(木)의 자연스러운 생기를 더합니다.',
    },
    {
        id: "AC'SCENT 20", name: '타임', primaryElement: '목', secondaryElement: '토',
        rationale: '타임 허브와 시더우드의 숲 향이 목(木)의 생장을, 베티버 뿌리의 흙내음이 토(土)의 단단한 대지를 받칩니다.',
    },
    {
        id: "AC'SCENT 21", name: '머스크', primaryElement: '수', secondaryElement: '토',
        rationale: '피부처럼 감기는 머스크의 응축된 관능이 수(水)의 깊이를, 앰버와 바닐라의 온기가 토(土)의 포근한 안정을 이룹니다.',
    },
    {
        id: "AC'SCENT 22", name: '화이트로즈', primaryElement: '금', secondaryElement: '수',
        rationale: '화이트로즈와 피오니의 순백 꽃잎이 금(金)의 정결한 수렴을, 머스크 베이스가 수(水)의 고요한 깊이를 더합니다.',
    },
    {
        id: "AC'SCENT 23", name: '스웨이드', primaryElement: '토', secondaryElement: '수',
        rationale: '스웨이드의 보드라운 촉감과 아이리스의 파우더리함이 토(土)의 안정을, 낮게 깔리는 앰버우드가 수(水)의 차분한 깊이를 만듭니다.',
    },
    {
        id: "AC'SCENT 24", name: '이탈리안만다린', primaryElement: '수', secondaryElement: '금',
        rationale: '머스크가 만드는 살결 같은 잔향의 응축이 수(水)의 자성을, 이탈리안만다린과 네롤리의 밝은 결이 금(金)의 세련미를 얹습니다.',
    },
    {
        id: "AC'SCENT 25", name: '라벤더', primaryElement: '목', secondaryElement: '토',
        rationale: '라벤더 허브의 차분한 보랏빛 향이 목(木)의 유연한 생기를, 통카빈과 샌달우드가 토(土)의 깊은 안정을 받칩니다.',
    },
    {
        id: "AC'SCENT 26", name: '이탈리안사이프러스', primaryElement: '목', secondaryElement: '수',
        rationale: '사이프러스와 주니퍼의 곧게 뻗은 침엽이 목(木)의 상승 기운을, 밤의 숲처럼 어두운 베티버 잔향이 수(水)의 신비를 품습니다.',
    },
    {
        id: "AC'SCENT 27", name: '스모키 블렌드 우드', primaryElement: '화', secondaryElement: '토',
        rationale: '가이악우드가 타오르며 남기는 연기가 화(火)의 강렬한 발산을, 앰버의 묵직한 온기가 토(土)의 안정을 이룹니다.',
    },
    {
        id: "AC'SCENT 28", name: '레더', primaryElement: '화', secondaryElement: '토',
        rationale: '가죽과 오드의 관능적인 열기가 화(火)의 발산을, 바닐라의 달콤한 온기가 토(土)의 여유를 더합니다.',
    },
    {
        id: "AC'SCENT 29", name: '바이올렛', primaryElement: '목', secondaryElement: '토',
        rationale: '바이올렛 잎의 푸릇한 그린 노트와 시더우드가 목(木)의 감각적 생기를, 아이리스의 파우더리함이 토(土)의 우아한 안정을 얹습니다.',
    },
    {
        id: "AC'SCENT 30", name: '무화과', primaryElement: '토', secondaryElement: '수',
        rationale: '무화과 나무 그늘의 젖은 흙과 달콤한 과육이 토(土)의 풍요를, 코코넛과 머스크의 크리미함이 수(水)의 부드러운 깊이를 만듭니다.',
    },
] as const

/** 오행별 향 언어 — 프롬프트 빌더의 elementBridge 서술 재료 */
export const ELEMENT_SCENT_LANGUAGE: Record<Element, { motion: string; notes: string }> = {
    목: { motion: '생장(生長) — 위로 뻗는 기운', notes: '그린, 허브, 침엽수, 잎사귀' },
    화: { motion: '발산(發散) — 퍼져나가는 기운', notes: '스파이시, 웜, 스모키, 정열의 꽃' },
    토: { motion: '안정(安定) — 중심을 지키는 기운', notes: '스위트, 파우더리, 흙, 무화과, 바닐라' },
    금: { motion: '수렴(收斂) — 맑게 거두는 기운', notes: '시트러스, 클린, 화이트 플로럴' },
    수: { motion: '응축(凝縮) — 깊이 모이는 기운', notes: '머스크, 아쿠아틱, 심연의 잔향' },
}

/**
 * 용신·결핍 오행 기반 후보 향수 랭킹.
 * 점수: 용신=primary 100 / secondary 40, 결핍 오행(용신 제외)=primary 30 / secondary 12 (합산).
 * 동점은 id 순 — 완전 결정적.
 */
export function getScentCandidates(yongsin: Element, lacking: Element[], limit = 8): ScentCandidate[] {
    const extras = lacking.filter((el) => el !== yongsin)
    const scored = SCENT_ELEMENT_MAP.map((entry) => {
        let score = 0
        if (entry.primaryElement === yongsin) score += 100
        if (entry.secondaryElement === yongsin) score += 40
        for (const el of extras) {
            if (entry.primaryElement === el) score += 30
            if (entry.secondaryElement === el) score += 12
        }
        return { ...entry, score }
    })
    scored.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id, 'en'))
    return scored.slice(0, limit)
}

/** 특정 향수의 오행 태깅 조회 */
export function getScentElementEntry(perfumeId: string): ScentElementEntry | undefined {
    return SCENT_ELEMENT_MAP.find((e) => e.id === perfumeId)
}

/** 오행별 배정 수 (검증·시각화용) */
export function countScentsByElement(): Record<Element, number> {
    const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
    for (const e of SCENT_ELEMENT_MAP) counts[e.primaryElement] += 1
    return counts
}
