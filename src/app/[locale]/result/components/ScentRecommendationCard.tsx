"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  ScentRecommendation,
  BestSeasonType,
  BestTimeType
} from '@/types/analysis'

// Icon-only maps (labels come from translations)
const SEASON_ICONS: Record<BestSeasonType, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️'
}

const TIME_ICONS: Record<BestTimeType, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙'
}

interface ScentRecommendationCardProps {
  recommendation?: ScentRecommendation
  isDesktop?: boolean
}

export function ScentRecommendationCard({
  recommendation,
  isDesktop = false
}: ScentRecommendationCardProps) {
  const t = useTranslations('perfume')
  const tLabels = useTranslations('labels')
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
        className="bg-gradient-to-r from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 border border-[#D8CFBB]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🌿</span>
          <h5 className="text-sm lg:text-base font-bold text-[#1A1610]">{t('recommendedSeason')}</h5>
        </div>
        <div className="flex justify-between gap-2">
          {seasons.map((season) => {
            const icon = SEASON_ICONS[season]
            const isActive = season === best_season
            return (
              <div
                key={season}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-[12px] transition-all ${
                  isActive
                    ? 'bg-[#EFE4C8] text-[#1A1610] border border-[#C9BFA8] shadow-md'
                    : 'bg-[#EDE5D2] text-[#8B8578] border border-[#D8CFBB]'
                }`}
              >
                <span className={`text-lg ${!isActive && 'grayscale opacity-50'}`}>{icon}</span>
                <span className={`text-sm lg:text-sm mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{tLabels(`seasons.${season}`)}</span>
              </div>
            )
          })}
        </div>
        {season_reason && (
          <p className="text-sm lg:text-sm text-[#5C564A] mt-3 italic leading-relaxed bg-[#EDE5D2]/50 rounded-[12px] p-2">
            {season_reason}
          </p>
        )}
      </motion.div>

      {/* 추천 시간대 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 border border-[#D8CFBB]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🕰️</span>
          <h5 className="text-sm lg:text-base font-bold text-[#1A1610]">{t('recommendedTime')}</h5>
        </div>
        <div className="flex justify-between gap-2">
          {times.map((time) => {
            const icon = TIME_ICONS[time]
            const isActive = time === best_time
            return (
              <div
                key={time}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-[12px] transition-all ${
                  isActive
                    ? 'bg-[#EFE4C8] text-[#1A1610] border border-[#C9BFA8] shadow-md'
                    : 'bg-[#EDE5D2] text-[#8B8578] border border-[#D8CFBB]'
                }`}
              >
                <span className={`text-lg ${!isActive && 'grayscale opacity-50'}`}>{icon}</span>
                <span className={`text-sm lg:text-sm mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{tLabels(`times.${time}`)}</span>
              </div>
            )
          })}
        </div>
        {time_reason && (
          <p className="text-sm lg:text-sm text-[#5C564A] mt-3 italic leading-relaxed bg-[#EDE5D2]/50 rounded-[12px] p-2">
            {time_reason}
          </p>
        )}
      </motion.div>
    </div>
  )
}
