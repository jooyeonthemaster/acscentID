import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { buildCareerPrompt, readCareerAiRequest, validateCareerAi, type CareerAiAnalysis } from '@/lib/kiosk/career-ai'
import { extractJsonObject, generateParsed } from '@/lib/kiosk/program-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** 기기 한 대가 몰아 누르는 일 막기 — 서버 인스턴스 안에서 1분·하루 상한 */
const PER_MINUTE = 20
const PER_DAY = 2000
let minuteStart = 0, minuteCount = 0, dayStart = 0, dayCount = 0

/**
 * 미래 직업 탐색(NEXT!)의 AI 분석(키오스크 전용, 비로그인)
 * POST /api/kiosk/experience/career { lang, photo?, interests[], mbti?, answers[], careers[], traits[] } → { analysis }
 * 사진은 분석에만 쓰고 저장하지 않는다. 실패하면 오류 — 화면은 AI 풀이 없이 규칙 결과로 넘어간다.
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const requestId = `KIOSK-CAREER-${Date.now().toString(36)}`
  if (Number(request.headers.get('content-length') ?? 0) > 1_700_000) return NextResponse.json({ error: '사진이 너무 커요.' }, { status: 413 })
  const req = readCareerAiRequest(await request.json().catch(() => null))
  if (!req) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'AI 분석 설정이 아직 없어요.' }, { status: 503 })
  const now = Date.now()
  if (now - minuteStart > 60_000) { minuteStart = now; minuteCount = 0 }
  if (now - dayStart > 86_400_000) { dayStart = now; dayCount = 0 }
  if (minuteCount >= PER_MINUTE || dayCount >= PER_DAY) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 })
  minuteCount++
  dayCount++
  try {
    const analysis = await generateParsed<CareerAiAnalysis>({
      requestId, prompt: buildCareerPrompt(req), image: req.photo ?? undefined, temperature: 0.7, lang: req.lang,
      parse: (text) => validateCareerAi(extractJsonObject(text), req),
    })
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error(`[${requestId}] AI 분석 실패:`, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 분석을 받지 못했어요.' }, { status: 502 })
  }
}
