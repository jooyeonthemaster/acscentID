// 방문 예약 정책 — 기본값(fallback) 단일 소스
// 실제 운영값은 어드민 > 방문 예약 > 설정(reservation_settings 테이블)에서 관리한다.
// DB 행이 없거나 조회에 실패하면 아래 기본값으로 동작한다.
// (클라이언트/서버 양쪽에서 import 되므로 비밀값 금지)

export const RESERVATION_CONFIG = {
  timezone: 'Asia/Seoul',
  utcOffset: '+09:00',
  openTime: '11:00',
  closeTime: '19:00',
  slotIntervalMinutes: 30,
  durationMinutes: 60,
  minLeadTimeHours: 12,
  maxAdvanceDays: 30,
  // 0=일 1=월 ... 6=토 (예: 매주 월요일 휴무면 [1])
  closedWeekdays: [] as number[],
  maxPartySize: 6,
  maxActiveReservationsPerEmail: 2,
  programs: ['idol-image', 'personal', 'chemistry'] as const,
} as const

export type ReservationProgram = (typeof RESERVATION_CONFIG.programs)[number]

// 프로그램은 5개 언어 라벨/이메일 템플릿이 코드에 있어 "알려진 키"만 허용한다.
// 어드민에서는 이 중 어떤 프로그램을 노출할지(subset)만 토글한다.
export const KNOWN_RESERVATION_PROGRAMS = RESERVATION_CONFIG.programs

export function isReservationProgram(value: string): value is ReservationProgram {
  return (KNOWN_RESERVATION_PROGRAMS as readonly string[]).includes(value)
}

/** 슬롯 생성/검증에 필요한 정책 부분집합 (slots.ts 순수 함수 주입용) */
export interface SlotPolicy {
  openTime: string
  closeTime: string
  slotIntervalMinutes: number
  durationMinutes: number
  minLeadTimeHours: number
  maxAdvanceDays: number
  closedWeekdays: readonly number[]
}

/** 전체 예약 정책 (DB reservation_settings 1행과 1:1) */
export interface ReservationPolicy extends SlotPolicy {
  accepting: boolean
  maxPartySize: number
  maxActiveReservationsPerEmail: number
  programs: string[]
}

export const DEFAULT_RESERVATION_POLICY: ReservationPolicy = {
  accepting: true,
  openTime: RESERVATION_CONFIG.openTime,
  closeTime: RESERVATION_CONFIG.closeTime,
  slotIntervalMinutes: RESERVATION_CONFIG.slotIntervalMinutes,
  durationMinutes: RESERVATION_CONFIG.durationMinutes,
  minLeadTimeHours: RESERVATION_CONFIG.minLeadTimeHours,
  maxAdvanceDays: RESERVATION_CONFIG.maxAdvanceDays,
  closedWeekdays: [...RESERVATION_CONFIG.closedWeekdays],
  maxPartySize: RESERVATION_CONFIG.maxPartySize,
  maxActiveReservationsPerEmail: RESERVATION_CONFIG.maxActiveReservationsPerEmail,
  programs: [...KNOWN_RESERVATION_PROGRAMS],
}
