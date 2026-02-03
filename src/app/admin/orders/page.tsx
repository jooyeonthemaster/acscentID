'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Package,
  Clock,
  CreditCard,
  Truck,
  CheckCircle,
  Search,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  Printer,
  Loader2,
  AlertCircle,
  XCircle,
  Image as ImageIcon,
  Box
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from '@/types/admin'

interface OrderAnalysis {
  id: string
  modeling_image_url?: string | null
  modeling_request?: string | null
  product_type?: string | null
  user_image_url?: string | null
}

interface Order {
  id: string
  order_number: string
  user_id: string
  perfume_name: string
  perfume_brand: string
  size: string
  price: number
  shipping_fee: number
  discount_amount: number
  original_price: number
  final_price: number
  recipient_name: string
  phone: string
  zip_code: string
  address: string
  address_detail: string
  memo: string
  status: OrderStatus
  created_at: string
  updated_at: string
  user_coupon_id?: string
  analysis_id?: string
  analysis?: OrderAnalysis | null
  product_type?: string  // 상품 타입 (image_analysis, figure_diffuser, graduation, signature 등)
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusFilters = [
  { value: '', label: '전체', icon: Package },
  { value: 'pending', label: '입금대기', icon: Clock },
  { value: 'paid', label: '입금완료', icon: CreditCard },
  { value: 'shipping', label: '배송중', icon: Truck },
  { value: 'delivered', label: '배송완료', icon: CheckCircle },
  { value: 'cancel_requested', label: '취소요청', icon: XCircle },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // 확장된 행 상태
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 상세 모달
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // 모델링 이미지 모달
  const [modelingOrder, setModelingOrder] = useState<Order | null>(null)

  // 주문 목록 조회
  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const response = await fetch(`/api/admin/orders?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError('관리자 권한이 필요합니다')
          return
        }
        throw new Error(data.error)
      }

      setOrders(data.orders || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError('주문 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, dateFrom, dateTo])

  useEffect(() => {
    fetchOrders()
  }, [])

  // 상태 변경 핸들러
  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      // 로컬 상태 업데이트
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: status as OrderStatus, updated_at: new Date().toISOString() }
            : order
        )
      )
    } catch (err) {
      console.error('Status update failed:', err)
      alert('상태 변경에 실패했습니다')
    }
  }

  // 검색
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchOrders(1)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // 필터 변경
  const handleFilterChange = (status: string) => {
    setStatusFilter(status)
    fetchOrders(1)
  }

  // 필터 초기화
  const clearFilters = () => {
    setStatusFilter('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`
  }

  return (
    <div>
      <AdminHeader
        title="주문 관리"
        subtitle={`총 ${pagination.total}개의 주문`}
      />

      <div className="p-6">
        {/* 검색 및 필터 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-6 shadow-[3px_3px_0px_#e2e8f0]">
          {/* 상태 필터 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {statusFilters.map((filter) => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.value}
                  onClick={() => handleFilterChange(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    statusFilter === filter.value
                      ? 'bg-yellow-400 border-slate-900 text-slate-900 shadow-[2px_2px_0px_#1e293b]'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={14} />
                  {filter.label}
                </button>
              )
            })}
          </div>

          {/* 검색 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="주문번호, 주문자명, 전화번호 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>날짜 필터</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              검색
            </button>
          </div>

          {/* 날짜 필터 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
                필터 초기화
              </button>
            </div>
          )}
        </div>

        {/* 로딩/에러 상태 */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-600">{error}</p>
          </div>
        )}

        {/* 주문 목록 */}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">금액</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상태</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <Fragment key={order.id}>
                      <tr
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      >
                        <td className="px-4 py-3">
                          <ChevronRight
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedId === order.id ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-900">{order.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{order.recipient_name}</div>
                          <div className="text-sm text-slate-500">{order.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900">{order.perfume_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-500">{order.size}</span>
                            {/* 상품 타입 뱃지 */}
                            {(order.product_type === 'figure_diffuser' || order.analysis?.product_type === 'figure_diffuser') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 text-cyan-700 rounded">피규어</span>
                            )}
                            {(order.product_type === 'graduation' || order.analysis?.product_type === 'graduation') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">졸업</span>
                            )}
                            {(order.product_type === 'signature' || order.analysis?.product_type === 'signature') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-100 text-pink-700 rounded">시그니처</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{formatPrice(order.final_price || order.price)}</div>
                          {order.discount_amount > 0 && (
                            <div className="text-xs text-emerald-600">-{formatPrice(order.discount_amount)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleStatusChange(order.id, e.target.value)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-3 py-1 text-sm font-medium rounded-full border-0 cursor-pointer ${ORDER_STATUS_COLORS[order.status]}`}
                          >
                            <option value="pending">입금대기</option>
                            <option value="paid">입금완료</option>
                            <option value="shipping">배송중</option>
                            <option value="delivered">배송완료</option>
                            <option value="cancelled">취소완료</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedOrder(order)
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              title="상세 보기"
                            >
                              <Eye className="w-5 h-5 text-slate-600" />
                            </button>
                            {/* 피규어 디퓨저 모델링 이미지 버튼 */}
                            {(order.product_type === 'figure_diffuser' || order.analysis?.product_type === 'figure_diffuser') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setModelingOrder(order)
                                }}
                                className="p-2 hover:bg-cyan-100 rounded-lg transition-colors"
                                title="모델링 이미지 보기"
                              >
                                <Box className="w-5 h-5 text-cyan-600" />
                              </button>
                            )}
                            {order.analysis_id && (
                              <Link
                                href={`/admin/analysis/${order.analysis_id}/print`}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="보고서 출력"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Printer className="w-5 h-5 text-slate-600" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 확장된 상세 정보 */}
                      {expandedId === order.id && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-slate-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">배송지:</span>
                                <p className="text-slate-900 mt-1">
                                  [{order.zip_code}] {order.address}
                                  {order.address_detail && ` ${order.address_detail}`}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500">배송메모:</span>
                                <p className="text-slate-900 mt-1">{order.memo || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">배송비:</span>
                                <p className="text-slate-900 mt-1">{formatPrice(order.shipping_fee || 0)}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">수정일:</span>
                                <p className="text-slate-900 mt-1">{formatDate(order.updated_at)}</p>
                              </div>
                            </div>
                            {/* 모델링 이미지 (피규어 디퓨저) */}
                            {(order.product_type === 'figure_diffuser' || order.analysis?.product_type === 'figure_diffuser') && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <ImageIcon className="w-5 h-5 text-cyan-600" />
                                  <span className="font-medium text-slate-900">3D 모델링용 참조 이미지</span>
                                  <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">피규어 디퓨저</span>
                                </div>
                                <div className="flex gap-6">
                                  {order.analysis?.modeling_image_url ? (
                                    <div className="flex-shrink-0">
                                      <a
                                        href={order.analysis.modeling_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                                          <Image
                                            src={order.analysis.modeling_image_url}
                                            alt="모델링 참조 이미지"
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      </a>
                                      <p className="text-xs text-slate-500 mt-1 text-center">클릭하여 원본 보기</p>
                                    </div>
                                  ) : (
                                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-100">
                                      <span className="text-xs text-slate-400 text-center px-2">이미지 없음</span>
                                    </div>
                                  )}
                                  {order.analysis?.modeling_request && (
                                    <div className="flex-1">
                                      <span className="text-slate-500 text-xs">모델링 요청사항:</span>
                                      <p className="text-slate-900 mt-1 bg-white p-3 rounded-lg border border-slate-200">
                                        {order.analysis.modeling_request}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">주문이 없습니다</p>
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => fetchOrders(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchOrders(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}

        {/* 상세 모달 */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">주문 상세</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">주문번호</label>
                    <p className="font-mono text-slate-900">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">주문일</label>
                    <p className="text-slate-900">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">상품 정보</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">상품명</label>
                      <p className="text-slate-900">{selectedOrder.perfume_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">용량/타입</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900">{selectedOrder.size}</span>
                        {(selectedOrder.product_type === 'figure_diffuser' || selectedOrder.analysis?.product_type === 'figure_diffuser') && (
                          <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">피규어 디퓨저</span>
                        )}
                        {(selectedOrder.product_type === 'graduation' || selectedOrder.analysis?.product_type === 'graduation') && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">졸업 퍼퓸</span>
                        )}
                        {(selectedOrder.product_type === 'signature' || selectedOrder.analysis?.product_type === 'signature') && (
                          <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-700 rounded-full">시그니처</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">상품가</label>
                      <p className="text-slate-900">{formatPrice(selectedOrder.price)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">배송비</label>
                      <p className="text-slate-900">{formatPrice(selectedOrder.shipping_fee || 0)}</p>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div>
                        <label className="text-sm text-slate-500">할인</label>
                        <p className="text-emerald-600">-{formatPrice(selectedOrder.discount_amount)}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-slate-500">최종금액</label>
                      <p className="text-lg font-bold text-slate-900">{formatPrice(selectedOrder.final_price || selectedOrder.price)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">배송 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-slate-500">받는분</label>
                      <p className="text-slate-900">{selectedOrder.recipient_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">연락처</label>
                      <p className="text-slate-900">{selectedOrder.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">주소</label>
                      <p className="text-slate-900">
                        [{selectedOrder.zip_code}] {selectedOrder.address}
                        {selectedOrder.address_detail && ` ${selectedOrder.address_detail}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">배송메모</label>
                      <p className="text-slate-900">{selectedOrder.memo || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 모델링 이미지 (피규어 디퓨저) */}
                {(selectedOrder.product_type === 'figure_diffuser' || selectedOrder.analysis?.product_type === 'figure_diffuser') && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-cyan-600" />
                      3D 모델링용 참조 이미지
                    </h4>
                    <div className="flex gap-4">
                      {selectedOrder.analysis?.modeling_image_url ? (
                        <a
                          href={selectedOrder.analysis.modeling_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block flex-shrink-0"
                        >
                          <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                            <Image
                              src={selectedOrder.analysis.modeling_image_url}
                              alt="모델링 참조 이미지"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 text-center">클릭하여 원본 보기</p>
                        </a>
                      ) : (
                        <div className="w-40 h-40 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-100">
                          <span className="text-sm text-slate-400">이미지 없음</span>
                        </div>
                      )}
                      {selectedOrder.analysis?.modeling_request && (
                        <div className="flex-1">
                          <label className="text-sm text-slate-500">모델링 요청사항</label>
                          <p className="text-slate-900 mt-1 bg-slate-50 p-3 rounded-lg">
                            {selectedOrder.analysis.modeling_request}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex justify-end">
                  {selectedOrder.analysis_id && (
                    <Link
                      href={`/admin/analysis/${selectedOrder.analysis_id}/print`}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <Printer className="w-5 h-5" />
                      보고서 출력
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모델링 이미지 전용 모달 */}
        {modelingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-lg font-bold text-slate-900">3D 모델링 참조 이미지</h3>
                  <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">피규어 디퓨저</span>
                </div>
                <button
                  onClick={() => setModelingOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {/* 주문 정보 요약 */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">주문번호: <span className="font-mono text-slate-900">{modelingOrder.order_number}</span></span>
                    <span className="text-slate-500">주문자: <span className="font-medium text-slate-900">{modelingOrder.recipient_name}</span></span>
                  </div>
                </div>

                {/* 모델링 이미지 */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">참조 이미지</label>
                  {modelingOrder.analysis?.modeling_image_url ? (
                    <a
                      href={modelingOrder.analysis.modeling_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative w-full max-w-md mx-auto aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                        <Image
                          src={modelingOrder.analysis.modeling_image_url}
                          alt="모델링 참조 이미지"
                          fill
                          className="object-contain bg-slate-100"
                        />
                      </div>
                      <p className="text-sm text-cyan-600 text-center mt-2 hover:underline">클릭하여 원본 이미지 열기 ↗</p>
                    </a>
                  ) : (
                    <div className="w-full max-w-md mx-auto aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-100">
                      <span className="text-slate-400">이미지 없음</span>
                    </div>
                  )}
                </div>

                {/* 모델링 요청사항 */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">고객 요청사항</label>
                  {modelingOrder.analysis?.modeling_request ? (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-900 whitespace-pre-wrap">{modelingOrder.analysis.modeling_request}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-400">
                      요청사항 없음
                    </div>
                  )}
                </div>

                {/* 하단 버튼 */}
                <div className="mt-6 flex justify-end gap-3">
                  {modelingOrder.analysis?.modeling_image_url && (
                    <a
                      href={modelingOrder.analysis.modeling_image_url}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ImageIcon className="w-4 h-4" />
                      이미지 다운로드
                    </a>
                  )}
                  <button
                    onClick={() => setModelingOrder(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
