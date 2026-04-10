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

import { useTranslations } from 'next-intl'
import { useAuth } from "@/contexts/AuthContext"
import { Header } from "@/components/layout/Header"
import { OrderSummary } from "./components/OrderSummary"
import { MultiItemOrderSummary } from "./components/MultiItemOrderSummary"
import { CheckoutForm, CheckoutFormData } from "./components/CheckoutForm"
import { CouponSelector } from "./components/CouponSelector"
import { PaymentMethodSelector } from "./components/PaymentMethodSelector"
import { usePortonePayment } from "./hooks/usePortonePayment"
import { CheckoutCoupon } from "@/types/coupon"
import type { CartItem, ProductType, PaymentMethod } from "@/types/cart"
import { PRODUCT_PRICING, formatPrice, calculateCartTotals, FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "@/types/cart"
import { useActivePromotions, calculateShippingWithPromotion } from '@/hooks/usePromotions'

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
  bank: "우리",
  account: "1005-204-549279",
  accountRaw: "1005204549279",
  holder: "(주)네안데르"
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
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, unifiedUser, loading: authLoading } = useAuth()

  // URL 파라미터에서 시그니처/테스트 상품 확인
  const urlProduct = searchParams.get("product")
  const urlType = searchParams.get("type")
  const isSignatureProduct = urlProduct === "le-quack" && urlType === "signature"
  const isPaymentTest = urlProduct === "payment-test" && urlType === "payment_test"

  // 다중 상품 모드
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [isMultiItemMode, setIsMultiItemMode] = useState(false)

  // 단일 상품 모드 (기존 호환)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [idolName, setIdolName] = useState<string | null>(null)
  const [productType, setProductType] = useState<ProductType>("image_analysis")
  // [FIX] CRITICAL #1: selectedSize 타입에 set_10ml/set_50ml 추가
  const [selectedSize, setSelectedSize] = useState<"10ml" | "50ml" | "set" | "set_10ml" | "set_50ml">("10ml")
  const [singleQuantity, setSingleQuantity] = useState(1)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutCoupon | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer")

  // PortOne 결제 Hook
  const { initiatePayment } = usePortonePayment()

  // 프로모션 Hook
  const { freeShippingPromo } = useActivePromotions()

  // 수량 변경 시 쿠폰 초기화
  useEffect(() => {
    setSelectedCoupon(null)
  }, [singleQuantity])

  // 분석 ID (주문과 분석 결과 연결용)
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  // 확정된 레시피 (재주문 시 전달됨)
  const [confirmedRecipe, setConfirmedRecipe] = useState<any>(null)
  const [confirmedRecipePerfumeName, setConfirmedRecipePerfumeName] = useState<string | null>(null)

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
    // 비회원 구매 허용 (시그니처 상품 / 결제 테스트 / PG 심사 모드)
    const isGuestCheckout = searchParams.get("guest") === "true" || isPaymentTest
    const isPgReview = typeof document !== 'undefined' && document.cookie.includes('pg_review_mode=true')
    if (!authLoading && !userId && !isGuestCheckout && !isPgReview) {
      router.push("/")
      return
    }

    // 사용자 이름 초기화
    if (userName && !formData.name) {
      setFormData(prev => ({ ...prev, name: userName }))
    }

    // 0-1. 결제 테스트 상품 (1,000원) - URL 파라미터로 처리
    if (isPaymentTest) {
      setProductType("payment_test")
      setSelectedSize("10ml")
      setUserImage("/images/logo/logo.avif")
      setIdolName("결제 테스트")
      setAnalysisResult({
        matchingPerfumes: [{
          perfumeId: "payment-test",
          persona: {
            name: "결제 테스트 상품",
            recommendation: "실결제 테스트용 1,000원 상품"
          }
        }],
        matchingKeywords: ["테스트", "결제확인"]
      })
      return
    }

    // 0-2. 시그니처 상품 (LE QUACK) - URL 파라미터로 처리
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
    const savedAnalysisId = localStorage.getItem("checkoutAnalysisId")

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

    // 상품 타입 설정 (피규어 디퓨저 vs 향수 vs 졸업 vs 케미)
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
      // [FIX] CRITICAL #3: chemistry_set이면 set_10ml로 설정
      if (pType === "chemistry_set") {
        setSelectedSize("set_10ml")
      }
      localStorage.removeItem("checkoutProductType")
    }

    // 분석 ID 설정 (주문과 분석 결과 연결용)
    if (savedAnalysisId) {
      setAnalysisId(savedAnalysisId)
      localStorage.removeItem("checkoutAnalysisId")
    }

    // 확정된 레시피 로드 (재주문 시 전달됨)
    const savedRecipe = localStorage.getItem("checkoutRecipe")
    const savedRecipePerfumeName = localStorage.getItem("checkoutRecipePerfumeName")
    if (savedRecipe) {
      try {
        setConfirmedRecipe(JSON.parse(savedRecipe))
        setConfirmedRecipePerfumeName(savedRecipePerfumeName)
      } catch (e) {
        console.error("Failed to parse checkout recipe:", e)
      }
      localStorage.removeItem("checkoutRecipe")
      localStorage.removeItem("checkoutRecipePerfumeName")
    }
  }, [authLoading, userId, router, userName, isSignatureProduct, isPaymentTest, searchParams])

  // 단일 상품 정보
  const perfumeName = analysisResult?.matchingPerfumes?.[0]?.persona?.name || t('result.customPerfume')
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
    setSelectedCoupon(null) // Reset coupon when quantity changes
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
    setSelectedCoupon(null) // Reset coupon when size changes
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
    setSelectedCoupon(null) // Reset coupon when item removed
  }

  // 가격 계산 - PRODUCT_PRICING에서 가져오기
  const getPriceForSize = (pType: ProductType, size: string): number => {
    const pricing = PRODUCT_PRICING[pType]
    const option = pricing.find(p => p.size === size)
    return option?.price || pricing[0].price
  }

  // 다중 상품 모드
  const multiTotals = isMultiItemMode ? calculateCartTotals(checkoutItems, selectedCoupon?.discount_percent, selectedCoupon?.type) : null

  // 단일 상품 모드
  const singleUnitPrice = getPriceForSize(productType, selectedSize)
  const singleProductPrice = singleUnitPrice * singleQuantity
  const singleDiscountAmount = selectedCoupon
    ? selectedCoupon.type === 'stamp_free'
      ? singleUnitPrice // stamp_free: 1개 상품 단가만큼 할인 (무료 상품 1개)
      : Math.floor(singleProductPrice * (selectedCoupon.discount_percent / 100))
    : 0

  // 최종 가격 (프로모션 적용)
  const productPrice = isMultiItemMode ? multiTotals!.subtotal : singleProductPrice
  const subtotalForShipping = isMultiItemMode ? multiTotals!.subtotal : singleProductPrice
  const shippingResult = calculateShippingWithPromotion(subtotalForShipping, isMultiItemMode ? undefined : productType, freeShippingPromo)
  const shippingFee = shippingResult.finalFee
  const discountAmount = isMultiItemMode ? multiTotals!.discount : singleDiscountAmount
  const totalPrice = productPrice + shippingFee - discountAmount

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
      alert(t('checkout.fillAllRequired'))
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
          paymentMethod,
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
          shippingFee: shippingResult.finalFee,
          discountAmount,
          originalPrice: productPrice + shippingResult.originalFee,
          finalPrice: totalPrice,
          userCouponId: selectedCoupon?.userCouponId || null,
          promotionId: freeShippingPromo?.id || null,
          ...shippingInfo,
        }
      } else {
        // 단일 상품 주문 (기존 호환)
        orderData = {
          userId,
          paymentMethod,
          analysisId, // 분석 ID (분석 결과 연결용)
          productType, // 상품 타입 추가 (image_analysis / figure_diffuser)
          perfumeName,
          perfumeBrand: displayIdolName,
          size: selectedSize,
          price: singleUnitPrice,
          quantity: singleQuantity,
          subtotal: singleProductPrice,
          shippingFee: shippingResult.finalFee,
          totalPrice,
          userCouponId: selectedCoupon?.userCouponId || null,
          discountAmount: singleDiscountAmount,
          originalPrice: singleProductPrice + shippingResult.originalFee,
          finalPrice: totalPrice,
          userImage,
          keywords: analysisResult?.matchingKeywords || [],
          analysisData: analysisResult,
          promotionId: freeShippingPromo?.id || null,
          // 확정된 레시피 포함 (재주문 시)
          ...(confirmedRecipe && { confirmedRecipe }),
          ...shippingInfo,
        }
      }

      console.log("[Checkout] Sending order data:", JSON.stringify(orderData, null, 2))

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      console.log("[Checkout] Response status:", response.status, response.statusText)

      const result = await response.json()

      if (!response.ok) {
        console.error("[Checkout] 주문 생성 에러:", {
          status: response.status,
          statusText: response.statusText,
          result,
          orderData
        })
        throw new Error(result.error || `${t('checkout.orderCreateFailed')} (${response.status})`)
      }

      // 온라인 결제 (카드, 카카오페이, 네이버페이)
      if (paymentMethod !== "bank_transfer") {
        const orderName = isMultiItemMode
          ? t('checkout.orderNameMulti', { name: checkoutItems[0].perfume_name, count: checkoutItems.length - 1 })
          : perfumeName

        const paymentResult = await initiatePayment({
          orderId: result.orderId,
          orderName,
          totalAmount: totalPrice,
          paymentMethod,
          customerName: formData.name,
          customerPhone: `${formData.phone1}-${formData.phone2}-${formData.phone3}`,
        })

        if (!paymentResult.success) {
          // 결제 미완료 주문 즉시 삭제 (결제가 안 됐으므로 주문 자체를 제거)
          try {
            await fetch(`/api/orders/${result.orderId}/payment-failed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: paymentResult.cancelled ? "사용자 결제 취소" : "결제 실패" }),
            })
          } catch (e) {
            console.error("[Checkout] Failed to clean up pending order:", e)
          }

          if (paymentResult.cancelled) {
            setIsSubmitting(false)
            return
          }
          throw new Error(paymentResult.error || t('checkout.paymentFailed'))
        }
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
      const savedPrice = totalPrice.toString()
      const savedPerfumeName = isMultiItemMode
        ? checkoutItems.map(i => i.perfume_name).join(", ")
        : perfumeName
      const savedSize = isMultiItemMode
        ? checkoutItems.map(i => i.size).join(", ")
        : selectedSize

      console.log("[Checkout] Saving to localStorage:", {
        price: savedPrice,
        perfumeName: savedPerfumeName,
        size: savedSize,
        productType,
        selectedSize
      })

      localStorage.setItem("lastOrderPrice", savedPrice)
      localStorage.setItem("lastOrderPerfumeName", savedPerfumeName)
      localStorage.setItem("lastOrderSize", savedSize)

      // 주문 완료 페이지로 이동 (결제 방법 정보 포함)
      router.push(`/checkout/complete?orderId=${result.orderId}&paymentMethod=${paymentMethod}`)
    } catch (error) {
      console.error("Order submission error:", error)
      alert(error instanceof Error ? error.message : t('checkout.orderError'))
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

      <Header title={t('checkout.title')} showBack={true} backHref={isMultiItemMode ? "/mypage" : "/result"} />

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
                {isMultiItemMode ? t('checkout.orderItems', { count: checkoutItems.length }) : t('checkout.signatureOrder')}
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
                  isFreeShippingPromo={shippingResult.isFreeByPromotion}
                  promoName={shippingResult.promotionName || undefined}
                />
              ) : (
                <>
                  <OrderSummary
                    perfumeName={perfumeName}
                    perfumeBrand={displayIdolName}
                    userImage={userImage}
                    productType={productType}
                    selectedSize={selectedSize}
                    onSizeChange={setSelectedSize}
                    price={singleUnitPrice}
                    keywords={analysisResult?.matchingKeywords || []}
                    isFreeShippingPromo={shippingResult.isFreeByPromotion}
                    quantity={singleQuantity}
                    onQuantityChange={setSingleQuantity}
                  />
                  {/* 확정 레시피 배지 (재주문 시) */}
                  {confirmedRecipe && (
                    <div className="bg-amber-50 border-2 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#FBBF24]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-amber-400 border-2 border-slate-900 rounded-lg flex items-center justify-center shadow-[1px_1px_0px_#1e293b]">
                          <span className="text-sm">🧪</span>
                        </div>
                        <span className="font-black text-slate-900 text-sm tracking-tight">{t('checkout.customRecipe')}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        {t('checkout.recipeBased', { name: confirmedRecipePerfumeName || perfumeName })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {confirmedRecipe.granules?.map((g: any) => (
                          <span key={g.id} className="text-[10px] px-2.5 py-1 bg-white border-[1.5px] border-slate-900 rounded-full text-slate-800 font-bold shadow-[1px_1px_0px_#FBBF24]">
                            {g.name} {g.ratio}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
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
              cheapestItemPrice={
                isMultiItemMode
                  ? Math.min(...checkoutItems.map(i => i.price))
                  : singleUnitPrice
              }
              totalQuantity={
                isMultiItemMode
                  ? checkoutItems.reduce((sum, i) => sum + i.quantity, 0)
                  : singleQuantity
              }
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
              <h3 className="font-black text-xl text-slate-900">{t('checkout.paymentInfo')}</h3>
            </div>

            {/* 결제 내용 */}
            <div className="flex flex-col gap-5">
              {/* 결제 수단 선택 */}
              <div className="space-y-4">
                <p className="text-sm font-black text-slate-900">{t('checkout.paymentMethod')}</p>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                />
              </div>

              {/* 계좌이체 선택 시 계좌 정보 표시 */}
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-4">
                  {/* 계좌 정보 카드 */}
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 font-bold">{t('checkout.bankLabel')}</span>
                        <span className="font-black text-slate-900">{BANK_INFO.bank}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 font-bold whitespace-nowrap mr-3">{t('checkout.accountLabel')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 font-mono whitespace-nowrap text-[15px]">{BANK_INFO.account}</span>
                          <button
                            onClick={copyAccountNumber}
                            className={`p-2 rounded-lg border-2 transition-all flex-shrink-0 ${
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
                        <span className="text-sm text-slate-500 font-bold">{t('checkout.accountHolder')}</span>
                        <span className="font-black text-slate-900">{BANK_INFO.holder}</span>
                      </div>
                    </div>
                  </div>

                  {/* 안내 문구 */}
                  <div className="space-y-2">
                    <p className="text-sm text-red-500 font-bold flex items-center gap-2">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      {t('checkout.sameNameWarning')}
                    </p>
                    <p className="text-sm text-slate-600 font-bold flex items-center gap-2">
                      <Truck size={14} className="flex-shrink-0" />
                      {t('checkout.depositAfterShipping')}
                    </p>
                  </div>
                </div>
              )}

              {/* 결제 금액 */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
                <p className="text-sm font-black text-slate-900 mb-4">{t('checkout.paymentAmountLabel')}</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">
                      {t('checkout.productAmount')} {isMultiItemMode && t('checkout.itemCount', { count: checkoutItems.length })}
                    </span>
                    <span className="font-black text-slate-900">{formatPrice(productPrice)}{t('currency.suffix')}</span>
                  </div>
                  {shippingResult.isFreeByPromotion ? (
                    <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">{t('shipping.label')}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#F472B6] text-white rounded font-bold tracking-tight">
                            {shippingResult.promotionName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(shippingResult.originalFee)}{t('currency.suffix')}
                          </span>
                          <span className="font-black text-[#F472B6]">0{t('currency.suffix')}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">{t('shipping.label')}</span>
                      {shippingFee === 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(DEFAULT_SHIPPING_FEE)}{t('currency.suffix')}
                          </span>
                          <span className="font-black text-[#F472B6]">0{t('currency.suffix')}</span>
                        </div>
                      ) : (
                        <span className="font-black text-slate-900">
                          {formatPrice(shippingFee)}{t('currency.suffix')}
                        </span>
                      )}
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">{t('checkout.couponDiscount')}</span>
                      <span className="font-black text-[#F472B6]">
                        -{formatPrice(discountAmount)}{t('currency.suffix')}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-4 mt-4 flex justify-between items-center">
                    <span className="font-black text-slate-900 text-lg">{t('checkout.totalPayment')}</span>
                    <div className="text-right">
                      {discountAmount > 0 && (
                        <span className="text-sm text-slate-400 line-through mr-2">
                          {formatPrice(productPrice + shippingResult.originalFee)}{t('currency.suffix')}
                        </span>
                      )}
                      <span className="font-black text-2xl text-slate-900">
                        {formatPrice(totalPrice)}{t('currency.suffix')}
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
                      {t('checkout.privacyConsent')} <span className="text-[#F472B6]">{t('checkout.privacyRequired')}</span>
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      {t('checkout.privacyDescription')}
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
                      <span>{t('checkout.processingOrder')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>{formatPrice(totalPrice)}{t('currency.suffix')} {paymentMethod === "bank_transfer" ? t('checkout.orderButton') : t('checkout.payButton')}</span>
                    </>
                  )}
                </div>
              </button>
              {!isFormValid() && (
                <p className="text-xs text-slate-500 text-center mt-3 font-bold">
                  {t('checkout.fillRequired')}
                </p>
              )}
            </div>

            {/* 안내 문구 */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <ShieldCheck size={14} />
                {t('checkout.securePayment')}
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Truck size={14} />
                {t('checkout.fastShipping')}
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Package size={14} />
                {t('checkout.arriveIn')}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
