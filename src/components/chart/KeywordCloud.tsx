"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface KeywordCloudProps {
  keywords: string[]
  showAnimation?: boolean
}

export default function KeywordCloud({ keywords, showAnimation = true }: KeywordCloudProps) {
  // 컬러 팔레트 (메인 디자인과 일관성)
  const colors = [
    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  ]

  // 시드 기반 랜덤
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // 키워드에 색상과 크기 할당
  const getStyledKeywords = () => {
    return keywords.map((keyword, index) => {
      const colorIndex = Math.floor(seededRandom(index + 50) * colors.length)
      const sizeVariant = Math.floor(seededRandom(index) * 3) // 0, 1, 2
      return {
        text: keyword,
        color: colors[colorIndex],
        size: sizeVariant
      }
    })
  }

  const styledKeywords = getStyledKeywords()

  const getSizeClasses = (size: number) => {
    switch (size) {
      case 0: return 'text-xs px-2.5 py-1'
      case 1: return 'text-sm px-3 py-1.5'
      case 2: return 'text-sm px-3.5 py-1.5 font-semibold'
      default: return 'text-xs px-2.5 py-1'
    }
  }

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0 } : undefined}
      animate={showAnimation ? { opacity: 1 } : undefined}
      transition={{ duration: 0.5 }}
      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 p-4"
    >
      <div className="flex flex-wrap gap-2 justify-center">
        {styledKeywords.map((keyword, index) => (
          <motion.div
            key={`keyword-${index}`}
            initial={showAnimation ? { scale: 0, opacity: 0 } : undefined}
            animate={showAnimation ? { scale: 1, opacity: 1 } : undefined}
            transition={{
              delay: showAnimation ? 0.1 + (index * 0.05) : 0,
              type: 'spring',
              stiffness: 150,
              damping: 15
            }}
          >
            <span
              className={`
                inline-block rounded-full border font-medium
                transition-transform hover:scale-105 cursor-default
                ${keyword.color.bg} ${keyword.color.text} ${keyword.color.border}
                ${getSizeClasses(keyword.size)}
              `}
            >
              #{keyword.text}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
