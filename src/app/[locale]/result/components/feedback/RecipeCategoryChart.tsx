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
  citrus: { bg: 'bg-yellow-100', bar: 'bg-yellow-400' },
  floral: { bg: 'bg-pink-100', bar: 'bg-pink-400' },
  woody: { bg: 'bg-amber-100', bar: 'bg-amber-600' },
  musky: { bg: 'bg-purple-100', bar: 'bg-purple-400' },
  fruity: { bg: 'bg-red-100', bar: 'bg-red-400' },
  spicy: { bg: 'bg-orange-100', bar: 'bg-orange-500' },
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
    if (change === 'increased') return <TrendingUp size={12} className="text-green-600" />
    if (change === 'decreased') return <TrendingDown size={12} className="text-red-500" />
    return <Minus size={12} className="text-slate-400" />
  }

  const renderScoreChange = (original: number, newScore: number) => {
    const diff = Math.round((newScore - original) * 10) / 10
    if (diff === 0) return <span className="text-slate-400 text-[10px]">±0</span>
    if (diff > 0) return <span className="text-green-600 text-[10px] font-medium">+{diff.toFixed(1)}</span>
    return <span className="text-red-500 text-[10px] font-medium">{diff.toFixed(1)}</span>
  }

  return (
    <div className={`bg-slate-50 rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3 border border-slate-200`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700">{displayTitle}</h4>
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
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

      <div className="space-y-2">
        {categoryChanges.map((change, index) => {
          const categoryKey = CATEGORY_KEY_MAP[change.category] || CATEGORY_KEY_MAP[change.category.toLowerCase()] || 'citrus'
          const categoryName = tLabels(`categories.${categoryKey}`)
          const colors = CATEGORY_COLORS[categoryKey] || { bg: 'bg-slate-100', bar: 'bg-slate-400' }
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
                  <span className="text-[11px] font-medium text-slate-700 w-12">{categoryName}</span>
                  {renderChangeIcon(change.change)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400">{originalScore.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-400">→</span>
                  <span className="text-[9px] font-medium text-slate-700">{newScore.toFixed(1)}</span>
                  {renderScoreChange(originalScore, newScore)}
                </div>
              </div>

              {/* 듀얼 바 차트 (0~10 스케일을 100%로 변환) */}
              <div className="relative h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                <div
                  className="absolute top-0 left-0 h-full bg-slate-200 transition-all"
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
        <TestTube2 size={13} className="text-purple-500" />
        <h4 className="text-xs font-bold text-slate-700">{t('testMethod')}</h4>
      </div>

      <div className="bg-purple-50 rounded-xl p-3 space-y-2 border border-purple-100">
        {[instructions.step1, instructions.step2, instructions.step3].map((step, index) =>
          step ? (
            <div key={index} className="flex gap-2">
              <span className="w-5 h-5 bg-purple-200 rounded-full flex items-center justify-center text-[10px] font-black text-purple-700 flex-shrink-0">
                {index + 1}
              </span>
              <p className="text-[11px] text-slate-700 flex-1 leading-relaxed">{step}</p>
            </div>
          ) : null
        )}
      </div>

      {instructions.caution && (
        <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-200">
          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 leading-relaxed">{instructions.caution}</p>
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
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider flex-shrink-0">
            {displayLabel}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-black text-slate-900 truncate">{perfumeName}</span>
            <span className="text-[9px] text-slate-500 flex-shrink-0">{perfumeId}</span>
          </div>
        </div>
        {typeof retentionPercentage === 'number' && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <span className="text-[9px] text-amber-700 font-bold">{t('prefMaintain')}</span>
            <span className="text-sm font-black text-amber-700">{retentionPercentage}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
