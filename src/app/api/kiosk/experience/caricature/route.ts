import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { CARICATURE_LEVELS, CARICATURE_STYLES, CaricatureError, generateCaricature, type CaricatureLevel, type CaricatureStyle } from '@/lib/kiosk/caricature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 이미지 생성은 보통 10~25초, 예비 모델까지 가면 100초 남짓
export const maxDuration = 120

/**
 * 키오스크 캐리커처 한 장(키오스크 전용, 비로그인)
 * POST /api/kiosk/experience/caricature  { photo(data: 주소), style: line|water|comic, level: soft|fun } → { image(data: 주소) }
 * 사진과 결과는 저장하지 않는다(src/lib/kiosk/caricature.ts).
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    const style = String(body?.style ?? '') as CaricatureStyle
    const level = String(body?.level ?? '') as CaricatureLevel
    if (!CARICATURE_STYLES.includes(style) || !CARICATURE_LEVELS.includes(level) || typeof body?.photo !== 'string') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }
    const image = await generateCaricature(body.photo, style, level)
    return NextResponse.json({ success: true, image })
  } catch (error) {
    if (error instanceof CaricatureError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[caricature] 처리 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '그림을 완성하지 못했어요.' }, { status: 500 })
  }
}
