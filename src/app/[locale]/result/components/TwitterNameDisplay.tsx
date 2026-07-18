"use client"

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'

interface TwitterNameDisplayProps {
  twitterName?: string
  idolName?: string
  idolGender?: string
  isCompact?: boolean
}

export function TwitterNameDisplay({ twitterName, idolName, idolGender, isCompact = false }: TwitterNameDisplayProps) {
  const t = useTranslations('result')
  // 성별 표시 텍스트
  const genderText = idolGender === 'Male' ? t('genderMale') : idolGender === 'Female' ? t('genderFemale') : idolGender === 'Other' ? t('genderOther') : '-'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
      className="relative"
    >
      {/* 분석 대상 정보 카드 */}
      <div className={`relative overflow-hidden border border-[#D8CFBB] ${
        isCompact
          ? 'rounded-[12px]'
          : 'rounded-[12px]'
      }`}>
        {/* 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FDFAF1] via-[#FDFAF1] to-[#FDFAF1]" />

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
          <div className={`flex items-center gap-2 border-b-2 border-stone-200/60 ${isCompact ? 'mb-3 pb-2' : 'mb-4 pb-3'}`}>
            <Sparkles size={isCompact ? 14 : 16} className="text-[#8B8578]" strokeWidth={2} />
            <p className={`text-[#5C564A] font-medium ${isCompact ? 'text-xs lg:text-sm' : 'text-sm lg:text-base'}`}>
              {t('analysisSubjectInfo')}
            </p>
          </div>

          {/* 정보 목록 */}
          <div className={`space-y-2 ${isCompact ? 'text-xs lg:text-sm' : 'text-sm lg:text-base'}`}>
            {/* 이름 */}
            <div className="flex items-start gap-2">
              <span className="text-[#8B8578] font-medium min-w-[40px]">{t('nameLabel')}</span>
              <span className="text-[#1A1610] font-bold">{idolName || '-'}</span>
            </div>

            {/* 성별 */}
            <div className="flex items-start gap-2">
              <span className="text-[#8B8578] font-medium min-w-[40px]">{t('genderLabel')}</span>
              <span className="text-[#1A1610] font-bold">{genderText}</span>
            </div>
          </div>

          {/* 주접멘트 */}
          {twitterName && (
            <div className={`mt-3 pt-3 border-t-2 border-stone-200/60`}>
              <p className={`text-[#1A1610] font-medium leading-snug break-keep ${isCompact ? 'text-xs lg:text-sm' : 'text-sm lg:text-base'}`}>
                "{twitterName}"
              </p>
            </div>
          )}
        </div>

        {/* 하단 패턴 */}
        <div className={`bg-gradient-to-r from-[#EFE4C8] via-[#EFE4C8] to-[#EFE4C8] ${isCompact ? 'h-1.5' : 'h-2'}`} />
      </div>
    </motion.div>
  )
}
