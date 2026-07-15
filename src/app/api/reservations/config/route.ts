import { NextResponse } from 'next/server'
import { getReservationPolicy } from '@/lib/reservation/settings'

/**
 * 예약 정책 공개 조회 API (예약 UI용)
 * GET /api/reservations/config
 *
 * 어드민에서 변경한 정책(영업시간/프로그램/휴무일 등)을 클라이언트에 노출한다.
 * PII·비밀값 없음.
 */
export async function GET() {
  try {
    const policy = await getReservationPolicy()
    return NextResponse.json(
      { policy },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Reservation Config API] Unexpected error:', error)
    return NextResponse.json({ error: 'config_failed' }, { status: 500 })
  }
}
