'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Droplets, FlaskConical, Sparkles } from 'lucide-react'
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
            className="fixed bottom-0 left-0 right-0 bg-[#FFF8E7] rounded-t-3xl border-t-2 border-x-2 border-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-[9999] max-h-[85vh] flex flex-col"
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FBCFE8] border-2 border-slate-900 flex items-center justify-center">
                  <Sparkles size={20} className="text-slate-900" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-900">향수 레시피</h2>
                  <p className="text-xs text-slate-500 font-bold">{perfumeName || persona?.name || '맞춤 향수'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X size={20} className="text-slate-900" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {hasFullData ? (
                <>
                  {/* 추천 향수 정보 */}
                  <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[3px_3px_0px_#000]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="inline-block px-3 py-1 bg-[#FEF9C3] text-slate-700 text-sm font-bold rounded-full border border-slate-900 mb-2">
                          추천 향수
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">
                          {persona?.name || perfumeName}
                        </h3>
                        <p className="text-base text-slate-600 mb-4 leading-relaxed">
                          {persona?.description || ''}
                        </p>

                        {/* 키워드 */}
                        {displayKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {displayKeywords.slice(0, 5).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-sm font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200"
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
                                stroke="rgba(148, 163, 184, 0.2)"
                                strokeWidth="2"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke="#F472B6"
                                strokeWidth="3"
                                strokeDasharray={`${Math.round(matchScore * 100)} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-black text-sm text-slate-900">
                                {Math.round(matchScore * 100)}%
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold mt-1">매칭률</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 향 노트 섹션 */}
                  <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[3px_3px_0px_#000]">
                    <PerfumeNotesSection persona={persona} />
                  </div>

                  {/* 향수 프로필 섹션 */}
                  <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[3px_3px_0px_#000]">
                    <PerfumeProfileSection persona={persona} />
                  </div>
                </>
              ) : (
                /* 분석 데이터가 없는 경우 */
                <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[3px_3px_0px_#000] text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                    <FlaskConical size={28} className="text-slate-400" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 mb-2">
                    상세 레시피 정보 없음
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mb-4">
                    이 주문은 레시피 정보가 저장되기 전에 생성되었습니다.
                  </p>

                  {/* 기본 정보라도 표시 */}
                  {(perfumeName || keywords.length > 0) && (
                    <div className="bg-slate-50 rounded-xl p-4 text-left">
                      {perfumeName && (
                        <p className="text-sm font-bold text-slate-700 mb-2">
                          향수: {perfumeName}
                        </p>
                      )}
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs font-bold text-slate-600 bg-white rounded-full border border-slate-200"
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
            <div className="p-5 pt-3 border-t-2 border-slate-900 bg-white pb-safe">
              <button
                onClick={onClose}
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-colors"
              >
                닫기
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
  const notes = [
    {
      type: '탑노트',
      name: persona?.mainScent?.name || '시트러스',
      description: persona?.mainScent?.fanComment || '첫 인상을 결정하는 가벼운 향 ✨',
      time: '0-30분',
      gradient: 'from-yellow-400 to-amber-400',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    {
      type: '미들노트',
      name: persona?.subScent1?.name || '플로럴',
      description: persona?.subScent1?.fanComment || '향수의 핵심이 되는 중심 향 💕',
      time: '30분-2시간',
      gradient: 'from-amber-400 to-orange-400',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    {
      type: '베이스노트',
      name: persona?.subScent2?.name || '우디',
      description: persona?.subScent2?.fanComment || '오래 지속되는 깊은 향 🌙',
      time: '2-6시간',
      gradient: 'from-orange-400 to-rose-400',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    }
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] border-2 border-slate-900 flex items-center justify-center">
          <Droplets size={16} className="text-slate-900" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">향 노트</h3>
          <p className="text-xs text-slate-400 font-bold">시간에 따른 향의 변화</p>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map((note, index) => (
          <motion.div
            key={note.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-xl p-4 ${note.bg} border ${note.border} overflow-hidden`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${note.gradient}`} />
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {note.type}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded font-bold">
                  {note.time}
                </span>
              </div>
              <h4 className="text-base font-black text-slate-800">{note.name}</h4>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed font-medium">
                {note.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-xs font-black text-slate-500 mb-2">향 발현 타임라인</p>
        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute inset-0 flex"
          >
            <div className="h-full w-[15%] bg-gradient-to-r from-yellow-400 to-amber-400" />
            <div className="h-full w-[50%] bg-gradient-to-r from-amber-400 to-orange-400" />
            <div className="h-full w-[35%] bg-gradient-to-r from-orange-400 to-rose-400" />
          </motion.div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-slate-400 font-bold">탑 (0-30분)</span>
          <span className="text-[10px] text-slate-400 font-bold">미들 (30분-2시간)</span>
          <span className="text-[10px] text-slate-400 font-bold">베이스 (2-6시간)</span>
        </div>
      </div>
    </div>
  )
}

// 향수 프로필 섹션 (내부 컴포넌트)
function PerfumeProfileSection({ persona }: { persona?: PerfumePersona }) {
  if (!persona?.categories) return null

  const sortedCategories = Object.entries(persona.categories)
    .sort(([, a], [, b]) => (b as number) - (a as number))
  const mainCategory = sortedCategories[0]

  const categoryColors: Record<string, { bar: string }> = {
    citrus: { bar: 'bg-yellow-400' },
    floral: { bar: 'bg-pink-400' },
    woody: { bar: 'bg-amber-600' },
    musky: { bar: 'bg-purple-400' },
    fruity: { bar: 'bg-red-400' },
    spicy: { bar: 'bg-orange-500' }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#E9D5FF] border-2 border-slate-900 flex items-center justify-center">
          <FlaskConical size={16} className="text-slate-900" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">향수 프로필</h3>
          <p className="text-xs text-slate-400 font-bold">향 카테고리 분석</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="space-y-3">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
            const colors = categoryColors[category] || { bar: 'bg-slate-400' }
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
                  <span className="text-sm font-bold text-slate-600">{info.name}</span>
                </div>
                <div className="flex-grow h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.05 }}
                    className={`h-full ${colors.bar} rounded-full`}
                  />
                </div>
                <span className="flex-shrink-0 w-8 text-right text-sm font-black text-slate-500">
                  {value as number}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* 메인 카테고리 */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-bold">메인 계열</span>
            <div className="flex items-center gap-2">
              <span className="text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-base font-black text-slate-800">
                {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
