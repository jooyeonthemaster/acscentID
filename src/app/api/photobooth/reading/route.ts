import { NextRequest, NextResponse } from 'next/server'
import { findProgram } from '@/lib/booth/programs/catalog'
import { buildReadingPrompt, isFaceTopic, isReadingProgram, localStory, parseStory, readFacts, sajuViewOf, type ReadingInput, type ReadingStory } from '@/lib/booth/programs/reading'
import { parseFgBirth } from '@/lib/funground/saju-reading'
import { IdolError, spendIdolTicket } from '@/lib/booth/idol-generate'
import { extractJsonObject, generateParsed } from '@/lib/kiosk/program-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** AI 를 이만큼만 기다린다 — 넘으면 미리 쓴 문장(손님 한 명 2분 안팎, docs/nh-awards-demo.md '처리량') */
const AI_WAIT_MS = 10_000
/** 글 모델 — 손님이 기다리는 동안 받는 짧은 글이라 빠른 모델. 2026-11-17 같은 손금 요청 비교: gemini-3-flash-preview(사이트 기본) 7.8~9.2초 · 3번 중 1번 10초 넘어 미리 쓴 문장,
 *  gemini-2.5-flash 2.2~2.6초(글 질 비슷), 2.5-flash-lite 2.1~4.5초(글이 뻔해짐). BOOTH_READING_MODEL 로 바꿀 수 있다 */
const MODEL = process.env.BOOTH_READING_MODEL || 'google/gemini-2.5-flash'
/** 부스 한 대가 몰아 누르는 일 막기(과금 폭주 방지) — 인스턴스 안에서 1분 · 하루 */
const PER_MINUTE = 20
const PER_DAY = 1500
let minuteStart = 0, minuteCount = 0, dayStart = 0, dayCount = 0

/**
 * 포토부스 「2027 정미년 새해 이야기」(관상 FACE! · 사주 SAJU! · 손금 PALM!, 연말 시상식) — 부스 전용, 비로그인
 * POST /api/photobooth/reading  { ticket, program, topic?(관상), birth?(사주), facts?(기기 측정값), photo?(관상 · 손금, 긴 변 640 JPEG) }
 * → { story, engine: 'ai' | 'local', saju? }
 *
 * 글만 받는다(그림은 부스가 기기 안에서 합성). 텍스트 모델 · 키는 부스 AI 코멘트와 같은 사이트 기본 설정(generateParsed · OPENROUTER_API_KEY).
 * 표는 사진 프로그램과 같은 생성 표(이용권 · 무료 · 데모) — 표 하나로 2번. AI 가 10초 안에 오지 않거나 규칙에 어긋나면 미리 쓴 문장(engine 'local').
 * 사진은 이 요청에만 쓰고 저장 · 기록하지 않는다. 사주는 사진을 보내지 않는다(생일만).
 */
export async function POST(request: NextRequest) {
  const requestId = `BOOTH-READING-${Date.now().toString(36)}`
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 1_200_000) return NextResponse.json({ error: '사진이 너무 커요.' }, { status: 413 })
    const body = await request.json().catch(() => null)
    const program = findProgram(body?.program)
    if (!program || program.kind !== 'reading' || !isReadingProgram(program.id)) return NextResponse.json({ error: '프로그램을 확인해 주세요.' }, { status: 400 })
    const facts = readFacts(body?.facts)
    const input: ReadingInput = { program: program.id, facts, photo: false }
    if (program.id === 'nh-face') {
      if (!isFaceTopic(body?.topic)) return NextResponse.json({ error: '이야기 주제를 골라 주세요.' }, { status: 400 })
      input.topic = body.topic
    }
    if (program.id === 'nh-saju') {
      try { input.saju = sajuViewOf(parseFgBirth(body?.birth)) } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : '생년월일을 확인해 주세요.' }, { status: 400 })
      }
    }
    const photo = program.id !== 'nh-saju' && typeof body?.photo === 'string' && /^data:image\/jpeg;base64,/.test(body.photo) && body.photo.length <= 1_000_000 ? body.photo as string : null
    input.photo = Boolean(photo)
    spendIdolTicket(body?.ticket)

    const local = localStory(input)
    const reply = (story: ReadingStory, engine: 'ai' | 'local') => NextResponse.json({ story, engine, ...(input.saju ? { saju: input.saju } : {}) }, { headers: { 'Cache-Control': 'no-store' } })
    const now = Date.now()
    if (now - minuteStart > 60_000) { minuteStart = now; minuteCount = 0 }
    if (now - dayStart > 86_400_000) { dayStart = now; dayCount = 0 }
    if (!process.env.OPENROUTER_API_KEY || minuteCount >= PER_MINUTE || dayCount >= PER_DAY) return reply(local, 'local')
    minuteCount++
    dayCount++

    const started = Date.now()
    const ai = generateParsed<ReadingStory>({
      requestId, prompt: buildReadingPrompt(input), image: photo ?? undefined, temperature: 0.8, lang: 'ko', model: MODEL,
      parse: (text) => parseStory(extractJsonObject(text), input.program),
    })
    const late = new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_WAIT_MS))
    const story = await Promise.race([ai.catch((error) => { console.error(`[${requestId}] AI 실패:`, error instanceof Error ? error.message.slice(0, 300) : error); return null }), late])
    console.log(`[${requestId}] ${program.id} · 사진 ${photo ? '있음' : '없음'} · ${story ? 'AI' : '미리 쓴 문장'} · ${Date.now() - started}ms`)
    return story ? reply(story, 'ai') : reply(local, 'local')
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error(`[${requestId}] 오류:`, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '새해 이야기를 만들지 못했어요.' }, { status: 500 })
  }
}
