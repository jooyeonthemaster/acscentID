import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { buildImagePrompt, IMAGE_LABEL, readImageParams } from '@/lib/kiosk/expansion/image-prompts'
import { generateKioskImage, isKioskPhoto, KioskImageError } from '@/lib/kiosk/image-gen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 이미지 생성은 보통 10~25초, 예비 모델까지 가면 100초 남짓
export const maxDuration = 120

/**
 * 체험 6종의 이미지 합성(키오스크 전용, 비로그인) — 스타 무드 화보 · 오라 사진 · 타임머신 사진 · 커플/팀 포스터 · 코디 룩북
 * POST /api/kiosk/experience/expansion-image  { id, photo(data: 주소), params } → { image(data: 주소) }
 * 사진과 결과는 저장하지 않는다(src/lib/kiosk/image-gen.ts). 분·하루 상한은 다른 그림 기능과 함께 센다.
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    const params = readImageParams(String(body?.id ?? ''), body?.params)
    if (!params || !isKioskPhoto(body?.photo)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    const { prompt, aspect } = buildImagePrompt(params)
    const image = await generateKioskImage({ tag: `expansion-${params.id}`, prompt, photos: [body.photo], aspect, longEdge: 1280, unframe: true })
    return NextResponse.json({ success: true, image, label: IMAGE_LABEL[params.id] })
  } catch (error) {
    if (error instanceof KioskImageError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[expansion-image] 처리 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '이미지를 완성하지 못했어요.' }, { status: 500 })
  }
}
