import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  deleteEvent,
  getGoogleCalendarConfig,
  insertEvent,
  queryFreeBusy,
} from '@/lib/google/calendar'
import { overlaps } from '@/lib/reservation/slots'
import { RESERVATION_PROGRAM_LABELS_KO } from '@/lib/email/reservation-templates'

const STATUSES = ['confirmed', 'cancelled', 'no_show', 'completed'] as const
type ReservationStatus = (typeof STATUSES)[number]

/**
 * 방문 예약 상태 변경 (관리자용)
 * PATCH /api/admin/reservations/[id]  body: { status }
 *
 * - confirmed → cancelled: 구글 캘린더 이벤트 삭제 (슬롯 해제)
 * - → confirmed 복구: freeBusy 재확인 + 부분 유니크 인덱스로 더블부킹 방지, 캘린더 이벤트 재생성
 * - no_show/completed: 방문 시점 이후의 기록이므로 캘린더 이벤트는 유지
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { id } = await params
  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다' }, { status: 400 })
  }

  const newStatus = body.status as ReservationStatus
  if (!(STATUSES as readonly string[]).includes(newStatus)) {
    return NextResponse.json({ error: '올바르지 않은 상태값입니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { data: reservation, error: fetchError } = await serviceClient
    .from('reservations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[Admin Reservations API] fetch failed:', fetchError)
    return NextResponse.json({ error: '예약 조회 실패' }, { status: 500 })
  }
  if (!reservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다' }, { status: 404 })
  }
  if (reservation.status === newStatus) {
    return NextResponse.json({ reservation, calendarSynced: true })
  }

  const calendarConfig = getGoogleCalendarConfig()

  // 복구(→confirmed): 슬롯이 다시 점유되므로 캘린더 busy 재확인 (네이버 수동 입력분 충돌 방지)
  if (newStatus === 'confirmed' && calendarConfig) {
    try {
      const busy = await queryFreeBusy(calendarConfig, reservation.slot_start, reservation.slot_end)
      if (busy.some((b) => overlaps(reservation.slot_start, reservation.slot_end, b.start, b.end))) {
        return NextResponse.json(
          { error: '해당 시간에 이미 다른 일정이 있습니다 (캘린더 busy)' },
          { status: 409 }
        )
      }
    } catch (err) {
      console.error('[Admin Reservations API] freeBusy check failed:', err)
      // 캘린더 조회 실패 시에도 DB 유니크 인덱스가 최종 방어선이므로 진행
    }
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('reservations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    // 부분 유니크 인덱스 충돌 = 같은 슬롯에 이미 confirmed 예약 존재 (복구 실패)
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: '해당 시간에 이미 확정된 예약이 있어 복구할 수 없습니다' },
        { status: 409 }
      )
    }
    console.error('[Admin Reservations API] update failed:', updateError)
    return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 })
  }

  // 캘린더 동기화 (실패해도 상태 변경은 유지 — calendarSynced로 알림)
  let calendarSynced = true
  if (calendarConfig) {
    try {
      if (newStatus === 'cancelled' && reservation.google_event_id) {
        // 취소: 이벤트 삭제로 슬롯 해제
        const deleted = await deleteEvent(calendarConfig, reservation.google_event_id)
        calendarSynced = deleted
        if (deleted) {
          await serviceClient
            .from('reservations')
            .update({ google_event_id: null, updated_at: new Date().toISOString() })
            .eq('id', id)
        }
      } else if (newStatus === 'confirmed' && !reservation.google_event_id) {
        // 복구: 이벤트 재생성
        const programLabel =
          RESERVATION_PROGRAM_LABELS_KO[reservation.program] || reservation.program
        const eventId = await insertEvent(calendarConfig, {
          summary: `[웹예약] ${reservation.name} ${reservation.party_size}인 · ${programLabel}`,
          description: [
            `예약번호: ${reservation.reservation_code}`,
            `이름: ${reservation.name}`,
            `이메일: ${reservation.email}`,
            reservation.phone ? `전화: ${reservation.phone}` : null,
            `프로그램: ${programLabel}`,
            `인원: ${reservation.party_size}`,
            reservation.notes ? `요청사항: ${reservation.notes}` : null,
            `(관리자 복구)`,
          ]
            .filter(Boolean)
            .join('\n'),
          startIso: reservation.slot_start,
          endIso: reservation.slot_end,
        })
        await serviceClient
          .from('reservations')
          .update({ google_event_id: eventId, updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    } catch (err) {
      console.error('[Admin Reservations API] calendar sync failed:', err)
      calendarSynced = false
    }
  } else {
    calendarSynced = false
  }

  return NextResponse.json({ reservation: updated, calendarSynced })
}
