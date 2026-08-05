'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  CreditCard,
  MapPin,
  Eye,
  FlaskConical,
  RefreshCw,
  XCircle,
  Ban,
  Star,
  AlertTriangle,
  Phone,
  Mail,
  Headphones,
  Loader2,
  PackageCheck,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import { RecipeModal } from './RecipeModal'
import { getTrackingUrl, EXTERNAL_LINK_SAFE_ATTRS, CARRIER_LABELS, type CarrierId } from '@/lib/shipping/cj'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { isProductTypeDiscontinued } from '@/lib/products/active'
import { isSajuClickerSize, isScentPaperSize } from '@/types/cart'
import { getEffectiveProductType } from '@/lib/products/store-products'

interface RefundAccountInput {
  bankName: string
  accountNumber: string
  accountHolder: string
}

interface Order {
  id: string
  order_number: string
  perfume_name: string
  perfume_brand: string
  size: string
  price: number
  recipient_name: string
  phone: string
  address: string
  address_detail: string
  status: 'pending' | 'paid' | 'preparing' | 'shipping' | 'delivered' | 'cancel_requested' | 'cancelled' | 'awaiting_payment'
  created_at: string
  updated_at: string
  // 새로 추가된 필드
  user_image_url?: string
  keywords?: string[]
  analysis_data?: (ImageAnalysisResult & { storeProduct?: Record<string, unknown> }) | null
  product_type?: 'image_analysis' | 'image_analysis_paper' | 'figure_diffuser' | 'graduation' | 'signature' | 'chemistry_set' | 'payment_test' | 'today_scent' | 'store_product' | 'saju_perfume'
  payment_method?: string
  payment_id?: string | null
  analysis_id?: string  // 분석 결과 ID (레시피 연결용)
  // 환불 관련 (cancelled 상태에서 유효)
  refund_amount?: number | null
  refunded_at?: string | null
  refund_reason?: string | null
  cancel_reason?: string | null
  // 계좌이체 환불 계좌 (고객이 취소 요청 시 입력)
  refund_bank_name?: string | null
  refund_account_number?: string | null
  refund_account_holder?: string | null
  final_price?: number
  cancel_requested_at?: string | null
  // 배송 운송장
  tracking_number?: string | null
  tracking_carrier?: string | null
  shipped_at?: string | null
}

interface OrderHistoryProps {
  orders: Order[]
  loading: boolean
  error?: string | null
  viewMode: 'grid' | 'list'
  onOrderUpdate?: () => void
}

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  awaiting_payment: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: Loader2,
  },
  pending: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: Clock,
  },
  paid: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: CreditCard,
  },
  preparing: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: PackageCheck,
  },
  shipping: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: Truck,
  },
  delivered: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: CheckCircle,
  },
  cancel_requested: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
  },
  cancelled: {
    color: 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)]',
    icon: Ban,
  }
}

const STATUS_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  awaiting_payment: { labelKey: 'awaitingPayment', descKey: 'awaitingPaymentDesc' },
  pending: { labelKey: 'pending', descKey: 'pendingDesc' },
  paid: { labelKey: 'paid', descKey: 'paidDesc' },
  preparing: { labelKey: 'preparing', descKey: 'preparingDesc' },
  shipping: { labelKey: 'shipping', descKey: 'shippingDesc' },
  delivered: { labelKey: 'delivered', descKey: 'deliveredDesc' },
  cancel_requested: { labelKey: 'cancelRequested', descKey: 'cancelRequestedDesc' },
  cancelled: { labelKey: 'cancelled', descKey: 'cancelledDesc' },
}

function getPaymentMethodBadge(paymentMethod: string | undefined, tPayment: (key: string) => string) {
  switch (paymentMethod) {
    case 'card':
      return { label: tPayment('card'), className: 'bg-[var(--soft)] text-[var(--muted-ink)]' }
    case 'kakao_pay':
      return { label: tPayment('kakaoPay'), className: 'bg-[var(--soft)] text-[var(--ink)]' }
    case 'naver_pay':
      return { label: tPayment('naverPay'), className: 'bg-[var(--soft)] text-[var(--muted-ink)]' }
    default:
      return { label: tPayment('bankTransferShort'), className: 'bg-[var(--soft)] text-[var(--muted-ink)]' }
  }
}

/**
 * 운송장 정보 카드 — 마이페이지 grid/list 양쪽에서 재사용.
 * 운송장 번호가 있고 형식이 유효할 때만 외부 조회 링크 노출.
 */
