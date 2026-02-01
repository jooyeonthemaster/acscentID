'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Cloud,
} from 'lucide-react'

interface RetentionDistribution {
  range: string
  count: number
  percentage: number
}

interface CategoryPreferenceStats {
  increase: number
  decrease: number
  maintain: number
  total: number
}

interface PopularScent {
  id: string
  name: string
  count: number
  avgRatio: number
}

interface FeedbackPatternsData {
  retentionDistribution: RetentionDistribution[]
  categoryPreferences: Record<string, CategoryPreferenceStats>
  popularAddedScents: PopularScent[]
  naturalLanguageKeywords: Array<{ keyword: string; count: number }>
  totalFeedbacks: number
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  citrus: { label: '시트러스', icon: '🍋' },
  floral: { label: '플로럴', icon: '🌸' },
  woody: { label: '우디', icon: '🌳' },
  musky: { label: '머스크', icon: '✨' },
  fruity: { label: '프루티', icon: '🍎' },
  spicy: { label: '스파이시', icon: '🌶️' },
}

export default function FeedbackPatternsSection() {
  const [data, setData] = useState<FeedbackPatternsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
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
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900">잔향률 분포</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              추천 향수를 얼마나 유지하는지
            </p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {data.retentionDistribution.map((item) => {
                const maxPercent = Math.max(...data.retentionDistribution.map(r => r.percentage))
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
                {data.retentionDistribution[0]?.range === '0-20%'
                  ? '사용자들이 새로운 조합을 많이 시도합니다.'
                  : data.retentionDistribution[4]?.percentage > 20
                  ? '추천 향수에 만족하는 사용자가 많습니다.'
                  : '적당한 변형을 선호하는 경향이 있습니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 선호도 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="font-bold text-slate-900">카테고리 선호도 변경</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              어떤 계열을 강화/약화하고 싶어하는지
            </p>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {Object.entries(data.categoryPreferences).map(([category, stats]) => {
                const catInfo = CATEGORY_LABELS[category] || { label: category, icon: '🎯' }
                const total = stats.total || 1
                const increasePercent = Math.round((stats.increase / total) * 100)
                const decreasePercent = Math.round((stats.decrease / total) * 100)

                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{catInfo.icon}</span>
                        <span className="font-medium text-slate-700">{catInfo.label}</span>
                      </div>
                      <div className="text-xs text-slate-500">{stats.total}건</div>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                      <div
                        className="bg-green-400"
                        style={{ width: `${increasePercent}%` }}
                        title={`강화: ${increasePercent}%`}
                      />
                      <div
                        className="bg-slate-200"
                        style={{ width: `${100 - increasePercent - decreasePercent}%` }}
                      />
                      <div
                        className="bg-red-400"
                        style={{ width: `${decreasePercent}%` }}
                        title={`약화: ${decreasePercent}%`}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span className="text-green-600">↑ {increasePercent}%</span>
                      <span className="text-red-600">↓ {decreasePercent}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 인기 추가 향료 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">인기 추가 향료 TOP 10</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              사용자들이 자주 추가하는 향료
            </p>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {data.popularAddedScents.slice(0, 10).map((scent, idx) => (
                <div
                  key={scent.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                >
                  <span className="text-xs font-bold text-amber-500 w-6">#{idx + 1}</span>
                  <span className="flex-1 font-medium text-slate-700">{scent.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{scent.count}회</span>
                    <span className="text-xs text-slate-400 ml-2">
                      (평균 {scent.avgRatio}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 자연어 피드백 키워드 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0]">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-white">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-cyan-500" />
              <h2 className="font-bold text-slate-900">피드백 키워드</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              사용자들이 자주 언급하는 단어
            </p>
          </div>
          <div className="p-5">
            {data.naturalLanguageKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.naturalLanguageKeywords.map((kw, idx) => {
                  const maxCount = data.naturalLanguageKeywords[0]?.count || 1
                  const normalized = kw.count / maxCount
                  const fontSize = Math.max(12, Math.round(12 + normalized * 16))
                  const opacity = Math.max(0.5, normalized)

                  return (
                    <span
                      key={`${kw.keyword}-${idx}`}
                      className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full font-medium cursor-default hover:bg-cyan-100 transition-colors"
                      style={{
                        fontSize: `${fontSize}px`,
                        opacity,
                      }}
                      title={`${kw.count}회 언급`}
                    >
                      {kw.keyword}
                      <span className="ml-1 text-xs opacity-60">{kw.count}</span>
                    </span>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                아직 자연어 피드백 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
