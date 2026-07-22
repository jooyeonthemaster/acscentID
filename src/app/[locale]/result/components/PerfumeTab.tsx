"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, Clock, BookOpen, Search, Gem } from 'lucide-react'
import { ImageAnalysisResult, PerfumePersona } from '@/types/analysis'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
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
  const { localizedPerfumes, getLocalizedName, getLocalizedKeywords } = useLocalizedPerfumes()

  const localizePersona = (persona: PerfumePersona | undefined, perfumeId?: string): PerfumePersona | undefined => {
    if (!persona) return persona
    const localizedPerfume = localizedPerfumes.find((perfume) => perfume.id === perfumeId)
    if (!perfumeId && !localizedPerfume) return persona

    return {
      ...persona,
      name: perfumeId ? getLocalizedName(perfumeId, persona.name) : persona.name,
      description: localizedPerfume?.description || persona.description,
      keywords: perfumeId ? getLocalizedKeywords(perfumeId) : persona.keywords,
      mood: localizedPerfume?.mood || persona.mood,
      personality: localizedPerfume?.personality || persona.personality,
      mainScent: persona.mainScent
        ? { ...persona.mainScent, name: localizedPerfume?.mainScent?.name || persona.mainScent.name }
        : persona.mainScent,
      subScent1: persona.subScent1
        ? { ...persona.subScent1, name: localizedPerfume?.subScent1?.name || persona.subScent1.name }
        : persona.subScent1,
      subScent2: persona.subScent2
        ? { ...persona.subScent2, name: localizedPerfume?.subScent2?.name || persona.subScent2.name }
        : persona.subScent2,
    }
  }

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
            const persona = localizePersona(match.persona, match.perfumeId);
            const primaryColor = persona?.primaryColor || '#C8C8C8';
            const secondaryColor = persona?.secondaryColor || '#B1B1B1';

            return (
              <motion.div key={index} variants={fadeIn} className="space-y-6">
                {/* 향수 헤더 카드 - PC용 확장 (키치 스타일) */}
                <div className="relative rounded-[6px] p-6 bg-[var(--soft)] overflow-hidden border border-[var(--line)]">
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
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-3">
                      <Gem size={14} className="text-[var(--muted-ink)]" strokeWidth={2} />
                      <span className="text-sm lg:text-sm font-bold text-[var(--ink)]">{t('result.recommendedPerfume')}</span>
                    </div>
                    <h2 className="text-3xl font-bold leading-tight text-[var(--ink)] mb-2">
                      {persona?.id || t('result.customPerfumeAlt')}
                    </h2>
                    <p className="text-base text-[var(--muted-ink)] mb-4">
                      {persona?.name || ''}
                    </p>

                    {/* 키워드 - 키치 스타일 */}
                    {persona?.keywords && (
                      <div className="flex flex-wrap gap-2">
                        {persona.keywords.slice(0, 6).map((keyword, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 text-sm lg:text-sm font-bold rounded-[6px] bg-[var(--soft)] border border-[var(--line)] text-[var(--muted-ink)]"
                          >
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 세로 배치: 향 노트 */}
                <div className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
                  <PerfumeNotes persona={persona} isDesktop={true} />
                </div>

                {/* 세로 배치: 향수 프로필 */}
                <div className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
                  <PerfumeProfile persona={persona} isDesktop={true} />
                </div>

                {/* 향수 스토리 */}
                {match.matchReason && (
                  <div className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
                    <SectionHeader
                      icon={<Sparkles size={14} />}
                      title={t('perfume.perfumeStory')}
                      subtitle={t('perfume.expertReview')}
                    />
                    <div className="relative bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 overflow-hidden border border-[var(--line)]">
                      <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium italic">
                        &quot;{match.matchReason}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* 사용 추천 */}
                {persona?.recommendation && (
                  <div className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
                    <SectionHeader
                      icon={<Clock size={14} />}
                      title={t('perfume.usageRecommend')}
                      subtitle={t('perfume.usageRecommendSubtitle')}
                    />
                    <div className="relative bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 overflow-hidden border border-[var(--line)]">
                      <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                        {persona.recommendation}
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
                <div className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
                  <SectionHeader
                    icon={<BookOpen size={14} />}
                    title={t('perfume.usageGuide')}
                    subtitle={t('perfume.usageGuideSubtitle')}
                  />
                  <div className="bg-[var(--soft)] rounded-[6px] p-4 space-y-3 border border-[var(--line)]">
                    {persona?.usageGuide?.tips && persona.usageGuide.tips.length > 0 ? (
                      persona.usageGuide.tips.map((tip, i) => (
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
            className="flex flex-col items-center justify-center py-16 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]"
          >
            <div className="w-20 h-20 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] flex items-center justify-center mb-4">
              <Search size={28} className="text-[var(--muted-ink)]" />
            </div>
            <p className="text-[var(--ink)] text-center font-bold text-lg">{t('result.noMatchingPerfume')}</p>
            <p className="text-[var(--muted-ink)] text-sm lg:text-base text-center mt-1 font-medium">{t('result.retryAnalysis')}</p>
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
          const persona = localizePersona(match.persona, match.perfumeId);
          const primaryColor = persona?.primaryColor || '#C8C8C8';
          const secondaryColor = persona?.secondaryColor || '#B1B1B1';

          return (
            <motion.div key={index} variants={fadeIn}>
              {/* 섹션 — 개별 박스 없이 가로선으로만 구분.
                  부모 탭 컨테이너가 이미 #F5EFE2 라 배경을 다시 깔 필요가 없다. */}
              <div className="divide-y divide-[var(--line)] [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              {/* 향수 헤더 — 박스 대신 향수 색상 워시만 남긴다 */}
              <div className="relative overflow-hidden">
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
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-2">
                    <Gem size={14} className="text-[var(--muted-ink)]" strokeWidth={2} />
                    <span className="text-[12px] lg:text-[12px] font-medium text-[var(--ink)]">{t('result.recommendedPerfume')}</span>
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-[var(--ink)]">
                    {persona?.id || t('result.customPerfumeAlt')}
                  </h2>
                  <p className="text-sm lg:text-base mt-1 text-[var(--muted-ink)] mb-3">
                    {persona?.name || ''}
                  </p>

                  {/* 키워드 - 키치 스타일 */}
                  {persona?.keywords && (
                    <div className="flex flex-wrap gap-1.5">
                      {persona.keywords.slice(0, 5).map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-[12px] lg:text-[12px] font-medium rounded-[6px] bg-[var(--soft)] border border-[var(--line)] text-[var(--muted-ink)]"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 향 노트 */}
              <div><PerfumeNotes persona={persona} /></div>

              {/* 향수 프로필 */}
              <div><PerfumeProfile persona={persona} /></div>

              {/* 향수 스토리 */}
              {match.matchReason && (
                <div>
                  <SectionHeader
                    icon={<Sparkles size={14} />}
                    title={t('perfume.perfumeStory')}
                    subtitle={t('perfume.expertReview')}
                  />
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed italic font-medium">
                    &quot;{match.matchReason}&quot;
                  </p>
                </div>
              )}

              {/* 사용 추천 */}
              {persona?.recommendation && (
                <div>
                  <SectionHeader
                    icon={<Clock size={14} />}
                    title={t('perfume.usageRecommend')}
                    subtitle={t('perfume.usageRecommendSubtitle')}
                  />
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                    {persona.recommendation}
                  </p>
                  {/* 추천 계절/시간대 */}
                  <ScentRecommendationCard
                    recommendation={displayedAnalysis.scentRecommendation}
                    isDesktop={false}
                  />
                </div>
              )}

              {/* 사용 가이드 */}
              <div>
                <SectionHeader
                  icon={<BookOpen size={14} />}
                  title={t('perfume.usageGuide')}
                  subtitle={t('perfume.usageGuideSubtitle')}
                />
                <div className="space-y-3">
                  {persona?.usageGuide?.tips && persona.usageGuide.tips.length > 0 ? (
                    // AI 생성 주접 가이드가 있으면 표시
                    persona.usageGuide.tips.map((tip, i) => (
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
              </div>
            </motion.div>
          );
        })
      ) : (
        <motion.div
          variants={fadeIn}
          className="flex flex-col items-center justify-center py-12 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]"
        >
          <div className="w-16 h-16 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] flex items-center justify-center mb-4">
            <Search size={24} className="text-[var(--muted-ink)]" />
          </div>
          <p className="text-[var(--ink)] text-center font-bold">{t('result.noMatchingPerfume')}</p>
          <p className="text-[var(--muted-ink)] text-sm lg:text-base text-center mt-1 font-medium">{t('result.retryAnalysis')}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

// 섹션 헤더 - 키치 스타일
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-[var(--muted-ink)]">
        {icon}
        <p className="text-[11px] lg:text-[12px] font-medium uppercase tracking-[0.12em]">{subtitle}</p>
      </div>
      <h3 className="mt-1 text-[19px] lg:text-[21px] font-bold tracking-[-0.01em] text-[var(--ink)]">{title}</h3>
    </div>
  )
}

// 가이드 아이템 - 키치 스타일
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2 h-2 rounded-full bg-[var(--soft)] border border-[var(--line)] mt-1 flex-shrink-0" />
      <p className="text-[var(--muted-ink)] text-sm lg:text-sm font-medium leading-relaxed">{text}</p>
    </div>
  )
}
