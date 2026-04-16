"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  CheckCircle,
  Copy,
  Check,
  Home,
  User,
  Package,
  Truck,
  Clock,
  Sparkles,
  Heart,
  AlertCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from 'next-intl'

import { Header } from "@/components/layout/Header"

// 계좌 정보
const BANK_INFO = {
  bank: "우리",
  account: "1005-204-549279",
  accountRaw: "1005204549279",
  holder: "(주)네안데르"
}

type VerifyStatus =
  | "idle"
  | "verifying"
  | "verified"
  | "failed"
  | "cancelled"
  | "not_required"

function OrderCompleteContent() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const paymentMethodParam = searchParams.get("paymentMethod") || "bank_transfer"
  const isBankTransfer = paymentMethodParam === "bank_transfer"

  // PG가 리다이렉트하며 자동으로 붙이는 쿼리 파라미터 (PortOne V2)
  const pgPaymentId = searchParams.get("paymentId")
  const pgCode = searchParams.get("code")
  const pgMessage = searchParams.get("message")
  const pgTxId = searchParams.get("txId")

  const [copied, setCopied] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle")
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [orderInfo, setOrderInfo] = useState<{
    orderNumber: string
    price: number
    size: string
    perfumeName: string
  } | null>(null)

  // 결제 검증 + 주문 정보 로드
  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    const run = async () => {
      // 1) PG가 전달한 에러/취소 먼저 판단
      if (pgCode) {
        if (pgCode === "USER_CANCEL" || pgCode === "PAY_PROCESS_CANCELED") {
          setVerifyStatus("cancelled")
          setVerifyError("결제가 취소되었습니다.")
          // 미결제 주문 정리 (fire-and-forget)
          fetch(`/api/orders/${orderId}/payment-failed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "사용자 결제 취소" }),
          }).catch(() => {})
          return
        }
        setVerifyStatus("failed")
        setVerifyError(pgMessage || `결제 실패 (${pgCode})`)
        fetch(`/api/orders/${orderId}/payment-failed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: `결제 실패: ${pgCode}` }),
        }).catch(() => {})
        return
      }

      // 2) 온라인 결제 — paymentId가 있으면 서버 검증 호출
      if (!isBankTransfer) {
        // 세션에 저장해둔 결제 컨텍스트 복원 (모바일 리디렉션 대응)
        let pendingPaymentId = pgPaymentId
        const pendingTxId = pgTxId
        try {
          const raw = sessionStorage.getItem(`portone:pending:${orderId}`)
          if (raw) {
            const ctx = JSON.parse(raw) as {
              paymentId?: string
            }
            if (!pendingPaymentId && ctx.paymentId) {
              pendingPaymentId = ctx.paymentId
            }
          }
        } catch {}

        if (!pendingPaymentId) {
          // 쿼리에도 세션에도 paymentId가 없으면 — PC 경로에서 이미
          // initiatePayment가 직접 verify를 호출한 상태일 수 있음.
          // 이 경우 주문 상태를 서버에서 그대로 읽어온다.
          setVerifyStatus("not_required")
        } else {
          setVerifyStatus("verifying")
          try {
            const res = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: pendingPaymentId,
                orderId,
                txId: pendingTxId || undefined,
              }),
            })
            if (cancelled) return
            if (!res.ok) {
              const result = await res.json().catch(() => ({}))
              setVerifyStatus("failed")
              setVerifyError(result.error || "결제 검증에 실패했습니다.")
              return
            }
            setVerifyStatus("verified")
            // 세션 컨텍스트 정리
            try {
              sessionStorage.removeItem(`portone:pending:${orderId}`)
            } catch {}
          } catch (e) {
            if (cancelled) return
            console.error("[OrderComplete] Verify request failed:", e)
            setVerifyStatus("failed")
            setVerifyError("결제 검증 중 오류가 발생했습니다.")
            return
          }
        }
      } else {
        setVerifyStatus("not_required")
      }

      // 3) 주문 표시 정보 로드
      const loadFromStorage = () => {
        const price = localStorage.getItem("lastOrderPrice")
        const perfumeName = localStorage.getItem("lastOrderPerfumeName")
        const size = localStorage.getItem("lastOrderSize")
        if (!price) return null
        return {
          orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
          price: parseInt(price, 10),
          size: size || "10ml",
          perfumeName: perfumeName || t('result.customPerfumeAlt'),
        }
      }

      const fromStorage = loadFromStorage()
      if (fromStorage) {
        setOrderInfo(fromStorage)
        localStorage.removeItem("lastOrderPrice")
        localStorage.removeItem("lastOrderPerfumeName")
        localStorage.removeItem("lastOrderSize")
        return
      }

      // localStorage가 비어있는 경우 (모바일 리다이렉트 이후 등) API 조회
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.success && data.order) {
          setOrderInfo({
            orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
            price: data.order.final_price,
            size: data.order.size || "10ml",
            perfumeName: data.order.perfume_name || t('result.customPerfumeAlt'),
          })
        }
      } catch (e) {
        console.error("[OrderComplete] Order fetch failed:", e)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isBankTransfer, pgCode, pgMessage, pgPaymentId, pgTxId])

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountRaw)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = BANK_INFO.accountRaw
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 검증 중/실패 상태 UI
  if (!isBankTransfer && verifyStatus === "verifying") {
    return (
      <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-white border-2 border-slate-900 rounded-3xl p-8 shadow-[4px_4px_0px_#000] flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#A5F3FC] border-2 border-slate-900 rounded-full flex items-center justify-center">
            <Loader2 size={28} className="text-slate-900 animate-spin" strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl text-slate-900 text-center">결제를 확인하고 있습니다</h2>
          <p className="text-sm text-slate-600 text-center font-medium leading-relaxed">
            잠시만 기다려 주세요.<br />페이지를 닫거나 새로고침하지 마세요.
          </p>
        </div>
      </div>
    )
  }

  if (!isBankTransfer && (verifyStatus === "failed" || verifyStatus === "cancelled")) {
    const isCancel = verifyStatus === "cancelled"
    return (
      <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm bg-white border-2 border-slate-900 rounded-3xl p-8 shadow-[4px_4px_0px_#000] flex flex-col items-center gap-4">
          <div className={`w-16 h-16 border-2 border-slate-900 rounded-full flex items-center justify-center ${
            isCancel ? "bg-slate-100" : "bg-red-100"
          }`}>
            <AlertCircle size={28} className={isCancel ? "text-slate-700" : "text-red-600"} strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl text-slate-900 text-center">
            {isCancel ? "결제가 취소되었습니다" : "결제에 실패했습니다"}
          </h2>
          <p className="text-sm text-slate-600 text-center font-medium leading-relaxed break-keep">
            {verifyError || "결제 처리 중 문제가 발생했습니다."}
          </p>
          <div className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={() => router.push("/checkout")}
              className="w-full h-12 bg-[#F472B6] text-white rounded-xl font-black border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              다시 결제하기
            </button>
            <Link href="/mypage" className="block">
              <button className="w-full h-12 bg-white text-slate-900 rounded-xl font-black border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                마이페이지로 이동
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#FFF8E7] font-sans">
      {/* 배경 패턴 */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#FDBA74_1px,transparent_1px),linear-gradient(to_bottom,#FDBA74_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <Header title={t('checkoutComplete.title')} showBack={false} />

      <main className="relative z-10 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* 성공 아이콘 */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 bg-[#FBCFE8] rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
              <CheckCircle size={48} className="text-slate-900" strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* 완료 메시지 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-black text-slate-900 mb-2 flex items-center justify-center gap-2">
              {isBankTransfer ? t('checkoutComplete.bankOrderComplete') : t('checkoutComplete.onlinePayComplete')}
              <Heart size={24} className="text-[#F472B6] fill-[#F472B6]" />
            </h1>
            <p className="text-slate-600 font-bold">
              {isBankTransfer
                ? t('checkoutComplete.bankSubtext')
                : t('checkoutComplete.onlineSubtext')}
            </p>
          </motion.div>

          {/* 주문 정보 카드 */}
          {orderInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border-2 border-slate-900 rounded-3xl p-6 mb-6 shadow-[4px_4px_0px_#000]"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#FEF9C3] border-2 border-slate-900 flex items-center justify-center">
                  <Package size={16} className="text-slate-900" />
                </div>
                <h3 className="font-black text-lg text-slate-900">{t('checkoutComplete.orderInfo')}</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">{t('checkoutComplete.orderNumber')}</span>
                  <span className="font-mono font-black text-slate-900">{orderInfo.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">{t('checkoutComplete.product')}</span>
                  <span className="font-bold text-slate-900">{orderInfo.perfumeName}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">{t('checkoutComplete.volume')}</span>
                  <span className="font-bold text-slate-900">{orderInfo.size}</span>
                </div>
                <div className="border-t-2 border-slate-900 pt-4 mt-4 flex justify-between items-center">
                  <span className="font-black text-slate-900">{t('checkoutComplete.paymentAmount')}</span>
                  <span className="font-black text-2xl text-[#F472B6]">
                    {orderInfo.price.toLocaleString()}{t('currency.suffix')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 입금 계좌 정보 (계좌이체일 때만 표시) */}
          {isBankTransfer ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#FEF9C3] border-2 border-slate-900 rounded-3xl p-6 mb-6 shadow-[4px_4px_0px_#000]"
            >
              <h3 className="font-black text-lg text-slate-900 mb-4 text-center flex items-center justify-center gap-2">
                <Sparkles size={18} className="text-[#F472B6]" />
                {t('checkoutComplete.depositAccount')}
              </h3>

              <div className="bg-white rounded-2xl p-5 space-y-4 border-2 border-slate-900">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-bold">{t('payment.bank')}</span>
                  <span className="font-black text-slate-900">{BANK_INFO.bank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-bold">{t('payment.accountNumber')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 font-mono text-lg">
                      {BANK_INFO.account}
                    </span>
                    <button
                      onClick={copyAccountNumber}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1 border-2 ${
                        copied
                          ? "bg-[#FBCFE8] border-slate-900 text-slate-900"
                          : "bg-white border-slate-900 hover:bg-[#FEF9C3] text-slate-900"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          {t('checkoutComplete.copiedButton')}
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          {t('checkoutComplete.copyButton')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-bold">{t('payment.accountHolder')}</span>
                  <span className="font-black text-slate-900">{BANK_INFO.holder}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl border-2 border-[#F472B6]">
                <p className="text-xs text-[#F472B6] text-center font-black">
                  {t('checkoutComplete.sameNameWarning')}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#A5F3FC] border-2 border-slate-900 rounded-3xl p-6 mb-6 shadow-[4px_4px_0px_#000]"
            >
              <h3 className="font-black text-lg text-slate-900 mb-3 text-center flex items-center justify-center gap-2">
                <CheckCircle size={18} className="text-slate-900" />
                {t('checkoutComplete.paymentComplete')}
              </h3>
              <p className="text-sm text-slate-700 font-bold text-center">
                {t('checkoutComplete.paymentCompleteDesc')}
              </p>
            </motion.div>
          )}

          {/* 배송 안내 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#E9D5FF] border-2 border-slate-900 rounded-3xl p-6 mb-8 shadow-[4px_4px_0px_#000]"
          >
            <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center">
                <Truck size={16} className="text-slate-900" />
              </div>
              {t('checkoutComplete.shippingGuide')}
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm bg-white/50 p-3 rounded-xl">
                <Clock size={18} className="text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-800 font-bold" dangerouslySetInnerHTML={{
                  __html: (isBankTransfer
                    ? t('checkoutComplete.bankShippingText')
                    : t('checkoutComplete.onlineShippingText')
                  ).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F472B6]">$1</strong>')
                }} />
              </div>
              <div className="flex items-start gap-3 text-sm bg-white/50 p-3 rounded-xl">
                <Package size={18} className="text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-800 font-bold" dangerouslySetInnerHTML={{
                  __html: t('checkoutComplete.checkMypage')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F472B6]">$1</strong>')
                }} />
              </div>
            </div>
          </motion.div>

          {/* 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <Link href="/mypage" className="block">
              <button className="w-full h-14 bg-[#F472B6] text-white rounded-2xl font-black text-lg border-2 border-slate-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2">
                <User size={20} />
                {t('checkoutComplete.goMypage')}
              </button>
            </Link>

            <Link href="/" className="block">
              <button className="w-full h-14 bg-white text-slate-900 rounded-2xl font-black text-lg border-2 border-slate-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2">
                <Home size={20} />
                {t('checkoutComplete.goHome')}
              </button>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default function OrderCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-[#F472B6] rounded-full animate-spin" />
        </div>
      }
    >
      <OrderCompleteContent />
    </Suspense>
  )
}
