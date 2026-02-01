'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Cloud,
  Sparkles,
  Box,
  GraduationCap,
  TrendingUp,
  Users,
  Download,
  User,
  Crown,
  Droplet,
  MessageSquare,
  Wand2,
  Package,
} from 'lucide-react'
import FragranceUsageSection from './components/FragranceUsageSection'
import FeedbackPatternsSection from './components/FeedbackPatternsSection'
import RecipeSelectionSection from './components/RecipeSelectionSection'
import InventorySection from './components/InventorySection'

// 탭 타입 정의
type TabType = 'overview' | 'fragrance' | 'inventory' | 'feedback' | 'recipe'

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '개요', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'fragrance', label: '향료 소진량', icon: <Droplet className="w-4 h-4" /> },
  { id: 'inventory', label: '재고 관리', icon: <Package className="w-4 h-4" /> },
  { id: 'feedback', label: '피드백 패턴', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'recipe', label: '레시피 선택', icon: <Wand2 className="w-4 h-4" /> },
]

// 프로그램 타입 정의
type ProgramType = 'idol_image' | 'figure' | 'graduation' | 'all'

interface CountItem {
  name: string
  count: number
}

interface ProgramStats {
  totalAnalyses: number
  perfumeCounts: CountItem[]
  keywordCounts: CountItem[]
  nameCounts: CountItem[]
  genderCounts: CountItem[]
}

interface DatacenterResponse {
  byProgram: Record<string, ProgramStats>
  total: ProgramStats
}

const PROGRAM_LABELS: Record<ProgramType, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: '전체', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-slate-500' },
  idol_image: { label: 'AI 이미지 분석', icon: <Sparkles className="w-4 h-4" />, color: 'bg-yellow-500' },
  figure: { label: '피규어 디퓨저', icon: <Box className="w-4 h-4" />, color: 'bg-cyan-500' },
  graduation: { label: '졸업 퍼퓸', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-amber-500' },
}

// 키워드 클라우드 컴포넌트
function KeywordCloud({ keywords, maxItems = 50 }: { keywords: CountItem[]; maxItems?: number }) {
  const displayKeywords = keywords.slice(0, maxItems)
  const maxCount = Math.max(...displayKeywords.map(k => k.count), 1)
  const minCount = Math.min(...displayKeywords.map(k => k.count), 1)

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return 20
    const normalized = (count - minCount) / (maxCount - minCount)
    return Math.round(12 + normalized * 36)
  }

  const getColor = (count: number) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1)
    if (normalized > 0.8) return 'text-yellow-600 font-black'
    if (normalized > 0.6) return 'text-amber-600 font-bold'
    if (normalized > 0.4) return 'text-orange-500 font-semibold'
    if (normalized > 0.2) return 'text-slate-700 font-medium'
    return 'text-slate-500'
  }

  if (displayKeywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        키워드 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6 min-h-[200px]">
      {displayKeywords.map((kw, idx) => (
        <span
          key={`${kw.name}-${idx}`}
          className={`inline-block transition-all hover:scale-110 cursor-default ${getColor(kw.count)}`}
          style={{ fontSize: `${getFontSize(kw.count)}px` }}
          title={`${kw.name}: ${kw.count}회`}
        >
          {kw.name}
        </span>
      ))}
    </div>
  )
}

