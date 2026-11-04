import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { CARD_LEGACY_MOODS, CARD_MOODS, generateCardArt, type CardLegacyMood, type CardMood } from '@/lib/kiosk/card-art'
import { KioskImageError } from '@/lib/kiosk/image-gen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * 명함 디자이너 — AI 바탕 그림 한 장(키오스크 전용, 비로그인)
 * POST /api/kiosk/experience/card-art  { mood?: minimal|pastel|…, custom?: string, role?: string, photo?: data: 주소 } → { image(data: 주소) }
 * 사진과 결과는 저장하지 않는다(src/lib/kiosk/image-gen.ts).
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    // 예전 화면(다시 켜지 않은 앱)이 보내는 스타일 이름도 받는다
    const mood = ([...CARD_MOODS, ...CARD_LEGACY_MOODS] as readonly string[]).includes(String(body?.mood)) ? (body.mood as CardMood | CardLegacyMood) : null
    const custom = typeof body?.custom === 'string' ? body.custom : ''
    const role = typeof body?.role === 'string' ? body.role : ''
    const photo = typeof body?.photo === 'string' ? body.photo : null
    if (!mood && !custom.trim()) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    return NextResponse.json({ success: true, image: await generateCardArt(mood, custom, photo, role) })
  } catch (error) {
    if (error instanceof KioskImageError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[card-art] 처리 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '명함을 그리지 못했어요.' }, { status: 500 })
  }
}
