"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, Clock, BookOpen, Search } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import { PerfumeNotes } from './PerfumeNotes'
import { PerfumeProfile } from './PerfumeProfile'
import { ScentRecommendationCard } from './ScentRecommendationCard'

interface PerfumeTabProps {
  displayedAnalysis: ImageAnalysisResult
  isDesktop?: boolean
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export function PerfumeTab({ displayedAnalysis, isDesktop = false }: PerfumeTabProps) {
  const t = useTranslations()

  // PC: 2컬럼 그리드 레이아웃으로 확장
  if (isDesktop) {
    return (
      <motion.div
        key="perfume"
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-8"
      >
        {displayedAnalysis.matchingPerfumes && displayedAnalysis.matchingPerfumes.length > 0 ? (
          displayedAnalysis.matchingPerfumes.map((match, index) => {
            const primaryColor = match.persona?.primaryColor || '#FBBF24';
            const secondaryColor = match.persona?.secondaryColor || '#F59E0B';

            return (
              <motion.div key={index} variants={fadeIn} className="space-y-6">
                {/* 향수 헤더 카드 - PC용 확장 (키치 스타일) */}
                <div className="relative rounded-2xl p-6 bg-white overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  {/* 데코 패턴 */}
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-15"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: secondaryColor }}
                  />


                  <div className="relative z-10">
                    {/* 향수 정보 */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000] mb-3">
                      <span className="text-sm">💎</span>
                      <span className="text-xs font-black text-slate-900">{t('result.recommendedPerfume')}</span>
                    </div>
                    <h2 className="text-3xl font-black leading-tight text-slate-900 mb-2">
                      {match.persona?.id || t('result.customPerfumeAlt')}
                    </h2>
                    <p className="text-base text-slate-600 mb-4">
                      {match.persona?.name || ''}
                    </p>

                    {/* 키워드 - 키치 스타일 */}
                    {match.persona?.keywords && (
                      <div className="flex flex-wrap gap-2">
                        {match.persona.keywords.slice(0, 6).map((keyword, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 border-2 border-amber-300 text-amber-700"
                          >
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 세로 배치: 향 노트 */}
                <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  <PerfumeNotes persona={match.persona} isDesktop={true} />
                </div>

                {/* 세로 배치: 향수 프로필 */}
                <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  <PerfumeProfile persona={match.persona} isDesktop={true} />
                </div>

                {/* 향수 스토리 */}
                {match.matchReason && (
                  <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                    <SectionHeader
                      icon={<Sparkles size={14} />}
                      title={t('perfume.perfumeStory')}
                      subtitle={t('perfume.expertReview')}
                    />
                    <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                      <p className="text-slate-700 text-sm leading-relaxed font-medium italic">
                        &quot;{match.matchReason}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* 사용 추천 */}
                {match.persona?.recommendation && (
                  <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                    <SectionHeader
                      icon={<Clock size={14} />}
                      title={t('perfume.usageRecommend')}
                      subtitle={t('perfume.usageRecommendSubtitle')}
                    />
                    <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">
                        {match.persona.recommendation}
                      </p>
                    </div>
                    {/* 추천 계절/시간대 */}
                    <ScentRecommendationCard
                      recommendation={displayedAnalysis.scentRecommendation}
                      isDesktop={true}
                    />
                  </div>
                )}

                {/* 사용 가이드 - 전체 너비 */}
                <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  <SectionHeader
                    icon={<BookOpen size={14} />}
                    title={t('perfume.usageGuide')}
                    subtitle={t('perfume.usageGuideSubtitle')}
                  />
                  <div className="bg-[#FEF9C3] rounded-xl p-4 space-y-3 border-2 border-slate-200">
                    {match.persona?.usageGuide?.tips && match.persona.usageGuide.tips.length > 0 ? (
                      match.persona.usageGuide.tips.map((tip, i) => (
                        <GuideItem key={i} text={tip} />
                      ))
                    ) : (
                      <>
                        <GuideItem text={t('perfume.defaultGuide1')} />
                        <GuideItem text={t('perfume.defaultGuide2')} />
                        <GuideItem text={t('perfume.defaultGuide3')} />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
          >
            <div className="w-20 h-20 bg-[#FEF9C3] rounded-xl border-2 border-slate-900 flex items-center justify-center mb-4 shadow-[3px_3px_0px_#000]">
              <Search size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-800 text-center font-black text-lg">{t('result.noMatchingPerfume')}</p>
            <p className="text-slate-500 text-sm text-center mt-1 font-medium">{t('result.retryAnalysis')}</p>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // 모바일: 키치 스타일
  return (
    <motion.div
      key="perfume"
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-5"
    >
      {displayedAnalysis.matchingPerfumes && displayedAnalysis.matchingPerfumes.length > 0 ? (
        displayedAnalysis.matchingPerfumes.map((match, index) => {
          const primaryColor = match.persona?.primaryColor || '#FBBF24';
          const secondaryColor = match.persona?.secondaryColor || '#F59E0B';

          return (
            <motion.div key={index} variants={fadeIn} className="space-y-5">
              {/* 향수 헤더 카드 - 키치 스타일 */}
              <div className="relative rounded-2xl p-5 bg-white overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                {/* 컬러풀한 데코 - 향수 색상 사용 */}
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-15"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10"
                  style={{ backgroundColor: secondaryColor }}
                />

                <div className="relative z-10">
                  {/* 향수 정보 */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000] mb-2">
                    <span className="text-xs">💎</span>
                    <span className="text-[10px] font-black text-slate-900">{t('result.recommendedPerfume')}</span>
                  </div>
                  <h2 className="text-2xl font-black leading-tight text-slate-900">
                    {match.persona?.id || t('result.customPerfumeAlt')}
                  </h2>
                  <p className="text-sm mt-1 text-slate-600 mb-3">
                    {match.persona?.name || ''}
                  </p>

                  {/* 키워드 - 키치 스타일 */}
                  {match.persona?.keywords && (
                    <div className="flex flex-wrap gap-1.5">
                      {match.persona.keywords.slice(0, 5).map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 border-2 border-amber-300 text-amber-700"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 향 노트 */}
              <PerfumeNotes persona={match.persona} />

              {/* 향수 프로필 */}
              <PerfumeProfile persona={match.persona} />

              {/* 향수 스토리 */}
              {match.matchReason && (
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                  <SectionHeader
                    icon={<Sparkles size={14} />}
                    title={t('perfume.perfumeStory')}
                    subtitle={t('perfume.expertReview')}
                  />
                  <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                    <p className="text-slate-700 text-sm leading-relaxed italic font-medium">
                      &quot;{match.matchReason}&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* 사용 추천 */}
              {match.persona?.recommendation && (
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                  <SectionHeader
                    icon={<Clock size={14} />}
                    title={t('perfume.usageRecommend')}
                    subtitle={t('perfume.usageRecommendSubtitle')}
                  />
                  <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                    <p className="text-slate-700 text-sm leading-relaxed font-medium">
                      {match.persona.recommendation}
                    </p>
                  </div>
                  {/* 추천 계절/시간대 */}
                  <ScentRecommendationCard
                    recommendation={displayedAnalysis.scentRecommendation}
                    isDesktop={false}
                  />
                </div>
              )}

              {/* 사용 가이드 */}
              <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                <SectionHeader
                  icon={<BookOpen size={14} />}
                  title={t('perfume.usageGuide')}
                  subtitle={t('perfume.usageGuideSubtitle')}
                />
                <div className="bg-[#FEF9C3] rounded-xl p-4 space-y-3 border-2 border-slate-200">
                  {match.persona?.usageGuide?.tips && match.persona.usageGuide.tips.length > 0 ? (
                    // AI 생성 주접 가이드가 있으면 표시
                    match.persona.usageGuide.tips.map((tip, i) => (
                      <GuideItem key={i} text={tip} />
                    ))
                  ) : (
                    // 기본 가이드
                    <>
                      <GuideItem text={t('perfume.defaultGuide1Emoji')} />
                      <GuideItem text={t('perfume.defaultGuide2Emoji')} />
                      <GuideItem text={t('perfume.defaultGuide3Emoji')} />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })
      ) : (
        <motion.div
          variants={fadeIn}
          className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#000]"
        >
          <div className="w-16 h-16 bg-[#FEF9C3] rounded-xl border-2 border-slate-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#000]">
            <Search size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-800 text-center font-black">{t('result.noMatchingPerfume')}</p>
          <p className="text-slate-500 text-sm text-center mt-1 font-medium">{t('result.retryAnalysis')}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

// 섹션 헤더 - 키치 스타일
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-yellow-400 border-2 border-slate-900 flex items-center justify-center text-white shadow-[2px_2px_0px_#000]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="text-[10px] text-slate-500 font-bold">{subtitle}</p>
      </div>
    </div>
  )
}

// 가이드 아이템 - 키치 스타일
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2 h-2 rounded-full bg-yellow-400 border border-slate-900 mt-1 flex-shrink-0" />
      <p className="text-slate-700 text-xs font-medium leading-relaxed">{text}</p>
    </div>
  )
}
