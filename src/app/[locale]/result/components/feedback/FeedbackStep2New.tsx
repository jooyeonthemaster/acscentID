'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Minus, X, Info, Search } from 'lucide-react'
import { SpecificScent, FEEDBACK_CATEGORY_INFO, PerfumeFeedback } from '@/types/feedback'
import { perfumes, getPerfumesByCategory } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { FeedbackTheme, SJ, useFeedbackTranslations } from './sajuFeedbackTheme'

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
  theme?: FeedbackTheme
}

// 카테고리 키 타입
type CategoryKey = keyof typeof FEEDBACK_CATEGORY_INFO

// 카테고리 순서
const CATEGORY_ORDER: CategoryKey[] = ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy']

// 배경색이 밝은지 어두운지 판단 (밝으면 true)
const isLightColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // 밝기 계산 (YIQ 공식)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 180
}

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
  theme = 'default',
}: FeedbackStep2NewProps) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'
  const { getLocalizedName, getLocalizedKeywords } = useLocalizedPerfumes()

  // 향료 아이템/슬라이더 — 검색 결과와 카테고리 아코디언 두 곳에서 공유하는 스킨
  const itemSelectedCls = saju
    ? 'bg-[#C9A227]/15 border-2 border-[#C9A227] rounded-[12px] rounded-b-none'
    : 'bg-[#151823] border-2 border-[#343A4C] rounded-[12px] rounded-b-none'
  const itemAddableCls = saju
    ? 'bg-[#FDFAF1] hover:bg-[#F5EFE2] border border-[#D8CFBB] hover:border-[#C9A227] rounded-[12px]'
    : 'bg-[#12141D] hover:bg-[#0C0E16] border border-[#262A38] hover:border-[#262A38] rounded-[12px]'
  const itemDisabledCls = saju
    ? 'bg-[#EDE5D2] border border-[#D8CFBB] opacity-50 cursor-not-allowed rounded-[12px]'
    : 'bg-[#1B1F2C] border border-[#262A38] opacity-50 cursor-not-allowed rounded-[12px]'
  const itemNameCls = saju ? SJ.ink : 'text-[#E9E2D0]'
  const itemMetaCls = saju ? SJ.inkFaint : 'text-[#8B8578]'
  const selectedChipCls = saju
    ? `${SJ.chipGold} text-xs lg:text-sm font-medium px-2 py-1 rounded-full`
    : 'text-xs lg:text-sm font-medium text-[#A69F8D] bg-[#0C0E16] px-2 py-1 rounded-full'
  const plusIconCls = saju ? 'text-[#C9A227]' : 'text-[#8B8578]'
  const sliderPanelCls = saju
    ? 'bg-[#C9A227]/10 border-2 border-t-0 border-[#C9A227] rounded-b-[12px] px-4 py-3 space-y-2'
    : 'bg-[#0C0E16] border-2 border-t-0 border-[#343A4C] rounded-b-[12px] px-4 py-3 space-y-2'
  const ratioLabelCls = saju ? SJ.inkMuted : 'text-[#A69F8D]'
  const ratioValueCls = saju ? SJ.goldText : 'text-[#A69F8D]'
  const stepBtnCls = saju
    ? 'bg-[#FDFAF1] border border-[#C9A227]/40 hover:bg-[#C9A227]/15'
    : 'bg-[#12141D] border border-[#262A38] hover:bg-[#151823]'
  const stepIconCls = saju ? 'text-[#7A5C14]' : 'text-[#A69F8D]'
  const removeBtnCls = saju ? 'hover:bg-[#C0392B]/10' : 'hover:bg-red-100'
  const removeIconCls = saju ? 'text-[#8B8578] hover:text-[#A93226]' : 'text-[#8B8578] hover:text-red-500'
  const rangeTrackCls = saju ? 'bg-[#D8CFBB]' : 'bg-[#232838]'
  const rangeThumbCls = saju ? '[&::-webkit-slider-thumb]:bg-[#C9A227]' : '[&::-webkit-slider-thumb]:bg-[#161925]'
  const maxNoteCls = saju ? 'text-[#7A5C14]/70' : 'text-stone-600/70'
  const sectionTitleCls = saju ? `${SJ.serif} ${SJ.ink}` : 'text-[#A69F8D]'

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // 열린 아코디언 상태
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // 추천 향이 0%이면 최대 3개, 아니면 최대 2개
  const maxScents = retentionPercentage === 0 ? 3 : 2

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

  // 검색 필터링 (한글/영문/숫자 모두 지원, 공백·특수문자 무시)
  // 예: "3", "03", "ac'scent 03", "acscent3", "AC SCENT 3", "블랙베리", "블랙" 모두 매칭
  const searchResults = useMemo(() => {
    const query = searchQuery.trim()
    if (!query) return []

    // 영문/숫자/한글만 남기고 모두 제거 (공백·따옴표·하이픈 등 무시)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')

    const lowerQuery = query.toLowerCase()
    const normalizedQuery = normalize(query)
    if (!normalizedQuery) return []

    // 쿼리에서 끝부분의 숫자를 분리해 0-padding 변형도 생성
    // 예: "acscent3" → "acscent03", "scent7" → "scent07"
    const trailingNum = normalizedQuery.match(/^(.*?)(\d+)$/)
    const paddedQuery = trailingNum
      ? trailingNum[1] + trailingNum[2].padStart(2, '0')
      : null

    // 매칭에 사용할 쿼리 변형들
    const queryVariants = Array.from(
      new Set([lowerQuery, normalizedQuery, paddedQuery].filter(Boolean) as string[])
    )

    // 순수 숫자 입력 시 향수 번호 직접 매칭 (예: "3" → "03")
    const isNumericQuery = /^\d+$/.test(normalizedQuery)
    const paddedNumber = isNumericQuery ? normalizedQuery.padStart(2, '0') : ''

    return perfumes
      .filter((p) => p.id !== recommendedPerfumeId) // 추천 향수 제외
      .filter((p) => {
        // 1) 순수 숫자 검색: 향수 번호 우선 매칭
        if (isNumericQuery) {
          const perfumeNumber = p.id.split(' ')[1] || '' // "AC'SCENT 05" → "05"
          if (perfumeNumber === paddedNumber || perfumeNumber.includes(normalizedQuery)) {
            return true
          }
        }

        // 2) 다국어 이름 + 키워드 + 카테고리 + ID 모두 검색 대상에 포함
        const localizedName = getLocalizedName(p.id, p.name).toLowerCase()
        const localizedKeywords = getLocalizedKeywords(p.id).map((k) => k.toLowerCase())
        const candidates = [
          p.name.toLowerCase(),
          localizedName,
          p.id.toLowerCase(),
          p.category.toLowerCase(),
          ...p.keywords.map((k) => k.toLowerCase()),
          ...localizedKeywords,
        ]
        // 정규화된 후보군: "AC'SCENT 03" → "acscent03"
        const normalizedCandidates = candidates.map(normalize)
        const allCandidates = [...candidates, ...normalizedCandidates]

        return queryVariants.some((q) => allCandidates.some((c) => c.includes(q)))
      })
      .slice(0, 8) // 최대 8개
  }, [searchQuery, recommendedPerfumeId, getLocalizedName, getLocalizedKeywords])

  const isSearching = searchQuery.trim().length > 0

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category))
  }

  // 향료 선택
  const handleSelectScent = (perfume: (typeof perfumes)[0]) => {
    // 남은 공간에서 기본 비율 결정 (최대 30%, 최소 5%)
    const availableRatio = remainingRatio - totalAdditionalRatio
    const defaultRatio = Math.min(Math.max(Math.floor(availableRatio / 2 / 10) * 10, 10), 30)

    const added = onAddScent({
      id: perfume.id,
      name: getLocalizedName(perfume.id, perfume.name),
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

  // 카테고리 번역 헬퍼
  const getCategoryLabel = (key: string) => {
    return t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as 'categoryCitrus')
  }

  // 추천 카테고리 정보
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
      <div className={`rounded-[12px] p-4 border ${saju ? SJ.cardSoft : 'bg-gradient-to-br from-[#0C0E16] to-[#0C0E16] border-stone-200/50'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-12 h-12 rounded-[12px] flex items-center justify-center text-sm lg:text-base font-bold shadow-lg ${
              isLightColor(recommendedPerfume?.primaryColor || '#6B7280') ? 'text-[#E9E2D0]' : 'text-[#E9E2D0]'
            }`}
            style={{ backgroundColor: recommendedPerfume?.primaryColor || '#6B7280' }}
          >
            {recommendedPerfumeId.split(' ')[1]}
          </div>
          <div className="flex-1">
            <p className={`text-xs lg:text-sm font-medium ${saju ? SJ.goldText : 'text-[#A69F8D]'}`}>{t('recommendedScentLabel')}</p>
            <h3 className={`font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[#E9E2D0]'}`}>{recommendedPerfumeName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg">{recommendedCategoryInfo?.icon}</span>
              <span className={`text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[#8B8578]'}`}>{t('categoryFamily', { label: recommendedCategoryInfo ? getCategoryLabel(recommendedPerfumeCategory) : '' })}</span>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs lg:text-sm ${saju ? SJ.inkFaint : 'text-[#8B8578]'}`}>{t('selectedRatio')}</p>
            <p className={`text-2xl font-black ${saju ? SJ.goldText : 'text-[#8B8578]'}`}>{retentionPercentage}%</p>
          </div>
        </div>
        <div className={`text-xs lg:text-sm rounded-[12px] px-3 py-2 space-y-1 ${saju ? `${SJ.inkMuted} bg-[#FDFAF1]/70` : 'text-[#8B8578] bg-[#12141D]/60'}`}>
          <p>
            {saju ? '' : '💡 '}{t('remainingGuide', { ratio: remainingRatio })}
          </p>
          <p className={`font-semibold ${saju ? SJ.cinnabarText : 'text-red-500'}`}>{t('maxSelectable', { count: maxScents })}</p>
        </div>
      </div>

      {/* 이전 피드백 표시 (재피드백 시) */}
      {previousFeedback && previousFeedback.specificScents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[12px] p-3 border ${saju ? SJ.cardSoft : 'bg-[#0C0E16] border-stone-200/50'}`}
        >
          <div className="flex items-start gap-2">
            <Info size={16} className={`flex-shrink-0 mt-0.5 ${saju ? 'text-[#2C3E50]' : 'text-[#8B8578]'}`} />
            <div className="text-sm lg:text-base flex-1">
              <p className={`font-medium mb-1.5 ${saju ? SJ.blueInk : 'text-[#A69F8D]'}`}>{t('previousSelectedScents')}</p>
              <div className="flex flex-wrap gap-1.5">
                {previousFeedback.specificScents.map((scent) => (
                  <span
                    key={scent.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs lg:text-sm ${saju ? SJ.chipBlue : 'bg-[#151823] text-[#A69F8D]'}`}
                  >
                    <span className="font-medium">{scent.name}</span>
                    <span className={saju ? 'text-[#2C3E50]/70' : 'text-[#8B8578]'}>{scent.ratio}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 향료 검색 바 */}
      <div className="space-y-2">
        <h3 className={`text-sm lg:text-base font-bold flex items-center gap-2 ${sectionTitleCls}`}>
          <Search size={14} className={plusIconCls} />
          {t('searchScent')}
        </h3>
        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${itemMetaCls}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchScentPlaceholder')}
            className={`w-full pl-9 pr-9 py-2.5 rounded-[12px] border-2 focus:ring-0 focus:outline-none text-sm lg:text-base transition-colors ${
              saju ? SJ.input : 'border-[#262A38] focus:border-[#343A4C] bg-[#12141D] placeholder:text-[#8B8578]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                searchInputRef.current?.focus()
              }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors ${saju ? SJ.iconHover : 'hover:bg-[#1B1F2C]'}`}
            >
              <X size={14} className={itemMetaCls} />
            </button>
          )}
        </div>

        {/* 검색 결과 */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <p className={`text-sm lg:text-base ${itemMetaCls}`}>{t('searchNoResults')}</p>
                </div>
              ) : (
                <div className={`space-y-2 max-h-[320px] overflow-y-auto rounded-[12px] border p-2 ${saju ? 'border-[#D8CFBB] bg-[#EDE5D2]/60' : 'border-[#262A38] bg-[#151823]'}`}>
                  {searchResults.map((perfume) => {
                    const alreadySelected = isSelected(perfume.id)
                    const canAdd = selectedScents.length < maxScents
                    const selectedScent = selectedScents.find((s) => s.id === perfume.id)
                    const otherScentsRatio = selectedScents
                      .filter((s) => s.id !== perfume.id)
                      .reduce((sum, s) => sum + s.ratio, 0)
                    const maxRatioForThis = remainingRatio - otherScentsRatio
                    const canIncrease = selectedScent && selectedScent.ratio < maxRatioForThis

                    return (
                      <div key={perfume.id} className="space-y-0">
                        <button
                          onClick={() => !alreadySelected && canAdd && handleSelectScent(perfume)}
                          disabled={!alreadySelected && !canAdd}
                          className={`w-full flex items-center gap-3 p-3 transition-all ${
                            alreadySelected
                              ? itemSelectedCls
                              : canAdd
                                ? itemAddableCls
                                : itemDisabledCls
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm flex-shrink-0 ${
                              isLightColor(perfume.primaryColor) ? 'text-[#E9E2D0]' : 'text-[#E9E2D0]'
                            }`}
                            style={{ backgroundColor: perfume.primaryColor }}
                          >
                            {perfume.id.split(' ')[1]}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`font-medium text-sm lg:text-base truncate ${itemNameCls}`}>
                              {getLocalizedName(perfume.id, perfume.name)}
                            </p>
                            <p className={`text-xs lg:text-sm truncate ${itemMetaCls}`}>
                              {perfume.id} · {getLocalizedKeywords(perfume.id).slice(0, 3).join(' · ')}
                            </p>
                          </div>
                          {alreadySelected ? (
                            <span className={selectedChipCls}>
                              {t('selected')}
                            </span>
                          ) : canAdd ? (
                            <Plus size={18} className={`${plusIconCls} flex-shrink-0`} />
                          ) : null}
                        </button>

                        {/* 선택 시 슬라이더 */}
                        <AnimatePresence>
                          {alreadySelected && selectedScent && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className={sliderPanelCls}>
                                <div className="flex justify-between items-center">
                                  <span className={`text-xs lg:text-sm font-medium ${ratioLabelCls}`}>{t('additionalRatio')}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${ratioValueCls}`}>{selectedScent.ratio}%</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onRemoveScent(perfume.id)
                                      }}
                                      className={`p-1 rounded-full transition-colors ${removeBtnCls}`}
                                    >
                                      <X size={14} className={removeIconCls} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onUpdateRatio(perfume.id, selectedScent.ratio - 10)
                                    }}
                                    disabled={selectedScent.ratio <= 10}
                                    className={`p-1.5 rounded-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${stepBtnCls}`}
                                  >
                                    <Minus size={14} className={stepIconCls} />
                                  </button>
                                  <input
                                    id={`ratio-search-${perfume.id}`}
                                    name={`ratio-search-${perfume.id}`}
                                    type="range"
                                    min={10}
                                    max={maxRatioForThis}
                                    step={10}
                                    value={selectedScent.ratio}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onUpdateRatio(perfume.id, parseInt(e.target.value))}
                                    className={`flex-1 h-2 ${rangeTrackCls} rounded-full appearance-none cursor-pointer
                                      [&::-webkit-slider-thumb]:appearance-none
                                      [&::-webkit-slider-thumb]:w-5
                                      [&::-webkit-slider-thumb]:h-5
                                      ${rangeThumbCls}
                                      [&::-webkit-slider-thumb]:rounded-full
                                      [&::-webkit-slider-thumb]:shadow
                                      [&::-webkit-slider-thumb]:cursor-grab
                                      [&::-webkit-slider-thumb]:active:cursor-grabbing`}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onUpdateRatio(perfume.id, selectedScent.ratio + 10)
                                    }}
                                    disabled={!canIncrease}
                                    className={`p-1.5 rounded-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${stepBtnCls}`}
                                  >
                                    <Plus size={14} className={stepIconCls} />
                                  </button>
                                </div>
                                <p className={`text-[10px] lg:text-[12px] text-right ${maxNoteCls}`}>
                                  {t('maxRatio', { ratio: maxRatioForThis })}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 카테고리 아코디언 (검색 중이 아닐 때만 표시) */}
      {!isSearching && (
      <div className="space-y-2">
        <h3 className={`text-sm lg:text-base font-bold mb-3 ${sectionTitleCls}`}>
          {t('categoryExplore')}
          {selectedScents.length >= maxScents && (
            <span className={`text-xs lg:text-sm font-normal ml-2 ${itemMetaCls}`}>
              {t('maxSelected', { count: maxScents })}
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
              className={`overflow-hidden rounded-[12px] border-2 transition-colors ${
                isExpanded
                  ? saju ? 'border-[#C9A227] shadow-sm' : 'border-[#262A38] shadow-sm'
                  : hasSelectedScents
                    ? saju ? 'border-[#C9A227]/50' : 'border-[#262A38]'
                    : saju ? 'border-[#D8CFBB]' : 'border-[#262A38]'
              }`}
            >
              {/* 카테고리 헤더 */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between p-4 transition-all ${
                  isExpanded
                    ? saju ? 'bg-[#EDE5D2]' : 'bg-gradient-to-r from-[#0C0E16] to-[#0C0E16]'
                    : hasSelectedScents
                      ? saju ? 'bg-[#EDE5D2]/50 hover:bg-[#EDE5D2]' : 'bg-[#0C0E16]/50 hover:bg-[#0C0E16]'
                      : saju ? 'bg-[#FDFAF1] hover:bg-[#F5EFE2]' : 'bg-[#12141D] hover:bg-[#151823]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        saju
                          ? `${SJ.serif} ${isExpanded ? SJ.goldText : SJ.ink}`
                          : isExpanded ? 'text-[#E9E2D0]' : 'text-[#E9E2D0]'
                      }`}>
                        {getCategoryLabel(category)}
                      </span>
                      {isRecommendedCategory && (
                        <span className={`text-[10px] lg:text-[12px] font-medium px-1.5 py-0.5 rounded-[12px] ${saju ? SJ.chipGold : 'text-[#A69F8D] bg-[#151823]'}`}>
                          {t('recommendedCategory')}
                        </span>
                      )}
                    </div>
                    {/* 닫혀있을 때 선택된 향료 미리보기 */}
                    {!isExpanded && hasSelectedScents ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {selectedInCategory.map((scent) => (
                          <span
                            key={scent.id}
                            className={`text-[11px] lg:text-[13px] font-medium px-2 py-0.5 rounded-full ${saju ? SJ.chipGold : 'text-[#A69F8D] bg-[#151823]'}`}
                          >
                            {scent.id} {scent.ratio}%
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs lg:text-sm ${
                        saju
                          ? isExpanded ? 'text-[#7A5C14]/70' : SJ.inkFaint
                          : isExpanded ? 'text-stone-600/70' : 'text-[#8B8578]'
                      }`}>
                        {t(`categoryDesc${category.charAt(0).toUpperCase() + category.slice(1)}` as 'categoryDescCitrus')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs lg:text-sm font-medium ${
                    saju
                      ? isExpanded ? SJ.goldText : SJ.inkFaint
                      : isExpanded ? 'text-[#A69F8D]' : 'text-[#8B8578]'
                  }`}>
                    {t('countItems', { count: categoryPerfumes.length })}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={20} className={
                      saju
                        ? isExpanded ? 'text-[#C9A227]' : 'text-[#8B8578]'
                        : isExpanded ? 'text-[#8B8578]' : 'text-[#8B8578]'
                    } />
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
                    <div className={`p-3 border-t space-y-2 max-h-[280px] overflow-y-auto ${saju ? 'bg-[#EDE5D2]/60 border-[#D8CFBB]' : 'bg-[#151823] border-[#262A38]'}`}>
                      {categoryPerfumes.length === 0 ? (
                        <p className={`text-sm lg:text-base text-center py-4 ${itemMetaCls}`}>
                          {t('noCategoryScents')}
                        </p>
                      ) : (
                        categoryPerfumes.map((perfume) => {
                          const alreadySelected = isSelected(perfume.id)
                          const canAdd = selectedScents.length < maxScents
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
                                    ? itemSelectedCls
                                    : canAdd
                                      ? itemAddableCls
                                      : itemDisabledCls
                                }`}
                              >
                                <div
                                  className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm flex-shrink-0 ${
                                    isLightColor(perfume.primaryColor) ? 'text-[#E9E2D0]' : 'text-[#E9E2D0]'
                                  }`}
                                  style={{ backgroundColor: perfume.primaryColor }}
                                >
                                  {perfume.id.split(' ')[1]}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className={`font-medium text-sm lg:text-base truncate ${itemNameCls}`}>
                                    {getLocalizedName(perfume.id, perfume.name)}
                                  </p>
                                  <p className={`text-xs lg:text-sm truncate ${itemMetaCls}`}>
                                    {getLocalizedKeywords(perfume.id).slice(0, 3).join(' · ')}
                                  </p>
                                </div>
                                {alreadySelected ? (
                                  <span className={selectedChipCls}>
                                    {t('selected')}
                                  </span>
                                ) : canAdd ? (
                                  <Plus size={18} className={`${plusIconCls} flex-shrink-0`} />
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
                                    <div className={sliderPanelCls}>
                                      <div className="flex justify-between items-center">
                                        <span className={`text-xs lg:text-sm font-medium ${ratioLabelCls}`}>{t('additionalRatio')}</span>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-lg font-bold ${ratioValueCls}`}>{selectedScent.ratio}%</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              onRemoveScent(perfume.id)
                                            }}
                                            className={`p-1 rounded-full transition-colors ${removeBtnCls}`}
                                          >
                                            <X size={14} className={removeIconCls} />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onUpdateRatio(perfume.id, selectedScent.ratio - 10)
                                          }}
                                          disabled={selectedScent.ratio <= 10}
                                          className={`p-1.5 rounded-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${stepBtnCls}`}
                                        >
                                          <Minus size={14} className={stepIconCls} />
                                        </button>
                                        <input
                                          id={`ratio-inline-${perfume.id}`}
                                          name={`ratio-inline-${perfume.id}`}
                                          type="range"
                                          min={10}
                                          max={maxRatioForThis}
                                          step={10}
                                          value={selectedScent.ratio}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => onUpdateRatio(perfume.id, parseInt(e.target.value))}
                                          className={`flex-1 h-2 ${rangeTrackCls} rounded-full appearance-none cursor-pointer
                                            [&::-webkit-slider-thumb]:appearance-none
                                            [&::-webkit-slider-thumb]:w-5
                                            [&::-webkit-slider-thumb]:h-5
                                            ${rangeThumbCls}
                                            [&::-webkit-slider-thumb]:rounded-full
                                            [&::-webkit-slider-thumb]:shadow
                                            [&::-webkit-slider-thumb]:cursor-grab
                                            [&::-webkit-slider-thumb]:active:cursor-grabbing`}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onUpdateRatio(perfume.id, selectedScent.ratio + 10)
                                          }}
                                          disabled={!canIncrease}
                                          className={`p-1.5 rounded-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${stepBtnCls}`}
                                        >
                                          <Plus size={14} className={stepIconCls} />
                                        </button>
                                      </div>
                                      <p className={`text-[10px] lg:text-[12px] text-right ${maxNoteCls}`}>
                                        {t('maxRatio', { ratio: maxRatioForThis })}
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
      )}

      {/* 현재 비율 상태 표시 */}
      <div className={`rounded-[12px] p-4 border-2 ${
        currentTotalRatio === 100
          ? saju ? SJ.cardGold : 'bg-[#0C0E16] border-[#262A38]'
          : currentTotalRatio > 100
            ? saju ? SJ.cardCinnabar : 'bg-red-50 border-red-300'
            : saju ? SJ.cardSoft : 'bg-[#0C0E16] border-[#262A38]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm lg:text-base font-bold ${sectionTitleCls}`}>{t('ratioStatus')}</span>
          <span className={`text-lg font-black ${
            currentTotalRatio === 100
              ? saju ? SJ.goldText : 'text-[#A69F8D]'
              : currentTotalRatio > 100
                ? saju ? SJ.cinnabarText : 'text-red-600'
                : saju ? SJ.inkMuted : 'text-[#A69F8D]'
          }`}>
            {currentTotalRatio}% / 100%
          </span>
        </div>

        {/* 프로그레스 바 */}
        <div className={`w-full h-3 rounded-full overflow-hidden ${saju ? 'bg-[#FDFAF1]' : 'bg-[#232838]'}`}>
          <div
            className={`h-full transition-all duration-300 ${
              currentTotalRatio === 100
                ? saju ? SJ.fillGold : 'bg-[#161925]'
                : currentTotalRatio > 100
                  ? saju ? SJ.fillCinnabar : 'bg-red-500'
                  : saju ? 'bg-[#C9A227]/60' : 'bg-[#161925]'
            }`}
            style={{ width: `${Math.min(currentTotalRatio, 100)}%` }}
          />
        </div>

        {/* 상태 메시지 */}
        <p className={`text-xs lg:text-sm mt-2 font-medium ${
          currentTotalRatio === 100
            ? saju ? SJ.goldText : 'text-[#A69F8D]'
            : currentTotalRatio > 100
              ? saju ? SJ.cinnabarText : 'text-red-700'
              : saju ? SJ.inkMuted : 'text-[#A69F8D]'
        }`}>
          {currentTotalRatio === 100
            ? t('ratioPerfect')
            : currentTotalRatio > 100
              ? t('ratioOver', { ratio: currentTotalRatio - 100 })
              : t('ratioRemaining', { ratio: 100 - currentTotalRatio })}
        </p>
      </div>
    </motion.div>
  )
}
