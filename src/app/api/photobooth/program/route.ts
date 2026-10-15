import { NextRequest, NextResponse } from 'next/server'
import { findProgram, validChoices } from '@/lib/booth/programs/catalog'
import { buildProgramPrompt } from '@/lib/booth/programs/prompts'
import { generateBoothImage, IdolError, spendIdolTicket } from '@/lib/booth/idol-generate'
import { DEMO_TICKET_OWNER, takeDemoGeneration } from '@/lib/booth/demo-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * 포토부스 프로그램(런웨이·한복·웨딩 등 사진 12종) AI 사진 — 부스 전용, 비로그인
 * POST /api/photobooth/program  { ticket, program, choices: { 그룹id: 옵션id }, photos: ['data:image/jpeg;base64,…' (1~2장)] }
 * → { image: 'data:image/jpeg;base64,…' }
 *
 * ticket 은 AI 아이돌과 같은 생성 표(이용권 확인·이용권 없는 모드·영업용 데모가 준다) — 표 하나로 2번(첫 생성 + 재시도).
 * 데모 표는 데모 상한(1분 3장·하루 40장, 모든 데모 생성이 함께 센다)을 따른다. 프롬프트는 서버가 옵션 id 로 만든다.
 * 손님 사진은 생성에만 쓰고 저장·기록하지 않는다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const program = findProgram(body?.program)
    if (!program || program.kind !== 'photo') return NextResponse.json({ error: '프로그램을 확인해 주세요.' }, { status: 400 })
    const choices = validChoices(program, body?.choices)
    if (!choices) return NextResponse.json({ error: '옵션을 다시 골라 주세요.' }, { status: 400 })
    const photos = Array.isArray(body?.photos) ? body.photos.filter((p: unknown): p is string => typeof p === 'string') : []
    if (photos.length !== program.capture.shots) {
      return NextResponse.json({ error: `사진 ${program.capture.shots}장이 필요해요.` }, { status: 400 })
    }
    if (spendIdolTicket(body?.ticket) === DEMO_TICKET_OWNER) await takeDemoGeneration()
    const image = await generateBoothImage(buildProgramPrompt(program, choices, photos.length), photos[0], photos.slice(1))
    return NextResponse.json({ image }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[program] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 사진을 만들지 못했어요.' }, { status: 500 })
  }
}
