'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Minus, X, Info } from 'lucide-react'
import { SpecificScent, FEEDBACK_CATEGORY_INFO, PerfumeFeedback } from '@/types/feedback'
import { perfumes, getPerfumesByCategory, categoryDescriptions } from '@/data/perfumes'

interface FeedbackStep2NewProps {
  // 추천받은 향수 정보
  recommendedPerfumeId: string
  recommendedPerfumeName: string
  recommendedPerfumeCategory: string
  retentionPercentage: number
  // 선택 상태
  selectedScents: SpecificScent[]
  notes: string
  // 핸들러
  onAddScent: (scent: SpecificScent) => boolean
  onRemoveScent: (scentId: string) => void
  onUpdateRatio: (scentId: string, ratio: number) => void
  onNotesChange: (notes: string) => void
  // 이전 피드백 (재피드백 시)
  previousFeedback?: PerfumeFeedback | null
}

// 카테고리 키 타입
type CategoryKey = keyof typeof FEEDBACK_CATEGORY_INFO

// 카테고리 순서
const CATEGORY_ORDER: CategoryKey[] = ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy']

export function FeedbackStep2New({
  recommendedPerfumeId,
  recommendedPerfumeName,
  recommendedPerfumeCategory,
  retentionPercentage,
  selectedScents,
  notes,
  onAddScent,
  onRemoveScent,
  onUpdateRatio,
  onNotesChange,
  previousFeedback,
}: FeedbackStep2NewProps) {
  // 열린 아코디언 상태
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // 추천 향수의 색상
  const recommendedPerfume = useMemo(() => {
    return perfumes.find((p) => p.id === recommendedPerfumeId)
  }, [recommendedPerfumeId])

  // 현재 추가 향료들의 총 비율
  const totalAdditionalRatio = useMemo(() => {
    return selectedScents.reduce((sum, s) => sum + s.ratio, 0)
  }, [selectedScents])

  // 현재 총 비율 (추천 향 + 추가 향료)
  const currentTotalRatio = retentionPercentage + totalAdditionalRatio

  // 남은 비율
  const remainingRatio = 100 - retentionPercentage

  // 비율 초과 여부
  const isOverLimit = currentTotalRatio > 100

  // 카테고리별 향수 목록 (추천 향수 제외)
  const perfumesByCategory = useMemo(() => {
    const result: Record<string, typeof perfumes> = {}
    CATEGORY_ORDER.forEach((cat) => {
      result[cat] = getPerfumesByCategory(cat).filter((p) => p.id !== recommendedPerfumeId)
    })
    return result
  }, [recommendedPerfumeId])

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category))
  }

  // 향료 선택
  const handleSelectScent = (perfume: (typeof perfumes)[0]) => {
    // 남은 공간에서 기본 비율 결정 (최대 30%, 최소 5%)
    const availableRatio = remainingRatio - totalAdditionalRatio
    const defaultRatio = Math.min(Math.max(Math.floor(availableRatio / 2 / 5) * 5, 5), 30)

    const added = onAddScent({
      id: perfume.id,
      name: perfume.name,
      ratio: defaultRatio,
    })
    if (added) {
      // 선택 후 아코디언 닫지 않음 (UX)
    }
  }

  // 이미 선택된 향료인지 확인
  const isSelected = (perfumeId: string) => {
    return selectedScents.some((s) => s.id === perfumeId)
  }

  // 추천 카테고리 한글
  const recommendedCategoryInfo = FEEDBACK_CATEGORY_INFO[recommendedPerfumeCategory as CategoryKey]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* 추천 향수 정보 카드 */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200/50">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
            style={{ backgroundColor: recommendedPerfume?.primaryColor || '#6B7280' }}
          >
            {recommendedPerfumeId.split(' ')[1]}
          </div>
          <div className="flex-1">
            <p className="text-xs text-amber-600 font-medium">추천받은 향</p>
            <h3 className="font-bold text-slate-900">{recommendedPerfumeName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg">{recommendedCategoryInfo?.icon}</span>
              <span className="text-xs text-slate-500">{recommendedCategoryInfo?.label} 계열</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">선택 비율</p>
            <p className="text-2xl font-black text-amber-500">{retentionPercentage}%</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-white/60 rounded-lg px-3 py-2 space-y-1">
          <p>
            💡 나머지 <span className="font-bold text-amber-600">{remainingRatio}%</span>를
            아래에서 추가 향료를 선택해 채워주세요!
          </p>
          <p className="text-red-500 font-semibold">⚠️ 최대 2개까지 선택 가능</p>
        </div>
      </div>

      {/* 이전 피드백 표시 (재피드백 시) */}
      {previousFeedback && previousFeedback.specificScents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 rounded-xl p-3 border border-purple-200/50"
        >
          <div className="flex items-start gap-2">
            <Info size={16} className="text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="text-purple-700 font-medium mb-1.5">이전에 선택한 향료</p>
              <div className="flex flex-wrap gap-1.5">
                {previousFeedback.specificScents.map((scent) => (
                  <span
                    key={scent.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"
                  >
                    <span className="font-medium">{scent.name}</span>
                    <span className="text-purple-500">{scent.ratio}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 카테고리 아코디언 */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          향료 카테고리별 탐색
          {selectedScents.length >= 2 && (
            <span className="text-xs font-normal text-slate-400 ml-2">
              (최대 2개 선택 완료)
            </span>
          )}
        </h3>

        {CATEGORY_ORDER.map((category) => {
          const info = FEEDBACK_CATEGORY_INFO[category]
          const categoryPerfumes = perfumesByCategory[category]
          const isExpanded = expandedCategory === category
          const isRecommendedCategory = category === recommendedPerfumeCategory

          // 이 카테고리에서 선택된 향료 찾기
          const selectedInCategory = selectedScents.filter((scent) =>
            categoryPerfumes.some((p) => p.id === scent.id)
          )
          const hasSelectedScents = selectedInCategory.length > 0

          return (
            <div
              key={category}
              className={`overflow-hidden rounded-2xl border-2 transition-colors ${
                isExpanded
                  ? 'border-amber-300 shadow-sm'
                  : hasSelectedScents
                    ? 'border-amber-200'
                    : 'border-slate-200'
              }`}
            >
              {/* 카테고리 헤더 */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between p-4 transition-all ${
                  isExpanded
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50'
                    : hasSelectedScents
                      ? 'bg-amber-50/50 hover:bg-amber-50'
                      : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isExpanded ? 'text-amber-800' : 'text-slate-900'}`}>
                        {info.label}
                      </span>
                      {isRecommendedCategory && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          추천 향 계열
                        </span>
                      )}
                    </div>
                    {/* 닫혀있을 때 선택된 향료 미리보기 */}
                    {!isExpanded && hasSelectedScents ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {selectedInCategory.map((scent) => (
                          <span
                            key={scent.id}
                            className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"
                          >
                            {scent.id} {scent.ratio}%
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${isExpanded ? 'text-amber-600/70' : 'text-slate-400'}`}>
                        {categoryDescriptions[category]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${isExpanded ? 'text-amber-600' : 'text-slate-400'}`}>
                    {categoryPerfumes.length}개
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={20} className={isExpanded ? 'text-amber-500' : 'text-slate-400'} />
                  </motion.div>
                </div>
              </button>

              {/* 향수 목록 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 max-h-[280px] overflow-y-auto">
                      {categoryPerfumes.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                          이 카테고리에 선택 가능한 향료가 없어요
                        </p>
                      ) : (
                        categoryPerfumes.map((perfume) => {
                          const alreadySelected = isSelected(perfume.id)
                          const canAdd = selectedScents.length < 2
                          const selectedScent = selectedScents.find((s) => s.id === perfume.id)

                          // 이 향료를 제외한 다른 추가 향료들의 비율 합
                          const otherScentsRatio = selectedScents
                            .filter((s) => s.id !== perfume.id)
                            .reduce((sum, s) => sum + s.ratio, 0)
                          // 이 향료가 가질 수 있는 최대 비율 (남은 비율 전체 사용 가능)
                          const maxRatioForThis = remainingRatio - otherScentsRatio
                          const canIncrease = selectedScent && selectedScent.ratio < maxRatioForThis

                          return (
                            <div key={perfume.id} className="space-y-0">
                              {/* 향료 버튼 */}
                              <button
                                onClick={() => !alreadySelected && canAdd && handleSelectScent(perfume)}
                                disabled={!alreadySelected && !canAdd}
                                className={`w-full flex items-center gap-3 p-3 transition-all ${
                                  alreadySelected
                                    ? 'bg-amber-100 border-2 border-amber-400 rounded-xl rounded-b-none'
                                    : canAdd
                                      ? 'bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl'
                                      : 'bg-slate-100 border border-slate-200 opacity-50 cursor-not-allowed rounded-xl'
                                }`}
                              >
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: perfume.primaryColor }}
                                >
                                  {perfume.id.split(' ')[1]}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className="font-medium text-slate-900 text-sm truncate">
                                    {perfume.name}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">
                                    {perfume.keywords.slice(0, 3).join(' · ')}
                                  </p>
                                </div>
                                {alreadySelected ? (
                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                    선택됨
                                  </span>
                                ) : canAdd ? (
                                  <Plus size={18} className="text-amber-500 flex-shrink-0" />
                                ) : null}
                              </button>

                              {/* 선택 시 바로 아래에 슬라이더 펼쳐짐 */}
                              <AnimatePresence>
                                {alreadySelected && selectedScent && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-amber-50 border-2 border-t-0 border-amber-400 rounded-b-xl px-4 py-3 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600 font-medium">추가 비율</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-bold text-amber-600">{selectedScent.ratio}%</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              onRemoveScent(perfume.id)
                                            }}
                                            className="p-1 rounded-full hover:bg-red-100 transition-colors"
                                          >
                                            <X size={14} className="text-slate-400 hover:text-red-500" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onUpdateRatio(perfume.id, selectedScent.ratio - 5)
                                          }}
                                          disabled={selectedScent.ratio <= 5}
                                          className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                          <Minus size={14} className="text-amber-600" />
                                        </button>
                                        <input
                                          id={`ratio-inline-${perfume.id}`}
                                          name={`ratio-inline-${perfume.id}`}
                                          type="range"
                                          min={5}
                                          max={maxRatioForThis}
                                          step={5}
                                          value={selectedScent.ratio}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => onUpdateRatio(perfume.id, parseInt(e.target.value))}
                                          className="flex-1 h-2 bg-amber-200 rounded-full appearance-none cursor-pointer
                                            [&::-webkit-slider-thumb]:appearance-none
                                            [&::-webkit-slider-thumb]:w-5
                                            [&::-webkit-slider-thumb]:h-5
                                            [&::-webkit-slider-thumb]:bg-amber-500
                                            [&::-webkit-slider-thumb]:rounded-full
                                            [&::-webkit-slider-thumb]:shadow
                                            [&::-webkit-slider-thumb]:cursor-grab
                                            [&::-webkit-slider-thumb]:active:cursor-grabbing"
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onUpdateRatio(perfume.id, selectedScent.ratio + 5)
                                          }}
                                          disabled={!canIncrease}
                                          className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                          <Plus size={14} className="text-amber-600" />
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-amber-600/70 text-right">
                                        최대 {maxRatioForThis}%까지 설정 가능
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* 현재 비율 상태 표시 */}
      <div className={`rounded-2xl p-4 border-2 ${
        currentTotalRatio === 100
          ? 'bg-green-50 border-green-300'
          : currentTotalRatio > 100
            ? 'bg-red-50 border-red-300'
            : 'bg-amber-50 border-amber-300'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">현재 비율 상태</span>
          <span className={`text-lg font-black ${
            currentTotalRatio === 100
              ? 'text-green-600'
              : currentTotalRatio > 100
                ? 'text-red-600'
                : 'text-amber-600'
          }`}>
            {currentTotalRatio}% / 100%
          </span>
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              currentTotalRatio === 100
                ? 'bg-green-500'
                : currentTotalRatio > 100
                  ? 'bg-red-500'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(currentTotalRatio, 100)}%` }}
          />
        </div>

        {/* 상태 메시지 */}
        <p className={`text-xs mt-2 font-medium ${
          currentTotalRatio === 100
            ? 'text-green-700'
            : currentTotalRatio > 100
              ? 'text-red-700'
              : 'text-amber-700'
        }`}>
          {currentTotalRatio === 100
            ? '✅ 완벽해요! 다음 단계로 진행할 수 있어요'
            : currentTotalRatio > 100
              ? `❌ 비율이 ${currentTotalRatio - 100}% 초과했어요! 조절해주세요`
              : `⚠️ 아직 ${100 - currentTotalRatio}% 남았어요! 향료를 더 추가하거나 비율을 조절해주세요`}
        </p>
      </div>
    </motion.div>
  )
}
