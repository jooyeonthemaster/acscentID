import { NextRequest, NextResponse } from 'next/server'
import { mergeFrameCatalog, getDefaultFrame, frameOverrideRow, FRAME_TOMBSTONE } from '@/lib/photobooth/frame-catalog'
import { checkScreenEvent, patchBoothAsset } from '@/lib/photobooth/asset-admin'
import { MISSING_EVENT_COLUMN_MESSAGE, missingEventColumn, screenEventScope } from '@/lib/photobooth/event-scope'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 소재 관리 (관리자 전용)
 * GET    /api/admin/photobooth              전체 목록
 * POST   /api/admin/photobooth              소재 등록 { kind, title, image_url, display_order?, screen_event_id? }
 * PATCH  /api/admin/photobooth              수정 { id, title?, is_active?, display_order?, screen_event_id? }
 *        screen_event_id = 화면 이벤트(ERP·노션 행사) — 그 행사가 적용 중일 때만 부스에 보인다. null = 상시
 * DELETE /api/admin/photobooth?id=...       삭제
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_assets')
    .select('*')
    .order('kind', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin photobooth fetch failed:', error)
    return NextResponse.json({ error: '목록 조회에 실패했습니다' }, { status: 500 })
  }
  // 행사 선택지(이 매장의 진행 중·다가오는·지난 화면 이벤트)도 같이 — 소재마다 행사를 고른다
  const scope = await screenEventScope()
  return NextResponse.json({
    success: true,
    assets: mergeFrameCatalog(data ?? []).sort((a, b) => a.display_order - b.display_order),
    screen_events: scope.options,
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const kind = body.kind === 'frame' || body.kind === 'template' ? body.kind : null
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  const displayOrder = Number.isInteger(body.display_order) ? body.display_order : 0
  // 생카 이벤트 귀속 (null = 상시 소재)
  const eventId =
    typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null

  if (!kind) return NextResponse.json({ error: '소재 종류가 잘못되었습니다' }, { status: 400 })
  if (!title || title.length > 100) {
    return NextResponse.json({ error: '이름을 100자 이내로 입력해주세요' }, { status: 400 })
  }
  if (!imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: '이미지를 먼저 업로드해주세요' }, { status: 400 })
  }
  const screenEvent = await checkScreenEvent(body.screen_event_id ?? null)
  if ('error' in screenEvent) return NextResponse.json({ error: screenEvent.error }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_assets')
    .insert({
      kind, title, image_url: imageUrl, display_order: displayOrder, event_id: eventId,
      // 칸이 없는 DB(마이그레이션 전)에도 상시 등록은 되게 — 행사를 고른 경우에만 보낸다
      ...(screenEvent.id ? { screen_event_id: screenEvent.id } : {}),
    })
    .select('*')
    .single()

  if (error) {
    if (missingEventColumn(error)) return NextResponse.json({ error: MISSING_EVENT_COLUMN_MESSAGE }, { status: 409 })
    console.error('Admin photobooth insert failed:', error)
    return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, asset: data })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || typeof body.id !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const result = await patchBoothAsset(createServiceRoleClient(), body.id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const defaultFrame = getDefaultFrame(id)
  const { error } = defaultFrame
    ? await serviceClient.from('photobooth_assets').upsert({
        ...frameOverrideRow(defaultFrame), is_active: false, image_url: FRAME_TOMBSTONE,
      }, { onConflict: 'id' })
    : await serviceClient.from('photobooth_assets').delete().eq('id', id)

  if (error) {
    console.error('Admin photobooth delete failed:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
