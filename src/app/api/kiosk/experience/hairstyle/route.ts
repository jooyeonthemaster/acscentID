import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { HAIR_STYLES, restyleHair, type HairStyle } from '@/lib/kiosk/hairstyle'
import { KioskImageError } from '@/lib/kiosk/image-gen'
import { takeKioskUsage } from '@/lib/kiosk/usage-cap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * 버추얼 메이크업 — 머리 모양만 바꾼 사진 한 장(키오스크 전용, 비로그인)
 * POST /api/kiosk/experience/hairstyle  { photo(data: 주소), style: bob|long-wave|short|ponytail|bangs|perm } → { image(data: 주소) }
 * 사진과 결과는 저장하지 않는다(src/lib/kiosk/image-gen.ts).
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    const style = String(body?.style ?? '') as HairStyle
    if (!HAIR_STYLES.includes(style) || typeof body?.photo !== 'string') return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    const capped = await takeKioskUsage(request, 'image') // 하루 상한 — src/lib/kiosk/usage-cap.ts
    if (capped) return capped
    return NextResponse.json({ success: true, image: await restyleHair(body.photo, style) })
  } catch (error) {
    if (error instanceof KioskImageError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[hairstyle] 처리 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '머리 모양을 바꾸지 못했어요.' }, { status: 500 })
  }
}
