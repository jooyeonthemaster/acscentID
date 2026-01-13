"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { TraitScores, TRAIT_LABELS, TRAIT_ICONS } from '@/types/analysis'

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
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-400',
    fill: 'rgba(244, 63, 94, 0.15)',
    gradient: 'from-rose-400 to-pink-500',
    shadow: 'shadow-rose-200'
  },
  cute: {
    bg: 'bg-pink-100',
    text: 'text-pink-600',
    border: 'border-pink-400',
    fill: 'rgba(236, 72, 153, 0.15)',
    gradient: 'from-pink-400 to-rose-400',
    shadow: 'shadow-pink-200'
  },
  charisma: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-400',
    fill: 'rgba(245, 158, 11, 0.15)',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200'
  },
  darkness: {
    bg: 'bg-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-500',
    fill: 'rgba(71, 85, 105, 0.15)',
    gradient: 'from-slate-600 to-slate-800',
    shadow: 'shadow-slate-300'
  },
  freshness: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-400',
    fill: 'rgba(6, 182, 212, 0.15)',
    gradient: 'from-cyan-400 to-teal-500',
    shadow: 'shadow-cyan-200'
  },
  elegance: {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-400',
    fill: 'rgba(139, 92, 246, 0.15)',
    gradient: 'from-violet-400 to-purple-500',
    shadow: 'shadow-violet-200'
  },
  freedom: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-400',
    fill: 'rgba(14, 165, 233, 0.15)',
    gradient: 'from-sky-400 to-blue-500',
    shadow: 'shadow-sky-200'
  },
  luxury: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-500',
    fill: 'rgba(234, 179, 8, 0.15)',
    gradient: 'from-yellow-400 to-amber-500',
    shadow: 'shadow-yellow-200'
  },
  purity: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-300',
    fill: 'rgba(147, 197, 253, 0.2)',
    gradient: 'from-blue-300 to-indigo-400',
    shadow: 'shadow-blue-100'
  },
  uniqueness: {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-400',
    fill: 'rgba(217, 70, 239, 0.15)',
    gradient: 'from-fuchsia-400 to-purple-500',
    shadow: 'shadow-fuchsia-200'
  }
}

// AI 주접 멘트
const AI_MESSAGES: Record<string, string[]> = {
  sexy: [
    "이 섹시함은 뭐죠? 화면이 녹아내려요!",
    "농염한 매력에 심장이 두근두근!",
    "치명적인 섹시함은 처음 봐요!"
  ],
  cute: [
    "이 귀여움 뭐야? 심장이 녹아요!",
    "이런 큐트함은 반칙이야!",
    "천사가 따로 없어요!"
  ],
  charisma: [
    "이 카리스마! 완전 압도적인데요!",
    "강력한 카리스마는 처음 봐요!",
    "진짜 레전드급 포스!"
  ],
  darkness: [
    "이 다크한 매력... 너무 신비로워요!",
    "깊고 어두운 눈빛에 빠져버렸어요!",
    "미스테리어스한 분위기... 매혹적!"
  ],
  freshness: [
    "이 상큼함! 완전 프레시해요!",
    "청량한 매력에 기분까지 상쾌!",
    "프레시한 에너지에 힐링받아요!"
  ],
  elegance: [
    "이 우아함! 완전 고급스러워요!",
    "엘레간트한 매력... 품격 있어요!",
    "세련된 분위기에 매료됐어요!"
  ],
  freedom: [
    "자유로운 에너지! 너무 멋져요!",
    "자유분방한 매력... 시원해요!",
    "무구속한 분위기에 해방감!"
  ],
  luxury: [
    "이 럭셔리함! 완전 고급져요!",
    "사치스러운 매력... 프리미엄!",
    "고급스러운 분위기에 압도!"
  ],
  purity: [
    "이 순수함! 완전 천사 같아요!",
    "청순한 매력... 맑고 깨끗해요!",
    "순결한 분위기에 마음이 정화!"
  ],
  uniqueness: [
    "이 독특함! 완전 개성 넘쳐요!",
    "유니크한 매력... 진짜 특별해요!",
    "오리지널한 개성... 너무 멋져요!"
  ]
}

export default function TraitRadarChart({ traits, showAnimation = true }: TraitRadarChartProps) {
  const centerX = 140
  const centerY = 140
  const radius = 100
  const maxValue = 10

  const characteristics = Object.entries(traits).map(([key, value]) => ({
    key: key as keyof TraitScores,
    label: TRAIT_LABELS[key as keyof TraitScores],
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
        fill="#64748b"
      >
        {char.label}
      </text>
    )
  })

  const getAiMessage = (trait: string, value: number) => {
    const messages = AI_MESSAGES[trait] || ["정말 멋진 매력이에요! ✨"]
    const messageIndex = Math.min(Math.floor(value / 4), messages.length - 1)
    return messages[messageIndex]
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
          <div className={`relative bg-gradient-to-r ${topTraitColor.gradient} rounded-2xl p-4 shadow-lg`}>
            {/* 반짝이 효과 */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-white"
              >
                <span className="text-lg">{highestTrait.icon}</span>
              </motion.div>
              <div className="flex-1">
                <p className="text-white text-sm font-black leading-relaxed drop-shadow-sm">
                  &quot;{getAiMessage(highestTrait.key, highestTrait.value)}&quot;
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-white/80 text-[10px] font-bold">@acscent_ai</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-[10px] font-black">
                    {highestTrait.label} {highestTrait.value}점
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
      <div className="flex justify-center bg-slate-50/50 rounded-2xl p-4">
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
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#60A5FA" />
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
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                ${traitColor.bg} ${traitColor.text} border-2 ${traitColor.border}
                ${isTop ? 'ring-2 ring-offset-1 ring-yellow-400 shadow-md' : ''}
                transition-all cursor-default
              `}
            >
              <span className="text-sm">{char.icon}</span>
              <span className="text-[11px] font-black">{char.label}</span>
              <span className={`
                text-[10px] font-black px-1.5 py-0.5 rounded-md
                ${isTop ? 'bg-white/60' : 'bg-white/40'}
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
