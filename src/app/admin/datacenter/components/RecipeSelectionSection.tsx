'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Sparkles,
  User,
  Wand2,
  Box,
  GraduationCap,
  TrendingUp,
  Users,
  Moon,
} from 'lucide-react'

interface SelectionBreakdown {
  count: number
  percentage: number
}

interface ProgramBreakdown {
  userDirect: number
  aiRecommended: number
  original: number
  total: number
}

interface MonthlyTrend {
  month: string
  userDirect: number
  aiRecommended: number
  original: number
  total: number
}

interface RecipeSelectionData {
  total: number
  breakdown: {
    userDirect: SelectionBreakdown
    aiRecommended: SelectionBreakdown
    original: SelectionBreakdown
  }
  byProgram: {
    idol_image: ProgramBreakdown
    figure: ProgramBreakdown
    graduation: ProgramBreakdown
    chemistry: ProgramBreakdown
    saju: ProgramBreakdown
  }
  trend: MonthlyTrend[]
}

// [FIX] API가 반환하는 chemistry 키 누락 시 info.icon 런타임 크래시 — chemistry/saju 추가
const PROGRAM_INFO = {
  idol_image: { label: 'AI 이미지 분석', icon: Sparkles, color: 'bg-yellow-500' },
  figure: { label: '피규어 디퓨저', icon: Box, color: 'bg-cyan-500' },
  graduation: { label: '졸업 퍼퓸', icon: GraduationCap, color: 'bg-amber-500' },
  chemistry: { label: '레이어링 퍼퓸', icon: Users, color: 'bg-violet-500' },
  saju: { label: '사주 분석 퍼퓸', icon: Moon, color: 'bg-red-700' },
}

export default function RecipeSelectionSection() {
  const [data, setData] = useState<RecipeSelectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/datacenter/recipe-selection')
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
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">총 레시피</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data.total.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium">직접 선택</span>
          </div>
          <div className="text-2xl font-black text-blue-600">
            {data.breakdown.userDirect.percentage}%
          </div>
          <div className="text-xs text-blue-400 mt-1">
            {data.breakdown.userDirect.count.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Wand2 className="w-4 h-4" />
            <span className="text-xs font-medium">AI 추천</span>
          </div>
          <div className="text-2xl font-black text-purple-600">
            {data.breakdown.aiRecommended.percentage}%
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {data.breakdown.aiRecommended.count.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">원본 유지</span>
          </div>
          <div className="text-2xl font-black text-slate-600">
            {data.breakdown.original.percentage}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {data.breakdown.original.count.toLocaleString()}건
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 선택 비율 파이 차트 (심플 바 형태) */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-900">레시피 선택 비율</h2>
            </div>
          </div>
          <div className="p-5">
            {/* 전체 비율 바 */}
            <div className="h-12 rounded-xl overflow-hidden flex">
              <div
                className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold"
                style={{ width: `${data.breakdown.userDirect.percentage}%` }}
              >
                {data.breakdown.userDirect.percentage > 10 && '직접'}
              </div>
              <div
                className="bg-purple-500 flex items-center justify-center text-white text-sm font-bold"
                style={{ width: `${data.breakdown.aiRecommended.percentage}%` }}
              >
                {data.breakdown.aiRecommended.percentage > 10 && 'AI'}
              </div>
              <div
                className="bg-slate-300 flex items-center justify-center text-slate-600 text-sm font-bold"
                style={{ width: `${data.breakdown.original.percentage}%` }}
              >
                {data.breakdown.original.percentage > 10 && '원본'}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">직접 선택</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-slate-600">AI 추천</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-sm text-slate-600">원본 유지</span>
              </div>
            </div>

            {/* 인사이트 */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">
                💡 <strong>인사이트:</strong>{' '}
                {data.breakdown.aiRecommended.percentage > data.breakdown.userDirect.percentage
                  ? 'AI 추천 레시피에 대한 신뢰도가 높습니다.'
                  : data.breakdown.userDirect.percentage > 50
                  ? '사용자들이 직접 커스터마이징을 선호합니다.'
                  : '균형있게 두 옵션을 활용하고 있습니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 프로그램별 통계 */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">프로그램별 선택 패턴</h2>
            </div>
          </div>
          <div className="p-5 space-y-6">
            {(Object.entries(data.byProgram) as [keyof typeof PROGRAM_INFO, ProgramBreakdown][]).map(
              ([key, stats]) => {
                const info = PROGRAM_INFO[key]
                const Icon = info.icon
                const total = stats.total || 1
                const userPercent = Math.round((stats.userDirect / total) * 100)
                const aiPercent = Math.round((stats.aiRecommended / total) * 100)
                const origPercent = Math.round((stats.original / total) * 100)

                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`p-1.5 rounded-lg ${info.color} text-white`}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <span className="font-medium text-slate-700">{info.label}</span>
                      <span className="text-xs text-slate-400 ml-auto">
                        총 {stats.total}건
                      </span>
                    </div>
                    <div className="h-6 rounded-lg overflow-hidden flex">
                      <div
                        className="bg-blue-500"
                        style={{ width: `${userPercent}%` }}
                        title={`직접: ${userPercent}%`}
                      />
                      <div
                        className="bg-purple-500"
                        style={{ width: `${aiPercent}%` }}
                        title={`AI: ${aiPercent}%`}
                      />
                      <div
                        className="bg-slate-300"
                        style={{ width: `${origPercent}%` }}
                        title={`원본: ${origPercent}%`}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                      <span>직접 {userPercent}%</span>
                      <span>AI {aiPercent}%</span>
                      <span>원본 {origPercent}%</span>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      </div>

      {/* 월별 트렌드 */}
      {data.trend.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="font-bold text-slate-900">월별 트렌드</h2>
            </div>
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-500">월</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">총계</th>
                  <th className="text-right py-2 px-3 font-medium text-blue-500">직접</th>
                  <th className="text-right py-2 px-3 font-medium text-purple-500">AI</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-400">원본</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((row) => (
                  <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-700">{row.month}</td>
                    <td className="text-right py-2 px-3 text-slate-900">{row.total}</td>
                    <td className="text-right py-2 px-3 text-blue-600">{row.userDirect}</td>
                    <td className="text-right py-2 px-3 text-purple-600">{row.aiRecommended}</td>
                    <td className="text-right py-2 px-3 text-slate-400">{row.original}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
