"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Flame, Heart, Star } from 'lucide-react'

interface TwitterNameDisplayProps {
  twitterName: string
  hashtags?: string[]
}

export function TwitterNameDisplay({ twitterName, hashtags }: TwitterNameDisplayProps) {
  const defaultHashtags = ['#AC_SCENT', '#향수추천', '#비주얼_미쳤다', '#입덕각']
  const displayHashtags = hashtags || defaultHashtags

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
      className="relative"
    >
      {/* 헤더 라벨 - 키치 스타일 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-400 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
          <span className="text-sm">🔥</span>
          <span className="text-[10px] font-black text-white tracking-wide">
            AI 주접
          </span>
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <Heart size={14} className="text-pink-500 fill-pink-500" />
        </motion.div>
      </div>

      {/* 메인 주접 카드 - 키치 스타일 */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
        {/* 화려한 그라디언트 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-pink-100" />

        {/* 반짝이 효과 */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12"
          />
        </div>

        {/* 코너 장식 */}
        <div className="absolute top-2 right-2 text-lg">✨</div>
        <div className="absolute bottom-2 left-2 text-lg">💕</div>

        {/* 본문 */}
        <div className="relative z-10 p-5">
          {/* 주접 텍스트 */}
          <p className="text-slate-900 font-black text-lg leading-snug break-keep">
            {twitterName}
          </p>

          {/* 해시태그 - 키치 스타일 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayHashtags.map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="
                  inline-flex items-center gap-1
                  px-2.5 py-1 rounded-lg
                  text-[10px] font-bold
                  bg-white/80 border-2 border-orange-300
                  text-orange-700
                "
              >
                {i === 0 && <Star size={10} className="fill-orange-400 text-orange-400" />}
                {tag}
              </motion.span>
            ))}
          </div>
        </div>

        {/* 하단 패턴 */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-orange-400" />
      </div>
    </motion.div>
  )
}
