"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { TraitScores, TRAIT_ICONS } from '@/types/analysis'

interface TraitRadarChartProps {
  traits: TraitScores
  showAnimation?: boolean
}

// 각 특성별 고유 컬러 테마
const TRAIT_COLORS: Record<string, {
  bg: string,
  text: string,
  border: string,
  fill: string,
  gradient: string,
  shadow: string
}> = {
  sexy: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(133,133,133, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  cute: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(136,136,136, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  charisma: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(177,177,177, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  darkness: {
    bg: 'bg-[#EDE5D2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(84,84,84, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-300'
  },
  freshness: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(166,166,166, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  elegance: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(123,123,123, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  freedom: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(155,155,155, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  luxury: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(187,187,187, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  },
  purity: {
    bg: 'bg-[#EDE5D2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(193,193,193, 0.2)',
    gradient: 'from-[#EDE5D2] to-[#E5DCC8]',
    shadow: 'shadow-[#D8CFBB]'
  },
  uniqueness: {
    bg: 'bg-[#F5EFE2]',
    text: 'text-[#5C564A]',
    border: 'border-[#D8CFBB]',
    fill: 'rgba(138,138,138, 0.15)',
    gradient: 'from-[#EDE5D2] to-[#EDE5D2]',
    shadow: 'shadow-stone-200'
  }
}

export default function TraitRadarChart({ traits, showAnimation = true }: TraitRadarChartProps) {
  const t = useTranslations('analysis')
  const tLabels = useTranslations('labels')
  const centerX = 140
  const centerY = 140
  const radius = 100
  const maxValue = 10

  const characteristics = Object.entries(traits).map(([key, value]) => ({
    key: key as keyof TraitScores,
    label: tLabels(`traits.${key}`),
    value,
    icon: TRAIT_ICONS[key as keyof TraitScores]
  }))

  const highestTrait = [...characteristics].sort((a, b) => b.value - a.value)[0]
  const angleStep = (Math.PI * 2) / characteristics.length

  const getCoordinates = (value: number, index: number) => {
    const normalizedValue = value / maxValue
    const angle = index * angleStep - Math.PI / 2
    const x = centerX + radius * normalizedValue * Math.cos(angle)
    const y = centerY + radius * normalizedValue * Math.sin(angle)
    return { x, y }
  }

  const createPath = () => {
    const points = characteristics.map((char, i) => {
      const { x, y } = getCoordinates(char.value, i)
      return `${x},${y}`
    })
    return `M${points.join(' L')} Z`
  }

  const gridCircles = Array.from({ length: 5 }).map((_, i) => {
    const gridRadius = (radius * (i + 1)) / 5
    return (
      <motion.circle
        key={`grid-${i}`}
        cx={centerX}
        cy={centerY}
        r={gridRadius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1"
        initial={showAnimation ? { opacity: 0, scale: 0.5 } : undefined}
        animate={showAnimation ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.5, delay: 0.1 * i }}
      />
    )
  })

  const axisLines = characteristics.map((_, i) => {
    const { x, y } = getCoordinates(maxValue, i)
    return (
      <motion.line
        key={`axis-${i}`}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#e2e8f0"
        strokeWidth="1"
        initial={showAnimation ? { opacity: 0 } : undefined}
        animate={showAnimation ? { opacity: 1 } : undefined}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    )
  })

  const labels = characteristics.map((char, i) => {
    const { x, y } = getCoordinates(maxValue * 1.2, i)
    return (
      <text
        key={`label-${i}`}
        x={x}
        y={y}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill="#737373"
      >
        {char.label}
      </text>
    )
  })

  const getAiMessage = (trait: string) => {
    return t('topTraitMessage', { trait: tLabels(`traits.${trait}`) })
  }

  // 가장 높은 특성의 컬러 테마
  const topTraitColor = highestTrait ? TRAIT_COLORS[highestTrait.key] : TRAIT_COLORS.charisma

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, scale: 0.95 } : undefined}
      animate={showAnimation ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden"
    >
      {/* AI 주접 멘트 - 말풍선 스타일 */}
      {highestTrait && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative mb-4"
        >
          {/* 말풍선 */}
          <div className={`relative bg-gradient-to-r ${topTraitColor.gradient} rounded-[12px] p-4 shadow-lg`}>
            <div className="relative z-10 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[12px] bg-[#EFE4C8] flex items-center justify-center flex-shrink-0 shadow-md border border-[#D8CFBB]"
              >
                <span className="text-lg">{highestTrait.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-[#1A1610] text-sm lg:text-base font-bold leading-relaxed">
                  &quot;{getAiMessage(highestTrait.key)}&quot;
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[#6E6659] text-[10px] lg:text-[12px] font-medium">@acscent_ai</span>
                  <span className="px-2 py-0.5 bg-[#EFE4C8] border border-[#D8CFBB] rounded-full text-[#1A1610] text-[10px] lg:text-[12px] font-medium">
                    {highestTrait.label} {highestTrait.value}{t('scoreUnit')}
                  </span>
                </div>
              </div>
            </div>

            {/* 말풍선 꼬리 */}
            <div className={`absolute -bottom-2 left-8 w-4 h-4 bg-gradient-to-br ${topTraitColor.gradient} rotate-45`} />
          </div>
        </motion.div>
      )}

      {/* SVG 레이더 차트 */}
      <div className="flex justify-center bg-stone-50/50 rounded-[12px] p-4">
        <svg width="280" height="280" viewBox="0 0 280 280">
          {gridCircles}
          {axisLines}

          <motion.path
            d={createPath()}
            fill={topTraitColor.fill}
            stroke="url(#chartGradient)"
            strokeWidth="3"
            initial={showAnimation ? { pathLength: 0, opacity: 0 } : undefined}
            animate={showAnimation ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ duration: 1, delay: 0.3 }}
          />

          {/* 그라데이션 정의 */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9F9F9F" />
              <stop offset="50%" stopColor="#D1D1D1" />
              <stop offset="100%" stopColor="#A2A2A2" />
            </linearGradient>
          </defs>

          {labels}

          {characteristics.map((char, i) => {
            const { x, y } = getCoordinates(char.value, i)
            return (
              <motion.circle
                key={`point-${i}`}
                cx={x}
                cy={y}
                r={5}
                fill="url(#chartGradient)"
                stroke="#fff"
                strokeWidth="2"
                initial={showAnimation ? { scale: 0, opacity: 0 } : undefined}
                animate={showAnimation ? { scale: 1, opacity: 1 } : undefined}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="drop-shadow-sm"
              />
            )
          })}
        </svg>
      </div>

      {/* 특성 배지 목록 - 각 특성별 고유 색상 */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {[...characteristics].sort((a, b) => b.value - a.value).map((char, i) => {
          const traitColor = TRAIT_COLORS[char.key] || TRAIT_COLORS.charisma
          const isTop = i === 0

          return (
            <motion.div
              key={`badge-${char.key}`}
              initial={showAnimation ? { scale: 0, opacity: 0 } : undefined}
              animate={showAnimation ? { scale: 1, opacity: 1 } : undefined}
              transition={{ delay: 1 + i * 0.05, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px]
                ${traitColor.bg} ${traitColor.text} border ${traitColor.border}
                ${isTop ? 'ring-2 ring-offset-1 ring-[#A87B10] shadow-md' : ''}
                transition-all cursor-default
              `}
            >
              <span className="text-sm lg:text-base">{char.icon}</span>
              <span className="text-[11px] lg:text-[13px] font-medium">{char.label}</span>
              <span className={`
                text-[10px] lg:text-[12px] font-medium px-1.5 py-0.5 rounded-[12px]
                ${isTop ? 'bg-[#EFE4C8]' : 'bg-[#FDFAF1]'}
              `}>
                {char.value}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
