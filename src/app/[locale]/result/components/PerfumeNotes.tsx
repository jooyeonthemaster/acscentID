"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Droplets, Sparkles, Heart, Moon } from 'lucide-react'
import { PerfumePersona } from '@/types/analysis'

interface PerfumeNotesProps {
  persona?: PerfumePersona
  isDesktop?: boolean
}

export function PerfumeNotes({ persona, isDesktop = false }: PerfumeNotesProps) {
  const t = useTranslations('perfume')
  // PC 레이아웃
  if (isDesktop) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-[12px] bg-[#EFE4C8] border border-[#D8CFBB] flex items-center justify-center">
            <Droplets size={12} className="text-[#1A1610]" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[#1A1610]">{t('noteTitle')}</h3>
            <p className="text-[12px] lg:text-[12px] text-[#8B8578]">{t('noteSubtitle')}</p>
          </div>
        </div>

        <div className="bg-[#F5EFE2] border border-[#D8CFBB] rounded-[12px] px-4 py-3">
          <div className="space-y-3">
            {/* 탑노트 - PC */}
            <DesktopNoteCard
              type="TOP"
              icon={<Sparkles size={14} className="text-[#1A1610]" />}
              name={persona?.mainScent?.name || t('defaultTopNote')}
              description={persona?.mainScent?.fanComment || t('defaultTopDesc')}
              time={t('topTime')}
              gradient="from-[#EDE5D2] via-[#FDFAF1] to-[#EDE5D2]"
              iconBg="from-[#EFE4C8] to-[#EFE4C8]"
              borderColor="border-[#D8CFBB]"
              textColor="text-[#5C564A]"
              labelColor="text-[#5C564A]"
            />

            {/* 미들노트 - PC */}
            <DesktopNoteCard
              type="HEART"
              icon={<Heart size={14} className="text-[#1A1610] fill-[#1A1610]" />}
              name={persona?.subScent1?.name || t('defaultMiddleNote')}
              description={persona?.subScent1?.fanComment || t('defaultMiddleDesc')}
              time={t('middleTime')}
              gradient="from-[#EDE5D2] via-[#FDFAF1] to-[#EDE5D2]"
              iconBg="from-[#EFE4C8] to-[#EFE4C8]"
              borderColor="border-[#D8CFBB]"
              textColor="text-[#5C564A]"
              labelColor="text-[#5C564A]"
            />

            {/* 베이스노트 - PC */}
            <DesktopNoteCard
              type="BASE"
              icon={<Moon size={14} className="text-[#B5A582]" />}
              name={persona?.subScent2?.name || t('defaultBaseNote')}
              description={persona?.subScent2?.fanComment || t('defaultBaseDesc')}
              time={t('baseTime')}
              gradient="from-[#EFE4C8] via-[#EFE4C8] to-[#EFE4C8]"
              iconBg="from-[#EFE4C8] to-[#EFE4C8]"
              borderColor="border-[#C9BFA8]"
              textColor="text-[#B5A582]"
              labelColor="text-[#8B8578]"
              isDark
            />
          </div>
        </div>
      </div>
    )
  }

  // 모바일 레이아웃 - 375px 최적화
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-[12px] bg-[#EFE4C8] border border-[#D8CFBB] flex items-center justify-center">
          <Droplets size={10} className="text-[#1A1610]" />
        </div>
        <div>
          <h3 className="text-sm lg:text-sm font-bold text-[#1A1610]">{t('noteTitle')}</h3>
          <p className="text-[11px] text-[#8B8578]">{t('noteSubtitle')}</p>
        </div>
      </div>

      <div>
        <div className="space-y-2">
          {/* 탑노트 - 모바일 */}
          <MobileNoteCard
            type="TOP"
            name={persona?.mainScent?.name || t('defaultTopNote')}
            description={persona?.mainScent?.fanComment || t('defaultTopDesc')}
            time={t('topTime')}
            bgColor="bg-gradient-to-r from-[#FDFAF1] to-[#FDFAF1]"
            accentColor="bg-[#EFE4C8]"
            textColor="text-[#1A1610]"
            timeColor="text-[#5C564A]"
          />

          {/* 미들노트 - 모바일 */}
          <MobileNoteCard
            type="HEART"
            name={persona?.subScent1?.name || t('defaultMiddleNote')}
            description={persona?.subScent1?.fanComment || t('defaultMiddleDesc')}
            time={t('middleTime')}
            bgColor="bg-gradient-to-r from-[#FDFAF1] to-[#FDFAF1]"
            accentColor="bg-[#EFE4C8]"
            textColor="text-[#1A1610]"
            timeColor="text-[#5C564A]"
          />

          {/* 베이스노트 - 모바일 */}
          <MobileNoteCard
            type="BASE"
            name={persona?.subScent2?.name || t('defaultBaseNote')}
            description={persona?.subScent2?.fanComment || t('defaultBaseDesc')}
            time={t('baseTime')}
            bgColor="bg-gradient-to-r from-[#EDE5D2] to-[#D8CFBB]"
            accentColor="bg-[#EFE4C8]"
            textColor="text-[#5C564A]"
            timeColor="text-[#8B8578]"
          />
        </div>
      </div>
    </div>
  )
}

