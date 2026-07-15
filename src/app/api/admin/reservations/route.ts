import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'

const STATUSES = ['confirmed', 'cancelled', 'no_show', 'completed'] as const

/**
 * 방문 예약 목록 조회 (관리자용)
 * GET /api/admin/reservations?period=upcoming|past|all&status=&q=
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'upcoming'
  const status = searchParams.get('status')
  const q = (searchParams.get('q') || '').trim()

  const serviceClient = createServiceRoleClient()
  let query = serviceClient.from('reservations').select('*')

  const nowIso = new Date().toISOString()
  if (period === 'upcoming') {
    query = query.gte('slot_start', nowIso).order('slot_start', { ascending: true })
  } else if (period === 'past') {
    query = query.lt('slot_start', nowIso).order('slot_start', { ascending: false })
  } else {
    query = query.order('slot_start', { ascending: false })
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status)
  }

  if (q) {
    // ilike 패턴 이스케이프 (%, _) — 검색어는 리터럴로 취급
    const escaped = q.replace(/[%_\\]/g, (ch) => `\\${ch}`)
    query = query.or(
      `name.ilike.%${escaped}%,email.ilike.%${escaped}%,reservation_code.ilike.%${escaped}%,phone.ilike.%${escaped}%`
    )
  }

  const { data, error } = await query.limit(300)

  if (error) {
    console.error('[Admin Reservations API] list failed:', error)
    return NextResponse.json({ error: '예약 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservations: data ?? [] })
}
