'use client'

import { useState, useEffect, Fragment } from 'react'
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
  Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'
import { AdminAnalysisRecord, SERVICE_MODE_LABELS, ProductType, ServiceMode } from '@/types/admin'
import Link from 'next/link'

// 테이블용 짧은 라벨
const SHORT_PRODUCT_LABELS: Record<ProductType, string> = {
  image_analysis: '최애 이미지',
  figure_diffuser: '피규어',
  personal_scent: '퍼스널',
  graduation: '졸업 퍼퓸',
  etc: '기타',
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
    search: '',
    date_from: '',
    date_to: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // 확장된 행 상태
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [pagination.page, filters.product_type, filters.service_mode])

  const fetchAnalyses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filters.product_type !== 'all') params.set('product_type', filters.product_type)
      if (filters.service_mode !== 'all') params.set('service_mode', filters.service_mode)
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
      search: '',
      date_from: '',
      date_to: '',
    })
    setPagination(prev => ({ ...prev, page: 1 }))
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
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-6 shadow-[3px_3px_0px_#e2e8f0]">
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
              <option value="all">전체 상품</option>
              <option value="image_analysis">최애 이미지 분석</option>
              <option value="figure_diffuser">피규어 디퓨저</option>
              <option value="personal_scent">퍼스널 센트</option>
              <option value="graduation">졸업 퍼퓸</option>
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
              className="px-6 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              검색
            </button>
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
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0] overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="w-10 px-3 py-3"></th>
                    <th className="w-[180px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">아이돌명</th>
                    <th className="w-[90px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">상품 타입</th>
                    <th className="w-[80px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">모드</th>
                    <th className="w-[60px] px-3 py-3 text-center text-sm font-medium text-slate-600 whitespace-nowrap">PIN</th>
                    <th className="w-[160px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">추천 향수</th>
                    <th className="w-[90px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">사용자</th>
                    <th className="w-[130px] px-3 py-3 text-left text-sm font-medium text-slate-600 whitespace-nowrap">분석일</th>
                    <th className="w-[70px] px-3 py-3 text-center text-sm font-medium text-slate-600 whitespace-nowrap">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyses.map((analysis) => (
                    <Fragment key={analysis.id}>
                      <tr
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                      >
                        <td className="px-3 py-3">
                          <ChevronRight
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedId === analysis.id ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <div className="font-medium text-slate-900 truncate" title={analysis.idol_name || '-'}>
                            {analysis.idol_name || '-'}
                          </div>
                          <div className="text-xs text-slate-500 truncate" title={analysis.twitter_name}>
                            {analysis.twitter_name}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                            {SHORT_PRODUCT_LABELS[analysis.product_type as ProductType] || '최애 이미지'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            analysis.service_mode === 'offline'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {SERVICE_MODE_LABELS[analysis.service_mode as ServiceMode] || '온라인'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {analysis.service_mode === 'offline' && analysis.pin ? (
                            <span className="inline-block px-2 py-1 text-sm font-mono font-bold bg-slate-100 text-slate-800 rounded tracking-wider">
                              {analysis.pin}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 max-w-[160px]">
                          <div className="font-medium text-slate-900 truncate" title={analysis.perfume_name}>
                            {analysis.perfume_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate" title={analysis.perfume_brand}>
                            {analysis.perfume_brand}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600 truncate max-w-[70px]" title={analysis.user_profile?.name || analysis.user_profile?.email || '익명'}>
                              {analysis.user_profile?.name || analysis.user_profile?.email || '익명'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(analysis.created_at)}
                        </td>
                        <td className="px-3 py-3">
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
                          <td colSpan={9} className="px-4 py-4 bg-slate-50">
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
                  ))}
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
