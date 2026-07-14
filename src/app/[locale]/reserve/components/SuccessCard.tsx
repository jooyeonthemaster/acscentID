"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, MapPin } from "lucide-react"

export interface ReservationResult {
  reservationCode: string
  slotStartIso: string
  program: string
  email: string
}

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
}

const MAP_URL = "https://maps.google.com/?q=AC'SCENT+ID+112-1+Wausan-ro+Mapo-gu+Seoul"

export function SuccessCard({ result }: { result: ReservationResult }) {
  const t = useTranslations("reserve")
  const locale = useLocale()

  const slotText = `${new Intl.DateTimeFormat(INTL_LOCALE[locale] || "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(result.slotStartIso))} (KST)`

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-[#FFFDF5] p-6 shadow-[4px_4px_0_0_black]">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="mb-3 grid h-14 w-14 place-items-center rounded-full border-2 border-slate-900 bg-[#FCD34D]">
          <CheckCircle2 size={28} className="text-slate-900" strokeWidth={2.4} />
        </span>
        <h2 className="text-xl font-black text-slate-900">{t("done.title")}</h2>
        <p className="mt-1 text-sm font-bold text-slate-600">{t("done.subtitle")}</p>
      </div>

      <div className="space-y-3 rounded-xl border-2 border-slate-900 bg-white p-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            {t("done.codeLabel")}
          </p>
          <p className="text-2xl font-black tracking-wider text-slate-900">
            {result.reservationCode}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            {t("done.dateLabel")}
          </p>
          <p className="text-base font-black text-slate-900">{slotText}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            {t("done.programLabel")}
          </p>
          <p className="text-base font-black text-slate-900">
            {t(`programs.${result.program}`)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm font-bold text-slate-700">
        <p>📧 {t("done.emailNotice", { email: result.email })}</p>
        <p>💳 {t("policy.payment")}</p>
        <p>✉️ {t("done.cancelNotice")}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white py-3 text-sm font-black text-slate-900 shadow-[4px_4px_0_0_black] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_black]"
        >
          <MapPin size={16} />
          {t("done.mapLink")}
        </a>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-[#FCD34D] py-3 text-sm font-black text-slate-900 shadow-[4px_4px_0_0_black] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_black]"
        >
          {t("done.home")}
        </Link>
      </div>
    </div>
  )
}
