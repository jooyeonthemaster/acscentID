// 펀그라운드 별내 A안 「FUTURE NEWS! 2046 별내 신문」 — 질문 셋의 대답만 AI 기자에게 넘겨 1면 기사를 받는다.
// 사진은 보내지 않는다(사진은 기기 안에서 오려 신문에만 쓴다). 이름 · 나이도 받지 않는다 — 호칭은 기기 안에서 정한 「별내 출신 ○○」.
// 응답은 B안 기사 틀(news-template.ts NewsStory)과 같다. 틀 · 길이 · 금지어 검사(checkNewsStory)에 걸리면 던지고,
// 라우트(src/app/api/funground/news/route.ts)가 B안 기사로 대신한다(fallback: true). 모델 · 키 · 호출 방식은 AI 포춘(saju-fortune.ts)과 같다.

import { FG_FORTUNE_KEY_ENV, FG_FORTUNE_MODEL, FG_FORTUNE_URL } from './saju-fortune'
import {
  NEWS_DREAM_BY_ID, NEWS_LIKE_BY_ID, NEWS_LIMITS, NEWS_WISH_BY_ID, checkNewsStory, newsForbiddenWord,
  type NewsAnswers, type NewsStory,
} from './news-template'

export const FG_NEWS_MODEL = FG_FORTUNE_MODEL
/** 펀그라운드 전용 키(STUDIO_FUNGROUND_DONGJU) — 다른 키로 대신하지 않는다 */
export const FG_NEWS_KEY_ENV = FG_FORTUNE_KEY_ENV

export function buildFgNewsPrompt(answers: NewsAnswers, local: NewsStory): string {
  const dream = NEWS_DREAM_BY_ID[answers.dream]
  const like = NEWS_LIKE_BY_ID[answers.like]
  const wish = NEWS_WISH_BY_ID[answers.wish]
  const L = NEWS_LIMITS
  return `당신은 2046년 「별내 미래 신문」의 다정한 기자입니다. 청소년 체험 시설 「펀그라운드 별내」에서 방금 한 사람이 고른 대답 세 개로,
20년 뒤 그 사람이 해낸 멋진 일을 1면 기사로 상상해 씁니다. 「재미로 상상해 보는 미래 신문」입니다.

# 고른 대답
- 내 꿈: ${dream.label} (${dream.line})
- 내가 좋아하는 것: ${like.label} (${like.line})
- 세상에 해 보고 싶은 일: ${wish.label} (${wish.line})
- 기사 속 호칭(그대로 씀): 「${local.kicker}」 — 이름은 모릅니다. 이름을 지어내지 마세요.
- 사진 배경: ${dream.place}

# 쓰는 규칙
- 밝고 다정하고 상상력 넘치는 기사. 세 대답을 모두 엮어 「세상에 해 보고 싶은 일」을 「꿈」으로 이룬 장면을 씁니다. 「좋아하는 것」은 추억이나 아이디어의 씨앗으로 씁니다.
- 신문 기사 말투(~했다 · ~이다). 초등 고학년도 읽을 수 있는 쉬운 말. 따옴표 안의 한마디는 해요체.
- 절대 쓰지 않는 것: 외모 · 얼굴 · 몸 · 키 · 옷차림 이야기, 나이 · 학년, 점수 · 순위 · 등수 · 메달 · 우승 · 겨루기, 연애 · 결혼, 돈 · 상금 · 부자, 실존 인물 · 연예인 · 회사 · 상표 · 학교 이름, 무섭거나 슬픈 이야기(사고 · 병 · 전쟁).
- 「세계 최초」 같은 과장은 괜찮지만 진짜 있었던 일처럼 날짜나 숫자 통계를 꾸며 쓰지 않습니다.
- 펀그라운드 · 별내 · 2046년은 써도 됩니다.

# 길이(꼭 지킴 — 4×6 사진 한 장에 들어갑니다)
- headline: 1면 큰 제목, 띄어쓰기 포함 ${L.headline - 6}자 이내, 호칭 없이 해낸 일만. 예: 「${local.headline}」
- subhead: 부제 한 줄, ${L.subhead - 10}자 이내.
- article: 문단 3개 배열. 문단마다 한두 문장, 띄어쓰기 포함 70자 안팎(아무리 길어도 ${L.paragraph - 30}자), 셋 합쳐 200자 이내. 첫 문단은 「(별내=미래 신문) ${local.kicker}가 …」로 시작. 예시 기사 길이: ${local.article.reduce((n, p) => n + p.length, 0)}자.
- caption: 사진 설명, 「▲ 」로 시작, ${L.caption - 8}자 이내. 사진 속 사람의 모습 · 표정은 묘사하지 말고 장소만 씁니다(예: 「${local.caption}」).
- sidebar: 작은 상자 { "title": "${L.sidebarTitle}자 이내(예: 오늘의 별내 날씨)", "text": "${L.sidebarText - 8}자 이내 재미있는 한 줄" }

# 출력 — JSON 하나만(설명 · 코드 블록 없이)
{ "headline": "...", "subhead": "...", "article": ["...", "...", "..."], "caption": "▲ ...", "sidebar": { "title": "...", "text": "..." } }`
}

