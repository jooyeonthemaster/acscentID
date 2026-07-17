'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Beaker, Calendar, Trash2, ChevronRight, Droplets, ChevronDown, FolderOpen, Folder, User, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('mypage.recipes')
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

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })

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
          <div key={i} className="bg-[#12141D] rounded-[12px] p-4 animate-pulse border-2 border-[#262A38]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#232838] rounded-[12px]" />
              <div className="flex-1">
                <div className="h-5 bg-[#232838] rounded-[12px] w-1/3 mb-2" />
                <div className="h-3 bg-[#1B1F2C] rounded-[12px] w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((j) => (
                <div key={j} className="h-24 bg-[#1B1F2C] rounded-[12px]" />
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
      <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-[#151823] rounded-[12px] flex items-center justify-center border-2 border-[#262A38]">
          <Beaker size={40} className="text-[#A69F8D]" />
        </div>
        <h3 className="text-xl font-black mb-2">{t('emptyTitle')}</h3>
        <p className="text-[#8B8578] text-sm lg:text-base mb-6">
          {t('emptyDesc')}
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-[#F5EFE2] text-[#12141D] font-bold rounded-[12px] border-2 border-[#F5EFE2] transition-all"
        >
          {t('startAnalysis')}
        </Link>
      </div>
    )
  }

  // 레시피 카드 컴포넌트
  const RecipeCard = ({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) => (
    <div className={`bg-[#12141D] border-2 border-[#262A38] rounded-[12px] overflow-hidden transition-all ${compact ? 'p-3' : 'p-4'}`}>
      {/* 헤더 */}
      <div className="flex items-start gap-2 mb-3">
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-[#151823] to-[#151823] rounded-[12px] flex items-center justify-center border border-[#262A38] flex-shrink-0`}>
          <Droplets size={compact ? 14 : 16} className="text-[#A69F8D]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold truncate ${compact ? 'text-sm lg:text-base' : 'text-base'}`}>{recipe.perfume_name}</h4>
          <p className="text-[10px] lg:text-[12px] text-[#8B8578] flex items-center gap-1">
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
              className="text-[9px] px-2 py-0.5 bg-[#151823] text-[#E9E2D0] rounded-full font-bold"
            >
              {g.name} {g.ratio}%
            </span>
          ))}
          {recipe.generated_recipe.granules.length > (compact ? 2 : 3) && (
            <span className="text-[9px] px-2 py-0.5 bg-[#1B1F2C] text-[#8B8578] rounded-full">
              +{recipe.generated_recipe.granules.length - (compact ? 2 : 3)}
            </span>
          )}
        </div>
      )}

      {/* 유지력 바 */}
      {recipe.retention_percentage > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="font-bold text-[#8B8578]">{t('retention')}</span>
            <span className="font-black text-[#A69F8D]">{recipe.retention_percentage}%</span>
          </div>
          <div className="h-1.5 bg-[#1B1F2C] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#161925] to-[#161925] rounded-full"
              style={{ width: `${recipe.retention_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Link
          href={`/mypage/recipe/${recipe.id}`}
          className="flex-1 py-2 bg-[#F5EFE2] text-[#12141D] text-[11px] lg:text-[13px] font-bold rounded-[12px] text-center hover:bg-[#FFFDF5] transition-colors flex items-center justify-center gap-1"
        >
          {t('viewDetail')}
          <ChevronRight size={12} />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault()
            if (confirm(t('deleteConfirm'))) {
              onDelete(recipe.id)
            }
          }}
          className="p-2 text-[#8B8578] hover:text-red-500 hover:bg-red-50 rounded-[12px] transition-colors border border-[#262A38] hover:border-red-200"
          title={t('delete')}
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
            className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] overflow-hidden"
          >
            {/* 폴더 헤더 */}
            <button
              onClick={() => toggleGroup(groupId)}
              className="w-full p-4 flex items-center gap-4 hover:bg-[#0C0E16] transition-colors text-left"
            >
              {/* 폴더 아이콘 또는 분석 이미지 */}
              {group.analysis?.user_image_url ? (
                <img
                  src={group.analysis.user_image_url}
                  alt=""
                  className="w-14 h-14 rounded-[12px] object-cover border-2 border-[#262A38]"
                />
              ) : (
                <div className={`w-14 h-14 rounded-[12px] flex items-center justify-center border-2 border-[#262A38] ${
                  group.analysis ? 'bg-gradient-to-br from-[#151823] to-[#151823]' : 'bg-gradient-to-br from-[#151823] to-[#232838]'
                }`}>
                  {group.analysis ? (
                    <Sparkles size={24} className="text-[#8B8578]" />
                  ) : (
                    isExpanded ? <FolderOpen size={24} className="text-[#8B8578]" /> : <Folder size={24} className="text-[#8B8578]" />
                  )}
                </div>
              )}

              {/* 그룹 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg truncate">
                    {group.analysis?.twitter_name || t('independentRecipes')}
                  </h3>
                  <span className="px-2 py-0.5 bg-[#161925] text-[#E9E2D0] text-xs lg:text-sm font-black rounded-full border border-[#262A38]">
                    {group.recipes.length}
                  </span>
                </div>
                {group.analysis ? (
                  <p className="text-sm lg:text-base text-[#8B8578] truncate">
                    {group.analysis.perfume_name} · {formatRelativeTime(group.analysis.created_at)}
                  </p>
                ) : (
                  <p className="text-sm lg:text-base text-[#8B8578]">
                    {t('unlinkedRecipes')}
                  </p>
                )}
              </div>

              {/* 확장/축소 아이콘 */}
              <div className={`p-2 rounded-[12px] border-2 border-[#262A38] transition-transform ${isExpanded ? 'rotate-180 bg-[#151823]' : 'bg-[#12141D]'}`}>
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
                  <div className="p-4 pt-0 border-t-2 border-dashed border-[#262A38]">
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
