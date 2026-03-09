'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { MessageSquare, Sparkles, User, Info } from 'lucide-react'
import { PerfumeFeedback, FEEDBACK_CATEGORY_INFO } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'

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

interface FeedbackStep3NLProps {
  feedback: PerfumeFeedback
  naturalLanguageFeedback: string
  onNaturalLanguageFeedbackChange: (value: string) => void
}

// 카테고리 키 타입
type CategoryKey = keyof typeof FEEDBACK_CATEGORY_INFO

export function FeedbackStep3NL({
  feedback,
  naturalLanguageFeedback,
  onNaturalLanguageFeedbackChange,
}: FeedbackStep3NLProps) {
  const t = useTranslations('feedback')
  // 향수 색상 가져오기
  const getGranuleColor = (id: string) => {
    const perfume = perfumes.find((p) => p.id === id)
    return perfume?.primaryColor || '#6B7280'
  }

  // 추천 향수 정보
  const recommendedPerfume = perfumes.find((p) => p.id === feedback.perfumeId)
  const recommendedCategory = recommendedPerfume?.category as CategoryKey
  const categoryInfo = FEEDBACK_CATEGORY_INFO[recommendedCategory]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* 이전 선택 요약 카드 */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <User size={16} className="text-slate-500" />
          {t('myCombination')}
        </h3>

        <div className="space-y-2">
          {/* 추천 향 */}
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
                isLightColor(getGranuleColor(feedback.perfumeId)) ? 'text-slate-800' : 'text-white'
              }`}
              style={{ backgroundColor: getGranuleColor(feedback.perfumeId) }}
            >
              {feedback.perfumeId.split(' ')[1]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 text-sm">{feedback.perfumeName}</span>
                <span className="text-lg">{categoryInfo?.icon}</span>
              </div>
              <p className="text-[11px] text-slate-400">{t('recommendedScentLabel')}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-amber-500">{feedback.retentionPercentage}%</span>
            </div>
          </div>

          {/* 추가 향료들 */}
          {feedback.specificScents.map((scent) => {
            const scentPerfume = perfumes.find((p) => p.id === scent.id)
            const scentCategory = scentPerfume?.category as CategoryKey
            const scentCategoryInfo = FEEDBACK_CATEGORY_INFO[scentCategory]

            return (
              <div
                key={scent.id}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
                    isLightColor(getGranuleColor(scent.id)) ? 'text-slate-800' : 'text-white'
                  }`}
                  style={{ backgroundColor: getGranuleColor(scent.id) }}
                >
                  {scent.id.split(' ')[1]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm">{scent.name}</span>
                    <span className="text-lg">{scentCategoryInfo?.icon}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t('additionalScentLabel')}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-500">{scent.ratio}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 자연어 피드백 입력 */}
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl p-4 border-2 border-purple-200/60 shadow-sm">
        <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
            <MessageSquare size={15} className="text-purple-600" />
          </div>
          {t('feelingQuestion')}
          <span className="text-xs font-normal text-purple-400 bg-purple-100/50 px-2 py-0.5 rounded-full">
            {t('optional')}
          </span>
        </h3>

        <textarea
          value={naturalLanguageFeedback}
          onChange={(e) => onNaturalLanguageFeedbackChange(e.target.value)}
          placeholder={t('feelingPlaceholder')}
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none text-sm placeholder:text-purple-300"
        />

        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
            <Sparkles size={12} className="text-purple-500" />
            <span>{t('aiRefNote')}</span>
          </div>
          <span className="text-xs text-purple-400 font-medium">
            {naturalLanguageFeedback.length} / 500
          </span>
        </div>
      </div>

      {/* 결과 안내 박스 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200/50 space-y-3">
        <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          {t('resultTwoOptions')}
        </h3>

        <div className="space-y-2">
          {/* 1안 설명 */}
          <div className="flex items-start gap-3 bg-white/60 rounded-xl p-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-sm flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-slate-800 text-sm">{t('option1Title')}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('option1Desc')}
              </p>
            </div>
          </div>

          {/* 2안 설명 */}
          <div className="flex items-start gap-3 bg-white/60 rounded-xl p-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-slate-800 text-sm">{t('option2Title')}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {naturalLanguageFeedback
                  ? t('option2DescWithFeedback')
                  : t('option2DescNoFeedback')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          {t('skipNote')}
        </p>
      </div>
    </motion.div>
  )
}