// 모바일 노트 카드 - 단순화된 구조
function MobileNoteCard({
  type,
  name,
  description,
  time,
  bgColor,
  accentColor,
  textColor,
  timeColor
}: {
  type: string
  name: string
  description: string
  time: string
  bgColor: string
  accentColor: string
  textColor: string
  timeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${bgColor} rounded-[12px] p-2.5 overflow-hidden`}
    >
      {/* 좌측 액센트 바 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className="pl-2">
        {/* 상단: 타입 + 이름 + 시간 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium ${timeColor} tracking-wider`}>{type}</span>
            <span className={`text-[12px] lg:text-[12px] ${timeColor}`}>•</span>
            <span className={`text-sm lg:text-sm font-bold ${textColor}`}>{name}</span>
          </div>
          <span className={`text-[11px] font-medium ${timeColor}`}>{time}</span>
        </div>

        {/* 설명 */}
        <p className={`text-[13px] lg:text-[13px] leading-relaxed ${textColor} opacity-80`}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}

// PC 노트 카드 - 풍부한 비주얼
function DesktopNoteCard({
  type,
  icon,
  name,
  description,
  time,
  gradient,
  iconBg,
  borderColor,
  textColor,
  labelColor,
  isDark = false
}: {
  type: string
  icon: React.ReactNode
  name: string
  description: string
  time: string
  gradient: string
  iconBg: string
  borderColor: string
  textColor: string
  labelColor: string
  isDark?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden"
    >
      <div className={`relative bg-gradient-to-r ${gradient} rounded-[12px] p-3.5 border ${borderColor}`}>
        {/* 컨텐츠 */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 bg-gradient-to-br ${iconBg} rounded-[12px] border border-stone-900/20 flex items-center justify-center shadow-sm`}>
                {icon}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[12px] lg:text-[12px] font-medium ${labelColor} tracking-wider`}>{type}</span>
                <span className={isDark ? 'text-[#8B8578]' : `${labelColor} opacity-50`}>|</span>
                <span className={`text-sm lg:text-base font-bold ${textColor}`}>{name}</span>
              </div>
            </div>
            <div className={`text-[12px] lg:text-[12px] font-medium ${isDark ? 'text-[#5C564A]' : labelColor} bg-[#F5EFE2]/80 px-2 py-0.5 rounded-full`}>
              {time}
            </div>
          </div>
          <p className={`text-sm lg:text-sm ${textColor} leading-relaxed pl-9 opacity-90`}>{description}</p>
        </div>
      </div>
    </motion.div>
  )
}
