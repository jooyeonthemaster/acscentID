'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, Minus } from 'lucide-react'
import {
  CategoryPreferences,
  CategoryPreference,
  FEEDBACK_CATEGORY_INFO,
} from '@/types/feedback'

interface FeedbackStep2Props {
  preferences: CategoryPreferences
  onPreferenceChange: (
    category: keyof CategoryPreferences,
    value: CategoryPreference
  ) => void
}

const PREFERENCE_OPTIONS: {
  value: CategoryPreference
  label: string
  icon: typeof ChevronUp
  activeColor: string
  bgColor: string
}[] = [
  {
    value: 'increase',
    label: '더 강하게',
    icon: ChevronUp,
    activeColor: 'text-green-600',
    bgColor: 'bg-green-100 border-green-400',
  },
  {
    value: 'maintain',
    label: '그대로',
    icon: Minus,
    activeColor: 'text-slate-600',
    bgColor: 'bg-slate-100 border-slate-400',
  },
  {
    value: 'decrease',
    label: '더 약하게',
    icon: ChevronDown,
    activeColor: 'text-red-500',
    bgColor: 'bg-red-100 border-red-400',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
  exit: { opacity: 0, y: -20 },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

export function FeedbackStep2({
  preferences,
  onPreferenceChange,
}: FeedbackStep2Props) {
  const categories = Object.keys(FEEDBACK_CATEGORY_INFO) as (keyof CategoryPreferences)[]

  // 변경된 카테고리 수 계산
  const changedCount = Object.values(preferences).filter((v) => v !== 'maintain').length

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      {/* 헤더 */}
      <div className="text-center mb-6">
        <p className="text-sm text-slate-500">
          각 향 카테고리를 어떻게 조절하고 싶으신가요?
        </p>
        {changedCount > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-amber-600 mt-2"
          >
            ✨ {changedCount}개 카테고리 변경됨
          </motion.p>
        )}
      </div>

      {/* 카테고리 목록 */}
      {categories.map((category) => {
        const info = FEEDBACK_CATEGORY_INFO[category]
        const currentValue = preferences[category]

        return (
          <motion.div
            key={category}
            variants={itemVariants}
            className="bg-slate-50 rounded-2xl p-4 hover:bg-slate-100 transition-colors"
          >
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{info.icon}</span>
              <span className="font-bold text-slate-900">{info.label}</span>
              {currentValue !== 'maintain' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    currentValue === 'increase'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {currentValue === 'increase' ? '↑ 강화' : '↓ 약화'}
                </motion.span>
              )}
            </div>

            {/* 옵션 버튼들 */}
            <div className="flex gap-2">
              {PREFERENCE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = currentValue === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => onPreferenceChange(category, option.value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all border-2
                      ${
                        isSelected
                          ? `${option.bgColor} shadow-sm`
                          : 'bg-white/70 border-transparent hover:bg-white hover:border-slate-200'
                      }`}
                  >
                    <Icon
                      size={20}
                      className={isSelected ? option.activeColor : 'text-slate-400'}
                    />
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? option.activeColor : 'text-slate-500'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )
      })}

      {/* 팁 박스 */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200/50 mt-6"
      >
        <p className="text-sm text-purple-800">
          💜 <span className="font-semibold">팁!</span> '그대로' 선택이 많아도 괜찮아요!
          AI가 피드백을 분석해서 더 좋은 밸런스를 찾아줄 거예요 ✨
        </p>
      </motion.div>
    </motion.div>
  )
}
