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
  Loader2
} from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import { RecipeModal } from './RecipeModal'

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
  status: 'pending' | 'paid' | 'shipping' | 'delivered' | 'cancel_requested' | 'cancelled' | 'awaiting_payment'
  created_at: string
  updated_at: string
  // 새로 추가된 필드
  user_image_url?: string
  keywords?: string[]
  analysis_data?: ImageAnalysisResult
  product_type?: 'image_analysis' | 'figure_diffuser' | 'graduation' | 'signature' | 'chemistry_set' | 'payment_test'
  payment_method?: string
  payment_id?: string | null
  analysis_id?: string  // 분석 결과 ID (레시피 연결용)
  // 환불 관련 (cancelled 상태에서 유효)
  refund_amount?: number | null
  refunded_at?: string | null
  refund_reason?: string | null
  final_price?: number
  cancel_requested_at?: string | null
}

interface OrderHistoryProps {
  orders: Order[]
  loading: boolean
  viewMode: 'grid' | 'list'
  onOrderUpdate?: () => void
}

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  awaiting_payment: {
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    icon: Loader2,
  },
  pending: {
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Clock,
  },
  paid: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: CreditCard,
  },
  shipping: {
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Truck,
  },
  delivered: {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle,
  },
  cancel_requested: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
  },
  cancelled: {
    color: 'bg-slate-100 text-slate-500 border-slate-300',
    icon: Ban,
  }
}

const STATUS_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  awaiting_payment: { labelKey: 'awaitingPayment', descKey: 'awaitingPaymentDesc' },
  pending: { labelKey: 'pending', descKey: 'pendingDesc' },
  paid: { labelKey: 'paid', descKey: 'paidDesc' },
  shipping: { labelKey: 'shipping', descKey: 'shippingDesc' },
  delivered: { labelKey: 'delivered', descKey: 'deliveredDesc' },
  cancel_requested: { labelKey: 'cancelRequested', descKey: 'cancelRequestedDesc' },
  cancelled: { labelKey: 'cancelled', descKey: 'cancelledDesc' },
}

