import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { kioskEnabled } from '@/lib/kiosk/access'

export const runtime = 'nodejs'

/**
 * 키오스크 분석 기록 (무인 기기 전용, 비로그인)
 * POST  /api/kiosk/record        분석 1건 저장 → { id }
 * PATCH /api/kiosk/record        영수증 출력 반영 { id, printed, ticket? }
 *
 * 분석 라우트와 같은 게이트를 쓴다 — 프로덕션에서 KIOSK_ENABLED 없이는 닫혀 있다.
 * 손님 이름이 들어가므로 조회는 관리자(/api/admin/kiosk)로만 열어 둔다.
 */

const PROGRAMS = ['personal', 'idol', 'saju'] as const
const PHOTO_SOURCES = ['camera', 'qr'] as const

const MAX_TEXT = 2000
const MAX_SHORT = 100
const MAX_KEYWORDS = 10
const MAX_JSON_CHARS = 20_000

type Program = (typeof PROGRAMS)[number]

function text(raw: unknown, max = MAX_SHORT): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  return value ? value.slice(0, max) : null
}

function keywordList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)
  return list.length ? list : null
}

/** JSON 컬럼은 통째로 들어가므로 크기 상한을 둔다 — 초과분은 저장하지 않는다 */
function jsonValue(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) return null
  try {
    const serialized = JSON.stringify(raw)
    if (!serialized || serialized.length > MAX_JSON_CHARS) return null
    return raw
  } catch {
    return null
  }
}

function score(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.min(1, Math.max(0, Math.round(raw * 1000) / 1000))
}

export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) {
    return NextResponse.json({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 })
  }

  const program = PROGRAMS.includes(body.program) ? (body.program as Program) : null
  if (!program) {
    return NextResponse.json({ success: false, error: 'INVALID_PROGRAM' }, { status: 400 })
  }

  const photoSource = PHOTO_SOURCES.includes(body.photo_source) ? body.photo_source : null

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('kiosk_analyses')
    .insert({
      program,
      customer_name: text(body.customer_name, 40),
      gender: text(body.gender, 20),
      photo_source: photoSource,
      product_type: text(body.product_type, 40),
      product_label: text(body.product_label, 60),
      perfume_id: text(body.perfume_id, 40),
      perfume_no: text(body.perfume_no, 10),
      perfume_name: text(body.perfume_name, 80),
      category_en: text(body.category_en, 40),
      match_score: score(body.match_score),
      keywords: keywordList(body.keywords),
      traits: jsonValue(body.traits),
      personal_color: text(body.personal_color, 60),
      analysis_text: text(body.analysis_text, MAX_TEXT),
      recipe: jsonValue(body.recipe),
      saju: jsonValue(body.saju),
      ticket: text(body.ticket, 20),
      mocked: body.mocked === true,
      device: text(body.device, 40),
    })
    .select('id')
    .single()

  if (error) {
    // 기록 실패가 손님 플로우를 막아서는 안 된다 — 키오스크는 이 응답을 무시하고 진행한다
    console.error('Kiosk record insert failed:', error)
    return NextResponse.json({ success: false, error: '기록에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}

export async function PATCH(request: NextRequest) {
  if (!kioskEnabled(request)) {
    return NextResponse.json({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.printed === true) {
    patch.printed = true
    patch.printed_at = new Date().toISOString()
  }
  const ticket = text(body.ticket, 20)
  if (ticket) patch.ticket = ticket

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 내용이 없습니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.from('kiosk_analyses').update(patch).eq('id', id)

  if (error) {
    console.error('Kiosk record update failed:', error)
    return NextResponse.json({ success: false, error: '기록 갱신에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
