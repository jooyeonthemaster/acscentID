import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 소재 관리 (관리자 전용)
 * GET    /api/admin/photobooth              전체 목록
 * POST   /api/admin/photobooth              소재 등록 { kind, title, image_url, display_order? }
 * PATCH  /api/admin/photobooth              수정 { id, title?, is_active?, display_order? }
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
  return NextResponse.json({ success: true, assets: data ?? [] })
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

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_assets')
    .insert({ kind, title, image_url: imageUrl, display_order: displayOrder, event_id: eventId })
    .select('*')
    .single()

  if (error) {
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

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) payload.title = body.title.trim()
  if (typeof body.is_active === 'boolean') payload.is_active = body.is_active
  if (Number.isInteger(body.display_order)) payload.display_order = body.display_order
  if ('event_id' in body) {
    payload.event_id =
      typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('photobooth_assets')
    .update(payload)
    .eq('id', body.id)

  if (error) {
    console.error('Admin photobooth update failed:', error)
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.from('photobooth_assets').delete().eq('id', id)

  if (error) {
    console.error('Admin photobooth delete failed:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
