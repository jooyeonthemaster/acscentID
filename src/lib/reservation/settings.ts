// 예약 정책 로더/검증 (서버사이드 전용)
// reservation_settings 단일 행을 읽어 ReservationPolicy로 변환한다.
// 행이 없거나 조회 실패 시 config.ts 기본값으로 동작 (예약이 죽지 않도록).

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  DEFAULT_RESERVATION_POLICY,
  KNOWN_RESERVATION_PROGRAMS,
  type ReservationPolicy,
} from './config'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) return fallback
  return n
}

/** DB 행(snake_case) → ReservationPolicy. 비정상 값은 필드 단위로 기본값 대체. */
export function sanitizePolicy(row: Record<string, unknown>): ReservationPolicy {
  const d = DEFAULT_RESERVATION_POLICY
  const openTime =
    typeof row.open_time === 'string' && TIME_RE.test(row.open_time) ? row.open_time : d.openTime
  const closeTime =
    typeof row.close_time === 'string' && TIME_RE.test(row.close_time)
      ? row.close_time
      : d.closeTime
  const closedWeekdays = Array.isArray(row.closed_weekdays)
    ? [...new Set(row.closed_weekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))]
    : [...d.closedWeekdays]
  const programs = Array.isArray(row.programs)
    ? row.programs.filter((p): p is string =>
        (KNOWN_RESERVATION_PROGRAMS as readonly string[]).includes(String(p))
      )
    : [...d.programs]

  const policy: ReservationPolicy = {
    accepting: row.accepting !== false,
    openTime,
    closeTime,
    slotIntervalMinutes: clampInt(row.slot_interval_minutes, 5, 120, d.slotIntervalMinutes),
    durationMinutes: clampInt(row.duration_minutes, 5, 480, d.durationMinutes),
    minLeadTimeHours: clampInt(row.min_lead_time_hours, 0, 168, d.minLeadTimeHours),
    maxAdvanceDays: clampInt(row.max_advance_days, 1, 90, d.maxAdvanceDays),
    closedWeekdays,
    maxPartySize: clampInt(row.max_party_size, 1, 10, d.maxPartySize),
    maxActiveReservationsPerEmail: clampInt(
      row.max_active_reservations_per_email, 1, 10, d.maxActiveReservationsPerEmail
    ),
    programs: programs.length > 0 ? programs : [...d.programs],
  }

  // 영업시간이 성립하지 않으면(개점>=폐점 등) 시간 관련 필드를 기본값으로 되돌린다
  if (toMinutes(policy.openTime) + policy.durationMinutes > toMinutes(policy.closeTime)) {
    policy.openTime = d.openTime
    policy.closeTime = d.closeTime
    policy.durationMinutes = d.durationMinutes
  }
  return policy
}

export async function getReservationPolicy(
  client?: SupabaseClient
): Promise<ReservationPolicy> {
  try {
    const c = client ?? createServiceRoleClient()
    const { data, error } = await c
      .from('reservation_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error || !data) {
      if (error) console.error('[ReservationPolicy] load failed, using defaults:', error)
      return DEFAULT_RESERVATION_POLICY
    }
    return sanitizePolicy(data)
  } catch (err) {
    console.error('[ReservationPolicy] unexpected error, using defaults:', err)
    return DEFAULT_RESERVATION_POLICY
  }
}

export interface SettingsUpdateInput {
  accepting: boolean
  openTime: string
  closeTime: string
  slotIntervalMinutes: number
  durationMinutes: number
  minLeadTimeHours: number
  maxAdvanceDays: number
  closedWeekdays: number[]
  maxPartySize: number
  maxActiveReservationsPerEmail: number
  programs: string[]
}

/** 어드민 설정 저장 검증. 통과 시 DB 행(snake_case) 반환, 실패 시 errors. */
export function validateSettingsInput(
  body: Record<string, unknown>
): { ok: true; row: Record<string, unknown> } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const openTime = String(body.openTime ?? '')
  const closeTime = String(body.closeTime ?? '')
  if (!TIME_RE.test(openTime)) errors.push('영업 시작 시간 형식이 올바르지 않습니다 (HH:mm)')
  if (!TIME_RE.test(closeTime)) errors.push('영업 종료 시간 형식이 올바르지 않습니다 (HH:mm)')

  const slotIntervalMinutes = Number(body.slotIntervalMinutes)
  const durationMinutes = Number(body.durationMinutes)
  const minLeadTimeHours = Number(body.minLeadTimeHours)
  const maxAdvanceDays = Number(body.maxAdvanceDays)
  const maxPartySize = Number(body.maxPartySize)
  const maxActive = Number(body.maxActiveReservationsPerEmail)

  if (!Number.isInteger(slotIntervalMinutes) || slotIntervalMinutes < 5 || slotIntervalMinutes > 120)
    errors.push('슬롯 간격은 5~120분 사이여야 합니다')
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480)
    errors.push('소요 시간은 5~480분 사이여야 합니다')
  if (!Number.isInteger(minLeadTimeHours) || minLeadTimeHours < 0 || minLeadTimeHours > 168)
    errors.push('리드타임은 0~168시간 사이여야 합니다')
  if (!Number.isInteger(maxAdvanceDays) || maxAdvanceDays < 1 || maxAdvanceDays > 90)
    errors.push('예약 가능일은 1~90일 사이여야 합니다')
  if (!Number.isInteger(maxPartySize) || maxPartySize < 1 || maxPartySize > 10)
    errors.push('최대 인원은 1~10명 사이여야 합니다')
  if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 10)
    errors.push('이메일당 예약 제한은 1~10건 사이여야 합니다')

  if (TIME_RE.test(openTime) && TIME_RE.test(closeTime) && Number.isInteger(durationMinutes)) {
    if (toMinutes(openTime) + durationMinutes > toMinutes(closeTime))
      errors.push('영업시간 내에 최소 1개 슬롯이 나오도록 시작/종료/소요시간을 설정해주세요')
  }

  const closedWeekdays = Array.isArray(body.closedWeekdays)
    ? [...new Set(body.closedWeekdays.map(Number))]
    : null
  if (!closedWeekdays || closedWeekdays.some((n) => !Number.isInteger(n) || n < 0 || n > 6))
    errors.push('휴무 요일 값이 올바르지 않습니다')
  else if (closedWeekdays.length >= 7) errors.push('모든 요일을 휴무로 설정할 수 없습니다')

  const programs = Array.isArray(body.programs) ? body.programs.map(String) : null
  if (!programs || programs.length === 0)
    errors.push('프로그램을 1개 이상 선택해주세요')
  else if (programs.some((p) => !(KNOWN_RESERVATION_PROGRAMS as readonly string[]).includes(p)))
    errors.push('알 수 없는 프로그램이 포함되어 있습니다')

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    row: {
      id: 1,
      accepting: body.accepting !== false,
      open_time: openTime,
      close_time: closeTime,
      slot_interval_minutes: slotIntervalMinutes,
      duration_minutes: durationMinutes,
      min_lead_time_hours: minLeadTimeHours,
      max_advance_days: maxAdvanceDays,
      closed_weekdays: closedWeekdays,
      max_party_size: maxPartySize,
      max_active_reservations_per_email: maxActive,
      programs,
      updated_at: new Date().toISOString(),
    },
  }
}
