'use client'

import { useState, useEffect, Fragment, useMemo } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  Printer,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Download,
} from 'lucide-react'
import Image from 'next/image'
import { AdminAnalysisRecord, SERVICE_MODE_LABELS, ProductType, ServiceMode, TargetType, getTargetTypeLabel } from '@/types/admin'
import Link from 'next/link'

// 테이블용 짧은 라벨
// [FIX] HIGH: signature 추가 (admin.ts ProductType 통합)
const SHORT_PRODUCT_LABELS: Record<ProductType, string> = {
  image_analysis: '이미지',
  image_analysis_paper: '시향지',
  figure_diffuser: '피규어',
  personal_scent: '퍼스널',
  graduation: '졸업 퍼퓸',
  signature: '시그니처',
  chemistry_set: '레이어링 퍼퓸',
  payment_test: '테스트',
  today_scent: '오늘의 향',
  store_product: '상품',
  saju_perfume: '사주',
  etc: '기타',
}

// 상품 타입 → 색 계열(hue). 목록에서 타입을 색으로 구분한다.
const PRODUCT_HUE: Record<ProductType, keyof typeof HUE_STYLE> = {
  image_analysis: 'purple',
  image_analysis_paper: 'teal',
  figure_diffuser: 'cyan',
  personal_scent: 'pink',
  graduation: 'emerald',
  signature: 'amber',
  chemistry_set: 'violet',
  payment_test: 'red',
  today_scent: 'orange',
  store_product: 'lime',
  saju_perfume: 'indigo',
  etc: 'slate',
}

