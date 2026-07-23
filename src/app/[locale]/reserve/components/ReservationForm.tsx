"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Send } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { useAuth } from "@/contexts/AuthContext"
import type { ReservationPolicy } from "@/lib/reservation/config"
import type { ReservationResult } from "./SuccessCard"

interface ReservationFormProps {
  policy: ReservationPolicy
  slotStartIso: string
  program: string
  onProgramChange: (program: string) => void
  onSlotTaken: () => void
  onSuccess: (result: ReservationResult) => void
}

const inputClass =
  "w-full rounded-[12px] border-2 border-[#262A38] bg-[#12141D] px-3 py-2.5 text-sm lg:text-base font-bold text-[#E9E2D0] placeholder:text-[#8B8578] focus:outline-none focus:ring-2 focus:ring-[#D7D7D7]"

export function ReservationForm({
  policy,
  slotStartIso,
  program,
  onProgramChange,
  onSlotTaken,
  onSuccess,
}: ReservationFormProps) {
  const t = useTranslations("reserve")
  const { user, unifiedUser } = useAuth()

  // 회원 자동입력: 직접 입력 전(null)에는 계정/배송지 값을 보여준다 (입력하면 그 값 우선)
  const [nameInput, setNameInput] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState<string | null>(null)
  const [savedPhone, setSavedPhone] = useState("")
  const [partySize, setPartySize] = useState(1)
  const [notes, setNotes] = useState("")
  // 안티스팸 honeypot — 사람 눈에는 보이지 않는 필드
  const [website, setWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const authName =
    unifiedUser?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    ""
  const authEmail = user?.email || unifiedUser?.email || ""
  const isLoggedIn = !!(user || unifiedUser)

  // 회원이면 기본 배송지의 전화번호를 가져와 자동입력
  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    fetch("/api/user/address")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { address?: { phone?: string } } | null) => {
        if (!cancelled && data?.address?.phone) setSavedPhone(data.address.phone)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const name = nameInput ?? authName
  const email = emailInput ?? authEmail
  const phone = phoneInput ?? savedPhone

  const phoneDigits = phone.replace(/\D/g, "")
  const isValid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneDigits.length >= 7

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
        <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">
          {t("form.name")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setNameInput(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">
          {t("form.phone")} <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          required
          maxLength={30}
          value={phone}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder={t("form.phonePlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">
          {t("form.email")} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmailInput(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-[11px] lg:text-[13px] font-bold text-[#8B8578]">{t("form.emailHint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">
            {t("form.partySize")}
          </label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: policy.maxPartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">
            {t("form.program")}
          </label>
          <select
            value={program}
            onChange={(e) => onProgramChange(e.target.value)}
            className={inputClass}
          >
            {policy.programs.map((p) => (
              <option key={p} value={p}>
                {t(`programs.${p}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs lg:text-sm font-black text-[#A69F8D]">{t("form.notes")}</label>
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
        <p className="rounded-[12px] border-2 border-red-500 bg-red-50 px-3 py-2 text-xs lg:text-sm font-black text-red-600">
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
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] py-3.5 text-base font-black text-[#1A1610] transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
