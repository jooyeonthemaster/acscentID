'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Package,
  Inbox,
  PackageCheck,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  MessageSquare,
  Save,
  Check,
  QrCode,
  Copy,
  Printer,
  ImageIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import {
  OFFLINE_SHIPPING_STATUS_LABELS,
  type OfflineShippingStatus,
} from '@/lib/admin/offline-shipping-filters'
import {
  ShipQrBanner,
  BANNER_WIDTH,
  BANNER_HEIGHT,
  BANNER_PRINT_SCALE,
} from './ShipQrBanner'

// 매장 QR이 가리킬 접수 폼 URL — 프로덕션 도메인 고정 (admin이 localhost에서 봐도 인쇄/스캔 시 정상)
const SHIP_FORM_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr'}/ship`

interface ShippingRequest {
  id: string
  request_number: string
  created_at: string
  updated_at: string
  name: string
  phone: string
  zip_code: string | null
  address: string
  address_detail: string | null
  product_name: string | null
  memo: string | null
  status: OfflineShippingStatus
  admin_memo: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_COLORS: Record<OfflineShippingStatus, string> = {
  received: 'bg-amber-100 text-amber-700',
  preparing: 'bg-indigo-100 text-indigo-700',
  shipping: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-700',
}

const statusFilters: { value: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: '', label: '전체', icon: Package },
  { value: 'received', label: '접수완료', icon: Inbox },
  { value: 'preparing', label: '상품준비중', icon: PackageCheck },
  { value: 'shipping', label: '배송중', icon: Truck },
  { value: 'delivered', label: '배송완료', icon: CheckCircle },
  { value: 'cancelled', label: '접수취소', icon: XCircle },
]

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullAddress(request: ShippingRequest) {
  const zip = request.zip_code ? `[${request.zip_code}] ` : ''
  const detail = request.address_detail ? ` ${request.address_detail}` : ''
  return `${zip}${request.address}${detail}`
}