// 바 차트 컴포넌트
function BarChart({ items, maxItems = 30, colorClass = "from-yellow-400 to-amber-500" }: {
  items: CountItem[];
  maxItems?: number;
  colorClass?: string;
}) {
  const displayItems = items.slice(0, maxItems)
  const maxCount = Math.max(...displayItems.map(p => p.count), 1)

  if (displayItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
      {displayItems.map((item, idx) => {
        const widthPercent = (item.count / maxCount) * 100
        return (
          <div key={`${item.name}-${idx}`} className="group">
            <div className="flex items-center gap-3">
              <div className="w-8 text-right">
                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-2 flex-shrink-0">
                    {item.count}회
                  </span>
                </div>
                <div className="h-5 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${colorClass} rounded-lg transition-all`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 성별 파이 차트 (간단한 막대형)
function GenderChart({ genderCounts }: { genderCounts: CountItem[] }) {
  const total = genderCounts.reduce((sum, g) => sum + g.count, 0)
  const colors: Record<string, string> = {
    '남성': 'bg-blue-500',
    '여성': 'bg-pink-500',
    '기타': 'bg-purple-500',
  }

  if (total === 0) {
    return <div className="text-center text-slate-400 py-4">성별 데이터 없음</div>
  }

  return (
    <div className="space-y-3">
      {genderCounts.map((g, idx) => {
        const percent = Math.round((g.count / total) * 100)
        return (
          <div key={idx} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${colors[g.name] || 'bg-slate-400'}`} />
            <span className="text-sm font-medium text-slate-700 w-12">{g.name}</span>
            <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className={`h-full ${colors[g.name] || 'bg-slate-400'} rounded-lg transition-all`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-600 w-16 text-right">
              {g.count}명 ({percent}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

// 개요 섹션 (기존 컨텐츠)
function OverviewSection({
  data,
  loading,
  error,
  selectedProgram,
  setSelectedProgram,
  handleDownload,
  downloading,
  fetchData,
}: {
  data: DatacenterResponse | null
  loading: boolean
  error: string | null
  selectedProgram: ProgramType
  setSelectedProgram: (p: ProgramType) => void
  handleDownload: () => void
  downloading: boolean
  fetchData: () => void
}) {
  const currentStats = useMemo(() => {
    if (!data) return null
    if (selectedProgram === 'all') return data.total
    return data.byProgram[selectedProgram]
  }, [data, selectedProgram])

  return (
    <>
      {/* 프로그램 선택 탭 + 다운로드 버튼 */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-3 mb-6 shadow-[3px_3px_0px_#e2e8f0]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROGRAM_LABELS) as ProgramType[]).map((programType) => {
              const { label, icon, color } = PROGRAM_LABELS[programType]
              const isActive = selectedProgram === programType
              const stats = programType === 'all' ? data?.total : data?.byProgram[programType]

              return (
                <button
                  key={programType}
                  onClick={() => setSelectedProgram(programType)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                    ${isActive
                      ? 'bg-slate-900 text-white shadow-[2px_2px_0px_#fbbf24]'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <span className={`p-1 rounded ${isActive ? 'bg-white/20' : color + ' text-white'}`}>
                    {icon}
                  </span>
                  <span>{label}</span>
                  {stats && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-200'}`}>
                      {stats.totalAnalyses.toLocaleString()}건
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 엑셀 다운로드 버튼 */}
          <button
            onClick={handleDownload}
            disabled={downloading || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-lg border-2 border-emerald-700 shadow-[3px_3px_0px_#065f46] hover:shadow-[1px_1px_0px_#065f46] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>엑셀 다운로드</span>
          </button>
        </div>
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
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 통계 대시보드 */}
      {!loading && !error && currentStats && (
        <>
          {/* 상단 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-medium">총 분석</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {currentStats.totalAnalyses.toLocaleString()}건
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Crown className="w-4 h-4" />
                <span className="text-xs font-medium">TOP 이름</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate" title={currentStats.nameCounts[0]?.name}>
                {currentStats.nameCounts[0]?.name || '-'}
              </div>
              <div className="text-xs text-slate-400">
                {currentStats.nameCounts[0]?.count || 0}회 분석
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium">TOP 향수</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate" title={currentStats.perfumeCounts[0]?.name}>
                {currentStats.perfumeCounts[0]?.name || '-'}
              </div>
              <div className="text-xs text-slate-400">
                {currentStats.perfumeCounts[0]?.count || 0}회 추천
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Cloud className="w-4 h-4" />
                <span className="text-xs font-medium">TOP 키워드</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate">
                {currentStats.keywordCounts[0]?.name || '-'}
              </div>
              <div className="text-xs text-slate-400">
                {currentStats.keywordCounts[0]?.count || 0}회 등장
              </div>
            </div>
          </div>

          {/* 메인 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 분석 대상 이름 순위 */}
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
              <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-500" />
                  <h2 className="font-bold text-slate-900">분석 대상 이름 순위</h2>
                  <span className="text-xs text-slate-500 ml-auto">
                    총 {currentStats.nameCounts.length}명
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  가장 많이 분석된 아이돌/캐릭터
                </p>
              </div>
              <div className="p-5">
                <BarChart items={currentStats.nameCounts} colorClass="from-purple-400 to-pink-500" />
              </div>
            </div>

            {/* 향수 추천 순위 */}
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
              <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900">향수 추천 순위</h2>
                  <span className="text-xs text-slate-500 ml-auto">
                    총 {currentStats.perfumeCounts.length}종
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  AI가 추천한 향수별 빈도
                </p>
              </div>
              <div className="p-5">
                <BarChart items={currentStats.perfumeCounts} colorClass="from-yellow-400 to-amber-500" />
              </div>
            </div>

            {/* 키워드 클라우드 */}
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
              <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-white">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-cyan-500" />
                  <h2 className="font-bold text-slate-900">키워드 클라우드</h2>
                  <span className="text-xs text-slate-500 ml-auto">
                    총 {currentStats.keywordCounts.length}개
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  AI가 분석한 주요 키워드 (크기 = 빈도)
                </p>
              </div>
              <div className="p-2">
                <KeywordCloud keywords={currentStats.keywordCounts} />
              </div>
            </div>

            {/* 성별 통계 */}
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
              <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-pink-50">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-slate-900">성별 분포</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  분석 대상의 성별 비율
                </p>
              </div>
              <div className="p-5">
                <GenderChart genderCounts={currentStats.genderCounts} />
              </div>
            </div>
          </div>

          {/* 상위 키워드 TOP 20 */}
          <div className="mt-6 bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="font-bold text-slate-900">상위 키워드 TOP 20</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {currentStats.keywordCounts.slice(0, 20).map((kw, idx) => (
                  <div
                    key={`${kw.name}-${idx}`}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <span className="text-xs font-bold text-amber-500">#{idx + 1}</span>
                    <span className="text-sm text-slate-700 truncate flex-1">{kw.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{kw.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 프로그램별 요약 */}
          {data && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['idol_image', 'figure', 'graduation'] as const).map((programType) => {
                const { label, icon, color } = PROGRAM_LABELS[programType]
                const stats = data.byProgram[programType]
                const topName = stats?.nameCounts[0]
                const topPerfume = stats?.perfumeCounts[0]
                const topKeyword = stats?.keywordCounts[0]

                return (
                  <div
                    key={programType}
                    className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`p-1.5 rounded-lg ${color} text-white`}>
                        {icon}
                      </span>
                      <span className="font-bold text-slate-900">{label}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">총 분석</span>
                        <span className="font-bold text-slate-900">{stats?.totalAnalyses || 0}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TOP 이름</span>
                        <span className="font-medium text-slate-700 truncate ml-2 max-w-[100px]" title={topName?.name}>
                          {topName?.name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TOP 향수</span>
                        <span className="font-medium text-slate-700 truncate ml-2 max-w-[100px]" title={topPerfume?.name}>
                          {topPerfume?.name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TOP 키워드</span>
                        <span className="font-medium text-slate-700">
                          {topKeyword?.name || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function DatacenterPage() {
  const [data, setData] = useState<DatacenterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>('all')
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/datacenter')
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/admin/datacenter?format=csv&program=${selectedProgram}`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `분석데이터_${selectedProgram}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <AdminHeader
        title="데이터센터"
        subtitle="향료 관리 및 분석 통계"
      />

      <div className="p-6">
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-2 mb-6 shadow-[3px_3px_0px_#e2e8f0]">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                    ${isActive
                      ? 'bg-slate-900 text-white shadow-[2px_2px_0px_#fbbf24]'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'overview' && (
          <OverviewSection
            data={data}
            loading={loading}
            error={error}
            selectedProgram={selectedProgram}
            setSelectedProgram={setSelectedProgram}
            handleDownload={handleDownload}
            downloading={downloading}
            fetchData={fetchData}
          />
        )}

        {activeTab === 'fragrance' && <FragranceUsageSection />}
        {activeTab === 'inventory' && <InventorySection />}
        {activeTab === 'feedback' && <FeedbackPatternsSection />}
        {activeTab === 'recipe' && <RecipeSelectionSection />}
      </div>
    </div>
  )
}
