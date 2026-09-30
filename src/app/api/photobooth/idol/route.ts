import { NextRequest, NextResponse } from 'next/server'
import { findIdolConcept, IDOL_MAX_PEOPLE } from '@/lib/booth/idol-concepts'
import { generateIdolPhoto, IdolError, spendIdolTicket } from '@/lib/booth/idol-generate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * 포토부스 행사 모드 — AI 아이돌 컨셉 사진 (부스 전용, 비로그인)
 * POST /api/photobooth/idol  { ticket, concept, people, photo: 'data:image/jpeg;base64,…' }
 * → { image: 'data:image/jpeg;base64,…' }
 *
 * ticket 은 이용권 확인(/api/photobooth/pass) 때 받은 서명 표 — 없으면 비용이 드는 생성을 하지 않는다.
 * 손님 사진은 생성에만 쓰고 저장·기록하지 않는다. src/lib/booth/idol-generate.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const concept = findIdolConcept(body?.concept)
    const people = Number(body?.people)
    if (!concept) return NextResponse.json({ error: '컨셉을 골라 주세요.' }, { status: 400 })
    if (!Number.isInteger(people) || people < 1 || people > IDOL_MAX_PEOPLE) {
      return NextResponse.json({ error: `AI 사진은 ${IDOL_MAX_PEOPLE}명까지 만들 수 있어요.` }, { status: 400 })
    }
    spendIdolTicket(body?.ticket)
    const image = await generateIdolPhoto(String(body?.photo ?? ''), concept, people)
    return NextResponse.json({ image }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[idol] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 사진을 만들지 못했어요.' }, { status: 500 })
  }
}
