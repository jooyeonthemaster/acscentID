"use client"

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { FlaskConical, Sparkles } from 'lucide-react'
import { PerfumePersona, CATEGORY_INFO } from '@/types/analysis'

interface PerfumeProfileProps {
  persona?: PerfumePersona
  isDesktop?: boolean
}

// 카테고리 컬러 매핑
const categoryColors: Record<string, { bar: string; bg: string; border: string; text: string }> = {
  citrus: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  floral: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  woody: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  musky: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  fruity: { bar: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  spicy: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' }
}

export function PerfumeProfile({ persona, isDesktop = false }: PerfumeProfileProps) {
  const t = useTranslations('perfume')
  const tLabels = useTranslations('labels')
  if (!persona?.categories) return null

  const sortedCategories = Object.entries(persona.categories)
    .sort(([, a], [, b]) => b - a)
  const mainCategory = sortedCategories[0]

  // PC 레이아웃
  if (isDesktop) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
            <FlaskConical size={12} className="text-[var(--ink)]" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[var(--ink)]">{t('profileTitle')}</h3>
            <p className="text-[12px] lg:text-[12px] text-[var(--muted-ink)]">{t('profileSubtitle')}</p>
          </div>
        </div>

        <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4">
          <div className="space-y-2.5">
            {sortedCategories.map(([category, value], index) => {
              const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
              const colors = categoryColors[category] || {
                bar: 'bg-[var(--soft)]',
                bg: 'bg-[var(--soft)]',
                border: 'border-[var(--line)]',
                text: 'text-[var(--muted-ink)]'
              }
              const isMain = index === 0

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
                  className={`relative rounded-[6px] p-2.5 ${colors.bg} border ${colors.border} ${
                    isMain ? 'ring-2 ring-offset-1 ring-[var(--line)]' : ''
                  }`}
                >
                  {isMain && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--soft)] rounded-full border border-[var(--line)] flex items-center justify-center text-sm lg:text-sm">
                      👑
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      <span className="text-lg">{info.icon}</span>
                      <span className={`text-sm lg:text-sm font-bold ${colors.text}`}>
                        {tLabels(`categories.${category}`)}
                      </span>
                    </div>

                    <div className="flex-grow flex items-center gap-1">
                      {[...Array(10)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: i < (value as number) ? 1 : 0.4 }}
                          transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 300 }}
                          className={`w-2.5 h-2.5 rounded-full border ${
                            i < (value as number)
                              ? `${colors.bar} border-[var(--line)]`
                              : 'bg-[var(--line)] border-[var(--line)]'
                          }`}
                        />
                      ))}
                    </div>

                    <div className={`flex-shrink-0 w-7 h-7 rounded-[6px] ${colors.bar} border border-[var(--line)] flex items-center justify-center`}>
                      <span className="text-sm lg:text-sm font-bold text-[var(--ink)]">
                        {value as number}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4 pt-3 border-t-2 border-dashed border-[var(--line)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--muted-ink)]" />
                <span className="text-sm lg:text-sm font-bold text-[var(--muted-ink)]">{t('mainCategory')}</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] px-3 py-1.5 rounded-full border border-[var(--line)]">
                <span className="text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
                <span className="text-sm lg:text-base font-bold text-[var(--ink)]">
                  {tLabels(`categories.${mainCategory[0]}`)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // 모바일 레이아웃 - 375px 최적화 (PC와 동일한 스타일)
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
          <FlaskConical size={10} className="text-[var(--ink)]" />
        </div>
        <div>
          <h3 className="text-sm lg:text-sm font-bold text-[var(--ink)]">{t('profileTitle')}</h3>
          <p className="text-[11px] text-[var(--muted-ink)]">{t('profileSubtitle')}</p>
        </div>
      </div>

      <div>
        {/* 모바일: 행별 박스를 걷어내고 얇은 구분선으로 대체 — 점 게이지 폭 확보 */}
        <div className="divide-y divide-[var(--line)]">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
            const colors = categoryColors[category] || {
              bar: 'bg-[var(--soft)]',
              bg: 'bg-[var(--soft)]',
              border: 'border-[var(--line)]',
              text: 'text-[var(--muted-ink)]'
            }
            const isMain = index === 0

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
                className="relative py-1.5"
              >
                <div className="flex items-center gap-2">
                  {/* 아이콘 + 이름 */}
                  <div className="flex items-center gap-1 min-w-[56px]">
                    <span className="text-sm lg:text-base">{info.icon}</span>
                    <span className={`text-[12px] lg:text-[12px] font-medium ${isMain ? 'text-[var(--ink)]' : colors.text}`}>{tLabels(`categories.${category}`)}</span>
                  </div>
                  {/* 왕관 슬롯 — 전 행 동일 폭이라 점 게이지 시작선이 어긋나지 않는다 */}
                  <span className="w-3 shrink-0 text-[11px] leading-none">{isMain ? '👑' : ''}</span>

                  {/* 동그라미 점 10개 */}
                  <div className="flex-grow flex items-center gap-[3px]">
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: i < (value as number) ? 1 : 0.4 }}
                        transition={{ delay: 0.3 + i * 0.04, type: "spring", stiffness: 300 }}
                        className={`w-2 h-2 rounded-full border ${
                          i < (value as number)
                            ? `${colors.bar} border-[var(--line)]`
                            : 'bg-[var(--line)] border-[var(--line)]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 숫자 박스 */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-[6px] ${colors.bar} border border-[var(--line)] flex items-center justify-center`}>
                    <span className="text-[12px] lg:text-[12px] font-medium text-[var(--ink)]">
                      {value as number}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 메인 카테고리 요약 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-3 pt-2 border-t-2 border-dashed border-[var(--line)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Sparkles size={12} className="text-[var(--muted-ink)]" />
              <span className="text-[12px] lg:text-[12px] font-medium text-[var(--muted-ink)]">{t('mainCategory')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] px-2.5 py-1 rounded-full border border-[var(--line)]">
              <span className="text-sm lg:text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-sm lg:text-sm font-bold text-[var(--ink)]">
                {tLabels(`categories.${mainCategory[0]}`)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
