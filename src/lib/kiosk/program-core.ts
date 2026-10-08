// 키오스크 AI 퍼스널 컬러 · AI 타로 분석의 공통 부품 (서버 전용).
// 두 프로그램은 향을 추천하지 않는다 — 진단서 / 타로 리딩만 만든다(2026-10-09, 향·제품·레시피 제거).
// 팔레트·뽑힌 카드는 코드가 정하고 AI는 관찰·풀이 문장만 쓴다.

import { getModelWithConfig, withTimeout } from '@/lib/gemini/client'
import type { KioskLang } from './i18n'
import { fixHangulDeep, setAtPath, type HangulLeftover } from './saju-hangul'

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
- JSON keys and enum values (typeId, confidence, metal, position) stay exactly as specified.
- Never output Korean (Hangul) characters.`
}

/** 프롬프트에 넣는 손님 입력(이름·성별·질문)을 한 줄로 — 줄바꿈·따옴표·제어 문자로 지시문을 흉내 내지 못하게 */
/** 제어 문자·줄 구분자(U+2028/2029)·따옴표 — 정규식 리터럴에 직접 쓰면 소스가 깨져 코드포인트로 만든다 */
const PROMPT_UNSAFE = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}"${String.fromCharCode(0x201c)}${String.fromCharCode(0x201d)}\`]+`, 'g')

export function promptLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(PROMPT_UNSAFE, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
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

/** 숫자로 읽을 수 있을 때만 — null·빈 문자열·글자는 '없음'(Number(null) 은 0 이라 그대로 쓰면 눈금이 0 으로 간다) */
export function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const n = parseFloat(value.normalize('NFKC'))
    return Number.isFinite(n) ? n : null
  }
  return null
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

// ── AI 호출 ────────────────────────────────────────────────

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

/** 서버가 답하는 데 쓰는 전체 시간 — 키오스크는 110초 기다린다(KioskClient). 그 안에 성공이든 실패든 답한다 */
const DEADLINE_MS = 88_000
const ATTEMPT_TIMEOUT_MS = 40_000
const MIN_ATTEMPT_MS = 10_000
/** 출력 상한 — 4096 이면 추론 토큰까지 합쳐 가끔 잘렸다(2026-10-08 실측: 29회 중 1회 'Unterminated string') */
const MAX_OUTPUT_TOKENS = 8192
const LANG_NAME: Record<KioskLang, string> = { ko: 'Korean', en: 'English', ja: 'Japanese', 'zh-Hans': 'Simplified Chinese', 'zh-Hant': 'Traditional Chinese' }

/**
 * 외국어 결과에 섞인 한글 — 고칠 수 있는 건 규칙으로 고치고, 남은 문장만 짧은 호출로 그 언어로 고쳐 받는다.
 * 예전엔 한 글자만 섞여도 전체를 다시 받고(재시도 1회) 또 섞이면 손님에게 실패 화면이 떴다. 사주 라우트와 같은 방식.
 * 그래도 남으면 오류를 던져 호출부가 다시 받게 한다.
 */
async function repairHangul<T>(requestId: string, lang: KioskLang, value: T, budgetMs: number): Promise<T> {
  if (lang === 'ko') return value
  const leftovers: HangulLeftover[] = []
  const fixed = fixHangulDeep(value, leftovers)
  if (!leftovers.length) return fixed
  if (budgetMs >= 6_000) {
    try {
      const fixer = getModelWithConfig({ maxOutputTokens: 2048, temperature: 0.2 })
      const prompt = `These ${LANG_NAME[lang]} sentences accidentally contain Korean (Hangul) words. Rewrite each one fully in ${LANG_NAME[lang]} with the same meaning, replacing every Hangul word. Return ONLY JSON: {"items": ["...", ...]} in the same order and count.\n\n${JSON.stringify({ items: leftovers.map((l) => l.text) })}`
      const res = await withTimeout(fixer.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }), Math.min(15_000, budgetMs), 'hangul fix timed out')
      const items = extractJsonObject(res.response.text()).items
      if (Array.isArray(items) && items.length === leftovers.length) {
        items.forEach((t, k) => { if (typeof t === 'string' && t.trim() && !HANGUL.test(t)) setAtPath(fixed, leftovers[k].path, t.trim()) })
      }
    } catch (error) {
      console.warn(`[${requestId}] 한글 고침 실패: ${error instanceof Error ? error.message : error}`)
    }
  }
  const hit = findHangul(fixed)
  if (hit) throw new Error(`Output contained Korean (Hangul) characters — rewrite them in the target language: ${hit.slice(0, 80)}`)
  return fixed
}

/**
 * 프롬프트를 보내 parse 가 통과할 때까지 받는다(최대 3번, 전체 88초 안에서).
 * - 응답이 규칙에 어긋나면(parse 오류) 그 오류 문장을 다음 프롬프트에 붙여 고쳐 받는다.
 * - 업스트림 오류·시간 초과·잘림은 모델에게 알려 줄 일이 아니다 — 같은 프롬프트로 다시 보낸다.
 * - 외국어 결과의 한글은 통과 후에 따로 고친다(repairHangul).
 */
export async function generateParsed<T>(opts: {
  requestId: string
  prompt: string
  image?: string
  temperature: number
  lang: KioskLang
  parse: (responseText: string) => T
}): Promise<T> {
  const model = getModelWithConfig({ maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: opts.temperature })
  const deadline = Date.now() + DEADLINE_MS
  let lastError = ''
  let lastInvalid = false
  for (let i = 0; i < 3; i += 1) {
    const left = deadline - Date.now()
    if (left < MIN_ATTEMPT_MS) break
    const text = lastInvalid ? `${opts.prompt}\n\n# 직전 출력의 오류 (반드시 고칠 것)\n${lastError}\n위 오류를 고쳐 완전한 JSON 하나만 다시 출력하십시오.` : opts.prompt
    const parts: Part[] = [{ text }]
    if (opts.image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: opts.image.includes(',') ? opts.image.split(',')[1] : opts.image } })
    const started = Date.now()
    try {
      const res = await withTimeout(
        model.generateContent({ contents: [{ role: 'user', parts }] }),
        Math.min(ATTEMPT_TIMEOUT_MS, left - 2_000),
        'AI request timed out',
      )
      const raw = res.response.text()
      console.log(`[${opts.requestId}] 응답 수신 (${Date.now() - started}ms, ${raw.length}자, finish=${res.response.finishReason ?? '?'})`)
      if (!raw.trim()) { lastInvalid = false; throw new Error(`EMPTY_RESPONSE (finish=${res.response.finishReason ?? '?'})`) }
      if (res.response.finishReason === 'length') { lastInvalid = false; throw new Error('TRUNCATED: 출력이 상한에서 잘렸습니다.') }
      lastInvalid = true // 여기부터의 오류는 응답 내용 문제
      const parsed = opts.parse(raw)
      return await repairHangul(opts.requestId, opts.lang, parsed, deadline - Date.now() - 2_000)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (/timed out|OpenRouter API error|fetch failed|ECONNRESET/i.test(lastError)) lastInvalid = false
      // 운영 로그 검색어: "[KIOSK-COLOR-" / "[KIOSK-TAROT-" + "시도 N 실패"
      console.error(`[${opts.requestId}] 시도 ${i + 1} 실패 (${lastInvalid ? 'invalid' : 'upstream'}, ${Date.now() - started}ms, lang=${opts.lang}): ${lastError.slice(0, 400)}`)
      if (!lastInvalid) await new Promise((resolve) => setTimeout(resolve, 1_200))
    }
  }
  throw new Error(lastError || 'AI 응답을 만들지 못했습니다.')
}