// 같은 색 계열(hue) 안에서 분석대상별 명도 분리 — 나(self)는 옅게, 최애(idol)는 한 톤 진하게.
// 같은 상품 타입은 같은 계열을 유지하므로 색감은 비슷하고, 대상만 명도로 구분된다.
// (Tailwind JIT 인식을 위해 클래스는 전부 정적 문자열로 나열)
const HUE_STYLE = {
  purple:  { self: { row: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700' },   idol: { row: 'bg-purple-100',  badge: 'bg-purple-200 text-purple-800' } },
  teal:    { self: { row: 'bg-teal-50',    badge: 'bg-teal-100 text-teal-700' },       idol: { row: 'bg-teal-100',    badge: 'bg-teal-200 text-teal-800' } },
  cyan:    { self: { row: 'bg-cyan-50',    badge: 'bg-cyan-100 text-cyan-700' },       idol: { row: 'bg-cyan-100',    badge: 'bg-cyan-200 text-cyan-800' } },
  pink:    { self: { row: 'bg-pink-50',    badge: 'bg-pink-100 text-pink-700' },       idol: { row: 'bg-pink-100',    badge: 'bg-pink-200 text-pink-800' } },
  emerald: { self: { row: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' }, idol: { row: 'bg-emerald-100', badge: 'bg-emerald-200 text-emerald-800' } },
  amber:   { self: { row: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },     idol: { row: 'bg-amber-100',   badge: 'bg-amber-200 text-amber-800' } },
  violet:  { self: { row: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700' },   idol: { row: 'bg-violet-100',  badge: 'bg-violet-200 text-violet-800' } },
  red:     { self: { row: 'bg-red-50',     badge: 'bg-red-100 text-red-700' },         idol: { row: 'bg-red-100',     badge: 'bg-red-200 text-red-800' } },
  orange:  { self: { row: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700' },   idol: { row: 'bg-orange-100',  badge: 'bg-orange-200 text-orange-800' } },
  lime:    { self: { row: 'bg-lime-50',    badge: 'bg-lime-100 text-lime-700' },       idol: { row: 'bg-lime-100',    badge: 'bg-lime-200 text-lime-800' } },
  indigo:  { self: { row: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700' },   idol: { row: 'bg-indigo-100',  badge: 'bg-indigo-200 text-indigo-800' } },
  slate:   { self: { row: 'bg-slate-50',   badge: 'bg-slate-100 text-slate-600' },     idol: { row: 'bg-slate-100',   badge: 'bg-slate-200 text-slate-700' } },
} as const

// 상품 타입 + 분석대상 → 행/뱃지 색. 같은 타입이면 같은 계열, 대상(self/idol)만 명도로 달라진다.
function getRowStyle(productType: ProductType, targetType?: TargetType | null): { row: string; badge: string } {
  const hue = PRODUCT_HUE[productType] ?? 'slate'
  const variant = targetType === 'idol' ? 'idol' : 'self'
  return HUE_STYLE[hue][variant]
}

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<AdminAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // 필터 상태
  const [filters, setFilters] = useState({
    product_type: 'all' as ProductType | 'all',
    service_mode: 'all' as ServiceMode | 'all',
    target_type: 'all' as TargetType | 'all',
    search: '',
    date_from: '',
    date_to: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const [csvLoading, setCsvLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 확장된 행 상태
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const visibleIds = useMemo(() => analyses.map((analysis) => analysis.id), [analyses])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id))

  useEffect(() => {
    fetchAnalyses()
  }, [pagination.page, filters.product_type, filters.service_mode, filters.target_type])

  const fetchAnalyses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filters.product_type !== 'all') params.set('product_type', filters.product_type)
      if (filters.service_mode !== 'all') params.set('service_mode', filters.service_mode)
      if (filters.target_type !== 'all') params.set('target_type', filters.target_type)
      if (filters.search) params.set('search', filters.search)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)

      const res = await fetch(`/api/admin/analysis?${params}`)
      if (!res.ok) throw new Error('분석 목록을 불러오는데 실패했습니다')

      const data = await res.json()
      setAnalyses(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchAnalyses()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const clearFilters = () => {
    setFilters({
      product_type: 'all',
      service_mode: 'all',
      target_type: 'all',
      search: '',
      date_from: '',
      date_to: '',
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const downloadCSV = async () => {
    setCsvLoading(true)
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (filters.product_type !== 'all') params.set('product_type', filters.product_type)
      if (filters.service_mode !== 'all') params.set('service_mode', filters.service_mode)
      if (filters.target_type !== 'all') params.set('target_type', filters.target_type)
      if (filters.search) params.set('search', filters.search)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)

      const res = await fetch(`/api/admin/analysis?${params}`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ACSCENT_분석관리_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('CSV 다운로드에 실패했습니다.')
    } finally {
      setCsvLoading(false)
    }
  }

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    ))
  }

  const toggleCurrentPageSelection = () => {
    if (visibleIds.length === 0) return

    setSelectedIds((prev) => {
      const visibleIdSet = new Set(visibleIds)

      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIdSet.has(id))
      }

      const nextIds = new Set(prev)
      visibleIds.forEach((id) => nextIds.add(id))
      return Array.from(nextIds)
    })
  }

  const openSelectedPrintPage = () => {
    if (selectedIds.length === 0) {
      alert('인쇄할 분석 건을 선택해주세요.')
      return
    }

    const params = new URLSearchParams({ ids: selectedIds.join(',') })
    const printUrl = `/admin/analysis/bulk-print?${params.toString()}`
    const link = document.createElement('a')
    link.href = printUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}.${month}.${day} ${hour}:${minute}`
  }

  return (
    <div>
      <AdminHeader
        title="분석 관리"
        subtitle="분석 결과 조회 및 관리"
      />

      <div className="p-6">
        {/* 필터 영역 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 검색 */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="아이돌명, 트위터 이름, 향수명 검색..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* 상품 타입 필터 */}
            <select
              value={filters.product_type}
              onChange={(e) => setFilters({ ...filters, product_type: e.target.value as ProductType | 'all' })}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
            >
              {/* [FIX] HIGH: chemistry_set 옵션 추가 */}
              {/* [ADD] saju_perfume + 누락 타입(image_analysis_paper/signature/today_scent/store_product) 옵션 추가 */}
              <option value="all">전체 상품</option>
              <option value="image_analysis">최애 이미지 분석</option>
              <option value="image_analysis_paper">시향지</option>
              <option value="figure_diffuser">피규어 디퓨저</option>
              <option value="personal_scent">퍼스널 센트</option>
              <option value="graduation">졸업 퍼퓸</option>
              <option value="signature">시그니처</option>
              <option value="chemistry_set">레이어링 퍼퓸</option>
              <option value="saju_perfume">사주 분석 퍼퓸</option>
              <option value="today_scent">오늘의 향</option>
              <option value="store_product">상품</option>
            </select>

            {/* 서비스 모드 필터 */}
            <select
              value={filters.service_mode}
              onChange={(e) => setFilters({ ...filters, service_mode: e.target.value as ServiceMode | 'all' })}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
            >
              <option value="all">전체 모드</option>
              <option value="online">온라인</option>
              <option value="offline">오프라인 QR</option>
            </select>

            {/* 분석 대상 필터 (최애/나) */}
            <select
              value={filters.target_type}
              onChange={(e) => setFilters({ ...filters, target_type: e.target.value as TargetType | 'all' })}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
            >
              <option value="all">전체 대상</option>
              <option value="idol">최애</option>
              <option value="self">나 / 나와 상대방</option>
            </select>

            {/* 상세 필터 토글 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>상세 필터</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* 검색 버튼 */}
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 transition-all"
            >
              검색
            </button>

            {/* CSV 다운로드 */}
            <button
              onClick={downloadCSV}
              disabled={csvLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {csvLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {csvLoading ? '다운로드 중...' : 'CSV 다운로드'}
            </button>

            {/* 선택 인쇄 */}
            <button
              onClick={openSelectedPrintPage}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
            >
              <Printer className="w-4 h-4" />
              선택 인쇄
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-black text-slate-900">
                  {selectedIds.length}
                </span>
              )}
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                선택 해제
              </button>
            )}
          </div>

          {/* 상세 필터 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-yellow-400"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
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

        {/* 분석 목록 */}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden overflow-x-auto">
              <table className="w-full md:min-w-[1200px]">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="w-10 px-2 md:px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleCurrentPageSelection}
                        disabled={analyses.length === 0}
                        aria-label="현재 페이지 전체 선택"
                        className="h-4 w-4 rounded border-slate-300 text-yellow-400 focus:ring-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </th>
                    <th className="w-10 px-2 md:px-3 py-3"></th>
                    <th className="w-[180px] px-2 md:px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">아이돌명</th>
                    <th className="hidden md:table-cell w-[90px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">상품 타입</th>
                    <th className="hidden md:table-cell w-[100px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">분석 대상</th>
                    <th className="hidden md:table-cell w-[80px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">모드</th>
                    <th className="hidden md:table-cell w-[60px] px-3 py-3 text-center text-sm font-medium text-slate-600 whitespace-nowrap">PIN</th>
                    <th className="hidden md:table-cell w-[160px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">추천 향수</th>
                    <th className="hidden md:table-cell w-[90px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">사용자</th>
                    <th className="hidden md:table-cell w-[130px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">분석일</th>
                    <th className="w-[70px] px-2 md:px-3 py-3 text-center text-sm font-medium text-slate-600 whitespace-nowrap">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyses.map((analysis) => {
                    const isSelected = selectedIdSet.has(analysis.id)
                    const rowStyle = getRowStyle(analysis.product_type as ProductType, analysis.target_type)

                    return (
                    <Fragment key={analysis.id}>
                      <tr
                        className={`${isSelected ? 'bg-yellow-50/70' : `${rowStyle.row} hover:brightness-95`} transition-colors cursor-pointer`}
                        onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                      >
                        <td className="px-2 md:px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectedId(analysis.id)}
                            aria-label={`${analysis.idol_name || analysis.twitter_name || analysis.id} 선택`}
                            className="h-4 w-4 rounded border-slate-300 text-yellow-400 focus:ring-yellow-400"
                          />
                        </td>
                        <td className="px-2 md:px-3 py-3">
                          <ChevronRight
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedId === analysis.id ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                        <td className="px-2 md:px-3 py-3 max-w-[240px]">
                          {analysis.product_type === 'chemistry_set' && analysis.partner_name ? (
                            <>
                              <div
                                className="font-medium text-slate-900 truncate"
                                title={`${analysis.idol_name || '-'} × ${analysis.partner_name}`}
                              >
                                <span className="text-violet-600">{analysis.idol_name || '-'}</span>
                                <span className="mx-1 text-slate-400">×</span>
                                <span className="text-pink-600">{analysis.partner_name}</span>
                              </div>
                              <div className="text-xs text-slate-500 truncate" title={analysis.chemistry_title || ''}>
                                {analysis.chemistry_title || '케미 세션'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-slate-900 truncate" title={analysis.idol_name || '-'}>
                                {analysis.idol_name || '-'}
                              </div>
                              <div className="text-xs text-slate-500 truncate" title={analysis.twitter_name}>
                                {analysis.twitter_name}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${rowStyle.badge}`}>
                            {SHORT_PRODUCT_LABELS[analysis.product_type as ProductType] || '이미지'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                          {(() => {
                            const isSelf = analysis.target_type === 'self'
                            const label = getTargetTypeLabel(analysis.target_type, analysis.product_type)
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${
                                isSelf
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                <span>{isSelf ? '🪞' : '💖'}</span>
                                <span>{label}</span>
                              </span>
                            )
                          })()}
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            analysis.service_mode === 'offline'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {SERVICE_MODE_LABELS[analysis.service_mode as ServiceMode] || '온라인'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 text-center whitespace-nowrap">
                          {analysis.service_mode === 'offline' && analysis.pin ? (
                            <span className="inline-block px-2 py-1 text-sm font-mono font-bold bg-slate-100 text-slate-800 rounded tracking-wider">
                              {analysis.pin}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 max-w-[160px]">
                          <div className="font-medium text-slate-900 truncate" title={analysis.perfume_name}>
                            {analysis.perfume_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate" title={analysis.perfume_brand}>
                            {analysis.perfume_brand}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600 truncate max-w-[70px]" title={analysis.user_profile?.name || analysis.user_profile?.email || '익명'}>
                              {analysis.user_profile?.name || analysis.user_profile?.email || '익명'}
                            </span>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(analysis.created_at)}
                        </td>
                        <td className="px-2 md:px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/admin/analysis/${analysis.id}`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                              title="상세 보기"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </Link>
                            <Link
                              href={`/admin/analysis/${analysis.id}/print`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                              title="보고서 출력"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {/* 확장된 상세 정보 */}
                      {expandedId === analysis.id && (
                        <tr>
                          <td colSpan={11} className="px-4 py-4 bg-slate-50">
                            {/* 모바일 전용: 숨겨진 컬럼 정보 */}
                            <div className="md:hidden mb-4 pb-4 border-b border-slate-200 space-y-1.5 text-xs">
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">상품 타입</span>
                                <span className="text-slate-900 font-medium">
                                  {SHORT_PRODUCT_LABELS[analysis.product_type as ProductType] || '이미지'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">분석 대상</span>
                                <span className="text-slate-900 font-medium">
                                  {getTargetTypeLabel(analysis.target_type, analysis.product_type)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">모드</span>
                                <span className="text-slate-900 font-medium">
                                  {SERVICE_MODE_LABELS[analysis.service_mode as ServiceMode] || '온라인'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">PIN</span>
                                <span className="text-slate-900 font-mono font-medium">
                                  {analysis.service_mode === 'offline' && analysis.pin ? analysis.pin : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">추천 향수</span>
                                <span className="text-slate-900 font-medium text-right">
                                  {analysis.perfume_name}
                                  {analysis.perfume_brand && (
                                    <span className="block text-slate-500 font-normal">{analysis.perfume_brand}</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">사용자</span>
                                <span className="text-slate-900 font-medium truncate max-w-[60%]">
                                  {analysis.user_profile?.name || analysis.user_profile?.email || '익명'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">분석일</span>
                                <span className="text-slate-900 font-medium">{formatDate(analysis.created_at)}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">키워드:</span>
                                <p className="text-slate-900 mt-1">
                                  {analysis.matching_keywords?.slice(0, 5).join(', ') || '-'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500">피드백:</span>
                                <p className="text-slate-900 mt-1">
                                  {analysis.feedback ? '있음' : '없음'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500">QR 코드:</span>
                                <p className="text-slate-900 mt-1">{analysis.qr_code_id || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">ID:</span>
                                <p className="text-slate-900 mt-1 font-mono text-xs">{analysis.id}</p>
                              </div>
                            </div>
                            {/* 레이어링 퍼퓸 세션 정보 */}
                            {analysis.product_type === 'chemistry_set' && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-lg">💞</span>
                                  <span className="font-medium text-slate-900">케미 세션 정보</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-500">파트너:</span>
                                    <p className="text-slate-900 mt-1">{analysis.partner_name || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">역할:</span>
                                    <p className="text-slate-900 mt-1">{analysis.chemistry_role ? `캐릭터 ${analysis.chemistry_role}` : '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">케미 타이틀:</span>
                                    <p className="text-slate-900 mt-1">{analysis.chemistry_title || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">케미 타입:</span>
                                    <p className="text-slate-900 mt-1">{analysis.chemistry_type || '-'}</p>
                                  </div>
                                  <div className="col-span-2 md:col-span-4">
                                    <span className="text-slate-500">세션 ID:</span>
                                    <p className="text-slate-900 mt-1 font-mono text-xs">{analysis.layering_session_id || '-'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* 모델링 이미지 (피규어 디퓨저) */}
                            {analysis.product_type === 'figure_diffuser' && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <ImageIcon className="w-5 h-5 text-cyan-600" />
                                  <span className="font-medium text-slate-900">3D 모델링용 참조 이미지</span>
                                </div>
                                <div className="flex gap-6">
                                  {analysis.modeling_image_url ? (
                                    <div className="flex-shrink-0">
                                      <a
                                        href={analysis.modeling_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                                          <Image
                                            src={analysis.modeling_image_url}
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
                                  {analysis.modeling_request && (
                                    <div className="flex-1">
                                      <span className="text-slate-500 text-xs">모델링 요청사항:</span>
                                      <p className="text-slate-900 mt-1 bg-white p-3 rounded-lg border border-slate-200">
                                        {analysis.modeling_request}
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
                    )
                  })}
                </tbody>
              </table>

              {analyses.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">분석 결과가 없습니다</p>
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}

            {/* 총 개수 표시 */}
            <div className="text-center mt-4 text-sm text-slate-500">
              총 {pagination.total.toLocaleString()}개의 분석 결과
            </div>
          </>
        )}
      </div>
    </div>
  )
}
