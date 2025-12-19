'use client'

import { motion } from 'framer-motion'
import { Beaker, Calendar, Trash2, ChevronRight, Droplets } from 'lucide-react'
import Link from 'next/link'

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface Recipe {
  id: string
  created_at: string
  perfume_name: string
  perfume_id: string
  generated_recipe: {
    granules: RecipeGranule[]
    overallExplanation: string
  } | null
  retention_percentage: number
}

interface SavedRecipeListProps {
  recipes: Recipe[]
  loading: boolean
  onDelete: (id: string) => void
}

export function SavedRecipeList({ recipes, loading, onDelete }: SavedRecipeListProps) {
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 빈 상태
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
          <Beaker size={36} className="text-amber-300" />
        </div>
        <p className="text-slate-600 font-medium">저장된 레시피가 없어요</p>
        <p className="text-slate-400 text-sm mt-1">
          피드백을 남기고 나만의 레시피를 만들어보세요!
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-shadow"
        >
          분석 시작하기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recipes.map((recipe, index) => (
        <motion.div
          key={recipe.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Droplets size={20} className="text-amber-600" />
            </div>

            {/* 레시피 정보 */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{recipe.perfume_name}</h3>

              {/* 날짜 */}
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar size={11} />
                {formatRelativeTime(recipe.created_at)}
              </p>

              {/* 향료 태그 */}
              {recipe.generated_recipe && recipe.generated_recipe.granules && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {recipe.generated_recipe.granules.slice(0, 3).map((g) => (
                    <span
                      key={g.id}
                      className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"
                    >
                      {g.name} {g.ratio}%
                    </span>
                  ))}
                  {recipe.generated_recipe.granules.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                      +{recipe.generated_recipe.granules.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onDelete(recipe.id)
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="삭제"
              >
                <Trash2 size={16} />
              </button>

              <Link
                href={`/mypage/recipe/${recipe.id}`}
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                title="상세보기"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
