// 키오스크 AI 퍼스널 컬러 · AI 타로 분석의 공통 부품 (서버 전용).
// 두 프로그램은 AI에게 유니버설 코어(traits·scentCategories…)를 통째로 쓰게 하지 않는다 —
// 향은 후보 표에서 고른 한 개이고, 코어의 수치는 그 향의 실제 데이터로 채운다(검증할 칸이 줄어 실패가 적다).

import type { Perfume } from '@/data/perfumes'
import { getLocalizedPerfumeText } from '@/data/perfumes-i18n'
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import type { ImageAnalysisResult, PersonalColor } from '@/types/analysis'
import { applyTraditionalPersona } from './analysis-lang'
import { analysisLocale, type KioskLang } from './i18n'
import { PERFUMES_ZH_HANT } from './perfumes-zh-hant'

export const HANGUL = /[가-힣]/
const BACKSLASH = String.fromCharCode(92)

const LANGUAGE_NAMES: Record<Exclude<KioskLang, 'ko'>, string> = {
  en: 'English',
  ja: 'Japanese (日本語, polite です・ます form)',
  'zh-Hans': 'Simplified Chinese (简体中文)',
  'zh-Hant': 'Traditional Chinese (繁體中文, Taiwan usage — never Simplified characters)',
}

/** 프롬프트 맨 끝에 붙이는 출력 언어 규칙 — 지시문은 한국어 그대로 두고 값만 손님 언어로 받는다 */
export function outputLanguageRule(lang: KioskLang): string {
  if (lang === 'ko') return ''
  return `

# OUTPUT LANGUAGE (overrides everything above)
- Write every text value in ${LANGUAGE_NAMES[lang]}. The instructions above are in Korean only to describe the format.
- JSON keys, enum values (typeId, confidence, metal) and perfumeId stay exactly as specified.
- Never output Korean (Hangul) characters. Refer to scents by the names given in the candidate list.`
}

/** 프롬프트에 넣을 향 이름·노트 — 손님 언어 표기 */
export function localPerfumeText(perfume: Perfume, lang: KioskLang) {
  const { locale, traditional } = analysisLocale(lang)
  const text = traditional ? PERFUMES_ZH_HANT[perfume.id] : locale === 'ko' ? undefined : getLocalizedPerfumeText(perfume.id, locale)
  return {
    name: text?.name ?? perfume.name,
    mood: text?.mood ?? perfume.mood,
    keywords: text?.keywords ?? perfume.keywords,
    top: text?.mainScent ?? perfume.mainScent.name,
    middle: text?.subScent1 ?? perfume.subScent1.name,
    base: text?.subScent2 ?? perfume.subScent2.name,
  }
}

export function candidateLines(candidates: Perfume[], lang: KioskLang): string {
  return candidates
    .map((p) => {
      const t = localPerfumeText(p, lang)
      // 화면·영수증이 mainScent=탑, subScent1=미들, subScent2=베이스로 찍으므로 AI 문장도 그 자리에 맞춰 쓰게 한다
      return `- perfumeId "${p.id}" | ${t.name} | top: ${t.top} · middle: ${t.middle} · base: ${t.base} | ${t.mood}`
    })
    .join('\n')
}

// ── 응답 읽기 ──────────────────────────────────────────────

export type Json = Record<string, unknown>

export function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 닫는 괄호가 어긋난 JSON 을 고친다 — 모델이 가끔 배열을 '}' 로 닫거나 마지막 괄호를 빠뜨린다
 * (실측: "tips": [ … } ). 문자열 안은 건드리지 않고, 여는 괄호의 짝에 맞춰 닫는 괄호만 바꾼다.
 */
export function repairJsonClosers(source: string): string {
  const stack: string[] = []
  let out = ''
  let inString = false
  let escaped = false
  for (const ch of source) {
    if (inString) {
      out += ch
      if (escaped) escaped = false
      else if (ch === BACKSLASH) escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      const expected = stack.pop()
      if (expected) out += expected
      continue
    }
    out += ch
  }
  return out + stack.reverse().join('')
}

