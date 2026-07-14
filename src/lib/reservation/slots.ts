// 예약 슬롯 순수 함수 모음 — 클라이언트/서버 공용, 외부 의존성 없음
// 타임존은 KST 고정: `${date}T${HH}:${mm}:00+09:00` 명시 오프셋으로만 조립한다.

import { RESERVATION_CONFIG } from './config'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export interface ReservationSlot {
  time: string      // 'HH:mm' (KST)
  startIso: string  // '2026-07-20T11:00:00+09:00'
  endIso: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// 슬롯 ISO는 정확히 이 형태만 허용 (분 단위, +09:00 고정)
const SLOT_ISO_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00\+09:00$/

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** KST 기준 'YYYY-MM-DD'. now(ms)는 테스트 주입용. */
export function getKstDateString(nowMs: number = Date.now()): string {
  const d = new Date(nowMs + KST_OFFSET_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 'YYYY-MM-DD' + 자정 이후 경과 분 → KST ISO 문자열 */
export function buildSlotIso(dateStr: string, minutesFromMidnight: number): string {
  // 자정을 넘는 경우까지 안전하게 Date 연산으로 처리
  const base = new Date(`${dateStr}T00:00:00+09:00`).getTime()
  const t = new Date(base + minutesFromMidnight * 60_000 + KST_OFFSET_MS)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:00+09:00`
}

/** 달력 날짜의 요일 (0=일 ... 6=토) — KST 캘린더 기준 */
export function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isClosedDate(dateStr: string): boolean {
  return (RESERVATION_CONFIG.closedWeekdays as readonly number[]).includes(getWeekday(dateStr))
}

/**
 * 해당 날짜의 슬롯 그리드 전체 (가용성 판단 없이 생성만).
 * 잘못된 날짜 형식이면 빈 배열.
 */
export function generateSlotsForDate(dateStr: string): ReservationSlot[] {
  if (!DATE_RE.test(dateStr) || Number.isNaN(new Date(`${dateStr}T00:00:00+09:00`).getTime())) {
    return []
  }
  const open = toMinutes(RESERVATION_CONFIG.openTime)
  const close = toMinutes(RESERVATION_CONFIG.closeTime)
  const { slotIntervalMinutes, durationMinutes } = RESERVATION_CONFIG

  const slots: ReservationSlot[] = []
  // 마지막 시작 시간 = 폐점 - 소요시간 (예: 19:00 폐점·60분 → 18:00 시작이 마지막)
  for (let m = open; m + durationMinutes <= close; m += slotIntervalMinutes) {
    slots.push({
      time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
      startIso: buildSlotIso(dateStr, m),
      endIso: buildSlotIso(dateStr, m + durationMinutes),
    })
  }
  return slots
}

/**
 * 슬롯 시작 ISO가 예약 가능한지 검증.
 * 형식(+09:00 고정) / 30분 그리드 / 영업시간 / 휴무일 / 리드타임 / 최대 예약 가능일 모두 통과해야 true.
 */
export function isValidSlot(slotIso: string, nowMs: number = Date.now()): boolean {
  const match = SLOT_ISO_RE.exec(slotIso)
  if (!match) return false
  const [, dateStr, hh, mm] = match
  const startMs = new Date(slotIso).getTime()
  if (Number.isNaN(startMs)) return false

  const minutes = Number(hh) * 60 + Number(mm)
  const open = toMinutes(RESERVATION_CONFIG.openTime)
  const close = toMinutes(RESERVATION_CONFIG.closeTime)
  const { slotIntervalMinutes, durationMinutes, minLeadTimeHours } = RESERVATION_CONFIG

  // 그리드 정렬 + 영업시간 내 시작/종료
  if ((minutes - open) % slotIntervalMinutes !== 0) return false
  if (minutes < open || minutes + durationMinutes > close) return false

  // 휴무일
  if (isClosedDate(dateStr)) return false

  // 리드타임 (예: 12시간 이내 시작 슬롯은 불가)
  if (startMs < nowMs + minLeadTimeHours * 60 * 60 * 1000) return false

  // 최대 예약 가능일 (KST 달력 기준 오늘 + maxAdvanceDays 까지)
  const { endDate } = getBookableDateRange(nowMs)
  if (dateStr > endDate) return false

  return true
}

/** 두 구간 [aStart,aEnd) / [bStart,bEnd) 의 겹침 여부 (ms 또는 ISO 비교) */
export function overlaps(
  aStartIso: string | number,
  aEndIso: string | number,
  bStartIso: string | number,
  bEndIso: string | number
): boolean {
  const aStart = typeof aStartIso === 'number' ? aStartIso : new Date(aStartIso).getTime()
  const aEnd = typeof aEndIso === 'number' ? aEndIso : new Date(aEndIso).getTime()
  const bStart = typeof bStartIso === 'number' ? bStartIso : new Date(bStartIso).getTime()
  const bEnd = typeof bEndIso === 'number' ? bEndIso : new Date(bEndIso).getTime()
  return aStart < bEnd && bStart < aEnd
}

/** 예약 가능한 날짜 범위(KST): 오늘 ~ 오늘+maxAdvanceDays. dates에 전체 목록 포함. */
export function getBookableDateRange(nowMs: number = Date.now()): {
  startDate: string
  endDate: string
  dates: string[]
} {
  const startDate = getKstDateString(nowMs)
  const dates: string[] = []
  for (let i = 0; i <= RESERVATION_CONFIG.maxAdvanceDays; i++) {
    dates.push(getKstDateString(nowMs + i * DAY_MS))
  }
  return { startDate, endDate: dates[dates.length - 1], dates }
}
