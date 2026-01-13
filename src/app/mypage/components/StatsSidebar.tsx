'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Calendar, Sparkles, Beaker, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface ConfirmedRecipe {
  granules: RecipeGranule[]
}

interface Analysis {
  id: string
  created_at: string
  twitter_name: string
  idol_name?: string | null
  perfume_name: string
  user_image_url: string | null
  confirmed_recipe: ConfirmedRecipe | null
}

interface StatsSidebarProps {
  analyses: Analysis[]
  loading: boolean
}

export function StatsSidebar({ analyses, loading }: StatsSidebarProps) {
  // 상대 시간 포맷
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })
  }

  // 최근 활동 (분석 결과만, 최근 5개)
  const recentActivities = analyses
    .map(a => ({
      type: a.confirmed_recipe ? 'recipe' as const : 'analysis' as const,
      id: a.id,
      name: a.idol_name || a.twitter_name,
      date: a.created_at,
      image: a.user_image_url,
      hasRecipe: a.confirmed_recipe !== null
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // 이번 달 활동 통계
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const thisMonthAnalyses = analyses.filter(a => new Date(a.created_at) >= thisMonth).length
  const thisMonthRecipes = analyses.filter(a => a.confirmed_recipe !== null && new Date(a.created_at) >= thisMonth).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black] animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]">
        <div className="px-5 py-4 border-b-2 border-black bg-gradient-to-r from-yellow-400 to-amber-400">
          <h3 className="font-black flex items-center gap-2">
            <TrendingUp size={18} />
            내 활동 통계
          </h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 총 분석 */}
            <div className="p-4 bg-purple-50 rounded-xl border-2 border-black">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-purple-600" />
                <span className="text-xs font-bold text-purple-600">총 분석</span>
              </div>
              <p className="text-2xl font-black">{analyses.length}</p>
            </div>

            {/* 확정 레시피 */}
            <div className="p-4 bg-yellow-50 rounded-xl border-2 border-black">
              <div className="flex items-center gap-2 mb-2">
                <Beaker size={16} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-600">확정 레시피</span>
              </div>
              <p className="text-2xl font-black">{analyses.filter(a => a.confirmed_recipe !== null).length}</p>
            </div>
          </div>

          {/* 이번 달 활동 */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-black">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} />
              <span className="text-xs font-bold">이번 달 활동</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-lg font-black text-purple-600">{thisMonthAnalyses}</p>
                <p className="text-[10px] text-slate-500">분석</p>
              </div>
              <div className="text-2xl">+</div>
              <div className="text-center">
                <p className="text-lg font-black text-yellow-600">{thisMonthRecipes}</p>
                <p className="text-[10px] text-slate-500">레시피</p>
              </div>
              <div className="text-2xl">=</div>
              <div className="text-center">
                <p className="text-lg font-black">{thisMonthAnalyses + thisMonthRecipes}</p>
                <p className="text-[10px] text-slate-500">총 활동</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]">
        <div className="px-5 py-4 border-b-2 border-black">
          <h3 className="font-black flex items-center gap-2">
            <Clock size={18} />
            최근 활동
          </h3>
        </div>

        <div className="p-3">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">아직 활동이 없어요</p>
              <Link
                href="/"
                className="inline-block mt-3 px-4 py-2 bg-yellow-400 text-black text-xs font-bold rounded-lg border-2 border-black shadow-[2px_2px_0_0_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                첫 분석 시작하기
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentActivities.map((activity, index) => (
                <motion.li
                  key={`${activity.type}-${activity.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/result?id=${activity.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    {/* 아이콘/이미지 */}
                    {activity.image ? (
                      <img
                        src={activity.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border-2 border-black"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 border-black ${
                        activity.hasRecipe ? 'bg-yellow-100' : 'bg-purple-100'
                      }`}>
                        {activity.hasRecipe ? (
                          <Beaker size={16} className="text-yellow-600" />
                        ) : (
                          <Sparkles size={16} className="text-purple-600" />
                        )}
                      </div>
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{activity.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {activity.hasRecipe ? '레시피 저장' : '분석 완료'}
                        {' · '}
                        {formatRelativeTime(activity.date)}
                      </p>
                    </div>

                    {/* 화살표 */}
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-gradient-to-br from-black to-slate-800 border-2 border-black rounded-2xl p-5 text-white shadow-[4px_4px_0_0_#fbbf24]">
        <h3 className="font-black text-lg mb-2">새로운 분석 시작</h3>
        <p className="text-xs text-slate-300 mb-4">AI가 당신만의 향수를 찾아드려요</p>
        <Link
          href="/"
          className="block w-full py-3 bg-yellow-400 text-black text-center font-bold rounded-xl border-2 border-black hover:bg-yellow-300 transition-colors"
        >
          분석하러 가기 →
        </Link>
      </div>
    </div>
  )
}
