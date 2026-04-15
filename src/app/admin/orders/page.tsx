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
  Box,
  Download,
  Trash2,
  MessageSquare,
  Save,
  Check,
  UserCheck
} from 'lucide-react'
import * as XLSX from 'xlsx'
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

interface OrderItemData {
  id: string
  order_id: string
  analysis_id: string | null
  product_type: string
  perfume_name: string
  perfume_brand: string | null
  twitter_name: string | null
  size: string
  unit_price: number
  quantity: number
  subtotal: number
  image_url: string | null
  analysis: OrderAnalysis | null
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
  product_type?: string
  payment_method?: string
  payment_id?: string | null
  receipt_url?: string | null
  refund_amount?: number
  refunded_at?: string | null
  admin_memo?: string | null
  is_influencer?: boolean
  item_count?: number
  order_items?: OrderItemData[]
  confirmed_recipe?: {
    granules?: Array<{ id: string; name: string; ratio: number }>
    [key: string]: any
  } | null
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

const PAYMENT_METHOD_BADGE: Record<string, { label: string; className: string }> = {
  bank_transfer: { label: '계좌이체', className: 'bg-slate-100 text-slate-600' },
  card: { label: '카드', className: 'bg-blue-100 text-blue-600' },
  kakao_pay: { label: '카카오페이', className: 'bg-yellow-100 text-yellow-700' },
  naver_pay: { label: '네이버페이', className: 'bg-green-100 text-green-600' },
}

// [FIX] HIGH: chemistry_set 뱃지 추가
const PRODUCT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  image_analysis: { label: '이미지분석', className: 'bg-blue-100 text-blue-700' },
  figure_diffuser: { label: '피규어', className: 'bg-cyan-100 text-cyan-700' },
  graduation: { label: '졸업', className: 'bg-purple-100 text-purple-700' },
  signature: { label: '시그니처', className: 'bg-pink-100 text-pink-700' },
  chemistry_set: { label: '케미', className: 'bg-violet-100 text-violet-700' },
  personal_scent: { label: '퍼스널', className: 'bg-emerald-100 text-emerald-700' },
}

function getProductBadge(type?: string | null) {
  return type ? PRODUCT_TYPE_BADGE[type] : null
}

