"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ReservationPolicy } from "@/lib/reservation/config"
import {
  generateSlotsForDate,
  getBookableDateRange,
  getKstDateString,
  getWeekday,
  isValidSlot,
} from "@/lib/reservation/slots"

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
}

interface MonthCalendarProps {
  policy: ReservationPolicy
  selectedDate: string | null
  onSelect: (date: string) => void
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * 월 단위 달력 뷰 (Calendly/네이버 예약 스타일, 라이브러리 없음).
 * 예약 가능 기간 밖·휴무일·리드타임 마감일은 비활성 표시.
 */
export function MonthCalendar({ policy, selectedDate, onSelect }: MonthCalendarProps) {
  const t = useTranslations("reserve")
  const locale = useLocale()
  const intl = INTL_LOCALE[locale] || "en-US"

  // 예약 가능 날짜 집합 + 달 목록 (오늘이 속한 달 ~ 마지막 예약 가능일이 속한 달)
  const { bookableSet, months, today } = useMemo(() => {
    const { dates } = getBookableDateRange(undefined, policy)
    const bookable = new Set(
      dates.filter((date) =>
        generateSlotsForDate(date, policy).some((slot) =>
          isValidSlot(slot.startIso, undefined, policy)
        )
      )
    )
    const monthKeys = [...new Set(dates.map((d) => d.slice(0, 7)))]
    return { bookableSet: bookable, months: monthKeys, today: getKstDateString() }
  }, [policy])

  const [monthIdx, setMonthIdx] = useState(() => {
    // 선택된 날짜가 있으면 그 달부터 표시
    if (selectedDate) {
      const idx = months.indexOf(selectedDate.slice(0, 7))
      if (idx >= 0) return idx
    }
    return 0
  })
  const month = months[Math.min(monthIdx, months.length - 1)]
  const [year, monthNum] = month.split("-").map(Number)

  const monthLabel = new Intl.DateTimeFormat(intl, {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
  }).format(new Date(`${month}-01T00:00:00+09:00`))

  // 요일 헤더 (일~토, 로케일 표기) — 2026-07-05은 일요일
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intl, { timeZone: "Asia/Seoul", weekday: "narrow" })
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(`2026-07-${pad(5 + i)}T00:00:00+09:00`))
    )
  }, [intl])

  // 셀 구성: 앞쪽 공백 + 해당 월의 날짜들
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
  const leadingBlanks = getWeekday(`${month}-01`)
  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ]

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={monthIdx <= 0}
          aria-label={t("prevMonth")}
          className="grid h-9 w-9 place-items-center rounded-[12px] border-2 border-[#262A38] bg-[#12141D] transition-all disabled:cursor-not-allowed disabled:border-[#262A38] disabled:text-[#5C564A]"
        >
          <ChevronLeft size={17} strokeWidth={2.8} />
        </button>
        <p className="text-base font-black text-[#E9E2D0]">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIdx >= months.length - 1}
          aria-label={t("nextMonth")}
          className="grid h-9 w-9 place-items-center rounded-[12px] border-2 border-[#262A38] bg-[#12141D] transition-all disabled:cursor-not-allowed disabled:border-[#262A38] disabled:text-[#5C564A]"
        >
          <ChevronRight size={17} strokeWidth={2.8} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7">
        {weekdayLabels.map((label, i) => (
          <p
            key={i}
            className={`py-1 text-center text-[11px] lg:text-[13px] font-black ${
              i === 0 ? "text-red-400" : i === 6 ? "text-[#8B8578]" : "text-[#8B8578]"
            }`}
          >
            {label}
          </p>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />
          const bookable = bookableSet.has(date)
          const selected = date === selectedDate
          const isToday = date === today
          const weekday = getWeekday(date)
          return (
            <button
              key={date}
              type="button"
              disabled={!bookable}
              onClick={() => onSelect(date)}
              className={`relative mx-auto grid h-10 w-10 place-items-center rounded-[12px] text-sm lg:text-base font-black transition-all sm:h-11 sm:w-11 ${
                selected
                  ? "border-2 border-[#262A38] bg-[#D7D7D7] text-[#0C0E16]"
                  : bookable
                    ? `border-2 border-[#262A38] bg-[#12141D] text-[#E9E2D0] hover:border-[#262A38] ${
                        weekday === 0 ? "text-red-500" : weekday === 6 ? "text-[#8B8578]" : ""
                      }`
                    : "cursor-not-allowed text-[#5C564A]"
              }`}
            >
              {Number(date.slice(8))}
              {isToday && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    selected ? "bg-[#161925]" : "bg-[#161925]"
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
