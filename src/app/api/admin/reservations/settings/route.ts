import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getReservationPolicy, validateSettingsInput } from '@/lib/reservation/settings'

/**
 * 방문 예약 정책 조회 (관리자용)
 * GET /api/admin/reservations/settings
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const policy = await getReservationPolicy()
  return NextResponse.json({ policy })
}

/**
 * 방문 예약 정책 저장 (관리자용)
 * PUT /api/admin/reservations/settings  body: ReservationPolicy(camelCase)
 *
 * 저장 즉시 /reserve UI와 예약 API에 반영된다 (재배포 불필요).
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다' }, { status: 400 })
  }

  const result = validateSettingsInput(body)
  if (!result.ok) {
    return NextResponse.json({ error: result.errors.join('\n') }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('reservation_settings')
    .upsert(result.row, { onConflict: 'id' })

  if (error) {
    console.error('[Admin Reservation Settings API] save failed:', error)
    return NextResponse.json({ error: '설정 저장 실패', details: error.message }, { status: 500 })
  }

  const policy = await getReservationPolicy(serviceClient)
  return NextResponse.json({ policy })
}
