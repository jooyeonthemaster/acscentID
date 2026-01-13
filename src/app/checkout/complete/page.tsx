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

import { Header } from "@/components/layout/Header"

// 계좌 정보
const BANK_INFO = {
  bank: "카카오뱅크",
  account: "3333 09 3215346",
  accountRaw: "3333093215346",
  holder: "김주연"
}

function OrderCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [copied, setCopied] = useState(false)
  const [orderInfo, setOrderInfo] = useState<{
    orderNumber: string
    price: number
    size: string
    perfumeName: string
  } | null>(null)

  useEffect(() => {
    // 주문 정보 로드 (localStorage에서 임시로 가져오거나 API 호출)
    const loadOrderInfo = async () => {
      if (orderId) {
        try {
          // localStorage에서 최근 분석 결과 가져오기
          const savedResult = localStorage.getItem("analysisResult")
          const price = localStorage.getItem("lastOrderPrice") || "24000"

          if (savedResult) {
            const result = JSON.parse(savedResult)
            setOrderInfo({
              orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
              price: parseInt(price),
              size: "10ml",
              perfumeName: result?.matchingPerfumes?.[0]?.persona?.name || "맞춤 향수"
            })
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

      <Header title="주문 완료" showBack={false} />

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
              주문이 접수되었습니다!
              <Heart size={24} className="text-[#F472B6] fill-[#F472B6]" />
            </h1>
            <p className="text-slate-600 font-bold">
              아래 계좌로 입금해주시면 주문이 완료됩니다.
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
                <h3 className="font-black text-lg text-slate-900">주문 정보</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">주문번호</span>
                  <span className="font-mono font-black text-slate-900">{orderInfo.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">상품</span>
                  <span className="font-bold text-slate-900">{orderInfo.perfumeName}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold">용량</span>
                  <span className="font-bold text-slate-900">{orderInfo.size}</span>
                </div>
                <div className="border-t-2 border-slate-900 pt-4 mt-4 flex justify-between items-center">
                  <span className="font-black text-slate-900">결제 금액</span>
                  <span className="font-black text-2xl text-[#F472B6]">
                    {orderInfo.price.toLocaleString()}원
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 입금 계좌 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#FEF9C3] border-2 border-slate-900 rounded-3xl p-6 mb-6 shadow-[4px_4px_0px_#000]"
          >
            <h3 className="font-black text-lg text-slate-900 mb-4 text-center flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-[#F472B6]" />
              입금 계좌
            </h3>

            <div className="bg-white rounded-2xl p-5 space-y-4 border-2 border-slate-900">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-bold">은행</span>
                <span className="font-black text-slate-900">{BANK_INFO.bank}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-bold">계좌번호</span>
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
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        복사
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-bold">예금주</span>
                <span className="font-black text-slate-900">{BANK_INFO.holder}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-xl border-2 border-[#F472B6]">
              <p className="text-xs text-[#F472B6] text-center font-black">
                ⚠️ 반드시 주문자와 동일한 이름으로 입금해주세요!
              </p>
            </div>
          </motion.div>

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
              배송 안내
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm bg-white/50 p-3 rounded-xl">
                <Clock size={18} className="text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-800 font-bold">
                  입금 확인 후 <strong className="text-[#F472B6]">2~3일 내</strong> 배송됩니다.
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm bg-white/50 p-3 rounded-xl">
                <Package size={18} className="text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-800 font-bold">
                  배송 상태는 <strong className="text-[#F472B6]">마이페이지</strong>에서 확인하실 수 있습니다.
                </span>
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
                마이페이지에서 확인
              </button>
            </Link>

            <Link href="/" className="block">
              <button className="w-full h-14 bg-white text-slate-900 rounded-2xl font-black text-lg border-2 border-slate-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2">
                <Home size={20} />
                홈으로 돌아가기
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