/** 코드펜스·앞뒤 말을 걷어내고 JSON 객체 하나를 읽는다 */
export function extractJsonObject(responseText: string): Json {
  const body = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = body.indexOf('{')
  if (start === -1) throw new Error('응답에서 JSON 객체를 찾을 수 없습니다. JSON 하나만 출력해야 합니다.')
  let parsed: unknown
  try {
    parsed = JSON.parse(body.slice(start, body.lastIndexOf('}') + 1))
  } catch {
    parsed = JSON.parse(repairJsonClosers(body.slice(start)))
  }
  if (!isRecord(parsed)) throw new Error('응답 최상위가 JSON 객체가 아닙니다.')
  return parsed
}

export function requireText(value: unknown, path: string, max = 600): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} 필드가 비어 있습니다. 반드시 채워야 합니다.`)
  return value.trim().slice(0, max)
}

export function requireRecord(value: unknown, path: string): Json {
  if (!isRecord(value)) throw new Error(`${path} 객체가 누락되었습니다.`)
  return value
}

export function textList(value: unknown, path: string, min: number, max: number, itemMax = 120): string[] {
  const list = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map((v) => v.trim().slice(0, itemMax)) : []
  if (list.length < min) throw new Error(`${path} 는 ${min}개 이상이어야 합니다.`)
  return list.slice(0, max)
}

export function clampScore(value: unknown, fallback = 0.9): number {
  const n = Number(value)
  const base = Number.isFinite(n) ? (n > 1 ? n / 100 : n) : fallback
  return Math.round(Math.max(0.85, Math.min(0.99, base)) * 100) / 100
}

/** 객체 안의 모든 문자열에서 한글이 남은 곳을 찾는다(외국어 출력 검증) */
export function findHangul(value: unknown): string | null {
  if (typeof value === 'string') return HANGUL.test(value) ? value : null
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findHangul(item)
      if (hit) return hit
    }
    return null
  }
  if (isRecord(value)) return findHangul(Object.values(value))
  return null
}

export interface ScentPick {
  perfume: Perfume
  score: number
  bridge: string
  why: string
  notes: { top: string; middle: string; base: string }
  situation: string
  tips: string[]
}

/**
 * scent 블록. 향은 후보 표 안에서만 받는다 — 후보 밖이면 오류로 돌려 다시 받는다
 * (조용히 다른 향으로 바꾸면 설명 문장과 레시피 번호가 어긋난 영수증이 나온다).
 */
export function parseScentPick(raw: unknown, candidates: Perfume[], situationKey: 'situation' | 'ritual' = 'situation'): ScentPick {
  const scent = requireRecord(raw, 'scent')
  const notes = isRecord(scent.notes) ? scent.notes : {}
  const note = (key: string) => (typeof notes[key] === 'string' ? (notes[key] as string).trim().slice(0, 300) : '')
  // 모델이 id 뒤에 향 이름을 붙여 쓰기도 한다("AC'SCENT 29 · 紫羅蘭") — 번호만 읽는다
  const no = String(scent.perfumeId ?? '').match(/SCENT[^0-9]{0,3}([0-9]{1,2})/i)?.[1]
  const picked = no ? candidates.find((p) => p.id.endsWith(` ${no.padStart(2, '0')}`)) : undefined
  if (!picked) {
    throw new Error(`scent.perfumeId 는 후보 중 하나여야 합니다 (${candidates.map((p) => p.id).join(', ')}). 받은 값: ${String(scent.perfumeId)}`)
  }
  return {
    perfume: picked,
    score: clampScore(scent.score),
    bridge: requireText(scent.bridge, 'scent.bridge', 160),
    why: requireText(scent.why, 'scent.why', 900),
    notes: { top: note('top'), middle: note('middle'), base: note('base') },
    situation: requireText(scent[situationKey], `scent.${situationKey}`, 400),
    tips: Array.isArray(scent.tips) ? scent.tips.filter((t): t is string => typeof t === 'string' && Boolean(t.trim())).map((t) => t.trim().slice(0, 160)).slice(0, 3) : [],
  }
}

// ── 코어 조립 ──────────────────────────────────────────────

/** 향 한 개 + 프로그램이 쓴 문장 → 화면·영수증·기록이 공통으로 읽는 코어. 수치는 그 향의 실제 데이터 */
export function buildProgramCore(opts: {
  lang: KioskLang
  pick: ScentPick
  keywords: string[]
  personalColor: PersonalColor
  dominantColors: string[]
  analysis: { mood: string; style: string; expression: string; concept: string }
}): ImageAnalysisResult {
  const { pick, lang } = opts
  const p = pick.perfume
  const { locale, traditional } = analysisLocale(lang)
  const text = locale === 'ko' ? undefined : getLocalizedPerfumeText(p.id, locale)
  const core: ImageAnalysisResult = {
    traits: p.traits,
    scentCategories: p.characteristics,
    dominantColors: opts.dominantColors,
    personalColor: opts.personalColor,
    analysis: opts.analysis,
    matchingKeywords: opts.keywords,
    matchingPerfumes: [{
      perfumeId: p.id,
      score: pick.score,
      matchReason: pick.why,
      persona: {
        id: p.id,
        name: text?.name ?? p.name,
        description: text?.description ?? p.description,
        traits: p.traits,
        categories: p.characteristics,
        keywords: text?.keywords ?? p.keywords,
        primaryColor: p.primaryColor,
        secondaryColor: p.secondaryColor,
        mainScent: { name: text?.mainScent ?? p.mainScent.name, fanComment: pick.notes.top || undefined },
        subScent1: { name: text?.subScent1 ?? p.subScent1.name, fanComment: pick.notes.middle || undefined },
        subScent2: { name: text?.subScent2 ?? p.subScent2.name, fanComment: pick.notes.base || undefined },
        recommendation: pick.situation,
        mood: text?.mood ?? p.mood,
        personality: text?.personality ?? p.personality,
        usageGuide: { situation: pick.situation, tips: pick.tips },
      },
    }],
  }
  return traditional ? applyTraditionalPersona(core) : core
}

// ── AI 호출 ────────────────────────────────────────────────

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

/**
 * 프롬프트를 보내 parse 가 통과할 때까지 받는다(한 번 다시 시도). parse 가 던진 오류 문장은
 * 다음 시도 프롬프트에 그대로 붙는다 — 사주 라우트의 교정 재시도와 같은 방식.
 */
export async function generateParsed<T>(opts: {
  requestId: string
  prompt: string
  image?: string
  temperature: number
  parse: (responseText: string) => T
  timeoutMs?: number
  retries?: number
}): Promise<T> {
  const model = getModelWithConfig({ maxOutputTokens: 4096, temperature: opts.temperature })
  const retries = opts.retries ?? 1
  let lastError = ''
  for (let i = 0; i <= retries; i += 1) {
    const text = i === 0 ? opts.prompt : `${opts.prompt}\n\n# 직전 출력의 오류 (반드시 고칠 것)\n${lastError}\n위 오류를 고쳐 완전한 JSON 하나만 다시 출력하십시오.`
    const parts: Part[] = [{ text }]
    if (opts.image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: opts.image.includes(',') ? opts.image.split(',')[1] : opts.image } })
    try {
      const started = Date.now()
      const res = await withTimeout(
        model.generateContent({ contents: [{ role: 'user', parts }] }),
        opts.timeoutMs ?? 45000,
        'AI request timed out',
      )
      console.log(`[${opts.requestId}] 응답 수신 (${Date.now() - started}ms)`)
      return opts.parse(res.response.text())
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error(`[${opts.requestId}] 시도 ${i + 1} 실패: ${lastError}`)
    }
  }
  throw new Error(lastError || 'AI 응답을 만들지 못했습니다.')
}

/** 외국어 출력에 한글이 섞였으면 오류로 돌려 다시 받게 한다 */
export function assertNoHangul(lang: KioskLang, value: unknown): void {
  if (lang === 'ko') return
  const hit = findHangul(value)
  if (hit) throw new Error(`Output contained Korean (Hangul) characters — rewrite them in the target language: ${hit.slice(0, 80)}`)
}
