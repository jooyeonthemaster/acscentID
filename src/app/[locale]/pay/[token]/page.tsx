"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { CreditCard, ShieldCheck, Loader2, AlertCircle, Wallet } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { Header } from "@/components/layout/Header"
import { usePortonePayment } from "../../checkout/hooks/usePortonePayment"
import { detectInAppBrowser } from "@/lib/mobile/inAppBrowser"
import { formatPrice, type PaymentMethod } from "@/types/cart"
import type { PublicPaymentLink } from "@/lib/payment-links/payment-links"

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "신용/체크카드" },
  { value: "kakao_pay", label: "카카오페이" },
  { value: "naver_pay", label: "네이버페이" },
  { value: "bank_transfer", label: "무통장입금" },
]

const BANK_INFO = {
  bank: "우리",
  account: "1005-204-549279",
  holder: "(주)네안데르",
}

export default function PaymentLinkPage() {
  const router = useRouter()
  const params = useParams<{ token: string; locale: string }>()
  const token = params?.token
  const { user, unifiedUser, loading: authLoading } = useAuth()
  const userId = user?.id || unifiedUser?.id
  const userEmail = user?.email || unifiedUser?.email || undefined
  const { initiatePayment } = usePortonePayment()

  const [link, setLink] = useState<PublicPaymentLink | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [loadError, setLoadError] = useState("")

  const [buyerName, setBuyerName] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [memo, setMemo] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const [guestSessionCreated, setGuestSessionCreated] = useState(false)
  const inApp = useMemo(() => detectInAppBrowser(), [])

  // 링크 조회
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoadState("loading")
    fetch(`/api/payment-links/${token}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || "결제창을 불러오지 못했습니다")
        return json.link as PublicPaymentLink
      })
      .then((data) => {
        if (cancelled) return
        setLink(data)
        setLoadState("ready")
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : "결제창을 불러오지 못했습니다")
        setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // 비회원 게스트 세션 생성 (결제 준비/검증 소유권 검사를 위해 user_id 필요)
  useEffect(() => {
    if (authLoading || userId || guestSessionCreated) return
    let cancelled = false
    fetch("/api/auth/guest-login", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("guest_login_failed")
        if (!cancelled) setGuestSessionCreated(true)
      })
      .catch((error) => {
        console.error("[Pay] guest session creation failed:", error)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, userId, guestSessionCreated])

  useEffect(() => {
    if (unifiedUser?.name && !buyerName) setBuyerName(unifiedUser.name)
    if (userEmail && !buyerEmail) setBuyerEmail(userEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unifiedUser?.name, userEmail])

  const handleSubmit = useCallback(async () => {
    if (!link || submitting) return
    setSubmitError("")

    if (!buyerName.trim() || !buyerPhone.trim()) {
      setSubmitError("결제자 이름과 연락처를 입력해주세요.")
      return
    }
    if (!agreed) {
      setSubmitError("결제 진행에 동의해주세요.")
      return
    }
    if (paymentMethod !== "bank_transfer" && inApp.isInApp) {
      setSubmitError(`${inApp.displayName}에서는 결제가 제한됩니다. Safari 또는 Chrome으로 다시 시도해주세요.`)
      return
    }

    setSubmitting(true)
    try {
      // 세션 보장 (비회원)
      if (!userId && !guestSessionCreated) {
        const guestRes = await fetch("/api/auth/guest-login", { method: "POST" })
        if (!guestRes.ok) throw new Error("결제 세션 생성에 실패했습니다. 새로고침 후 다시 시도해주세요.")
        setGuestSessionCreated(true)
      }

      // 주문 생성
      const orderRes = await fetch(`/api/payment-links/${token}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          buyerEmail: buyerEmail.trim(),
          memo: memo.trim(),
          paymentMethod,
        }),
      })
      const orderJson = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok || !orderJson.orderId) {
        throw new Error(orderJson.error || "주문 생성에 실패했습니다.")
      }

      const orderId: string = orderJson.orderId
      const amount: number = orderJson.amount ?? link.amount
      const isZeroAmount = amount <= 0

      // 무통장입금 / 0원 → 완료 페이지로 이동
      if (paymentMethod === "bank_transfer" || isZeroAmount) {
        router.push(`/checkout/complete?orderId=${orderId}&paymentMethod=${paymentMethod}`)
        return
      }

      // 모바일 리디렉션 복원용 요약 저장
      try {
        localStorage.setItem("lastOrderPrice", amount.toString())
        localStorage.setItem("lastOrderPerfumeName", link.title)
        localStorage.setItem("lastOrderSize", "개인결제")
      } catch {}

      const paymentResult = await initiatePayment({
        orderId,
        orderName: link.title,
        totalAmount: amount,
        paymentMethod,
        customerName: buyerName.trim(),
        customerPhone: buyerPhone.trim(),
        customerEmail: buyerEmail.trim() || userEmail,
      })

      if (paymentResult.redirecting) return

      if (!paymentResult.success) {
        // 결제 미완료 주문 정리
        try {
          await fetch(`/api/orders/${orderId}/payment-failed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: paymentResult.cancelled ? "사용자 결제 취소" : "결제 실패" }),
          })
        } catch {}
        if (paymentResult.cancelled) {
          setSubmitting(false)
          return
        }
        throw new Error(paymentResult.error || "결제에 실패했습니다.")
      }

      router.push(`/checkout/complete?orderId=${orderId}&paymentMethod=${paymentMethod}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.")
      setSubmitting(false)
    }
  }, [
    link,
    submitting,
    buyerName,
    buyerPhone,
    buyerEmail,
    memo,
    agreed,
    paymentMethod,
    inApp,
    userId,
    guestSessionCreated,
    token,
    userEmail,
    initiatePayment,
    router,
  ])

  return (
    <div className="min-h-screen bg-[#FFF8E7]">
      <Header />
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        {loadState === "loading" && (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#F472B6]" />
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="mt-4 text-lg font-black text-slate-900">결제할 수 없는 링크입니다</h1>
            <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          </div>
        )}

        {loadState === "ready" && link && (
          <div className="space-y-5">
            {/* 결제 항목 카드 */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {link.imageUrl && (
                <div className="relative h-48 w-full bg-slate-100">
                  <Image src={link.imageUrl} alt={link.title} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
                </div>
              )}
              <div className="p-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F472B6]/10 px-3 py-1 text-xs font-bold text-[#DB2777]">
                  <CreditCard className="h-3.5 w-3.5" />
                  개인결제창
                </span>
                <h1 className="mt-3 text-xl font-black text-slate-900">{link.title}</h1>
                {link.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{link.description}</p>
                )}
                <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-5">
                  <span className="text-sm font-bold text-slate-500">결제 금액</span>
                  <span className="text-2xl font-black text-slate-900">₩{formatPrice(link.amount)}</span>
                </div>
              </div>
            </section>

            {/* 결제자 정보 */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">결제자 정보</h2>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">이름</span>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="결제자 이름"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">연락처</span>
                <input
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  inputMode="tel"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">이메일 (선택 · 영수증)</span>
                <input
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="email@example.com"
                  inputMode="email"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">요청사항 (선택)</span>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>
            </section>

            {/* 결제수단 */}
            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">결제 수단</h2>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${
                      paymentMethod === method.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "bank_transfer" && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Wallet className="h-4 w-4" /> 입금 계좌
                  </div>
                  <p className="mt-2 text-slate-600">
                    {BANK_INFO.bank}은행 <span className="font-mono font-black text-slate-900">{BANK_INFO.account}</span>
                  </p>
                  <p className="text-slate-600">예금주 {BANK_INFO.holder}</p>
                  <p className="mt-2 text-xs text-slate-400">입금 확인 후 처리됩니다.</p>
                </div>
              )}
            </section>

            {/* 동의 + 결제 버튼 */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="flex items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#F472B6]"
                />
                <span>결제 진행 및 개인정보 수집·이용에 동의합니다.</span>
              </label>

              {submitError && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-500">
                  <AlertCircle className="h-4 w-4" /> {submitError}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />₩{formatPrice(link.amount)} 결제하기
                  </>
                )}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
