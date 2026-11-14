// 펀그라운드 별내 A안 AI 포춘(FORTUNE!) — 서버가 계산한 원국을 넘겨 AI 가 청소년 풀이(공부 · 친구 · 진로 · 꿈 · 마음)를 쓰게 한다.
// 키오스크 사주(SAJU! · src/lib/gemini/saju-prompt-builder.ts)의 원국 설명 방식을 따르되 향 처방 · 연애 · 돈 · 외모 이야기는 뺐다.
// AI 는 계산하지 않는다 — 원국 · 오행 몫 · 용신 · 2027년 십성은 이 서버가 정해서 넘기고, AI 는 문장만 쓴다.
// 응답 틀은 기기 안 풀이(saju-reading.ts FgSajuReading)와 같다. 응답이 틀 · 길이 · 금지어 검사에 걸리면 던지고, 라우트는 기기 안 풀이로 대신한다.
// 라우트: src/app/api/funground/fortune/route.ts (route.ts 에는 핸들러 외 export 를 둘 수 없어 여기 둔다)

import type { SajuChart } from '@/lib/saju'
import {
  FG_ELEMENT_HANJA, FG_ELEMENT_WORD, FG_ELEMENTS, FG_TOPICS, FG_YEAR, FG_YEAR_GANJI, fgForbiddenWord,
  type FgChartView, type FgSajuReading, type FgTopic,
} from './saju-reading'

export const FG_FORTUNE_MODEL = 'google/gemini-2.5-flash'
export const FG_FORTUNE_URL = 'https://openrouter.ai/api/v1/chat/completions'
/** 펀그라운드 전용 키 — 다른 키로 대신하지 않는다(없으면 기기 안 풀이) */
export const FG_FORTUNE_KEY_ENV = 'OPENROUTER_FUNGROUND_API_KEY'

const el = (e: keyof typeof FG_ELEMENT_HANJA) => `${e}(${FG_ELEMENT_HANJA[e]} · ${FG_ELEMENT_WORD[e]})`

/** 원국 → 프롬프트 사실 묶음(AI 가 다시 계산할 여지를 없앤다) */
function chartFacts(chart: SajuChart, view: FgChartView, local: FgSajuReading): string {
  const p = chart.pillars
  const label = (x: typeof p.year | null) => (x ? `${x.gan}${x.ji}(${x.ganHanja}${x.jiHanja}) — 천간 ${el(x.ganElement)} / 지지 ${el(x.jiElement)}` : '(태어난 시간 모름 — 세 기둥으로 풉니다)')
  return JSON.stringify({
    사주팔자: { 년주: label(p.year), 월주: label(p.month), 일주: label(p.day), 시주: label(p.hour) },
    일간: { 글자: `${chart.dayMaster.gan}(${chart.dayMaster.hanja})`, 오행: el(chart.dayMaster.element), 음양: chart.dayMaster.yinYang, 신강약: chart.dayMaster.strength },
    띠: chart.zodiacAnimal,
    오행몫_퍼센트: Object.fromEntries(FG_ELEMENTS.map((e) => [el(e), `${view.percent[e]}%`])),
    가장많은오행: el(local.strong.element),
    가장적은오행: el(local.weak.element),
    힘이되는오행_용신: el(local.yongsin.element),
    [`${FG_YEAR}년`]: `${FG_YEAR_GANJI.label} — 해의 천간 정(丁)은 일간 ${chart.dayMaster.gan}(${chart.dayMaster.hanja}) 기준 ${local.year2027.sipseong}`,
    행운: { 색: local.lucky.color, 물건: local.lucky.item, 습관: local.lucky.habit },
  }, null, 1)
}

export function buildFgFortunePrompt(chart: SajuChart, view: FgChartView, local: FgSajuReading): string {
  return `당신은 청소년 체험 시설(9~19세)의 사주 체험 진행자입니다. 아래 원국은 서버가 이미 계산했습니다. 다시 계산하지 말고, 이 사실만으로 청소년이 읽기 쉬운 풀이를 쓰세요.

# 원국(계산 완료)
${chartFacts(chart, view, local)}

# 쓰는 규칙
- 이 풀이는 「재미로 보는 풀이」입니다. 단정하거나 예언하지 말고 「~할 수 있어요」 「~해 보세요」처럼 부드럽게 씁니다.
- 말투: 초등 고학년도 읽을 수 있는 쉬운 해요체. 어려운 명리 용어는 쓰지 말고, 쓰면 바로 풀어 줍니다.
- 다룰 주제: 나의 일간(성격의 바탕), 오행의 많고 적음, 힘이 되는 기운, ${FG_YEAR}년 흐름, 공부 · 친구 · 진로 · 꿈 · 마음, 행운의 색 · 물건 · 습관.
- 절대 쓰지 않는 것: 향 · 향수 · 향기 처방, 연애 · 이성 친구 · 결혼, 돈 · 재물 · 용돈, 외모 · 얼굴 · 몸, 점수 · 순위 · 등수, 사고 · 병 · 불운 같은 겁주는 말, 특정 학교 · 직업을 정해 주는 말.
- 진로는 「관심을 가져 보세요」처럼 탐색을 권하는 말로만 씁니다.
- 각 text 는 1~2문장, 90자 이내. title 은 18자 이내. 같은 표현을 되풀이하지 않습니다.
- 행운의 색 · 물건 · 습관은 위 원국의 「행운」 값을 그대로 쓰거나 같은 뜻의 짧은 말로 씁니다.

# 출력 — JSON 하나만(설명 · 코드 블록 없이)
{
 "dayMaster": { "title": "자연물 비유 한 줄", "text": "..." },
 "strong": { "title": "가장 많은 오행 한 줄", "text": "..." },
 "weak": { "title": "가장 적은 오행 한 줄", "text": "..." },
 "yongsin": { "title": "힘이 되는 기운 한 줄", "text": "..." },
 "year2027": { "title": "${FG_YEAR}년 한 줄", "text": "..." },
 "topics": {
${FG_TOPICS.map((t) => `  "${t.key}": { "title": "${t.label} 한 줄", "text": "..." }`).join(',\n')}
 },
 "lucky": { "title": "...", "text": "...", "color": "...", "item": "...", "habit": "..." }
}`
}

