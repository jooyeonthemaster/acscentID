import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 관리자 — 키오스크 배경 관리
 * GET    /api/admin/kiosk/backgrounds              전체 (꺼둔 것 포함)
 * POST   /api/admin/kiosk/backgrounds              등록 { title, image_url, palette }
 * PATCH  /api/admin/kiosk/backgrounds              수정 { id, title?, is_active?, display_order?, palette? }
 * DELETE /api/admin/kiosk/backgrounds?id=...       삭제
 */

const PALETTES = ['gingham', 'scrapbook', 'airy', 'retro'] as const

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('kiosk_backgrounds')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin kiosk backgrounds fetch failed:', error)
    return NextResponse.json({ error: '배경 목록 조회에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ backgrounds: data ?? [] })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const imageUrl = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
  const palette = PALETTES.includes(body?.palette) ? body.palette : 'retro'
  const displayOrder = Number.isInteger(body?.display_order) ? body.display_order : 0

  if (!title || title.length > 60) {
    return NextResponse.json({ error: '이름을 60자 이내로 입력해주세요' }, { status: 400 })
  }
  if (!imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: '이미지를 먼저 업로드해주세요' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('kiosk_backgrounds')
    .insert({ title, image_url: imageUrl, palette, display_order: displayOrder })
    .select()
    .single()

  if (error) {
    console.error('Kiosk background insert failed:', error)
    return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, background: data })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 60)
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (Number.isInteger(body.display_order)) patch.display_order = body.display_order
  if (PALETTES.includes(body.palette)) patch.palette = body.palette

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.from('kiosk_backgrounds').update(patch).eq('id', id)
  if (error) {
    console.error('Kiosk background update failed:', error)
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.from('kiosk_backgrounds').delete().eq('id', id)
  if (error) {
    console.error('Kiosk background delete failed:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
