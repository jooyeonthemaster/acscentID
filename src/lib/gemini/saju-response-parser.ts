// 사주 분석 응답 파서 — 유니버설 코어는 parseGeminiResponse에 위임, sajuAnalysis 블록은 여기서 검증
// 오류 메시지는 한국어 서술형 — /api/analyze/saju의 교정 재시도 프롬프트(buildSajuRetryPrompt)에 그대로 주입된다.

import type { Locale } from '@/i18n/config'
import type { ImageAnalysisResult, SajuAnalysis, SajuPurpose } from '@/types/analysis'
import { parseGeminiResponse } from './response-parser'

export interface ParseSajuOptions {
    locale: Locale
    /** 요청된 목적 — purposeReading.purpose가 어긋나면 강제 교정 */
    purpose: SajuPurpose
    /** 시간 모름(삼주) — pillarsReading.hour는 반드시 null */
    isThreePillar: boolean
    /** purpose === 'compatibility' — compatibilityReading 필수 */
    requireCompatibility: boolean
}

export interface ParsedSajuResponse {
    /** 유니버설 코어 (persona 하이드레이션 완료 상태) */
    core: ImageAnalysisResult
    sajuAnalysis: SajuAnalysis
}

// ── JSON 추출 (chemistry-response-parser의 균형 괄호 스캐너 복제 — 해당 모듈은 export하지 않음) ──

function extractJsonPayload(responseText: string): string {
    const trimmed = responseText.trim().replace(/^\uFEFF/, '')

    const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJson?.[1]) {
        return extractBalancedJson(fencedJson[1].trim())
    }

    return extractBalancedJson(trimmed)
}

