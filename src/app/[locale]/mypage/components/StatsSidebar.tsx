'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Calendar, Sparkles, Beaker, Clock, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('mypage.stats')

  // 상대 시간 포맷
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })

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
        <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] p-5 animate-pulse">
          <div className="h-6 bg-[#232838] rounded-[12px] w-1/2 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-[#1B1F2C] rounded-[12px]" />
            <div className="h-20 bg-[#1B1F2C] rounded-[12px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-[#262A38] bg-gradient-to-r from-[#161925] to-[#161925]">
          <h3 className="font-black flex items-center gap-2">
            <TrendingUp size={18} />
            {t('myStats')}
          </h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 총 분석 */}
            <div className="p-4 bg-[#0C0E16] rounded-[12px] border-2 border-[#262A38]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-[#A69F8D]" />
                <span className="text-xs lg:text-sm font-bold text-[#A69F8D]">{t('totalAnalyses')}</span>
              </div>
              <p className="text-2xl font-black">{analyses.length}</p>
            </div>

            {/* 확정 레시피 */}
            <div className="p-4 bg-[#0C0E16] rounded-[12px] border-2 border-[#262A38]">
              <div className="flex items-center gap-2 mb-2">
                <Beaker size={16} className="text-[#A69F8D]" />
                <span className="text-xs lg:text-sm font-bold text-[#A69F8D]">{t('confirmedRecipes')}</span>
              </div>
              <p className="text-2xl font-black">{analyses.filter(a => a.confirmed_recipe !== null).length}</p>
            </div>
          </div>

          {/* 이번 달 활동 */}
          <div className="mt-4 p-4 bg-[#151823] rounded-[12px] border-2 border-[#262A38]">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} />
              <span className="text-xs lg:text-sm font-bold">{t('thisMonthActivity')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-lg font-black text-[#A69F8D]">{thisMonthAnalyses}</p>
                <p className="text-[10px] lg:text-[12px] text-[#8B8578]">{t('analysisLabel')}</p>
              </div>
              <div className="text-2xl">+</div>
              <div className="text-center">
                <p className="text-lg font-black text-[#A69F8D]">{thisMonthRecipes}</p>
                <p className="text-[10px] lg:text-[12px] text-[#8B8578]">{t('recipeLabel')}</p>
              </div>
              <div className="text-2xl">=</div>
              <div className="text-center">
                <p className="text-lg font-black">{thisMonthAnalyses + thisMonthRecipes}</p>
                <p className="text-[10px] lg:text-[12px] text-[#8B8578]">{t('totalActivity')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-[#262A38]">
          <h3 className="font-black flex items-center gap-2">
            <Clock size={18} />
            {t('recentActivity')}
          </h3>
        </div>

        <div className="p-3">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm lg:text-base text-[#8B8578]">{t('noActivity')}</p>
              <Link
                href="/"
                className="inline-block mt-3 px-4 py-2 bg-[#F5EFE2] text-[#12141D] text-xs lg:text-sm font-bold rounded-[12px] border-2 border-[#F5EFE2] transition-all"
              >
                {t('startFirstAnalysis')}
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
                    className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#151823] transition-colors group"
                  >
                    {/* 아이콘/이미지 */}
                    {activity.image ? (
                      <img
                        src={activity.image}
                        alt=""
                        className="w-10 h-10 rounded-[12px] object-cover border-2 border-[#262A38]"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center border-2 border-[#262A38] ${
                        activity.hasRecipe ? 'bg-[#151823]' : 'bg-[#151823]'
                      }`}>
                        {activity.hasRecipe ? (
                          <Beaker size={16} className="text-[#A69F8D]" />
                        ) : (
                          <Sparkles size={16} className="text-[#A69F8D]" />
                        )}
                      </div>
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm lg:text-base font-bold truncate">{activity.name}</p>
                      <p className="text-[10px] lg:text-[12px] text-[#8B8578]">
                        {activity.hasRecipe ? t('recipeSaved') : t('analysisComplete')}
                        {' · '}
                        {formatRelativeTime(activity.date)}
                      </p>
                    </div>

                    {/* 화살표 */}
                    <ArrowRight size={16} className="text-[#5C564A] group-hover:text-[#8B8578] group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-gradient-to-br from-[#0C0E16] to-[#161925] border-2 border-[#262A38] rounded-[12px] p-5 text-[#E9E2D0]">
        <h3 className="font-black text-lg mb-2">{t('startNewAnalysis')}</h3>
        <p className="text-xs lg:text-sm text-[#5C564A] mb-4">{t('aiFindsScent')}</p>
        <Link
          href="/"
          className="block w-full py-3 bg-[#F5EFE2] text-[#12141D] text-center font-bold rounded-[12px] border-2 border-[#F5EFE2] hover:bg-[#FFFDF5] transition-colors"
        >
          {t('goAnalyze')}
        </Link>
      </div>
    </div>
  )
}