export default function AdminOfflineShippingPage() {
  const [requests, setRequests] = useState<ShippingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // 확장된 행
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 엑셀 다운로드 로딩
  const [courierExcelLoading, setCourierExcelLoading] = useState(false)
  const [summaryExcelLoading, setSummaryExcelLoading] = useState(false)

  // 체크박스 선택 (삭제 / 선택 내보내기)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 관리자 메모
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState<string | null>(null)

  // QR 안내 패널
  const [showQr, setShowQr] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  // 인쇄용 A5 배너
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showBanner, setShowBanner] = useState(false)
  const [bannerSaving, setBannerSaving] = useState<'png' | 'jpg' | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const initialFetched = useRef(false)

  // QR 이미지를 로컬에서 생성 — 외부 QR API 이미지는 배너를 이미지로 구울 때
  // CORS로 차단되므로 data URL 이어야 한다. 인쇄 원본 기준으로 넉넉하게 키운다.
  useEffect(() => {
    QRCode.toDataURL(SHIP_FORM_URL, {
      width: 760,
      margin: 0,
      errorCorrectionLevel: 'Q', // 인쇄물이 긁히거나 일부 가려져도 스캔되도록 여유를 둔다
      color: { dark: '#191918', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR 생성 실패:', err))
  }, [])

  // 접수 목록 조회
  // overrides — 필터 버튼 클릭처럼 setState 직후 바로 조회해야 할 때 stale closure를 회피한다.
  const fetchRequests = useCallback(async (
    page = 1,
    overrides?: { status?: string }
  ) => {
    setLoading(true)
    setError(null)

    const effectiveStatus = overrides?.status ?? statusFilter

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (effectiveStatus) params.set('status', effectiveStatus)
      if (search) params.set('search', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const response = await fetch(`/api/admin/offline-shipping?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError('관리자 권한이 필요합니다')
          return
        }
        throw new Error(data.error)
      }

      setRequests(data.requests || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch offline shipping requests:', err)
      setError('접수 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, dateFrom, dateTo])

  useEffect(() => {
    if (initialFetched.current) return
    initialFetched.current = true
    fetchRequests()
  }, [fetchRequests])

  // 상태 변경
  const handleStatusChange = async (requestId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/offline-shipping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setRequests(prev =>
        prev.map(item =>
          item.id === requestId
            ? { ...item, status: status as OfflineShippingStatus, updated_at: new Date().toISOString() }
            : item
        )
      )
    } catch (err) {
      console.error('Status update failed:', err)
      alert('상태 변경에 실패했습니다')
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchRequests(1)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleFilterChange = (status: string) => {
    setStatusFilter(status)
    fetchRequests(1, { status })
  }

  const clearFilters = () => {
    setStatusFilter('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(requests.map(r => r.id)) : new Set())
  }

  const handleSelectOne = (requestId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(requestId)
      } else {
        next.delete(requestId)
      }
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `선택한 ${selectedIds.size}건의 접수를 정말 삭제하시겠습니까?\n\n삭제된 접수는 복구할 수 없습니다.`
    )
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      const response = await fetch('/api/admin/offline-shipping', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: Array.from(selectedIds) }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      alert(`${data.deletedCount}건의 접수가 삭제되었습니다.`)
      setSelectedIds(new Set())
      fetchRequests(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '접수 삭제에 실패했습니다')
    } finally {
      setDeleteLoading(false)
    }
  }

  const startEditMemo = (request: ShippingRequest) => {
    setEditingMemoId(request.id)
    setMemoText(request.admin_memo || '')
  }

  const saveMemo = async (requestId: string) => {
    setMemoSaving(true)
    try {
      const response = await fetch('/api/admin/offline-shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, admin_memo: memoText }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setRequests(prev =>
        prev.map(item => (item.id === requestId ? { ...item, admin_memo: memoText } : item))
      )
      setEditingMemoId(null)
      setMemoSaved(requestId)
      setTimeout(() => setMemoSaved(null), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : '메모 저장에 실패했습니다')
    } finally {
      setMemoSaving(false)
    }
  }

  // 현재 필터 / 선택 상태를 쿼리스트링으로 — 엑셀 두 종류가 공유
  const buildExportParams = () => {
    const params = new URLSearchParams()
    if (selectedIds.size > 0) {
      params.set('ids', Array.from(selectedIds).join(','))
    } else {
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
    }
    return params
  }

  // 택배사 접수 양식 — 온라인 주문 「출고대상 엑셀」과 동일한 컬럼 구성
  const downloadCourierExcel = async () => {
    setCourierExcelLoading(true)
    try {
      const params = buildExportParams()
      // 상태 지정이 없으면 출고 대상(접수완료 + 상품준비중)만
      if (!params.has('ids') && !params.has('status')) {
        params.set('status', 'received,preparing')
      }
      params.set('limit', '1000')

      const response = await fetch(`/api/admin/offline-shipping?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      const list: ShippingRequest[] = data.requests || []
      if (list.length === 0) {
        alert('출고 대상 접수(접수완료/상품준비중)가 없습니다.')
        return
      }

      const excelData = list.map(request => ({
        '받는분주소(전체, 분할)': formatFullAddress(request),
        '받는분성명': request.name,
        '받는분전화번호': request.phone,
        '받는분기타연락처': '',
        '배송메세지1': request.memo || '',
        '내품명': request.product_name || '향수',
        '내품수량': 1,
        '접수번호': request.request_number,
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)
      worksheet['!cols'] = [
        { wch: 50 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 18 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '오프라인택배접수')

      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `오프라인_택배접수_택배사양식_${today}.xlsx`)
    } catch (err) {
      console.error('Courier excel download failed:', err)
      alert(err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다.')
    } finally {
      setCourierExcelLoading(false)
    }
  }

  // 배송 약식 엑셀 — 서버에서 생성 (선택 건이 있으면 그 건만, 없으면 현재 필터 전체)
  const downloadSummaryExcel = async () => {
    setSummaryExcelLoading(true)
    try {
      const response = await fetch(`/api/admin/offline-shipping/export?${buildExportParams()}`)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '엑셀 생성에 실패했습니다')
      }

      if (response.headers.get('X-Request-Count') === '0') {
        alert('조건에 해당하는 접수가 없습니다.')
        return
      }

      // 서버가 지정한 파일명(UTF-8 인코딩) 사용, 실패 시 기본값
      const disposition = response.headers.get('Content-Disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1]
      const fileName = encodedName ? decodeURIComponent(encodedName) : '오프라인_택배접수.xlsx'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Summary excel download failed:', err)
      alert(err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다.')
    } finally {
      setSummaryExcelLoading(false)
    }
  }

  // 파일 저장 공통 — blob → 다운로드
  const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // A5 인쇄용 배너 이미지 저장 — 437×620 노드를 scale 4로 구워 1748×2480(300DPI)
  const downloadBanner = async (format: 'png' | 'jpg') => {
    if (!bannerRef.current || bannerSaving) return
    setBannerSaving(format)
    try {
      // 무거운 라이브러리라 버튼을 누를 때만 불러온다
      const { domToBlob } = await import('modern-screenshot')
      const blob = await domToBlob(bannerRef.current, {
        type: format === 'png' ? 'image/png' : 'image/jpeg',
        quality: format === 'jpg' ? 0.95 : undefined,
        scale: BANNER_PRINT_SCALE,
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        backgroundColor: '#FFFFFF', // JPG는 알파가 없어 배경을 명시해야 검게 나오지 않는다
      })
      saveBlob(blob, `매장_택배접수_안내배너_A5.${format}`)
    } catch (err) {
      console.error('Banner export failed:', err)
      alert('배너 이미지를 만드는 데 실패했습니다. 새로고침 후 다시 시도해주세요.')
    } finally {
      setBannerSaving(null)
    }
  }

  const copyFormUrl = async () => {
    try {
      await navigator.clipboard.writeText(SHIP_FORM_URL)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch {
      alert(`복사에 실패했습니다. 직접 복사해주세요:\n${SHIP_FORM_URL}`)
    }
  }

  return (
    <div>
      <AdminHeader
        title="오프라인 배송 접수"
        subtitle={`총 ${pagination.total}건의 접수`}
      />

      <div className="p-6">
        {/* 매장 QR 안내 */}
        <div className="mb-6 rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50">
              <QrCode className="h-4 w-4 text-slate-900" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-black text-slate-900">손님용 접수 폼</p>
              <p className="mt-0.5 break-all font-mono text-xs text-slate-600">{SHIP_FORM_URL}</p>
            </div>
            <button
              onClick={copyFormUrl}
              className="flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            >
              {urlCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {urlCopied ? '복사됨' : 'URL 복사'}
            </button>
            <button
              onClick={() => setShowQr(!showQr)}
              className="flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            >
              <QrCode className="h-4 w-4" />
              {showQr ? 'QR 닫기' : 'QR 보기'}
            </button>
            <button
              onClick={() => setShowBanner(true)}
              disabled={!qrDataUrl}
              className="flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-yellow-400 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              title="A5 비율 안내 배너를 PNG·JPG로 저장해 바로 인쇄"
            >
              <Printer className="h-4 w-4" />
              인쇄용 배너
            </button>
          </div>
          {showQr && (
            <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-200 pt-4">
              {/* QR 이미지 — qrcode 로 로컬 생성 (배너 이미지화 시 CORS 회피) */}
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="매장 택배 접수 QR"
                  width={240}
                  height={240}
                  className="rounded-lg border-2 border-slate-200 bg-white p-2"
                />
              ) : (
                <div className="flex h-[240px] w-[240px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              <p className="text-xs font-medium text-slate-600">
                QR만 필요하면 이미지를 우클릭해 저장하세요. 매장 비치용은 <span className="font-bold">인쇄용 배너</span>를 권합니다.
              </p>
            </div>
          )}
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-6">
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
                      ? 'bg-yellow-400 border-slate-900 text-slate-900'
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
                  placeholder="접수번호, 이름, 전화번호, 상품 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
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
              className="px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 transition-all"
            >
              검색
            </button>

            <button
              onClick={downloadCourierExcel}
              disabled={courierExcelLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg border-2 border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedIds.size > 0
                  ? `선택한 ${selectedIds.size}건을 택배사 접수 양식으로 다운로드`
                  : '출고 대상 접수(접수완료 + 상품준비중)를 택배사 접수 양식으로 다운로드'
              }
            >
              {courierExcelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              택배사 양식{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>

            <button
              onClick={downloadSummaryExcel}
              disabled={summaryExcelLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg border-2 border-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedIds.size > 0
                  ? `선택한 ${selectedIds.size}건을 배송 약식 엑셀로 다운로드`
                  : '현재 필터(상태·검색어·기간)에 해당하는 접수 전체를 배송 약식 엑셀로 다운로드'
              }
            >
              {summaryExcelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              배송 약식 엑셀{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg border-2 border-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
                필터 초기화
              </button>
              <p className="text-xs text-slate-500">
                기간을 목록에 적용하려면 <span className="font-bold">검색</span>을 누르세요. <span className="font-bold">엑셀</span>은 여기 입력한 기간이 바로 반영됩니다.
              </p>
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

        {/* 접수 목록 */}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <table className="w-full md:min-w-[720px]">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="w-10 px-2 md:px-4 py-3">
                      <input
                        type="checkbox"
                        checked={requests.length > 0 && selectedIds.size === requests.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                      />
                    </th>
                    <th className="w-10 px-2 md:px-4 py-3"></th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-medium text-slate-600">받는분</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">주소</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">상품</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-medium text-slate-600">상태</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">접수일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <Fragment key={request.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(request.id) ? 'bg-yellow-50' : ''}`}
                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                      >
                        <td className="px-2 md:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(request.id)}
                            onChange={(e) => handleSelectOne(request.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                          />
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <ChevronRight
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedId === request.id ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <div className="font-medium text-slate-900">{request.name}</div>
                          <div className="text-sm text-slate-500">{request.phone}</div>
                          <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                              오프라인
                            </span>
                            {request.admin_memo && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700"
                                title={request.admin_memo}
                              >
                                <MessageSquare size={10} /> 메모
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3">
                          <div className="text-sm text-slate-900">{formatFullAddress(request)}</div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3">
                          {request.product_name ? (
                            <span className="text-slate-900">{request.product_name}</span>
                          ) : (
                            <span className="text-sm text-slate-400">미입력</span>
                          )}
                        </td>
                        <td className="px-2 md:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={request.status}
                            onChange={(e) => handleStatusChange(request.id, e.target.value)}
                            className={`px-3 py-1 text-sm font-medium rounded-full border-0 cursor-pointer ${STATUS_COLORS[request.status]}`}
                          >
                            {(Object.keys(OFFLINE_SHIPPING_STATUS_LABELS) as OfflineShippingStatus[]).map(status => (
                              <option key={status} value={status}>
                                {OFFLINE_SHIPPING_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-slate-600">
                          {formatDate(request.created_at)}
                        </td>
                      </tr>

                      {/* 확장된 상세 정보 */}
                      {expandedId === request.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-slate-50">
                            {/* 모바일 전용 요약 — md 미만에서 숨겨진 컬럼 정보 */}
                            <div className="md:hidden mb-4 pb-4 border-b border-slate-200 space-y-2 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500 shrink-0">주소</span>
                                <span className="text-slate-900 text-right">{formatFullAddress(request)}</span>
                              </div>
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500 shrink-0">상품</span>
                                <span className="text-slate-900 text-right">{request.product_name || '미입력'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 shrink-0">접수일</span>
                                <span className="text-slate-900">{formatDate(request.created_at)}</span>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">접수번호</span>
                                  <span className="font-mono text-slate-900 break-all">{request.request_number}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">받는분</span>
                                  <span className="text-slate-900">{request.name}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">연락처</span>
                                  <span className="text-slate-900">{request.phone}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">우편번호</span>
                                  <span className="text-slate-900">{request.zip_code || '-'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">주소</span>
                                  <span className="text-slate-900 text-right">{request.address}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">상세주소</span>
                                  <span className="text-slate-900 text-right">{request.address_detail || '-'}</span>
                                </div>
                                {request.memo && (
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">고객 요청</span>
                                    <span className="text-slate-900 text-right">{request.memo}</span>
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-slate-500 shrink-0">최종 수정</span>
                                  <span className="text-slate-900">{formatDate(request.updated_at)}</span>
                                </div>
                              </div>

                              {/* 관리자 메모 */}
                              <div className="rounded-lg border-2 border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                  <MessageSquare className="h-4 w-4 text-slate-500" />
                                  관리자 메모
                                  {memoSaved === request.id && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                      <Check className="h-3 w-3" /> 저장됨
                                    </span>
                                  )}
                                </div>
                                {editingMemoId === request.id ? (
                                  <>
                                    <textarea
                                      value={memoText}
                                      onChange={(e) => setMemoText(e.target.value)}
                                      rows={4}
                                      placeholder="내부 확인용 메모 (상품 확인, 운송장 번호 등)"
                                      className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-yellow-400 focus:outline-none"
                                    />
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        onClick={() => saveMemo(request.id)}
                                        disabled={memoSaving}
                                        className="flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-yellow-400 px-3 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-50"
                                      >
                                        {memoSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                        저장
                                      </button>
                                      <button
                                        onClick={() => setEditingMemoId(null)}
                                        className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p className="min-h-[3rem] whitespace-pre-wrap text-sm text-slate-700">
                                      {request.admin_memo || <span className="text-slate-400">메모 없음</span>}
                                    </p>
                                    <button
                                      onClick={() => startEditMemo(request)}
                                      className="mt-2 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                                    >
                                      메모 {request.admin_memo ? '수정' : '작성'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">조건에 해당하는 접수가 없습니다</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => fetchRequests(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchRequests(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}

        {/* 인쇄용 A5 배너 미리보기 + 다운로드 */}
        {showBanner && qrDataUrl && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
            onClick={() => setShowBanner(false)}
          >
            <div
              className="my-auto w-full max-w-[520px] rounded-xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">매장 비치용 안내 배너</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A5(148 × 210mm) · 저장 시 {BANNER_WIDTH * BANNER_PRINT_SCALE} × {BANNER_HEIGHT * BANNER_PRINT_SCALE}px (300DPI)
                  </p>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="flex justify-center bg-slate-100 p-5">
                {/* 캡처 원본은 437×620 그대로 두고, 화면에서만 축소해 보여준다 */}
                <div
                  style={{
                    width: BANNER_WIDTH * 0.85,
                    height: BANNER_HEIGHT * 0.85,
                  }}
                >
                  <div
                    style={{
                      transform: 'scale(0.85)',
                      transformOrigin: 'top left',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    }}
                  >
                    <ShipQrBanner ref={bannerRef} qrDataUrl={qrDataUrl} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBanner('png')}
                    disabled={bannerSaving !== null}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-slate-900 bg-yellow-400 px-4 py-2.5 font-medium text-slate-900 disabled:opacity-50"
                  >
                    {bannerSaving === 'png' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    PNG 다운로드
                  </button>
                  <button
                    onClick={() => downloadBanner('jpg')}
                    disabled={bannerSaving !== null}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {bannerSaving === 'jpg' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    JPG 다운로드
                  </button>
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                  인쇄소·사진 인화는 <span className="font-bold">PNG</span>(선명함), 카톡·메일 전달은{' '}
                  <span className="font-bold">JPG</span>(용량 작음)를 쓰세요. 가정용 프린터에서는 A4 용지에 &lsquo;용지에 맞추기&rsquo;로 출력하면 A5 크기로 나옵니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
