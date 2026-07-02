import { NextRequest, NextResponse } from 'next/server'
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import { requireAuthenticatedUser } from '@/lib/auth/require-user'
import { getApiLocale } from '@/lib/api-locale'
import { locales, localeNames, type Locale } from '@/i18n/config'
import type { ChemistryAnalysisResult } from '@/types/analysis'

interface TranslateChemistryResultRequest {
  result?: ChemistryAnalysisResult
  sourceLocale?: string | null
  targetLocale?: string
  characterNames?: string[]
}

interface TranslateChemistryResultResponse {
  success: boolean
  data?: ChemistryAnalysisResult
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
  characterNames,
}: {
  result: ChemistryAnalysisResult
  sourceLocale: string | null
  targetLocale: Locale
  characterNames: string[]
}) {
  const targetLanguage = localeNames[targetLocale]
  const protectedNames = characterNames
    .map((name) => name.trim())
    .filter(Boolean)

  return `
You are localizing an AC'SCENT chemistry analysis JSON object.

Target language: ${targetLanguage} (${targetLocale})
Source language: ${sourceLocale || 'unknown / mixed'}

Return ONLY a valid JSON object with exactly the same shape as the input.

Translate every user-facing display string into the target language, including:
- image analysis descriptions, moods, styles, expressions, concepts, aura, toneAndManner
- matching keywords and perfume match reasons
- persona descriptions, mood, personality, recommendation, usageGuide tips
- scent note names only when they are ordinary scent names, plus scent note descriptions and fan comments
- scentRecommendation reasons
- chemistryTitle, score tier labels, synergy, harmony, dynamic, layering guide, scenarios, dialogues, color chemistry, face match text, future predictions, futureVision, chemistryStory

Do NOT translate or change:
- JSON object keys
- numbers, booleans, null values, arrays, or object structure
- IDs such as "AC'SCENT 07" and perfumeId
- enum/code values such as chemistryType, season, tone, best_season, best_time, category keys, trait keys
- HEX colors, ratios, scores, and timestamps
- these character/user-entered names exactly: ${protectedNames.length ? protectedNames.join(', ') : '(none)'}

If a string combines protected names with descriptive text, keep the names exactly and translate only the descriptive text.
For hashtags/keywords, localize the words naturally and remove leading # if the original string does not require it.

Input JSON:
${JSON.stringify(result)}
`.trim()
}

export async function POST(request: NextRequest) {
  const requestId = `CHEM-TRANSLATE-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  try {
    const authedUser = await requireAuthenticatedUser()
    if (!authedUser) {
      return NextResponse.json<TranslateChemistryResultResponse>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json<TranslateChemistryResultResponse>(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as TranslateChemistryResultRequest
    const result = body.result
    if (!result?.characterA || !result?.characterB || !result?.chemistry) {
      return NextResponse.json<TranslateChemistryResultResponse>(
        { success: false, error: 'Invalid chemistry result payload' },
        { status: 400 }
      )
    }

    const targetLocale = normalizeLocale(body.targetLocale) || getApiLocale(request)
    const sourceLocale = normalizeLocale(body.sourceLocale) || body.sourceLocale || null
    const characterNames = Array.isArray(body.characterNames) ? body.characterNames : []

    console.log(`[${requestId}] Translating chemistry result to ${targetLocale}`)

    const prompt = buildTranslationPrompt({
      result,
      sourceLocale,
      targetLocale,
      characterNames,
    })
    const model = getModelWithConfig({ maxOutputTokens: 24576, temperature: 0.15 })
    const translationResult = await withTimeout(
      model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      45000,
      'Chemistry result translation timed out (45s)'
    )

    const responseText = translationResult.response.text()
    const translated = JSON.parse(extractJsonObject(responseText)) as ChemistryAnalysisResult

    if (!translated?.characterA || !translated?.characterB || !translated?.chemistry) {
      throw new Error('Translated payload is missing required chemistry fields')
    }

    return NextResponse.json<TranslateChemistryResultResponse>({
      success: true,
      data: translated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown translation error'
    console.error(`[${requestId}] Failed to translate chemistry result:`, message)
    return NextResponse.json<TranslateChemistryResultResponse>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
