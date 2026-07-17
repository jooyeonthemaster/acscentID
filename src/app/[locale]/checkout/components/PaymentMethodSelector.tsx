"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'
import type { PaymentMethod } from "@/types/cart"
import { isEasyPayChannelConfigured } from "@/lib/portone/config"

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
}

interface PaymentOption {
  method: PaymentMethod
  label: string
  sublabel?: string
  icon: React.ReactNode
  accentColor: string
  accentBg: string
}

function BankIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="20" width="20" height="2.5" rx="1" fill={active ? "#404040" : "#262A38"} />
      <rect x="6" y="12" width="2.5" height="8" rx="1" fill={active ? "#545454" : "#262A38"} />
      <rect x="12.75" y="12" width="2.5" height="8" rx="1" fill={active ? "#545454" : "#262A38"} />
      <rect x="19.5" y="12" width="2.5" height="8" rx="1" fill={active ? "#545454" : "#262A38"} />
      <path d="M14 4L3 11H25L14 4Z" fill={active ? "#404040" : "#262A38"} />
      <circle cx="14" cy="8.5" r="1.5" fill={active ? "#F8FAFC" : "#F1F5F9"} />
    </svg>
  )
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="22" height="16" rx="3" fill={active ? "#858585" : "#262A38"} />
      <rect x="3" y="10" width="22" height="3.5" fill={active ? "#5C5C5C" : "#A2A2A2"} />
      <rect x="6" y="16" width="7" height="2" rx="1" fill={active ? "#D8D8D8" : "#E2E8F0"} />
      <rect x="15" y="16" width="4" height="2" rx="1" fill={active ? "#D8D8D8" : "#E2E8F0"} />
      <circle cx="21" cy="9" r="1.5" fill={active ? "#D7D7D7" : "#E2E8F0"} />
    </svg>
  )
}

function KakaoIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" fill={active ? "#FEE500" : "#E2E8F0"} />
      <path
        d="M14 7.5C10.13 7.5 7 9.93 7 12.9c0 1.87 1.22 3.52 3.06 4.46l-.78 2.86c-.03.1.04.18.13.15l3.37-2.23c.38.05.78.08 1.22.08 3.87 0 7-2.43 7-5.42C21 9.93 17.87 7.5 14 7.5z"
        fill={active ? "#262626" : "#A2A2A2"}
      />
    </svg>
  )
}

function NaverIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="22" height="22" rx="6" fill={active ? "#03C75A" : "#262A38"} />
      <path
        d="M15.8 14.7L12 9H9v10h3.2v-5.7l3.8 5.7H19V9h-3.2v5.7z"
        fill="white"
      />
    </svg>
  )
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    method: "card",
    label: "payment.card",
    icon: <CardIcon active={false} />,
    accentColor: "#6D6D6D",
    accentBg: "#EFF6FF",
  },
  {
    method: "bank_transfer",
    label: "payment.bankTransferShort",
    sublabel: "payment.bankTransferSublabel",
    icon: <BankIcon active={false} />,
    accentColor: "#545454",
    accentBg: "#F1F5F9",
  },
  {
    method: "naver_pay",
    label: "payment.naverPay",
    icon: <NaverIcon active={false} />,
    accentColor: "#03C75A",
    accentBg: "#ECFDF5",
  },
  {
    method: "kakao_pay",
    label: "payment.kakaoPay",
    icon: <KakaoIcon active={false} />,
    accentColor: "#262626",
    accentBg: "#FFFDE7",
  },
]

function ActiveIcon({ method }: { method: PaymentMethod }) {
  switch (method) {
    case "bank_transfer": return <BankIcon active />
    case "card": return <CardIcon active />
    case "kakao_pay": return <KakaoIcon active />
    case "naver_pay": return <NaverIcon active />
  }
}

