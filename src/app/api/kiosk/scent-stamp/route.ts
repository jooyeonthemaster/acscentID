import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { SCENT_STAMP_PROMPT } from '@/lib/kiosk/scent-stamp'
import { generateKioskImage, isKioskPhoto, KioskImageError } from '@/lib/kiosk/image-gen'
import { takeKioskUsage } from '@/lib/kiosk/usage-cap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 이미지 생성은 보통 10~25초, 예비 모델까지 가면 100초 남짓
export const maxDuration = 120

/**
 * SCENT! 영상판 영수증 맨 위 도장 그림(2026-11-18) — 촬영 사진을 '향수 부티크에 선 나' 검정 고무도장 라인아트로(키오스크 전용, 비로그인).
 * POST /api/kiosk/scent-stamp  { photo(data: 주소) } → { image(data: 주소) }
 * 분석을 시작할 때 셸(KioskClassic)이 미리 요청해 두고, 영수증을 만들 때 기다린다. 사진과 결과는 저장하지 않는다(src/lib/kiosk/image-gen.ts).
 * 분 · 하루 상한은 다른 그림 기능과 함께 센다.
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    if (!isKioskPhoto(body?.photo)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    const capped = await takeKioskUsage(request, 'image') // 하루 상한 — src/lib/kiosk/usage-cap.ts
    if (capped) return capped
    const image = await generateKioskImage({ tag: 'scent-stamp', prompt: SCENT_STAMP_PROMPT, photos: [body.photo], aspect: '1:1', longEdge: 900, unframe: true })
    return NextResponse.json({ success: true, image })
  } catch (error) {
    if (error instanceof KioskImageError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[scent-stamp] 처리 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '도장 그림을 완성하지 못했어요.' }, { status: 500 })
  }
}
