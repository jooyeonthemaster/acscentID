'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Beaker, Calendar, Trash2, ChevronRight, Droplets, ChevronDown, FolderOpen, Folder, User, Sparkles } from 'lucide-react'
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

interface AnalysisInfo {
  id: string
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  created_at: string
}

interface RecipeGroup {
  analysis: AnalysisInfo | null
  recipes: Recipe[]
}

interface SavedRecipeListProps {
  recipeGroups?: RecipeGroup[]
  recipes?: Recipe[]  // 기존 호환성
  loading: boolean
  onDelete: (id: string) => void
  viewMode?: 'grid' | 'list'
}

export function SavedRecipeList({ recipeGroups, recipes, loading, onDelete, viewMode = 'grid' }: SavedRecipeListProps) {
  // 초기값을 null로 설정하고, 첫 렌더링 시 모든 그룹을 펼침
  const [expandedGroups, setExpandedGroups] = useState<Set<string> | null>(null)

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      if (!prev) return new Set([groupId])
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border-2 border-black shadow-[4px_4px_0_0_black]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((j) => (
                <div key={j} className="h-24 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 데이터 처리 - recipeGroups가 있으면 사용, 없으면 기존 recipes를 하나의 그룹으로
  const groups: RecipeGroup[] = recipeGroups && recipeGroups.length > 0
    ? recipeGroups
    : recipes && recipes.length > 0
      ? [{ analysis: null, recipes }]
      : []

  const totalRecipes = groups.reduce((sum, g) => sum + g.recipes.length, 0)

  // 그룹 데이터가 로드되면 모든 그룹을 펼침
  useEffect(() => {
    if (groups.length > 0 && expandedGroups === null) {
      const allGroupIds = groups.map(g => g.analysis?.id || 'unlinked')
      setExpandedGroups(new Set(allGroupIds))
    }
  }, [groups, expandedGroups])

  // 빈 상태
  if (totalRecipes === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-12 text-center shadow-[4px_4px_0_0_black]">
        <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 rounded-2xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black]">
          <Beaker size={40} className="text-yellow-600" />
        </div>
        <h3 className="text-xl font-black mb-2">저장된 레시피가 없어요</h3>
        <p className="text-slate-500 text-sm mb-6">
          피드백을 남기고 나만의 레시피를 만들어보세요!
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          분석 시작하기
        </Link>
      </div>
    )
  }

  // 레시피 카드 컴포넌트
  const RecipeCard = ({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) => (
    <div className={`bg-white border-2 border-black rounded-xl overflow-hidden shadow-[3px_3px_0_0_black] hover:shadow-[4px_4px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all ${compact ? 'p-3' : 'p-4'}`}>
      {/* 헤더 */}
      <div className="flex items-start gap-2 mb-3">
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg flex items-center justify-center border border-black flex-shrink-0`}>
          <Droplets size={compact ? 14 : 16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold truncate ${compact ? 'text-sm' : 'text-base'}`}>{recipe.perfume_name}</h4>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Calendar size={8} />
            {formatRelativeTime(recipe.created_at)}
          </p>
        </div>
      </div>

      {/* 향료 태그 */}
      {recipe.generated_recipe && recipe.generated_recipe.granules && (
        <div className="flex gap-1 flex-wrap mb-3">
          {recipe.generated_recipe.granules.slice(0, compact ? 2 : 3).map((g) => (
            <span
              key={g.id}
              className="text-[9px] px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold"
            >
              {g.name} {g.ratio}%
            </span>
          ))}
          {recipe.generated_recipe.granules.length > (compact ? 2 : 3) && (
            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
              +{recipe.generated_recipe.granules.length - (compact ? 2 : 3)}
            </span>
          )}
        </div>
      )}

      {/* 유지력 바 */}
      {recipe.retention_percentage > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="font-bold text-slate-500">유지력</span>
            <span className="font-black text-amber-600">{recipe.retention_percentage}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              style={{ width: `${recipe.retention_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Link
          href={`/mypage/recipe/${recipe.id}`}
          className="flex-1 py-2 bg-black text-white text-[11px] font-bold rounded-lg text-center hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
        >
          상세보기
          <ChevronRight size={12} />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault()
            if (confirm('이 레시피를 삭제할까요?')) {
              onDelete(recipe.id)
            }
          }}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
          title="삭제"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  // 폴더 형태로 렌더링
  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const groupId = group.analysis?.id || 'unlinked'
        // expandedGroups가 null이면 초기 로딩 중이므로 펼침 상태로 표시
        const isExpanded = expandedGroups === null || expandedGroups.has(groupId)

        return (
          <motion.div
            key={groupId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]"
          >
            {/* 폴더 헤더 */}
            <button
              onClick={() => toggleGroup(groupId)}
              className="w-full p-4 flex items-center gap-4 hover:bg-yellow-50 transition-colors text-left"
            >
              {/* 폴더 아이콘 또는 분석 이미지 */}
              {group.analysis?.user_image_url ? (
                <img
                  src={group.analysis.user_image_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover border-2 border-black shadow-[2px_2px_0_0_black]"
                />
              ) : (
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black] ${
                  group.analysis ? 'bg-gradient-to-br from-purple-100 to-pink-100' : 'bg-gradient-to-br from-slate-100 to-slate-200'
                }`}>
                  {group.analysis ? (
                    <Sparkles size={24} className="text-purple-500" />
                  ) : (
                    isExpanded ? <FolderOpen size={24} className="text-slate-500" /> : <Folder size={24} className="text-slate-500" />
                  )}
                </div>
              )}

              {/* 그룹 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg truncate">
                    {group.analysis?.twitter_name || '독립 레시피'}
                  </h3>
                  <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-black rounded-full border border-black">
                    {group.recipes.length}
                  </span>
                </div>
                {group.analysis ? (
                  <p className="text-sm text-slate-500 truncate">
                    {group.analysis.perfume_name} · {formatRelativeTime(group.analysis.created_at)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    분석과 연결되지 않은 레시피들
                  </p>
                )}
              </div>

              {/* 확장/축소 아이콘 */}
              <div className={`p-2 rounded-lg border-2 border-black transition-transform ${isExpanded ? 'rotate-180 bg-yellow-100' : 'bg-white'}`}>
                <ChevronDown size={20} />
              </div>
            </button>

            {/* 레시피 목록 */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t-2 border-dashed border-slate-200">
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-2 gap-2 pt-4'
                      : 'space-y-3 pt-4'
                    }>
                      {group.recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} compact={viewMode === 'grid'} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
