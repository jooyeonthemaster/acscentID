"use client"

import React from 'react'
import { motion } from 'framer-motion'

interface KeywordCloudProps {
  keywords: string[]
  showAnimation?: boolean
}

// 키워드 스타일 - 각각 다른 개성
const KEYWORD_STYLES = [
  {
    // 핫핑크 리본 스타일
    bg: 'bg-gradient-to-r from-[#161925] to-[#161925]',
    text: 'text-[#E9E2D0]',
    shape: 'rounded-[12px]',
    decoration: '🎀',
    shadow: 'shadow-md shadow-stone-200',
    border: ''
  },
  {
    // 옐로우 스티커 스타일
    bg: 'bg-[#151823]',
    text: 'text-[#E9E2D0]',
    shape: 'rounded-[12px]',
    decoration: '⭐',
    shadow: '',
    border: 'border-2 border-[#262A38]'
  },
  {
    // 민트 버블 스타일
    bg: 'bg-gradient-to-br from-[#232838] to-[#232838]',
    text: 'text-[#E9E2D0]',
    shape: 'rounded-full',
    decoration: '✨',
    shadow: 'shadow-lg shadow-[#151823]',
    border: 'border border-[#262A38]'
  },
  {
    // 라벤더 필 스타일
    bg: 'bg-[#151823]',
    text: 'text-[#A69F8D]',
    shape: 'rounded-[12px]',
    decoration: '💜',
    shadow: '',
    border: 'border-2 border-[#262A38] border-dashed'
  },
  {
    // 오렌지 뱃지 스타일
    bg: 'bg-gradient-to-r from-[#161925] to-[#161925]',
    text: 'text-[#E9E2D0]',
    shape: 'rounded-[12px]',
    decoration: '🔥',
    shadow: 'shadow-md shadow-stone-200',
    border: ''
  },
  {
    // 스카이블루 태그 스타일
    bg: 'bg-[#0C0E16]',
    text: 'text-[#A69F8D]',
    shape: 'rounded-[12px]',
    decoration: '💙',
    shadow: '',
    border: 'border-2 border-[#262A38]'
  },
  {
    // 코랄 스탬프 스타일
    bg: 'bg-[#0C0E16]',
    text: 'text-[#A69F8D]',
    shape: 'rounded-[12px]',
    decoration: '💕',
    shadow: 'shadow-inner',
    border: 'border-2 border-[#262A38]'
  },
  {
    // 그린 네온 스타일
    bg: 'bg-gradient-to-r from-[#161925] to-[#161925]',
    text: 'text-[#E9E2D0]',
    shape: 'rounded-full',
    decoration: '🌿',
    shadow: 'shadow-lg shadow-stone-200',
    border: ''
  }
]

// 다양한 회전 각도
const ROTATIONS = [-3, 2, -2, 3, -1, 1, 0, -4, 4]

// 다양한 크기
const SIZES = [
  'text-xs lg:text-sm px-2.5 py-1',
  'text-sm lg:text-base px-3 py-1.5',
  'text-sm lg:text-base px-3.5 py-2 font-bold',
  'text-xs lg:text-sm px-2 py-1'
]

export default function KeywordCloud({ keywords, showAnimation = true }: KeywordCloudProps) {
  // 시드 기반 랜덤
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // 키워드에 스타일 할당
  const getStyledKeywords = () => {
    return keywords.map((keyword, index) => {
      const styleIndex = Math.floor(seededRandom(index + 100) * KEYWORD_STYLES.length)
      const rotationIndex = Math.floor(seededRandom(index + 200) * ROTATIONS.length)
      const sizeIndex = Math.floor(seededRandom(index + 300) * SIZES.length)
      const showDecoration = seededRandom(index + 400) > 0.6

      return {
        text: keyword,
        style: KEYWORD_STYLES[styleIndex],
        rotation: ROTATIONS[rotationIndex],
        size: SIZES[sizeIndex],
        showDecoration
      }
    })
  }

  const styledKeywords = getStyledKeywords()

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0 } : undefined}
      animate={showAnimation ? { opacity: 1 } : undefined}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden rounded-[12px] pointer-events-none">
        <div className="absolute top-2 right-4 text-2xl opacity-20">✨</div>
        <div className="absolute bottom-2 left-4 text-2xl opacity-20">💫</div>
      </div>

      <div className="flex flex-wrap gap-2.5 justify-center p-2 relative z-10">
        {styledKeywords.map((keyword, index) => (
          <motion.div
            key={`keyword-${index}`}
            initial={showAnimation ? {
              scale: 0,
              opacity: 0,
              rotate: keyword.rotation * 3
            } : undefined}
            animate={showAnimation ? {
              scale: 1,
              opacity: 1,
              rotate: keyword.rotation
            } : undefined}
            transition={{
              delay: showAnimation ? 0.1 + (index * 0.06) : 0,
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
            whileHover={{
              scale: 1.1,
              rotate: 0,
              y: -4,
              transition: { duration: 0.2 }
            }}
            style={{ rotate: `${keyword.rotation}deg` }}
          >
            <span
              className={`
                inline-flex items-center gap-1 font-bold
                transition-all cursor-default select-none
                ${keyword.style.bg} ${keyword.style.text}
                ${keyword.style.shape} ${keyword.style.shadow}
                ${keyword.style.border} ${keyword.size}
              `}
            >
              {keyword.showDecoration && (
                <span className="text-[10px] lg:text-[12px]">{keyword.style.decoration}</span>
              )}
              <span className="whitespace-nowrap">#{keyword.text}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {/* 하단 장식 라인 */}
      <div className="flex justify-center gap-1 mt-3">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`dot-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className={`w-1.5 h-1.5 rounded-full ${
              i % 2 === 0 ? 'bg-[#232838]' : 'bg-[#232838]'
            }`}
          />
        ))}
      </div>
    </motion.div>
  )
}
