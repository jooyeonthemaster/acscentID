'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Droplets, FlaskConical, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ImageAnalysisResult, PerfumePersona, CATEGORY_INFO } from '@/types/analysis'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  analysisData?: ImageAnalysisResult | null
  perfumeName?: string
  keywords?: string[]
}

export function RecipeModal({
  isOpen,
  onClose,
  analysisData,
  perfumeName,
  keywords = []
}: RecipeModalProps) {
  const t = useTranslations('mypage.recipeModal')
  const tButtons = useTranslations('buttons')

  if (!isOpen) return null

  const persona = analysisData?.matchingPerfumes?.[0]?.persona
  const matchScore = analysisData?.matchingPerfumes?.[0]?.score
  const displayKeywords = analysisData?.matchingKeywords || keywords

  // 분석 데이터가 없는 경우
  const hasFullData = persona && persona.categories

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[9999]"
          />

          {/* 바텀 시트 모달 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--canvas)] rounded-t-[6px] border-t-2 border-x-2 border-[var(--line)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-[9999] max-h-[85vh] flex flex-col"
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-[var(--soft)] rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pb-4 border-b-2 border-[var(--line)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                  <Sparkles size={20} className="text-[var(--ink)]" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-[var(--ink)]">{t('perfumeRecipe')}</h2>
                  <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">{perfumeName || persona?.name || t('customPerfume')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center hover:bg-[var(--soft)] transition-colors"
              >
                <X size={20} className="text-[var(--ink)]" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {hasFullData ? (
                <>
                  {/* 추천 향수 정보 */}
                  <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="inline-block px-3 py-1 bg-[var(--soft)] text-[var(--muted-ink)] text-sm lg:text-base font-bold rounded-full border border-[var(--line)] mb-2">
                          {t('recommendedPerfume')}
                        </span>
                        <h3 className="text-2xl font-black text-[var(--ink)] mb-2">
                          {persona?.name || perfumeName}
                        </h3>
                        <p className="text-base text-[var(--muted-ink)] mb-4 leading-relaxed">
                          {persona?.description || ''}
                        </p>

                        {/* 키워드 */}
                        {displayKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {displayKeywords.slice(0, 5).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-sm lg:text-base font-bold text-[var(--muted-ink)] bg-[var(--soft)] rounded-full border border-[var(--line)]"
                              >
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 매칭률 */}
                      {matchScore && (
                        <div className="flex flex-col items-center ml-4">
                          <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke="rgba(162,162,162, 0.2)"
                                strokeWidth="2"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke="#9F9F9F"
                                strokeWidth="3"
                                strokeDasharray={`${Math.round(matchScore * 100)} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-black text-sm lg:text-base text-[var(--ink)]">
                                {Math.round(matchScore * 100)}%
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold mt-1">{t('matchRate')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 향 노트 섹션 */}
                  <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-5">
                    <PerfumeNotesSection persona={persona} />
                  </div>

                  {/* 향수 프로필 섹션 */}
                  <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-5">
                    <PerfumeProfileSection persona={persona} />
                  </div>
                </>
              ) : (
                /* 분석 데이터가 없는 경우 */
                <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-8 text-center">
                  <div className="w-16 h-16 bg-[var(--soft)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--line)]">
                    <FlaskConical size={28} className="text-[var(--muted-ink)]" />
                  </div>
                  <h3 className="font-black text-lg text-[var(--ink)] mb-2">
                    {t('noDetailedRecipe')}
                  </h3>
                  <p className="text-sm lg:text-base text-[var(--muted-ink)] font-medium mb-4">
                    {t('recipeNotSavedYet')}
                  </p>

                  {/* 기본 정보라도 표시 */}
                  {(perfumeName || keywords.length > 0) && (
                    <div className="bg-[var(--soft)] rounded-[6px] p-4 text-left">
                      {perfumeName && (
                        <p className="text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-2">
                          {t('perfumeLabel', { name: perfumeName })}
                        </p>
                      )}
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs lg:text-sm font-bold text-[var(--muted-ink)] bg-[var(--paper)] rounded-full border border-[var(--line)]"
                            >
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 푸터 - 하단 안전 영역 포함 */}
            <div className="p-5 pt-3 border-t-2 border-[var(--line)] bg-[var(--paper)] pb-safe">
              <button
                onClick={onClose}
                className="w-full h-12 bg-[var(--soft)] text-[var(--ink)] rounded-[6px] font-black hover:bg-[var(--soft)] transition-colors"
              >
                {tButtons('close')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// 향 노트 섹션 (내부 컴포넌트)
function PerfumeNotesSection({ persona }: { persona?: PerfumePersona }) {
  const t = useTranslations('mypage.recipeModal')
  const notes = [
    {
      type: t('topNote'),
      name: persona?.mainScent?.name || t('topNoteDefault'),
      description: persona?.mainScent?.fanComment || t('topNoteDefaultDesc'),
      time: t('topNoteTime'),
      gradient: 'from-[var(--soft)] to-[var(--soft)]',
      bg: 'bg-[var(--canvas)]',
      border: 'border-[var(--line)]'
    },
    {
      type: t('middleNote'),
      name: persona?.subScent1?.name || t('middleNoteDefault'),
      description: persona?.subScent1?.fanComment || t('middleNoteDefaultDesc'),
      time: t('middleNoteTime'),
      gradient: 'from-[var(--soft)] to-[var(--soft)]',
      bg: 'bg-[var(--canvas)]',
      border: 'border-[var(--line)]'
    },
    {
      type: t('baseNote'),
      name: persona?.subScent2?.name || t('baseNoteDefault'),
      description: persona?.subScent2?.fanComment || t('baseNoteDefaultDesc'),
      time: t('baseNoteTime'),
      gradient: 'from-[var(--soft)] to-[var(--soft)]',
      bg: 'bg-[var(--canvas)]',
      border: 'border-[var(--line)]'
    }
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
          <Droplets size={16} className="text-[var(--ink)]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[var(--ink)]">{t('scentNotes')}</h3>
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">{t('scentNotesDesc')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map((note, index) => (
          <motion.div
            key={note.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-[6px] p-4 ${note.bg} border ${note.border} overflow-hidden`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${note.gradient}`} />
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs lg:text-sm font-black text-[var(--muted-ink)] uppercase tracking-wider">
                  {note.type}
                </span>
                <span className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] bg-stone-200/50 px-2 py-0.5 rounded-[6px] font-bold">
                  {note.time}
                </span>
              </div>
              <h4 className="text-base font-black text-[var(--ink)]">{note.name}</h4>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] mt-1.5 leading-relaxed font-medium">
                {note.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="mt-4 pt-3 border-t border-[var(--line)]">
        <p className="text-xs lg:text-sm font-black text-[var(--muted-ink)] mb-2">{t('scentTimeline')}</p>
        <div className="relative h-3 bg-[var(--soft)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute inset-0 flex"
          >
            <div className="h-full w-[15%] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]" />
            <div className="h-full w-[50%] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]" />
            <div className="h-full w-[35%] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]" />
          </motion.div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold">{t('topTimelineLabel')}</span>
          <span className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold">{t('middleTimelineLabel')}</span>
          <span className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold">{t('baseTimelineLabel')}</span>
        </div>
      </div>
    </div>
  )
}

// 향수 프로필 섹션 (내부 컴포넌트)
function PerfumeProfileSection({ persona }: { persona?: PerfumePersona }) {
  const t = useTranslations('mypage.recipeModal')
  if (!persona?.categories) return null

  const sortedCategories = Object.entries(persona.categories)
    .sort(([, a], [, b]) => (b as number) - (a as number))
  const mainCategory = sortedCategories[0]

  const categoryColors: Record<string, { bar: string }> = {
    citrus: { bar: 'bg-[var(--soft)]' },
    floral: { bar: 'bg-[var(--soft)]' },
    woody: { bar: 'bg-[var(--soft)]' },
    musky: { bar: 'bg-[var(--soft)]' },
    fruity: { bar: 'bg-red-400' },
    spicy: { bar: 'bg-[var(--soft)]' }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-[6px] bg-[#DDDDDD] border border-[var(--line)] flex items-center justify-center">
          <FlaskConical size={16} className="text-[var(--ink)]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[var(--ink)]">{t('perfumeProfile')}</h3>
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold">{t('categoryAnalysis')}</p>
        </div>
      </div>

      <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
        <div className="space-y-3">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
            const colors = categoryColors[category] || { bar: 'bg-[var(--soft)]' }
            const percent = Math.min(Math.round((value as number) * 10), 100)

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-24 flex items-center gap-2">
                  <span className="text-base">{info.icon}</span>
                  <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">{info.name}</span>
                </div>
                <div className="flex-grow h-3 bg-[var(--soft)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.05 }}
                    className={`h-full ${colors.bar} rounded-full`}
                  />
                </div>
                <span className="flex-shrink-0 w-8 text-right text-sm lg:text-base font-black text-[var(--muted-ink)]">
                  {value as number}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* 메인 카테고리 */}
        <div className="mt-4 pt-3 border-t border-[var(--line)]">
          <div className="flex items-center justify-between">
            <span className="text-sm lg:text-base text-[var(--muted-ink)] font-bold">{t('mainCategory')}</span>
            <div className="flex items-center gap-2">
              <span className="text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-base font-black text-[var(--ink)]">
                {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