/** 문장 단위로 나눈다 — 마침표 · 물음표 · 느낌표 뒤 빈칸에서(따옴표 안 「…요.”라고」는 빈칸이 없어 나누지 않는다) */
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((t) => t.trim()).filter(Boolean)

/**
 * 기사 문단 고르기 — 모델이 문단을 한 글로 붙여 주거나(문자열 · 줄바꿈) 넷 이상으로 쪼개 줘도 2~3 문단으로 맞춘다.
 * 문장을 길이가 비슷하게 세 묶음(문장이 둘이면 두 묶음)으로 다시 나눈다. 글이 아예 없으면 [] — 검사에서 걸린다.
 */
export function normalizeArticle(value: unknown): string[] {
  const asText = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>
      return typeof o.text === 'string' ? o.text : typeof o.paragraph === 'string' ? o.paragraph : ''
    }
    return ''
  }
  const parts = (Array.isArray(value) ? value.map(asText) : asText(value).split(/\n+/))
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (parts.length >= 2 && parts.length <= 3) return parts
  const all = parts.flatMap(sentences)
  if (all.length < 2) return parts
  const groups = Math.min(3, all.length)
  const total = all.reduce((n, t) => n + t.length, 0)
  const out: string[][] = [[]]
  let used = 0
  for (const [i, sentence] of all.entries()) {
    const left = all.length - i
    const need = groups - out.length
    // 다음 묶음으로 넘어갈 때 — 지금 묶음이 몫을 채웠거나, 남은 문장이 남은 묶음 수만큼밖에 없을 때
    if (out[out.length - 1].length && need > 0 && (used >= (total * out.length) / groups || left <= need)) out.push([])
    out[out.length - 1].push(sentence)
    used += sentence.length
  }
  return out.map((g) => g.join(' '))
}

/**
 * 본문을 지면에 맞춘다 — 문단이 길면 끝 문장부터 덜어 내고(문장 하나는 남긴다), 합계가 넘으면 마지막 문단을 뺀다(두 문단은 남긴다).
 * 2026-11-14 실측: 한 문단이 몇 자 넘쳐(125자 > 120) 기사 전체가 미리 쓴 기사로 바뀌었다 — 문장 단위로 줄이면 대부분 살릴 수 있다
 */
export function fitArticle(parts: string[]): string[] {
  const L = NEWS_LIMITS
  const out = parts.map((p) => {
    const list = sentences(p)
    while (list.length > 1 && list.join(' ').length > L.paragraph) list.pop()
    return list.join(' ')
  })
  while (out.length > 2 && out.reduce((n, t) => n + t.length, 0) > L.articleTotal) out.pop()
  return out
}

/** 곁들이 칸(부제 · 사진 설명 · 작은 상자)의 길이 · 금지어 검사 — 문제가 없으면 null */
function sideProblem(value: string, max: number): string | null {
  if (!value) return '비었음'
  if (value.length > max) return `${value.length}자 > ${max}`
  return newsForbiddenWord(value)
}

/**
 * AI 응답(JSON 글) → 기사. 호칭(kicker)은 기기 안 값을 쓴다.
 * 제목 · 본문이 틀 · 길이 · 금지어에 걸리면 던진다(라우트가 B안 기사로 대신). 곁들이 칸(부제 · 사진 설명 · 작은 상자)만 걸리면
 * 그 칸만 B안 기사 값으로 바꿔 끼운다 — 2026-11-14 실측: 모델이 작은 상자 제목을 몇 자 넘겨 쓰는 일이 잦다. 바꾼 칸 이름은 patched 에.
 */
