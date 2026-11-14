import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { takeKioskUsage } from '@/lib/kiosk/usage-cap'
import { FG_NEWS_KEY_ENV, FG_NEWS_MODEL, buildFgNewsPrompt, requestFgNews } from '@/lib/funground/news-ai'
import { buildNewsStory, parseNewsAnswers, type NewsStory } from '@/lib/funground/news-template'

// 펀그라운드 별내 A안 「FUTURE NEWS! 2046 별내 신문」 — 질문 셋의 대답(목록 id 셋)만 받아 AI 기자가 1면 기사를 쓴다.
// 화면: /booth-demo/funground/news?engine=ai. 사진은 받지 않는다(신문 합성은 화면 기기 안에서).
// 무엇이 실패하든(키 없음 · 시간 초과 · 업스트림 오류 · 틀린 JSON · 금지어) 손님을 돌려보내지 않고 B안 기사(미리 쓴 틀)로 대신한다 — fallback: true.
// 키는 펀그라운드 전용(OPENROUTER_FUNGROUND_API_KEY)만 읽는다. 하루 상한은 AI 포춘과 같은 키오스크 분석 몫(takeKioskUsage 'analysis') — 넘으면 429.
// 로그에는 비용 · 걸린 시간만 남긴다.

export const maxDuration = 60
const TIMEOUT_MS = 30_000

type NewsResponse = { success: true; engine: 'ai'; fallback: boolean; reason?: string; story: NewsStory } | { success: false; error: string }

export async function POST(request: NextRequest) {
  const requestId = `FG-NEWS-${Date.now().toString(36)}`
  if (!kioskEnabled(request)) {
    return NextResponse.json<NewsResponse>({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { answers?: unknown } | null
  const answers = parseNewsAnswers(body?.answers)
  if (!answers) return NextResponse.json<NewsResponse>({ success: false, error: '대답을 확인해 주세요.' }, { status: 400 })

  const local = buildNewsStory(answers)
  /** logOnly — 로그에만 남기는 덧붙임(비용) */
  const fallback = (reason: string, logOnly = '') => {
    console.warn(`[${requestId}] 미리 쓴 기사로 대신함: ${reason}${logOnly}`)
    return NextResponse.json<NewsResponse>({ success: true, engine: 'ai', fallback: true, reason, story: local })
  }

  const apiKey = process.env[FG_NEWS_KEY_ENV]
  if (!apiKey) return fallback('no-key')

  const capped = await takeKioskUsage(request, 'analysis')
  if (capped) return capped

  try {
    // JSON 을 못 읽으면 한 번 더 묻는다(1회 약 $0.001 · 2초) — 남은 시간 안에서만
    const started = Date.now()
    const ask = (timeoutMs: number) => requestFgNews({ apiKey, prompt: buildFgNewsPrompt(answers, local), local, timeoutMs })
    let result: Awaited<ReturnType<typeof ask>>
    try {
      result = await ask(TIMEOUT_MS)
    } catch (first) {
      const left = TIMEOUT_MS - (Date.now() - started)
      if (!(first instanceof Error && /JSON/.test(first.message)) || left < 8_000) throw first
      const firstCost = (first as { cost?: unknown }).cost
      console.warn(`[${requestId}] JSON 을 못 읽어 한 번 더 묻습니다${typeof firstCost === 'number' ? ` · cost=$${firstCost.toFixed(5)}` : ''}`)
      result = await ask(left)
    }
    const patched = result.patched.length ? ` · 미리 쓴 값으로 바꾼 칸: ${result.patched.join(', ')}` : ''
    console.log(`[${requestId}] 완료 ${result.elapsedMs}ms · cost=${result.cost === null ? '?' : `$${result.cost.toFixed(5)}`} · ${FG_NEWS_MODEL}${patched}`)
    return NextResponse.json<NewsResponse>({ success: true, engine: 'ai', fallback: false, story: result.story })
  } catch (error) {
    const cost = (error as { cost?: unknown })?.cost
    const paid = typeof cost === 'number' ? ` · cost=$${cost.toFixed(5)}` : ''
    return fallback(error instanceof Error ? error.message.slice(0, 200) : 'unknown', paid)
  }
}
