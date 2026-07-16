"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CalendarDays, ChevronLeft, Clock, Globe } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { isReservationProgram, type ReservationPolicy } from "@/lib/reservation/config"
import { MonthCalendar } from "./MonthCalendar"
import { SlotGrid } from "./SlotGrid"
import { ReservationForm } from "./ReservationForm"
import { SuccessCard, type ReservationResult } from "./SuccessCard"

type Step = "when" | "form" | "done"

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
}

export function formatKstDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] || "en-US", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateStr}T00:00:00+09:00`))
}

export function ReserveFlow() {
  const t = useTranslations("reserve")
  const locale = useLocale()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>("when")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; startIso: string } | null>(null)
  const [result, setResult] = useState<ReservationResult | null>(null)
  const [slotRefreshKey, setSlotRefreshKey] = useState(0)
  const [slotTakenNotice, setSlotTakenNotice] = useState(false)
  const slotSectionRef = useRef<HTMLDivElement>(null)

  // ?program= 쿼리 preselect (정책 로드 후 노출 목록과 대조해 보정)
  const programParam = searchParams.get("program")
  const [program, setProgram] = useState<string>(
    programParam && isReservationProgram(programParam) ? programParam : ""
  )

  // 정책은 어드민 설정(DB) 기반 — 클라이언트에서 로드 (SSR에는 스피너만 렌더)
  const [policy, setPolicy] = useState<ReservationPolicy | null>(null)
  const [policyError, setPolicyError] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch("/api/reservations/config")
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setPolicyError(true)
          return
        }
        const data = (await res.json()) as { policy: ReservationPolicy }
        if (cancelled) return
        setPolicy(data.policy)
        setProgram((prev) =>
          prev && data.policy.programs.includes(prev) ? prev : data.policy.programs[0] || ""
        )
      })
      .catch(() => {
        if (!cancelled) setPolicyError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 날짜 선택 시 시간 섹션으로 부드럽게 스크롤 (모바일 UX)
  useEffect(() => {
    if (selectedDate && step === "when") {
      slotSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedDate, step])

  const handleSlotTaken = useCallback(() => {
    // 409: 방금 다른 손님이 선점 → 슬롯 목록 갱신 후 일시 선택으로 복귀
    setSelectedSlot(null)
    setSlotTakenNotice(true)
    setSlotRefreshKey((k) => k + 1)
    setStep("when")
  }, [])

  if (policyError) {
    return (
      <p className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] px-4 py-8 text-center text-sm font-black text-slate-600 shadow-[4px_4px_0_0_black]">
        {t("errors.generic")}
      </p>
    )
  }

  if (!policy) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-[#FCD34D] rounded-full animate-spin" />
      </div>
    )
  }

  // 어드민에서 예약 접수를 꺼둔 경우
  if (!policy.accepting) {
    return (
      <p className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] px-4 py-8 text-center text-sm font-black text-slate-600 shadow-[4px_4px_0_0_black]">
        {t("slotsUnavailable")}
      </p>
    )
  }

  if (step === "done" && result) {
    return <SuccessCard result={result} />
  }

  const steps: Exclude<Step, "done">[] = ["when", "form"]
  const stepLabels: Record<Exclude<Step, "done">, string> = {
    when: t("stepWhen"),
    form: t("stepForm"),
  }
  const currentIndex = steps.indexOf(step as Exclude<Step, "done">)

  return (
    <div className="space-y-5">
      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full border border-slate-900 ${
                i <= currentIndex ? "bg-[#FCD34D]" : "bg-white"
              }`}
            />
            <p
              className={`mt-1.5 text-[11px] font-black ${
                i === currentIndex ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {i + 1}. {stepLabels[s]}
            </p>
          </div>
        ))}
      </div>

      {/* 매장 정보 칩 */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-[2px_2px_0_0_black]">
          <Clock size={13} strokeWidth={2.8} />
          {t("hours")} {policy.openTime}–{policy.closeTime}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-[2px_2px_0_0_black]">
          ⏱ {t("policy.duration", { minutes: policy.durationMinutes })}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-[2px_2px_0_0_black]">
          💳 {t("policy.payment")}
        </span>
      </div>

      {/* Step 1: 날짜 + 시간 (한 화면, Calendly 스타일) */}
      {step === "when" && (
        <>
          <section className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-900" />
              <h2 className="text-base font-black text-slate-900">{t("selectDate")}</h2>
            </div>
            <MonthCalendar
              policy={policy}
              selectedDate={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date)
                setSelectedSlot(null)
                setSlotTakenNotice(false)
              }}
            />
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <Globe size={12} />
              {t("kstNotice")}
            </p>
          </section>

          {selectedDate && (
            <section
              ref={slotSectionRef}
              className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]"
            >
              <div className="mb-3 flex items-center gap-2">
                <Clock size={18} className="text-slate-900" />
                <h2 className="text-base font-black text-slate-900">
                  {formatKstDate(selectedDate, locale)} · {t("selectTime")}
                </h2>
              </div>
              {slotTakenNotice && (
                <p className="mb-3 rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                  {t("errors.slotTaken")}
                </p>
              )}
              <SlotGrid
                date={selectedDate}
                refreshKey={slotRefreshKey}
                selectedStartIso={selectedSlot?.startIso ?? null}
                onSelect={(slot) => {
                  setSelectedSlot(slot)
                  setSlotTakenNotice(false)
                  setStep("form")
                }}
              />
            </section>
          )}
        </>
      )}

      {/* Step 2: 정보 입력 */}
      {step === "form" && selectedDate && selectedSlot && (
        <section className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]">
          <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-slate-900 bg-[#FEF3C7] px-3 py-2.5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {t("selectedSlot")}
              </p>
              <p className="text-sm font-black text-slate-900 sm:text-base">
                {formatKstDate(selectedDate, locale)} · {selectedSlot.time}
                <span className="ml-1 text-xs font-bold text-slate-500">(KST)</span>
              </p>
            </div>
            <button
              onClick={() => setStep("when")}
              className="flex flex-shrink-0 items-center gap-1 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-slate-900 shadow-[2px_2px_0_0_black] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_black]"
            >
              <ChevronLeft size={13} strokeWidth={3} />
              {t("changeSlot")}
            </button>
          </div>
          <ReservationForm
            policy={policy}
            slotStartIso={selectedSlot.startIso}
            program={program}
            onProgramChange={setProgram}
            onSlotTaken={handleSlotTaken}
            onSuccess={(res) => {
              setResult(res)
              setStep("done")
            }}
          />
        </section>
      )}
    </div>
  )
}
