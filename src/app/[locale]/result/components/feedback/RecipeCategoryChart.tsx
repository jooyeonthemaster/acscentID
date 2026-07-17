'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, TestTube2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CategoryChange, GeneratedRecipe } from '@/types/feedback'

// Maps saved category values to stable category keys.
const CATEGORY_KEY_MAP: Record<string, string> = {
  citrus: 'citrus', floral: 'floral', woody: 'woody',
  musky: 'musky', fruity: 'fruity', spicy: 'spicy',
  '\uC2DC\uD2B8\uB7EC\uC2A4': 'citrus',
  '\uD50C\uB85C\uB7F4': 'floral',
  '\uC6B0\uB514': 'woody',
  '\uBA38\uC2A4\uD06C': 'musky',
  '\uD504\uB8E8\uD2F0': 'fruity',
  '\uC2A4\uD30C\uC774\uC2DC': 'spicy',
}

const CATEGORY_COLORS: Record<string, { bg: string; bar: string }> = {
  citrus: { bg: 'bg-[#151823]', bar: 'bg-[#161925]' },
  floral: { bg: 'bg-[#151823]', bar: 'bg-[#161925]' },
  woody: { bg: 'bg-[#151823]', bar: 'bg-[#161925]' },
  musky: { bg: 'bg-[#151823]', bar: 'bg-[#161925]' },
  fruity: { bg: 'bg-red-100', bar: 'bg-red-400' },
  spicy: { bg: 'bg-[#151823]', bar: 'bg-[#161925]' },
}

// ─── 카테고리 변화 차트 ────────────────────────────────────────────
interface CategoryChangeChartProps {
  categoryChanges: CategoryChange[]
  title?: string
  compact?: boolean
}

