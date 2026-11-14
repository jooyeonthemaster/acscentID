import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { takeKioskUsage } from '@/lib/kiosk/usage-cap'
import { FG_FORTUNE_KEY_ENV, FG_FORTUNE_MODEL, buildFgFortunePrompt, requestFgFortune } from '@/lib/funground/saju-fortune'
import { buildFgSajuReading, fgChartView, fgSajuChart, parseFgBirth, type FgSajuResult } from '@/lib/funground/saju-reading'
import type { SajuChart } from '@/lib/saju'

// 펀그라운드 별내 A안 AI 포춘 — 생일로 원국을 계산하고(서버) AI 가 청소년 풀이를 쓴다. 화면: /booth-demo/funground/saju?engine=ai
// 무엇이 실패하든(키 없음 · 시간 초과 · 업스트림 오류 · 틀린 JSON) 손님을 돌려보내지 않고 기기 안 풀이(B안과 같은 미리 쓴 문장)로 대신한다 — fallback: true.
// 키는 펀그라운드 전용(OPENROUTER_FUNGROUND_API_KEY)만 읽는다. 없으면 AI 를 부르지 않고 바로 대신한다.
// 하루 상한은 키오스크 분석 몫(takeKioskUsage 'analysis', 데모 화면이면 demo 몫)을 같이 쓴다 — 넘으면 429.
// 로그에는 비용 · 걸린 시간만 남기고 생일은 남기지 않는다.

export const maxDuration = 60
const TIMEOUT_MS = 40_000

type FortuneResponse = ({ success: true } & FgSajuResult & { reason?: string }) | { success: false; error: string }

export async function POST(request: NextRequest) {
  const requestId = `FG-FORTUNE-${Date.now().toString(36)}`
  if (!kioskEnabled(request)) {
    return NextResponse.json<FortuneResponse>({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 })
  }

  let chart: SajuChart
  try {
    const body = (await request.json()) as { birth?: unknown }
    chart = fgSajuChart(parseFgBirth(body?.birth))
  } catch (error) {
    const message = error instanceof Error ? error.message : '생일을 확인해 주세요.'
    return NextResponse.json<FortuneResponse>({ success: false, error: message }, { status: 400 })
  }

  const view = fgChartView(chart)
  const local = buildFgSajuReading(chart)
  const fallback = (reason: string) => {
    console.warn(`[${requestId}] 미리 쓴 풀이로 대신함: ${reason}`)
    return NextResponse.json<FortuneResponse>({ success: true, engine: 'ai', fallback: true, reason, chart: view, reading: local })
  }

  const apiKey = process.env[FG_FORTUNE_KEY_ENV]
  if (!apiKey) return fallback('no-key')

  // 하루 상한(src/lib/kiosk/usage-cap.ts) — 넘으면 429
  const capped = await takeKioskUsage(request, 'analysis')
  if (capped) return capped

  try {
    const result = await requestFgFortune({ apiKey, prompt: buildFgFortunePrompt(chart, view, local), local, timeoutMs: TIMEOUT_MS })
    console.log(`[${requestId}] 완료 ${result.elapsedMs}ms · cost=${result.cost === null ? '?' : `$${result.cost.toFixed(5)}`} · ${FG_FORTUNE_MODEL}`)
    return NextResponse.json<FortuneResponse>({ success: true, engine: 'ai', fallback: false, chart: view, reading: result.reading })
  } catch (error) {
    return fallback(error instanceof Error ? error.message.slice(0, 200) : 'unknown')
  }
}
