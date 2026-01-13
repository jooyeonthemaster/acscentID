"use client"

import React from 'react'
import { motion } from 'framer-motion'
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
            <h3 className="text-sm font-bold text-slate-900">향수 프로필</h3>
            <p className="text-[10px] text-slate-400">향 카테고리 분석</p>
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
                        {info.name}
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
                <span className="text-xs font-bold text-slate-500">메인 계열</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-1.5 rounded-full border-2 border-slate-900">
                <span className="text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
                <span className="text-sm font-black text-slate-800">
                  {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // 모바일 레이아웃 - 375px 최적화
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-md bg-purple-400 border border-slate-900 flex items-center justify-center">
          <FlaskConical size={10} className="text-white" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">향수 프로필</h3>
          <p className="text-[9px] text-slate-400">향 카테고리 분석</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
        {/* 모바일: 컴팩트 프로그레스 바 */}
        <div className="space-y-1.5">
          {sortedCategories.map(([category, value], index) => {
            const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
            const colors = categoryColors[category] || {
              bar: 'bg-slate-400',
              bg: 'bg-slate-50',
              border: 'border-slate-300',
              text: 'text-slate-700'
            }
            const isMain = index === 0
            const percent = (value as number) * 10

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`relative ${colors.bg} rounded-lg p-2 ${isMain ? 'ring-1 ring-yellow-400' : ''}`}
              >
                {/* 메인 배지 */}
                {isMain && (
                  <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
                )}

                {/* 상단: 아이콘 + 이름 + 수치 */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{info.icon}</span>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{info.name}</span>
                  </div>
                  <span className={`text-[10px] font-black ${colors.text}`}>{value as number}/10</span>
                </div>

                {/* 프로그레스 바 */}
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ delay: 0.3 + index * 0.08, duration: 0.5 }}
                    className={`h-full ${colors.bar} rounded-full`}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 메인 카테고리 요약 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-2 pt-2 border-t border-dashed border-slate-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-medium">메인 계열</span>
            <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-amber-50 px-2 py-0.5 rounded-full border border-yellow-300">
              <span className="text-xs">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
              <span className="text-[10px] font-black text-amber-700">
                {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
