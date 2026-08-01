'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, TestTube2, AlertTriangle, PartyPopper, TrendingUp, TrendingDown, Minus, Check, RotateCcw, Target, Sparkles } from 'lucide-react'
import { GeneratedRecipe, CategoryChange, PerfumeFeedback } from '@/types/feedback'
import { Button } from '@/components/ui/button'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { FeedbackTheme, SJ, useFeedbackTranslations } from './sajuFeedbackTheme'

interface FeedbackSuccessProps {
  userDirectRecipe: GeneratedRecipe // 1안: 사용자 직접 선택
  aiRecommendedRecipe: GeneratedRecipe | null // 2안: AI 추천
  perfumeName: string
  previousFeedback?: PerfumeFeedback // 이전 피드백 정보
  onClose: () => void
  onConfirmRecipe: (recipe: GeneratedRecipe, recipeType: 'user_direct' | 'ai_recommended') => void // 레시피 확정하기 (선택된 탭의 레시피)
  onRetryFeedback: () => void // 다시 피드백 기록하기
  theme?: FeedbackTheme
}

// 강도별 스타일 (labels are translated via t())
const STRENGTH_STYLES = {
  light: { bg: 'bg-[var(--soft)]', text: 'text-[var(--muted-ink)]' },
  medium: { bg: 'bg-[var(--soft)]', text: 'text-[var(--muted-ink)]' },
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
  citrus: { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' },
  floral: { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' },
  woody: { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' },
  musky: { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' },
  fruity: { bg: 'bg-red-100', bar: 'bg-red-400' },
  spicy: { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' },
}

export function FeedbackSuccess({
  userDirectRecipe,
  aiRecommendedRecipe,
  perfumeName,
  previousFeedback,
  onClose,
  onConfirmRecipe,
  onRetryFeedback,
  theme = 'default',
}: FeedbackSuccessProps) {
  const t = useFeedbackTranslations(theme)
  const saju = theme === 'saju'
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

  // 강도 뱃지 — 사주는 청묵/금/주사 3단
  const SAJU_STRENGTH_STYLES = {
    light: { bg: 'bg-[#2C3E50]/10', text: 'text-[#2C3E50]' },
    medium: { bg: 'bg-[#C9A227]/15', text: 'text-[#7A5C14]' },
    strong: { bg: 'bg-[#C0392B]/10', text: 'text-[#A93226]' },
  }
  const strengthStyle = (saju ? SAJU_STRENGTH_STYLES : STRENGTH_STYLES)[recipe.estimatedStrength]
  const strengthLabel = t(`strength${recipe.estimatedStrength.charAt(0).toUpperCase() + recipe.estimatedStrength.slice(1)}` as 'strengthLight')

  // 변화 아이콘 렌더링 (사주: 오행 목/화 텍스트 톤)
  const renderChangeIcon = (change: CategoryChange['change']) => {
    if (change === 'increased') {
      return <TrendingUp size={14} className={saju ? 'text-[#2F6340]' : 'text-[var(--muted-ink)]'} />
    } else if (change === 'decreased') {
      return <TrendingDown size={14} className={saju ? 'text-[#A93226]' : 'text-red-500'} />
    }
    return <Minus size={14} className={saju ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'} />
  }

  // 변화량 계산 및 표시
  const renderScoreChange = (original: number, newScore: number) => {
    const diff = newScore - original
    if (diff === 0) return <span className={`text-xs lg:text-sm ${saju ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'}`}>±0</span>
    if (diff > 0) return <span className={`text-xs lg:text-sm font-medium ${saju ? 'text-[#2F6340]' : 'text-[var(--muted-ink)]'}`}>+{diff}</span>
    return <span className={`text-xs lg:text-sm font-medium ${saju ? 'text-[#A93226]' : 'text-red-500'}`}>{diff}</span>
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
        {saju ? (
          // 주사 낙관 — 도장이 내려앉듯 (成 = 처방 완성)
          <motion.div
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 260, damping: 18 }}
            className="w-16 h-16 mx-auto flex items-center justify-center rounded-[6px] bg-[#B03325] shadow-lg shadow-[#C0392B]/30 rotate-[-3deg]"
          >
            <span className="font-serif-kr text-3xl leading-none text-[#F5EFE2]">成</span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-full mx-auto flex items-center justify-center shadow-lg shadow-stone-400/40"
          >
            <PartyPopper size={28} className="text-[var(--ink)]" />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={`text-lg font-black ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--ink)]'}`}>{t('recipeComplete')}</h2>
          <p className={`text-xs lg:text-sm mt-0.5 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
            {t('basedOnCustom', { name: recipe.granules[0] ? getLocalizedName(recipe.granules[0].id, perfumeName) : perfumeName })}
          </p>
        </motion.div>
      </div>

      {/* 2탭 선택 UI */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`flex p-1 rounded-[6px] gap-1 ${saju ? 'bg-[#EDE5D2]' : 'bg-[var(--soft)]'}`}
      >
        <button
          onClick={() => setActiveTab('user')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[6px] text-sm lg:text-base font-medium transition-all ${
            activeTab === 'user'
              ? saju ? 'bg-[#FDFAF1] text-[#7A5C14] shadow-sm' : 'bg-[var(--paper)] text-[var(--muted-ink)] shadow-sm'
              : saju ? 'text-[#5C564A] hover:text-[#1A1610]' : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'
          }`}
        >
          <Target size={14} />
          <span>{t('option1Tab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          disabled={!aiRecommendedRecipe}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[6px] text-sm lg:text-base font-medium transition-all ${
            activeTab === 'ai'
              ? saju ? 'bg-[#FDFAF1] text-[#A93226] shadow-sm' : 'bg-[var(--paper)] text-[var(--muted-ink)] shadow-sm'
              : aiRecommendedRecipe
                ? saju ? 'text-[#5C564A] hover:text-[#1A1610]' : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'
                : saju ? 'text-[var(--muted-ink)]/60 cursor-not-allowed' : 'text-[#5C564A] cursor-not-allowed'
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
          className={`rounded-[6px] p-3 border text-center text-sm lg:text-base ${
            activeTab === 'user'
              ? saju ? 'bg-[#C9A227]/10 border-[#C9A227]/40 text-[#7A5C14]' : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--muted-ink)]'
              : saju ? 'bg-[#2C3E50]/8 border-[#2C3E50]/30 text-[#2C3E50]' : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--muted-ink)]'
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
          <Droplet size={14} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
          <h3 className={`text-sm lg:text-base font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>{t('recipeComposition')}</h3>
        </div>

        {recipe.granules.map((granule, index) => {
          const bgColor = getGranuleColor(granule.id)
          const textColorClass = isLightColor(bgColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'

          return (
          <motion.div
            key={granule.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
            className={`rounded-[6px] p-4 border shadow-sm ${saju ? SJ.card : 'bg-[var(--paper)] border-[var(--line)]'}`}
          >
            <div className="flex items-start gap-4">
              {/* 방울 수 - 엄청 크게! */}
              <div
                className={`w-20 h-20 rounded-[6px] flex flex-col items-center justify-center font-black shadow-lg flex-shrink-0 ${textColorClass} ${isLightColor(bgColor) ? 'border border-[var(--line)]' : ''}`}
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-4xl leading-none">{granule.drops}</span>
                <span className={`text-sm lg:text-base font-bold mt-1 ${isLightColor(bgColor) ? 'opacity-70' : 'opacity-90'}`}>{t('drops')}</span>
              </div>

              {/* 향료 정보 */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-base ${saju ? SJ.ink : 'text-[var(--ink)]'}`}>{getLocalizedName(granule.id, granule.name)}</span>
                  <span className={`text-xs lg:text-sm px-2 py-0.5 rounded-full font-bold ${saju ? SJ.chipGold : 'bg-[var(--soft)] text-[var(--muted-ink)]'}`}>
                    {granule.ratio}%
                  </span>
                </div>
                <p className={`text-xs lg:text-sm font-medium mt-1 ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>{granule.id}</p>
                <p className={`text-sm lg:text-base mt-2 leading-relaxed ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
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
        className={`rounded-[6px] p-3 border ${saju ? 'bg-[#EDE5D2] border-[#C9A227]/40' : 'bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] border-stone-200/50'}`}
      >
        <p className={`text-sm lg:text-base leading-relaxed ${saju ? SJ.ink : 'text-[var(--muted-ink)]'}`}>
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
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${saju ? 'bg-[#EDE5D2]' : 'bg-[var(--soft)]'}`}>
          <Droplet size={12} className={saju ? 'text-[#C9A227]' : 'text-[var(--muted-ink)]'} />
          <span className={`text-xs lg:text-sm font-medium ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
            {t('totalDrops', { count: recipe.totalDrops })}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${strengthStyle.bg}`}>
          <span className={`text-xs lg:text-sm font-medium ${strengthStyle.text}`}>
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
          className={`rounded-[6px] p-4 space-y-3 ${saju ? 'bg-[#EDE5D2] border border-[#D8CFBB]' : 'bg-[var(--soft)]'}`}
        >
          <div className="flex items-center justify-between">
            <h3 className={`text-sm lg:text-base font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>{t('balanceChange')}</h3>
            <div className={`flex items-center gap-3 text-[10px] lg:text-[12px] ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${saju ? 'bg-[#D8CFBB]' : 'bg-[var(--soft)]'}`}></span>
                {t('existing')}
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${saju ? 'bg-[#C9A227]' : 'bg-[var(--soft)]'}`}></span>
                {t('changed')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {recipe.categoryChanges.map((change, index) => {
              const categoryKey = CATEGORY_KEY_MAP[change.category] || CATEGORY_KEY_MAP[change.category.toLowerCase()] || 'citrus'
              const translationKey = `category${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}` as 'categoryCitrus'
              const categoryName = t(translationKey)
              const colors = CATEGORY_COLORS[categoryKey] || { bg: 'bg-[var(--soft)]', bar: 'bg-[var(--soft)]' }
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
                      <span className={`text-xs lg:text-sm font-medium w-16 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{categoryName}</span>
                      {renderChangeIcon(change.change)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] lg:text-[12px] ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>{originalScore}</span>
                      <span className={`text-[10px] lg:text-[12px] ${saju ? SJ.inkFaint : 'text-[var(--muted-ink)]'}`}>→</span>
                      <span className={`text-[10px] lg:text-[12px] font-medium ${saju ? SJ.ink : 'text-[var(--muted-ink)]'}`}>{newScore}</span>
                      {renderScoreChange(originalScore, newScore)}
                    </div>
                  </div>

                  {/* 듀얼 바 차트 */}
                  <div className={`relative h-3 rounded-full overflow-hidden border ${saju ? 'bg-[#FDFAF1] border-[#D8CFBB]' : 'bg-[var(--paper)] border-[var(--line)]'}`}>
                    {/* 기존 점수 (회색 배경) */}
                    <div
                      className={`absolute top-0 left-0 h-full transition-all ${saju ? 'bg-[#D8CFBB]' : 'bg-[var(--soft)]'}`}
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
          <TestTube2 size={14} className={saju ? 'text-[#2C3E50]' : 'text-[var(--muted-ink)]'} />
          <h3 className={`text-sm lg:text-base font-bold ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>{t('testMethod')}</h3>
        </div>

        <div className={`rounded-[6px] p-3 space-y-2 ${saju ? 'bg-[#EDE5D2] border border-[#D8CFBB]' : 'bg-[var(--canvas)]'}`}>
          {[
            recipe.testingInstructions.step1,
            recipe.testingInstructions.step2,
            recipe.testingInstructions.step3,
          ].map((step, index) => (
            <div key={index} className="flex gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold flex-shrink-0 ${
                saju ? 'bg-[#2C3E50]/15 text-[#2C3E50]' : 'bg-[var(--soft)] text-[var(--muted-ink)]'
              }`}>
                {index + 1}
              </span>
              <p className={`text-xs lg:text-sm flex-1 ${saju ? SJ.inkMuted : 'text-[var(--muted-ink)]'}`}>{step}</p>
            </div>
          ))}
        </div>

        {/* 주의사항 */}
        <div className={`flex items-start gap-2 rounded-[6px] p-2.5 border ${saju ? SJ.cardCinnabar : 'bg-[var(--canvas)] border-stone-200/50'}`}>
          <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${saju ? 'text-[#A93226]' : 'text-[var(--muted-ink)]'}`} />
          <p className={`text-[11px] lg:text-[13px] ${saju ? SJ.cinnabarText : 'text-[var(--muted-ink)]'}`}>{recipe.testingInstructions.caution}</p>
        </div>
      </motion.div>

      {/* 팬 메시지 — 사주: 덕담 족자 느낌(금 괘선 + 세리프) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        className={`rounded-[6px] p-4 border ${saju ? 'bg-[#EDE5D2] border-[#C9A227]/40' : 'bg-gradient-to-r from-[var(--soft)] via-[var(--soft)] to-[var(--soft)] border-stone-200/50'}`}
      >
        <p className={`text-sm lg:text-base leading-relaxed text-center font-medium ${saju ? `${SJ.serif} ${SJ.ink}` : 'text-[var(--muted-ink)]'}`}>
          {recipe.fanMessage}
        </p>
      </motion.div>

      {/* 액션 버튼들 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-0"
      >
        {/* 레시피 확정하기 버튼 */}
        <Button
          onClick={() => onConfirmRecipe(recipe, activeTab === 'user' ? 'user_direct' : 'ai_recommended')}
          className={`w-full h-12 rounded-[6px] font-bold shadow-lg flex items-center justify-center gap-2 ${
            saju
              ? activeTab === 'user' ? SJ.ctaCinnabar : SJ.ctaBlueInk
              : activeTab === 'user'
                ? 'text-[var(--ink)] bg-[#F5EFE2] hover:from-[var(--soft)] hover:to-[var(--soft)] shadow-stone-500/30'
                : 'text-[var(--ink)] bg-[#F5EFE2] hover:from-[var(--soft)] hover:to-[var(--soft)] shadow-stone-500/30'
          }`}
        >
          <Check size={18} />
          {activeTab === 'user' ? t('confirmOption1') : t('confirmOption2')}
        </Button>

        {/* 다시 피드백 기록하기 버튼 */}
        <Button
          onClick={onRetryFeedback}
          variant="outline"
          className={`w-full h-11 border-2 rounded-[6px] font-medium flex items-center justify-center gap-2 ${
            saju
              ? 'border-[#2C3E50]/40 text-[#2C3E50] bg-transparent hover:bg-[#2C3E50]/5'
              : 'border-[var(--line)] text-[var(--muted-ink)] hover:bg-[var(--canvas)]'
          }`}
        >
          <RotateCcw size={16} />
          {t('retryFeedback')}
        </Button>

        {/* 완료하고 돌아가기 */}
        <button
          onClick={onClose}
          className={`w-full text-center text-sm lg:text-base py-2 transition-colors ${
            saju ? 'text-[var(--muted-ink)] hover:text-[#5C564A]' : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'
          }`}
        >
          {t('later')}
        </button>
      </motion.div>
    </motion.div>
  )
}
