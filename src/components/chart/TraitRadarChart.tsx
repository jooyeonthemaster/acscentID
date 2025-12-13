"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { TraitScores, TRAIT_LABELS, TRAIT_ICONS } from '@/types/analysis'
import { Badge } from '@/components/ui/badge'

interface TraitRadarChartProps {
  traits: TraitScores
  showAnimation?: boolean
}

// AI 주접 멘트
const AI_MESSAGES: Record<string, string[]> = {
  sexy: [
    "이 섹시함은 뭐죠? 화면이 녹아내려요! 🔥",
    "농염한 매력에 심장이 두근두근! 😍",
    "치명적인 섹시함은 처음 봐요! 💋"
  ],
  cute: [
    "이 귀여움 뭐야? 심장이 녹아요! 🥺",
    "이런 큐트함은 반칙이야! 💕",
    "천사가 따로 없어요! 🥰"
  ],
  charisma: [
    "이 카리스마! 완전 압도적인데요! 👑",
    "강력한 카리스마는 처음 봐요! ⚡",
    "진짜 레전드급 포스! 🔥"
  ],
  darkness: [
    "이 다크한 매력... 너무 신비로워요! 🌙",
    "깊고 어두운 눈빛에 빠져버렸어요! 🖤",
    "미스테리어스한 분위기... 매혹적! ✨"
  ],
  freshness: [
    "이 상큼함! 완전 프레시해요! 🌊",
    "청량한 매력에 기분까지 상쾌! 🌿",
    "프레시한 에너지에 힐링받아요! 💙"
  ],
  elegance: [
    "이 우아함! 완전 고급스러워요! 🦢",
    "엘레간트한 매력... 품격 있어요! 💎",
    "세련된 분위기에 매료됐어요! ✨"
  ],
  freedom: [
    "자유로운 에너지! 너무 멋져요! 🕊️",
    "자유분방한 매력... 시원해요! 🌊",
    "무구속한 분위기에 해방감! 🦋"
  ],
  luxury: [
    "이 럭셔리함! 완전 고급져요! 💎",
    "사치스러운 매력... 프리미엄! 👑",
    "고급스러운 분위기에 압도! ✨"
  ],
  purity: [
    "이 순수함! 완전 천사 같아요! 🤍",
    "청순한 매력... 맑고 깨끗해요! 🕊️",
    "순결한 분위기에 마음이 정화! 🌸"
  ],
  uniqueness: [
    "이 독특함! 완전 개성 넘쳐요! 🌈",
    "유니크한 매력... 진짜 특별해요! 🦄",
    "오리지널한 개성... 너무 멋져요! ✨"
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

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, scale: 0.95 } : undefined}
      animate={showAnimation ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.5 }}
      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 p-4"
    >
      {/* AI 주접 멘트 */}
      {highestTrait && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-3 mb-4 border border-yellow-200/50">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs">🤖</span>
            </div>
            <div>
              <p className="text-slate-700 text-xs font-medium leading-relaxed">
                &quot;{getAiMessage(highestTrait.key, highestTrait.value)}&quot;
              </p>
              <p className="text-amber-600 text-[10px] mt-1 font-medium">AI 주접봇 • {highestTrait.label} {highestTrait.value}점</p>
            </div>
          </div>
        </div>
      )}

      {/* SVG 레이더 차트 */}
      <div className="flex justify-center">
        <svg width="280" height="280" viewBox="0 0 280 280">
          {gridCircles}
          {axisLines}
          
          <motion.path
            d={createPath()}
            fill="rgba(250, 204, 21, 0.3)"
            stroke="#FACC15"
            strokeWidth="2"
            initial={showAnimation ? { pathLength: 0, opacity: 0 } : undefined}
            animate={showAnimation ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ duration: 1, delay: 0.3 }}
          />

          {labels}

          {characteristics.map((char, i) => {
            const { x, y } = getCoordinates(char.value, i)
            return (
              <motion.circle
                key={`point-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill="#FACC15"
                stroke="#fff"
                strokeWidth="2"
                initial={showAnimation ? { scale: 0, opacity: 0 } : undefined}
                animate={showAnimation ? { scale: 1, opacity: 1 } : undefined}
                transition={{ delay: 0.8 + i * 0.05 }}
              />
            )
          })}
        </svg>
      </div>

      {/* 특성 배지 목록 */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-4">
        {characteristics.map((char, i) => (
          <Badge
            key={`badge-${i}`}
            variant="secondary"
            className="bg-slate-100 hover:bg-slate-100 text-slate-600 text-[10px] px-2 py-1"
          >
            <span className="mr-1">{char.icon}</span>
            {char.label} {char.value}
          </Badge>
        ))}
      </div>
    </motion.div>
  )
}
