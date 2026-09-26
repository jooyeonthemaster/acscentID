import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateCardCode } from '@/lib/photobooth/card-code'
import { checkScreenEvent } from '@/lib/photobooth/asset-admin'
import { MISSING_EVENT_COLUMN_MESSAGE, missingEventColumn, screenEventScope } from '@/lib/photobooth/event-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토카드 관리 (관리자 전용)
 * GET    /api/admin/photobooth/cards          목록
 * POST   /api/admin/photobooth/cards          등록 { title, image_url, cutout_url, event_id?, screen_event_id?, source_credit? }
 * PATCH  /api/admin/photobooth/cards          수정 { id, title?, is_active?, display_order?, source_credit?, cutout_url?, screen_event_id? }
 *        screen_event_id = 화면 이벤트(ERP·노션 행사)별로 묶어 관리. 카드 인식은 켜기·끄기로만 정한다(행사 뒤에 와도 쓸 수 있게)
 * DELETE /api/admin/photobooth/cards?id=...   삭제
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_cards')
    .select('*, photobooth_events(title)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin photobooth cards fetch failed:', error)
    return NextResponse.json({ error: '목록 조회에 실패했습니다' }, { status: 500 })
  }
  const scope = await screenEventScope()
  return NextResponse.json({ success: true, cards: data ?? [], screen_events: scope.options })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  const cutoutUrl = typeof body.cutout_url === 'string' ? body.cutout_url.trim() : ''
  const eventId =
    typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null
  const sourceCredit =
    typeof body.source_credit === 'string' && body.source_credit.trim()
      ? body.source_credit.trim().slice(0, 200)
      : null

  if (!title || title.length > 100) {
    return NextResponse.json({ error: '카드 이름을 100자 이내로 입력해주세요' }, { status: 400 })
  }
  if (!imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: '카드 이미지를 먼저 업로드해주세요' }, { status: 400 })
  }
  const screenEvent = await checkScreenEvent(body.screen_event_id ?? null)
  if ('error' in screenEvent) return NextResponse.json({ error: screenEvent.error }, { status: 400 })

  const serviceClient = createServiceRoleClient()

  // 코드 유니크 충돌(23505) 시 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCardCode()
    const { data, error } = await serviceClient
      .from('photobooth_cards')
      .insert({
        code,
        title,
        image_url: imageUrl,
        cutout_url: cutoutUrl || null,
        event_id: eventId,
        source_credit: sourceCredit,
        ...(screenEvent.id ? { screen_event_id: screenEvent.id } : {}),
      })
      .select('*')
      .single()

    if (!error) return NextResponse.json({ success: true, card: data })
    if (missingEventColumn(error)) return NextResponse.json({ error: MISSING_EVENT_COLUMN_MESSAGE }, { status: 409 })
    if (error.code !== '23505') {
      console.error('Admin photobooth card insert failed:', error)
      return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
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
  if (typeof body.cutout_url === 'string' && body.cutout_url.startsWith('https://')) {
    payload.cutout_url = body.cutout_url.trim()
  }
  if ('source_credit' in body) {
    payload.source_credit =
      typeof body.source_credit === 'string' && body.source_credit.trim()
        ? body.source_credit.trim().slice(0, 200)
        : null
  }
  if ('screen_event_id' in body) {
    const checked = await checkScreenEvent(body.screen_event_id)
    if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })
    payload.screen_event_id = checked.id
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.from('photobooth_cards').update(payload).eq('id', body.id)

  if (error) {
    if (missingEventColumn(error)) return NextResponse.json({ error: MISSING_EVENT_COLUMN_MESSAGE }, { status: 409 })
    console.error('Admin photobooth card update failed:', error)
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
  const { error } = await serviceClient.from('photobooth_cards').delete().eq('id', id)

  if (error) {
    console.error('Admin photobooth card delete failed:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
