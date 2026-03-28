'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  BarChart3,
  Target,
  RefreshCw,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Info,
} from 'lucide-react'

// ============================================
// 타입 정의
// ============================================

interface RetentionDistribution {
  range: string
  count: number
  percentage: number
}

interface CategoryAdditionStats {
  category: string
  label: string
  icon: string
  totalSelections: number
  avgRatio: number
  uniquePerfumes: number
  topPerfumes: Array<{ name: string; count: number }>
}

interface PopularScent {
  id: string
  name: string
  category: string
  count: number
  avgRatio: number
  minRatio: number
  maxRatio: number
  stddevRatio: number
  ratioDistribution: { range: string; count: number }[]
}

interface ScentAdditionPattern {
  scentCount: number
  feedbackCount: number
  avgTotalRatio: number
}

interface RecipeTypeStats {
  userDirect: number
  aiRecommended: number
  original: number
  unknown: number
}

interface FeedbackPatternsData {
  retentionDistribution: RetentionDistribution[]
  categoryAdditions: CategoryAdditionStats[]
  popularAddedScents: PopularScent[]
  scentAdditionPatterns: ScentAdditionPattern[]
  recipeTypeStats: RecipeTypeStats
  totalFeedbacks: number
}

interface AiAnalysis {
  id: string
  created_at: string
  analysis_period_start: string
  analysis_period_end: string
  total_feedbacks_analyzed: number
  sentiment_summary: any
  created_by: string | null
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function FeedbackPatternsSection() {
  const [data, setData] = useState<FeedbackPatternsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI 분석 상태
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AiAnalysis | null>(null)
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false)

  // 향료 상세 펼침 상태
  const [expandedScent, setExpandedScent] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchAnalyses()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/datacenter/feedback-patterns')
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/admin/datacenter/feedback-analysis')
      if (!res.ok) return
      const json = await res.json()
      if (json.analyses?.length > 0) {
        setAnalyses(json.analyses)
        setSelectedAnalysis(json.analyses[0])
      }
    } catch {
      // silent
    }
  }

  const runNewAnalysis = async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/admin/datacenter/feedback-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '분석 실패')
      }
      const json = await res.json()
      if (json.analysis) {
        setSelectedAnalysis(json.analysis)
        setAnalyses((prev) => [json.analysis, ...prev])
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '분석 중 오류')
    } finally {
      setAnalysisLoading(false)
    }
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
        <button onClick={fetchData} className="mt-4 block mx-auto px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg">
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-[3px_3px_0px_#e2e8f0]">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-medium">총 피드백 수</span>
        </div>
        <div className="text-2xl font-black text-slate-900">
          {data.totalFeedbacks.toLocaleString()}건
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 잔향률 분포 */}
        <RetentionCard data={data.retentionDistribution} />

        {/* 카테고리별 추가 선택 빈도 */}
        <CategoryAdditionsCard data={data.categoryAdditions} />

        {/* 인기 추가 향료 TOP 10 (상세) */}
        <PopularScentsCard
          data={data.popularAddedScents}
          patterns={data.scentAdditionPatterns}
          expandedScent={expandedScent}
          onToggleExpand={(id) => setExpandedScent(expandedScent === id ? null : id)}
        />

        {/* 레시피 타입 선택 통계 */}
        <RecipeTypeCard stats={data.recipeTypeStats} total={data.totalFeedbacks} />
      </div>

      {/* AI 감성 분석 섹션 (전체 폭) */}
      <AiAnalysisSection
        selectedAnalysis={selectedAnalysis}
        analyses={analyses}
        loading={analysisLoading}
        error={analysisError}
        showHistory={showAnalysisHistory}
        onToggleHistory={() => setShowAnalysisHistory(!showAnalysisHistory)}
        onRunAnalysis={runNewAnalysis}
        onSelectAnalysis={setSelectedAnalysis}
      />
    </div>
  )
}