export function parseFgNews(raw: string, local: NewsStory, patched: string[] = []): NewsStory {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    // 앞뒤에 말이 붙어 오는 일이 있다(2026-11-14 실측) — 첫 { 부터 마지막 } 까지만 다시 읽는다
    const from = cleaned.indexOf('{'), to = cleaned.lastIndexOf('}')
    try {
      if (from < 0 || to <= from) throw new Error('no object')
      data = JSON.parse(cleaned.slice(from, to + 1)) as Record<string, unknown>
    } catch {
      throw new Error('JSON 이 아닙니다')
    }
  }
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아닙니다')
  const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
  const sidebar = (typeof data.sidebar === 'object' && data.sidebar !== null ? data.sidebar : {}) as Record<string, unknown>
  let caption = text(data.caption)
  if (caption && !caption.startsWith('▲')) caption = `▲ ${caption}`
  const L = NEWS_LIMITS
  const side = <T,>(name: string, value: T, ok: boolean, fallbackValue: T): T => {
    if (ok) return value
    patched.push(name)
    return fallbackValue
  }
  const subhead = text(data.subhead)
  const box = { title: text(sidebar.title), text: text(sidebar.text) }
  const story: NewsStory = {
    kicker: local.kicker,
    headline: text(data.headline).replace(/^[「“"]|[」”"]$/g, ''),
    subhead: side('subhead', subhead, !sideProblem(subhead, L.subhead), local.subhead),
    article: fitArticle(normalizeArticle(data.article)),
    caption: side('caption', caption, !sideProblem(caption, L.caption), local.caption),
    // 작은 상자는 제목 · 한 줄을 함께 바꾼다(제목과 내용이 어긋나지 않게)
    sidebar: side('sidebar', box, !sideProblem(box.title, L.sidebarTitle) && !sideProblem(box.text, L.sidebarText), local.sidebar),
  }
  const problem = checkNewsStory(story)
  if (problem) throw new Error(problem)
  return story
}

export interface FgNewsCall {
  story: NewsStory
  /** B안 값으로 바꿔 끼운 곁들이 칸(로그용) */
  patched: string[]
  /** OpenRouter 가 알려 준 비용(달러) — 모르면 null */
  cost: number | null
  elapsedMs: number
}

/**
 * OpenRouter 에 기사를 받는다. 키 · 시간 초과 · 업스트림 오류 · 틀린 JSON · 금지어는 모두 던진다(라우트가 B안 기사로 대신한다).
 * fetchImpl 은 시험용(실제 호출 없이 응답을 흉내 낸다).
 */
export async function requestFgNews(
  args: { apiKey: string; prompt: string; local: NewsStory; timeoutMs: number },
  fetchImpl: typeof fetch = fetch,
): Promise<FgNewsCall> {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), args.timeoutMs)
  try {
    const res = await fetchImpl(FG_FORTUNE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'FUN GROUND FUTURE NEWS' },
      body: JSON.stringify({
        model: FG_NEWS_MODEL,
        messages: [{ role: 'user', content: args.prompt }],
        temperature: 0.7,
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
    try {
      const patched: string[] = []
      return { story: parseFgNews(content, args.local, patched), patched, cost, elapsedMs: Date.now() - started }
    } catch (error) {
      // 받은 기사가 검사에 걸려도 비용은 나갔다 — 라우트가 로그에 남기게 붙여 던진다.
      // 틀린 JSON 은 응답 앞뒤 일부를 남긴다(대답은 고른 보기 id 뿐이라 개인 정보가 없다)
      if (error instanceof Error && /JSON/.test(error.message)) console.error('[FG-NEWS] JSON 아님 · 앞:', content.slice(0, 160).replace(/\n/g, ' '), '· 뒤:', content.slice(-120).replace(/\n/g, ' '))
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { cost })
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`시간 초과(${Math.round(args.timeoutMs / 1000)}초)`)
    throw error
  } finally {
    clearTimeout(timer)
  }
}
