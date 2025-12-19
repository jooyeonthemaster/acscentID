'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { getRetentionMessage, PerfumeFeedback } from '@/types/feedback'

interface FeedbackStep1Props {
  retention: number
  onRetentionChange: (value: number) => void
  previousFeedback?: PerfumeFeedback | null
}

// 슬라이더 스텝 표시
const RETENTION_STEPS = [0, 20, 40, 60, 80, 100]

export function FeedbackStep1({ retention, onRetentionChange, previousFeedback }: FeedbackStep1Props) {
  const message = getRetentionMessage(retention)

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
          key={message.emoji}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="text-7xl block"
        >
          {message.emoji}
        </motion.span>
        <motion.p
          key={message.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-700 font-medium text-base"
        >
          {message.text}
        </motion.p>
      </div>

      {/* 퍼센트 표시 */}
      <div className="text-center">
        <motion.span
          key={retention}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-6xl font-black bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent"
        >
          {retention}
        </motion.span>
        <span className="text-3xl font-bold text-slate-400 ml-1">%</span>
      </div>

      {/* 슬라이더 */}
      <div className="px-2 space-y-4">
        <div className="relative">
          {/* 배경 트랙 */}
          <div className="absolute inset-0 h-3 bg-slate-200 rounded-full" />

          {/* 채워진 트랙 */}
          <motion.div
            className="absolute h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
            style={{ width: `${retention}%` }}
            layout
          />

          {/* 실제 슬라이더 */}
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={retention}
            onChange={(e) => onRetentionChange(parseInt(e.target.value))}
            className="relative w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-amber-500
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-amber-500/30
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-4
              [&::-moz-range-thumb]:border-amber-500
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-grab"
          />
        </div>

        {/* 스텝 라벨 */}
        <div className="flex justify-between px-1">
          {RETENTION_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => onRetentionChange(step)}
              className={`text-xs font-medium transition-colors ${
                retention === step
                  ? 'text-amber-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {step}%
            </button>
          ))}
        </div>
      </div>

      {/* 안내 라벨 */}
      <div className="flex justify-between text-xs text-slate-400 px-2">
        <span>🌱 새로운 조합</span>
        <span>✨ 추천 향 유지</span>
      </div>

      {/* 이전 피드백 표시 (재피드백 시) */}
      {previousFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 rounded-2xl p-3 border border-purple-200/50"
        >
          <div className="flex items-start gap-2">
            <Info size={16} className="text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-purple-700 font-medium">이전 선택</p>
              <p className="text-purple-600 text-xs mt-0.5">
                추천 향 비율: <span className="font-bold">{previousFeedback.retentionPercentage}%</span>
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
        className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-200/50"
      >
        <p className="text-sm text-amber-800">
          💡 <span className="font-semibold">팁!</span>{' '}
          {retention < 50
            ? '추천 향을 베이스로 새로운 향료들을 많이 추가해서 나만의 향을 만들어봐요!'
            : retention < 80
              ? '추천 향의 느낌을 살리면서 약간의 변화를 줄 수 있어요 ✨'
              : '추천 향이 마음에 들었군요! 그대로 가거나 살짝만 조절해볼게요 🌟'}
        </p>
      </motion.div>
    </motion.div>
  )
}
