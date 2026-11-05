import { NextRequest, NextResponse } from 'next/server'
import { IdolError, readIdolTicket, spendIdolTicket } from '@/lib/booth/idol-generate'
import { DEMO_TICKET_OWNER, takeDemoGeneration } from '@/lib/booth/demo-server'
import { ALL_STRIP_YEARS, generateSteps, planStrip } from '@/lib/booth/programs/timecapsule-server'
import { isStripYears, type StripResponse, type StripYears } from '@/lib/booth/programs/timecapsule-strip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * ANSAN 타임캡슐(2026 안산사이언스밸리 과학축제 AI 포토존) — 부스 전용, 비로그인
 * POST /api/photobooth/timecapsule  { ticket, photo: 'data:image/jpeg;base64,…'(가로 3:2), years?: [10, 20, 30] }
 * → { people, images: [{ years, image: 'data:image/jpeg;base64,…' | null }] }  (못 만든 칸은 null — 부스가 그 칸만 다시 부탁)
 *
 * 사람 읽기(나이·얼굴 자리) → 사람마다 얼굴 클로즈업 → 고른 햇수를 동시에 생성(src/lib/booth/programs/timecapsule-server.ts).
 * 표(ticket)는 다른 프로그램과 같은 생성 표 — 요청 한 번에 1회(세 장을 함께 만든다), 표 하나로 2번(첫 생성 + 못 만든 칸 다시).
 * 5명 이상이면 표를 쓰지 않고 422(다시 찍기 안내). 데모 표는 데모 상한을 요청 한 번에 한 번 센다.
 * 손님 사진은 생성에만 쓰고 저장·기록하지 않는다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const photo = typeof body?.photo === 'string' ? body.photo : ''
    if (!/^data:image\/jpeg;base64,/.test(photo) || photo.length > 3_000_000) {
      return NextResponse.json({ error: '사진 형식이 올바르지 않아요.' }, { status: 400 })
    }
    const asked: unknown[] = Array.isArray(body?.years) ? body.years : ALL_STRIP_YEARS
    const years = [...new Set(asked.filter(isStripYears))] as StripYears[]
    if (!years.length) return NextResponse.json({ error: '만들 장면을 확인해 주세요.' }, { status: 400 })

    // 표는 먼저 확인만 — 인원이 넘쳐 다시 찍게 되는 경우엔 쓰지 않는다
    readIdolTicket(body?.ticket)
    const plan = await planStrip(photo)
    if (spendIdolTicket(body?.ticket) === DEMO_TICKET_OWNER) await takeDemoGeneration()
    const images = await generateSteps(plan, years)
    if (images.every((image) => !image)) throw new IdolError('AI 사진을 만들지 못했어요.', 502)
    const response: StripResponse = { people: plan.people?.length ?? 0, images: years.map((y, i) => ({ years: y, image: images[i] })) }
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[timecapsule] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 사진을 만들지 못했어요.' }, { status: 500 })
  }
}
