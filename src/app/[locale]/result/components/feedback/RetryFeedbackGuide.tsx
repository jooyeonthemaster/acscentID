'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PerfumeFeedback } from '@/types/feedback'
import { FeedbackTheme, SJ, useFeedbackTranslations } from './sajuFeedbackTheme'

interface RetryFeedbackGuideProps {
  previousFeedback: PerfumeFeedback
  perfumeName: string
  onConfirm: () => void
  onCancel: () => void
  theme?: FeedbackTheme
}

export function RetryFeedbackGuide({
  previousFeedback,
  perfumeName,
  onConfirm,
  onCancel,
  theme = 'default',
}: RetryFeedbackGuideProps) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      {/* 헤더 */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
          className={`w-16 h-16 mx-auto flex items-center justify-center shadow-lg ${
            saju
              ? 'rounded-[6px] bg-[#2C3E50] shadow-[#2C3E50]/30 rotate-[-3deg]'
              : 'bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-full shadow-stone-400/40'
          }`}
        >
          {saju ? (
            <span className="font-serif-kr text-3xl leading-none text-[#F5EFE2]">再</span>
          ) : (
            <RotateCcw size={28} className="text-[var(--ink)]" />
          )}
        </motion.div>
        <div>
          <h2 className={`text-lg font-black ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>{t('newFeedback')}</h2>
          <p className={`text-sm lg:text-base mt-1 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
            {t('retryStart', { name: perfumeName })}
          </p>
        </div>
      </div>

      {/* 이전 피드백 요약 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`rounded-[6px] p-4 border ${saju ? SJ.cardSoft : 'bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] border-[var(--line)]'}`}
      >
        <div className="flex items-center gap-2 mb-3">
          {saju ? (
            <span className={`text-base ${SJ.serif} ${SJ.goldText}`}>錄</span>
          ) : (
            <span className="text-base">📋</span>
          )}
          <span className={`text-sm lg:text-base font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>{t('previousChoices')}</span>
        </div>

        <div className="space-y-3">
          {/* 추천 향 비율 */}
          <div className={`rounded-[6px] p-3 shadow-sm ${saju ? `${SJ.card} border` : 'bg-[var(--paper)]'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs lg:text-sm font-medium ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('retentionRatio')}</span>
              <span className={`text-lg font-black ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>
                {previousFeedback.retentionPercentage}%
              </span>
            </div>
            <div className={`mt-2 h-2 rounded-full overflow-hidden ${saju ? SJ.trackBase : 'bg-[var(--soft)]'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${previousFeedback.retentionPercentage}%` }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={`h-full rounded-full ${saju ? SJ.fillGold : 'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]'}`}
              />
            </div>
          </div>

          {/* 추가 향료 */}
          {previousFeedback.specificScents.length > 0 && (
            <div className={`rounded-[6px] p-3 shadow-sm ${saju ? `${SJ.card} border` : 'bg-[var(--paper)]'}`}>
              <span className={`text-xs lg:text-sm font-medium block mb-2 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('addedScentsLabel')}</span>
              <div className="flex flex-wrap gap-2">
                {previousFeedback.specificScents.map((scent) => (
                  <span
                    key={scent.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs lg:text-sm ${
                      saju ? 'bg-[#C9A227]/10 border-[#C9A227]/40' : 'bg-gradient-to-r from-[var(--canvas)] to-[var(--canvas)] border-[var(--line)]'
                    }`}
                  >
                    <span className={`font-bold ${saju ? SJ.goldText : 'text-[var(--muted-ink)]'}`}>{scent.name}</span>
                    <span className={`font-medium ${saju ? 'text-[#7A5C14]/70' : 'text-[var(--muted-ink)]'}`}>{scent.ratio}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 안내 메시지 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`flex items-center gap-2 px-4 py-3 rounded-[6px] border ${saju ? SJ.cardSoft : 'bg-[var(--canvas)] border-[var(--line)]'}`}
      >
        <Sparkles size={16} className={`flex-shrink-0 ${saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'}`} />
        <p className={`text-xs lg:text-sm ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
          {t('retryGuideNote')}
        </p>
      </motion.div>

      {/* 플로우 안내 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center"
      >
        <div className={`flex items-center gap-1 rounded-full px-4 py-2 ${saju ? 'bg-[#EDE5D2]' : 'bg-[var(--soft)]'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold ${saju ? `${SJ.serif} bg-[#C9A227] text-[#1A1610]` : 'bg-[var(--soft)] text-[var(--ink)]'}`}>{saju ? '一' : '1'}</span>
          <span className={`text-[10px] lg:text-[12px] font-medium mx-1 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('flowRatio')}</span>
          <span className={saju ? 'text-[var(--muted-ink)]' : 'text-[#5C564A]'}>→</span>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold mx-1 ${saju ? `${SJ.serif} bg-[#2C3E50] text-[#F5EFE2]` : 'bg-[var(--soft)] text-[var(--ink)]'}`}>{saju ? '二' : '2'}</span>
          <span className={`text-[10px] lg:text-[12px] font-medium ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('flowScent')}</span>
          <span className={saju ? 'text-[var(--muted-ink)]' : 'text-[#5C564A]'}>→</span>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold mx-1 ${saju ? `${SJ.serif} bg-[#C0392B] text-[#F5EFE2]` : 'bg-[var(--soft)] text-[var(--ink)]'}`}>{saju ? '三' : '3'}</span>
          <span className={`text-[10px] lg:text-[12px] font-medium ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{t('flowRecipe')}</span>
        </div>
      </motion.div>

      {/* 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 pb-16 md:pb-0"
      >
        <Button
          onClick={onConfirm}
          className={`w-full h-12 rounded-[6px] font-bold shadow-lg flex items-center justify-center gap-2 ${
            saju ? SJ.ctaCinnabar : 'bg-[#F5EFE2] hover:from-[var(--soft)] hover:to-[var(--soft)] text-[var(--ink)] shadow-stone-500/30'
          }`}
        >
          {t('newFeedbackRecord')}
          <ArrowRight size={16} />
        </Button>
        <button
          onClick={onCancel}
          className={`w-full text-center text-sm lg:text-base py-2 transition-colors ${saju ? 'text-[var(--muted-ink)] hover:text-[#5C564A]' : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'}`}
        >
          {t('backToPrevRecipe')}
        </button>
      </motion.div>
    </motion.div>
  )
}
