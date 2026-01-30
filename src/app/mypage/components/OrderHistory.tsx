'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  AlertTriangle
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
  status: 'pending' | 'paid' | 'shipping' | 'delivered' | 'cancel_requested' | 'cancelled'
  created_at: string
  updated_at: string
  // 새로 추가된 필드
  user_image_url?: string
  keywords?: string[]
  analysis_data?: ImageAnalysisResult
  product_type?: 'image_analysis' | 'figure_diffuser' | 'graduation' | 'signature'
}

interface OrderHistoryProps {
  orders: Order[]
  loading: boolean
  viewMode: 'grid' | 'list'
  onOrderUpdate?: () => void
}

const statusConfig = {
  pending: {
    label: '입금대기',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Clock,
    description: '입금을 기다리고 있습니다'
  },
  paid: {
    label: '입금완료',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: CreditCard,
    description: '입금이 확인되었습니다'
  },
  shipping: {
    label: '배송중',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Truck,
    description: '상품이 배송 중입니다'
  },
  delivered: {
    label: '배송완료',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle,
    description: '배송이 완료되었습니다'
  },
  cancel_requested: {
    label: '취소요청',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
    description: '취소 요청이 접수되었습니다'
  },
  cancelled: {
    label: '취소완료',
    color: 'bg-slate-100 text-slate-500 border-slate-300',
    icon: Ban,
    description: '주문이 취소되었습니다'
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
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  const hasAnalysisData = !!order.analysis_data
  const canCancel = order.status !== 'cancel_requested' && order.status !== 'cancelled'
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

  // 재구매 핸들러
  const handleRepurchase = () => {
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
    router.push('/checkout')
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
        alert(data.error || '취소 요청에 실패했습니다')
      }
    } catch (error) {
      console.error('Cancel order error:', error)
      alert('서버 오류가 발생했습니다')
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
                    alt="분석 이미지"
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
                    {status.label}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 truncate">{order.perfume_name}</h4>
                <p className="text-sm text-slate-500">{order.size} • {order.price.toLocaleString()}원</p>
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
                  레시피
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-all"
                >
                  취소
                </button>
              )}
            </div>
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
            <span className="font-mono text-xs text-slate-500">{order.order_number}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
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
                  alt="분석 이미지"
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
              <p className="font-black text-lg text-slate-900 mt-1">{order.price.toLocaleString()}원</p>
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
            <span>{status.description}</span>
          </div>

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
                분석 상세
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
                레시피
              </button>
            )}

            {/* 재구매 */}
            <button
              onClick={handleRepurchase}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-[#FBCFE8] border-2 border-slate-900 text-slate-900 hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              <RefreshCw size={16} />
              재구매
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
              {order.status === 'cancel_requested' ? '취소중' : order.status === 'cancelled' ? '취소됨' : '주문취소'}
            </button>
          </div>

          {/* 주문일시 */}
          <p className="text-xs text-slate-400 text-right pt-1 border-t border-slate-100">
            주문일: {formatDate(order.created_at)}
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
                주문을 취소하시겠습니까?
              </h3>
              <p className="text-sm text-slate-500 font-bold mb-1">
                주문번호: {orderNumber}
              </p>
              <p className="text-xs text-slate-400 mb-6">
                취소 요청 후 관리자 확인을 거쳐 취소가 완료됩니다.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-100 border-2 border-slate-900 text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  아니오
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 border-2 border-slate-900 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      처리중
                    </span>
                  ) : (
                    '네, 취소합니다'
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

export function OrderHistory({ orders, loading, viewMode, onOrderUpdate }: OrderHistoryProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-[#F472B6] rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-600">주문 내역 불러오는 중...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-[#FEF9C3] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
          <Package size={32} className="text-slate-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">주문 내역이 없습니다</h3>
        <p className="text-slate-500 font-bold">아직 주문한 향수가 없어요.</p>
      </div>
    )
  }

  return (
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
  )
}
