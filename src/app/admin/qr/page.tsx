'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { QRCode, PRODUCT_TYPE_LABELS, ProductType } from '@/types/admin'

// QR 코드 이미지 생성 URL (Google Charts API 사용)
const getQRImageUrl = (code: string, size: number = 200) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const targetUrl = `${baseUrl}/qr/${code}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}`
}

// QR 생성 모달
interface CreateQRModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { product_type: ProductType; name: string; location: string; custom_url?: string }) => Promise<void>
}

function CreateQRModal({ isOpen, onClose, onSubmit }: CreateQRModalProps) {
  const [productType, setProductType] = useState<ProductType>('image_analysis')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [linkType, setLinkType] = useState<'default' | 'custom'>('default')
  const [customUrl, setCustomUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        product_type: linkType === 'custom' ? 'etc' : productType,
        name,
        location,
        custom_url: linkType === 'custom' ? customUrl : undefined,
      })
      setProductType('image_analysis')
      setName('')
      setLocation('')
      setLinkType('default')
      setCustomUrl('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-slate-900 mb-6">새 QR 코드 생성</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 연결 링크 설정 (맨 위) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">연결 링크</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setLinkType('default')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  linkType === 'default'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                기본 (상품 페이지)
              </button>
              <button
                type="button"
                onClick={() => setLinkType('custom')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  linkType === 'custom'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                커스텀 URL
              </button>
            </div>
            {linkType === 'custom' && (
              <div>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  QR 스캔 시 이 URL로 바로 이동합니다. 상품 타입은 자동으로 &apos;기타&apos;로 설정됩니다
                </p>
              </div>
            )}
          </div>

          {/* 상품 타입 (기본 링크일 때만 선택 가능) */}
          {linkType === 'default' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">상품 타입 *</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="image_analysis">AI 이미지 분석 퍼퓸</option>
                <option value="figure_diffuser">피규어 화분 디퓨저</option>
                <option value="graduation">졸업 기념 퍼퓸</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">상품 타입</label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm">
                기타 (커스텀 URL)
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">QR 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍대점 입구"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설치 위치</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울 홍대입구역 근처"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// QR 미리보기/수정 모달
interface QRDetailModalProps {
  qr: QRCode | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, data: { name?: string; location?: string; is_active?: boolean; custom_url?: string | null }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function QRDetailModal({ qr, isOpen, onClose, onUpdate, onDelete }: QRDetailModalProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (qr) {
      setName(qr.name || '')
      setLocation(qr.location || '')
      setCustomUrl(qr.custom_url || '')
      setIsActive(qr.is_active)
      setIsEditing(false)
    }
  }, [qr])

  const handleUpdate = async () => {
    if (!qr) return
    setLoading(true)
    try {
      await onUpdate(qr.id, { name, location, is_active: isActive, custom_url: customUrl || null })
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!qr || !confirm('정말로 이 QR 코드를 비활성화하시겠습니까?')) return
    setLoading(true)
    try {
      await onDelete(qr.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!qr) return
    try {
      // fetch로 이미지를 blob으로 가져오기 (CORS 우회)
      const response = await fetch(getQRImageUrl(qr.code, 400))
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `QR_${qr.code}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // blob URL 해제
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('QR download failed:', error)
      // 폴백: 새 탭에서 열기
      window.open(getQRImageUrl(qr.code, 400), '_blank')
    }
  }

  if (!isOpen || !qr) return null

  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/qr/${qr.code}` : ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">QR 코드 상세</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR 이미지 */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
            <img
              src={getQRImageUrl(qr.code, 200)}
              alt={`QR Code: ${qr.code}`}
              className="w-48 h-48"
            />
          </div>
        </div>

        {/* QR 정보 */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">코드</span>
                <span className="font-mono font-bold text-lg text-purple-600">{qr.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">상품 타입</span>
                <span className="font-medium">{PRODUCT_TYPE_LABELS[qr.product_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">연결 URL</span>
                <span className="text-xs font-mono text-slate-600 break-all">
                  {qr.custom_url || qrUrl}
                </span>
              </div>
              {qr.custom_url && (
                <div className="flex justify-between">
                  <span className="text-slate-500">링크 타입</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">커스텀</span>
                </div>
              )}
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{qr.scan_count}</p>
              <p className="text-sm text-blue-700">스캔 수</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{qr.analysis_count}</p>
              <p className="text-sm text-green-700">분석 완료</p>
            </div>
          </div>

          {/* 수정 가능 필드 */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">QR 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설치 위치</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">커스텀 URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="비워두면 기본 상품 페이지로 이동"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  입력 시 QR 스캔하면 이 URL로 이동. 비워두면 상품 타입 기본 페이지로 이동
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-yellow-500 focus:ring-yellow-500 border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">활성화</label>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">이름</span>
                <span className="font-medium">{qr.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">위치</span>
                <span className="font-medium">{qr.location || '-'}</span>
              </div>
              {qr.custom_url && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">커스텀 URL</span>
                  <a
                    href={qr.custom_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-blue-600 hover:underline break-all text-right"
                  >
                    {qr.custom_url}
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">상태</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {qr.is_active ? '활성' : '비활성'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                다운로드
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminQRPage() {
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 페이지네이션
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터
  const [productType, setProductType] = useState('all')
  const [isActive, setIsActive] = useState('all')
  const [search, setSearch] = useState('')

  // 모달
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchQRCodes = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (productType !== 'all') params.append('product_type', productType)
      if (isActive !== 'all') params.append('is_active', isActive)
      if (search) params.append('search', search)

      const res = await fetch(`/api/admin/qr?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setQRCodes(data.data)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [page, productType, isActive, search])

  useEffect(() => {
    fetchQRCodes()
  }, [fetchQRCodes])

  const handleCreate = async (data: { product_type: ProductType; name: string; location: string; custom_url?: string }) => {
    const res = await fetch('/api/admin/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }

    fetchQRCodes()
  }

  const handleUpdate = async (id: string, data: { name?: string; location?: string; is_active?: boolean; custom_url?: string | null }) => {
    const res = await fetch(`/api/admin/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }

    fetchQRCodes()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/qr/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }

    fetchQRCodes()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchQRCodes()
  }

  const resetFilters = () => {
    setProductType('all')
    setIsActive('all')
    setSearch('')
    setPage(1)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="p-6">
      <AdminHeader
        title="QR 코드 관리"
        actions={
          <button
            onClick={fetchQRCodes}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        }
      />

      {/* 필터 영역 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          {/* 검색 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="코드, 이름, 위치"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* 상품 타입 */}
          <div className="w-44">
            <label className="block text-sm font-medium text-slate-700 mb-1">상품 타입</label>
            <select
              value={productType}
              onChange={(e) => { setProductType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">전체</option>
              <option value="image_analysis">AI 이미지 분석 퍼퓸</option>
              <option value="figure_diffuser">피규어 화분 디퓨저</option>
              <option value="graduation">졸업 기념 퍼퓸</option>
              <option value="etc">기타</option>
            </select>
          </div>

          {/* 상태 */}
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
            <select
              value={isActive}
              onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">전체</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
            >
              검색
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              초기화
            </button>
          </div>
        </form>
      </div>

      {/* 통계 + 생성 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          총 <span className="font-bold text-slate-900">{total}</span>개의 QR 코드
        </p>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 QR 코드
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">QR 코드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">상품 타입</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">이름 / 위치</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">스캔</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">분석</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">전환율</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">생성일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">상세</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      로딩 중...
                    </div>
                  </td>
                </tr>
              ) : qrCodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    QR 코드가 없습니다
                  </td>
                </tr>
              ) : (
                qrCodes.map((qr) => {
                  const conversionRate = qr.scan_count > 0
                    ? Math.round((qr.analysis_count / qr.scan_count) * 100)
                    : 0

                  return (
                    <tr key={qr.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getQRImageUrl(qr.code, 40)}
                            alt={qr.code}
                            className="w-10 h-10 rounded-lg border border-slate-200"
                          />
                          <span className="font-mono font-bold text-purple-600">{qr.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{PRODUCT_TYPE_LABELS[qr.product_type]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{qr.name || '-'}</p>
                          <p className="text-sm text-slate-500">{qr.location || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-blue-600">{qr.scan_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-green-600">{qr.analysis_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${conversionRate >= 50 ? 'text-green-600' : conversionRate >= 20 ? 'text-yellow-600' : 'text-slate-500'}`}>
                          {conversionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {qr.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(qr.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setSelectedQR(qr); setIsDetailOpen(true); }}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="상세 보기"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pageNum = startPage + i
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 모달 */}
      <CreateQRModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <QRDetailModal
        qr={selectedQR}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
