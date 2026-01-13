"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Package,
  Truck,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Building2,
  AlertCircle
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { OrderSummary } from "./components/OrderSummary"
import { CheckoutForm, CheckoutFormData } from "./components/CheckoutForm"
import { CouponSelector } from "./components/CouponSelector"
import { CheckoutCoupon } from "@/types/coupon"

interface AnalysisResult {
  matchingPerfumes?: Array<{
    perfumeId?: string
    persona?: {
      name?: string
      recommendation?: string
    }
  }>
  matchingKeywords?: string[]
}

// 계좌 정보
const BANK_INFO = {
  bank: "카카오뱅크",
  account: "3333 09 3215346",
  accountRaw: "3333093215346",
  holder: "김주연"
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, unifiedUser, loading: authLoading } = useAuth()
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [idolName, setIdolName] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<"10ml" | "50ml">("10ml")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutCoupon | null>(null)

  // 폼 데이터 상태 (상위 컴포넌트에서 관리)
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: "",
    phone1: "010",
    phone2: "",
    phone3: "",
    zipCode: "",
    address: "",
    addressDetail: "",
    memo: "",
  })

  const userId = user?.id || unifiedUser?.id
  const userName = unifiedUser?.name || user?.user_metadata?.full_name || ""

  // 로그인 확인 및 분석 결과 로드
  useEffect(() => {
    if (!authLoading && !userId) {
      router.push("/")
      return
    }

    // 사용자 이름 초기화
    if (userName && !formData.name) {
      setFormData(prev => ({ ...prev, name: userName }))
    }

    const savedResult = localStorage.getItem("analysisResult")
    const savedImage = localStorage.getItem("userImage")
    const savedUserInfo = localStorage.getItem("userInfo")

    if (savedResult) {
      try {
        setAnalysisResult(JSON.parse(savedResult))
      } catch (e) {
        console.error("Failed to parse analysis result:", e)
      }
    }

    if (savedImage) {
      setUserImage(savedImage)
    }

    if (savedUserInfo) {
      try {
        const userInfo = JSON.parse(savedUserInfo)
        setIdolName(userInfo.name || null)
      } catch (e) {
        console.error("Failed to parse user info:", e)
      }
    }
  }, [authLoading, userId, router, userName])

  const perfumeName = analysisResult?.matchingPerfumes?.[0]?.persona?.name || "맞춤 향수"
  // idolName: 입력 폼에서 입력한 최애 이름을 표시
  const displayIdolName = idolName || "AC'SCENT"

  const prices = {
    "10ml": 24000,
    "50ml": 48000,
  }

  // 배송비: 10ml는 3000원, 50ml는 무료
  const shippingFee = selectedSize === "10ml" ? 3000 : 0

  // 쿠폰 할인 계산
  const productPrice = prices[selectedSize]
  const discountAmount = selectedCoupon
    ? Math.floor(productPrice * (selectedCoupon.discount_percent / 100))
    : 0
  const totalPrice = productPrice + shippingFee - discountAmount

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountRaw)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // 폴백: execCommand 사용
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

  // 폼 유효성 검사
  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.phone1.length >= 2 &&
      formData.phone2.length === 4 &&
      formData.phone3.length === 4 &&
      formData.zipCode !== "" &&
      formData.address !== "" &&
      privacyAgreed
    )
  }

  const handleSubmitOrder = async () => {
    if (!isFormValid()) {
      alert("모든 필수 항목을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const orderData = {
        userId,
        perfumeName,
        perfumeBrand: displayIdolName,
        size: selectedSize,
        price: productPrice,
        shippingFee,
        totalPrice,
        // 쿠폰 정보
        userCouponId: selectedCoupon?.userCouponId || null,
        discountAmount,
        originalPrice: productPrice + shippingFee,
        finalPrice: totalPrice,
        // 배송 정보
        recipientName: formData.name,
        phone: `${formData.phone1}-${formData.phone2}-${formData.phone3}`,
        zipCode: formData.zipCode,
        address: formData.address,
        addressDetail: formData.addressDetail,
        memo: formData.memo,
        userImage,
        keywords: analysisResult?.matchingKeywords || [],
        analysisData: analysisResult, // 전체 분석 데이터 (레시피 표시용)
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("주문 생성 에러:", result)
        throw new Error(result.error || "주문 생성 실패")
      }

      // 주문 완료 페이지로 이동
      router.push(`/checkout/complete?orderId=${result.orderId}`)
    } catch (error) {
      console.error("Order submission error:", error)
      alert("주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-[#F472B6] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#FFF8E7] font-sans">
      {/* 배경 데코레이션 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-200/10 rounded-full blur-3xl" />
      </div>

      <Header title="주문하기" showBack={true} backHref="/result" />

      <main className="relative z-10 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* 페이지 타이틀 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2 rounded-full border-2 border-slate-900 shadow-[3px_3px_0px_#FBCFE8] mb-4">
              <Sparkles size={16} className="text-[#F472B6]" />
              <span className="font-bold text-sm tracking-wide">ORDER YOUR SIGNATURE SCENT</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* 왼쪽: 주문 요약 */}
            <div className="space-y-6">
              <OrderSummary
                perfumeName={perfumeName}
                perfumeBrand={displayIdolName}
                userImage={userImage}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                price={prices[selectedSize]}
                keywords={analysisResult?.matchingKeywords || []}
              />
            </div>

            {/* 오른쪽: 배송 정보 */}
            <div className="space-y-6">
              <CheckoutForm formData={formData} setFormData={setFormData} />
            </div>
          </motion.div>

          {/* 쿠폰 선택 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000] mt-6"
          >
            <CouponSelector
              selectedCoupon={selectedCoupon}
              onSelectCoupon={setSelectedCoupon}
              productPrice={productPrice}
            />
          </motion.div>

          {/* 결제 정보 - 전체 너비 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000] mt-6"
          >
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#A5F3FC] border-2 border-slate-900 flex items-center justify-center">
                <CreditCard size={20} className="text-slate-900" />
              </div>
              <h3 className="font-black text-xl text-slate-900">결제 정보</h3>
            </div>

            {/* 결제 내용 - 2컬럼 레이아웃 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽: 계좌 정보 */}
              <div className="space-y-4">
                {/* 결제 방법 안내 */}
                <div className="bg-[#FEF9C3] border-2 border-slate-900 rounded-xl p-4">
                  <p className="text-sm text-slate-900 font-bold flex items-center gap-2">
                    <Building2 size={16} />
                    현재 계좌이체 결제만 가능합니다
                  </p>
                </div>

                {/* 계좌 정보 카드 */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-bold">은행</span>
                      <span className="font-black text-slate-900">{BANK_INFO.bank}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-bold">계좌번호</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 font-mono">{BANK_INFO.account}</span>
                        <button
                          onClick={copyAccountNumber}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            copied
                              ? "bg-[#A5F3FC] border-slate-900 text-slate-900"
                              : "bg-white border-slate-300 hover:border-slate-900 text-slate-600"
                          }`}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-bold">예금주</span>
                      <span className="font-black text-slate-900">{BANK_INFO.holder}</span>
                    </div>
                  </div>
                </div>

                {/* 안내 문구 */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-900 bg-[#FBCFE8] border-2 border-slate-900 p-3 rounded-xl">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span className="font-bold">주문자와 입금자의 이름이 반드시 동일해야 합니다.</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold flex items-center gap-2 px-1">
                    <Truck size={14} />
                    입금 확인 후 2~3일 내 배송됩니다.
                  </p>
                </div>
              </div>

              {/* 오른쪽: 결제 금액 */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
                <p className="text-sm font-black text-slate-900 mb-4">결제 금액</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">상품 금액</span>
                    <span className="font-black text-slate-900">{productPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">배송비</span>
                    <span className={`font-black ${shippingFee === 0 ? "text-[#F472B6]" : "text-slate-900"}`}>
                      {shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">쿠폰 할인</span>
                      <span className="font-black text-[#F472B6]">
                        -{discountAmount.toLocaleString()}원
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-4 mt-4 flex justify-between items-center">
                    <span className="font-black text-slate-900 text-lg">총 결제 금액</span>
                    <div className="text-right">
                      {discountAmount > 0 && (
                        <span className="text-sm text-slate-400 line-through mr-2">
                          {(productPrice + shippingFee).toLocaleString()}원
                        </span>
                      )}
                      <span className="font-black text-2xl text-slate-900">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 개인정보 동의 + 결제 버튼 */}
          <div className="mt-6 space-y-6">
            {/* 개인정보 동의 */}
            <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[4px_4px_0px_#000]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={privacyAgreed}
                      onChange={(e) => setPrivacyAgreed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                      privacyAgreed
                        ? "bg-[#F472B6] border-slate-900"
                        : "bg-white border-slate-300 group-hover:border-slate-900"
                    }`}>
                      {privacyAgreed && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-slate-900">
                      개인정보 수집 및 이용 동의 <span className="text-[#F472B6]">*</span>
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      주문 처리 및 배송을 위해 이름, 연락처, 주소 정보를 수집합니다.
                      수집된 정보는 배송 완료 후 3개월간 보관 후 파기됩니다.
                    </p>
                  </div>
                </label>
            </div>

            {/* 결제 버튼 */}
            <div>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !isFormValid()}
                className="group relative w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-slate-900 rounded-2xl translate-x-1 translate-y-1 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 group-disabled:translate-x-1 group-disabled:translate-y-1" />
                <div className="relative w-full h-14 bg-[#F472B6] text-white rounded-2xl border-2 border-slate-900 font-black text-lg flex items-center justify-center gap-2 transition-transform group-hover:-translate-y-0.5 group-disabled:hover:translate-y-0">
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>주문 접수 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>{totalPrice.toLocaleString()}원 주문하기</span>
                    </>
                  )}
                </div>
              </button>
              {!isFormValid() && (
                <p className="text-xs text-slate-500 text-center mt-3 font-bold">
                  모든 필수 항목을 입력하고 개인정보 동의에 체크해주세요
                </p>
              )}
            </div>

            {/* 안내 문구 */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <ShieldCheck size={14} />
                안전한 결제
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Truck size={14} />
                빠른 배송
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Package size={14} />
                2~3일 내 도착
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
