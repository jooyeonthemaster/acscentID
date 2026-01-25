"use client"

import { motion } from 'framer-motion'

interface TwitterNameDisplayProps {
  twitterName: string
  idolName?: string
  idolGender?: string
  isCompact?: boolean
}

export function TwitterNameDisplay({ twitterName, idolName, idolGender, isCompact = false }: TwitterNameDisplayProps) {
  // 성별 표시 텍스트
  const genderText = idolGender === 'M' ? '남성' : idolGender === 'F' ? '여성' : null
  // 서브 텍스트 조합
  const subText = genderText ? `${genderText} · 나의 최애` : '나의 최애'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
      className="relative"
    >
      {/* 메인 주접 카드 - 블로그 프로필 스타일 */}
      <div className={`relative overflow-hidden border-2 border-slate-900 ${
        isCompact
          ? 'rounded-xl shadow-[2px_2px_0px_#000]'
          : 'rounded-2xl shadow-[4px_4px_0px_#000]'
      }`}>
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
        <div className={`relative z-10 ${isCompact ? 'p-3' : 'p-4'}`}>
          {/* 최애 프로필 - 블로그 스타일 */}
          {idolName && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`border-b-2 border-orange-200/60 ${isCompact ? 'mb-2 pb-2' : 'mb-3 pb-3'}`}
            >
              {/* 최애 정보 */}
              <p className={`text-slate-900 font-black leading-tight ${isCompact ? 'text-xs' : 'text-sm'}`}>
                {idolName}
              </p>
              <p className={`text-orange-600 font-bold mt-0.5 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
                {subText}
              </p>
            </motion.div>
          )}

          {/* 주접 텍스트 */}
          <p className={`text-slate-900 font-black leading-snug break-keep ${isCompact ? 'text-sm' : 'text-base'}`}>
            {twitterName}
          </p>
        </div>

        {/* 하단 패턴 */}
        <div className={`bg-gradient-to-r from-yellow-400 via-pink-400 to-orange-400 ${isCompact ? 'h-1.5' : 'h-2'}`} />
      </div>
    </motion.div>
  )
}
