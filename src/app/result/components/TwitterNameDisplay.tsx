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
      {/* 헤더 라벨 */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Flame size={14} className="text-orange-500" />
        </motion.div>
        <span className="text-[10px] font-black text-orange-600 tracking-[0.2em] uppercase">
          AI가 뽑은 미친 한 줄 주접
        </span>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <Heart size={12} className="text-pink-500 fill-pink-500" />
        </motion.div>
      </div>

      {/* 메인 주접 카드 */}
      <div className="relative overflow-hidden rounded-2xl">
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

        {/* 본문 */}
        <div className="relative z-10 p-5">
          {/* 주접 텍스트 */}
          <p className="text-slate-900 font-black text-lg leading-snug break-keep">
            {twitterName}
          </p>

          {/* 해시태그 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayHashtags.map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="
                  inline-flex items-center gap-1
                  px-2 py-0.5 rounded-full
                  text-[10px] font-bold
                  bg-gradient-to-r from-orange-500/10 to-pink-500/10
                  text-orange-700 border border-orange-300/50
                "
              >
                {i === 0 && <Star size={8} className="fill-orange-400 text-orange-400" />}
                {tag}
              </motion.span>
            ))}
          </div>
        </div>

        {/* 하단 그라디언트 라인 - 애니메이션 */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background: 'linear-gradient(90deg, #f59e0b, #ec4899, #f59e0b, #ec4899)',
            backgroundSize: '200% 100%'
          }}
        />
      </div>
    </motion.div>
  )
}
