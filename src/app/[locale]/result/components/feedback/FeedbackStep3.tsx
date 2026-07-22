'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Plus, Minus } from 'lucide-react'
import { SpecificScent } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'

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

interface FeedbackStep3Props {
  selectedScents: SpecificScent[]
  notes: string
  onAddScent: (scent: SpecificScent) => boolean
  onRemoveScent: (scentId: string) => void
  onUpdateRatio: (scentId: string, ratio: number) => void
  onNotesChange: (notes: string) => void
}

export function FeedbackStep3({
  selectedScents,
  notes,
  onAddScent,
  onRemoveScent,
  onUpdateRatio,
  onNotesChange,
}: FeedbackStep3Props) {
  const { getLocalizedName, getLocalizedKeywords } = useLocalizedPerfumes()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // 검색 필터링
  const filteredPerfumes = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    return perfumes
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.keywords.some((k) => k.toLowerCase().includes(query))
      )
      .filter((p) => !selectedScents.some((s) => s.id === p.id)) // 이미 선택된 것 제외
      .slice(0, 6)
  }, [searchQuery, selectedScents])

  const handleSelectScent = (perfume: (typeof perfumes)[0]) => {
    const added = onAddScent({
      id: perfume.id,
      name: getLocalizedName(perfume.id, perfume.name),
      ratio: 50, // 기본 비율
    })

    if (added) {
      setSearchQuery('')
      setIsSearchFocused(false)
    }
  }

  const showSearchResults = isSearchFocused && searchQuery.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 선택된 향료 목록 */}
      <AnimatePresence>
        {selectedScents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-2">
              <span>선택된 향료</span>
              <span className="text-xs lg:text-sm font-normal text-[var(--muted-ink)]">
                ({selectedScents.length}/2)
              </span>
            </h3>

            {selectedScents.map((scent) => {
              const perfumeData = perfumes.find((p) => p.id === scent.id)

              return (
                <motion.div
                  key={scent.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -100 }}
                  className="bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] p-4 border border-stone-200/50"
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {perfumeData && (
                        <div
                          className={`w-10 h-10 rounded-[6px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-md ${
                            isLightColor(perfumeData.primaryColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'
                          }`}
                          style={{ backgroundColor: perfumeData.primaryColor }}
                        >
                          {scent.id.split(' ')[1]}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-[var(--ink)]">{scent.name}</span>
                        <p className="text-xs lg:text-sm text-[var(--muted-ink)]">{scent.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveScent(scent.id)}
                      className="p-2 rounded-full hover:bg-red-100 transition-colors group"
                    >
                      <X size={18} className="text-[var(--muted-ink)] group-hover:text-red-500" />
                    </button>
                  </div>

                  {/* 비율 조절 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs lg:text-sm">
                      <span className="text-[var(--muted-ink)]">비율 조절</span>
                      <span className="font-bold text-[var(--muted-ink)]">{scent.ratio}%</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onUpdateRatio(scent.id, scent.ratio - 10)}
                        disabled={scent.ratio <= 10}
                        className="p-1.5 rounded-[6px] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--soft)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} className="text-[var(--muted-ink)]" />
                      </button>

                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="10"
                        value={scent.ratio}
                        onChange={(e) => onUpdateRatio(scent.id, parseInt(e.target.value))}
                        className="flex-1 h-2 bg-[var(--soft)] rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-5
                          [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:bg-[var(--soft)]
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:shadow
                          [&::-webkit-slider-thumb]:cursor-grab"
                      />

                      <button
                        onClick={() => onUpdateRatio(scent.id, scent.ratio + 10)}
                        disabled={scent.ratio >= 90}
                        className="p-1.5 rounded-[6px] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--soft)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={14} className="text-[var(--muted-ink)]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 향료 검색/추가 */}
      {selectedScents.length < 2 && (
        <div className="space-y-3">
          <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">
            향료 추가{' '}
            <span className="text-[var(--muted-ink)] font-normal">(선택사항, 최대 2개)</span>
          </h3>

          {/* 검색 입력 */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-ink)]"
            />
            <input
              type="text"
              placeholder="향료 이름, 카테고리로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // 약간의 딜레이를 줘서 클릭 이벤트가 먼저 처리되게 함
                setTimeout(() => setIsSearchFocused(false), 200)
              }}
              className="w-full pl-11 pr-4 py-3.5 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]
                focus:border-[var(--line)] focus:ring-2 focus:ring-stone-400/20
                outline-none transition-all text-sm lg:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-ink)] hover:text-[var(--muted-ink)]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* 검색 결과 */}
          <AnimatePresence>
            {showSearchResults && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--paper)] rounded-[6px] border border-[var(--line)] shadow-lg overflow-hidden max-h-[280px] overflow-y-auto"
              >
                {filteredPerfumes.length > 0 ? (
                  filteredPerfumes.map((perfume) => (
                    <button
                      key={perfume.id}
                      onClick={() => handleSelectScent(perfume)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[var(--canvas)] transition-colors border-b border-[var(--line)] last:border-b-0"
                    >
                      <div
                        className={`w-10 h-10 rounded-[6px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm ${
                          isLightColor(perfume.primaryColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'
                        }`}
                        style={{ backgroundColor: perfume.primaryColor }}
                      >
                        {perfume.id.split(' ')[1]}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-[var(--ink)] text-sm lg:text-base">{getLocalizedName(perfume.id, perfume.name)}</p>
                        <p className="text-xs lg:text-sm text-[var(--muted-ink)]">
                          {perfume.category} · {getLocalizedKeywords(perfume.id).slice(0, 2).join(', ')}
                        </p>
                      </div>
                      <Plus size={18} className="text-[var(--muted-ink)]" />
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm lg:text-base text-[var(--muted-ink)]">
                    검색 결과가 없어요 😢
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 추가 메모 */}
      <div className="space-y-3">
        <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">
          추가 메모 <span className="text-[var(--muted-ink)] font-normal">(선택사항)</span>
        </h3>
        <textarea
          placeholder="원하는 느낌이나 특별한 요청사항을 자유롭게 적어주세요... 예) 좀 더 상큼하게, 가을 분위기로"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]
            focus:border-[var(--line)] focus:ring-2 focus:ring-stone-400/20
            outline-none transition-all text-sm lg:text-base resize-none"
        />
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] text-right">{notes.length}/200</p>
      </div>

      {/* 팁 박스 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] p-4 border border-stone-200/50"
      >
        <p className="text-sm lg:text-base text-[var(--ink)]">
          💜 <span className="font-semibold">팁!</span> 특정 향료를 선택하지 않아도 AI가
          피드백을 분석해서 최적의 레시피를 만들어줄 거예요! ✨
        </p>
      </motion.div>
    </motion.div>
  )
}