function extractBalancedJson(text: string): string {
    const source = text.trim()
    const start = source.search(/[\[{]/)
    if (start === -1) {
        throw new Error('응답에서 JSON 객체를 찾을 수 없습니다. JSON 하나만 출력해야 합니다.')
    }

    const opening = source[start]
    const closing = opening === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < source.length; index += 1) {
        const char = source[index]

        if (escaped) {
            escaped = false
            continue
        }
        if (char === '\\') {
            escaped = true
            continue
        }
        if (char === '"') {
            inString = !inString
            continue
        }
        if (inString) continue

        if (char === opening) {
            depth += 1
        } else if (char === closing) {
            depth -= 1
            if (depth === 0) {
                return source.slice(start, index + 1)
            }
        }
    }

    throw new Error('JSON 괄호 짝이 맞지 않습니다. 출력이 중간에 잘렸을 수 있으니 완전한 JSON을 다시 출력해야 합니다.')
}

// ── 검증 헬퍼 ──

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireText(value: unknown, path: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${path} 필드가 비어 있거나 문자열이 아닙니다. 분량 규칙에 맞는 서사를 반드시 채워야 합니다.`)
    }
    return value.trim()
}

function requireRecord(value: unknown, path: string): UnknownRecord {
    if (!isRecord(value)) {
        throw new Error(`${path} 객체가 누락되었습니다. 출력 스키마의 해당 블록을 반드시 포함해야 합니다.`)
    }
    return value
}

function requireTitleMeaning(value: unknown, path: string): { title: string; meaning: string } {
    const record = requireRecord(value, path)
    return {
        title: requireText(record.title, `${path}.title`),
        meaning: requireText(record.meaning, `${path}.meaning`),
    }
}

// ── 유니버설 코어 정규화 ──
// 외국어 응답(특히 ja/zh)은 '모든 텍스트 값을 그 언어로' 지시 때문에 enum 까지 번역하거나("秋", "ミュート"),
// 숫자를 문자열로("7", "92%"), 따옴표를 전각·곡선으로("AC’SCENT 07") 내는 일이 있다.
// 사주 화면·영수증은 이 코어 값을 거의 쓰지 않으므로, 기존 검증기에 넘기기 전에 뜻이 분명한 것은 고쳐 받는다.

const SEASON_ALIASES: Record<string, 'spring' | 'summer' | 'autumn' | 'winter'> = {
    봄: 'spring', 春: 'spring', 春天: 'spring', はる: 'spring',
    여름: 'summer', 夏: 'summer', 夏天: 'summer', なつ: 'summer',
    가을: 'autumn', 秋: 'autumn', 秋天: 'autumn', あき: 'autumn', fall: 'autumn',
    겨울: 'winter', 冬: 'winter', 冬天: 'winter', ふゆ: 'winter',
}
const TONE_ALIASES: Record<string, 'bright' | 'light' | 'mute' | 'deep'> = {
    브라이트: 'bright', ブライト: 'bright', 明亮: 'bright', 鮮やか: 'bright', 鲜艳: 'bright', 鮮豔: 'bright', vivid: 'bright',
    라이트: 'light', ライト: 'light', 浅: 'light', 淺: 'light', 浅色: 'light', 淺色: 'light', pale: 'light',
    뮤트: 'mute', ミュート: 'mute', 柔和: 'mute', 低饱和: 'mute', 低飽和: 'mute', soft: 'mute', muted: 'mute',
    딥: 'deep', ディープ: 'deep', 深: 'deep', 深色: 'deep', dark: 'deep',
}

function normalizeEnum<T extends string>(value: unknown, valid: readonly T[], aliases: Record<string, T>, fallback: T): T {
    if (typeof value !== 'string') return fallback
    const raw = value.normalize('NFKC').trim()
    const lower = raw.toLowerCase()
    if ((valid as readonly string[]).includes(lower)) return lower as T
    if (aliases[raw]) return aliases[raw]
    if (aliases[lower]) return aliases[lower]
    // "Autumn (秋)" · "秋（autumn）" 처럼 섞여 오면 들어 있는 값을 쓴다
    const hit = valid.find((v) => lower.includes(v)) ?? Object.keys(aliases).find((k) => raw.includes(k))
    if (hit) return (valid as readonly string[]).includes(hit) ? (hit as T) : aliases[hit]
    return fallback
}

/** 1-10 정수 — "7", "7/10", 7.4 도 받는다. 읽을 수 없으면 5 */
function toScale(value: unknown): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').normalize('NFKC'))
    if (!Number.isFinite(num)) return 5
    return Math.max(1, Math.min(10, Math.round(num)))
}

function firstText(...values: unknown[]): string | undefined {
    for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim()
    return undefined
}

/** "AC’SCENT 7" · "ＡＣ'ＳＣＥＮＴ 07" · "AC SCENT-07" → "AC'SCENT 07" */
export function normalizePerfumeId(value: unknown): unknown {
    if (typeof value !== 'string') return value
    const s = value.normalize('NFKC').replace(/[’‘`´′]/g, "'")
    const m = s.match(/AC\s*'?\s*SCENT\s*[-_#]?\s*0*(\d{1,2})/i)
    return m ? `AC'SCENT ${m[1].padStart(2, '0')}` : s.trim()
}

