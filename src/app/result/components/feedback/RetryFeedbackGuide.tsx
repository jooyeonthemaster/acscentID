'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PerfumeFeedback } from '@/types/feedback'

interface RetryFeedbackGuideProps {
  previousFeedback: PerfumeFeedback
  perfumeName: string
  onConfirm: () => void
  onCancel: () => void
}

export function RetryFeedbackGuide({
  previousFeedback,
  perfumeName,
  onConfirm,
  onCancel,
}: RetryFeedbackGuideProps) {
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
          className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-purple-400/40"
        >
          <RotateCcw size={28} className="text-white" />
        </motion.div>
        <div>
          <h2 className="text-lg font-black text-slate-900">새로운 피드백</h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-purple-600">{perfumeName}</span> 기준으로 다시 시작해요
          </p>
        </div>
      </div>

      {/* 이전 피드백 요약 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📋</span>
          <span className="text-sm font-bold text-slate-700">이전에 이렇게 선택했어요</span>
        </div>

        <div className="space-y-3">
          {/* 추천 향 비율 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">추천 향 유지 비율</span>
              <span className="text-lg font-black text-amber-500">
                {previousFeedback.retentionPercentage}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${previousFeedback.retentionPercentage}%` }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
              />
            </div>
          </div>

          {/* 추가 향료 */}
          {previousFeedback.specificScents.length > 0 && (
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <span className="text-xs font-medium text-slate-600 block mb-2">추가한 향료</span>
              <div className="flex flex-wrap gap-2">
                {previousFeedback.specificScents.map((scent) => (
                  <span
                    key={scent.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-full text-xs"
                  >
                    <span className="font-bold text-amber-700">{scent.name}</span>
                    <span className="text-amber-500 font-medium">{scent.ratio}%</span>
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
        className="flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-xl border border-purple-100"
      >
        <Sparkles size={16} className="text-purple-500 flex-shrink-0" />
        <p className="text-xs text-purple-700">
          이전 선택을 참고해서 더 완벽한 레시피를 만들어봐요!
        </p>
      </motion.div>

      {/* 플로우 안내 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center"
      >
        <div className="flex items-center gap-1 bg-slate-100 rounded-full px-4 py-2">
          <span className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold">1</span>
          <span className="text-[10px] text-slate-600 font-medium mx-1">비율</span>
          <span className="text-slate-300">→</span>
          <span className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold mx-1">2</span>
          <span className="text-[10px] text-slate-600 font-medium">향료</span>
          <span className="text-slate-300">→</span>
          <span className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold mx-1">3</span>
          <span className="text-[10px] text-slate-600 font-medium">레시피</span>
        </div>
      </motion.div>

      {/* 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <Button
          onClick={onConfirm}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
        >
          새로운 피드백 기록하기
          <ArrowRight size={16} />
        </Button>
        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors"
        >
          이전 레시피로 돌아갈래요
        </button>
      </motion.div>
    </motion.div>
  )
}
