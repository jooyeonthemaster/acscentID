import { NextRequest, NextResponse } from 'next/server'
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import { requireAuthenticatedUser } from '@/lib/auth/require-user'
import { getApiLocale } from '@/lib/api-locale'
import { locales, localeNames, type Locale } from '@/i18n/config'
import type { ImageAnalysisResult, SajuAnalysisResult } from '@/types/analysis'

// 사주 결과(SajuAnalysisResult)도 이 라우트로 번역된다.
// 단, 계산된 명식 데이터(sajuChart/sajuPurpose/sajuCompatibility)는 번역기를 절대 통과하지 않는다 —
// 프롬프트에 넣기 전에 분리하고, 번역 후 원본 그대로 재부착한다. (sajuAnalysis 서사만 번역 대상)
type TranslatableAnalysisResult = ImageAnalysisResult &
  Partial<Pick<SajuAnalysisResult, 'sajuChart' | 'sajuAnalysis' | 'sajuPurpose' | 'sajuCompatibility'>>

interface TranslateImageResultRequest {
  result?: TranslatableAnalysisResult
  sourceLocale?: string | null
  targetLocale?: string
  protectedNames?: string[]
}

interface TranslateImageResultResponse {
  success: boolean
  data?: ImageAnalysisResult
  error?: string
}

function normalizeLocale(value: unknown): Locale | null {
  return typeof value === 'string' && locales.includes(value as Locale)
    ? value as Locale
    : null
}

function extractJsonObject(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) return fenced[1].trim()

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  throw new Error('No JSON object found in translation response')
}

function buildTranslationPrompt({
  result,
  sourceLocale,
  targetLocale,
  protectedNames,
}: {
  result: ImageAnalysisResult
  sourceLocale: string | null
  targetLocale: Locale
  protectedNames: string[]
}) {
  const targetLanguage = localeNames[targetLocale]
  const names = protectedNames.map((name) => name.trim()).filter(Boolean)

  return `
You are localizing an AC'SCENT AI image analysis result JSON object.

Target language: ${targetLanguage} (${targetLocale})
Source language: ${sourceLocale || 'unknown / mixed'}

Return ONLY a valid JSON object with exactly the same shape as the input.

Translate every user-facing display string into the target language, including:
- personalColor.description
- analysis.mood, analysis.style, analysis.expression, analysis.concept, analysis.aura, analysis.toneAndManner
- matchingKeywords
- matchingPerfumes[].matchReason
- persona.name, persona.description, persona.keywords, persona.mood, persona.personality, persona.recommendation
- persona.mainScent/subScent1/subScent2 names only when they are ordinary scent names, plus descriptions and fan comments
- persona.usageGuide.situation and persona.usageGuide.tips
- comparisonAnalysis.imageInterpretation, userInputSummary, reflectionDetails
- scentRecommendation.season_reason and time_reason
- sajuAnalysis narrative fields (when present):
  dayMasterReading.archetypeTitle / natureMetaphor / narrative,
  pillarsReading.year/month/day/hour title and meaning,
  elementFlow.dominantNarrative / lackingNarrative / yongsinNarrative,
  purposeReading.title / narrative / keyInsights / timingAdvice,
  compatibilityReading.title / dynamicNarrative / harmonyPoints / frictionPoints / adviceNarrative / sharedScentNarrative,
  scentDestiny.whyNarrative / elementBridge / topMeaning / middleMeaning / baseMeaning / ritualGuide / wearingMoment,
  yearlyFlow.yearTitle and narrative

Do NOT translate or change:
- JSON object keys
- numbers, booleans, null values, arrays, or object structure
- IDs such as "AC'SCENT 07", persona.id, and perfumeId
- enum/code values such as season, tone, best_season, best_time, category keys, and trait keys
- HEX colors, scores, ratios, timestamps, and URLs
- sajuChart, sajuPurpose, sajuCompatibility objects (computed saju chart data — must stay byte-identical if present)
- sajuAnalysis.dayMasterReading.hanja (Hanja glyphs such as 丙火)
- sajuAnalysis.purposeReading.purpose (enum id: general/love/wealth/career/compatibility — keep exactly)
- Hanja (Chinese characters) embedded in narratives, e.g. 丙火, 用神, 未月 — keep the glyphs, translate only the surrounding text
- these user-entered names exactly: ${names.length ? names.join(', ') : '(none)'}

If a string combines protected names with descriptive text, keep the names exactly and translate only the descriptive text.
For reflectionDetails, keep any section markers in a clear localized bracket format so the UI can split the four sections.

Input JSON:
${JSON.stringify(result)}
`.trim()
}

export async function POST(request: NextRequest) {
  const requestId = `IMAGE-TRANSLATE-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  try {
    const authedUser = await requireAuthenticatedUser()
    if (!authedUser) {
      return NextResponse.json<TranslateImageResultResponse>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json<TranslateImageResultResponse>(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as TranslateImageResultRequest
    const result = body.result
    if (!result?.matchingPerfumes?.length || !result.traits || !result.scentCategories) {
      return NextResponse.json<TranslateImageResultResponse>(
        { success: false, error: 'Invalid image analysis result payload' },
        { status: 400 }
      )
    }

    const targetLocale = normalizeLocale(body.targetLocale) || getApiLocale(request)
    const sourceLocale = normalizeLocale(body.sourceLocale) || body.sourceLocale || null
    const protectedNames = Array.isArray(body.protectedNames) ? body.protectedNames : []

    console.log(`[${requestId}] Translating image analysis result to ${targetLocale}`)

    // 계산된 사주 데이터는 번역 입력에서 아예 제거 — 모델이 명식을 훼손할 가능성을 원천 차단하고
    // 번역 후 원본 그대로 재부착한다. (sajuAnalysis 서사는 남겨서 번역)
    const { sajuChart, sajuPurpose, sajuCompatibility, ...translatableResult } = result

    const prompt = buildTranslationPrompt({
      result: translatableResult,
      sourceLocale,
      targetLocale,
      protectedNames,
    })
    const model = getModelWithConfig({ maxOutputTokens: 24576, temperature: 0.15 })
    const translationResult = await withTimeout(
      model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      45000,
      'Image result translation timed out (45s)'
    )

    const responseText = translationResult.response.text()
    const translated = JSON.parse(extractJsonObject(responseText)) as TranslatableAnalysisResult

    if (!translated?.matchingPerfumes?.length || !translated.traits || !translated.scentCategories) {
      throw new Error('Translated payload is missing required image analysis fields')
    }

    // 사주 결과 후처리 — 번역이 건드리면 안 되는 값 강제 복원 + 계산 데이터 재부착
    if (result.sajuAnalysis) {
      if (!translated.sajuAnalysis) {
        throw new Error('Translated payload is missing sajuAnalysis fields')
      }
      translated.sajuAnalysis.purposeReading.purpose = result.sajuAnalysis.purposeReading.purpose
      translated.sajuAnalysis.dayMasterReading.hanja = result.sajuAnalysis.dayMasterReading.hanja
      if (result.sajuAnalysis.pillarsReading.hour === null) {
        translated.sajuAnalysis.pillarsReading.hour = null // 삼주(시간 모름) 계약 유지
      }
    }
    if (sajuChart) translated.sajuChart = sajuChart
    if (sajuPurpose) translated.sajuPurpose = sajuPurpose
    if (sajuCompatibility) translated.sajuCompatibility = sajuCompatibility

    return NextResponse.json<TranslateImageResultResponse>({
      success: true,
      data: translated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown translation error'
    console.error(`[${requestId}] Failed to translate image analysis result:`, message)
    return NextResponse.json<TranslateImageResultResponse>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
