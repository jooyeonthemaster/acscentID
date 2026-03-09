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
  citrus: { bar: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
  floral: { bar: 'bg-pink-400', bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  woody: { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  musky: { bar: 'bg-purple-400', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  fruity: { bar: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  spicy: { bar: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' }
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
          <div className="w-6 h-6 rounded-lg bg-purple-400 border-2 border-slate-900 flex items-center justify-center">
            <FlaskConical size={12} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('profileTitle')}</h3>
            <p className="text-[10px] text-slate-400">{t('profileSubtitle')}</p>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#000]">
          <div className="space-y-2.5">
            {sortedCategories.map(([category, value], index) => {
              const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
              const colors = categoryColors[category] || {
                bar: 'bg-slate-400',
                bg: 'bg-slate-50',
                border: 'border-slate-300',
                text: 'text-slate-700'
              }
              const isMain = index === 0

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
                  className={`relative rounded-xl p-2.5 ${colors.bg} border-2 ${colors.border} ${
                    isMain ? 'ring-2 ring-offset-1 ring-yellow-400' : ''
                  }`}
                >
                  {isMain && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs">
                      👑
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      <span className="text-lg">{info.icon}</span>
                      <span className={`text-xs font-bold ${colors.text}`}>
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
                              ? `${colors.bar} border-slate-900`
                              : 'bg-slate-200 border-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${colors.bar} border-2 border-slate-900 flex items-center justify-center`}>
                      <span className="text-xs font-black text-white">
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
            className="mt-4 pt-3 border-t-2 border-dashed border-slate-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-slate-500">{t('mainCategory')}</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-1.5 rounded-full border-2 border-slate-900">
                <span className="text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
                <span className="text-sm font-black text-slate-800">
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
        <div className="w-5 h-5 rounded-md bg-purple-400 border-2 border-slate-900 flex items-center justify-center">
          <FlaskConical size={10} className="text-white" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">{t('profileTitle')}</h3>
          <p className="text-[9px] text-slate-400">{t('profileSubtitle')}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[2px_2px_0px_#000]">
        {/* 모바일: PC와 동일한 동그라미 점 스타일 */}
        <div className="space-y-2">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
            const colors = categoryColors[category] || {
              bar: 'bg-slate-400',
              bg: 'bg-slate-50',
              border: 'border-slate-300',
              text: 'text-slate-700'
            }
            const isMain = index === 0

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
                className={`relative rounded-lg p-2 ${colors.bg} border ${colors.border} ${
                  isMain ? 'ring-2 ring-offset-1 ring-yellow-400 border-2' : ''
                }`}
              >
                {/* 메인 배지 */}
                {isMain && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px]">
                    👑
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* 아이콘 + 이름 */}
                  <div className="flex items-center gap-1 min-w-[56px]">
                    <span className="text-sm">{info.icon}</span>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{tLabels(`categories.${category}`)}</span>
                  </div>

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
                            ? `${colors.bar} border-slate-900`
                            : 'bg-slate-200 border-slate-300'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 숫자 박스 */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-md ${colors.bar} border-2 border-slate-900 flex items-center justify-center`}>
                    <span className="text-[10px] font-black text-white">
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
          className="mt-3 pt-2 border-t-2 border-dashed border-slate-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Sparkles size={12} className="text-yellow-500" />
              <span className="text-[10px] font-bold text-slate-500">{t('mainCategory')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 px-2.5 py-1 rounded-full border-2 border-slate-900">
              <span className="text-sm">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-xs font-black text-slate-800">
                {tLabels(`categories.${mainCategory[0]}`)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
