import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 생카 이벤트 관리 (관리자 전용)
 * GET    /api/admin/photobooth/events            전체 목록
 * POST   /api/admin/photobooth/events            등록
 * PATCH  /api/admin/photobooth/events            수정 { id, ...fields }
 * DELETE /api/admin/photobooth/events?id=...     삭제 (귀속 소재 메타도 CASCADE 삭제)
 */

const TEXT_FIELDS = ['title', 'artist', 'organizer', 'hashtag', 'greeting'] as const
const MAX_TEXT_LENGTH = 200

function sanitizeTextFields(body: Record<string, unknown>): Record<string, string | null> | string {
  const values: Record<string, string | null> = {}
  for (const key of TEXT_FIELDS) {
    if (!(key in body)) continue
    const raw = body[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (value.length > MAX_TEXT_LENGTH) return `${key}은(는) ${MAX_TEXT_LENGTH}자 이내로 입력해주세요`
    values[key] = value || null
  }
  return values
}

function sanitizeDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null
}

function sanitizeColor(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin photobooth events fetch failed:', error)
    return NextResponse.json({ error: '목록 조회에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, events: data ?? [] })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const texts = sanitizeTextFields(body)
  if (typeof texts === 'string') return NextResponse.json({ error: texts }, { status: 400 })
  if (!texts.title) return NextResponse.json({ error: '이벤트명을 입력해주세요' }, { status: 400 })

  const coverImageUrl =
    typeof body.cover_image_url === 'string' && body.cover_image_url.startsWith('https://')
      ? body.cover_image_url.trim()
      : null

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('photobooth_events')
    .insert({
      ...texts,
      theme_color: sanitizeColor(body.theme_color),
      cover_image_url: coverImageUrl,
      starts_on: sanitizeDate(body.starts_on),
      ends_on: sanitizeDate(body.ends_on),
    })
    .select('*')
    .single()

  if (error) {
    console.error('Admin photobooth event insert failed:', error)
    return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, event: data })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || typeof body.id !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const texts = sanitizeTextFields(body)
  if (typeof texts === 'string') return NextResponse.json({ error: texts }, { status: 400 })
  if ('title' in texts && !texts.title) {
    return NextResponse.json({ error: '이벤트명을 입력해주세요' }, { status: 400 })
  }

  const payload: Record<string, unknown> = { ...texts, updated_at: new Date().toISOString() }
  if ('theme_color' in body) payload.theme_color = sanitizeColor(body.theme_color)
  if ('starts_on' in body) payload.starts_on = sanitizeDate(body.starts_on)
  if ('ends_on' in body) payload.ends_on = sanitizeDate(body.ends_on)
  if ('is_active' in body && typeof body.is_active === 'boolean') payload.is_active = body.is_active
  if ('cover_image_url' in body) {
    payload.cover_image_url =
      typeof body.cover_image_url === 'string' && body.cover_image_url.startsWith('https://')
        ? body.cover_image_url.trim()
        : null
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('photobooth_events')
    .update(payload)
    .eq('id', body.id)

  if (error) {
    console.error('Admin photobooth event update failed:', error)
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
  const { error } = await serviceClient.from('photobooth_events').delete().eq('id', id)

  if (error) {
    console.error('Admin photobooth event delete failed:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
