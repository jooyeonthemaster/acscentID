"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  generateSlotsForDate,
  getBookableDateRange,
  isClosedDate,
  isValidSlot,
} from "@/lib/reservation/slots"

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
}

interface DateStripProps {
  selectedDate: string | null
  onSelect: (date: string) => void
}

/** 향후 30일 가로 스크롤 날짜 선택 (라이브러리 없음) */
export function DateStrip({ selectedDate, onSelect }: DateStripProps) {
  const t = useTranslations("reserve")
  const locale = useLocale()

  const days = useMemo(() => {
    const { dates } = getBookableDateRange()
    const weekdayFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale] || "en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
    })
    const monthFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale] || "en-US", {
      timeZone: "Asia/Seoul",
      month: "short",
    })
    return dates.map((date) => {
      const d = new Date(`${date}T00:00:00+09:00`)
      // 휴무일이거나 (리드타임 등으로) 모든 슬롯이 이미 닫힌 날은 비활성
      const bookable =
        !isClosedDate(date) &&
        generateSlotsForDate(date).some((slot) => isValidSlot(slot.startIso))
      return {
        date,
        dayNumber: date.slice(8),
        weekday: weekdayFmt.format(d),
        month: monthFmt.format(d),
        isMonthStart: date.slice(8) === "01",
        bookable,
      }
    })
  }, [locale])

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {days.map((day, i) => {
          const selected = day.date === selectedDate
          return (
            <button
              key={day.date}
              disabled={!day.bookable}
              onClick={() => onSelect(day.date)}
              className={`snap-start flex-shrink-0 w-[60px] rounded-xl border-2 border-slate-900 px-2 py-2.5 text-center transition-all ${
                selected
                  ? "bg-[#FCD34D] shadow-[3px_3px_0_0_black]"
                  : day.bookable
                    ? "bg-white shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black]"
                    : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-300 shadow-none"
              }`}
            >
              <span
                className={`block text-[10px] font-black uppercase ${
                  day.bookable ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {i === 0 || day.isMonthStart ? day.month : day.weekday}
              </span>
              <span
                className={`block text-lg font-black leading-tight ${
                  day.bookable ? "text-slate-900" : "text-slate-300"
                }`}
              >
                {day.dayNumber}
              </span>
              {(i === 0 || day.isMonthStart) && (
                <span
                  className={`block text-[10px] font-black ${
                    day.bookable ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {day.weekday}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-500">{t("dateStripHint")}</p>
    </div>
  )
}