export function CategoryChangeChart({
  categoryChanges,
  title,
  compact = false,
}: CategoryChangeChartProps) {
  const t = useTranslations('feedback')
  const tLabels = useTranslations('labels')
  if (!categoryChanges || categoryChanges.length === 0) return null
  const displayTitle = title ?? t('balanceChange')

  const renderChangeIcon = (change: CategoryChange['change']) => {
    if (change === 'increased') return <TrendingUp size={12} className="text-[#A69F8D]" />
    if (change === 'decreased') return <TrendingDown size={12} className="text-red-500" />
    return <Minus size={12} className="text-[#8B8578]" />
  }

  const renderScoreChange = (original: number, newScore: number) => {
    const diff = Math.round((newScore - original) * 10) / 10
    if (diff === 0) return <span className="text-[#8B8578] text-[10px] lg:text-[12px]">±0</span>
    if (diff > 0) return <span className="text-[#A69F8D] text-[10px] lg:text-[12px] font-medium">+{diff.toFixed(1)}</span>
    return <span className="text-red-500 text-[10px] lg:text-[12px] font-medium">{diff.toFixed(1)}</span>
  }

  return (
    <div className={`bg-[#151823] rounded-[12px] ${compact ? 'p-3' : 'p-4'} space-y-3 border border-[#262A38]`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs lg:text-sm font-bold text-[#A69F8D]">{displayTitle}</h4>
        <div className="flex items-center gap-2 text-[9px] text-[#8B8578]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#232838]"></span>
            {t('existing')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#161925]"></span>
            {t('changed')}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {categoryChanges.map((change, index) => {
          const categoryKey = CATEGORY_KEY_MAP[change.category] || CATEGORY_KEY_MAP[change.category.toLowerCase()] || 'citrus'
          const categoryName = tLabels(`categories.${categoryKey}`)
          const colors = CATEGORY_COLORS[categoryKey] || { bg: 'bg-[#1B1F2C]', bar: 'bg-[#161925]' }
          const originalScore = Math.round(Math.max(0, Math.min(10, change.originalScore || 0)) * 10) / 10
          const newScore = Math.round(Math.max(0, Math.min(10, change.newScore || 0)) * 10) / 10
          // 0~10 스케일을 바 너비(%)로 변환
          const originalWidth = originalScore * 10
          const newWidth = newScore * 10

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] lg:text-[13px] font-medium text-[#A69F8D] w-12">{categoryName}</span>
                  {renderChangeIcon(change.change)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[#8B8578]">{originalScore.toFixed(1)}</span>
                  <span className="text-[9px] text-[#8B8578]">→</span>
                  <span className="text-[9px] font-medium text-[#A69F8D]">{newScore.toFixed(1)}</span>
                  {renderScoreChange(originalScore, newScore)}
                </div>
              </div>

              {/* 듀얼 바 차트 (0~10 스케일을 100%로 변환) */}
              <div className="relative h-2.5 bg-[#12141D] rounded-full overflow-hidden border border-[#262A38]">
                <div
                  className="absolute top-0 left-0 h-full bg-[#232838] transition-all"
                  style={{ width: `${originalWidth}%` }}
                />
                <div
                  className={`absolute top-0 left-0 h-full ${colors.bar} transition-all`}
                  style={{ width: `${newWidth}%`, opacity: 0.9 }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 테스팅 방법 가이드 ────────────────────────────────────────────
interface TestingInstructionsBoxProps {
  instructions: GeneratedRecipe['testingInstructions']
  compact?: boolean
}

export function TestingInstructionsBox({
  instructions,
  compact = false,
}: TestingInstructionsBoxProps) {
  const t = useTranslations('feedback')
  if (!instructions) return null

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center gap-2">
        <TestTube2 size={13} className="text-[#8B8578]" />
        <h4 className="text-xs lg:text-sm font-bold text-[#A69F8D]">{t('testMethod')}</h4>
      </div>

      <div className="bg-[#0C0E16] rounded-[12px] p-3 space-y-2 border border-[#151823]">
        {[instructions.step1, instructions.step2, instructions.step3].map((step, index) =>
          step ? (
            <div key={index} className="flex gap-2">
              <span className="w-5 h-5 bg-[#232838] rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-black text-[#A69F8D] flex-shrink-0">
                {index + 1}
              </span>
              <p className="text-[11px] lg:text-[13px] text-[#A69F8D] flex-1 leading-relaxed">{step}</p>
            </div>
          ) : null
        )}
      </div>

      {instructions.caution && (
        <div className="flex items-start gap-2 bg-[#0C0E16] rounded-[12px] p-2.5 border border-[#262A38]">
          <AlertTriangle size={12} className="text-[#8B8578] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] lg:text-[12px] text-[#A69F8D] leading-relaxed">{instructions.caution}</p>
        </div>
      )}
    </div>
  )
}

// ─── 원본 향 표시 카드 ──────────────────────────────────────────────
interface OriginalPerfumeCardProps {
  perfumeId: string
  perfumeName: string
  retentionPercentage?: number
  label?: string
}

export function OriginalPerfumeCard({
  perfumeId,
  perfumeName,
  retentionPercentage,
  label,
}: OriginalPerfumeCardProps) {
  const t = useTranslations('feedback')
  const displayLabel = label ?? t('existing')
  return (
    <div className="bg-gradient-to-r from-[#0C0E16] to-[#0C0E16] border-2 border-[#262A38] rounded-[12px] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[9px] font-black text-[#A69F8D] uppercase tracking-wider flex-shrink-0">
            {displayLabel}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs lg:text-sm font-black text-[#E9E2D0] truncate">{perfumeName}</span>
            <span className="text-[9px] text-[#8B8578] flex-shrink-0">{perfumeId}</span>
          </div>
        </div>
        {typeof retentionPercentage === 'number' && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <span className="text-[9px] text-[#A69F8D] font-bold">{t('prefMaintain')}</span>
            <span className="text-sm lg:text-base font-black text-[#A69F8D]">{retentionPercentage}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
