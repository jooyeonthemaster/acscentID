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
  Heart
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

function OrderCompleteContent() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const paymentMethodParam = searchParams.get("paymentMethod") || "bank_transfer"
  const isBankTransfer = paymentMethodParam === "bank_transfer"
  const [copied, setCopied] = useState(false)
  const [orderInfo, setOrderInfo] = useState<{
    orderNumber: string
    price: number
    size: string
    perfumeName: string
  } | null>(null)

  useEffect(() => {
    // 주문 정보 로드 (localStorage에서 가져오기)
    const loadOrderInfo = async () => {
      if (orderId) {
        try {
          // checkout 페이지에서 저장한 주문 정보 가져오기
          const price = localStorage.getItem("lastOrderPrice")
          const perfumeName = localStorage.getItem("lastOrderPerfumeName")
          const size = localStorage.getItem("lastOrderSize")

          console.log("[OrderComplete] localStorage values:", { price, perfumeName, size })

          if (price) {
            setOrderInfo({
              orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
              price: parseInt(price),
              size: size || "10ml",
              perfumeName: perfumeName || t('result.customPerfumeAlt')
            })

            // 사용 후 정리
            localStorage.removeItem("lastOrderPrice")
            localStorage.removeItem("lastOrderPerfumeName")
            localStorage.removeItem("lastOrderSize")
          } else {
            // fallback: API로 주문 정보 조회
            console.log("[OrderComplete] localStorage empty, fetching from API...")
            try {
              const response = await fetch(`/api/orders/${orderId}`)
              const data = await response.json()

              if (data.success && data.order) {
                console.log("[OrderComplete] API response:", data.order)
                setOrderInfo({
                  orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
                  price: data.order.final_price,
                  size: data.order.size,
                  perfumeName: data.order.perfume_name || t('result.customPerfumeAlt')
                })
              } else {
                // API 실패 시 최종 fallback
                const savedResult = localStorage.getItem("analysisResult")
                if (savedResult) {
                  const result = JSON.parse(savedResult)
                  setOrderInfo({
                    orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
                    price: 24000,
                    size: "10ml",
                    perfumeName: result?.matchingPerfumes?.[0]?.persona?.name || t('result.customPerfumeAlt')
                  })
                }
              }
            } catch (apiError) {
              console.error("[OrderComplete] API fetch failed:", apiError)
              // 최종 fallback: 기본값 사용
              const savedResult = localStorage.getItem("analysisResult")
              if (savedResult) {
                const result = JSON.parse(savedResult)
                setOrderInfo({
                  orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
                  price: 24000,
                  size: "10ml",
                  perfumeName: result?.matchingPerfumes?.[0]?.persona?.name || t('result.customPerfumeAlt')
                })
              }
            }
          }
        } catch (e) {
          console.error("Failed to load order info:", e)
        }
      }
    }

    loadOrderInfo()
  }, [orderId])

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountRaw)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
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
