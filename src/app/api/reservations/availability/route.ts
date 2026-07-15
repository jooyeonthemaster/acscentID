import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getGoogleCalendarConfig, queryFreeBusy } from '@/lib/google/calendar'
import { getReservationPolicy } from '@/lib/reservation/settings'
import {
  generateSlotsForDate,
  getBookableDateRange,
  isValidSlot,
  overlaps,
} from '@/lib/reservation/slots'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 예약 가용 슬롯 조회 API
 * GET /api/reservations/availability?date=YYYY-MM-DD
 *
 * 구글 캘린더가 단일 진실 소스: freeBusy busy 구간 + 당일 confirmed 예약(방어)을 제외한다.
 * 정책(영업시간 등)은 어드민 설정(DB)을 따른다.
 */
export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') || ''
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const policy = await getReservationPolicy(serviceClient)

    if (!policy.accepting) {
      return NextResponse.json({ error: 'reservations_paused' }, { status: 503 })
    }

    const { startDate, endDate } = getBookableDateRange(Date.now(), policy)
    if (date < startDate || date > endDate) {
      return NextResponse.json({ error: 'date_out_of_range' }, { status: 400 })
    }

    const calendarConfig = getGoogleCalendarConfig()
    if (!calendarConfig) {
      return NextResponse.json({ error: 'calendar_not_configured' }, { status: 503 })
    }

    const grid = generateSlotsForDate(date, policy)
    if (grid.length === 0) {
      return NextResponse.json(
        { date, slots: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 하루 영업시간 범위 1회 조회 (네이버 예약 등 수동 입력분 포함 모든 busy)
    const dayStart = grid[0].startIso
    const dayEnd = grid[grid.length - 1].endIso
    const busy = await queryFreeBusy(calendarConfig, dayStart, dayEnd)

    // (방어) 캘린더 이벤트 생성에 실패한 confirmed 예약도 슬롯에서 제외
    const { data: reserved, error: reservedError } = await serviceClient
      .from('reservations')
      .select('slot_start, slot_end')
      .eq('status', 'confirmed')
      .gte('slot_start', dayStart)
      .lt('slot_start', dayEnd)
    if (reservedError) {
      console.error('[Availability API] reservations lookup failed:', reservedError)
    }

    const slots = grid.map((slot) => {
      const isBusy = busy.some((b) => overlaps(slot.startIso, slot.endIso, b.start, b.end))
      const isReserved = (reserved || []).some((r) =>
        overlaps(slot.startIso, slot.endIso, r.slot_start, r.slot_end)
      )
      return {
        time: slot.time,
        startIso: slot.startIso,
        available: !isBusy && !isReserved && isValidSlot(slot.startIso, Date.now(), policy),
      }
    })

    return NextResponse.json(
      { date, slots },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Availability API] Unexpected error:', error)
    return NextResponse.json({ error: 'availability_failed' }, { status: 500 })
  }
}
