import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { buildAiPrompt, readAiRequest, validateAiAnalysis, type AiAnalysis } from '@/lib/kiosk/expansion/ai'
import { extractJsonObject, generateParsed } from '@/lib/kiosk/program-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// generateParsed 는 88초 안에 끝난다
export const maxDuration = 120

/** 기기 한 대가 몰아 누르는 일 막기 — 서버 인스턴스 안에서 1분·하루 상한(과금 폭주 방지) */
const PER_MINUTE = 30
const PER_DAY = Number(process.env.KIOSK_EXPANSION_DAILY_LIMIT) || 3000
let minuteStart = 0, minuteCount = 0, dayStart = 0, dayCount = 0

/**
 * 체험 18종의 AI 분석(키오스크 전용, 비로그인)
 * POST /api/kiosk/experience/expansion  { id, photo?(data: JPEG), facts, answers[], candidates[], context } → { analysis }
 * 사진은 분석에만 쓰고 저장·기록하지 않는다. 실패하면 가짜 결과를 돌려주지 않고 오류를 돌려준다(화면이 다시 시도를 안내).
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const requestId = `KIOSK-EXP-${Date.now().toString(36)}`
  if (Number(request.headers.get('content-length') ?? 0) > 1_700_000) return NextResponse.json({ error: '사진이 너무 커요.' }, { status: 413 })
  const req = readAiRequest(await request.json().catch(() => null))
  if (!req) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'AI 분석 설정이 아직 없어요.' }, { status: 503 })
  const now = Date.now()
  if (now - minuteStart > 60_000) { minuteStart = now; minuteCount = 0 }
  if (now - dayStart > 86_400_000) { dayStart = now; dayCount = 0 }
  if (minuteCount >= PER_MINUTE || dayCount >= PER_DAY) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 })
  minuteCount++
  dayCount++
  try {
    console.log(`[${requestId}] ${req.id} · 사진 ${req.photo ? '있음' : '없음'} · 후보 ${req.candidates.length}`)
    const analysis = await generateParsed<AiAnalysis>({
      requestId, prompt: buildAiPrompt(req), image: req.photo ?? undefined, temperature: 0.7, lang: 'ko',
      parse: (text) => validateAiAnalysis(extractJsonObject(text), req),
    })
    console.log(`[${requestId}] 완료 pick=${analysis.pick ?? '-'}`)
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    // 상세 오류는 로그에만 — 무인증 엔드포인트라 업스트림 메시지를 노출하지 않는다
    console.error(`[${requestId}] AI 분석 실패:`, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 분석을 받지 못했어요.' }, { status: 502 })
  }
}
