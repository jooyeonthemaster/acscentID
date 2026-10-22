'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Receipt,
  Inbox,
  BadgeCheck,
  Banknote,
  XCircle,
  Search,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  MessageSquare,
  Save,
  Check,
  QrCode,
  Copy,
  ImageIcon,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import QRCode from 'qrcode'
import {
  OFFLINE_PROOF_STATUS_LABELS,
  OFFLINE_PROOF_STATUSES,
  type OfflineProofStatus,
} from '@/lib/admin/offline-proof-filters'
import {
  REFUND_TYPE_LABELS,
  formatItems,
  type OfflineProofProduct,
} from '@/lib/offline-proof'
import { ProductManager } from './ProductManager'
import { RefundPanel, type RefundSaved, type RefundTarget } from './RefundPanel'

// 손님용 제출 폼 URL — 프로덕션 도메인 고정 (admin이 localhost에서 봐도 공유/스캔 시 정상)
const PROOF_FORM_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr'}/proof`

interface ProofRequest extends RefundTarget {
  id: string
  request_number: string
  created_at: string
  updated_at: string
  name: string
  phone: string
  bank_name: string
  account_number: string
  payment_date: string
  payment_amount: number
  image_paths: string[]
  /** 관리자 API 가 붙여 주는 서명 주소 (2시간) */
  image_urls: (string | null)[]
  /** 같은 계좌번호로 들어온 다른 접수 수 */
  duplicate_count: number
  status: OfflineProofStatus
  admin_memo: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_COLORS: Record<OfflineProofStatus, string> = {
  received: 'bg-amber-100 text-amber-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-700',
}

const statusFilters: { value: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: '', label: '전체', icon: Receipt },
  { value: 'received', label: '접수완료', icon: Inbox },
  { value: 'approved', label: '확인완료', icon: BadgeCheck },
  { value: 'paid', label: '입금완료', icon: Banknote },
  { value: 'rejected', label: '반려', icon: XCircle },
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

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatPaymentDate(date: string) {
  return date.replace(/-/g, '.')
}

function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

export default function AdminOfflineProofsPage() {
  const [requests, setRequests] = useState<ProofRequest[]>([])
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
  const [productFilter, setProductFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // 증빙 상품 (상품 관리 카드가 읽어 준다 — 상품 필터용)
  const [products, setProducts] = useState<OfflineProofProduct[]>([])

  // 확장된 행
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 엑셀 다운로드 로딩
  const [excelLoading, setExcelLoading] = useState(false)

  // 체크박스 선택 (일괄 상태 변경 / 삭제 / 선택 내보내기)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<OfflineProofStatus>('approved')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkRefundLoading, setBulkRefundLoading] = useState<'full' | 'difference' | null>(null)

  // 관리자 메모
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState<string | null>(null)

  // 계좌번호 복사 표시
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null)

  // 사진 크게 보기
  const [viewer, setViewer] = useState<{ urls: string[]; index: number; title: string } | null>(null)

  // 폼 안내 패널
  const [showQr, setShowQr] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const initialFetched = useRef(false)

  useEffect(() => {
    QRCode.toDataURL(PROOF_FORM_URL, {
      width: 760,
      margin: 2,
      errorCorrectionLevel: 'Q',
      color: { dark: '#191918', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR 생성 실패:', err))
  }, [])

  // 접수 목록 조회
  // overrides — 필터 버튼 클릭처럼 setState 직후 바로 조회해야 할 때 stale closure를 회피한다.
  const fetchRequests = useCallback(async (
    page = 1,
    overrides?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; product?: string }
  ) => {
    setLoading(true)
    setError(null)

    const effectiveStatus = overrides?.status ?? statusFilter
    const effectiveSearch = overrides?.search ?? search
    const effectiveDateFrom = overrides?.dateFrom ?? dateFrom
    const effectiveDateTo = overrides?.dateTo ?? dateTo
    const effectiveProduct = overrides?.product ?? productFilter

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (effectiveStatus) params.set('status', effectiveStatus)
      if (effectiveSearch) params.set('search', effectiveSearch)
      if (effectiveDateFrom) params.set('date_from', effectiveDateFrom)
      if (effectiveDateTo) params.set('date_to', effectiveDateTo)
      if (effectiveProduct) params.set('product', effectiveProduct)

      const response = await fetch(`/api/admin/offline-proofs?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError('관리자 권한이 필요합니다')
          return
        }
        if (response.status === 503) {
          setError(data.error)
          return
        }
        throw new Error(data.error)
      }

      setRequests(data.requests || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch offline proofs:', err)
      setError('접수 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, dateFrom, dateTo, productFilter])

  useEffect(() => {
    if (initialFetched.current) return
    initialFetched.current = true
    fetchRequests()
  }, [fetchRequests])

  // 사진 보기 — 키보드 ←/→/Esc
  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null)
      if (e.key === 'ArrowRight') setViewer(v => v && { ...v, index: (v.index + 1) % v.urls.length })
      if (e.key === 'ArrowLeft') setViewer(v => v && { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  const applyStatusLocally = (ids: string[], status: OfflineProofStatus) => {
    const idSet = new Set(ids)
    const now = new Date().toISOString()
    setRequests(prev =>
      prev.map(item => (idSet.has(item.id) ? { ...item, status, updated_at: now } : item))
    )
  }

  // 상태 변경 (한 건)
  const handleStatusChange = async (requestId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/offline-proofs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      applyStatusLocally([requestId], status as OfflineProofStatus)
    } catch (err) {
      console.error('Status update failed:', err)
      alert('상태 변경에 실패했습니다')
    }
  }

  // 상태 변경 (선택한 여러 건) — 예: 엑셀로 대량이체 후 한 번에 입금완료
  const handleBulkStatus = async () => {
    if (selectedIds.size === 0) return
    const label = OFFLINE_PROOF_STATUS_LABELS[bulkStatus]
    if (!window.confirm(`선택한 ${selectedIds.size}건을 '${label}'(으)로 바꿀까요?`)) return

    setBulkLoading(true)
    try {
      const ids = Array.from(selectedIds)
      const response = await fetch('/api/admin/offline-proofs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: ids, status: bulkStatus }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      applyStatusLocally(ids, bulkStatus)
      setSelectedIds(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다')
    } finally {
      setBulkLoading(false)
    }
  }

  // 환불 금액 일괄 지정 — 접수마다 서버가 계산 (차액을 계산할 수 없는 접수는 건너뜀)
  const handleBulkRefund = async (refundType: 'full' | 'difference') => {
    if (selectedIds.size === 0) return
    const label = refundType === 'full' ? '전액(결제 금액 그대로)' : '차액(결제 금액 − 기준 가격 × 수량)'
    if (!window.confirm(`선택한 ${selectedIds.size}건의 환불 금액을 ${label}으로 정할까요?`)) return

    setBulkRefundLoading(refundType)
    try {
      const response = await fetch('/api/admin/offline-proofs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: Array.from(selectedIds), refund_type: refundType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      const byId = new Map<string, { refund_type: RefundTarget['refund_type']; refund_amount: number | null }>(
        (data.updated || []).map((item: { id: string; refund_type: RefundTarget['refund_type']; refund_amount: number | null }) => [item.id, item])
      )
      setRequests(prev =>
        prev.map(item => {
          const updated = byId.get(item.id)
          return updated ? { ...item, ...updated, updated_at: data.updated_at } : item
        })
      )
      if (data.skipped > 0) {
        alert(`${data.skipped}건은 상품 기준 가격이 없어 차액을 계산하지 못했습니다.\n증빙 상품 관리에서 기준 가격을 입력한 뒤 다시 시도하세요.`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '환불 금액 저장에 실패했습니다')
    } finally {
      setBulkRefundLoading(null)
    }
  }

  const handleRefundSaved = (requestId: string, saved: RefundSaved) => {
    setRequests(prev => prev.map(item => (item.id === requestId ? { ...item, ...saved } : item)))
  }

  const handleProductFilterChange = (product: string) => {
    setProductFilter(product)
    setSelectedIds(new Set())
    fetchRequests(1, { product })
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
    setProductFilter('')
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
      `선택한 ${selectedIds.size}건의 접수를 정말 삭제하시겠습니까?\n\n증빙 사진도 함께 지워지며 복구할 수 없습니다.`
    )
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      const response = await fetch('/api/admin/offline-proofs', {
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

  const startEditMemo = (request: ProofRequest) => {
    setEditingMemoId(request.id)
    setMemoText(request.admin_memo || '')
  }

  const saveMemo = async (requestId: string) => {
    setMemoSaving(true)
    try {
      const response = await fetch('/api/admin/offline-proofs', {
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

  // 엑셀 — 서버에서 생성 (선택 건이 있으면 그 건만, 없으면 현재 필터 전체)
  const downloadExcel = async () => {
    setExcelLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedIds.size > 0) {
        params.set('ids', Array.from(selectedIds).join(','))
      } else {
        if (statusFilter) params.set('status', statusFilter)
        if (search) params.set('search', search)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (productFilter) params.set('product', productFilter)
      }

      const response = await fetch(`/api/admin/offline-proofs/export?${params}`)

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
      const fileName = encodedName ? decodeURIComponent(encodedName) : '오프라인_결제증빙.xlsx'

      saveBlob(await response.blob(), fileName)
    } catch (err) {
      console.error('Offline proof excel download failed:', err)
      alert(err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다.')
    } finally {
      setExcelLoading(false)
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

  const downloadQr = async () => {
    if (!qrDataUrl) return
    saveBlob(await (await fetch(qrDataUrl)).blob(), '오프라인_결제증빙_QR.png')
  }

  const copyFormUrl = async () => {
    try {
      await navigator.clipboard.writeText(PROOF_FORM_URL)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch {
      alert(`복사에 실패했습니다. 직접 복사해주세요:\n${PROOF_FORM_URL}`)
    }
  }

  const copyAccount = async (request: ProofRequest) => {
    try {
      await navigator.clipboard.writeText(request.account_number)
      setCopiedAccountId(request.id)
      setTimeout(() => setCopiedAccountId(null), 2000)
    } catch {
      alert(`복사에 실패했습니다. 직접 복사해주세요:\n${request.account_number}`)
    }
  }

  const openViewer = (request: ProofRequest, index: number) => {
    const urls = request.image_urls.filter((url): url is string => !!url)
    if (urls.length === 0) return
    setViewer({ urls, index: Math.min(index, urls.length - 1), title: `${request.name} · ${request.request_number}` })
  }

  return (
    <div>
      <AdminHeader
        title="오프라인 결제 증빙"
        subtitle={`총 ${pagination.total}건의 접수`}
      />

      <div className="p-6">
        {/* 손님용 폼 안내 */}
        <div className="mb-6 rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50">
              <QrCode className="h-4 w-4 text-slate-900" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-black text-slate-900">손님용 증빙 제출 폼</p>
              <p className="mt-0.5 break-all font-mono text-xs text-slate-600">{PROOF_FORM_URL}</p>
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
          </div>
          {showQr && (
            <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-200 pt-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="오프라인 결제 증빙 제출 QR"
                  width={220}
                  height={220}
                  className="rounded-lg border-2 border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              <button
                onClick={downloadQr}
                disabled={!qrDataUrl}
                className="flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-yellow-400 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
                QR 이미지 저장
              </button>
            </div>
          )}
        </div>

        {/* 증빙 상품 관리 — 손님 폼 구매 상품 목록 + 차액 계산용 기준 가격 */}
        <ProductManager
          onLoaded={setProducts}
          onPricesChanged={() => fetchRequests(pagination.page)}
        />

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
            {products.length > 0 && (
              <select
                value={productFilter}
                onChange={(e) => handleProductFilterChange(e.target.value)}
                aria-label="상품별 보기"
                className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-yellow-400"
              >
                <option value="">상품 전체</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.is_active ? '' : ' (숨김)'}
                  </option>
                ))}
              </select>
            )}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="접수번호, 이름, 전화번호, 은행, 계좌번호 검색..."
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
              onClick={downloadExcel}
              disabled={excelLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg border-2 border-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedIds.size > 0
                  ? `선택한 ${selectedIds.size}건을 엑셀로 다운로드`
                  : '현재 필터(상태·상품·검색어·기간)에 해당하는 접수 전체를 엑셀로 다운로드'
              }
            >
              {excelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              엑셀 다운로드{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
          </div>

          {/* 선택 작업 */}
          {selectedIds.size > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-900">{selectedIds.size}건 선택</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as OfflineProofStatus)}
                className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-yellow-400"
              >
                {OFFLINE_PROOF_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {OFFLINE_PROOF_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkStatus}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 text-sm font-medium rounded-lg border-2 border-slate-900 disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                상태 일괄 변경
              </button>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <span className="text-sm text-slate-600">환불 금액</span>
              <button
                onClick={() => handleBulkRefund('full')}
                disabled={bulkRefundLoading !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-900 text-sm font-medium rounded-lg border-2 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {bulkRefundLoading === 'full' && <Loader2 className="w-4 h-4 animate-spin" />}
                전액으로
              </button>
              <button
                onClick={() => handleBulkRefund('difference')}
                disabled={bulkRefundLoading !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-900 text-sm font-medium rounded-lg border-2 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {bulkRefundLoading === 'difference' && <Loader2 className="w-4 h-4 animate-spin" />}
                차액으로
              </button>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <button
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg border-2 border-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                선택 삭제
              </button>
            </div>
          )}

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
                기간은 <span className="font-bold">접수일</span> 기준입니다. 목록에 적용하려면 <span className="font-bold">검색</span>을 누르세요. <span className="font-bold">엑셀</span>은 여기 입력한 기간이 바로 반영됩니다.
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
            <p className="text-slate-600 text-center">{error}</p>
          </div>
        )}

        {/* 접수 목록 */}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <table className="w-full md:min-w-[1080px]">
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
                    <th className="w-16 px-2 md:px-4 py-3 text-left text-sm font-medium text-slate-600">증빙</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-medium text-slate-600">이름(예금주)</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">구매 상품</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">계좌</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">결제일 · 금액</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">환불 금액</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-medium text-slate-600">상태</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-slate-600">접수일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => {
                    const firstUrl = request.image_urls.find(Boolean)
                    return (
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
                          <td className="px-2 md:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {firstUrl ? (
                              <button
                                onClick={() => openViewer(request, 0)}
                                className="relative block h-14 w-11 overflow-hidden rounded-md border-2 border-slate-200 bg-slate-100"
                                title="사진 크게 보기"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={firstUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                                {request.image_urls.length > 1 && (
                                  <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[10px] font-bold text-white">
                                    {request.image_urls.length}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="flex h-14 w-11 items-center justify-center rounded-md border-2 border-dashed border-slate-200 text-slate-300">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-2 md:px-4 py-3">
                            <div className="font-medium text-slate-900">{request.name}</div>
                            <div className="text-sm text-slate-500">{request.phone}</div>
                            {/* 모바일 — 숨겨진 상품·금액 컬럼 대신 */}
                            <div className="md:hidden text-sm text-slate-700">{formatItems(request.items)}</div>
                            <div className="md:hidden text-sm font-bold text-slate-900">
                              {formatWon(request.payment_amount)}
                              <span className="ml-1.5 font-medium text-slate-500">
                                → 환불 {request.refund_amount !== null ? formatWon(request.refund_amount) : '미정'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                              {request.duplicate_count > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700"
                                  title="같은 계좌번호로 들어온 다른 접수가 있습니다 — 계좌번호로 검색해 확인하세요"
                                >
                                  <AlertTriangle size={10} /> 같은 계좌 {request.duplicate_count}건 더
                                </span>
                              )}
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
                            {request.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {request.items.map(item => (
                                  <div key={item.product_id} className="text-sm text-slate-900 whitespace-nowrap">
                                    {item.name} <span className="text-slate-500">× {item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">미선택</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <div className="text-sm text-slate-500">{request.bank_name}</div>
                            <div className="font-mono text-sm text-slate-900">{request.account_number}</div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <div className="text-sm text-slate-500">{formatPaymentDate(request.payment_date)}</div>
                            <div className="font-bold text-slate-900">{formatWon(request.payment_amount)}</div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            {request.refund_type && request.refund_amount !== null ? (
                              <>
                                <div className="text-sm text-slate-500">{REFUND_TYPE_LABELS[request.refund_type]}</div>
                                <div className="font-bold text-emerald-700">{formatWon(request.refund_amount)}</div>
                              </>
                            ) : (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700">미정</span>
                            )}
                          </td>
                          <td className="px-2 md:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={request.status}
                              onChange={(e) => handleStatusChange(request.id, e.target.value)}
                              className={`px-3 py-1 text-sm font-medium rounded-full border-0 cursor-pointer ${STATUS_COLORS[request.status]}`}
                            >
                              {OFFLINE_PROOF_STATUSES.map(status => (
                                <option key={status} value={status}>
                                  {OFFLINE_PROOF_STATUS_LABELS[status]}
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
                            <td colSpan={10} className="px-4 py-4 bg-slate-50">
                              {/* 증빙 사진 — 결제 날짜·금액을 입력값과 대조 */}
                              <div className="mb-4 flex flex-wrap gap-3">
                                {request.image_urls.map((url, index) =>
                                  url ? (
                                    <button
                                      key={index}
                                      onClick={() => openViewer(request, index)}
                                      className="h-56 w-40 overflow-hidden rounded-lg border-2 border-slate-200 bg-white hover:border-slate-400"
                                      title="사진 크게 보기"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt={`증빙 사진 ${index + 1}`} className="h-full w-full object-contain" />
                                    </button>
                                  ) : (
                                    <div
                                      key={index}
                                      className="flex h-56 w-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-3 text-center text-xs text-slate-400"
                                    >
                                      사진을 불러오지 못했습니다
                                    </div>
                                  )
                                )}
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">접수번호</span>
                                    <span className="font-mono text-slate-900 break-all">{request.request_number}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">결제일</span>
                                    <span className="text-slate-900">{formatPaymentDate(request.payment_date)}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">결제 금액</span>
                                    <span className="font-bold text-slate-900">{formatWon(request.payment_amount)}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">구매 상품</span>
                                    <span className="text-slate-900 text-right">{request.items.length > 0 ? formatItems(request.items) : '미선택'}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">이름(예금주)</span>
                                    <span className="text-slate-900">{request.name}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">연락처</span>
                                    <span className="text-slate-900">{request.phone}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">은행</span>
                                    <span className="text-slate-900">{request.bank_name}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">계좌번호</span>
                                    <span className="flex items-center gap-2">
                                      <span className="font-mono text-slate-900 break-all">{request.account_number}</span>
                                      <button
                                        onClick={() => copyAccount(request)}
                                        className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                                      >
                                        {copiedAccountId === request.id ? (
                                          <Check className="h-3 w-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                        {copiedAccountId === request.id ? '복사됨' : '복사'}
                                      </button>
                                    </span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">접수일</span>
                                    <span className="text-slate-900">{formatDate(request.created_at)}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">최종 수정</span>
                                    <span className="text-slate-900">{formatDate(request.updated_at)}</span>
                                  </div>
                                  {request.duplicate_count > 0 && (
                                    <button
                                      onClick={() => {
                                        // 상태 필터·기간을 비운 채 계좌번호로 바로 조회
                                        setSearch(request.account_number)
                                        setStatusFilter('')
                                        setDateFrom('')
                                        setDateTo('')
                                        setSelectedIds(new Set())
                                        fetchRequests(1, { status: '', search: request.account_number, dateFrom: '', dateTo: '' })
                                      }}
                                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      같은 계좌로 들어온 접수 {request.duplicate_count}건 보기
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-4">
                                {/* 환불 금액 — 전액 / 차액 / 직접 입력 */}
                                <RefundPanel
                                  key={`${request.id}-${request.refund_type}-${request.refund_amount}`}
                                  request={request}
                                  onSaved={(saved) => handleRefundSaved(request.id, saved)}
                                />

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
                                        placeholder="내부 확인용 메모 (반려 사유, 입금일, 확인 금액 등)"
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-16 text-center">
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

        {/* 사진 크게 보기 */}
        {viewer && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/85"
            onClick={() => setViewer(null)}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
              <p className="min-w-0 truncate text-sm font-medium">
                {viewer.title}
                {viewer.urls.length > 1 && (
                  <span className="ml-2 text-white/60">{viewer.index + 1} / {viewer.urls.length}</span>
                )}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={viewer.urls[viewer.index]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  원본 열기
                </a>
                <button
                  onClick={() => setViewer(null)}
                  className="rounded-lg p-2 hover:bg-white/10"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewer.urls[viewer.index]}
                alt="증빙 사진"
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              {viewer.urls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewer(v => v && { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length })
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                    aria-label="이전 사진"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewer(v => v && { ...v, index: (v.index + 1) % v.urls.length })
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                    aria-label="다음 사진"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
