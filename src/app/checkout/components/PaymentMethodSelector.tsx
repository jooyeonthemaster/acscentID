"use client"

import { motion } from "framer-motion"
import type { PaymentMethod } from "@/types/cart"

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
      <rect x="4" y="20" width="20" height="2.5" rx="1" fill={active ? "#334155" : "#CBD5E1"} />
      <rect x="6" y="12" width="2.5" height="8" rx="1" fill={active ? "#475569" : "#CBD5E1"} />
      <rect x="12.75" y="12" width="2.5" height="8" rx="1" fill={active ? "#475569" : "#CBD5E1"} />
      <rect x="19.5" y="12" width="2.5" height="8" rx="1" fill={active ? "#475569" : "#CBD5E1"} />
      <path d="M14 4L3 11H25L14 4Z" fill={active ? "#334155" : "#CBD5E1"} />
      <circle cx="14" cy="8.5" r="1.5" fill={active ? "#F8FAFC" : "#F1F5F9"} />
    </svg>
  )
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="22" height="16" rx="3" fill={active ? "#3B82F6" : "#CBD5E1"} />
      <rect x="3" y="10" width="22" height="3.5" fill={active ? "#1D4ED8" : "#94A3B8"} />
      <rect x="6" y="16" width="7" height="2" rx="1" fill={active ? "#BFDBFE" : "#E2E8F0"} />
      <rect x="15" y="16" width="4" height="2" rx="1" fill={active ? "#BFDBFE" : "#E2E8F0"} />
      <circle cx="21" cy="9" r="1.5" fill={active ? "#FCD34D" : "#E2E8F0"} />
    </svg>
  )
}

function KakaoIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" fill={active ? "#FEE500" : "#E2E8F0"} />
      <path
        d="M14 7.5C10.13 7.5 7 9.93 7 12.9c0 1.87 1.22 3.52 3.06 4.46l-.78 2.86c-.03.1.04.18.13.15l3.37-2.23c.38.05.78.08 1.22.08 3.87 0 7-2.43 7-5.42C21 9.93 17.87 7.5 14 7.5z"
        fill={active ? "#3C1E1E" : "#94A3B8"}
      />
    </svg>
  )
}

function NaverIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="22" height="22" rx="6" fill={active ? "#03C75A" : "#CBD5E1"} />
      <path
        d="M15.8 14.7L12 9H9v10h3.2v-5.7l3.8 5.7H19V9h-3.2v5.7z"
        fill="white"
      />
    </svg>
  )
}

// 3월 1일 이후 자동 활성화
const DISABLED_METHODS: Set<PaymentMethod> = new Set(["card", "kakao_pay", "naver_pay"])

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    method: "bank_transfer",
    label: "계좌이체",
    sublabel: "무통장입금",
    icon: <BankIcon active={false} />,
    accentColor: "#475569",
    accentBg: "#F1F5F9",
  },
  {
    method: "card",
    label: "신용/체크카드",
    icon: <CardIcon active={false} />,
    accentColor: "#2563EB",
    accentBg: "#EFF6FF",
  },
  {
    method: "kakao_pay",
    label: "카카오페이",
    icon: <KakaoIcon active={false} />,
    accentColor: "#3C1E1E",
    accentBg: "#FFFDE7",
  },
  {
    method: "naver_pay",
    label: "네이버페이",
    icon: <NaverIcon active={false} />,
    accentColor: "#03C75A",
    accentBg: "#ECFDF5",
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
  return (
    <div className="space-y-3 max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_OPTIONS.map((option) => {
          const isDisabled = DISABLED_METHODS.has(option.method)
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
                "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-colors",
                isDisabled
                  ? "border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-50"
                  : isSelected
                    ? "border-slate-800 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer"
                    : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer",
              ].join(" ")}
              style={isSelected ? { backgroundColor: option.accentBg } : undefined}
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={`결제 수단 선택: ${option.label}${isDisabled ? " (준비중)" : ""}`}
            >
              {/* 준비중 뱃지 */}
              {isDisabled && (
                <span className="absolute top-2 right-2 text-[9px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                  준비중
                </span>
              )}

              {/* 체크 마크 (활성 항목만) */}
              {!isDisabled && (
                <div
                  className={[
                    "absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-slate-800"
                      : "border-2 border-slate-200 bg-white",
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
                {isSelected
                  ? <ActiveIcon method={option.method} />
                  : <InactiveIcon method={option.method} />
                }
              </div>

              {/* 라벨 */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={[
                    "text-[13px] leading-tight",
                    isDisabled
                      ? "font-semibold text-slate-300"
                      : isSelected
                        ? "font-extrabold text-slate-900"
                        : "font-semibold text-slate-400",
                  ].join(" ")}
                >
                  {option.label}
                </span>
                {option.sublabel && (
                  <span
                    className={[
                      "text-[10px] font-medium",
                      isSelected ? "text-slate-500" : "text-slate-300",
                    ].join(" ")}
                  >
                    {option.sublabel}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* 안내 문구 */}
      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        카드 및 간편결제는 <span className="font-bold text-slate-500">3월 1일</span>부터 이용 가능합니다
      </p>
    </div>
  )
}