function InactiveIcon({ method }: { method: PaymentMethod }) {
  switch (method) {
    case "bank_transfer": return <BankIcon active={false} />
    case "card": return <CardIcon active={false} />
    case "kakao_pay": return <KakaoIcon active={false} />
    case "naver_pay": return <NaverIcon active={false} />
  }
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const isPgReviewParam = searchParams.get("pg_review") === "true"

  // PG 심사 모드 쿠키 확인 (심사 담당자 로그인 시 자동 설정)
  const [isPgReviewCookie] = useState(() =>
    typeof document !== "undefined" && document.cookie.includes('pg_review_mode=true')
  )

  const isPgReview = isPgReviewParam || isPgReviewCookie

  const configuredDisabledMethods = new Set<PaymentMethod>(
    PAYMENT_OPTIONS
      .filter((option) => {
        if (option.method === "kakao_pay" || option.method === "naver_pay") {
          return !isEasyPayChannelConfigured(option.method)
        }
        return false
      })
      .map((option) => option.method)
  )

  // PG 심사 모드: 모든 결제수단 활성화
  const disabledMethods = isPgReview ? new Set<PaymentMethod>() : configuredDisabledMethods

  return (
    <div className="space-y-3 max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_OPTIONS.map((option) => {
          const isDisabled = disabledMethods.has(option.method)
          const isSelected = !isDisabled && selectedMethod === option.method

          return (
            <motion.button
              key={option.method}
              type="button"
              onClick={() => !isDisabled && onMethodChange(option.method)}
              whileTap={isDisabled ? undefined : { scale: 0.95 }}
              whileHover={isDisabled ? undefined : { y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={[
                "relative flex flex-col items-center gap-2.5 p-5 rounded-[12px] border-2 transition-colors",
                isDisabled
                  ? "border-[#1E222E] bg-stone-50/50 cursor-not-allowed opacity-50"
                  : isSelected
                    ? "border-[#262A38] bg-[#12141D] shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer"
                    : "border-[#262A38] bg-[#151823] shadow-sm hover:border-[#343A4C] hover:bg-[#12141D] cursor-pointer",
              ].join(" ")}
              style={isSelected ? { backgroundColor: option.accentBg } : undefined}
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={isDisabled ? t('payment.selectPaymentLabelPreparing', { label: t(option.label) }) : t('payment.selectPaymentLabel', { label: t(option.label) })}
            >
              {/* 준비중 뱃지 */}
              {isDisabled && (
                <span className="absolute top-2 right-2 text-[9px] font-bold text-[#8B8578] bg-[#232838] px-1.5 py-0.5 rounded-full">
                  {t('payment.preparing')}
                </span>
              )}

              {/* 체크 마크 (활성 항목만) */}
              {!isDisabled && (
                <div
                  className={[
                    "absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-[#161925]"
                      : "border-2 border-[#343A4C] bg-[#12141D]",
                  ].join(" ")}
                >
                  {isSelected && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                    >
                      <path d="M3 6.5L5 8.5L9 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </div>
              )}

              {/* 아이콘 */}
              <div className="w-12 h-12 flex items-center justify-center">
                {isDisabled
                  ? <InactiveIcon method={option.method} />
                  : <ActiveIcon method={option.method} />
                }
              </div>

              {/* 라벨 */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={[
                    "text-[13px] lg:text-[15px] leading-tight",
                    isDisabled
                      ? "font-semibold text-[#5C564A]"
                      : isSelected
                        ? "font-extrabold text-[#E9E2D0]"
                        : "font-bold text-[#A69F8D]",
                  ].join(" ")}
                >
                  {t(option.label)}
                </span>
                {option.sublabel && (
                  <span className="text-[10px] lg:text-[12px] font-medium text-[#8B8578]">
                    {t(option.sublabel)}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* 안내 문구 */}
      {disabledMethods.size > 0 && (
        <p className="text-[11px] lg:text-[13px] text-[#8B8578] text-center leading-relaxed">
          {t('payment.cardAndEasyPaySoon')}
        </p>
      )}
    </div>
  )
}
