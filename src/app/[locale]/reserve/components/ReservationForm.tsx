"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Send } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { RESERVATION_CONFIG, type ReservationProgram } from "@/lib/reservation/config"
import type { ReservationResult } from "./SuccessCard"

interface ReservationFormProps {
  slotStartIso: string
  program: ReservationProgram
  onProgramChange: (program: ReservationProgram) => void
  onSlotTaken: () => void
  onSuccess: (result: ReservationResult) => void
}

const inputClass =
  "w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FCD34D]"

export function ReservationForm({
  slotStartIso,
  program,
  onProgramChange,
  onSlotTaken,
  onSuccess,
}: ReservationFormProps) {
  const t = useTranslations("reserve")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [partySize, setPartySize] = useState(1)
  const [notes, setNotes] = useState("")
  // 안티스팸 honeypot — 사람 눈에는 보이지 않는 필드
  const [website, setWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const isValid =
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setErrorKey(null)

    try {
      const res = await apiFetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          partySize,
          program,
          slotStart: slotStartIso,
          notes: notes.trim(),
          website,
        }),
      })

      if (res.status === 409) {
        onSlotTaken()
        return
      }
      if (res.status === 429) {
        setErrorKey("tooMany")
        return
      }
      if (res.status === 503) {
        setErrorKey("systemUnavailable")
        return
      }
      if (!res.ok) {
        setErrorKey("generic")
        return
      }

      const data = (await res.json()) as {
        reservationCode: string
        slotStart: string
        program: string
      }
      onSuccess({
        reservationCode: data.reservationCode,
        slotStartIso: data.slotStart,
        program: data.program,
        email: email.trim(),
      })
    } catch {
      setErrorKey("generic")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* honeypot — 봇 방지용. 접근성 트리에서도 제외 */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">
          {t("form.name")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">
          {t("form.email")} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-[11px] font-bold text-slate-500">{t("form.emailHint")}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">{t("form.phone")}</label>
        <input
          type="tel"
          maxLength={30}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("form.phonePlaceholder")}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">
            {t("form.partySize")}
          </label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: RESERVATION_CONFIG.maxPartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">
            {t("form.program")}
          </label>
          <select
            value={program}
            onChange={(e) => onProgramChange(e.target.value as ReservationProgram)}
            className={inputClass}
          >
            {RESERVATION_CONFIG.programs.map((p) => (
              <option key={p} value={p}>
                {t(`programs.${p}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">{t("form.notes")}</label>
        <textarea
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("form.notesPlaceholder")}
          className={`${inputClass} resize-none`}
        />
      </div>

      {errorKey && (
        <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-black text-red-600">
          {errorKey === "tooMany"
            ? t("errors.tooMany")
            : errorKey === "systemUnavailable"
              ? t("slotsUnavailable")
              : t("errors.generic")}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-[#FCD34D] py-3.5 text-base font-black text-slate-900 shadow-[4px_4px_0_0_black] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_black] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_black]"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t("form.submitting")}
          </>
        ) : (
          <>
            <Send size={18} />
            {t("form.submit")}
          </>
        )}
      </button>
    </form>
  )
}
