'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { PerfumeFeedback } from '@/types/feedback'
import { FeedbackTheme, SJ, SAJU_RETENTION_HANJA, useFeedbackTranslations } from './sajuFeedbackTheme'

interface FeedbackStep1Props {
  retention: number
  onRetentionChange: (value: number) => void
  previousFeedback?: PerfumeFeedback | null
  theme?: FeedbackTheme
}

// 슬라이더 스텝 표시
const RETENTION_STEPS = [0, 20, 40, 60, 80, 100]

// Retention message emojis (mapped to retentionMsg1-5 translation keys)
const RETENTION_EMOJIS = ['🌱', '🎨', '⚖️', '💕', '✨']
const RETENTION_THRESHOLDS = [20, 40, 60, 80, 100]

export function FeedbackStep1({ retention, onRetentionChange, previousFeedback, theme = 'default' }: FeedbackStep1Props) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'

  // Get retention message index based on retention value
  const msgIndex = RETENTION_THRESHOLDS.findIndex(max => retention <= max)
  const retentionIndex = msgIndex === -1 ? RETENTION_THRESHOLDS.length - 1 : msgIndex
  const emoji = saju ? SAJU_RETENTION_HANJA[retentionIndex] : RETENTION_EMOJIS[retentionIndex]
  const retentionText = t(`retentionMsg${retentionIndex + 1}` as 'retentionMsg1')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* 이모지 & 메시지 */}
      <div className="text-center space-y-3">
        <motion.span
          key={emoji}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`text-7xl block ${saju ? `${SJ.serif} ${SJ.cinnabarText}` : ''}`}
        >
          {emoji}
        </motion.span>
        <motion.p
          key={retentionText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-medium text-base whitespace-pre-line ${saju ? SJ.ink : 'text-[#A69F8D]'}`}
        >
          {retentionText}
        </motion.p>
      </div>

      {/* 퍼센트 표시 */}
      <div className="text-center">
        <motion.span
          key={retention}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={`text-6xl font-black ${
            saju
              ? 'saju-gold-foil'
              : 'bg-gradient-to-r from-[#161925] to-[#161925] bg-clip-text text-transparent'
          }`}
        >
          {retention}
        </motion.span>
        <span className={`text-3xl font-bold ml-1 ${saju ? SJ.inkFaint : 'text-[#8B8578]'}`}>%</span>
      </div>

      {/* 슬라이더 */}
      <div className="px-2 space-y-4">
        <div className="relative">
          {/* 배경 트랙 */}
          <div className={`absolute inset-0 h-3 rounded-full ${saju ? SJ.trackBase : 'bg-[#232838]'}`} />

          {/* 채워진 트랙 */}
          <motion.div
            className={`absolute h-3 rounded-full ${saju ? SJ.fillGold : 'bg-gradient-to-r from-[#161925] to-[#161925]'}`}
            style={{ width: `${retention}%` }}
            layout
          />

          {/* 실제 슬라이더 */}
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={retention}
            onChange={(e) => onRetentionChange(parseInt(e.target.value))}
            className={`relative w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:border-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-grab
              ${saju
                ? SJ.sliderThumb
                : `[&::-webkit-slider-thumb]:bg-[#12141D]
                   [&::-webkit-slider-thumb]:border-[#343A4C]
                   [&::-webkit-slider-thumb]:shadow-stone-500/30
                   [&::-moz-range-thumb]:bg-[#12141D]
                   [&::-moz-range-thumb]:border-[#343A4C]`}`}
          />
        </div>

        {/* 스텝 라벨 */}
        <div className="flex justify-between px-1">
          {RETENTION_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => onRetentionChange(step)}
              className={`text-xs lg:text-sm font-medium transition-colors ${
                retention === step
                  ? saju ? SJ.goldText : 'text-[#A69F8D]'
                  : saju ? 'text-[#8B8578] hover:text-[#5C564A]' : 'text-[#8B8578] hover:text-[#A69F8D]'
              }`}
            >
              {step}%
            </button>
          ))}
        </div>
      </div>

      {/* 안내 라벨 */}
      <div className={`flex justify-between text-xs lg:text-sm px-2 ${saju ? SJ.inkFaint : 'text-[#8B8578]'}`}>
        <span>{t('newCombination')}</span>
        <span>{t('keepRecommended')}</span>
      </div>

      {/* 이전 피드백 표시 (재피드백 시) */}
      {previousFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[12px] p-3 border ${saju ? SJ.cardSoft : 'bg-[#0C0E16] border-stone-200/50'}`}
        >
          <div className="flex items-start gap-2">
            <Info size={16} className={`flex-shrink-0 mt-0.5 ${saju ? 'text-[#2C3E50]' : 'text-[#8B8578]'}`} />
            <div className="text-sm lg:text-base">
              <p className={`font-medium ${saju ? SJ.blueInk : 'text-[#A69F8D]'}`}>{t('previousSelection')}</p>
              <p className={`text-xs lg:text-sm mt-0.5 ${saju ? SJ.inkMuted : 'text-[#A69F8D]'}`}>
                {t('recommendedRatio')} <span className="font-bold">{previousFeedback.retentionPercentage}%</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 팁 박스 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`rounded-[12px] p-4 border ${saju ? 'bg-[#EDE5D2] border-[#C9A227]/40' : 'bg-gradient-to-r from-[#0C0E16] to-[#0C0E16] border-stone-200/50'}`}
      >
        <p className={`text-sm lg:text-base ${saju ? SJ.inkMuted : 'text-[#E9E2D0]'}`}>
          {saju ? <span className={`${SJ.serif} ${SJ.goldText}`}>訣 </span> : '💡 '}
          <span className={`font-semibold ${saju ? SJ.ink : ''}`}>{t('tipTitle')}</span>{' '}
          {retention < 50
            ? t('tipLow')
            : retention < 80
              ? t('tipMid')
              : t('tipHigh')}
        </p>
      </motion.div>
    </motion.div>
  )
}
