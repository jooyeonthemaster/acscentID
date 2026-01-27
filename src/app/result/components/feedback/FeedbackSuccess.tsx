'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, TestTube2, AlertTriangle, PartyPopper, TrendingUp, TrendingDown, Minus, Check, RotateCcw, Target, Sparkles } from 'lucide-react'
import { GeneratedRecipe, CategoryChange, PerfumeFeedback } from '@/types/feedback'
import { Button } from '@/components/ui/button'
import { perfumes } from '@/data/perfumes'

interface FeedbackSuccessProps {
  userDirectRecipe: GeneratedRecipe // 1안: 사용자 직접 선택
  aiRecommendedRecipe: GeneratedRecipe | null // 2안: AI 추천
  perfumeName: string
  previousFeedback?: PerfumeFeedback // 이전 피드백 정보
  onClose: () => void
  onConfirmRecipe: (recipe: GeneratedRecipe) => void // 레시피 확정하기 (선택된 탭의 레시피)
  onRetryFeedback: () => void // 다시 피드백 기록하기
}

// 강도별 색상
const STRENGTH_COLORS = {
  light: { bg: 'bg-green-100', text: 'text-green-700', label: '가벼움' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: '적당함' },
  strong: { bg: 'bg-red-100', text: 'text-red-700', label: '진함' },
}

// 카테고리 한글명 매핑
const CATEGORY_KOREAN: Record<string, string> = {
  citrus: '시트러스',
  floral: '플로럴',
  woody: '우디',
  musky: '머스크',
  fruity: '프루티',
  spicy: '스파이시',
  시트러스: '시트러스',
  플로럴: '플로럴',
  우디: '우디',
  머스크: '머스크',
  프루티: '프루티',
  스파이시: '스파이시',
}

// 카테고리 색상
const CATEGORY_COLORS: Record<string, { bg: string; bar: string }> = {
  시트러스: { bg: 'bg-yellow-100', bar: 'bg-yellow-400' },
  플로럴: { bg: 'bg-pink-100', bar: 'bg-pink-400' },
  우디: { bg: 'bg-amber-100', bar: 'bg-amber-600' },
  머스크: { bg: 'bg-purple-100', bar: 'bg-purple-400' },
  프루티: { bg: 'bg-red-100', bar: 'bg-red-400' },
  스파이시: { bg: 'bg-orange-100', bar: 'bg-orange-500' },
}

