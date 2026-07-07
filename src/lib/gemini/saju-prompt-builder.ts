// 사주 분석 퍼퓸 — Gemini 프롬프트 빌더 (SSOT: docs/saju/DESIGN.md §4, docs/saju/CONTENT.md 전체)
//
// 대원칙: AI는 사주를 계산하지 않는다. src/lib/saju 엔진이 계산한 명식을 주입하고 AI는 해석만 한다.
// ko 프롬프트가 소스 오브 트루스 — 비 ko 로케일은 라우트에서 wrapPromptWithLocale로 감싼다.
//
// 이 파일은 사주 AI 접착층으로서 엔진 SajuChart → 결과 계약 스냅샷(SajuChartSnapshot 등)
// 변환기도 함께 제공한다 (chart 라우트·analyze 라우트 공용 — route.ts에는 핸들러 외 export 금지이므로 여기 둔다).

import { perfumes } from '@/data/perfumes'
import {
    ELEMENT_HANJA, ELEMENT_SCENT_LANGUAGE, GAN, GAN_HANJA, JI, JI_HANJA,
    principalStemOf, sipseongOf,
} from '@/lib/saju'
import type {
    Element, Gan, Ji, PairRelationHit, PairRelations, Pillar, SajuChart, ScentCandidate,
} from '@/lib/saju'
import {
    SAJU_ELEMENT_INFO, SAJU_PURPOSES,
    type SajuBirthInput as ApiSajuBirthInput, type SajuChartSnapshot, type SajuPairRelation,
    type SajuPillarSnapshot, type SajuPurpose,
} from '@/types/analysis'
import type { SajuBirthInput as EngineSajuBirthInput } from '@/lib/saju'

// ============================================================
// 0) API 요청 → 엔진 입력 변환 (chart 라우트·analyze 라우트 공용)
//    route.ts에는 핸들러 외 export가 허용되지 않으므로 여기서 제공한다.
// ============================================================

export function normalizeSajuGender(value: unknown): 'male' | 'female' {
    if (value === 'male') return 'male'
    if (value === 'female') return 'female'
    if (typeof value === 'string' && value.startsWith('남')) return 'male'
    return 'female'
}

/** API 평면 입력(SajuBirthInput @types/analysis)을 검증 — 실패 시 한국어 오류 throw (400 응답용) */
export function parseApiBirthInput(raw: unknown, who = '본인'): ApiSajuBirthInput {
    if (typeof raw !== 'object' || raw === null) {
        throw new Error(`${who}의 생년월일 정보(birth)가 필요합니다.`)
    }
    const birth = raw as Record<string, unknown>
    const { year, month, day } = birth
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        throw new Error(`${who}의 생년월일(year/month/day)은 정수여야 합니다.`)
    }
    const calendar = birth.calendar === 'lunar' ? 'lunar' : birth.calendar === 'solar' ? 'solar' : null
    if (!calendar) {
        throw new Error(`${who}의 calendar 값은 'solar' 또는 'lunar'여야 합니다.`)
    }
    const hourRaw = birth.hour
    const minuteRaw = birth.minute
    let hour: number | null = null
    let minute: number | null = null
    if (hourRaw !== null && hourRaw !== undefined) {
        if (!Number.isInteger(hourRaw) || (hourRaw as number) < 0 || (hourRaw as number) > 23) {
            throw new Error(`${who}의 태어난 시(hour)는 0~23 사이 정수 또는 null(시간 모름)이어야 합니다.`)
        }
        hour = hourRaw as number
        if (minuteRaw !== null && minuteRaw !== undefined) {
            if (!Number.isInteger(minuteRaw) || (minuteRaw as number) < 0 || (minuteRaw as number) > 59) {
                throw new Error(`${who}의 태어난 분(minute)은 0~59 사이 정수여야 합니다.`)
            }
            minute = minuteRaw as number
        } else {
            minute = 0
        }
    }
    return {
        year: year as number,
        month: month as number,
        day: day as number,
        hour,
        minute,
        calendar,
        isLeapMonth: calendar === 'lunar' ? birth.isLeapMonth === true : undefined,
    }
}

/** API 평면 입력 → 엔진 SajuBirthInput (엔진이 범위·음력 변환 검증을 한국어 오류로 수행) */
export function toEngineBirthInput(birth: ApiSajuBirthInput, gender: unknown): EngineSajuBirthInput {
    return {
        date: { year: birth.year, month: birth.month, day: birth.day },
        calendar: birth.calendar,
        isLeapMonth: birth.isLeapMonth === true,
        time: birth.hour === null || birth.hour === undefined
            ? null
            : { hour: birth.hour, minute: birth.minute ?? 0 },
        gender: normalizeSajuGender(gender),
    }
}

// ============================================================
// 1) 엔진 → 결과 계약 스냅샷 변환기
// ============================================================

