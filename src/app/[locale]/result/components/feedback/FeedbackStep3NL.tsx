'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Sparkles, User, Info } from 'lucide-react'
import { PerfumeFeedback, FEEDBACK_CATEGORY_INFO } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { FeedbackTheme, SJ, useFeedbackTranslations } from './sajuFeedbackTheme'

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
  theme?: FeedbackTheme
}

// 카테고리 키 타입
type CategoryKey = keyof typeof FEEDBACK_CATEGORY_INFO

export function FeedbackStep3NL({
  feedback,
  naturalLanguageFeedback,
  onNaturalLanguageFeedbackChange,
  theme = 'default',
}: FeedbackStep3NLProps) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'
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
      <div className={`rounded-[6px] p-4 border ${saju ? SJ.cardSoft : 'bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] border-[var(--line)]'}`}>
        <h3 className={`text-sm lg:text-base font-bold mb-3 flex items-center gap-2 ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>
          <User size={16} className={saju ? 'text-[#5C564A]' : 'text-[var(--muted-ink)]'} />
          {t('myCombination')}
        </h3>

        <div className="space-y-2">
          {/* 추천 향 */}
          <div className={`flex items-center gap-3 rounded-[6px] p-3 border ${saju ? SJ.card : 'bg-[var(--paper)] border-[var(--line)]'}`}>
            <div
              className={`w-10 h-10 rounded-[6px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm ${
                isLightColor(getGranuleColor(feedback.perfumeId)) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'
              }`}
              style={{ backgroundColor: getGranuleColor(feedback.perfumeId) }}
            >
              {feedback.perfumeId.split(' ')[1]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm lg:text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{feedback.perfumeName}</span>
                <span className="text-lg">{categoryInfo?.icon}</span>
              </div>
              <p className={`text-[11px] lg:text-[13px] ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>{t('recommendedScentLabel')}</p>
            </div>
            <div className="text-right">
              <span className={`text-lg font-bold ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>{feedback.retentionPercentage}%</span>
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
                className={`flex items-center gap-3 rounded-[6px] p-3 border ${saju ? SJ.card : 'bg-[var(--paper)] border-[var(--line)]'}`}
              >
                <div
                  className={`w-10 h-10 rounded-[6px] flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm ${
                    isLightColor(getGranuleColor(scent.id)) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'
                  }`}
                  style={{ backgroundColor: getGranuleColor(scent.id) }}
                >
                  {scent.id.split(' ')[1]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm lg:text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{scent.name}</span>
                    <span className="text-lg">{scentCategoryInfo?.icon}</span>
                  </div>
                  <p className={`text-[11px] lg:text-[13px] ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>{t('additionalScentLabel')}</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${saju ? SJ.blueInk : 'text-[var(--muted-ink)]'}`}>{scent.ratio}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 자연어 피드백 입력 */}
      <div className={`rounded-[6px] p-4 border-2 shadow-sm ${saju ? 'bg-[#EDE5D2] border-[#C9A227]/40' : 'bg-gradient-to-br from-[var(--canvas)] via-[var(--canvas)] to-[var(--canvas)] border-stone-200/60'}`}>
        <h3 className={`text-sm lg:text-base font-bold flex items-center gap-2 mb-3 ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>
          <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center ${saju ? 'bg-[#FDFAF1] border border-[#D8CFBB]' : 'bg-[var(--soft)]'}`}>
            <MessageSquare size={15} className={saju ? 'text-[#7A5C14]' : 'text-[var(--muted-ink)]'} />
          </div>
          {t('feelingQuestion')}
          <span className={`text-xs lg:text-sm font-normal px-2 py-0.5 rounded-full ${saju ? SJ.chipSoft : 'text-[var(--muted-ink)] bg-[var(--soft)]/50'}`}>
            {t('optional')}
          </span>
        </h3>

        <textarea
          value={naturalLanguageFeedback}
          onChange={(e) => onNaturalLanguageFeedbackChange(e.target.value)}
          placeholder={t('feelingPlaceholder')}
          maxLength={500}
          rows={4}
          className={`w-full px-4 py-3 rounded-[6px] border-2 transition-all resize-none text-sm lg:text-base ${
            saju
              ? `${SJ.input} focus:ring-2 focus:ring-[#C9A227]/20`
              : 'border-[var(--line)] bg-[var(--paper)] focus:border-[var(--line)] focus:ring-2 focus:ring-[var(--line)] placeholder:text-[#5C564A]'
          }`}
        />

        <div className="flex justify-between items-center mt-2">
          <div className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>
            <Sparkles size={12} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
            <span>{t('aiRefNote')}</span>
          </div>
          <span className={`text-xs lg:text-sm font-medium ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>
            {naturalLanguageFeedback.length} / 500
          </span>
        </div>
      </div>

      {/* 결과 안내 박스 */}
      <div className={`rounded-[6px] p-4 border space-y-3 ${saju ? SJ.cardSoft : 'bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] border-stone-200/50'}`}>
        <h3 className={`text-sm lg:text-base font-bold flex items-center gap-2 ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>
          <Sparkles size={16} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
          {t('resultTwoOptions')}
        </h3>

        <div className="space-y-2">
          {/* 1안 설명 */}
          <div className={`flex items-start gap-3 rounded-[6px] p-3 ${saju ? 'bg-[#FDFAF1]/80' : 'bg-[var(--paper)]/60'}`}>
            <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-sm lg:text-base flex-shrink-0 ${saju ? `${SJ.serif} ${SJ.chipGold}` : 'bg-[var(--soft)] text-[var(--muted-ink)]'}`}>
              {saju ? '直' : '1'}
            </div>
            <div>
              <p className={`font-medium text-sm lg:text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{t('option1Title')}</p>
              <p className={`text-xs lg:text-sm mt-0.5 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
                {t('option1Desc')}
              </p>
            </div>
          </div>

          {/* 2안 설명 */}
          <div className={`flex items-start gap-3 rounded-[6px] p-3 ${saju ? 'bg-[#FDFAF1]/80' : 'bg-[var(--paper)]/60'}`}>
            <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-sm lg:text-base flex-shrink-0 ${saju ? `${SJ.serif} ${SJ.chipBlue}` : 'bg-[var(--soft)] text-[var(--muted-ink)]'}`}>
              {saju ? '薦' : '2'}
            </div>
            <div>
              <p className={`font-medium text-sm lg:text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{t('option2Title')}</p>
              <p className={`text-xs lg:text-sm mt-0.5 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
                {naturalLanguageFeedback
                  ? t('option2DescWithFeedback')
                  : t('option2DescNoFeedback')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className={`flex items-start gap-2 text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
        <Info size={14} className={`flex-shrink-0 mt-0.5 ${saju ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'}`} />
        <p>
          {t('skipNote')}
        </p>
      </div>
    </motion.div>
  )
}