// ============================================
// 잔향률 분포 카드
// ============================================
function RetentionCard({ data }: { data: RetentionDistribution[] }) {
  const maxPercent = Math.max(...data.map((r) => r.percentage))
  const peakRange = data.reduce((a, b) => (a.percentage > b.percentage ? a : b))

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="font-bold text-slate-900">잔향률 분포</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">추천 향수를 얼마나 유지하는지</p>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {data.map((item) => {
            const widthPercent = maxPercent > 0 ? (item.percentage / maxPercent) * 100 : 0
            return (
              <div key={item.range}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.range}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.count}건 ({item.percentage}%)
                  </span>
                </div>
                <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg transition-all"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600">
            💡 <strong>인사이트:</strong>{' '}
            {peakRange.range === '0-20%'
              ? '사용자들이 새로운 조합을 많이 시도합니다.'
              : peakRange.range === '81-100%'
              ? '추천 향수에 만족하는 사용자가 많습니다.'
              : `${peakRange.range} 구간이 ${peakRange.percentage}%로 가장 많아, 적당한 변형을 선호합니다.`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 카테고리별 추가 선택 빈도 카드
// ============================================
function CategoryAdditionsCard({ data }: { data: CategoryAdditionStats[] }) {
  const maxSelections = Math.max(...data.map((d) => d.totalSelections), 1)

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h2 className="font-bold text-slate-900">카테고리별 추가 선택 빈도</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">유저들이 어떤 카테고리 향료를 많이 추가하는지</p>
      </div>
      <div className="p-5">
        <div className="space-y-4">
          {data.map((cat) => {
            const widthPercent = (cat.totalSelections / maxSelections) * 100
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{cat.totalSelections}회</span>
                    <span className="text-xs text-slate-400 ml-1.5">평균 {cat.avgRatio}%</span>
                  </div>
                </div>
                <div className="h-5 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-lg transition-all"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                {cat.topPerfumes.length > 0 && (
                  <div className="mt-1.5 flex gap-2 flex-wrap">
                    {cat.topPerfumes.map((p) => (
                      <span key={p.name} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                        {p.name} ({p.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 인기 추가 향료 카드 (상세)
// ============================================
function PopularScentsCard({
  data,
  patterns,
  expandedScent,
  onToggleExpand,
}: {
  data: PopularScent[]
  patterns: ScentAdditionPattern[]
  expandedScent: string | null
  onToggleExpand: (id: string) => void
}) {
  const CATEGORY_COLORS: Record<string, string> = {
    citrus: 'bg-yellow-100 text-yellow-700',
    floral: 'bg-pink-100 text-pink-700',
    woody: 'bg-emerald-100 text-emerald-700',
    musky: 'bg-slate-100 text-slate-700',
    fruity: 'bg-orange-100 text-orange-700',
    spicy: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-slate-900">인기 추가 향료 TOP 10</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">클릭하면 상세 비율 분포 확인 가능</p>
      </div>
      <div className="p-5">
        {/* 향료 추가 패턴 요약 */}
        {patterns.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200/50">
            <p className="text-xs font-medium text-amber-700 mb-1.5">📊 향료 추가 패턴</p>
            <div className="flex gap-3 flex-wrap">
              {patterns.map((p) => (
                <span key={p.scentCount} className="text-xs text-amber-600">
                  <strong>{p.scentCount}개 추가:</strong> {p.feedbackCount}건 (평균 {p.avgTotalRatio}%)
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {data.slice(0, 10).map((scent, idx) => {
            const isExpanded = expandedScent === scent.id
            const catColor = CATEGORY_COLORS[scent.category] || 'bg-slate-100 text-slate-700'
            return (
              <div key={scent.id}>
                <button
                  onClick={() => onToggleExpand(scent.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-amber-500 w-6">#{idx + 1}</span>
                  <span className="flex-1 font-medium text-slate-700">{scent.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catColor}`}>
                    {scent.category}
                  </span>
                  <div className="text-right mr-1">
                    <span className="text-sm font-bold text-slate-900">{scent.count}회</span>
                    <span className="text-xs text-slate-400 ml-1">(평균 {scent.avgRatio}%)</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-8 mr-2 mb-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500">평균</div>
                        <div className="text-sm font-bold text-slate-900">{scent.avgRatio}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500">최소</div>
                        <div className="text-sm font-bold text-blue-600">{scent.minRatio}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500">최대</div>
                        <div className="text-sm font-bold text-red-600">{scent.maxRatio}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500">편차</div>
                        <div className="text-sm font-bold text-slate-700">±{scent.stddevRatio}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1.5">비율 분포</div>
                    <div className="flex gap-1">
                      {scent.ratioDistribution.map((d) => {
                        const maxCount = Math.max(...scent.ratioDistribution.map((r) => r.count), 1)
                        const height = Math.max(4, (d.count / maxCount) * 32)
                        return (
                          <div key={d.range} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex items-end justify-center" style={{ height: 32 }}>
                              <div
                                className="w-full bg-amber-400 rounded-sm"
                                style={{ height }}
                                title={`${d.range}: ${d.count}건`}
                              />
                            </div>
                            <span className="text-[8px] text-slate-400">{d.range}</span>
                            <span className="text-[9px] font-medium text-slate-600">{d.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 레시피 타입 선택 통계 카드
// ============================================
function RecipeTypeCard({ stats, total }: { stats: RecipeTypeStats; total: number }) {
  const known = stats.userDirect + stats.aiRecommended + stats.original
  const hasData = known > 0

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          <h2 className="font-bold text-slate-900">레시피 선택 유형</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">유저가 1안(직접) vs 2안(AI추천) 중 뭘 확정했는지</p>
      </div>
      <div className="p-5">
        {hasData ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              {/* 직접 선택 */}
              <div className="flex-1 p-3 bg-amber-50 rounded-xl border border-amber-200/50 text-center">
                <div className="text-2xl font-black text-amber-600">
                  {known > 0 ? Math.round((stats.userDirect / known) * 100) : 0}%
                </div>
                <div className="text-xs font-medium text-amber-700 mt-1">1안 직접 선택</div>
                <div className="text-[10px] text-amber-500">{stats.userDirect}건</div>
              </div>
              {/* AI 추천 */}
              <div className="flex-1 p-3 bg-purple-50 rounded-xl border border-purple-200/50 text-center">
                <div className="text-2xl font-black text-purple-600">
                  {known > 0 ? Math.round((stats.aiRecommended / known) * 100) : 0}%
                </div>
                <div className="text-xs font-medium text-purple-700 mt-1">2안 AI 추천</div>
                <div className="text-[10px] text-purple-500">{stats.aiRecommended}건</div>
              </div>
            </div>
            {stats.unknown > 0 && (
              <div className="text-xs text-slate-400 text-center">
                미기록: {stats.unknown}건 (이전 버전에서 수집된 데이터)
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">아직 레시피 선택 데이터가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">
              이전 {stats.unknown}건은 선택 유형이 기록되지 않았습니다.
              <br />앞으로 새 피드백부터 자동 수집됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// AI 감성 분석 섹션
// ============================================
function AiAnalysisSection({
  selectedAnalysis,
  analyses,
  loading,
  error,
  showHistory,
  onToggleHistory,
  onRunAnalysis,
  onSelectAnalysis,
}: {
  selectedAnalysis: AiAnalysis | null
  analyses: AiAnalysis[]
  loading: boolean
  error: string | null
  showHistory: boolean
  onToggleHistory: () => void
  onRunAnalysis: () => void
  onSelectAnalysis: (a: AiAnalysis) => void
}) {
  const summary = selectedAnalysis?.sentiment_summary

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-500" />
              <h2 className="font-bold text-slate-900">AI 피드백 감성 분석</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gemini가 자연어 피드백을 종합 분석한 결과
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analyses.length > 0 && (
              <button
                onClick={onToggleHistory}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                이전 분석 ({analyses.length})
              </button>
            )}
            <button
              onClick={onRunAnalysis}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {loading ? '분석 중...' : '새 분석 실행'}
            </button>
          </div>
        </div>
      </div>

      {/* 분석 이력 드롭다운 */}
      {showHistory && analyses.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 max-h-48 overflow-y-auto">
          <div className="space-y-1.5">
            {analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelectAnalysis(a)
                  onToggleHistory()
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
                  selectedAnalysis?.id === a.id
                    ? 'bg-cyan-100 border border-cyan-300'
                    : 'bg-white border border-slate-200 hover:bg-cyan-50'
                }`}
              >
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    {a.analysis_period_start} ~ {a.analysis_period_end}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {a.total_feedbacks_analyzed}건 분석 · {new Date(a.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <SentimentBadge sentiment={a.sentiment_summary?.overall_sentiment} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-500">Gemini가 피드백을 분석하고 있습니다...</p>
            <p className="text-xs text-slate-400">최대 1분 정도 소요될 수 있습니다</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={onRunAnalysis} className="mt-3 px-4 py-2 bg-cyan-500 text-white text-xs rounded-lg">
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && !summary && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-2">아직 AI 분석 결과가 없습니다</p>
            <p className="text-xs text-slate-400">
              &quot;새 분석 실행&quot; 버튼을 클릭하면 Gemini가 자연어 피드백을 종합 분석합니다
            </p>
          </div>
        )}

        {!loading && summary && (
          <AnalysisResult analysis={selectedAnalysis!} />
        )}
      </div>
    </div>
  )
}

// ============================================
// AI 분석 결과 렌더링
// ============================================
function AnalysisResult({ analysis }: { analysis: AiAnalysis }) {
  const s = analysis.sentiment_summary

  return (
    <div className="space-y-5">
      {/* 메타 정보 */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {analysis.analysis_period_start} ~ {analysis.analysis_period_end} · {analysis.total_feedbacks_analyzed}건 분석
        </span>
        <span>{new Date(analysis.created_at).toLocaleString('ko-KR')}</span>
      </div>

      {/* 전체 요약 */}
      <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200/50">
        <div className="flex items-center gap-3 mb-2">
          <SentimentBadge sentiment={s.overall_sentiment} large />
          <div>
            <div className="text-sm font-bold text-slate-900">감성 점수: {s.sentiment_score}/100</div>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{s.executive_summary}</p>
      </div>

      {/* 감정 분포 */}
      {s.emotions?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            감정 분포
          </h3>
          <div className="flex gap-2 flex-wrap">
            {s.emotions.map((em: any, idx: number) => (
              <div key={idx} className="px-3 py-2 bg-white rounded-lg border border-slate-200 flex-1 min-w-[120px]">
                <div className="text-lg font-black text-slate-900">{em.percentage}%</div>
                <div className="text-xs font-medium text-slate-700">{em.emotion}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{em.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 핵심 테마 */}
      {s.key_themes?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">🎯 핵심 테마</h3>
          <div className="space-y-2">
            {s.key_themes.map((theme: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <SentimentDot sentiment={theme.sentiment} />
                    <span className="text-sm font-bold text-slate-800">{theme.theme}</span>
                  </div>
                  <span className="text-xs text-slate-400">~{theme.count}건</span>
                </div>
                <p className="text-xs text-slate-600">{theme.description}</p>
                {theme.representative_quotes?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {theme.representative_quotes.map((q: string, qi: number) => (
                      <p key={qi} className="text-[10px] text-slate-500 italic pl-2 border-l-2 border-slate-200">
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 향 선호도 */}
      {s.scent_preferences?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">🌿 향 선호도 분석</h3>
          <div className="grid grid-cols-2 gap-2">
            {s.scent_preferences.map((sp: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <SentimentDot sentiment={sp.sentiment} />
                  <span className="text-xs font-bold text-slate-800">{sp.scent_type}</span>
                  <span className="text-[10px] text-slate-400">~{sp.mentions}회</span>
                </div>
                <p className="text-[10px] text-slate-600">{sp.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 유저 니즈 */}
      {s.user_desires?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">💡 유저 니즈 & 액션 인사이트</h3>
          <div className="space-y-2">
            {s.user_desires.map((d: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    d.frequency === 'high'
                      ? 'bg-red-100 text-red-600'
                      : d.frequency === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {d.frequency === 'high' ? '높음' : d.frequency === 'medium' ? '보통' : '낮음'}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{d.desire}</span>
                </div>
                <p className="text-xs text-cyan-700 bg-cyan-50 p-2 rounded">
                  💡 {d.actionable_insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개선 제안 */}
      {s.improvement_suggestions?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">🔧 개선 제안</h3>
          <div className="space-y-2">
            {s.improvement_suggestions.map((sug: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    sug.urgency === 'high'
                      ? 'bg-red-100 text-red-600'
                      : sug.urgency === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {sug.urgency === 'high' ? '긴급' : sug.urgency === 'medium' ? '보통' : '낮음'}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{sug.area}</span>
                </div>
                <p className="text-xs text-slate-600">{sug.suggestion}</p>
                <p className="text-[10px] text-slate-400 mt-1">근거: {sug.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 워드 클라우드 */}
      {s.word_cloud_data?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">☁️ 키워드 클라우드</h3>
          <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl">
            {s.word_cloud_data.map((w: any, idx: number) => {
              const maxWeight = Math.max(...s.word_cloud_data.map((d: any) => d.weight))
              const normalized = w.weight / maxWeight
              const fontSize = Math.max(11, Math.round(11 + normalized * 18))
              const opacity = Math.max(0.5, normalized)
              const colorClass =
                w.sentiment === 'positive'
                  ? 'bg-green-50 text-green-700'
                  : w.sentiment === 'negative'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-700'

              return (
                <span
                  key={`${w.word}-${idx}`}
                  className={`px-2.5 py-1 rounded-full font-medium cursor-default transition-colors ${colorClass}`}
                  style={{ fontSize: `${fontSize}px`, opacity }}
                  title={`${w.word}: 가중치 ${w.weight}`}
                >
                  {w.word}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 계절 트렌드 */}
      {s.seasonal_trends && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200/50">
          <p className="text-xs font-bold text-amber-800 mb-1">
            🌤️ 시즌 트렌드: {s.seasonal_trends.current_preference}
          </p>
          <p className="text-xs text-amber-700">{s.seasonal_trends.description}</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// 유틸 컴포넌트
// ============================================
function SentimentBadge({ sentiment, large }: { sentiment?: string; large?: boolean }) {
  const config = {
    positive: { bg: 'bg-green-100', text: 'text-green-700', label: '긍정적', icon: ThumbsUp },
    negative: { bg: 'bg-red-100', text: 'text-red-700', label: '부정적', icon: ThumbsDown },
    mixed: { bg: 'bg-amber-100', text: 'text-amber-700', label: '복합적', icon: Minus },
  }
  const c = config[sentiment as keyof typeof config] || config.mixed
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text} ${
      large ? 'text-sm' : 'text-[10px]'
    }`}>
      <Icon className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      {c.label}
    </span>
  )
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  const color =
    sentiment === 'positive'
      ? 'bg-green-400'
      : sentiment === 'negative'
      ? 'bg-red-400'
      : 'bg-amber-400'
  return <span className={`w-2 h-2 rounded-full ${color}`} />
}
