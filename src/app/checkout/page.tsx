"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { OrderSummary } from "./components/OrderSummary"
import { MultiItemOrderSummary } from "./components/MultiItemOrderSummary"
import { CheckoutForm, CheckoutFormData } from "./components/CheckoutForm"
import { CouponSelector } from "./components/CouponSelector"
import { CheckoutCoupon } from "@/types/coupon"
import type { CartItem, ProductType } from "@/types/cart"
import { PRODUCT_PRICING, formatPrice, calculateCartTotals, FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "@/types/cart"

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

// 로딩 컴포넌트
function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-900 border-t-[#F472B6] rounded-full animate-spin" />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, unifiedUser, loading: authLoading } = useAuth()

  // URL 파라미터에서 시그니처 상품 확인
  const urlProduct = searchParams.get("product")
  const urlType = searchParams.get("type")
  const isSignatureProduct = urlProduct === "le-quack" && urlType === "signature"

  // 다중 상품 모드
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [isMultiItemMode, setIsMultiItemMode] = useState(false)

  // 단일 상품 모드 (기존 호환)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [idolName, setIdolName] = useState<string | null>(null)
  const [productType, setProductType] = useState<ProductType>("image_analysis")
  const [selectedSize, setSelectedSize] = useState<"10ml" | "50ml" | "set">("10ml")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutCoupon | null>(null)

  // 폼 데이터 상태
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

  // 로그인 확인 및 데이터 로드
  useEffect(() => {
    // 비회원 구매 허용 (시그니처 상품)
    const isGuestCheckout = searchParams.get("guest") === "true"
    if (!authLoading && !userId && !isGuestCheckout) {
      router.push("/")
      return
    }

    // 사용자 이름 초기화
    if (userName && !formData.name) {
      setFormData(prev => ({ ...prev, name: userName }))
    }

    // 0. 시그니처 상품 (LE QUACK) - URL 파라미터로 처리
    if (isSignatureProduct) {
      setProductType("signature")
      setSelectedSize("10ml")
      setUserImage("/images/perfume/LE QUACK.avif")
      setIdolName("AC'SCENT")
      // 시그니처 상품은 분석 결과가 없으므로 빈 객체 설정
      setAnalysisResult({
        matchingPerfumes: [{
          perfumeId: "le-quack",
          persona: {
            name: "SIGNATURE 뿌덕퍼퓸",
            recommendation: "AC'SCENT 시그니처 퍼퓸"
          }
        }],
        matchingKeywords: ["시그니처", "퍼퓸키링", "AC'SCENT"]
      })
      return
    }

    // 1. 다중 상품 모드 확인 (장바구니에서 온 경우)
    const savedCheckoutItems = localStorage.getItem("checkoutItems")
    if (savedCheckoutItems) {
      try {
        const items = JSON.parse(savedCheckoutItems)
        if (Array.isArray(items) && items.length > 0) {
          setCheckoutItems(items)
          setIsMultiItemMode(true)
          // 사용 후 삭제
          localStorage.removeItem("checkoutItems")
          return
        }
      } catch (e) {
        console.error("Failed to parse checkout items:", e)
      }
    }

    // 2. 단일 상품 모드 (기존 방식)
    const savedResult = localStorage.getItem("analysisResult")
    const savedImage = localStorage.getItem("userImage")
    const savedUserInfo = localStorage.getItem("userInfo")
    const savedProductType = localStorage.getItem("checkoutProductType")

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

    // 상품 타입 설정 (피규어 디퓨저 vs 향수 vs 졸업)
    if (savedProductType) {
      const pType = savedProductType as ProductType
      setProductType(pType)
      // 피규어 디퓨저면 자동으로 세트 선택
      if (pType === "figure_diffuser") {
        setSelectedSize("set")
      }
      // 졸업 퍼퓸은 10ml 단일 옵션
      if (pType === "graduation") {
        setSelectedSize("10ml")
      }
      localStorage.removeItem("checkoutProductType")
    }
  }, [authLoading, userId, router, userName, isSignatureProduct, searchParams])

  // 단일 상품 정보
  const perfumeName = analysisResult?.matchingPerfumes?.[0]?.persona?.name || "맞춤 퍼퓸"
  const displayIdolName = idolName || "AC'SCENT"

  // 다중 상품: 수량 변경
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCheckoutItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, Math.min(10, item.quantity + delta))
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  // 다중 상품: 사이즈 변경
  const handleUpdateSize = (itemId: string, newSize: string) => {
    setCheckoutItems(prev => prev.map(item => {
      if (item.id === itemId && item.product_type !== 'figure_diffuser') {
        const pricing = PRODUCT_PRICING[item.product_type]
        const newPrice = pricing.find(p => p.size === newSize)?.price || item.price
        return { ...item, size: newSize as CartItem['size'], price: newPrice }
      }
      return item
    }))
  }

  // 다중 상품: 아이템 삭제
  const handleRemoveItem = (itemId: string) => {
    setCheckoutItems(prev => {
      const updated = prev.filter(item => item.id !== itemId)
      if (updated.length === 0) {
        router.push("/mypage")
      }
      return updated
    })
  }

  // 가격 계산 - PRODUCT_PRICING에서 가져오기
  const getPriceForSize = (pType: ProductType, size: string): number => {
    const pricing = PRODUCT_PRICING[pType]
    const option = pricing.find(p => p.size === size)
    return option?.price || pricing[0].price
  }

  // 다중 상품 모드
  const multiTotals = isMultiItemMode ? calculateCartTotals(checkoutItems, selectedCoupon?.discount_percent) : null

  // 단일 상품 모드
  const singleProductPrice = getPriceForSize(productType, selectedSize)
  // 5만원 이상 무료배송
  const singleShippingFee = singleProductPrice >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE
  const singleDiscountAmount = selectedCoupon
    ? Math.floor(singleProductPrice * (selectedCoupon.discount_percent / 100))
    : 0
  const singleTotalPrice = singleProductPrice + singleShippingFee - singleDiscountAmount

  // 최종 가격
  const productPrice = isMultiItemMode ? multiTotals!.subtotal : singleProductPrice
  const shippingFee = isMultiItemMode ? multiTotals!.shippingFee : singleShippingFee
  const discountAmount = isMultiItemMode ? multiTotals!.discount : singleDiscountAmount
  const totalPrice = isMultiItemMode ? multiTotals!.total : singleTotalPrice

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

  // 폼 유효성 검사
  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.phone1.length >= 2 &&
      formData.phone2.length === 4 &&
      formData.phone3.length === 4 &&
      formData.zipCode !== "" &&
      formData.address !== "" &&
      privacyAgreed &&
      (isMultiItemMode ? checkoutItems.length > 0 : true)
    )
  }

  const handleSubmitOrder = async () => {
    if (!isFormValid()) {
      alert("모든 필수 항목을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      // 공통 배송 정보
      const shippingInfo = {
        recipientName: formData.name,
        phone: `${formData.phone1}-${formData.phone2}-${formData.phone3}`,
        zipCode: formData.zipCode,
        address: formData.address,
        addressDetail: formData.addressDetail,
        memo: formData.memo,
      }

      let orderData

      if (isMultiItemMode) {
        // 다중 상품 주문
        orderData = {
          userId,
          items: checkoutItems.map(item => ({
            analysisId: item.analysis_id,
            productType: item.product_type,
            perfumeName: item.perfume_name,
            perfumeBrand: item.perfume_brand || item.twitter_name,
            size: item.size,
            unitPrice: item.price,
            quantity: item.quantity,
            imageUrl: item.image_url,
            analysisData: item.analysis_data,
          })),
          subtotal: productPrice,
          shippingFee,
          discountAmount,
          originalPrice: productPrice + shippingFee,
          finalPrice: totalPrice,
          userCouponId: selectedCoupon?.userCouponId || null,
          ...shippingInfo,
        }
      } else {
        // 단일 상품 주문 (기존 호환)
        orderData = {
          userId,
          productType, // 상품 타입 추가 (image_analysis / figure_diffuser)
          perfumeName,
          perfumeBrand: displayIdolName,
          size: selectedSize,
          price: singleProductPrice,
          shippingFee: singleShippingFee,
          totalPrice: singleTotalPrice,
          userCouponId: selectedCoupon?.userCouponId || null,
          discountAmount: singleDiscountAmount,
          originalPrice: singleProductPrice + singleShippingFee,
          finalPrice: singleTotalPrice,
          userImage,
          keywords: analysisResult?.matchingKeywords || [],
          analysisData: analysisResult,
          ...shippingInfo,
        }
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

      // 다중 상품 모드: 장바구니에서 주문한 상품 삭제
      if (isMultiItemMode) {
        const cartItemIds = checkoutItems.map(item => item.id)
        await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: cartItemIds }),
        })
      }

      // 주문 완료 페이지에서 사용할 정보 저장
      localStorage.setItem("lastOrderPrice", totalPrice.toString())
      localStorage.setItem("lastOrderPerfumeName", isMultiItemMode
        ? checkoutItems.map(i => i.perfume_name).join(", ")
        : perfumeName)
      localStorage.setItem("lastOrderSize", isMultiItemMode
        ? checkoutItems.map(i => i.size).join(", ")
        : selectedSize)

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

      <Header title="주문하기" showBack={true} backHref={isMultiItemMode ? "/mypage" : "/result"} />

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
              <span className="font-bold text-sm tracking-wide">
                {isMultiItemMode ? `${checkoutItems.length}개 상품 주문` : "ORDER YOUR SIGNATURE SCENT"}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* 왼쪽: 주문 요약 */}
            <div className="space-y-6">
              {isMultiItemMode ? (
                <MultiItemOrderSummary
                  items={checkoutItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateSize={handleUpdateSize}
                  onRemoveItem={handleRemoveItem}
                />
              ) : (
                <OrderSummary
                  perfumeName={perfumeName}
                  perfumeBrand={displayIdolName}
                  userImage={userImage}
                  productType={productType}
                  selectedSize={selectedSize}
                  onSizeChange={setSelectedSize}
                  price={singleProductPrice}
                  keywords={analysisResult?.matchingKeywords || []}
                />
              )}
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

            {/* 결제 내용 */}
            <div className="flex flex-col gap-5">
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
                    <span className="text-slate-500 font-bold">
                      상품 금액 {isMultiItemMode && `(${checkoutItems.length}개)`}
                    </span>
                    <span className="font-black text-slate-900">{formatPrice(productPrice)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">배송비</span>
                    <span className={`font-black ${shippingFee === 0 ? "text-[#F472B6]" : "text-slate-900"}`}>
                      {shippingFee === 0 ? "무료" : `${formatPrice(shippingFee)}원`}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">쿠폰 할인</span>
                      <span className="font-black text-[#F472B6]">
                        -{formatPrice(discountAmount)}원
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-4 mt-4 flex justify-between items-center">
                    <span className="font-black text-slate-900 text-lg">총 결제 금액</span>
                    <div className="text-right">
                      {discountAmount > 0 && (
                        <span className="text-sm text-slate-400 line-through mr-2">
                          {formatPrice(productPrice + shippingFee)}원
                        </span>
                      )}
                      <span className="font-black text-2xl text-slate-900">
                        {formatPrice(totalPrice)}원
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
                      <span>{formatPrice(totalPrice)}원 주문하기</span>
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
