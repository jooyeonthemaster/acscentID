"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CalendarDays, ChevronLeft, Clock } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { isReservationProgram, type ReservationPolicy } from "@/lib/reservation/config"
import { DateStrip } from "./DateStrip"
import { SlotGrid } from "./SlotGrid"
import { ReservationForm } from "./ReservationForm"
import { SuccessCard, type ReservationResult } from "./SuccessCard"

type Step = "date" | "slot" | "form" | "done"

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

  const [step, setStep] = useState<Step>("date")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; startIso: string } | null>(null)
  const [result, setResult] = useState<ReservationResult | null>(null)
  const [slotRefreshKey, setSlotRefreshKey] = useState(0)
  const [slotTakenNotice, setSlotTakenNotice] = useState(false)

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

  const handleSlotTaken = useCallback(() => {
    // 409: 방금 다른 손님이 선점 → 슬롯 목록 갱신 후 시간 선택으로 복귀
    setSelectedSlot(null)
    setSlotTakenNotice(true)
    setSlotRefreshKey((k) => k + 1)
    setStep("slot")
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

  const steps: Step[] = ["date", "slot", "form"]
  const stepLabels: Record<Exclude<Step, "done">, string> = {
    date: t("stepDate"),
    slot: t("stepSlot"),
    form: t("stepForm"),
  }
  const currentIndex = steps.indexOf(step)

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
              {i + 1}. {stepLabels[s as Exclude<Step, "done">]}
            </p>
          </div>
        ))}
      </div>

      {/* 안내 카드 (정책) */}
      <div className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] px-4 py-3 shadow-[4px_4px_0_0_black]">
        <p className="text-xs font-bold text-slate-700 leading-relaxed">
          ⏱ {t("policy.duration", { minutes: policy.durationMinutes })}
          {" · "}
          {t("policy.leadTime", { hours: policy.minLeadTimeHours })}
          <br />💳 {t("policy.payment")}
        </p>
      </div>

      {/* Step 1: 날짜 */}
      {step === "date" && (
        <section className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-slate-900" />
            <h2 className="text-base font-black text-slate-900">{t("selectDate")}</h2>
          </div>
          <DateStrip
            policy={policy}
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date)
              setSelectedSlot(null)
              setSlotTakenNotice(false)
              setStep("slot")
            }}
          />
        </section>
      )}

      {/* Step 2: 시간 */}
      {step === "slot" && selectedDate && (
        <section className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-slate-900" />
              <h2 className="text-base font-black text-slate-900">
                {formatKstDate(selectedDate, locale)}
              </h2>
            </div>
            <button
              onClick={() => setStep("date")}
              className="flex items-center gap-1 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-slate-900 shadow-[2px_2px_0_0_black] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_black]"
            >
              <ChevronLeft size={13} strokeWidth={3} />
              {t("changeDate")}
            </button>
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

      {/* Step 3: 정보 입력 */}
      {step === "form" && selectedDate && selectedSlot && (
        <section className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-4 shadow-[4px_4px_0_0_black]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {t("selectedSlot")}
              </p>
              <p className="text-base font-black text-slate-900">
                {formatKstDate(selectedDate, locale)} · {selectedSlot.time}
              </p>
            </div>
            <button
              onClick={() => setStep("slot")}
              className="flex items-center gap-1 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-slate-900 shadow-[2px_2px_0_0_black] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_black]"
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
