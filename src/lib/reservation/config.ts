// 방문 예약 정책 상수 — 단일 소스
// 영업시간·소요시간·휴무일·프로그램은 사장님 확정 후 이 파일만 수정하면 된다.
// (클라이언트/서버 양쪽에서 import 되므로 비밀값 금지)

export const RESERVATION_CONFIG = {
  timezone: 'Asia/Seoul',
  utcOffset: '+09:00',
  openTime: '11:00',   // TODO 사장님 확정
  closeTime: '19:00',  // TODO 사장님 확정
  slotIntervalMinutes: 30,
  durationMinutes: 60, // TODO 소요시간 확정
  minLeadTimeHours: 12,
  maxAdvanceDays: 30,
  // 0=일 1=월 ... 6=토 (예: 매주 월요일 휴무면 [1])
  closedWeekdays: [] as number[],
  maxPartySize: 6,
  maxActiveReservationsPerEmail: 2,
  programs: ['idol-image', 'personal', 'chemistry'] as const, // TODO 확정
} as const

export type ReservationProgram = (typeof RESERVATION_CONFIG.programs)[number]

export function isReservationProgram(value: string): value is ReservationProgram {
  return (RESERVATION_CONFIG.programs as readonly string[]).includes(value)
}