function TrackingInfoCard({
  trackingNumber,
  carrier,
  shippedAt,
  compact = false,
}: {
  trackingNumber?: string | null
  carrier?: string | null
  shippedAt?: string | null
  compact?: boolean
}) {
  if (!trackingNumber) return null
  const carrierId = (carrier as CarrierId) ?? 'cj'
  const url = getTrackingUrl(trackingNumber, carrierId)
  if (!url) return null
  const carrierLabel = CARRIER_LABELS[carrierId] ?? carrier ?? 'CJ대한통운'

  if (compact) {
    return (
      <a
        href={url}
        {...EXTERNAL_LINK_SAFE_ATTRS}
        aria-label={`${carrierLabel} 운송장 ${trackingNumber} 외부 사이트에서 배송조회 (새 창)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs lg:text-sm font-bold text-[var(--muted-ink)] bg-[var(--soft)] border border-[var(--line)] rounded-[6px] hover:bg-[var(--soft)] transition-colors"
      >
        <Truck size={12} />
        <span className="font-mono">{trackingNumber}</span>
        <ExternalLink size={10} aria-hidden />
      </a>
    )
  }

  return (
    <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
      <div className="flex items-start gap-2">
        <Truck size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs lg:text-sm font-bold text-[var(--ink)]">{carrierLabel} 배송 시작</p>
          <a
            href={url}
            {...EXTERNAL_LINK_SAFE_ATTRS}
            aria-label={`${carrierLabel} 운송장 ${trackingNumber} 외부 사이트에서 배송조회 (새 창)`}
            className="inline-flex items-center gap-1 mt-1 font-mono text-sm lg:text-base text-[var(--ink)] hover:text-[var(--ink)] hover:underline break-all"
          >
            {trackingNumber}
            <ExternalLink size={12} aria-hidden />
          </a>
          {shippedAt && (
            <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] mt-0.5">
              발송: {new Date(shippedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] mt-1">클릭 시 외부 사이트(CJ대한통운)에서 자동 조회됩니다.</p>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function OrderCard({
  order,
  viewMode,
  onOrderUpdate
}: {
  order: Order
  viewMode: 'grid' | 'list'
  onOrderUpdate?: () => void
}) {
  const router = useRouter()
  const t = useTranslations('mypage')
  const tStatus = useTranslations('status')
  const tPayment = useTranslations('payment')
  const tCurrency = useTranslations('currency')
  const tCheckout = useTranslations('checkout')
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon
  const statusKeys = STATUS_KEYS[order.status] || STATUS_KEYS.pending
  const displayProductType = getEffectiveProductType(order.product_type, order.analysis_data) as NonNullable<Order['product_type']>

  const isCatalogProduct = ['signature', 'today_scent', 'store_product', 'payment_test'].includes(displayProductType)
  const hasAnalysisData = !!order.analysis_data && !isCatalogProduct
  const canCancel = order.status !== 'cancel_requested' && order.status !== 'cancelled'
  const paymentBadge = getPaymentMethodBadge(order.payment_method, tPayment)
  const statusLabel = order.status === 'paid' && order.payment_method && order.payment_method !== 'bank_transfer'
    ? t('paymentComplete')
    : tStatus(statusKeys.labelKey)
  // 시그니처 상품인지 확인 (키워드에 "시그니처" 포함 여부)
  const isSignatureProduct = isCatalogProduct || (order.keywords?.some(k => k.includes('시그니처')) ?? false)
  // 시향지(샘플) 상품 — "향수로 구매하기" 업셀 노출 대상
  const isPaperSample = displayProductType === 'image_analysis_paper'
  // size 표시 라벨 — 시향지 애드온(scent_paper)은 raw 코드 대신 '시향지'로 표기
  const sizeLabel = isSajuClickerSize(order.size)
    ? tCheckout('optionSajuClicker')
    : isScentPaperSize(order.size)
    ? (displayProductType === 'chemistry_set' ? '시향지 2매' : '시향지')
    : displayProductType === 'store_product' && order.size === '50ml'
      ? '50ml 향수'
      : displayProductType === 'store_product' && order.size === '10ml'
        ? '10ml 향수'
    : order.size

  // 상품 활성화 상태 — 비활성이면 재구매/분석상세보기 차단
  const { isProductActive, loading: productsLoading } = useActiveProducts()
  const isProductDiscontinued = isProductTypeDiscontinued(displayProductType, isProductActive, productsLoading)

  // 분석 상세보기 핸들러
  const handleViewAnalysis = () => {
    if (order.analysis_data) {
      // 분석 데이터를 localStorage에 저장하고 결과 페이지로 이동
      localStorage.setItem('analysisResult', JSON.stringify(order.analysis_data))
      if (order.user_image_url) {
        localStorage.setItem('userImage', order.user_image_url)
      }
      router.push('/result')
    }
  }

  // 재구매 핸들러 - 확정 레시피가 있으면 함께 전달
  const [isLoadingRepurchase, setIsLoadingRepurchase] = useState(false)
  const handleRepurchase = async () => {
    if (isLoadingRepurchase) return
    if (isProductDiscontinued) {
      alert(t('productDiscontinued'))
      return
    }
    setIsLoadingRepurchase(true)

    try {
      if (order.analysis_data) {
        localStorage.setItem('analysisResult', JSON.stringify(order.analysis_data))
      }
      if (order.user_image_url) {
        localStorage.setItem('userImage', order.user_image_url)
      }
      // productType 저장 (졸업 퍼퓸, 피규어 디퓨저 등)
      if (displayProductType) {
        localStorage.setItem('checkoutProductType', displayProductType)
      }
      // 분석 ID 저장 (주문과 분석 결과 연결용)
      if (order.analysis_id) {
        localStorage.setItem('checkoutAnalysisId', order.analysis_id)
      }

      // 확정된 레시피가 있으면 함께 전달 (현장 방문 후 온라인 재주문 지원)
      if (order.analysis_id) {
        try {
          const response = await fetch(`/api/feedback?resultId=${order.analysis_id}&limit=1`)
          const data = await response.json()
          if (data.success && data.feedbacks?.length > 0) {
            const latestFeedback = data.feedbacks[0]
            if (latestFeedback.generatedRecipe) {
              localStorage.setItem('checkoutRecipe', JSON.stringify(latestFeedback.generatedRecipe))
              localStorage.setItem('checkoutRecipePerfumeName', latestFeedback.perfumeName || order.perfume_name)
            }
          }
        } catch (e) {
          console.error('레시피 조회 실패:', e)
          // 레시피 조회 실패해도 재구매는 계속 진행
        }
      }

      router.push('/checkout')
    } finally {
      setIsLoadingRepurchase(false)
    }
  }

  // 시향지(샘플) → 정식 향수(image_analysis)로 구매. 향은 시향지의 분석 결과 그대로 사용.
  const [isLoadingBuyPerfume, setIsLoadingBuyPerfume] = useState(false)
  const handleBuyAsPerfume = async () => {
    if (isLoadingBuyPerfume) return
    // 분석 연결이 없으면 향을 특정할 수 없어 진행 불가 (버튼도 이 경우 비노출)
    if (!order.analysis_id) return
    setIsLoadingBuyPerfume(true)
    try {
      if (order.analysis_data) {
        localStorage.setItem('analysisResult', JSON.stringify(order.analysis_data))
      }
      if (order.user_image_url) {
        localStorage.setItem('userImage', order.user_image_url)
      }
      // 시향지가 아니라 정식 향수로 결제되도록 product_type 강제 전환
      localStorage.setItem('checkoutProductType', 'image_analysis')
      localStorage.setItem('checkoutAnalysisId', order.analysis_id)

      // 확정된 레시피가 있으면 함께 전달 (시향지 시점에 조정한 향 유지)
      try {
        const response = await fetch(`/api/feedback?resultId=${order.analysis_id}&limit=1`)
        const data = await response.json()
        if (data.success && data.feedbacks?.length > 0) {
          const latestFeedback = data.feedbacks[0]
          if (latestFeedback.generatedRecipe) {
            localStorage.setItem('checkoutRecipe', JSON.stringify(latestFeedback.generatedRecipe))
            localStorage.setItem('checkoutRecipePerfumeName', latestFeedback.perfumeName || order.perfume_name)
          }
        }
      } catch (e) {
        console.error('레시피 조회 실패:', e)
      }

      router.push('/checkout')
    } finally {
      setIsLoadingBuyPerfume(false)
    }
  }

  // 주문 취소 핸들러
  const handleCancelOrder = async (reason: string, refundAccount?: RefundAccountInput) => {
    if (isCancelling) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, ...(refundAccount && { refundAccount }) })
      })

      if (response.ok) {
        setShowCancelConfirm(false)
        onOrderUpdate?.()
      } else {
        const data = await response.json()
        alert(data.error || t('cancelFailed'))
      }
    } catch (error) {
      console.error('Cancel order error:', error)
      alert(t('serverError'))
    } finally {
      setIsCancelling(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 이미지 + 정보 */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* 이미지 썸네일 */}
              <div className="w-14 h-14 flex-shrink-0 rounded-[6px] overflow-hidden bg-[var(--soft)] border border-[var(--line)]">
                {order.user_image_url ? (
                  <img
                    src={order.user_image_url}
                    alt={t('analysisImage')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star size={20} className="text-[var(--muted-ink)]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs lg:text-sm text-[var(--muted-ink)]">{order.order_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs lg:text-sm font-bold border ${status.color}`}>
                    {statusLabel}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs lg:text-sm font-bold ${paymentBadge.className}`}>
                    {paymentBadge.label}
                  </span>
                </div>
                <h4 className="font-bold text-[var(--ink)] truncate">{order.perfume_name}</h4>
                <p className="text-sm lg:text-base text-[var(--muted-ink)]">{sizeLabel} • {order.price.toLocaleString()}{tCurrency('suffix')}</p>
              </div>
            </div>

            {/* 버튼들 (리스트뷰에서는 간소화) */}
            <div className="flex items-center gap-2">
              {/* 레시피 - 시그니처 상품은 숨김 */}
              {hasAnalysisData && !isSignatureProduct && (
                <button
                  onClick={() => setShowRecipeModal(true)}
                  className="px-3 py-1.5 text-xs lg:text-sm font-bold bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)] rounded-[6px] transition-all"
                >
                  {t('recipe')}
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-1.5 text-xs lg:text-sm font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-[6px] hover:bg-red-100 transition-all"
                >
                  {t('cancelOrder')}
                </button>
              )}
            </div>
          </div>
          {/* 시향지 → 향수로 구매하기 */}
          {isPaperSample && order.analysis_id && (
            <button
              onClick={handleBuyAsPerfume}
              disabled={isLoadingBuyPerfume}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] text-sm lg:text-base font-black border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--soft)] transition-all disabled:opacity-50"
            >
              {isLoadingBuyPerfume ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {t('buyAsPerfume')}
            </button>
          )}
          {/* 운송장 — shipping/delivered 상태에서 표시 */}
          {order.tracking_number && (order.status === 'shipping' || order.status === 'delivered') && (
            <div className="mt-3">
              <TrackingInfoCard
                trackingNumber={order.tracking_number}
                carrier={order.tracking_carrier}
                shippedAt={order.shipped_at}
              />
            </div>
          )}
          {/* 환불 상태 안내 — 리스트 뷰에서도 표시 */}
          {(order.status === 'cancel_requested' || order.status === 'cancelled') && (
            <div className="mt-3">
              <RefundStatusCard order={order} />
            </div>
          )}
          {/* 상품 단종 안내 */}
          {isProductDiscontinued && (
            <div className="mt-3 bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-2.5">
              <div className="flex items-center gap-2 text-xs lg:text-sm">
                <AlertTriangle size={14} className="text-[var(--muted-ink)] flex-shrink-0" />
                <span className="text-[var(--muted-ink)]">{t('productDiscontinuedTitle')}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* 레시피 모달 */}
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          analysisData={order.analysis_data}
          perfumeName={order.perfume_name}
          keywords={order.keywords}
        />

        {/* 취소 확인 다이얼로그 */}
        <CancelConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelOrder}
          isLoading={isCancelling}
          orderNumber={order.order_number}
          isBankTransfer={order.payment_method === 'bank_transfer' && order.status !== 'pending'}
        />
      </>
    )
  }

  // Grid View
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] overflow-hidden"
      >
        {/* 상단 헤더 */}
        <div className="bg-[var(--soft)] border-b-2 border-[var(--line)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs lg:text-sm text-[var(--muted-ink)]">{order.order_number}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs lg:text-sm font-bold ${paymentBadge.className}`}>
                {paymentBadge.label}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs lg:text-sm font-bold border flex items-center gap-1 ${status.color}`}>
              <StatusIcon size={12} />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="p-4 space-y-4">
          {/* 이미지 + 상품명 */}
          <div className="flex gap-4">
            {/* 이미지 썸네일 */}
            <div className="w-20 h-24 flex-shrink-0 rounded-[6px] overflow-hidden bg-[var(--soft)] border border-[var(--line)]">
              {order.user_image_url ? (
                <img
                  src={order.user_image_url}
                  alt={t('analysisImage')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Star size={24} className="text-[var(--muted-ink)]" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold mb-0.5">{order.perfume_brand}</p>
              <h4 className="font-black text-lg text-[var(--ink)] leading-tight mb-1">{order.perfume_name}</h4>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold">{sizeLabel}</p>
              <p className="font-black text-lg text-[var(--ink)] mt-1">{order.price.toLocaleString()}{tCurrency('suffix')}</p>
            </div>
          </div>

          {/* 키워드 */}
          {order.keywords && order.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {order.keywords.slice(0, 4).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs lg:text-sm font-bold text-[var(--muted-ink)] bg-[var(--soft)] rounded-full border border-[var(--line)]"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          {/* 배송 정보 */}
          <div className="bg-[var(--soft)] rounded-[6px] p-3 space-y-2 border border-[var(--line)]">
            <div className="flex items-center gap-2 text-sm lg:text-base">
              <MapPin size={14} className="text-[var(--muted-ink)] flex-shrink-0" />
              <span className="text-[var(--muted-ink)] truncate">
                {order.address} {order.address_detail}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm lg:text-base">
              <Package size={14} className="text-[var(--muted-ink)] flex-shrink-0" />
              <span className="text-[var(--muted-ink)]">{order.recipient_name} • {order.phone}</span>
            </div>
          </div>

          {/* 상태 설명 */}
          <div className="flex items-center gap-2 text-xs lg:text-sm text-[var(--muted-ink)] bg-[var(--soft)] rounded-[6px] px-3 py-2">
            <StatusIcon size={14} />
            <span>{tStatus(statusKeys.descKey)}</span>
          </div>

          {/* 운송장 — shipping/delivered 상태에서 표시 */}
          {order.tracking_number && (order.status === 'shipping' || order.status === 'delivered') && (
            <TrackingInfoCard
              trackingNumber={order.tracking_number}
              carrier={order.tracking_carrier}
              shippedAt={order.shipped_at}
            />
          )}

          {/* 환불 상태 안내 — 취소 요청/취소 완료 시 표시 */}
          {(order.status === 'cancel_requested' || order.status === 'cancelled') && (
            <RefundStatusCard order={order} />
          )}

          {/* 상품 단종 안내 — 재구매/분석상세 차단 사유 명시 */}
          {isProductDiscontinued && (
            <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-xs lg:text-sm">
                  <p className="font-bold text-[var(--muted-ink)]">{t('productDiscontinuedTitle')}</p>
                  <p className="text-[var(--muted-ink)] mt-0.5 leading-relaxed">{t('productDiscontinuedDesc')}</p>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {/* 분석 상세보기 - 시그니처 상품은 숨김 */}
            {!isSignatureProduct && (
              <button
                onClick={handleViewAnalysis}
                disabled={!hasAnalysisData || isProductDiscontinued}
                title={isProductDiscontinued ? t('productDiscontinued') : undefined}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] text-sm lg:text-base font-bold border-2 transition-all ${
                  hasAnalysisData && !isProductDiscontinued
                    ? 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--soft)]'
                    : 'bg-[var(--soft)] border-[var(--line)] text-[var(--muted-ink)] cursor-not-allowed'
                }`}
              >
                <Eye size={16} />
                {t('analysisDetail')}
              </button>
            )}

            {/* 레시피 보기 - 시그니처 상품은 숨김 */}
            {!isSignatureProduct && (
              <button
                onClick={() => setShowRecipeModal(true)}
                disabled={!hasAnalysisData}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] text-sm lg:text-base font-bold border-2 transition-all ${
                  hasAnalysisData
                    ? 'bg-[var(--soft)] border-[var(--line)] text-[var(--ink)]'
                    : 'bg-[var(--soft)] border-[var(--line)] text-[var(--muted-ink)] cursor-not-allowed'
                }`}
              >
                <FlaskConical size={16} />
                {t('recipe')}
              </button>
            )}

            {/* 재구매 — 상품이 비활성화되면 차단 */}
            <button
              onClick={handleRepurchase}
              disabled={isProductDiscontinued}
              title={isProductDiscontinued ? t('productDiscontinued') : undefined}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] text-sm lg:text-base font-bold border-2 transition-all ${
                isProductDiscontinued
                  ? 'bg-[var(--soft)] border-[var(--line)] text-[var(--muted-ink)] cursor-not-allowed'
                  : 'bg-[var(--soft)] border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              <RefreshCw size={16} />
              {isProductDiscontinued ? t('discontinuedShort') : t('repurchase')}
            </button>

            {/* 주문 취소 */}
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={!canCancel}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] text-sm lg:text-base font-bold border-2 transition-all ${
                canCancel
                  ? 'bg-[var(--paper)] border-red-400 text-red-600 hover:bg-red-50'
                  : 'bg-[var(--soft)] border-[var(--line)] text-[var(--muted-ink)] cursor-not-allowed'
              }`}
            >
              <XCircle size={16} />
              {order.status === 'cancel_requested' ? t('cancelling') : order.status === 'cancelled' ? t('cancelled') : t('cancelOrder')}
            </button>
          </div>

          {/* 시향지 → 향수로 구매하기 (시향지 주문 + 분석 연결 있는 경우만) */}
          {isPaperSample && order.analysis_id && (
            <div className="pt-1">
              <button
                onClick={handleBuyAsPerfume}
                disabled={isLoadingBuyPerfume}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-[6px] text-sm lg:text-base font-black border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--soft)] transition-all disabled:opacity-50"
              >
                {isLoadingBuyPerfume ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {t('buyAsPerfume')}
              </button>
              <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] text-center mt-1.5">{t('buyAsPerfumeHint')}</p>
            </div>
          )}

          {/* 주문일시 */}
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] text-right pt-1 border-t border-[var(--line)]">
            {t('orderDate', { date: formatDate(order.created_at) })}
          </p>
        </div>
      </motion.div>

      {/* 레시피 모달 */}
      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        analysisData={order.analysis_data}
        perfumeName={order.perfume_name}
        keywords={order.keywords}
      />

      {/* 취소 확인 다이얼로그 */}
      <CancelConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelOrder}
        isLoading={isCancelling}
        orderNumber={order.order_number}
        isBankTransfer={order.payment_method === 'bank_transfer' && order.status !== 'pending'}
      />
    </>
  )
}