/** 사주 응답의 코어 필드를 기존 검증기(parseGeminiResponse)가 받는 모양으로 고친다 — 뜻이 분명한 것만 */
export function normalizeSajuCore(parsed: UnknownRecord): UnknownRecord {
    const out: UnknownRecord = { ...parsed }
    const saju = isRecord(parsed.sajuAnalysis) ? parsed.sajuAnalysis : {}
    const dayMaster = isRecord(saju.dayMasterReading) ? saju.dayMasterReading : {}
    const destiny = isRecord(saju.scentDestiny) ? saju.scentDestiny : {}

    const traits = isRecord(parsed.traits) ? parsed.traits : {}
    out.traits = Object.fromEntries(
        ['sexy', 'cute', 'charisma', 'darkness', 'freshness', 'elegance', 'freedom', 'luxury', 'purity', 'uniqueness']
            .map((k) => [k, toScale(traits[k])])
    )
    const cats = isRecord(parsed.scentCategories) ? parsed.scentCategories : {}
    out.scentCategories = Object.fromEntries(
        ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy'].map((k) => [k, toScale(cats[k])])
    )

    const isHex = (c: unknown): c is string => typeof c === 'string' && /^#?[0-9a-f]{3,8}$/i.test(c.trim())
    const hex = (c: string) => (c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`)
    const dominant = Array.isArray(parsed.dominantColors) ? parsed.dominantColors.filter(isHex).map(hex) : []
    const pc = isRecord(parsed.personalColor) ? parsed.personalColor : {}
    const palette = Array.isArray(pc.palette) ? pc.palette.filter(isHex).map(hex) : []
    for (const c of [...dominant, '#2E2A24', '#8A7F6B', '#D9CFBA', '#F2EDE3']) if (palette.length < 4) palette.push(c)
    out.personalColor = {
        ...pc,
        season: normalizeEnum(pc.season, ['spring', 'summer', 'autumn', 'winter'] as const, SEASON_ALIASES, 'autumn'),
        tone: normalizeEnum(pc.tone, ['bright', 'light', 'mute', 'deep'] as const, TONE_ALIASES, 'mute'),
        palette,
        description: firstText(pc.description, dayMaster.natureMetaphor) ?? '-',
    }

    const analysis = isRecord(parsed.analysis) ? parsed.analysis : {}
    const fallback = firstText(analysis.mood, analysis.style, analysis.expression, analysis.concept, dayMaster.natureMetaphor, dayMaster.narrative)
    out.analysis = Object.fromEntries(
        ['mood', 'style', 'expression', 'concept'].map((k) => [k, firstText(analysis[k]) ?? fallback ?? ''])
    )

    let perfumes: unknown[] = Array.isArray(parsed.matchingPerfumes)
        ? parsed.matchingPerfumes
        : isRecord(parsed.matchingPerfumes) ? [parsed.matchingPerfumes] : []
    perfumes = perfumes.filter(isRecord).slice(0, 1).map((p) => {
        const rec = p as UnknownRecord
        let score = typeof rec.score === 'number' ? rec.score : parseFloat(String(rec.score ?? '').normalize('NFKC'))
        if (Number.isFinite(score) && score > 1 && score <= 100) score /= 100
        score = Number.isFinite(score) ? Math.max(0.85, Math.min(1, score)) : 0.9
        return {
            ...rec,
            perfumeId: normalizePerfumeId(rec.perfumeId),
            score,
            matchReason: firstText(rec.matchReason, destiny.whyNarrative) ?? '',
        }
    })
    out.matchingPerfumes = perfumes
    return out
}

/** 문장 단위로 나눈다(한·영·일·중) — keyInsights 가 모자랄 때 풀이에서 채운다 */
function splitSentences(text: string): string[] {
    return (text.match(/[^.!?。！？]+[.!?。！？]+["'”」)]*|[^.!?。！？]+$/g) ?? []).map((s) => s.trim()).filter(Boolean)
}

function clampScore(value: unknown): number {
    const num = Number(value)
    const base = Number.isFinite(num) ? num : 72
    return Math.max(50, Math.min(99, Math.round(base)))
}

// ── 본체 ──

export function parseSajuGeminiResponse(responseText: string, options: ParseSajuOptions): ParsedSajuResponse {
    let parsed: unknown = JSON.parse(extractJsonPayload(responseText))
    if (Array.isArray(parsed)) {
        parsed = parsed[0]
    }
    if (!isRecord(parsed)) {
        throw new Error('응답 최상위가 JSON 객체가 아닙니다. 스키마에 맞는 객체 하나를 출력해야 합니다.')
    }

    // 1) 유니버설 코어 — 기존 파서에 위임 (traits/scentCategories/personalColor/analysis/matchingPerfumes 검증 + persona 하이드레이션)
    let core: ImageAnalysisResult
    try {
        core = parseGeminiResponse(JSON.stringify(normalizeSajuCore(parsed)), options.locale)
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        throw new Error(
            `유니버설 코어 검증 실패 — traits/scentCategories(전 항목 1-10 정수, 0 금지), personalColor(season/tone enum), analysis(mood/style/expression/concept), matchingPerfumes(정확히 1개, 실제 perfumeId, score 0.85-1.0)를 다시 확인하십시오. 원인: ${detail}`
        )
    }

    // 2) sajuAnalysis 블록 검증
    const saju = requireRecord(parsed.sajuAnalysis, 'sajuAnalysis')

    const dayMasterRaw = requireRecord(saju.dayMasterReading, 'sajuAnalysis.dayMasterReading')
    const dayMasterReading: SajuAnalysis['dayMasterReading'] = {
        archetypeTitle: requireText(dayMasterRaw.archetypeTitle, 'sajuAnalysis.dayMasterReading.archetypeTitle'),
        hanja: requireText(dayMasterRaw.hanja, 'sajuAnalysis.dayMasterReading.hanja'),
        natureMetaphor: requireText(dayMasterRaw.natureMetaphor, 'sajuAnalysis.dayMasterReading.natureMetaphor'),
        narrative: requireText(dayMasterRaw.narrative, 'sajuAnalysis.dayMasterReading.narrative'),
    }

    const pillarsRaw = requireRecord(saju.pillarsReading, 'sajuAnalysis.pillarsReading')
    let hourReading: { title: string; meaning: string } | null = null
    if (options.isThreePillar) {
        // 삼주 분석 — AI가 시주 해석을 지어냈다면 폐기 (시간 모름 원칙)
        hourReading = null
    } else if (isRecord(pillarsRaw.hour)) {
        hourReading = requireTitleMeaning(pillarsRaw.hour, 'sajuAnalysis.pillarsReading.hour')
    } else {
        // 사주인데 시주 풀이만 빠졌다 — 화면은 시주 풀이 없이도 그린다. 이것 하나로 전체를 다시 받지 않는다
        console.warn('[Saju Parser] pillarsReading.hour 누락 — 시주 풀이 없이 진행')
        hourReading = null
    }
    const pillarsReading: SajuAnalysis['pillarsReading'] = {
        year: requireTitleMeaning(pillarsRaw.year, 'sajuAnalysis.pillarsReading.year'),
        month: requireTitleMeaning(pillarsRaw.month, 'sajuAnalysis.pillarsReading.month'),
        day: requireTitleMeaning(pillarsRaw.day, 'sajuAnalysis.pillarsReading.day'),
        hour: hourReading,
    }

    const flowRaw = requireRecord(saju.elementFlow, 'sajuAnalysis.elementFlow')
    const elementFlow: SajuAnalysis['elementFlow'] = {
        dominantNarrative: requireText(flowRaw.dominantNarrative, 'sajuAnalysis.elementFlow.dominantNarrative'),
        lackingNarrative: requireText(flowRaw.lackingNarrative, 'sajuAnalysis.elementFlow.lackingNarrative'),
        yongsinNarrative: requireText(flowRaw.yongsinNarrative, 'sajuAnalysis.elementFlow.yongsinNarrative'),
    }

    const purposeRaw = requireRecord(saju.purposeReading, 'sajuAnalysis.purposeReading')
    // keyInsights — 정확히 3개가 계약. 넘치면 앞 3개, 모자라면 풀이 문장으로 채운다(그것도 없으면 다시 받는다)
    const insightsRaw = Array.isArray(purposeRaw.keyInsights)
        ? purposeRaw.keyInsights.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim())
        : typeof purposeRaw.keyInsights === 'string' && purposeRaw.keyInsights.trim() ? splitSentences(purposeRaw.keyInsights) : []
    const keyInsights = insightsRaw.slice(0, 3)
    if (keyInsights.length < 3 && typeof purposeRaw.narrative === 'string') {
        for (const sentence of splitSentences(purposeRaw.narrative)) {
            if (keyInsights.length >= 3) break
            if (!keyInsights.includes(sentence)) keyInsights.push(sentence)
        }
    }
    if (keyInsights.length !== 3) {
        throw new Error(
            `sajuAnalysis.purposeReading.keyInsights는 정확히 3개여야 합니다 (현재 ${insightsRaw.length}). 각 1문장씩 명식 근거를 포함해 3개를 출력하십시오.`
        )
    }
    if (purposeRaw.purpose !== options.purpose) {
        console.warn(
            `[Saju Parser] purposeReading.purpose가 요청(${options.purpose})과 다름(${String(purposeRaw.purpose)}) — 강제 교정`
        )
    }
    const purposeReading: SajuAnalysis['purposeReading'] = {
        purpose: options.purpose, // 요청 값으로 강제 — AI 드리프트 차단
        title: requireText(purposeRaw.title, 'sajuAnalysis.purposeReading.title'),
        narrative: requireText(purposeRaw.narrative, 'sajuAnalysis.purposeReading.narrative'),
        keyInsights,
        timingAdvice: requireText(purposeRaw.timingAdvice, 'sajuAnalysis.purposeReading.timingAdvice'),
    }

    let compatibilityReading: SajuAnalysis['compatibilityReading']
    if (options.requireCompatibility) {
        const compatRaw = requireRecord(
            saju.compatibilityReading,
            'sajuAnalysis.compatibilityReading (궁합 분석에서는 필수)'
        )
        const harmonyPoints = Array.isArray(compatRaw.harmonyPoints)
            ? compatRaw.harmonyPoints.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
            : []
        if (harmonyPoints.length === 0) {
            throw new Error('sajuAnalysis.compatibilityReading.harmonyPoints가 비어 있습니다. 계산된 합(合) 데이터를 인용해 2-3개를 채우십시오.')
        }
        const frictionPoints = Array.isArray(compatRaw.frictionPoints)
            ? compatRaw.frictionPoints.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
            : []
        compatibilityReading = {
            score: clampScore(compatRaw.score),
            title: requireText(compatRaw.title, 'sajuAnalysis.compatibilityReading.title'),
            dynamicNarrative: requireText(compatRaw.dynamicNarrative, 'sajuAnalysis.compatibilityReading.dynamicNarrative'),
            harmonyPoints: harmonyPoints.slice(0, 3),
            frictionPoints: frictionPoints.slice(0, 2),
            adviceNarrative: requireText(compatRaw.adviceNarrative, 'sajuAnalysis.compatibilityReading.adviceNarrative'),
            sharedScentNarrative: requireText(compatRaw.sharedScentNarrative, 'sajuAnalysis.compatibilityReading.sharedScentNarrative'),
        }
    } else {
        compatibilityReading = undefined // 궁합이 아니면 AI가 지어낸 블록은 폐기
    }

    const destinyRaw = requireRecord(saju.scentDestiny, 'sajuAnalysis.scentDestiny')
    const scentDestiny: SajuAnalysis['scentDestiny'] = {
        whyNarrative: requireText(destinyRaw.whyNarrative, 'sajuAnalysis.scentDestiny.whyNarrative'),
        elementBridge: requireText(destinyRaw.elementBridge, 'sajuAnalysis.scentDestiny.elementBridge'),
        topMeaning: requireText(destinyRaw.topMeaning, 'sajuAnalysis.scentDestiny.topMeaning'),
        middleMeaning: requireText(destinyRaw.middleMeaning, 'sajuAnalysis.scentDestiny.middleMeaning'),
        baseMeaning: requireText(destinyRaw.baseMeaning, 'sajuAnalysis.scentDestiny.baseMeaning'),
        ritualGuide: requireText(destinyRaw.ritualGuide, 'sajuAnalysis.scentDestiny.ritualGuide'),
        wearingMoment: requireText(destinyRaw.wearingMoment, 'sajuAnalysis.scentDestiny.wearingMoment'),
    }

    const yearlyRaw = requireRecord(saju.yearlyFlow, 'sajuAnalysis.yearlyFlow')
    const yearlyFlow: SajuAnalysis['yearlyFlow'] = {
        yearTitle: requireText(yearlyRaw.yearTitle, 'sajuAnalysis.yearlyFlow.yearTitle'),
        narrative: requireText(yearlyRaw.narrative, 'sajuAnalysis.yearlyFlow.narrative'),
    }

    const sajuAnalysis: SajuAnalysis = {
        dayMasterReading,
        pillarsReading,
        elementFlow,
        purposeReading,
        ...(compatibilityReading ? { compatibilityReading } : {}),
        scentDestiny,
        yearlyFlow,
    }

    return { core, sajuAnalysis }
}
