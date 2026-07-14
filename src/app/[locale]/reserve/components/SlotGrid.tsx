"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { apiFetch } from "@/lib/api-client"

interface AvailabilitySlot {
  time: string
  startIso: string
  available: boolean
}

interface SlotGridProps {
  date: string
  refreshKey: number
  selectedStartIso: string | null
  onSelect: (slot: { time: string; startIso: string }) => void
}

/** 30분 단위 시작 시간 버튼 그리드 — availability API 기반 */
interface SlotGridState {
  key: string
  slots?: AvailabilitySlot[]
  error?: "unavailable" | "generic"
}

export function SlotGrid({ date, refreshKey, selectedStartIso, onSelect }: SlotGridProps) {
  const t = useTranslations("reserve")
  // 요청 키가 현재 (date, refreshKey)와 다르면 로딩 중으로 간주 — effect 내 동기 setState 회피
  const requestKey = `${date}:${refreshKey}`
  const [state, setState] = useState<SlotGridState | null>(null)

  useEffect(() => {
    let cancelled = false
    const key = `${date}:${refreshKey}`

    apiFetch(`/api/reservations/availability?date=${date}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 503) {
          setState({ key, error: "unavailable" })
          return
        }
        if (!res.ok) {
          setState({ key, error: "generic" })
          return
        }
        const data = (await res.json()) as { slots: AvailabilitySlot[] }
        if (!cancelled) setState({ key, slots: data.slots })
      })
      .catch(() => {
        if (!cancelled) setState({ key, error: "generic" })
      })

    return () => {
      cancelled = true
    }
  }, [date, refreshKey])

  const current = state && state.key === requestKey ? state : null
  const error = current?.error ?? null
  const slots = current?.slots ?? null

  if (error) {
    return (
      <p className="rounded-xl border-2 border-slate-900 bg-white px-4 py-6 text-center text-sm font-black text-slate-600">
        {error === "unavailable" ? t("slotsUnavailable") : t("errors.generic")}
      </p>
    )
  }

  if (!slots) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-[#FCD34D] rounded-full animate-spin" />
      </div>
    )
  }

  const hasAvailable = slots.some((s) => s.available)
  if (!hasAvailable) {
    return (
      <p className="rounded-xl border-2 border-slate-900 bg-white px-4 py-6 text-center text-sm font-black text-slate-600">
        {t("noSlots")}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const selected = slot.startIso === selectedStartIso
        return (
          <button
            key={slot.startIso}
            disabled={!slot.available}
            onClick={() => onSelect({ time: slot.time, startIso: slot.startIso })}
            className={`rounded-xl border-2 py-2.5 text-sm font-black transition-all ${
              selected
                ? "border-slate-900 bg-[#FCD34D] text-slate-900 shadow-[3px_3px_0_0_black]"
                : slot.available
                  ? "border-slate-900 bg-white text-slate-900 shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black]"
                  : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-300 line-through shadow-none"
            }`}
          >
            {slot.time}
          </button>
        )
      })}
    </div>
  )
}