function getPaymentBadge(method?: string) {
  const badge = method ? PAYMENT_METHOD_BADGE[method] : undefined
  return badge ?? { label: '계좌이체', className: 'bg-slate-100 text-slate-600' }
}

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
  const [influencerFilter, setInfluencerFilter] = useState<'' | 'true' | 'false'>('')
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

  // 엑셀 다운로드 로딩
  const [excelLoading, setExcelLoading] = useState(false)

  // 체크박스 선택 (삭제용)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 관리자 메모
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState<string | null>(null)

  // 주문 목록 조회
  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      if (influencerFilter) params.set('influencer', influencerFilter)
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
  }, [statusFilter, influencerFilter, search, dateFrom, dateTo])

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

  // 인플루언서 토글 핸들러
  const handleInfluencerToggle = async (orderId: string, isInfluencer: boolean) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, is_influencer: isInfluencer })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, is_influencer: isInfluencer }
            : order
        )
      )
    } catch (err) {
      console.error('Influencer toggle failed:', err)
      alert('인플루언서 설정 변경에 실패했습니다')
    }
  }

  // 인플루언서 필터 변경
  const handleInfluencerFilterChange = (value: '' | 'true' | 'false') => {
    setInfluencerFilter(value)
    fetchOrders(1)
  }

  // 필터 초기화
  const clearFilters = () => {
    setStatusFilter('')
    setInfluencerFilter('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  // 환불 처리
  const handleRefund = async (order: Order) => {
    const reason = window.prompt('환불 사유를 입력하세요:')
    if (!reason) return

    try {
      const response = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '환불 처리에 실패했습니다')
      }

      alert('환불이 완료되었습니다')
      fetchOrders(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '환불 처리에 실패했습니다')
    }
  }

  // 체크박스 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(orders.map(o => o.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // 개별 체크박스 선택/해제
  const handleSelectOne = (orderId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(orderId)
      } else {
        next.delete(orderId)
      }
      return next
    })
  }

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `선택한 ${selectedIds.size}개의 주문을 정말 삭제하시겠습니까?\n\n삭제된 주문은 복구할 수 없습니다.`
    )
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedIds) })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      const data = await response.json()
      alert(`${data.deletedCount}개의 주문이 삭제되었습니다.`)
      setSelectedIds(new Set())
      fetchOrders(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문 삭제에 실패했습니다')
    } finally {
      setDeleteLoading(false)
    }
  }

  // 관리자 메모 편집 시작
  const startEditMemo = (order: Order) => {
    setEditingMemoId(order.id)
    setMemoText(order.admin_memo || '')
  }

  // 관리자 메모 저장
  const saveMemo = async (orderId: string) => {
    setMemoSaving(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, admin_memo: memoText })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      // 로컬 상태 업데이트
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, admin_memo: memoText }
            : order
        )
      )
      setEditingMemoId(null)
      setMemoSaved(orderId)
      setTimeout(() => setMemoSaved(null), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : '메모 저장에 실패했습니다')
    } finally {
      setMemoSaving(false)
    }
  }

  // 입금완료 주문 엑셀 다운로드
  const downloadPaidOrdersExcel = async () => {
    setExcelLoading(true)
    try {
      // 입금완료 상태 주문 전체 조회
      const response = await fetch('/api/admin/orders?status=paid&export=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      const paidOrders = data.orders || []

      if (paidOrders.length === 0) {
        alert('입금완료 상태의 주문이 없습니다.')
        return
      }

      // 엑셀 데이터 생성
      const excelData = paidOrders.map((order: Order) => {
        // 전체 주소 조합
        const fullAddress = `[${order.zip_code}] ${order.address}${order.address_detail ? ' ' + order.address_detail : ''}`

        // 내품명 결정 (피규어 디퓨저면 "디퓨저", 그 외는 "향수")
        const productType = order.product_type || order.analysis?.product_type
        const itemName = productType === 'figure_diffuser' ? '디퓨저' : '향수'

        return {
          '받는분주소(전체, 분할)': fullAddress,
          '받는분성명': order.recipient_name,
          '받는분전화번호': order.phone,
          '받는분기타연락처': '',
          '배송메세지1': order.memo || '',
          '내품명': itemName,
          '내품수량': 1,
          '인플루언서': order.is_influencer ? 'Y' : '',
          '주문번호': order.order_number,
        }
      })

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // 열 너비 설정
      worksheet['!cols'] = [
        { wch: 50 },  // 받는분주소
        { wch: 12 },  // 받는분성명
        { wch: 15 },  // 받는분전화번호
        { wch: 15 },  // 받는분기타연락처
        { wch: 25 },  // 배송메세지1
        { wch: 10 },  // 내품명
        { wch: 10 },  // 내품수량
        { wch: 10 },  // 인플루언서
        { wch: 25 },  // 주문번호
      ]

      // 워크북 생성
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '입금완료주문')

      // 파일명 생성 (오늘 날짜)
      const today = new Date().toISOString().split('T')[0]
      const fileName = `입금완료_주문_${today}.xlsx`

      // 다운로드
      XLSX.writeFile(workbook, fileName)

    } catch (err) {
      console.error('Excel download failed:', err)
      alert('엑셀 다운로드에 실패했습니다.')
    } finally {
      setExcelLoading(false)
    }
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

            {/* 인플루언서 필터 구분선 */}
            <div className="w-px h-8 bg-slate-200 mx-1" />

            <button
              onClick={() => handleInfluencerFilterChange(influencerFilter === 'true' ? '' : 'true')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                influencerFilter === 'true'
                  ? 'bg-rose-400 border-rose-700 text-white shadow-[2px_2px_0px_#be123c]'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}
            >
              <UserCheck size={14} />
              인플루언서
            </button>
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

            <button
              onClick={downloadPaidOrdersExcel}
              disabled={excelLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg border-2 border-emerald-700 shadow-[3px_3px_0px_#047857] hover:shadow-[1px_1px_0px_#047857] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="입금완료 상태 주문만 엑셀로 다운로드"
            >
              {excelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              입금완료 엑셀
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg border-2 border-red-700 shadow-[3px_3px_0px_#b91c1c] hover:shadow-[1px_1px_0px_#b91c1c] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                선택 삭제 ({selectedIds.size})
              </button>
            )}
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
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && selectedIds.size === orders.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                      />
                    </th>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">금액</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상태</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">인플루언서</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">주문일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <Fragment key={order.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(order.id) ? 'bg-yellow-50' : ''}`}
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedId === order.id ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-900">{order.order_number}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getPaymentBadge(order.payment_method).className}`}>
                              {getPaymentBadge(order.payment_method).label}
                            </span>
                            {order.refunded_at && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-600">환불됨</span>
                            )}
                          </div>
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
                            {order.confirmed_recipe && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">커스텀레시피</span>
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
                            <option value="cancel_requested">취소요청</option>
                            <option value="cancelled">취소완료</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleInfluencerToggle(order.id, !order.is_influencer)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                              order.is_influencer
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
                            }`}
                            title={order.is_influencer ? '인플루언서 해제' : '인플루언서로 설정'}
                          >
                            <UserCheck size={12} />
                            {order.is_influencer ? '인플루언서' : '-'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* 환불 처리 버튼 - 취소요청/입금완료 상태 & PG결제 & 미환불 */}
                            {order.payment_id && !order.refunded_at && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRefund(order)
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                title="PG 결제 환불"
                              >
                                환불
                              </button>
                            )}
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
                            {/* 단일 상품: 기존 버튼 유지 */}
                            {(!order.item_count || order.item_count <= 1) && (
                              <>
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
                              </>
                            )}
                            {/* 다중 상품: 펼쳐서 확인 안내 */}
                            {order.item_count && order.item_count > 1 && (
                              <span className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                                {order.item_count}건 ▼
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 확장된 상세 정보 */}
                      {expandedId === order.id && (
                        <tr>
                          <td colSpan={9} className="px-4 py-4 bg-slate-50">
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
                            {/* 개별 상품 목록 (다중 상품 주문) */}
                            {order.item_count && order.item_count > 1 && order.order_items && order.order_items.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Package className="w-5 h-5 text-amber-600" />
                                  <span className="font-bold text-slate-900">주문 상품 목록</span>
                                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                                    {order.order_items.length}건
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {order.order_items.map((item, idx) => {
                                    const badge = getProductBadge(item.product_type)
                                    const isFigure = item.product_type === 'figure_diffuser'
                                    return (
                                      <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                                        {/* 상품 기본 정보 */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">
                                              {idx + 1}
                                            </span>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{item.perfume_name}</span>
                                                {badge && (
                                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.className}`}>
                                                    {badge.label}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-slate-500 mt-0.5">
                                                {item.size} · {item.quantity}개 · {formatPrice(item.unit_price)}
                                                {item.quantity > 1 && ` = ${formatPrice(item.subtotal)}`}
                                              </p>
                                            </div>
                                          </div>
                                          {/* 액션 버튼 */}
                                          <div className="flex items-center gap-1">
                                            {item.analysis_id && (
                                              <Link
                                                href={`/admin/analysis/${item.analysis_id}/print`}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title={`${item.perfume_name} 보고서 출력`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Printer className="w-4 h-4 text-slate-600" />
                                              </Link>
                                            )}
                                            {isFigure && item.analysis?.modeling_image_url && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setModelingOrder({
                                                    ...order,
                                                    analysis: item.analysis,
                                                    perfume_name: item.perfume_name,
                                                  })
                                                }}
                                                className="p-2 hover:bg-cyan-100 rounded-lg transition-colors"
                                                title={`${item.perfume_name} 모델링 이미지`}
                                              >
                                                <Box className="w-4 h-4 text-cyan-600" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {/* 피규어 디퓨저: 모델링 참조 이미지 인라인 */}
                                        {isFigure && (
                                          <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                              <ImageIcon className="w-4 h-4 text-cyan-600" />
                                              <span className="text-xs font-medium text-slate-600">3D 모델링 참조 이미지</span>
                                            </div>
                                            <div className="flex gap-4">
                                              {item.analysis?.modeling_image_url ? (
                                                <a
                                                  href={item.analysis.modeling_image_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex-shrink-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                                                    <Image
                                                      src={item.analysis.modeling_image_url}
                                                      alt={`${item.perfume_name} 모델링 참조`}
                                                      fill
                                                      className="object-cover"
                                                    />
                                                  </div>
                                                  <p className="text-[10px] text-slate-400 mt-1 text-center">원본 보기</p>
                                                </a>
                                              ) : (
                                                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                                  <span className="text-[10px] text-slate-400 text-center px-1">이미지 없음</span>
                                                </div>
                                              )}
                                              {item.analysis?.modeling_request && (
                                                <div className="flex-1 min-w-0">
                                                  <span className="text-[11px] text-slate-500">모델링 요청사항:</span>
                                                  <p className="text-sm text-slate-900 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200 whitespace-pre-wrap">
                                                    {item.analysis.modeling_request}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {/* 커스텀 조향 레시피 (제조용) */}
                            {order.confirmed_recipe?.granules && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-base">🧪</span>
                                  <span className="text-sm font-bold text-slate-900">커스텀 조향 레시피</span>
                                  <span className="text-xs text-slate-400">({order.size} 기준)</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600">
                                        <th className="px-3 py-2 text-left font-medium">향료 ID</th>
                                        <th className="px-3 py-2 text-left font-medium">향료명</th>
                                        <th className="px-3 py-2 text-center font-medium">비율</th>
                                        <th className="px-3 py-2 text-center font-medium">방울 수</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.confirmed_recipe.granules.map((g: any, idx: number) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{g.id}</td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{g.name}</td>
                                          <td className="px-3 py-2 text-center font-bold text-amber-600">{g.ratio}%</td>
                                          <td className="px-3 py-2 text-center font-bold text-slate-700">{g.drops || '-'}방울</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {/* 관리자 메모 */}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">관리자 메모</span>
                                {memoSaved === order.id && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <Check className="w-3 h-3" />
                                    저장됨
                                  </span>
                                )}
                              </div>
                              {editingMemoId === order.id ? (
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="주문에 대한 메모를 입력하세요..."
                                    className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400 resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => saveMemo(order.id)}
                                      disabled={memoSaving}
                                      className="px-3 py-1.5 text-xs font-medium bg-yellow-400 text-slate-900 rounded-lg border-2 border-slate-900 hover:shadow-[2px_2px_0px_#1e293b] transition-all disabled:opacity-50"
                                    >
                                      {memoSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => setEditingMemoId(null)}
                                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditMemo(order)
                                  }}
                                  className="px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-yellow-400 transition-colors min-h-[40px] flex items-center"
                                >
                                  {order.admin_memo ? (
                                    <span className="text-slate-900 whitespace-pre-wrap">{order.admin_memo}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">클릭하여 메모 입력...</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* 결제 정보 및 환불 */}
                            {order.payment_id && (
                              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-sm">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPaymentBadge(order.payment_method).className}`}>
                                    {getPaymentBadge(order.payment_method).label}
                                  </span>
                                  {order.receipt_url && (
                                    <a
                                      href={order.receipt_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-xs"
                                    >
                                      영수증 보기
                                    </a>
                                  )}
                                  {order.refunded_at && (
                                    <span className="text-xs text-red-500">
                                      환불완료 ({formatDate(order.refunded_at)})
                                      {order.refund_amount != null && ` - ${formatPrice(order.refund_amount)}`}
                                    </span>
                                  )}
                                </div>
                                {!order.refunded_at && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRefund(order)
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    환불 처리
                                  </button>
                                )}
                              </div>
                            )}
                            {/* 모델링 이미지 (단일 상품 피규어 디퓨저) - 다중 상품은 위 개별 목록에서 표시 */}
                            {(!order.item_count || order.item_count <= 1) && (order.product_type === 'figure_diffuser' || order.analysis?.product_type === 'figure_diffuser') && (
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

                {selectedOrder.is_influencer && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <UserCheck size={16} className="text-rose-600" />
                    <span className="text-sm font-medium text-rose-700">인플루언서 주문 (매출 집계 제외)</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">상품 정보</h4>

                  {/* 다중 상품: 개별 아이템 목록 */}
                  {selectedOrder.item_count && selectedOrder.item_count > 1 && selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {selectedOrder.order_items.map((item, idx) => {
                        const badge = getProductBadge(item.product_type)
                        const isFigure = item.product_type === 'figure_diffuser'
                        return (
                          <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold rounded-md">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900 text-sm">{item.perfume_name}</span>
                                    {badge && (
                                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">{item.size} · {item.quantity}개 · {formatPrice(item.unit_price)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {item.analysis_id && (
                                  <Link
                                    href={`/admin/analysis/${item.analysis_id}/print`}
                                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                    title={`${item.perfume_name} 보고서`}
                                  >
                                    <Printer className="w-4 h-4 text-slate-600" />
                                  </Link>
                                )}
                              </div>
                            </div>
                            {/* 피규어: 모델링 이미지 */}
                            {isFigure && item.analysis?.modeling_image_url && (
                              <div className="mt-2 pt-2 border-t border-slate-200 flex gap-3">
                                <a href={item.analysis.modeling_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-cyan-400 transition-colors">
                                    <Image src={item.analysis.modeling_image_url} alt={`${item.perfume_name} 모델링`} fill className="object-cover" />
                                  </div>
                                </a>
                                {item.analysis.modeling_request && (
                                  <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex-1">{item.analysis.modeling_request}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* 단일 상품: 기존 표시 */
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-slate-500">상품명</label>
                        <p className="text-slate-900">{selectedOrder.perfume_name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">용량/타입</label>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900">{selectedOrder.size}</span>
                          {(() => {
                            const badge = getProductBadge(selectedOrder.product_type || selectedOrder.analysis?.product_type)
                            return badge ? <span className={`px-2 py-0.5 text-xs rounded-full ${badge.className}`}>{badge.label}</span> : null
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 금액 정보 (공통) */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
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

                {/* 커스텀 조향 레시피 */}
                {selectedOrder.confirmed_recipe && selectedOrder.confirmed_recipe.granules && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">🧪</span>
                      커스텀 조향 레시피
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.confirmed_recipe.granules.map((g: any) => (
                          <span
                            key={g.id}
                            className="text-xs px-2.5 py-1 bg-white border border-green-300 rounded-full text-green-800 font-medium"
                          >
                            {g.name} {g.ratio}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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

                {/* 관리자 메모 */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                    관리자 메모
                  </h4>
                  {editingMemoId === selectedOrder.id ? (
                    <div className="flex gap-2">
                      <textarea
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder="주문에 대한 메모를 입력하세요..."
                        className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            saveMemo(selectedOrder.id)
                            // 모달의 selectedOrder도 업데이트
                            setSelectedOrder(prev => prev ? { ...prev, admin_memo: memoText } : null)
                          }}
                          disabled={memoSaving}
                          className="px-3 py-2 text-xs font-medium bg-yellow-400 text-slate-900 rounded-lg border-2 border-slate-900 hover:shadow-[2px_2px_0px_#1e293b] transition-all disabled:opacity-50"
                        >
                          {memoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingMemoId(null)}
                          className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEditMemo(selectedOrder)}
                      className="px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-yellow-400 transition-colors min-h-[48px] flex items-center"
                    >
                      {selectedOrder.admin_memo ? (
                        <span className="text-slate-900 whitespace-pre-wrap">{selectedOrder.admin_memo}</span>
                      ) : (
                        <span className="text-slate-400 italic">클릭하여 메모 입력...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 모델링 이미지 (단일 상품 피규어 디퓨저) - 다중 상품은 위 상품 목록에서 표시 */}
                {(!selectedOrder.item_count || selectedOrder.item_count <= 1) && (selectedOrder.product_type === 'figure_diffuser' || selectedOrder.analysis?.product_type === 'figure_diffuser') && (
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

                {/* 결제 정보 및 환불 */}
                {selectedOrder.payment_id && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-slate-600" />
                      결제 정보
                    </h4>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded ${getPaymentBadge(selectedOrder.payment_method).className}`}>
                        {getPaymentBadge(selectedOrder.payment_method).label}
                      </span>
                      {selectedOrder.receipt_url && (
                        <a
                          href={selectedOrder.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          영수증 보기
                        </a>
                      )}
                      {selectedOrder.refunded_at ? (
                        <span className="text-sm text-red-500">
                          환불완료 ({formatDate(selectedOrder.refunded_at)})
                          {selectedOrder.refund_amount != null && ` - ${formatPrice(selectedOrder.refund_amount)}`}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRefund(selectedOrder)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          환불 처리
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex justify-end gap-2 flex-wrap">
                  {/* 다중 상품: 개별 보고서 버튼들 */}
                  {selectedOrder.item_count && selectedOrder.item_count > 1 && selectedOrder.order_items ? (
                    selectedOrder.order_items
                      .filter(item => item.analysis_id)
                      .map((item, idx) => (
                        <Link
                          key={item.id}
                          href={`/admin/analysis/${item.analysis_id}/print`}
                          className="flex items-center gap-2 px-3 py-2 bg-yellow-400 text-slate-900 text-sm font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                          <Printer className="w-4 h-4" />
                          {item.perfume_name} 보고서
                        </Link>
                      ))
                  ) : (
                    /* 단일 상품: 기존 버튼 */
                    selectedOrder.analysis_id && (
                      <Link
                        href={`/admin/analysis/${selectedOrder.analysis_id}/print`}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <Printer className="w-5 h-5" />
                        보고서 출력
                      </Link>
                    )
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