// 취소 확인 다이얼로그
function CancelConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  orderNumber,
  isBankTransfer = false,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, refundAccount?: RefundAccountInput) => void
  isLoading: boolean
  orderNumber: string
  isBankTransfer?: boolean
}) {
  const t = useTranslations('mypage')
  const [reason, setReason] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const reasonValid = reason.trim().length >= 2
  const accountValid =
    !isBankTransfer ||
    (bankName.trim().length > 0 &&
      accountNumber.trim().length > 0 &&
      accountHolder.trim().length > 0)
  const canSubmit = reasonValid && accountValid

  const handleConfirm = () => {
    if (isBankTransfer) {
      onConfirm(reason.trim(), {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      })
    } else {
      onConfirm(reason.trim())
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* 다이얼로그 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[90vh] overflow-y-auto bg-[var(--paper)] rounded-[6px] border border-[var(--line)] z-50 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border-2 border-red-300">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="font-black text-xl text-[var(--ink)] mb-2">
                {t('cancelTitle')}
              </h3>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold mb-1">
                {t('cancelOrderNum', { orderNumber })}
              </p>
              <p className="text-xs lg:text-sm text-[var(--muted-ink)] mb-6">
                {t('cancelDesc')}
              </p>

              <div className="w-full text-left mb-4">
                <label className="block text-sm lg:text-base font-black text-[var(--ink)] mb-1">
                  {t('cancelReasonLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-[6px] border border-[var(--line)] px-3 py-2 text-sm lg:text-base outline-none focus:border-[var(--line)] resize-none"
                  placeholder={t('cancelReasonPlaceholder')}
                  disabled={isLoading}
                />
                <p className={`mt-1 text-xs lg:text-sm ${reasonValid ? 'text-[var(--muted-ink)]' : 'text-red-500'}`}>
                  {reasonValid ? t('cancelReasonHelp') : t('cancelReasonRequired')}
                </p>
              </div>

              {/* 계좌이체: 환불받을 계좌 입력 */}
              {isBankTransfer && (
                <div className="w-full text-left mb-4 rounded-[6px] border border-[var(--line)] bg-[var(--canvas)] p-3 space-y-2">
                  <p className="text-sm lg:text-base font-black text-[var(--ink)]">
                    환불받을 계좌 <span className="text-red-500">*</span>
                  </p>
                  <p className="text-xs lg:text-sm text-[var(--ink)] mb-1">
                    계좌이체(무통장입금)로 결제하셨습니다. 입력하신 계좌로 환불해 드립니다.
                  </p>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={isLoading}
                    placeholder="은행명 (예: 국민은행)"
                    className="w-full rounded-[6px] border border-[var(--line)] px-3 py-2 text-sm lg:text-base outline-none focus:border-[var(--line)]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    disabled={isLoading}
                    placeholder="계좌번호 (- 없이 숫자만)"
                    className="w-full rounded-[6px] border border-[var(--line)] px-3 py-2 text-sm lg:text-base outline-none focus:border-[var(--line)]"
                  />
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    disabled={isLoading}
                    placeholder="예금주"
                    className="w-full rounded-[6px] border border-[var(--line)] px-3 py-2 text-sm lg:text-base outline-none focus:border-[var(--line)]"
                  />
                  {!accountValid && (
                    <p className="text-xs lg:text-sm text-red-500">은행, 계좌번호, 예금주를 모두 입력해 주세요.</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-[6px] font-bold bg-[var(--soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  {t('no')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || !canSubmit}
                  className="flex-1 py-3 rounded-[6px] font-bold bg-red-500 border border-[var(--line)] text-[var(--ink)] hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border border-[var(--line)] border-t-transparent rounded-full animate-spin" />
                      {t('processing')}
                    </span>
                  ) : (
                    t('yesCancelIt')
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// 고객센터 바로가기 배너
function CustomerServiceBanner() {
  const t = useTranslations('mypage')
  return (
    <div className="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[var(--paper)] rounded-full flex items-center justify-center border border-[var(--line)]">
          <Headphones size={20} className="text-[var(--ink)]" />
        </div>
        <div>
          <h3 className="font-black text-[var(--ink)]">{t('customerService')}</h3>
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">{t('customerServiceDesc')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* 전화번호 */}
        <a
          href="tel:02-336-3368"
          className="flex items-center gap-3 bg-[var(--paper)] border border-[var(--line)] rounded-[6px] px-3 py-2.5 transition-all"
        >
          <div className="w-8 h-8 bg-[var(--paper)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
            <Phone size={16} className="text-[var(--ink)]" />
          </div>
          <div className="flex-1">
            <p className="font-black text-[var(--ink)]">02-336-3368</p>
            <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold">{t('tapToCall')}</p>
          </div>
        </a>

        {/* 이메일 */}
        <a
          href="mailto:nadr110619@gmail.com"
          className="flex items-center gap-3 bg-[var(--paper)] border border-[var(--line)] rounded-[6px] px-3 py-2.5 transition-all"
        >
          <div className="w-8 h-8 bg-[var(--paper)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
            <Mail size={16} className="text-[var(--ink)]" />
          </div>
          <div className="flex-1">
            <p className="font-black text-[var(--ink)] text-sm lg:text-base">nadr110619@gmail.com</p>
            <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold">{t('tapToEmail')}</p>
          </div>
        </a>
      </div>

      {/* 운영시간 안내 */}
      <div className="mt-3 bg-[var(--paper)]/60 rounded-[6px] px-3 py-2 border border-[var(--line)]">
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold text-center">
          <span className="text-[var(--ink)]">{t('serviceHours')}</span> · {t('serviceTime')}
        </p>
      </div>
    </div>
  )
}

export function OrderHistory({ orders, loading, error, viewMode, onOrderUpdate }: OrderHistoryProps) {
  const t = useTranslations('mypage')
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[var(--soft)] border border-[var(--line)] rounded-[6px]">
        <div className="w-12 h-12 border-4 border-[var(--line)] border-t-[var(--line)] rounded-full animate-spin mb-4" />
        <p className="font-bold text-[var(--muted-ink)]">{t('loadingOrders')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <CustomerServiceBanner />
        <div className="text-center py-20 bg-[var(--soft)] border border-[var(--line)] rounded-[6px]">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className="text-xl font-black text-[var(--ink)] mb-2">{t('ordersLoadFailed')}</h3>
          <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold mb-5">{error}</p>
          {onOrderUpdate && (
            <button
              onClick={onOrderUpdate}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--paper)] text-[var(--ink)] rounded-[6px] border border-[var(--line)] font-black hover:bg-[var(--soft)] transition-all"
            >
              <RefreshCw size={16} />
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div>
        <CustomerServiceBanner />
        <div className="text-center py-20 bg-[var(--soft)] border border-[var(--line)] rounded-[6px]">
          <div className="w-20 h-20 bg-[var(--soft)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--line)]">
            <Package size={32} className="text-[var(--muted-ink)]" />
          </div>
          <h3 className="text-xl font-black text-[var(--ink)] mb-2">{t('noOrders')}</h3>
          <p className="text-[var(--muted-ink)] font-bold">{t('noOrdersHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <CustomerServiceBanner />
      <div className={viewMode === 'grid'
        ? 'space-y-4'
        : 'space-y-3'
      }>
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              viewMode={viewMode}
              onOrderUpdate={onOrderUpdate}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * 취소 요청/취소 완료 상태에서 환불 진행 상태를 고객에게 명확히 보여주는 카드.
 *  - cancel_requested + 미환불: "환불 처리 중" 안내
 *  - cancelled + 환불 완료: 금액·일시·결제수단별 반영 기간 안내
 *  - cancelled + 미환불 (오염된 상태): 관리자에게 문의 안내
 */
function RefundStatusCard({ order }: { order: Order }) {
  const isBank = order.payment_method === 'bank_transfer'
  const hasPaymentId = !!order.payment_id
  const isRefunded = !!order.refunded_at

  const methodGuide = (() => {
    switch (order.payment_method) {
      case 'card':
        return '신용/체크카드는 카드사 정책에 따라 영업일 기준 3~7일 내에 승인 취소 또는 환급이 반영됩니다.'
      case 'kakao_pay':
        return '카카오페이는 영업일 기준 3~5일 내에 잔액 또는 결제 수단으로 환불됩니다.'
      case 'naver_pay':
        return '네이버페이는 영업일 기준 3~5일 내에 잔액 또는 결제 수단으로 환불됩니다.'
      case 'bank_transfer':
        return '계좌이체는 입금자명 확인 후 지정 계좌로 영업일 기준 3~5일 내에 송금됩니다.'
      default:
        return '결제 수단으로 환불 처리되었습니다.'
    }
  })()

  // cancel_requested: 환불 처리 중
  if (order.status === 'cancel_requested') {
    return (
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
        <div className="flex items-start gap-2">
          <Loader2 size={16} className="text-[var(--muted-ink)] mt-0.5 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs lg:text-sm">
            <p className="font-bold text-[var(--ink)]">환불 처리 중</p>
            <p className="text-[var(--ink)] mt-1 leading-relaxed">
              취소 요청이 접수되어 관리자가 검토·처리 중입니다. {isBank ? '입금하신 계좌로 영업일 기준 3~5일 내 환불됩니다.' : '포트원을 통해 자동 환불되며, 결제 수단별 반영 기간은 아래와 같습니다.'}
            </p>
            {!isBank && (
              <p className="text-[var(--muted-ink)] mt-1 text-[11px] lg:text-[13px]">{methodGuide}</p>
            )}
            {isBank && order.refund_account_number && (
              <p className="text-[var(--ink)] mt-1 text-[11px] lg:text-[13px]">
                환불 계좌: {order.refund_bank_name} {order.refund_account_number} ({order.refund_account_holder})
              </p>
            )}
            {order.cancel_reason && (
              <p className="text-[var(--muted-ink)] mt-1 text-[11px] lg:text-[13px]">
                사유: {order.cancel_reason}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // cancelled + 환불 완료
  if (order.status === 'cancelled' && isRefunded) {
    return (
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
        <div className="flex items-start gap-2">
          <CheckCircle size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs lg:text-sm">
            <p className="font-bold text-[var(--ink)]">
              환불 완료
              {typeof order.refund_amount === 'number' && order.refund_amount > 0 && (
                <span className="ml-2 text-[var(--muted-ink)]">
                  {order.refund_amount.toLocaleString()}원
                </span>
              )}
            </p>
            {order.refunded_at && (
              <p className="text-[var(--ink)] mt-0.5">
                {formatDateTime(order.refunded_at)}
              </p>
            )}
            <p className="text-[var(--muted-ink)] mt-1 leading-relaxed">
              {methodGuide}
            </p>
            {(order.refund_reason || order.cancel_reason) && (
              <p className="text-[var(--muted-ink)] mt-1 text-[11px] lg:text-[13px]">
                사유: {order.refund_reason || order.cancel_reason}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // cancelled + 미환불 (오염된 상태) — 고객에게 문제를 숨기지 않고 명확히 안내
  if (order.status === 'cancelled' && !isRefunded && hasPaymentId) {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-[6px] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs lg:text-sm">
            <p className="font-bold text-red-900">환불 처리 확인 중</p>
            <p className="text-red-800 mt-1 leading-relaxed">
              주문은 취소됐으나 환불 반영이 확인되지 않았습니다. 수분 내 자동으로 반영되며, 계속 보이면 주문번호와 함께 고객센터로 문의해 주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // cancelled + 계좌이체 + 미환불 (수동 송금 대기)
  if (order.status === 'cancelled' && !isRefunded && isBank) {
    return (
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3">
        <div className="flex items-start gap-2">
          <Clock size={16} className="text-[var(--muted-ink)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs lg:text-sm">
            <p className="font-bold text-[var(--ink)]">환불 준비 중</p>
            <p className="text-[var(--ink)] mt-1 leading-relaxed">
              입금하신 계좌로 수동 송금 준비 중입니다. 영업일 기준 3~5일 내 완료됩니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
