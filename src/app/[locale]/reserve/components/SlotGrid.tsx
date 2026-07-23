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
      <p className="rounded-[12px] border-2 border-[#262A38] bg-[#12141D] px-4 py-6 text-center text-sm lg:text-base font-black text-[#A69F8D]">
        {error === "unavailable" ? t("slotsUnavailable") : t("errors.generic")}
      </p>
    )
  }

  if (!slots) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-[#262A38] border-t-[#D7D7D7] rounded-full animate-spin" />
      </div>
    )
  }

  const hasAvailable = slots.some((s) => s.available)
  if (!hasAvailable) {
    return (
      <p className="rounded-[12px] border-2 border-[#262A38] bg-[#12141D] px-4 py-6 text-center text-sm lg:text-base font-black text-[#A69F8D]">
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
            className={`rounded-[12px] border-2 py-2.5 text-sm lg:text-base font-black transition-all ${
              selected
                ? "border-[#262A38] bg-[#D7D7D7] text-[#0C0E16]"
                : slot.available
                  ? "border-[#262A38] bg-[#12141D] text-[#E9E2D0]"
                  : "cursor-not-allowed border-[#262A38] bg-[#1B1F2C] text-[#5C564A] line-through shadow-none"
            }`}
          >
            {slot.time}
          </button>
        )
      })}
    </div>
  )
}
