"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { FlaskConical } from 'lucide-react'
import { PerfumePersona, CATEGORY_INFO } from '@/types/analysis'
import { Progress } from '@/components/ui/progress'

interface PerfumeProfileProps {
  persona?: PerfumePersona
}

export function PerfumeProfile({ persona }: PerfumeProfileProps) {
  if (!persona?.categories) return null

  // 메인 카테고리 찾기
  const sortedCategories = Object.entries(persona.categories)
    .sort(([, a], [, b]) => b - a)
  const mainCategory = sortedCategories[0]

  // 카테고리 컬러 매핑 (Tailwind 친화적)
  const categoryColors: Record<string, { bar: string; bg: string }> = {
    citrus: { bar: 'bg-yellow-400', bg: 'bg-yellow-50' },
    floral: { bar: 'bg-pink-400', bg: 'bg-pink-50' },
    woody: { bar: 'bg-amber-600', bg: 'bg-amber-50' },
    musky: { bar: 'bg-purple-400', bg: 'bg-purple-50' },
    fruity: { bar: 'bg-red-400', bg: 'bg-red-50' },
    spicy: { bar: 'bg-orange-500', bg: 'bg-orange-50' }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-yellow-400 flex items-center justify-center text-white">
          <FlaskConical size={14} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">향수 프로필</h3>
          <p className="text-[10px] text-slate-400">향 카테고리 분석</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 p-4">
        {/* 카테고리 바 차트 */}
        <div className="space-y-3">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || {
              icon: '⚪',
              name: category
            }
            const colors = categoryColors[category] || { bar: 'bg-slate-400', bg: 'bg-slate-50' }
            const percent = Math.min(Math.round((value as number) * 10), 100)

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-20 flex items-center gap-1.5">
                  <span className="text-sm">{info.icon}</span>
                  <span className="text-xs font-medium text-slate-600">{info.name}</span>
                </div>
                <div className="flex-grow h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.05 }}
                    className={`h-full ${colors.bar} rounded-full`}
                  />
                </div>
                <span className="flex-shrink-0 w-6 text-right text-xs font-bold text-slate-500">
                  {value}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* 메인 카테고리 하이라이트 */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">메인 계열</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-sm font-bold text-slate-800">
                {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