const TITLE_MAX = 30
const TEXT_MAX = 160

function cardOf(value: unknown, path: string): { title: string; text: string } {
  if (typeof value !== 'object' || value === null) throw new Error(`${path} 가 없습니다`)
  const v = value as Record<string, unknown>
  return { title: str(v.title, `${path}.title`, TITLE_MAX), text: str(v.text, `${path}.text`, TEXT_MAX) }
}

function str(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} 가 비었습니다`)
  const text = value.trim()
  if (text.length > max) throw new Error(`${path} 가 너무 깁니다(${text.length}자)`)
  const bad = fgForbiddenWord(text)
  if (bad) throw new Error(`${path} 에 쓰지 않는 말(${bad})이 있습니다`)
  return text
}

/** AI 응답(JSON 글) → 기기 안 풀이 틀에 문장만 갈아 끼운 풀이. 틀 · 길이 · 금지어가 어긋나면 던진다 */
export function parseFgFortune(raw: string, local: FgSajuReading): FgSajuReading {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    throw new Error('JSON 이 아닙니다')
  }
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아닙니다')
  const topicsRaw = data.topics as Record<string, unknown> | undefined
  if (typeof topicsRaw !== 'object' || topicsRaw === null) throw new Error('topics 가 없습니다')
  const topics = Object.fromEntries(FG_TOPICS.map((t) => [t.key, cardOf(topicsRaw[t.key], `topics.${t.key}`)])) as Record<FgTopic, { title: string; text: string }>
  const luckyRaw = data.lucky as Record<string, unknown> | undefined
  const luckyCard = cardOf(luckyRaw, 'lucky')
  return {
    ids: local.ids,
    dayMaster: { ...local.dayMaster, ...cardOf(data.dayMaster, 'dayMaster') },
    strong: { ...local.strong, ...cardOf(data.strong, 'strong') },
    weak: { ...local.weak, ...cardOf(data.weak, 'weak') },
    yongsin: { ...local.yongsin, ...cardOf(data.yongsin, 'yongsin') },
    year2027: { ...local.year2027, ...cardOf(data.year2027, 'year2027') },
    topics,
    lucky: {
      ...local.lucky,
      ...luckyCard,
      color: str(luckyRaw?.color, 'lucky.color', 20),
      item: str(luckyRaw?.item, 'lucky.item', 20),
      habit: str(luckyRaw?.habit, 'lucky.habit', 24),
    },
  }
}

export interface FgFortuneCall {
  reading: FgSajuReading
  /** OpenRouter 가 알려 준 비용(달러) — 모르면 null */
  cost: number | null
  elapsedMs: number
}

/**
 * OpenRouter 에 풀이를 받는다. 키 · 시간 초과 · 업스트림 오류 · 틀린 JSON 은 모두 던진다(라우트가 기기 안 풀이로 대신한다).
 * fetchImpl 은 시험용(실제 호출 없이 응답을 흉내 낸다).
 */
export async function requestFgFortune(
  args: { apiKey: string; prompt: string; local: FgSajuReading; timeoutMs: number },
  fetchImpl: typeof fetch = fetch,
): Promise<FgFortuneCall> {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), args.timeoutMs)
  try {
    const res = await fetchImpl(FG_FORTUNE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'FUN GROUND FORTUNE' },
      body: JSON.stringify({
        model: FG_FORTUNE_MODEL,
        messages: [{ role: 'user', content: args.prompt }],
        temperature: 0.8,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        usage: { include: true },
      }),
    })
    const body = await res.text()
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
    const data = JSON.parse(body) as { choices?: { message?: { content?: unknown }; finish_reason?: string }[]; usage?: { cost?: unknown }; error?: unknown }
    if (data.error) throw new Error('OpenRouter 오류 응답')
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('빈 응답')
    if (data.choices?.[0]?.finish_reason === 'length') throw new Error('응답이 잘렸습니다')
    const cost = typeof data.usage?.cost === 'number' ? data.usage.cost : null
    return { reading: parseFgFortune(content, args.local), cost, elapsedMs: Date.now() - started }
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`시간 초과(${Math.round(args.timeoutMs / 1000)}초)`)
    throw error
  } finally {
    clearTimeout(timer)
  }
}
