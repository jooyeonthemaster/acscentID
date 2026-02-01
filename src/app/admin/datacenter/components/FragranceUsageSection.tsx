'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Droplet,
  TrendingUp,
  Package,
  Sparkles,
  Box,
  GraduationCap,
  Download,
  Globe,
  Store,
} from 'lucide-react'

interface FragranceItem {
  id: string
  name: string
  category: string
  totalMl: number
  totalG: number
  usageCount: number
  averageRatio: number
  rank: number
}

interface CategoryUsage {
  category: string
  label: string
  totalMl: number
  percentage: number
  icon: string
}

interface ProgramUsage {
  totalMl: number
  totalG: number
  totalItems: number
  topFragrances: FragranceItem[]
}

interface UsageSummary {
  totalMl: number
  totalG: number
  totalItems: number
  uniqueFragrances: number
}

interface FragranceUsageData {
  summary: {
    online: UsageSummary
    offline: UsageSummary
    combined: UsageSummary
  }
  byFragrance: {
    online: FragranceItem[]
    offline: FragranceItem[]
    combined: FragranceItem[]
  }
  byCategory: {
    online: CategoryUsage[]
    offline: CategoryUsage[]
    combined: CategoryUsage[]
  }
  byProgram: {
    online: Record<string, ProgramUsage>
    offline: Record<string, ProgramUsage>
    combined: Record<string, ProgramUsage>
  }
}

type ViewMode = 'combined' | 'online' | 'offline'

const CATEGORY_COLORS: Record<string, string> = {
  citrus: 'from-yellow-400 to-orange-400',
  floral: 'from-pink-400 to-rose-400',
  woody: 'from-amber-600 to-yellow-700',
  musky: 'from-purple-400 to-indigo-400',
  fruity: 'from-red-400 to-pink-400',
  spicy: 'from-orange-500 to-red-500',
}

const PROGRAM_INFO = {
  idol_image: { label: 'AI 이미지 분석', icon: Sparkles, color: 'bg-yellow-500' },
  figure: { label: '피규어 디퓨저', icon: Box, color: 'bg-cyan-500' },
  graduation: { label: '졸업 퍼퓸', icon: GraduationCap, color: 'bg-amber-500' },
}

const VIEW_MODE_INFO = {
  combined: { label: '전체', icon: TrendingUp, color: 'bg-slate-600' },
  online: { label: '온라인', icon: Globe, color: 'bg-blue-500' },
  offline: { label: '오프라인', icon: Store, color: 'bg-green-500' },
}

