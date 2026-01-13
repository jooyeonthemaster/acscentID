"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Droplets, Sparkles, Heart, Moon } from 'lucide-react'
import { PerfumePersona } from '@/types/analysis'

interface PerfumeNotesProps {
  persona?: PerfumePersona
  isDesktop?: boolean
}

export function PerfumeNotes({ persona, isDesktop = false }: PerfumeNotesProps) {
  // PC 레이아웃
  if (isDesktop) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-amber-400 border-2 border-slate-900 flex items-center justify-center">
            <Droplets size={12} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">향 노트</h3>
            <p className="text-[10px] text-slate-400">시간에 따른 향의 변화</p>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 shadow-[3px_3px_0px_#000]">
          <div className="space-y-3">
            {/* 탑노트 - PC */}
            <DesktopNoteCard
              type="TOP"
              icon={<Sparkles size={14} className="text-white" />}
              name={persona?.mainScent?.name || '시트러스'}
              description={persona?.mainScent?.fanComment || '첫 인상을 결정하는 상쾌한 시작'}
              time="0-30분"
              gradient="from-amber-100 via-yellow-50 to-orange-100"
              iconBg="from-yellow-400 to-amber-500"
              borderColor="border-amber-300"
              textColor="text-amber-700"
              labelColor="text-amber-600"
            />

            {/* 미들노트 - PC */}
            <DesktopNoteCard
              type="HEART"
              icon={<Heart size={14} className="text-white fill-white" />}
              name={persona?.subScent1?.name || '플로럴'}
              description={persona?.subScent1?.fanComment || '향수의 심장, 매력의 핵심'}
              time="30분-2시간"
              gradient="from-pink-100 via-rose-50 to-pink-100"
              iconBg="from-pink-400 to-rose-500"
              borderColor="border-pink-300"
              textColor="text-pink-700"
              labelColor="text-pink-600"
            />

            {/* 베이스노트 - PC */}
            <DesktopNoteCard
              type="BASE"
              icon={<Moon size={14} className="text-amber-200" />}
              name={persona?.subScent2?.name || '우디'}
              description={persona?.subScent2?.fanComment || '오래 기억되는 깊은 잔향'}
              time="2-6시간"
              gradient="from-slate-700 via-slate-800 to-slate-700"
              iconBg="from-slate-600 to-slate-800"
              borderColor="border-slate-500"
              textColor="text-slate-200"
              labelColor="text-slate-400"
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
        <div className="w-5 h-5 rounded-md bg-amber-400 border border-slate-900 flex items-center justify-center">
          <Droplets size={10} className="text-white" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">향 노트</h3>
          <p className="text-[9px] text-slate-400">시간에 따른 향의 변화</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
        <div className="space-y-2">
          {/* 탑노트 - 모바일 */}
          <MobileNoteCard
            type="TOP"
            name={persona?.mainScent?.name || '시트러스'}
            description={persona?.mainScent?.fanComment || '첫 인상을 결정하는 상쾌한 시작'}
            time="0-30분"
            bgColor="bg-gradient-to-r from-amber-50 to-yellow-50"
            accentColor="bg-amber-400"
            textColor="text-amber-800"
            timeColor="text-amber-600"
          />

          {/* 미들노트 - 모바일 */}
          <MobileNoteCard
            type="HEART"
            name={persona?.subScent1?.name || '플로럴'}
            description={persona?.subScent1?.fanComment || '향수의 심장, 매력의 핵심'}
            time="30분-2시간"
            bgColor="bg-gradient-to-r from-pink-50 to-rose-50"
            accentColor="bg-pink-400"
            textColor="text-pink-800"
            timeColor="text-pink-600"
          />

          {/* 베이스노트 - 모바일 */}
          <MobileNoteCard
            type="BASE"
            name={persona?.subScent2?.name || '우디'}
            description={persona?.subScent2?.fanComment || '오래 기억되는 깊은 잔향'}
            time="2-6시간"
            bgColor="bg-gradient-to-r from-slate-100 to-slate-200"
            accentColor="bg-slate-600"
            textColor="text-slate-700"
            timeColor="text-slate-500"
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
      className={`relative ${bgColor} rounded-lg p-2.5 overflow-hidden`}
    >
      {/* 좌측 액센트 바 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className="pl-2">
        {/* 상단: 타입 + 이름 + 시간 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black ${timeColor} tracking-wider`}>{type}</span>
            <span className={`text-[10px] ${timeColor}`}>•</span>
            <span className={`text-xs font-black ${textColor}`}>{name}</span>
          </div>
          <span className={`text-[9px] font-medium ${timeColor}`}>{time}</span>
        </div>

        {/* 설명 */}
        <p className={`text-[11px] leading-relaxed ${textColor} opacity-80`}>
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
      <div className={`relative bg-gradient-to-r ${gradient} rounded-xl p-3.5 border ${borderColor}`}>
        {/* 컨텐츠 */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 bg-gradient-to-br ${iconBg} rounded-lg border border-slate-900/20 flex items-center justify-center shadow-sm`}>
                {icon}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black ${labelColor} tracking-wider`}>{type}</span>
                <span className={isDark ? 'text-slate-500' : `${labelColor} opacity-50`}>|</span>
                <span className={`text-sm font-black ${textColor}`}>{name}</span>
              </div>
            </div>
            <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : labelColor} bg-white/50 px-2 py-0.5 rounded-full`}>
              {time}
            </div>
          </div>
          <p className={`text-xs ${textColor} leading-relaxed pl-9 opacity-90`}>{description}</p>
        </div>
      </div>
    </motion.div>
  )
}
