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
    <div className="rounded-[12px] border-2 border-[#262A38] bg-[#0C0E16] p-6">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="mb-3 grid h-14 w-14 place-items-center rounded-full border-2 border-[#262A38] bg-[#D7D7D7]">
          <CheckCircle2 size={28} className="text-[#E9E2D0]" strokeWidth={2.4} />
        </span>
        <h2 className="text-xl font-black text-[#E9E2D0]">{t("done.title")}</h2>
        <p className="mt-1 text-sm lg:text-base font-bold text-[#A69F8D]">{t("done.subtitle")}</p>
      </div>

      <div className="space-y-3 rounded-[12px] border-2 border-[#262A38] bg-[#12141D] p-4">
        <div>
          <p className="text-[11px] lg:text-[13px] font-black uppercase tracking-[0.14em] text-[#8B8578]">
            {t("done.codeLabel")}
          </p>
          <p className="text-2xl font-black tracking-wider text-[#E9E2D0]">
            {result.reservationCode}
          </p>
        </div>
        <div>
          <p className="text-[11px] lg:text-[13px] font-black uppercase tracking-[0.14em] text-[#8B8578]">
            {t("done.dateLabel")}
          </p>
          <p className="text-base font-black text-[#E9E2D0]">{slotText}</p>
        </div>
        <div>
          <p className="text-[11px] lg:text-[13px] font-black uppercase tracking-[0.14em] text-[#8B8578]">
            {t("done.programLabel")}
          </p>
          <p className="text-base font-black text-[#E9E2D0]">
            {t(`programs.${result.program}`)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm lg:text-base font-bold text-[#A69F8D]">
        <p>📧 {t("done.emailNotice", { email: result.email })}</p>
        <p>💳 {t("policy.payment")}</p>
        <p>✉️ {t("done.cancelNotice")}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-[#262A38] bg-[#12141D] py-3 text-sm lg:text-base font-black text-[#E9E2D0] transition-all"
        >
          <MapPin size={16} />
          {t("done.mapLink")}
        </a>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-[#262A38] bg-[#F5EFE2] py-3 text-sm lg:text-base font-black text-[#12141D] transition-all"
        >
          {t("done.home")}
        </Link>
      </div>
    </div>
  )
}