function toPillarSnapshot(p: Pillar): SajuPillarSnapshot {
    return {
        gan: p.gan,
        ji: p.ji,
        ganHanja: p.ganHanja,
        jiHanja: p.jiHanja,
        ganElement: p.ganElement,
        jiElement: p.jiElement,
        jiAnimal: p.jiAnimal,
    }
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 엔진 SajuChart → analysis_data 저장용 SajuChartSnapshot (UI/인쇄 자립 렌더 계약) */
export function toSajuChartSnapshot(chart: SajuChart): SajuChartSnapshot {
    const hour = chart.pillars.hour
    const time = chart.input.time
    return {
        pillars: {
            year: toPillarSnapshot(chart.pillars.year),
            month: toPillarSnapshot(chart.pillars.month),
            day: toPillarSnapshot(chart.pillars.day),
            hour: hour ? toPillarSnapshot(hour) : null,
        },
        elementCount: { ...chart.elementCount },
        dayMaster: {
            gan: chart.dayMaster.gan,
            hanja: chart.dayMaster.hanja,
            element: chart.dayMaster.element,
            yinYang: chart.dayMaster.yinYang,
            strength: chart.dayMaster.strength,
        },
        yongsin: {
            element: chart.yongsin.element,
            reason: chart.yongsin.reason,
            lackingElements: [...chart.lackingElements],
        },
        isThreePillar: chart.isThreePillar,
        isJasiBirth: chart.isJasiBirth,
        birthDisplay: {
            solarDate: `${chart.solarDate.year}-${pad2(chart.solarDate.month)}-${pad2(chart.solarDate.day)}`,
            time: time ? `${pad2(time.hour)}:${pad2(time.minute)}` : null,
            calendar: chart.input.calendar,
            sijin: hour ? `${hour.ji}시(${hour.jiHanja}時)` : null,
        },
    }
}

const RELATION_KIND_MAP: Record<PairRelationHit['kind'], { kind: SajuPairRelation['kind']; hanja: string }> = {
    천간합: { kind: '합', hanja: '合' },
    육합: { kind: '합', hanja: '合' },
    삼합: { kind: '합', hanja: '合' },
    반합: { kind: '합', hanja: '合' },
    충: { kind: '충', hanja: '沖' },
    형: { kind: '형', hanja: '刑' },
    해: { kind: '해', hanja: '害' },
    파: { kind: '파', hanja: '破' },
}

function glyphHanja(char: string): string {
    const gi = GAN.indexOf(char as Gan)
    if (gi >= 0) return GAN_HANJA[gi]
    const ji = JI.indexOf(char as Ji)
    if (ji >= 0) return JI_HANJA[ji]
    return char
}

function relationPositionLabel(hit: PairRelationHit): string {
    const suffix = hit.kind === '천간합' ? '간' : '지'
    const short = (pos: string): string => pos.replace('주', suffix)
    return `${short(hit.a.position)}-${short(hit.b.position)}`
}

/** 엔진 PairRelations → 결과 계약 SajuPairRelation[] (일간합 → 일지 관계 → 나머지 순) */
export function toSajuPairRelationSnapshots(relations: PairRelations): SajuPairRelation[] {
    const ordered: PairRelationHit[] = []
    if (relations.ilganHap) ordered.push(relations.ilganHap)
    for (const hit of relations.iljiRelations) ordered.push(hit)
    for (const hit of relations.hits) {
        if (!ordered.includes(hit)) ordered.push(hit)
    }
    return ordered.map((hit) => {
        const mapped = RELATION_KIND_MAP[hit.kind]
        const kindShort = hit.kind === '천간합' ? '합' : hit.kind
        return {
            kind: mapped.kind,
            hanja: mapped.hanja,
            aGlyph: glyphHanja(hit.a.char),
            bGlyph: glyphHanja(hit.b.char),
            position: relationPositionLabel(hit),
            label: `${hit.a.char}${hit.b.char}${kindShort}`,
        }
    })
}

// ============================================================
// 2) 프롬프트 재료 포매터
// ============================================================

const CATEGORY_KOREAN: Record<string, string> = {
    citrus: '시트러스', floral: '플로럴', woody: '우디', musky: '머스크', fruity: '프루티', spicy: '스파이시',
}

/** 30종 향수 DB — 토큰 절약형 1줄 포맷 (feedback-prompt 기법) + 노트 3단 (근거 브리지 재료) */
function formatPerfumeDatabaseCompact(): string {
    return perfumes
        .map((p) => {
            const chars = Object.entries(p.characteristics)
                .map(([k, v]) => `${CATEGORY_KOREAN[k] || k}:${v}`)
                .join(', ')
            return `- ${p.id}: "${p.name}" (${CATEGORY_KOREAN[p.category] || p.category}) [${chars}] 노트(탑/미들/베이스): ${p.mainScent.name} / ${p.subScent1.name} / ${p.subScent2.name}`
        })
        .join('\n')
}

const JI_SEASON: Record<Ji, string> = {
    인: '봄', 묘: '봄', 진: '늦봄(환절)', 사: '여름', 오: '여름', 미: '늦여름(환절)',
    신: '가을', 유: '가을', 술: '늦가을(환절)', 해: '겨울', 자: '겨울', 축: '늦겨울(환절)',
}

const el = (e: Element): string => `${e}(${ELEMENT_HANJA[e]})`

function pillarLabel(p: Pillar | null): string | null {
    if (!p) return null
    return `${p.gan}${p.ji}(${p.ganHanja}${p.jiHanja}) — 천간 ${el(p.ganElement)} / 지지 ${el(p.jiElement)}·${p.jiAnimal}`
}

/** 계산된 명식 → 프롬프트 주입 JSON (AI가 재계산할 여지를 없애는 완결 데이터) */
function chartToPromptJson(chart: SajuChart): string {
    const relations = chart.jijiRelations.map(
        (h) => `${h.kind}(${h.branches.join('')}${h.element ? `→${h.element}` : ''}) — ${h.positions.join('·')}`
    )
    const dohwa = ([chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour] as Array<Pillar | null>)
        .filter((p): p is Pillar => p !== null)
        .filter((p) => ['자', '오', '묘', '유'].includes(p.ji))
        .map((p) => `${p.ji}(${p.jiHanja})`)
    const payload = {
        사주팔자: {
            년주: pillarLabel(chart.pillars.year),
            월주: pillarLabel(chart.pillars.month),
            일주: pillarLabel(chart.pillars.day),
            시주: pillarLabel(chart.pillars.hour) ?? '(시간 모름 — 삼주 분석)',
        },
        일간: {
            글자: `${chart.dayMaster.gan}(${chart.dayMaster.hanja})`,
            오행: chart.dayMaster.element,
            음양: chart.dayMaster.yinYang,
            신강약: chart.dayMaster.strength,
            근거: `득령 ${chart.dayMaster.deukryeong ? 'O' : 'X'} · 득지 ${chart.dayMaster.deukji ? 'O' : 'X'} · 득세 ${chart.dayMaster.deukse ? 'O' : 'X'} (${chart.dayMaster.strengthScore}/${chart.dayMaster.strengthMax})`,
        },
        월지_계절: `${chart.pillars.month.ji}(${chart.pillars.month.jiHanja})월 — ${JI_SEASON[chart.pillars.month.ji]}`,
        띠: chart.zodiacAnimal,
        오행분포_지장간가중: chart.elementCount,
        오행분포_겉글자: chart.rawElementCount,
        총유닛: chart.totalUnits,
        십성분포: chart.sipseongGroups,
        십성상세: chart.sipseong,
        용신: {
            오행: el(chart.yongsin.element),
            판정근거: chart.yongsin.reasonText,
            희신: el(chart.yongsin.heesin),
        },
        결핍오행: chart.lackingElements.map(el),
        과다오행: chart.dominantElements.map(el),
        지지관계: relations.length > 0 ? relations : ['(원국 내 합충형해파 없음)'],
        도화_해당지지: dohwa.length > 0 ? dohwa : '(없음)',
        삼주분석_시간모름: chart.isThreePillar,
        야자시출생: chart.isJasiBirth,
    }
    return JSON.stringify(payload, null, 1)
}

/** 세운(올해) — 코드가 계산해 주입 (AI 재계산 금지 원칙의 연장) */
function yearlyFlowFacts(chart: SajuChart, year: number): string {
    const yearGan = GAN[(((year - 4) % 10) + 10) % 10]
    const yearJi = JI[(((year - 4) % 12) + 12) % 12]
    const ganHanja = GAN_HANJA[GAN.indexOf(yearGan)]
    const jiHanja = JI_HANJA[JI.indexOf(yearJi)]
    const dayGan = chart.dayMaster.gan
    const ganSipseong = sipseongOf(dayGan, yearGan)
    const jiSipseong = sipseongOf(dayGan, principalStemOf(yearJi))
    return [
        `- 올해: ${year}년 ${yearGan}${yearJi}년(${ganHanja}${jiHanja}年)`,
        `- 세운 천간 ${yearGan}(${ganHanja})은 일간 ${dayGan}(${chart.dayMaster.hanja}) 기준 **${ganSipseong}**`,
        `- 세운 지지 ${yearJi}(${jiHanja})의 본기는 일간 기준 **${jiSipseong}**`,
    ].join('\n')
}

// ============================================================
// 3) CONTENT.md 인코딩 블록 (해석 프레임워크 SSOT)
// ============================================================

const ARCHETYPE_TABLE = `| 일간 | 자연물 | 한 줄 정체성 | 기운의 성질 | 그림자(약점을 매력으로) |
|---|---|---|---|---|
| 갑목(甲木) | 곧게 자라는 거목 | 꺾일지언정 휘지 않는 사람 | 시작·직진·성장 | 고집이 아니라 방향 감각 |
| 을목(乙木) | 바위를 타고 오르는 덩굴 | 어디서든 길을 찾아내는 사람 | 유연·적응·생존력 | 우유부단이 아니라 탐색 |
| 병화(丙火) | 한낮의 태양 | 존재만으로 좌중을 밝히는 사람 | 발산·공명정대·열정 | 과시가 아니라 투명함 |
| 정화(丁火) | 어둠 속 촛불 | 가까운 이를 데우는 조용한 불 | 집중·섬세·헌신 | 예민함이 아니라 해상도 |
| 무토(戊土) | 우뚝 선 산 | 흔들리는 이들이 기대는 사람 | 중심·포용·신뢰 | 둔함이 아니라 항상성 |
| 기토(己土) | 씨앗을 품는 밭 | 무엇이든 자라게 하는 사람 | 양육·실속·수용 | 소극성이 아니라 숙성 |
| 경금(庚金) | 벼려지기 전의 무쇠 | 부딪혀야 빛나는 사람 | 결단·의리·돌파 | 거침이 아니라 정직한 날 |
| 신금(辛金) | 세공된 보석 | 스스로를 벼리는 완벽주의자 | 정밀·심미·자존 | 까다로움이 아니라 기준 |
| 임수(壬水) | 바다 | 깊이를 알 수 없는 사람 | 지혜·포용·스케일 | 종잡을 수 없음이 아니라 조류 |
| 계수(癸水) | 새벽 이슬비 | 스며들어 적시는 사람 | 직관·감수성·정화 | 여림이 아니라 침투력 |`

const ELEMENT_SCENT_TABLE = `| 오행 | 감각 번역 | 노트 어휘 | 처방 동사 | 전통 근거(오취·계절) |
|---|---|---|---|---|
| 목(木) | 새순·숲의 공기·자라는 것 | 그린, 허브, 침엽, 잎 | 틔우다, 자라게 하다 | 청(靑)·봄·생장 |
| 화(火) | 온기·불꽃·퍼지는 빛 | 스파이시, 스모키, 앰버 | 지피다, 데우다 | 적(赤)·여름·탄내(焦)→스모키 |
| 토(土) | 흙의 안정·달콤한 무게 | 바닐라, 통카, 무화과, 파우더리 | 다지다, 붙잡다 | 황(黃)·장하·향내(香)→스위트 |
| 금(金) | 서늘한 광택·베어내는 맑음 | 시트러스, 클린, 화이트플로럴, 솔트 | 벼리다, 걷어내다 | 백(白)·가을·수렴 |
| 수(水) | 깊은 물·스며드는 고요 | 머스크, 아쿠아틱, 딥우디 | 채우다, 가라앉히다 | 흑(黑)·겨울·응축 |`

const FORBIDDEN_CLICHES = `다음 표현·화법은 **절대 금지**입니다. 하나라도 어기면 실패로 간주합니다.
1. "긍정적인 마음을 가지면 좋은 일이 생깁니다" 류의 하나마나한 총론
2. "귀인이 나타납니다", "3년 뒤 대운이 들어옵니다" 류의 검증 불가 예언
3. "~한 성격입니다" 나열식 성격 진단 — 반드시 명식 글자 → 해석의 인과로 서술
4. 사주 용어를 쓰고 설명하지 않는 것 — 용어는 쓰되 반드시 즉시 한 줄 번역을 붙일 것 (예: "일지에 유금(酉金) — 배우자 자리에 앉은 보석 같은 금 기운")
5. 이모지 남발, "!!" 남발, 과장 감탄사
6. 공포 마케팅 — 살(煞)·흉(凶) 강조, 겁주는 화법
7. 최애(idol) 모드에서의 부정 단정 — 최애의 명식은 언제나 애정 어린 시선으로`

const PURPOSE_GUIDES: Record<SajuPurpose, string> = {
    general: `### 종합(총운) 해석 지침
- 배합: 일간 서사 40% + 오행 흐름 30% + 올해 흐름 30%.
- 미래를 단정하지 마십시오 — "흐름", "계절", "물길" 같은 어휘로 방향만 짚습니다.
- 명식에서 가장 도드라진 구조(과다/결핍/합충) 하나를 중심 서사로 삼아 관통시키십시오.`,
    love: `### 연애운 해석 지침
- 관성(이성/끌림)·식상(표현)·일지(배우자궁)를 읽습니다. 위 명식 JSON의 십성분포와 일지 글자를 반드시 인용하십시오.
- "연애를 하게 된다/못 한다"는 금지 → **"당신이 사랑에 빠지는 방식"**과 **"당신 곁에 오래 남는 사람의 결"**을 서술합니다.
- 도화(자오묘유)가 지지에 있으면(위 JSON의 도화_해당지지 참조) 구체적으로 인용하십시오. 없으면 언급하지 않습니다.
- 일지 글자의 오행·음양이 곧 배우자 자리의 온도입니다 — 그 글자에서 관계의 결을 읽어내십시오.`,
    wealth: `### 재물운 해석 지침
- 재성의 위치와 강약을 읽습니다. 위 명식 JSON의 십성상세(편재/정재 수)를 반드시 인용하십시오.
- "부자가 된다/못 된다"는 금지 → **"돈이 당신에게 들어오는 경로"**를 서술합니다: 정재형 = 쌓는 돈(꾸준함·저축·안정 수입), 편재형 = 흐르는 돈(기회·유통·규모).
- 재성이 없거나 약하면 "비워진 자리" 프레임으로 — 돈에 무심한 것이 아니라 돈이 아닌 것을 먼저 채우는 순서.
- 식상(재성을 생하는 기운)의 유무로 "돈을 만드는 손"의 활성도를, 비겁 과다면 "새는 구멍"(분산·나눔)을 함께 짚으십시오.`,
    career: `### 직업·진로운 해석 지침
- 십성 조합으로 "일하는 방식의 결"을 유형화합니다: 식신 = 만드는 사람, 상관 = 바꾸는 사람, 정관 = 지키는 사람, 편관 = 감당하는 사람, 정인 = 배우는 사람, 편인 = 꿰뚫는 사람, 비견 = 스스로 서는 사람, 겁재 = 판을 흔드는 사람, 정재 = 쌓는 사람, 편재 = 굴리는 사람.
- 위 명식 JSON의 십성분포에서 가장 강한 축을 중심으로 서술하되, 구체 직업명 나열은 최소화 — "당신은 ○○하는 방식으로 일할 때 가장 빛납니다"의 문법으로.
- 일간의 강약(신강/신약)이 곧 일의 주도권 스타일입니다 — 신강은 끌고 가는 힘, 신약은 받쳐주는 판에서 피어나는 힘.`,
    compatibility: `### 궁합 해석 지침 (5규칙 — 전부 준수)
1. **두 일간의 자연물 관계로 여십시오** — 은유가 곧 진단입니다. (예: 병화×임수 = "태양과 바다. 마주 볼 때 가장 빛나는 관계 — 바다는 태양빛을 받아 반짝이고, 태양은 바다에 제 얼굴을 비춥니다.")
2. **합·충을 구체 인용하십시오**: 아래 [두 명식의 관계] 데이터의 합 = 끌림의 자리, 충 = 부딪히는 자리. 충은 나쁨이 아니라 **"서로를 흔들어 깨우는 자리"**로 서술합니다.
3. **오행 상호보완**: 한쪽의 결핍을 상대가 채우면 그것이 관계의 중력입니다 (아래 mutualFill 데이터 인용).
4. **점수는 절제**: 50~99 사이, **80점 이상은 아껴 쓰십시오**. 계산된 오행 상보 점수를 참고하되 관계 데이터 전체로 판단합니다. 낮은 점수도 부정 금지 — "다른 속도의 두 사람"으로.
5. **향 연결**: 두 명식이 공유하는 결핍(또는 서로의 용신)을 채우는 향 = "두 사람 사이에 놓이는 향"으로 서술합니다.`,
}

// ============================================================
// 4) 프롬프트 빌더 본체
// ============================================================

export interface SajuPromptPartner {
    name: string
    gender: string
    relationLabel: string
    chart: SajuChart
    relations: PairRelations
}

export interface SajuPromptArgs {
    name: string
    gender: string
    targetType: 'idol' | 'self'
    purpose: SajuPurpose
    wish?: string
    chart: SajuChart
    candidates: ScentCandidate[]
    partner?: SajuPromptPartner
    /** 세운 기준 연도 (기본 2026 병오년) */
    analysisYear?: number
}

function toneSection(targetType: 'idol' | 'self', name: string): string {
    if (targetType === 'idol') {
        return `## 톤 — 최애(idol) 모드
지금 읽는 명식의 주인은 의뢰인의 **최애 "${name}"**입니다. 의뢰인은 팬입니다.
- 최애의 사주를 대신 읽어주는 부드러운 온도. 팬의 설렘을 존중하되 호들갑은 금지.
- 2인칭 "당신" 대신 "이 사람", "${name} 님"으로 지칭합니다.
- 최애에 대한 부정 단정 절대 금지 — 그림자도 애정 어린 시선으로 뒤집어 읽습니다.
- 톤 견본: "이 사람의 일간은 병화(丙火) — 무대 위에서 왜 그렇게 빛나는지, 사주가 먼저 알고 있었습니다. 다만 태양은 제 그림자를 보지 못합니다. 팬인 당신이 보는 그 뒷모습의 서늘함, 그건 명식 속 비어 있는 수(水)의 자리입니다."`
    }
    return `## 톤 — 나(self) 모드
지금 읽는 명식의 주인은 **의뢰인 본인 "${name}"**입니다.
- 차분한 확신의 어조. 2인칭 "당신"으로 직접 말을 건넵니다. 과장 없이, 그러나 단단하게.
- 톤 견본: "당신의 일간은 신금(辛金), 세공된 보석입니다. 스스로에게 가장 엄격한 세공사이기도 하지요. 이 명식에서 화(火)는 하나뿐 — 보석은 빛을 받아야 반짝입니다. 당신에게 필요한 건 더 단단해지는 일이 아니라, 데워지는 일입니다."`
}

function purposeLabel(purpose: SajuPurpose): string {
    return SAJU_PURPOSES.find((p) => p.id === purpose)?.label ?? purpose
}

function candidatesSection(candidates: ScentCandidate[], yongsin: Element): string {
    const list = candidates
        .map((c, i) => `${i + 1}. ${c.id} "${c.name}" [주오행 ${el(c.primaryElement)} · 부오행 ${el(c.secondaryElement)}] — ${c.rationale}`)
        .join('\n')
    return `## 우선 후보 (용신 ${el(yongsin)} 기준으로 코드가 좁힌 목록 — 여기서 고르는 것이 원칙)
${list}

## 전체 30종 데이터베이스 (참고)
${formatPerfumeDatabaseCompact()}

### 향수 선택 규칙
- **원칙: 위 우선 후보 중에서 1종을 선택합니다.** 우선 후보의 rationale(오행 근거)을 서사에 활용하십시오.
- 예외: 우선 후보 밖의 향수가 이 명식의 이야기에 **극적으로 더 맞을 때만** 전체 30종에서 선택할 수 있습니다. 그 경우에도 반드시 용신/결핍 오행 논리로 정당화해야 합니다 (오행 근거 없는 선택 = 실패).
- perfumeId는 반드시 위 데이터베이스의 실제 id ("AC'SCENT 01"~"AC'SCENT 30") 그대로.
- noteComments는 선택한 향수의 **실제 노트 이름**(위 DB의 탑/미들/베이스)을 인용해 기운의 3층 구조로 재해석합니다.`
}

function compatibilitySection(args: SajuPromptArgs): string {
    const partner = args.partner
    if (!partner || args.purpose !== 'compatibility') return ''
    const rel = partner.relations
    const hitLines = rel.hits.slice(0, 20).map((h) => `- ${h.description}`).join('\n')
    const ilji = rel.iljiRelations.length > 0
        ? rel.iljiRelations.map((h) => `- ${h.description}`).join('\n')
        : '- (일지끼리의 합충형해파 없음 — 담백하게 흐르는 자리)'
    const mutual = [
        rel.mutualFill.aFilledByB.length > 0
            ? `- ${args.name}의 결핍 ${rel.mutualFill.aFilledByB.map(el).join(', ')} → 상대의 과다 기운이 채워줌`
            : `- ${args.name}의 결핍을 상대가 직접 채우지는 않음`,
        rel.mutualFill.bFilledByA.length > 0
            ? `- ${partner.name}의 결핍 ${rel.mutualFill.bFilledByA.map(el).join(', ')} → ${args.name}의 과다 기운이 채워줌`
            : `- ${partner.name}의 결핍을 ${args.name}이(가) 직접 채우지는 않음`,
    ].join('\n')

    return `
# 상대방 명식 (만세력 계산 완료 — 재계산 금지)
상대: "${partner.name}" (${partner.gender}) — 관계: ${partner.relationLabel}
\`\`\`json
${chartToPromptJson(partner.chart)}
\`\`\`

# 두 명식의 관계 (코드가 전수 계산한 결과 — 이 데이터만 인용할 것)
## 일간합: ${rel.ilganHap ? rel.ilganHap.description : '(없음)'}
## 일지↔일지 관계 (궁합의 핵심)
${ilji}
## 전체 글자 관계
${hitLines || '- (합충형해파 없음)'}
## 오행 상보
- 합산 오행 분포: ${JSON.stringify(rel.combinedElementCount)}
- 오행 상보 점수(코드 계산): ${rel.elementComplementScore}/100
${mutual}
`
}

/** 출력 스키마 — SajuAnalysisResult 계약에서 sajuChart/persona(서버 주입분)를 제외한 형태 */
function outputSchemaSection(args: SajuPromptArgs): string {
    const isCompat = args.purpose === 'compatibility'
    const isThreePillar = args.chart.isThreePillar
    const compatSchema = isCompat
        ? `,
  "compatibilityReading": {                          // 궁합일 때 필수
    "score": 50-99 정수,                              // 80+는 아껴라. 코드 계산 상보점수 참고하되 관계 전체로 판단
    "title": "두 일간의 자연물 관계 (예: '태양과 바다')",
    "dynamicNarrative": "8-12문장. 자연물 은유로 열고, 계산된 합·충 데이터를 구체 인용",
    "harmonyPoints": ["2-3개 — 합 인용 (끌림의 자리)"],
    "frictionPoints": ["1-2개 — 충 인용. 부정 금지, '서로를 흔들어 깨우는 자리'로"],
    "adviceNarrative": "3-5문장. 두 사람이 서로의 기운을 살리는 법",
    "sharedScentNarrative": "3-4문장. 두 사람 사이에 놓이는 향 — 공유 결핍/서로의 용신을 채우는 논리"
  }`
        : ''
    return `# 출력 JSON 스키마 (주석은 지침 — 출력에 포함 금지)
\`\`\`
{
  "traits": {                                        // 전부 1-10 정수. 0 금지! 명식에서 도출
    "sexy": n, "cute": n, "charisma": n, "darkness": n, "freshness": n,
    "elegance": n, "freedom": n, "luxury": n, "purity": n, "uniqueness": n
  },
  "scentCategories": {                               // 전부 1-10 정수. 0 금지! 용신·결핍 오행의 노트 어휘를 높게
    "citrus": n, "floral": n, "woody": n, "musky": n, "fruity": n, "spicy": n
  },
  "dominantColors": ["#HEX", "#HEX", "#HEX", "#HEX"],  // 오행 팔레트에서 도출 (아래 색 규칙 참조)
  "personalColor": {
    "season": "spring|summer|autumn|winter",          // 월지 계절 + 오행 톤에서 도출
    "tone": "bright|light|mute|deep",
    "palette": ["#HEX" 5개],
    "description": "3-4문장, 명식 근거 서술"
  },
  "analysis": {
    "mood": "명식 전체가 풍기는 분위기. 3-4문장, 명식 글자 인용",
    "style": "이 기운이 밖으로 입는 옷(스타일의 결). 3-4문장",
    "expression": "기운이 드러나는 방식(표정·몸짓·말의 온도). 3-4문장",
    "concept": "조향 컨셉 한 줄 정의 + 풀이. 3-4문장"
  },
  "matchingKeywords": ["긍정 키워드 5개 — 명식 어휘 허용 (예: '한낮의 태양')"],
  "matchingPerfumes": [                              // 정확히 1개!
    {
      "perfumeId": "AC'SCENT XX",                    // 위 DB의 실제 id
      "score": 0.85-1.0,
      "matchReason": "4-6문장. 3단 논법 요약: 명식 글자 → 용신/결핍 → 이 향수의 실제 노트",
      "noteComments": {                              // 기운의 3층 구조 재해석 (각 2-3문장, 실제 노트명 인용)
        "top": "탑 = 겉으로 드러나는 기운 (처음 만나는 사람이 읽는 모습)",
        "middle": "미들 = 중심 기운 (일간의 자리)",
        "base": "베이스 = 뿌리 기운 (용신이 안착하는 자리)"
      },
      "usageGuide": {
        "situation": "사주 논리로 쓴 처방 상황 2-3문장",
        "tips": ["사주 논리 기반 사용 팁 3개 (각 1-2문장)"]
      }
    }
  ],
  "comparisonAnalysis": {
    "imageInterpretation": "명식만으로 읽은 첫인상 5-6문장 (사진 아님 — 여덟 글자가 그리는 사람)",
    "userInputSummary": "의뢰인이 밝힌 목적(${purposeLabel(args.purpose)})과 심원 요약 3-4문장",
    "reflectionDetails": "10-15문장. 반드시 다음 4섹션 구조: 【명식의 첫인상】\\n\\n【숨은 기운】\\n\\n【용신의 다리】\\n\\n【운명의 향】"
  },
  "scentRecommendation": {
    "best_season": "spring|summer|autumn|winter",     // 용신 오행의 계절 (목=spring 화=summer 토=늦여름→summer 금=autumn 수=winter)
    "best_time": "morning|afternoon|evening|night",   // 용신 기운이 필요한 시간대 (사주 논리)
    "season_reason": "1-2문장 사주 논리",
    "time_reason": "1-2문장 사주 논리"
  },
  "sajuAnalysis": {
    "dayMasterReading": {
      "archetypeTitle": "예: '한낮의 태양' (아키타입 표의 자연물, 월지 계절로 변주 가능)",
      "hanja": "일간 두 글자 한자 (예: '丙火')",
      "natureMetaphor": "여는 은유 1-2문장 — '당신이 태어난 순간의 하늘에는...'의 문법",
      "narrative": "8-12문장 본 서사. 아키타입 코어 + 월지 계절 변주 + 신강약 + 그림자의 재해석"
    },
    "pillarsReading": {                               // 각 meaning 2-3문장, 해당 기둥 글자 인용
      "year": { "title": "짧은 제목", "meaning": "년주 = 뿌리·조상·초년의 자리" },
      "month": { "title": "...", "meaning": "월주 = 계절·사회성·부모의 자리" },
      "day": { "title": "...", "meaning": "일주 = 나와 배우자의 자리" },
      "hour": ${isThreePillar ? 'null                                    // 시간 모름 — 반드시 null' : '{ "title": "...", "meaning": "시주 = 말년·자식·내면의 자리" }'}
    },
    "elementFlow": {
      "dominantNarrative": "과다 오행 서사 3-5문장 — 넘침의 장점 먼저, 그림자 나중",
      "lackingNarrative": "결핍 오행 서사 3-5문장 — '비워진 자리' 프레임 (결핍이라 부르지 말 것)",
      "yongsinNarrative": "용신 서사 3-5문장 — 판정 근거(위 JSON의 판정근거)를 풀어서. 향 연결의 다리"
    },
    "purposeReading": {
      "purpose": "${args.purpose}",                     // 이 값 그대로! 변경 금지
      "title": "15자 이내",
      "narrative": "10-14문장. 명식의 구체 글자 인용 필수. 목적별 지침 준수${args.wish ? '. 의뢰인의 심원을 자연스럽게 직조' : ''}",
      "keyInsights": ["정확히 3개 — 각 1문장, 명식 근거 포함"],
      "timingAdvice": "1-2문장. 계절/시간 어휘로 (예언 금지)"
    }${compatSchema},
    "scentDestiny": {
      "whyNarrative": "6-9문장. 3단 논법 강제: ①명식 진단(글자 인용) → ②용신/결핍 오행 → ③감각 번역 → 선택한 향수의 실제 노트 연결",
      "elementBridge": "한 줄 — 예: '금(金)의 기운 — 서늘하게 벼려주는'",
      "topMeaning": "2-3문장. 탑 노트(실제 노트명) = 겉으로 드러나는 기운",
      "middleMeaning": "2-3문장. 미들 노트 = 중심 기운(일간의 자리)",
      "baseMeaning": "2-3문장. 베이스 노트 = 뿌리 기운(용신이 안착하는 자리)",
      "ritualGuide": "2-3문장. 뿌리는 시간/상황 처방 — 사주 논리로 (예: '화 기운이 필요한 그대, 해가 기우는 오후에')",
      "wearingMoment": "2-3문장. 이 향을 입은 한 장면 묘사"
    },
    "yearlyFlow": {
      "yearTitle": "'${args.analysisYear ?? 2026} ○○년' 형식 (위 세운 데이터의 간지)",
      "narrative": "3-4문장. 세운 십성 관계 한 가지만 읽기 + 계절 어휘 조언 한 문장. 재앙/대박 예언 금지"
    }
  }
}
\`\`\``
}

/** 출력 예시 — 문체·구조 견본 (placeholder perfumeId 기법으로 특정 향수 편향 방지) */
const OUTPUT_EXAMPLE = `# 출력 예시 (구조·문체 견본 — 글자·내용은 반드시 실제 명식에서 새로 쓸 것. 분량 규칙이 이 예시보다 우선)
\`\`\`json
{
  "traits": { "sexy": 4, "cute": 3, "charisma": 8, "darkness": 3, "freshness": 6, "elegance": 7, "freedom": 6, "luxury": 5, "purity": 6, "uniqueness": 7 },
  "scentCategories": { "citrus": 9, "floral": 5, "woody": 4, "musky": 3, "fruity": 3, "spicy": 4 },
  "dominantColors": ["#C0392B", "#B8B8B0", "#2C3E60", "#C9A227"],
  "personalColor": { "season": "summer", "tone": "bright", "palette": ["#C0392B", "#E2604E", "#B8B8B0", "#F5EFE2", "#C9A227"], "description": "미월(未月)의 한낮에 태어난 불의 명식입니다. 뜨거운 채도 위에 금(金)의 서늘한 광택이 한 겹 얹힐 때 이 사람의 색은 완성됩니다. 여름의 밝은 기운이 바탕이되, 쨍한 원색보다 빛을 머금은 명도가 어울립니다." },
  "analysis": {
    "mood": "여름 미월(未月)의 병화(丙火) — 명식 전체가 한낮의 열기로 가득합니다. 지지의 인목(寅木)이 불에 장작을 대주니 기세는 꺾이지 않습니다. 다만 금(金)의 자리가 비어 있어, 이 열기를 거두어 줄 서늘함이 이 명식의 숨은 그리움입니다.",
    "style": "감추지 못하는 사람의 스타일입니다. 병화는 구름 뒤에 숨어도 빛이 새어 나옵니다. 화려한 장식보다 흰 셔츠의 광택, 잘 벼려진 단정함이 이 기운을 오히려 돋보이게 합니다.",
    "expression": "표정이 먼저 도착하는 사람입니다. 해자축(亥子丑)의 수 기운이 안쪽에 흐르고 있어, 뜨겁게 말하고 조용히 식는 낙차가 있습니다. 그 낙차가 이 명식의 매력입니다.",
    "concept": "한낮의 태양에 서늘한 광택 한 방울 — '벼려진 여름'. 넘치는 화기를 부정하지 않고, 금의 수렴으로 윤곽을 잡아주는 조향 컨셉입니다."
  },
  "matchingKeywords": ["한낮의 태양", "투명한 열정", "벼려진 광택", "여름의 확신", "서늘한 여운"],
  "matchingPerfumes": [{
    "perfumeId": "(우선 후보 중 이 명식의 이야기와 가장 맞는 향수의 실제 id)",
    "score": 0.93,
    "matchReason": "이 명식에는 금(金)이 없습니다. 미월(未月)의 화기가 강한 사람에게 필요한 것은 더 타오르는 일이 아니라 서늘하게 벼려지는 일입니다. 용신 금(金)의 감각 번역은 베어내는 맑음, 시트러스의 광택 — 이 향수의 탑 노트가 정확히 그 자리를 채웁니다. 향이 곧 처방입니다.",
    "noteComments": {
      "top": "(실제 탑 노트명)의 서늘한 첫인상 — 겉으로 드러나는 기운입니다. 처음 만나는 사람은 이 사람의 열기보다 이 맑은 광택을 먼저 읽습니다.",
      "middle": "(실제 미들 노트명)이 중심 기운, 일간 병화의 자리를 지킵니다. 태양의 온기가 향의 심장에서 계속 뜁니다.",
      "base": "(실제 베이스 노트명)은 뿌리 기운 — 용신 금(金)이 안착하는 자리입니다. 하루의 끝에서 이 서늘한 잔향이 열기를 거두어 줍니다."
    },
    "usageGuide": {
      "situation": "화기가 가장 오르는 한낮 이후, 마음의 온도를 한 단계 내리고 싶을 때의 처방입니다. 중요한 결정을 앞둔 오후에 손목 안쪽에 한 번.",
      "tips": ["오전보다 오후 — 태양이 기울기 시작할 때 금(金)의 수렴이 가장 잘 듣습니다.", "귀 뒤보다 손목 — 맥이 뛰는 자리에서 열기와 서늘함이 섞입니다.", "여름에는 한 번, 겨울에는 두 번 — 계절의 화기에 맞춰 용량을 조절하십시오."]
    }
  }],
  "comparisonAnalysis": {
    "imageInterpretation": "여덟 글자가 그리는 첫인상은 '숨길 수 없는 사람'입니다. 년주부터 시주까지... (명식 글자를 인용하며 5-6문장)",
    "userInputSummary": "의뢰인은 종합운을 물었습니다. 심원으로 남긴 한 문장에는... (3-4문장)",
    "reflectionDetails": "【명식의 첫인상】병화 일간이 미월의 한낮에 떠 있습니다. ... (2-3문장)\\n\\n【숨은 기운】겉글자에는 드러나지 않지만 지장간 깊은 곳에... (2-4문장)\\n\\n【용신의 다리】이 명식의 금(金) 자리는 비어 있습니다. 그래서... (3-4문장)\\n\\n【운명의 향】그 비워진 자리를 채우는 것이 이 향수의 탑 노트입니다. ... (3-4문장)"
  },
  "scentRecommendation": { "best_season": "autumn", "best_time": "afternoon", "season_reason": "용신 금(金)의 계절은 가을 — 수렴의 기운이 가장 잘 스미는 때입니다.", "time_reason": "한낮의 화기가 기울기 시작하는 오후, 서늘한 광택이 가장 오래 머뭅니다." },
  "sajuAnalysis": {
    "dayMasterReading": {
      "archetypeTitle": "한여름의 태양",
      "hanja": "丙火",
      "natureMetaphor": "당신이 태어난 순간의 하늘에는 한낮의 태양이 떠 있었습니다. 그것도 일 년 중 가장 뜨거운 미월(未月)의 태양이.",
      "narrative": "병화(丙火)는 존재만으로 좌중을 밝히는 사람입니다. 촛불처럼 가까운 이만 데우는 불이 아니라, 있는 자리 전체의 온도를 바꾸는 빛입니다. 같은 병화라도 겨울의 태양은 귀하게 대접받는 불이지만, 미월의 병화는 스스로 이글거리는 불 — 당신의 열정은 계절의 도움 없이도 차고 넘칩니다. 그래서 이 명식의 과제는 타오르는 일이 아니라 거두는 일입니다. ... (신강약·그림자 재해석 포함 8-12문장)"
    },
    "pillarsReading": {
      "year": { "title": "물 위에서 시작된 불", "meaning": "년주 을해(乙亥) — 뿌리의 자리에 바다 위 덩굴이 있습니다. ... (2-3문장)" },
      "month": { "title": "한여름의 관문", "meaning": "월주 계미(癸未) — ... (2-3문장)" },
      "day": { "title": "장작을 안은 태양", "meaning": "일주 병인(丙寅) — ... (2-3문장)" },
      "hour": { "title": "낮의 뱀", "meaning": "시주 계사(癸巳) — ... (2-3문장)" }
    },
    "elementFlow": {
      "dominantNarrative": "이 명식은 수(水)와 화(火)가 함께 많은 드문 구조입니다. 불이 많으면 시작이 빠르고 마음이 뜨겁습니다. 다만 불은 스스로를 태우기도 합니다. ... (3-5문장)",
      "lackingNarrative": "당신의 명식에서 금(金)의 자리는 비어 있습니다. 그래서 당신은 그 기운을 밖에서 찾습니다 — 정돈된 것, 벼려진 것, 서늘하게 맑은 것에 끌리는 이유입니다. ... (3-5문장)",
      "yongsinNarrative": "원국의 오행 가운데 금(金)이 가장 약하여, 이 부족한 기운을 채우는 것이 용신입니다. 금은 거두는 기운 — 여름의 곡식을 베어 들이는 가을의 손입니다. 이 기운이 향이 될 수 있습니다. ... (3-5문장)"
    },
    "purposeReading": {
      "purpose": "general",
      "title": "거두는 법을 배우는 해",
      "narrative": "... (10-14문장, 명식 글자 인용, 목적별 지침 준수)",
      "keyInsights": ["일지 인목(寅木)이 불의 장작 — 시작의 힘은 이미 충분합니다.", "비어 있는 금(金)의 자리 — 마무리와 정돈이 올해의 열쇠입니다.", "수(水) 관성이 안쪽에 흐릅니다 — 책임의 무게를 두려워하지 않아도 됩니다."],
      "timingAdvice": "해가 기우는 오후의 결정이 당신에게 유리합니다. 한낮의 확신은 한 박자 쉬었다 꺼내십시오."
    },
    "scentDestiny": {
      "whyNarrative": "당신의 명식에는 금(金)이 없습니다. 미월(未月)의 화기(火氣)가 강한 당신에게 필요한 것은 서늘하게 벼려주는 금의 기운 — ... (①글자 인용 ②용신 ③감각 번역 ④실제 노트 연결, 6-9문장)",
      "elementBridge": "금(金)의 기운 — 서늘하게 벼려 거두는",
      "topMeaning": "(실제 탑 노트명)이 겉으로 드러나는 기운입니다. ... (2-3문장)",
      "middleMeaning": "(실제 미들 노트명)이 일간 병화의 자리를 지킵니다. ... (2-3문장)",
      "baseMeaning": "(실제 베이스 노트명)에 용신 금(金)이 안착합니다. ... (2-3문장)",
      "ritualGuide": "화기가 오르는 한낮이 지나고 해가 기울기 시작할 때 — 그때가 이 향의 시간입니다. ... (2-3문장)",
      "wearingMoment": "여름 오후 다섯 시, 긴 회의를 끝내고 나온 복도. ... (2-3문장)"
    },
    "yearlyFlow": {
      "yearTitle": "2026 병오년",
      "narrative": "2026 병오년, 당신의 명식에는 비견의 불이 하나 더 들어옵니다. 같은 태양이 두 개 뜨는 해 — 경쟁이 아니라 동행으로 읽으십시오. ... (3-4문장)"
    }
  }
}
\`\`\``

export function buildSajuPrompt(args: SajuPromptArgs): string {
    const { chart, purpose, targetType, name, gender, wish } = args
    const year = args.analysisYear ?? 2026
    const isCompat = purpose === 'compatibility'
    const dm = chart.dayMaster
    const subject = targetType === 'idol' ? `${name} 님(최애)` : `${name} 님(본인)`

    const purposeGuide = purpose === 'general'
        ? PURPOSE_GUIDES.general
        : `${PURPOSE_GUIDES.general}\n\n${PURPOSE_GUIDES[purpose]}\n\n※ 위 종합 지침은 서사의 바탕이고, **${purposeLabel(purpose)} 지침이 purposeReading의 중심**입니다.`

    const threePillarNote = chart.isThreePillar
        ? `\n- **삼주 분석**: 태어난 시간을 모르는 명식입니다. 시주가 없으므로 시주·말년운에 기대는 서술을 절대 하지 마십시오. pillarsReading.hour는 반드시 null.`
        : ''
    const jasiNote = chart.isJasiBirth
        ? `\n- **야자시 출생**: 자시(子時) 출생이므로 유파에 따라 일주가 달라질 수 있습니다. 필요하면 dayMasterReading에서 한 문장으로만 담백하게 언급 가능 (겁주기 금지).`
        : ''

    return `# 역할
당신은 수십 년 명리학(命理學)을 공부한 조향사입니다. 자정의 오래된 한옥 조향소에서 만세력을 펼치고,
여덟 글자를 읽어 부족한 기운을 채우는 향을 조제합니다. 사주는 "운명 감정"이 아니라 **"기운의 조향"** —
향이 곧 처방이라는 세계관으로 말합니다.

- 반드시 현대적 존댓말. "~하오", "~이니" 체 금지.
- 명리 용어를 정확히 쓰되 **즉시 한 줄로 풀어주는 이중 문장**. 예: "당신의 일간은 병화(丙火), 한낮의 태양입니다."
- 절제된 확신의 어조. 과장 감탄사·이모지 남발 금지.
- 단정 대신 자연물 은유로 여십시오. "당신은 ○○형 인간입니다" 식 단정 금지.

${toneSection(targetType, name)}

# 절대 원칙 — 명식은 이미 계산되었다
아래 명식은 만세력(KASI 절기 데이터) 기반으로 **이미 정확히 계산된 결과**입니다.
- **절대 재계산하거나 다른 글자를 언급하지 마십시오. 해석만 하십시오.**
- 서술에는 반드시 이 명식의 **실제 글자를 한자 병기로 인용**하십시오. 예: "일지에 인목(寅木)이 앉아…"
- 주입된 JSON에 없는 글자·관계·십성을 지어내면 실패입니다.${threePillarNote}${jasiNote}

# 의뢰인 정보
- 명식의 주인: ${subject} / 성별: ${gender}
- 알고 싶은 것(목적): **${purposeLabel(purpose)}**
${wish ? `- 심원(心願) — 마음에 걸리는 한 문장: "${wish}"\n  → 이 문장을 purposeReading과 scentDestiny 서사에 자연스럽게 직조하십시오 (그대로 복창하지 말고, 명식의 언어로 응답할 것).` : '- 심원(心願): (입력하지 않음)'}

# 계산된 명식 (만세력)
\`\`\`json
${chartToPromptJson(chart)}
\`\`\`

# 세운 — 올해의 흐름 (코드 계산 완료)
${yearlyFlowFacts(chart, year)}
→ yearlyFlow는 이 십성 관계 **한 가지만** 읽습니다. "${year} ○○년, 이 명식에는 ○○이 들어옵니다"의 문법 + 계절 어휘 조언 한 문장. 재앙/대박 예언 금지.
${compatibilitySection(args)}
# 일간 10아키타입 — 해석의 출발점
${ARCHETYPE_TABLE}

**변주 규칙 (필수)**: 이 표는 출발점일 뿐입니다. **월지 계절로 반드시 변주하십시오** — 같은 병화라도 겨울 병화(귀한 온기)와 여름 병화(스스로 이글거리는 불)는 다른 사람입니다. 이 명식의 일간은 **${dm.gan}(${dm.hanja})**, 월지 계절은 **${JI_SEASON[chart.pillars.month.ji]}**, 신강약은 **${dm.strength}** — 세 가지를 교차시켜 이 사람만의 아키타입을 빚으십시오. 그림자 열은 "약점을 매력으로 뒤집는" 문법의 견본입니다.

# 오행 서사 규칙
- **과다(위 JSON의 과다오행)**: 그 기운의 "넘침"을 장점 먼저, 그림자 나중 순서로. 예: "불이 많은 명식입니다. 시작이 빠르고 마음이 뜨겁습니다. 다만 불은 스스로를 태우기도 합니다."
- **부족(결핍오행)**: 결핍이 아니라 **"비워진 자리"** 프레임 — "당신의 명식에서 수(水)의 자리는 비어 있습니다. 그래서 당신은 그 기운을 밖에서 찾습니다."
- **용신**: "당신에게 필요한 단 하나의 기운" — 위 JSON의 판정근거 문장을 반드시 풀어서 노출하십시오. 이 문장이 향 추천의 논리적 다리입니다.

# 오행 → 향 논리 (납득의 구조 — 3단 논법 강제)
**모든 향 서술은 3단 논법을 따릅니다**: ①명식 진단(구체 글자 인용) → ②용신/결핍 오행 → ③그 오행의 감각 번역(노트).
${ELEMENT_SCENT_TABLE}

문법 견본: "당신의 명식에는 금(金)이 없습니다. 여름의 화기(火氣)가 강한 당신에게 필요한 것은 서늘하게 벼려주는 금의 기운 — 유자와 로즈마리의 차가운 광택이 그 자리를 채웁니다."

**오행별 향 언어 (elementBridge·whyNarrative의 재료)**:
${(Object.keys(ELEMENT_SCENT_LANGUAGE) as Element[]).map((e) => `- ${el(e)}: ${ELEMENT_SCENT_LANGUAGE[e].motion} / 노트: ${ELEMENT_SCENT_LANGUAGE[e].notes}`).join('\n')}

**탑/미들/베이스 재해석 (고정 문법)**: 탑 = 겉으로 드러나는 기운(처음 만나는 사람이 읽는 모습), 미들 = 중심 기운(일간의 자리), 베이스 = 뿌리 기운(용신이 안착하는 자리).

# 목적별 해석 지침
${purposeGuide}

# 금지 클리셰
${FORBIDDEN_CLICHES}

${candidatesSection(args.candidates, chart.yongsin.element)}

# 수치·색 규칙
- **traits / scentCategories: 전 항목 1-10 사이의 정수. 0은 절대 금지** (검증기가 거부합니다). 명식에서 도출하십시오 — 예: 화 과다 → charisma·freshness↑, 수 과다 → darkness·elegance↑, 관성 강함 → elegance↑, 식상 강함 → freedom·uniqueness↑.
- scentCategories는 용신·결핍 오행의 노트 어휘 축을 높게 (예: 용신 금 → citrus↑).
- **dominantColors 4개**: 오행 팔레트에서 도출 — 목 ${SAJU_ELEMENT_INFO.목.color} / 화 ${SAJU_ELEMENT_INFO.화.color} / 토 ${SAJU_ELEMENT_INFO.토.color} / 금 ${SAJU_ELEMENT_INFO.금.color} / 수 ${SAJU_ELEMENT_INFO.수.color}. 과다 오행 + 일간 오행 + 용신 오행의 색을 중심으로 4개 HEX를 고르십시오 (미세 변형 허용).
- personalColor.season/tone은 반드시 영문 enum 값 그대로.
- matchingPerfumes[0].score: 0.85-1.0.
- matchingKeywords: 반드시 **긍정** 키워드 5개.${isCompat ? '\n- compatibilityReading.score: 50-99 정수, **80 이상은 아껴서**. 낮아도 부정 금지.' : ''}

# 분량 규칙 (모든 필드 공통 — 한 줄 단답 절대 금지)
- dayMasterReading.narrative: 8-12문장 / natureMetaphor: 1-2문장
- pillarsReading 각 meaning: 2-3문장 (해당 기둥 글자 인용 필수)
- elementFlow 각 서사: 3-5문장
- purposeReading.narrative: 10-14문장 / keyInsights: 정확히 3개(각 1문장) / timingAdvice: 1-2문장
- scentDestiny.whyNarrative: 6-9문장 / top·middle·baseMeaning·ritualGuide·wearingMoment: 각 2-3문장
- yearlyFlow.narrative: 3-4문장
- analysis 각 필드: 3-4문장 / matchReason: 4-6문장 / noteComments 각: 2-3문장${isCompat ? '\n- compatibilityReading.dynamicNarrative: 8-12문장 / adviceNarrative: 3-5문장 / sharedScentNarrative: 3-4문장' : ''}

${outputSchemaSection(args)}

${OUTPUT_EXAMPLE}

# 최종 제약 (전부 필수)
1. 출력은 **JSON 하나만**. 마크다운 설명·코드펜스 밖 텍스트 금지.
2. matchingPerfumes 배열에는 **정확히 1개**만. perfumeId는 DB의 실제 id.
3. 모든 문자열 내 개행은 \\n으로 이스케이프. 큰따옴표는 \\" 로. JSON 문법 오류 = 실패.
4. sajuAnalysis.purposeReading.purpose는 반드시 "${purpose}" 그대로.
5. 명식(사주팔자·오행·용신) 데이터는 서버가 이미 보관합니다 — 출력 JSON에 sajuChart를 포함하지 마십시오.
6. 위 예시의 문장을 복사하지 마십시오. 이 명식의 실제 글자(${chart.pillars.year.gan}${chart.pillars.year.ji}·${chart.pillars.month.gan}${chart.pillars.month.ji}·${chart.pillars.day.gan}${chart.pillars.day.ji}${chart.pillars.hour ? `·${chart.pillars.hour.gan}${chart.pillars.hour.ji}` : ''})로 처음부터 쓰십시오.
7. 모든 서사는 존댓말, 금지 클리셰 준수, 명식 글자 한자 병기 인용.`
}

/** 파싱/검증 실패 시 교정 재시도 프롬프트 (feedback-customize 패턴) */
export function buildSajuRetryPrompt(originalPrompt: string, errorMessage: string): string {
    return `${originalPrompt}

# 🚨 이전 응답 오류 — 반드시 수정할 것
직전 응답이 다음 이유로 거부되었습니다:
"${errorMessage}"

위 오류를 수정한 **완전한 JSON**을 처음부터 다시 출력하십시오.
- JSON 문법(이스케이프·괄호 짝)을 다시 확인할 것
- 필수 필드 누락·개수 규칙(keyInsights 3개, matchingPerfumes 1개 등)을 다시 확인할 것
- traits/scentCategories는 전부 1-10 정수(0 금지)`
}
