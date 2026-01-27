"use client"

import { motion } from 'framer-motion'

interface TwitterNameDisplayProps {
  twitterName?: string
  idolName?: string
  idolGender?: string
  isCompact?: boolean
}

export function TwitterNameDisplay({ twitterName, idolName, idolGender, isCompact = false }: TwitterNameDisplayProps) {
  // 성별 표시 텍스트
  const genderText = idolGender === 'Male' ? '남성' : idolGender === 'Female' ? '여성' : idolGender === 'Other' ? '기타' : '-'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
      className="relative"
    >
      {/* 최애 정보 카드 */}
      <div className={`relative overflow-hidden border-2 border-slate-900 ${
        isCompact
          ? 'rounded-xl shadow-[2px_2px_0px_#000]'
          : 'rounded-2xl shadow-[4px_4px_0px_#000]'
      }`}>
        {/* 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />

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
          {/* 헤더 */}
          <div className={`flex items-center gap-2 border-b-2 border-orange-200/60 ${isCompact ? 'mb-3 pb-2' : 'mb-4 pb-3'}`}>
            <span className={`${isCompact ? 'text-base' : 'text-lg'}`}>✨</span>
            <p className={`text-orange-600 font-black ${isCompact ? 'text-xs' : 'text-sm'}`}>
              나의 최애 정보
            </p>
          </div>

          {/* 정보 목록 */}
          <div className={`space-y-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {/* 이름 */}
            <div className="flex items-start gap-2">
              <span className="text-slate-500 font-medium min-w-[40px]">이름</span>
              <span className="text-slate-900 font-bold">{idolName || '-'}</span>
            </div>

            {/* 성별 */}
            <div className="flex items-start gap-2">
              <span className="text-slate-500 font-medium min-w-[40px]">성별</span>
              <span className="text-slate-900 font-bold">{genderText}</span>
            </div>
          </div>

          {/* 주접멘트 */}
          {twitterName && (
            <div className={`mt-3 pt-3 border-t-2 border-orange-200/60`}>
              <p className={`text-slate-900 font-black leading-snug break-keep ${isCompact ? 'text-xs' : 'text-sm'}`}>
                "{twitterName}"
              </p>
            </div>
          )}
        </div>

        {/* 하단 패턴 */}
        <div className={`bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400 ${isCompact ? 'h-1.5' : 'h-2'}`} />
      </div>
    </motion.div>
  )
}