export function FeedbackSuccess({
  userDirectRecipe,
  aiRecommendedRecipe,
  perfumeName,
  previousFeedback,
  onClose,
  onConfirmRecipe,
  onRetryFeedback
}: FeedbackSuccessProps) {
  // 탭 상태 (1안: user, 2안: ai)
  const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user')

  // 현재 선택된 레시피
  const recipe = activeTab === 'user' ? userDirectRecipe : (aiRecommendedRecipe || userDirectRecipe)

  // 향수 색상 가져오기
  const getGranuleColor = (id: string) => {
    const perfume = perfumes.find((p) => p.id === id)
    return perfume?.primaryColor || '#6B7280'
  }

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

  const strengthStyle = STRENGTH_COLORS[recipe.estimatedStrength]

  // 변화 아이콘 렌더링
  const renderChangeIcon = (change: CategoryChange['change']) => {
    if (change === 'increased') {
      return <TrendingUp size={14} className="text-green-600" />
    } else if (change === 'decreased') {
      return <TrendingDown size={14} className="text-red-500" />
    }
    return <Minus size={14} className="text-slate-400" />
  }

  // 변화량 계산 및 표시
  const renderScoreChange = (original: number, newScore: number) => {
    const diff = newScore - original
    if (diff === 0) return <span className="text-slate-400 text-xs">±0</span>
    if (diff > 0) return <span className="text-green-600 text-xs font-medium">+{diff}</span>
    return <span className="text-red-500 text-xs font-medium">{diff}</span>
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* 성공 헤더 */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-400/40"
        >
          <PartyPopper size={28} className="text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-black text-slate-900">레시피 완성!</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {perfumeName} 기반 커스텀 레시피
          </p>
        </motion.div>
      </div>

      {/* 2탭 선택 UI */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex bg-slate-100 p-1 rounded-xl gap-1"
      >
        <button
          onClick={() => setActiveTab('user')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'user'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Target size={14} />
          <span>1안: 직접 선택</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          disabled={!aiRecommendedRecipe}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ai'
              ? 'bg-white text-purple-600 shadow-sm'
              : aiRecommendedRecipe
                ? 'text-slate-500 hover:text-slate-700'
                : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <Sparkles size={14} />
          <span>2안: AI 추천</span>
        </button>
      </motion.div>

      {/* 탭별 설명 배너 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className={`rounded-xl p-3 border text-center text-sm ${
            activeTab === 'user'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-purple-50 border-purple-200 text-purple-700'
          }`}
        >
          {activeTab === 'user' ? (
            <p className="flex items-center justify-center gap-2">
              <Target size={16} />
              AI 수정 없이 내가 선택한 그대로예요!
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2">
              <Sparkles size={16} />
              자연어 피드백을 반영해 AI가 추천해요!
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 전체 설명 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-3 border border-yellow-200/50"
      >
        <p className="text-slate-700 text-sm leading-relaxed">
          {recipe.overallExplanation}
        </p>
      </motion.div>

      {/* 레시피 요약 정보 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-3"
      >
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full">
          <Droplet size={12} className="text-amber-500" />
          <span className="text-xs font-medium text-slate-700">
            총 {recipe.totalDrops}방울
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${strengthStyle.bg}`}>
          <span className={`text-xs font-medium ${strengthStyle.text}`}>
            {strengthStyle.label}
          </span>
        </div>
      </motion.div>

      {/* 향 밸런스 변화 비교 차트 */}
      {recipe.categoryChanges && recipe.categoryChanges.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-50 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">향 밸런스 변화</h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                기존
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                변경
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {recipe.categoryChanges.map((change, index) => {
              const categoryName = CATEGORY_KOREAN[change.category] || change.category
              const colors = CATEGORY_COLORS[categoryName] || { bg: 'bg-slate-100', bar: 'bg-slate-400' }
              const originalScore = change.originalScore || 0
              const newScore = change.newScore || 0

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700 w-16">{categoryName}</span>
                      {renderChangeIcon(change.change)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{originalScore}</span>
                      <span className="text-[10px] text-slate-400">→</span>
                      <span className="text-[10px] font-medium text-slate-700">{newScore}</span>
                      {renderScoreChange(originalScore, newScore)}
                    </div>
                  </div>

                  {/* 듀얼 바 차트 */}
                  <div className="relative h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                    {/* 기존 점수 (회색 배경) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-slate-200 transition-all"
                      style={{ width: `${originalScore}%` }}
                    />
                    {/* 새 점수 (컬러 오버레이) */}
                    <div
                      className={`absolute top-0 left-0 h-full ${colors.bar} transition-all`}
                      style={{ width: `${newScore}%`, opacity: 0.9 }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* 레시피 향료 목록 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Droplet size={14} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-700">레시피 구성</h3>
        </div>

        {recipe.granules.map((granule, index) => {
          const bgColor = getGranuleColor(granule.id)
          const textColorClass = isLightColor(bgColor) ? 'text-slate-800' : 'text-white'

          return (
          <motion.div
            key={granule.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + index * 0.08 }}
            className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* 향료 아이콘 */}
              <div
                className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-slate-200' : ''}`}
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-lg">{granule.drops}</span>
                <span className={`text-[8px] ${isLightColor(bgColor) ? 'opacity-60' : 'opacity-80'}`}>방울</span>
              </div>

              {/* 향료 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{granule.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    {granule.ratio}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{granule.id}</p>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {granule.reason}
                </p>
              </div>
            </div>
          </motion.div>
        )})}
      </motion.div>

      {/* 테스트 방법 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <TestTube2 size={14} className="text-purple-500" />
          <h3 className="text-sm font-bold text-slate-700">테스트 방법</h3>
        </div>

        <div className="bg-purple-50 rounded-xl p-3 space-y-2">
          {[
            recipe.testingInstructions.step1,
            recipe.testingInstructions.step2,
            recipe.testingInstructions.step3,
          ].map((step, index) => (
            <div key={index} className="flex gap-2">
              <span className="w-5 h-5 bg-purple-200 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-700 flex-shrink-0">
                {index + 1}
              </span>
              <p className="text-xs text-slate-700 flex-1">{step}</p>
            </div>
          ))}
        </div>

        {/* 주의사항 */}
        <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-200/50">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700">{recipe.testingInstructions.caution}</p>
        </div>
      </motion.div>

      {/* 팬 메시지 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        className="bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 rounded-xl p-4 border border-purple-200/50"
      >
        <p className="text-sm text-slate-700 leading-relaxed text-center font-medium">
          {recipe.fanMessage}
        </p>
      </motion.div>

      {/* 액션 버튼들 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-3 pb-16 md:pb-0"
      >
        {/* 레시피 확정하기 버튼 */}
        <Button
          onClick={() => onConfirmRecipe(recipe)}
          className={`w-full h-12 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 ${
            activeTab === 'user'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-purple-500/30'
          }`}
        >
          <Check size={18} />
          {activeTab === 'user' ? '1안으로 확정하기' : '2안으로 확정하기'}
        </Button>

        {/* 다시 피드백 기록하기 버튼 */}
        <Button
          onClick={onRetryFeedback}
          variant="outline"
          className="w-full h-11 border-2 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          다시 피드백 기록하기
        </Button>

        {/* 완료하고 돌아가기 */}
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors"
        >
          나중에 할게요
        </button>
      </motion.div>
    </motion.div>
  )
}
