"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, Shirt, Palette, Sparkles, BookOpen, Clock, Tag, Droplets, FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ImageAnalysisResult } from "@/types/analysis"
import { CATEGORY_INFO } from "@/types/analysis"
import TraitRadarChart from "@/components/chart/TraitRadarChart"
import KeywordCloud from "@/components/chart/KeywordCloud"
import { ScentRecommendationCard } from "../ScentRecommendationCard"
import { useLocalizedPerfumes } from "@/hooks/useLocalizedPerfumes"

type SubTabType = 'perfume' | 'analysis'

interface CharacterScentChapterProps {
  characterName: string
  analysis: ImageAnalysisResult
  accentColor: 'violet' | 'pink'
  activeSubTab?: SubTabType
  /** lg+ 데스크탑 렌더링 시 하위 카드의 데스크탑 변형 활성화 (기본 false — 모바일 불변) */
  isDesktop?: boolean
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

// 카테고리 컬러 매핑 (PerfumeProfile.tsx 기존 스타일)
const categoryColors: Record<string, { bar: string; bg: string; border: string; text: string }> = {
  citrus: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  floral: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  woody: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  musky: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' },
  fruity: { bar: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  spicy: { bar: 'bg-[var(--soft)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]', text: 'text-[var(--muted-ink)]' }
}

export function CharacterScentChapter({
  analysis, activeSubTab, isDesktop = false,
}: CharacterScentChapterProps) {
  const t = useTranslations()
  const tLabels = useTranslations('labels')
  const { localizedPerfumes, getLocalizedName, getLocalizedKeywords } = useLocalizedPerfumes()
  const [internalSubTab, setInternalSubTab] = useState<SubTabType>('perfume')
  const subTab = activeSubTab || internalSubTab
  const perfume = analysis.matchingPerfumes[0]
  const persona = perfume?.persona
  const perfumeId = perfume?.perfumeId || persona?.id || ''
  const localizedPerfume = perfumeId
    ? localizedPerfumes.find((item) => item.id === perfumeId)
    : undefined
  const perfumeDisplayName = perfumeId
    ? getLocalizedName(perfumeId, persona?.name)
    : persona?.name || ''
  const perfumeKeywords = perfumeId
    ? getLocalizedKeywords(perfumeId)
    : persona?.keywords || []
  const mainScentName = localizedPerfume?.mainScent?.name || persona?.mainScent?.name || t('perfume.defaultTopNote')
  const middleScentName = localizedPerfume?.subScent1?.name || persona?.subScent1?.name || t('perfume.defaultMiddleNote')
  const baseScentName = localizedPerfume?.subScent2?.name || persona?.subScent2?.name || t('perfume.defaultBaseNote')

  const primaryColor = persona?.primaryColor || '#C8C8C8'
  const secondaryColor = persona?.secondaryColor || '#B1B1B1'
  const getCategoryLabel = (category: string) => tLabels(`categories.${category}`)

  return (
    <div className="px-4 space-y-5">
      {/* 서브탭 네비게이션 — activeSubTab이 없을 때만 내부 탭 표시 (fallback) */}
      {!activeSubTab && (
        <div className="bg-[var(--soft)] p-2 rounded-[6px] border border-[var(--line)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInternalSubTab('perfume')}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm lg:text-base transition-all rounded-[6px] border ${
                subTab === 'perfume'
                  ? 'text-[var(--ink)] bg-[var(--soft)] border-[var(--line)]'
                  : 'text-[var(--muted-ink)] bg-[var(--soft)]/50 border-transparent hover:bg-[var(--soft)]/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm lg:text-base">💎</span>
                <span className="font-medium text-xs lg:text-sm">{t('tabs.perfumeRecommend')}</span>
              </span>
            </button>
            <button
              onClick={() => setInternalSubTab('analysis')}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm lg:text-base transition-all rounded-[6px] border ${
                subTab === 'analysis'
                  ? 'text-[var(--ink)] bg-[var(--soft)] border-[var(--line)]'
                  : 'text-[var(--muted-ink)] bg-[var(--soft)]/50 border-transparent hover:bg-[var(--soft)]/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm lg:text-base">🔍</span>
                <span className="font-medium text-xs lg:text-sm">{t('tabs.analysisResult')}</span>
              </span>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {subTab === 'perfume' && (
          <motion.div
            key="perfume"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] px-5 divide-y divide-[var(--line)] [&>*]:py-5"
          >
            {/* ===== 1. 향수 헤더 카드 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            {persona && (
              <motion.div variants={fadeIn}>
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
                    {/* 추천 향수 뱃지 */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-2">
                      <span className="text-xs lg:text-sm">💎</span>
                      <span className="text-[10px] lg:text-[12px] font-medium text-[var(--ink)]">{t('result.recommendedPerfume')}</span>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight text-[var(--ink)]">
                      {persona.id || t('result.customPerfumeAlt')}
                    </h2>
                    <p className="text-sm lg:text-base mt-1 text-[var(--muted-ink)] mb-3">
                      {perfumeDisplayName}
                    </p>

                    {/* 매칭 점수 */}

                    {/* 키워드 - 키치 스타일 */}
                    {perfumeKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {perfumeKeywords.slice(0, 5).map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 text-[10px] lg:text-[12px] font-medium rounded-[6px] bg-[var(--soft)] border border-[var(--line)] text-[var(--muted-ink)]"
                          >
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 2. 향 노트 — PerfumeNotes.tsx 모바일 스타일 그대로 ===== */}
            {persona && (
              <motion.div variants={fadeIn}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                    <Droplets size={10} className="text-[var(--ink)]" />
                  </div>
                  <div>
                    <h3 className="text-xs lg:text-sm font-medium text-[var(--ink)]">{t('perfume.noteTitle')}</h3>
                    <p className="text-[9px] text-[var(--muted-ink)]">{t('perfume.noteSubtitle')}</p>
                  </div>
                </div>

                <div className="">
                  <div className="space-y-2">
                    {/* 탑노트 */}
                    <MobileNoteCard
                      type="TOP"
                      name={mainScentName}
                      description={persona.mainScent?.fanComment || t('perfume.defaultTopDesc')}
                      time={t('perfume.topTime')}
                      bgColor="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]"
                      accentColor="bg-[var(--soft)]"
                      textColor="text-[var(--ink)]"
                      timeColor="text-[var(--muted-ink)]"
                    />

                    {/* 미들노트 */}
                    <MobileNoteCard
                      type="HEART"
                      name={middleScentName}
                      description={persona.subScent1?.fanComment || t('perfume.defaultMiddleDesc')}
                      time={t('perfume.middleTime')}
                      bgColor="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]"
                      accentColor="bg-[var(--soft)]"
                      textColor="text-[var(--ink)]"
                      timeColor="text-[var(--muted-ink)]"
                    />

                    {/* 베이스노트 */}
                    <MobileNoteCard
                      type="BASE"
                      name={baseScentName}
                      description={persona.subScent2?.fanComment || t('perfume.defaultBaseDesc')}
                      time={t('perfume.baseTime')}
                      bgColor="bg-gradient-to-r from-[var(--soft)] to-[var(--line)]"
                      accentColor="bg-[var(--soft)]"
                      textColor="text-[var(--muted-ink)]"
                      timeColor="text-[var(--muted-ink)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 3. 향수 프로필 (바 차트) — PerfumeProfile.tsx 모바일 스타일 그대로 ===== */}
            {persona?.categories && (
              <motion.div variants={fadeIn}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                    <FlaskConical size={10} className="text-[var(--ink)]" />
                  </div>
                  <div>
                    <h3 className="text-xs lg:text-sm font-medium text-[var(--ink)]">{t('perfume.profileTitle')}</h3>
                    <p className="text-[9px] text-[var(--muted-ink)]">{t('perfume.profileSubtitle')}</p>
                  </div>
                </div>

                <div className="">
                  <div className="space-y-2">
                    {Object.entries(persona.categories)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, value], index) => {
                        const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
                        const colors = categoryColors[category] || {
                          bar: 'bg-[var(--soft)]',
                          bg: 'bg-[var(--soft)]',
                          border: 'border-[var(--line)]',
                          text: 'text-[var(--muted-ink)]'
                        }
                        const isMain = index === 0

                        return (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
                            className={`relative rounded-[6px] p-2 ${colors.bg} border ${colors.border} ${
                              isMain ? 'ring-2 ring-offset-1 ring-[var(--line)] border' : ''
                            }`}
                          >
                            {/* 메인 배지 */}
                            {isMain && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--soft)] rounded-full border border-[var(--line)] flex items-center justify-center text-[10px] lg:text-[12px]">
                                👑
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {/* 아이콘 + 이름 */}
                              <div className="flex items-center gap-1 min-w-[56px]">
                                <span className="text-sm lg:text-base">{info.icon}</span>
                                <span className={`text-[10px] lg:text-[12px] font-medium ${colors.text}`}>{getCategoryLabel(category)}</span>
                              </div>

                              {/* 동그라미 점 10개 */}
                              <div className="flex-grow flex items-center gap-[3px]">
                                {[...Array(10)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: i < (value as number) ? 1 : 0.4 }}
                                    transition={{ delay: 0.3 + i * 0.04, type: "spring", stiffness: 300 }}
                                    className={`w-2 h-2 rounded-full border ${
                                      i < (value as number)
                                        ? `${colors.bar} border-[var(--line)]`
                                        : 'bg-[var(--line)] border-[var(--line)]'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* 숫자 박스 */}
                              <div className={`flex-shrink-0 w-6 h-6 rounded-[6px] ${colors.bar} border border-[var(--line)] flex items-center justify-center`}>
                                <span className="text-[10px] lg:text-[12px] font-medium text-[var(--ink)]">
                                  {value as number}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                  </div>

                  {/* 메인 카테고리 요약 */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-3 pt-2 border-t-2 border-dashed border-[var(--line)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Sparkles size={12} className="text-[var(--muted-ink)]" />
                        <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">{t('perfume.mainCategory')}</span>
                      </div>
                      {(() => {
                        const mainCategory = Object.entries(persona.categories).sort(([, a], [, b]) => b - a)[0]
                        return (
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] px-2.5 py-1 rounded-full border border-[var(--line)]">
                            <span className="text-sm lg:text-base">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
                            <span className="text-xs lg:text-sm font-medium text-[var(--ink)]">
                              {getCategoryLabel(mainCategory[0])}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ===== 4. 향수 스토리 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            {perfume?.matchReason && (
              <motion.div variants={fadeIn}>
                <div className="">
                  <SectionHeader
                    icon={<Sparkles size={14} />}
                    title={t('perfume.perfumeStory')}
                    subtitle={t('perfume.expertReview')}
                  />
                  <div className="relative">
                    <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed italic font-medium">
                      &quot;{perfume.matchReason}&quot;
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 5. 사용 추천 + 계절/시간대 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            {persona?.recommendation && (
              <motion.div variants={fadeIn}>
                <div className="">
                  <SectionHeader
                    icon={<Clock size={14} />}
                    title={t('perfume.usageRecommend')}
                    subtitle={t('perfume.usageRecommendSubtitle')}
                  />
                  <div className="relative">
                    <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                      {persona.recommendation}
                    </p>
                  </div>
                  {/* 추천 계절/시간대 */}
                  <ScentRecommendationCard
                    recommendation={analysis.scentRecommendation}
                    isDesktop={isDesktop}
                  />
                </div>
              </motion.div>
            )}

            {/* ===== 6. 사용 가이드 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            <motion.div variants={fadeIn}>
              <div className="">
                <SectionHeader
                  icon={<BookOpen size={14} />}
                  title={t('perfume.usageGuide')}
                  subtitle={t('perfume.usageGuideSubtitle')}
                />
                <div className="space-y-3">
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
          </motion.div>
        )}

        {subTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] px-5 divide-y divide-[var(--line)] [&>*]:py-5"
          >
            {/* ===== 1. AI의 첫인상 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.analysis && (
              <motion.div variants={fadeIn}>
                <SectionHeader
                  icon={<MessageCircle size={14} />}
                  title={t('analysis.imageMood')}
                  subtitle={t('analysis.aiFirstImpression')}
                />
                <div className="relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm lg:text-base">💭</span>
                    </div>
                    <div>
                      <p className="text-[var(--muted-ink)] text-sm lg:text-base font-bold leading-relaxed">
                        &quot;{analysis.analysis.mood}&quot;
                      </p>
                      <p className="text-[var(--muted-ink)] text-xs lg:text-sm mt-2 font-medium">
                        @acscent_ai
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 2. 특성 레이더 차트 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            <motion.div variants={fadeIn} className="">
              <SectionHeader
                icon={<Sparkles size={14} />}
                title={t('analysis.traitScore')}
                subtitle={t('analysis.perfumeMatchKey')}
              />
              {analysis.traits && (
                <TraitRadarChart traits={analysis.traits} />
              )}
            </motion.div>

            {/* ===== 3. 스타일 분석 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.analysis && (
              <motion.div variants={fadeIn}>
                <SectionHeader
                  icon={<Shirt size={14} />}
                  title={t('analysis.styleAnalysis')}
                  subtitle={t('analysis.fashionExpression')}
                />
                <div className="space-y-3">
                  {analysis.analysis.style && (
                    <AnalysisCard
                      label="STYLE"
                      content={analysis.analysis.style}
                      accentColor="bg-[var(--soft)]"
                      bgColor="bg-[var(--soft)]"
                    />
                  )}
                  {analysis.analysis.expression && (
                    <AnalysisCard
                      label="EXPRESSION"
                      content={analysis.analysis.expression}
                      accentColor="bg-[var(--soft)]"
                      bgColor="bg-[var(--soft)]"
                    />
                  )}
                  {analysis.analysis.concept && (
                    <AnalysisCard
                      label="CONCEPT"
                      content={analysis.analysis.concept}
                      accentColor="bg-[var(--soft)]"
                      bgColor="bg-[var(--soft)]"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== 4. 매칭 키워드 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.matchingKeywords && analysis.matchingKeywords.length > 0 && (
              <motion.div variants={fadeIn} className="">
                <SectionHeader
                  icon={<Tag size={14} />}
                  title={t('analysis.matchingKeywords')}
                  subtitle={t('analysis.expressionWords')}
                />
                <KeywordCloud keywords={analysis.matchingKeywords} />
              </motion.div>
            )}

            {/* ===== 5. 퍼스널 컬러 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.personalColor && (
              <motion.div variants={fadeIn}>
                <SectionHeader
                  icon={<Palette size={14} />}
                  title={t('analysis.colorType')}
                  subtitle={t('analysis.imageColorAnalysis')}
                />
                <div className="">
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-[6px] flex-shrink-0 border border-[var(--line)]"
                      style={{
                        background: `linear-gradient(135deg, ${analysis.personalColor.palette?.[0] || '#fff'}, ${analysis.personalColor.palette?.[1] || '#f9f9f9'})`
                      }}
                    />
                    <div>
                      <div className="inline-flex px-3 py-1 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-2">
                        <span className="text-xs lg:text-sm font-medium text-[var(--ink)]">
                          {tLabels(`seasons.${analysis.personalColor.season}`)} {tLabels(`tones.${analysis.personalColor.tone}`)}
                        </span>
                      </div>
                      <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                        {analysis.personalColor.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {analysis.personalColor.palette?.map((color, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 rounded-[6px] border border-[var(--line)] transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== 섹션 헤더 — PerfumeTab/AnalysisTab 키치 스타일 그대로 =====
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

// ===== 가이드 아이템 — PerfumeTab 키치 스타일 그대로 =====
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2 h-2 rounded-full bg-[var(--soft)] border border-[var(--line)] mt-1 flex-shrink-0" />
      <p className="text-[var(--muted-ink)] text-xs lg:text-sm font-medium leading-relaxed">{text}</p>
    </div>
  )
}

// ===== 분석 카드 — AnalysisTab 키치 스타일 그대로 =====
function AnalysisCard({ label, content, accentColor, bgColor }: {
  label: string
  content: string
  accentColor: string
  bgColor: string
}) {
  return (
    <div className={`relative rounded-[6px] p-4 overflow-hidden ${bgColor} border border-[var(--line)]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
      <p className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider mb-1 pl-2">{label}</p>
      <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium pl-2">{content}</p>
    </div>
  )
}

// ===== 모바일 노트 카드 — PerfumeNotes.tsx 모바일 스타일 그대로 =====
function MobileNoteCard({
  type,
  name,
  description,
  time,
  bgColor,
  accentColor,
  textColor,
  timeColor
}: {
  type: string
  name: string
  description: string
  time: string
  bgColor: string
  accentColor: string
  textColor: string
  timeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${bgColor} rounded-[6px] p-2.5 overflow-hidden`}
    >
      {/* 좌측 액센트 바 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className="pl-2">
        {/* 상단: 타입 + 이름 + 시간 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-medium ${timeColor} tracking-wider`}>{type}</span>
            <span className={`text-[10px] lg:text-[12px] ${timeColor}`}>•</span>
            <span className={`text-xs lg:text-sm font-medium ${textColor}`}>{name}</span>
          </div>
          <span className={`text-[9px] font-medium ${timeColor}`}>{time}</span>
        </div>

        {/* 설명 */}
        <p className={`text-[11px] lg:text-[13px] leading-relaxed ${textColor} opacity-80`}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}