function getPaymentMethodBadge(paymentMethod: string | undefined, tPayment: (key: string) => string) {
  switch (paymentMethod) {
    case 'card':
      return { label: tPayment('card'), className: 'bg-blue-100 text-blue-700' }
    case 'kakao_pay':
      return { label: tPayment('kakaoPay'), className: 'bg-yellow-100 text-yellow-800' }
    case 'naver_pay':
      return { label: tPayment('naverPay'), className: 'bg-green-100 text-green-700' }
    default:
      return { label: tPayment('bankTransferShort'), className: 'bg-gray-100 text-gray-600' }
  }
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
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon
  const statusKeys = STATUS_KEYS[order.status] || STATUS_KEYS.pending

  const hasAnalysisData = !!order.analysis_data
  const canCancel = order.status !== 'cancel_requested' && order.status !== 'cancelled'
  const paymentBadge = getPaymentMethodBadge(order.payment_method, tPayment)
  const statusLabel = order.status === 'paid' && order.payment_method && order.payment_method !== 'bank_transfer'
    ? t('paymentComplete')
    : tStatus(statusKeys.labelKey)
  // 시그니처 상품인지 확인 (키워드에 "시그니처" 포함 여부)
  const isSignatureProduct = order.keywords?.some(k => k.includes('시그니처')) ?? false

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
    setIsLoadingRepurchase(true)

    try {
      if (order.analysis_data) {
        localStorage.setItem('analysisResult', JSON.stringify(order.analysis_data))
      }
      if (order.user_image_url) {
        localStorage.setItem('userImage', order.user_image_url)
      }
      // productType 저장 (졸업 퍼퓸, 피규어 디퓨저 등)
      if (order.product_type) {
        localStorage.setItem('checkoutProductType', order.product_type)
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

  // 주문 취소 핸들러
  const handleCancelOrder = async () => {
    if (isCancelling) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
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
          className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[3px_3px_0px_#000]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 이미지 + 정보 */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* 이미지 썸네일 */}
              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#FEF9C3] border-2 border-slate-900">
                {order.user_image_url ? (
                  <img
                    src={order.user_image_url}
                    alt={t('analysisImage')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star size={20} className="text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{order.order_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${status.color}`}>
                    {statusLabel}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${paymentBadge.className}`}>
                    {paymentBadge.label}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 truncate">{order.perfume_name}</h4>
                <p className="text-sm text-slate-500">{order.size} • {order.price.toLocaleString()}{tCurrency('suffix')}</p>
              </div>
            </div>

            {/* 버튼들 (리스트뷰에서는 간소화) */}
            <div className="flex items-center gap-2">
              {/* 레시피 - 시그니처 상품은 숨김 */}
              {hasAnalysisData && !isSignatureProduct && (
                <button
                  onClick={() => setShowRecipeModal(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-[#FEF9C3] border-2 border-slate-900 rounded-lg hover:shadow-[2px_2px_0px_#000] transition-all"
                >
                  {t('recipe')}
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-all"
                >
                  {t('cancelOrder')}
                </button>
              )}
            </div>
          </div>
          {/* 환불 상태 안내 — 리스트 뷰에서도 표시 */}
          {(order.status === 'cancel_requested' || order.status === 'cancelled') && (
            <div className="mt-3">
              <RefundStatusCard order={order} />
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
        className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#000]"
      >
        {/* 상단 헤더 */}
        <div className="bg-slate-50 border-b-2 border-slate-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{order.order_number}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${paymentBadge.className}`}>
                {paymentBadge.label}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${status.color}`}>
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
            <div className="w-20 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[#FEF9C3] border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
              {order.user_image_url ? (
                <img
                  src={order.user_image_url}
                  alt={t('analysisImage')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Star size={24} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#F472B6] font-bold mb-0.5">{order.perfume_brand}</p>
              <h4 className="font-black text-lg text-slate-900 leading-tight mb-1">{order.perfume_name}</h4>
              <p className="text-sm text-slate-500 font-bold">{order.size}</p>
              <p className="font-black text-lg text-slate-900 mt-1">{order.price.toLocaleString()}{tCurrency('suffix')}</p>
            </div>
          </div>

          {/* 키워드 */}
          {order.keywords && order.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {order.keywords.slice(0, 4).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-full border border-slate-200"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          {/* 배송 정보 */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 truncate">
                {order.address} {order.address_detail}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">{order.recipient_name} • {order.phone}</span>
            </div>
          </div>

          {/* 상태 설명 */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <StatusIcon size={14} />
            <span>{tStatus(statusKeys.descKey)}</span>
          </div>

          {/* 환불 상태 안내 — 취소 요청/취소 완료 시 표시 */}
          {(order.status === 'cancel_requested' || order.status === 'cancelled') && (
            <RefundStatusCard order={order} />
          )}

          {/* 액션 버튼들 */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {/* 분석 상세보기 - 시그니처 상품은 숨김 */}
            {!isSignatureProduct && (
              <button
                onClick={handleViewAnalysis}
                disabled={!hasAnalysisData}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  hasAnalysisData
                    ? 'bg-white border-slate-900 text-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0px_#000]'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
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
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  hasAnalysisData
                    ? 'bg-[#FEF9C3] border-slate-900 text-slate-900 hover:shadow-[2px_2px_0px_#000]'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FlaskConical size={16} />
                {t('recipe')}
              </button>
            )}

            {/* 재구매 */}
            <button
              onClick={handleRepurchase}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-[#FBCFE8] border-2 border-slate-900 text-slate-900 hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              <RefreshCw size={16} />
              {t('repurchase')}
            </button>

            {/* 주문 취소 */}
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={!canCancel}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                canCancel
                  ? 'bg-white border-red-400 text-red-600 hover:bg-red-50'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <XCircle size={16} />
              {order.status === 'cancel_requested' ? t('cancelling') : order.status === 'cancelled' ? t('cancelled') : t('cancelOrder')}
            </button>
          </div>

          {/* 주문일시 */}
          <p className="text-xs text-slate-400 text-right pt-1 border-t border-slate-100">
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
  orderNumber
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  orderNumber: string
}) {
  const t = useTranslations('mypage')
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#000] z-50 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border-2 border-red-300">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="font-black text-xl text-slate-900 mb-2">
                {t('cancelTitle')}
              </h3>
              <p className="text-sm text-slate-500 font-bold mb-1">
                {t('cancelOrderNum', { orderNumber })}
              </p>
              <p className="text-xs text-slate-400 mb-6">
                {t('cancelDesc')}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-100 border-2 border-slate-900 text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  {t('no')}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 border-2 border-slate-900 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
    <div className="bg-gradient-to-r from-[#FEF9C3] to-[#FBCFE8] border-2 border-slate-900 rounded-2xl p-4 mb-4 shadow-[4px_4px_0px_#000]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
          <Headphones size={20} className="text-slate-900" />
        </div>
        <div>
          <h3 className="font-black text-slate-900">{t('customerService')}</h3>
          <p className="text-xs text-slate-600 font-bold">{t('customerServiceDesc')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* 전화번호 */}
        <a
          href="tel:02-336-3368"
          className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-3 py-2.5 hover:shadow-[2px_2px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <div className="w-8 h-8 bg-[#A7F3D0] rounded-lg flex items-center justify-center border border-slate-900">
            <Phone size={16} className="text-slate-900" />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900">02-336-3368</p>
            <p className="text-[10px] text-slate-500 font-bold">{t('tapToCall')}</p>
          </div>
        </a>

        {/* 이메일 */}
        <a
          href="mailto:nadr110619@gmail.com"
          className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-3 py-2.5 hover:shadow-[2px_2px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <div className="w-8 h-8 bg-[#BFDBFE] rounded-lg flex items-center justify-center border border-slate-900">
            <Mail size={16} className="text-slate-900" />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900 text-sm">nadr110619@gmail.com</p>
            <p className="text-[10px] text-slate-500 font-bold">{t('tapToEmail')}</p>
          </div>
        </a>
      </div>

      {/* 운영시간 안내 */}
      <div className="mt-3 bg-white/60 rounded-lg px-3 py-2 border border-slate-300">
        <p className="text-xs text-slate-600 font-bold text-center">
          <span className="text-slate-900">{t('serviceHours')}</span> · {t('serviceTime')}
        </p>
      </div>
    </div>
  )
}

export function OrderHistory({ orders, loading, viewMode, onOrderUpdate }: OrderHistoryProps) {
  const t = useTranslations('mypage')
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-[#F472B6] rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-600">{t('loadingOrders')}</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div>
        <CustomerServiceBanner />
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-[#FEF9C3] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
            <Package size={32} className="text-slate-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">{t('noOrders')}</h3>
          <p className="text-slate-500 font-bold">{t('noOrdersHint')}</p>
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
        return '카카오페이는 영업일 기준 1~3일 내에 잔액 또는 결제 수단으로 환불됩니다.'
      case 'naver_pay':
        return '네이버페이는 영업일 기준 1~3일 내에 잔액 또는 결제 수단으로 환불됩니다.'
      case 'bank_transfer':
        return '계좌이체는 입금자명 확인 후 지정 계좌로 영업일 기준 1~3일 내에 송금됩니다.'
      default:
        return '결제 수단으로 환불 처리되었습니다.'
    }
  })()

  // cancel_requested: 환불 처리 중
  if (order.status === 'cancel_requested') {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Loader2 size={16} className="text-amber-600 mt-0.5 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-amber-900">환불 처리 중</p>
            <p className="text-amber-800 mt-1 leading-relaxed">
              취소 요청이 접수되어 관리자가 검토·처리 중입니다. {isBank ? '입금하신 계좌로 영업일 기준 1~3일 내 환불됩니다.' : '포트원을 통해 자동 환불되며, 결제 수단별 반영 기간은 아래와 같습니다.'}
            </p>
            {!isBank && (
              <p className="text-slate-600 mt-1 text-[11px]">{methodGuide}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // cancelled + 환불 완료
  if (order.status === 'cancelled' && isRefunded) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-emerald-900">
              환불 완료
              {typeof order.refund_amount === 'number' && order.refund_amount > 0 && (
                <span className="ml-2 text-emerald-700">
                  {order.refund_amount.toLocaleString()}원
                </span>
              )}
            </p>
            {order.refunded_at && (
              <p className="text-emerald-800 mt-0.5">
                {formatDateTime(order.refunded_at)}
              </p>
            )}
            <p className="text-slate-600 mt-1 leading-relaxed">
              {methodGuide}
            </p>
            {order.refund_reason && (
              <p className="text-slate-500 mt-1 text-[11px]">
                사유: {order.refund_reason}
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
      <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
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
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-amber-900">환불 준비 중</p>
            <p className="text-amber-800 mt-1 leading-relaxed">
              입금하신 계좌로 수동 송금 준비 중입니다. 영업일 기준 1~3일 내 완료됩니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
