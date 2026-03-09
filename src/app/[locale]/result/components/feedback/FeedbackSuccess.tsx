'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Droplet, TestTube2, AlertTriangle, PartyPopper, TrendingUp, TrendingDown, Minus, Check, RotateCcw, Target, Sparkles } from 'lucide-react'
import { GeneratedRecipe, CategoryChange, PerfumeFeedback } from '@/types/feedback'
import { Button } from '@/components/ui/button'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'

interface FeedbackSuccessProps {
  userDirectRecipe: GeneratedRecipe // 1안: 사용자 직접 선택
  aiRecommendedRecipe: GeneratedRecipe | null // 2안: AI 추천
  perfumeName: string
  previousFeedback?: PerfumeFeedback // 이전 피드백 정보
  onClose: () => void
  onConfirmRecipe: (recipe: GeneratedRecipe) => void // 레시피 확정하기 (선택된 탭의 레시피)
  onRetryFeedback: () => void // 다시 피드백 기록하기
}

// 강도별 스타일 (labels are translated via t())
const STRENGTH_STYLES = {
  light: { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  strong: { bg: 'bg-red-100', text: 'text-red-700' },
}

// English category key mapping (for consistent color lookup)
// Includes all locale variants: ko, en, ja, zh, es
const CATEGORY_KEY_MAP: Record<string, string> = {
  // English
  citrus: 'citrus', floral: 'floral', woody: 'woody',
  musky: 'musky', fruity: 'fruity', spicy: 'spicy',
  // Korean
  시트러스: 'citrus', 플로럴: 'floral', 우디: 'woody',
  머스크: 'musky', 프루티: 'fruity', 스파이시: 'spicy',
  // Japanese
  シトラス: 'citrus', フローラル: 'floral', ウッディ: 'woody',
  ムスキー: 'musky', フルーティー: 'fruity', スパイシー: 'spicy',
  // Chinese
  柑橘: 'citrus', 花香: 'floral', 木质: 'woody',
  麝香: 'musky', 果香: 'fruity', 辛辣: 'spicy',
  柑橘调: 'citrus', 花香调: 'floral', 木质调: 'woody',
  果香调: 'fruity',
  // Spanish
  'Cítrico': 'citrus', 'Floral': 'floral', 'Amaderado': 'woody',
  'Almizcle': 'musky', 'Frutal': 'fruity', 'Especiado': 'spicy',
  'cítrico': 'citrus', 'amaderado': 'woody',
  'almizcle': 'musky', 'frutal': 'fruity', 'especiado': 'spicy',
}

// 카테고리 색상 (key = English)
const CATEGORY_COLORS: Record<string, { bg: string; bar: string }> = {
  citrus: { bg: 'bg-yellow-100', bar: 'bg-yellow-400' },
  floral: { bg: 'bg-pink-100', bar: 'bg-pink-400' },
  woody: { bg: 'bg-amber-100', bar: 'bg-amber-600' },
  musky: { bg: 'bg-purple-100', bar: 'bg-purple-400' },
  fruity: { bg: 'bg-red-100', bar: 'bg-red-400' },
  spicy: { bg: 'bg-orange-100', bar: 'bg-orange-500' },
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
  const t = useTranslations('feedback')
  const { getLocalizedName } = useLocalizedPerfumes()
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

  const strengthStyle = STRENGTH_STYLES[recipe.estimatedStrength]
  const strengthLabel = t(`strength${recipe.estimatedStrength.charAt(0).toUpperCase() + recipe.estimatedStrength.slice(1)}` as 'strengthLight')

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
          <h2 className="text-lg font-black text-slate-900">{t('recipeComplete')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('basedOnCustom', { name: recipe.granules[0] ? getLocalizedName(recipe.granules[0].id, perfumeName) : perfumeName })}
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
          <span>{t('option1Tab')}</span>
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
          <span>{t('option2Tab')}</span>
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
              {t('option1Banner')}
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2">
              <Sparkles size={16} />
              {t('option2Banner')}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 레시피 향료 목록 - 최상단 배치 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Droplet size={14} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-700">{t('recipeComposition')}</h3>
        </div>

        {recipe.granules.map((granule, index) => {
          const bgColor = getGranuleColor(granule.id)
          const textColorClass = isLightColor(bgColor) ? 'text-slate-800' : 'text-white'

          return (
          <motion.div
            key={granule.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* 방울 수 - 엄청 크게! */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border-2 border-slate-200' : ''}`}
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-4xl leading-none">{granule.drops}</span>
                <span className={`text-sm font-bold mt-1 ${isLightColor(bgColor) ? 'opacity-70' : 'opacity-90'}`}>{t('drops')}</span>
              </div>

              {/* 향료 정보 */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-base">{getLocalizedName(granule.id, granule.name)}</span>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                    {granule.ratio}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">{granule.id}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {granule.reason}
                </p>
              </div>
            </div>
          </motion.div>
        )})}
      </motion.div>

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
            {t('totalDrops', { count: recipe.totalDrops })}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${strengthStyle.bg}`}>
          <span className={`text-xs font-medium ${strengthStyle.text}`}>
            {strengthLabel}
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
            <h3 className="text-sm font-bold text-slate-700">{t('balanceChange')}</h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                {t('existing')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                {t('changed')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {recipe.categoryChanges.map((change, index) => {
              const categoryKey = CATEGORY_KEY_MAP[change.category] || CATEGORY_KEY_MAP[change.category.toLowerCase()] || 'citrus'
              const translationKey = `category${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}` as 'categoryCitrus'
              const categoryName = t(translationKey)
              const colors = CATEGORY_COLORS[categoryKey] || { bg: 'bg-slate-100', bar: 'bg-slate-400' }
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

      {/* 테스트 방법 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <TestTube2 size={14} className="text-purple-500" />
          <h3 className="text-sm font-bold text-slate-700">{t('testMethod')}</h3>
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
          {activeTab === 'user' ? t('confirmOption1') : t('confirmOption2')}
        </Button>

        {/* 다시 피드백 기록하기 버튼 */}
        <Button
          onClick={onRetryFeedback}
          variant="outline"
          className="w-full h-11 border-2 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          {t('retryFeedback')}
        </Button>

        {/* 완료하고 돌아가기 */}
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors"
        >
          {t('later')}
        </button>
      </motion.div>
    </motion.div>
  )
}