export default function FragranceUsageSection() {
  const [data, setData] = useState<FragranceUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('combined')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/admin/datacenter/fragrance-usage?${params}`)
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilter = () => {
    fetchData()
  }

  const handleDownloadCSV = () => {
    if (!data) return

    const headers = ['순위', '향료 ID', '향료명', '카테고리', '온라인(ml)', '오프라인(ml)', '합계(ml)', '사용 횟수', '평균 비율(%)']

    // 온라인/오프라인 데이터를 조합
    const onlineMap = new Map(data.byFragrance.online.map((f) => [f.id, f]))
    const offlineMap = new Map(data.byFragrance.offline.map((f) => [f.id, f]))

    const rows = data.byFragrance.combined.map((f) => {
      const online = onlineMap.get(f.id)
      const offline = offlineMap.get(f.id)
      return [
        f.rank,
        f.id,
        f.name,
        f.category,
        online?.totalMl || 0,
        offline?.totalMl || 0,
        f.totalMl,
        f.usageCount,
        f.averageRatio,
      ]
    })

    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `향료소진량_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
        <button
          onClick={fetchData}
          className="mt-4 block mx-auto px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  // 현재 뷰 모드에 해당하는 데이터
  const currentSummary = data.summary[viewMode]
  const currentFragrances = data.byFragrance[viewMode]
  const currentCategories = data.byCategory[viewMode]
  const currentByProgram = data.byProgram[viewMode]

  return (
    <div className="space-y-6">
      {/* 필터 영역 */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">시작일</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">종료일</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            조회
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg border-2 border-emerald-700"
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* 뷰 모드 선택 */}
      <div className="flex gap-2">
        {(Object.entries(VIEW_MODE_INFO) as [ViewMode, typeof VIEW_MODE_INFO.combined][]).map(([mode, info]) => {
          const Icon = info.icon
          const isActive = viewMode === mode
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive
                  ? `${info.color} text-white shadow-lg`
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {info.label}
            </button>
          )
        })}
      </div>

      {/* 온라인/오프라인/합계 요약 카드 (항상 표시) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-4 shadow-[3px_3px_0px_#bfdbfe]">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold">온라인 소진량</span>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {data.summary.online.totalMl.toLocaleString()}ml
          </div>
          <div className="text-xs text-blue-500 mt-1">
            {data.summary.online.totalItems.toLocaleString()}건 주문
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4 shadow-[3px_3px_0px_#bbf7d0]">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Store className="w-4 h-4" />
            <span className="text-xs font-bold">오프라인 소진량</span>
          </div>
          <div className="text-2xl font-black text-green-700">
            {data.summary.offline.totalMl.toLocaleString()}ml
          </div>
          <div className="text-xs text-green-500 mt-1">
            {data.summary.offline.totalItems.toLocaleString()}건 제조
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold">총 소진량</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data.summary.combined.totalMl.toLocaleString()}ml
          </div>
          <div className="text-xs text-slate-500 mt-1">
            총 {data.summary.combined.totalItems.toLocaleString()}건
          </div>
        </div>
      </div>

      {/* 상세 요약 카드 (현재 선택된 뷰 모드) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Droplet className="w-4 h-4" />
            <span className="text-xs font-medium">{VIEW_MODE_INFO[viewMode].label} 소진량</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {currentSummary.totalMl.toLocaleString()}ml
          </div>
          <div className="text-xs text-slate-400 mt-1">
            ({currentSummary.totalG.toLocaleString()}g)
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">제조 건수</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {currentSummary.totalItems.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">사용 향료 종류</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {currentSummary.uniqueFragrances}종
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">TOP 향료</span>
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {currentFragrances[0]?.name || '-'}
          </div>
          <div className="text-xs text-slate-400">
            {currentFragrances[0]?.totalMl.toLocaleString() || 0}ml
          </div>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 향료별 소진량 순위 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">
                향료별 소진량 순위 ({VIEW_MODE_INFO[viewMode].label})
              </h2>
              <span className="text-xs text-slate-500 ml-auto">
                총 {currentFragrances.length}종
              </span>
            </div>
          </div>
          <div className="p-5 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {currentFragrances.slice(0, 20).map((item) => {
                const maxMl = currentFragrances[0]?.totalMl || 1
                const widthPercent = (item.totalMl / maxMl) * 100
                const colorClass = CATEGORY_COLORS[item.category] || 'from-slate-400 to-slate-500'

                return (
                  <div key={item.id} className="group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-right">
                        <span className="text-xs font-bold text-slate-400">#{item.rank}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-bold text-slate-500 ml-2 flex-shrink-0">
                            {item.totalMl.toLocaleString()}ml
                          </span>
                        </div>
                        <div className="h-5 bg-slate-100 rounded-lg overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colorClass} rounded-lg transition-all`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{item.usageCount}회 사용</span>
                          <span>·</span>
                          <span>평균 {item.averageRatio}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 카테고리별 분포 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <h2 className="font-bold text-slate-900">
                카테고리별 분포 ({VIEW_MODE_INFO[viewMode].label})
              </h2>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {currentCategories.map((cat) => {
                const colorClass = CATEGORY_COLORS[cat.category] || 'from-slate-400 to-slate-500'
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-medium text-slate-700">{cat.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{cat.percentage}%</span>
                        <span className="text-xs text-slate-400 ml-2">
                          ({cat.totalMl.toLocaleString()}ml)
                        </span>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 프로그램별 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(PROGRAM_INFO) as [keyof typeof PROGRAM_INFO, typeof PROGRAM_INFO.idol_image][]).map(
          ([key, info]) => {
            const usage = currentByProgram[key] || { totalMl: 0, totalG: 0, totalItems: 0, topFragrances: [] }
            const Icon = info.icon
            return (
              <div
                key={key}
                className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`p-1.5 rounded-lg ${info.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-slate-900">{info.label}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    viewMode === 'online' ? 'bg-blue-100 text-blue-700' :
                    viewMode === 'offline' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {VIEW_MODE_INFO[viewMode].label}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">총 소진량</span>
                    <span className="font-bold text-slate-900">{usage.totalMl.toLocaleString()}ml</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">제조 건수</span>
                    <span className="font-bold text-slate-900">{usage.totalItems.toLocaleString()}건</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">TOP 향료</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {usage.topFragrances.slice(0, 3).map((f) => (
                        <span
                          key={f.id}
                          className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600"
                        >
                          {f.name}
                        </span>
                      ))}
                      {usage.topFragrances.length === 0 && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        )}
      </div>
    </div>
  )
}
