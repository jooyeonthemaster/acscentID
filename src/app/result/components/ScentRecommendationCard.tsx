"use client"

import React from 'react'
import { motion } from 'framer-motion'
import {
  ScentRecommendation,
  BEST_SEASON_LABELS,
  BEST_TIME_LABELS,
  BestSeasonType,
  BestTimeType
} from '@/types/analysis'

interface ScentRecommendationCardProps {
  recommendation?: ScentRecommendation
  isDesktop?: boolean
}

export function ScentRecommendationCard({
  recommendation,
  isDesktop = false
}: ScentRecommendationCardProps) {
  if (!recommendation) return null

  const { best_season, best_time, season_reason, time_reason } = recommendation

  const seasons: BestSeasonType[] = ['spring', 'summer', 'autumn', 'winter']
  const times: BestTimeType[] = ['morning', 'afternoon', 'evening', 'night']

  return (
    <div className={`grid grid-cols-1 gap-3 ${isDesktop ? 'mt-4' : 'mt-3'}`}>
      {/* 추천 계절 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🌿</span>
          <h5 className="text-sm font-black text-emerald-800">추천 계절</h5>
        </div>
        <div className="flex justify-between gap-2">
          {seasons.map((season) => {
            const { label, icon } = BEST_SEASON_LABELS[season]
            const isActive = season === best_season
            return (
              <div
                key={season}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-400 text-white border-2 border-emerald-600 shadow-md'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}
              >
                <span className={`text-lg ${!isActive && 'grayscale opacity-50'}`}>{icon}</span>
                <span className={`text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </div>
            )
          })}
        </div>
        {season_reason && (
          <p className="text-xs text-emerald-700 mt-3 italic leading-relaxed bg-emerald-100/50 rounded-lg p-2">
            {season_reason}
          </p>
        )}
      </motion.div>

      {/* 추천 시간대 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🕰️</span>
          <h5 className="text-sm font-black text-blue-800">추천 시간대</h5>
        </div>
        <div className="flex justify-between gap-2">
          {times.map((time) => {
            const { label, icon } = BEST_TIME_LABELS[time]
            const isActive = time === best_time
            return (
              <div
                key={time}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-400 text-white border-2 border-blue-600 shadow-md'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}
              >
                <span className={`text-lg ${!isActive && 'grayscale opacity-50'}`}>{icon}</span>
                <span className={`text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </div>
            )
          })}
        </div>
        {time_reason && (
          <p className="text-xs text-blue-700 mt-3 italic leading-relaxed bg-blue-100/50 rounded-lg p-2">
            {time_reason}
          </p>
        )}
      </motion.div>
    </div>
  )
}
