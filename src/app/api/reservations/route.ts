import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getApiLocale } from '@/lib/api-locale'
import { getGoogleCalendarConfig, insertEvent, queryFreeBusy } from '@/lib/google/calendar'
import { isReservationProgram } from '@/lib/reservation/config'
import { getReservationPolicy } from '@/lib/reservation/settings'
import { isValidSlot, overlaps } from '@/lib/reservation/slots'
import { notifyNewReservation } from '@/lib/email/admin-notify'
import { notifyCustomerReservationConfirmed } from '@/lib/email/customer-notify'
import { RESERVATION_PROGRAM_LABELS_KO } from '@/lib/email/reservation-templates'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 예약번호에 혼동되는 문자(0/O, 1/I) 제외
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateReservationCode(): string {
  const bytes = randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length]
  }
  return `RSV-${code}`
}

/** 슬롯 시작 ISO(+09:00 고정)에 소요시간을 더한 종료 ISO */
function slotEndIso(slotStartIso: string, durationMinutes: number): string {
  const end = new Date(
    new Date(slotStartIso).getTime() + durationMinutes * 60_000 + 9 * 3600_000
  )
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}:00+09:00`
}

/**
 * 방문 예약 생성 API
 * POST /api/reservations
 *
 * 더블부킹 2중 방어:
 * 1) 예약 직전 freeBusy 재확인 (네이버 예약 등 캘린더 수동 입력분 충돌 차단)
 * 2) reservations 부분 유니크 인덱스 (동시 제출 레이스 → 23505 → 409 slot_taken)
 * 순서: DB insert(슬롯 선점) → 캘린더 insert → google_event_id 업데이트.
 * 캘린더 실패 시 예약은 유지하고 관리자 알림에 "캘린더 등록 실패"를 표기한다.
 */
export async function POST(request: NextRequest) {
  try {
    const locale = getApiLocale(request)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    // 안티스팸 1: honeypot — 봇이 채우면 조용히 무시하고 성공처럼 응답
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json(
        { reservationCode: generateReservationCode(), slotStart: body.slotStart, program: body.program },
        { status: 201 }
      )
    }

    // 필드 검증
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : ''
    const program = typeof body.program === 'string' ? body.program : ''
    const partySize = Number(body.partySize)
    const slotStart = typeof body.slotStart === 'string' ? body.slotStart : ''

    const serviceClient = createServiceRoleClient()
    const policy = await getReservationPolicy(serviceClient)

    if (!policy.accepting) {
      return NextResponse.json({ error: 'reservations_paused' }, { status: 503 })
    }

    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }
    if (
      !Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > policy.maxPartySize
    ) {
      return NextResponse.json({ error: 'invalid_party_size' }, { status: 400 })
    }
    // 알려진 프로그램이면서 현재 어드민 설정에서 노출 중인 프로그램만 허용
    if (!isReservationProgram(program) || !policy.programs.includes(program)) {
      return NextResponse.json({ error: 'invalid_program' }, { status: 400 })
    }
    // 그리드/영업시간/휴무일/리드타임/최대일수 검증
    if (!isValidSlot(slotStart, Date.now(), policy)) {
      return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
    }
    const slotEnd = slotEndIso(slotStart, policy.durationMinutes)

    // 더블부킹 1차 방어: 예약 직전 freeBusy 재확인 (캘린더 미연동 시 스킵 —
    // DB 부분 유니크 인덱스가 2차 방어선으로 계속 동작한다)
    const calendarConfig = getGoogleCalendarConfig()
    if (calendarConfig) {
      const busy = await queryFreeBusy(calendarConfig, slotStart, slotEnd)
      if (busy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) {
        return NextResponse.json({ error: 'slot_taken' }, { status: 409 })
      }
    }

    // 안티스팸 2: 이메일당 활성(미래 confirmed) 예약 수 제한
    const { count: activeCount, error: countError } = await serviceClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('status', 'confirmed')
      .gte('slot_start', new Date().toISOString())
    if (countError) {
      console.error('[Reservations API] active count failed:', countError)
    }
    if ((activeCount ?? 0) >= policy.maxActiveReservationsPerEmail) {
      return NextResponse.json({ error: 'too_many_reservations' }, { status: 429 })
    }

    // 슬롯 선점 insert — 부분 유니크 인덱스가 동시 제출을 원자적으로 걸러낸다
    const reservationCode = generateReservationCode()
    const now = new Date().toISOString()
    const { data: reservation, error: insertError } = await serviceClient
      .from('reservations')
      .insert({
        reservation_code: reservationCode,
        name,
        email,
        phone: phone || null,
        party_size: partySize,
        program,
        slot_start: slotStart,
        slot_end: slotEnd,
        notes: notes || null,
        locale,
        status: 'confirmed',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        // 부분 유니크 인덱스 충돌 = 같은 슬롯 동시 제출
        if (insertError.message.includes('uq_reservations_active_slot')) {
          return NextResponse.json({ error: 'slot_taken' }, { status: 409 })
        }
        // (극히 드묾) 예약번호 충돌 등
        console.error('[Reservations API] unique conflict:', insertError.message)
        return NextResponse.json({ error: 'reservation_failed' }, { status: 500 })
      }
      console.error('[Reservations API] insert failed:', insertError)
      return NextResponse.json({ error: 'reservation_failed' }, { status: 500 })
    }

    // 캘린더 등록 — 실패해도 예약은 유지 (알림에 실패 표기). 미연동 시 스킵.
    const programLabelKo = RESERVATION_PROGRAM_LABELS_KO[program] || program
    let calendarRegistered = false
    if (calendarConfig) {
      try {
        const eventId = await insertEvent(calendarConfig, {
          summary: `[웹예약] ${name} ${partySize}인 · ${programLabelKo}`,
          description: [
            `예약번호: ${reservationCode}`,
            `이름: ${name}`,
            `이메일: ${email}`,
            phone ? `전화: ${phone}` : null,
            `프로그램: ${programLabelKo}`,
            `인원: ${partySize}`,
            notes ? `요청사항: ${notes}` : null,
            `언어: ${locale}`,
          ]
            .filter(Boolean)
            .join('\n'),
          startIso: slotStart,
          endIso: slotEnd,
        })
        calendarRegistered = true
        const { error: updateError } = await serviceClient
          .from('reservations')
          .update({ google_event_id: eventId, updated_at: new Date().toISOString() })
          .eq('id', reservation.id)
        if (updateError) {
          console.error('[Reservations API] google_event_id update failed:', updateError)
        }
      } catch (calendarError) {
        console.error('[Reservations API] calendar insert failed:', calendarError)
      }
    }

    // fire-and-forget 알림 (관리자: 이메일+노션 / 고객: 확인 메일)
    notifyNewReservation({
      reservationCode,
      name,
      email,
      phone: phone || null,
      program,
      partySize,
      slotStartIso: slotStart,
      slotEndIso: slotEnd,
      notes: notes || null,
      locale,
      calendarRegistered,
    })
    notifyCustomerReservationConfirmed({
      customerEmail: email,
      locale,
      reservationCode,
      name,
      program,
      partySize,
      slotStartIso: slotStart,
    })

    return NextResponse.json(
      { reservationCode, slotStart, slotEnd, program },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Reservations API] Unexpected error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
