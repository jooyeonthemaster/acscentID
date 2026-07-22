"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { MessageCircle, Palette, Tag, Shirt, Sparkles } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import TraitRadarChart from '@/components/chart/TraitRadarChart'
import KeywordCloud from '@/components/chart/KeywordCloud'

interface AnalysisTabProps {
  displayedAnalysis: ImageAnalysisResult
  isDesktop?: boolean
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export function AnalysisTab({ displayedAnalysis, isDesktop = false }: AnalysisTabProps) {
  const t = useTranslations('analysis')
  const tLabels = useTranslations('labels')

  // PC: 1컬럼 세로 레이아웃 (블로그 포스팅 스타일)
  if (isDesktop) {
    return (
      <motion.div
        key="analysis"
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-6"
      >
        {/* 이미지 분위기 */}
        {displayedAnalysis.analysis && (
          <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
            <SectionHeader
              icon={<MessageCircle size={14} />}
              title={t('imageMood')}
              subtitle={t('aiFirstImpression')}
            />
            <div className="relative bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 overflow-hidden border border-[var(--line)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={15} className="text-[var(--muted-ink)]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base font-bold leading-relaxed">
                    &quot;{displayedAnalysis.analysis.mood}&quot;
                  </p>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-sm mt-2 font-bold">
                    @acscent_ai
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 스타일 분석 */}
        {displayedAnalysis.analysis && (
          <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
            <SectionHeader
              icon={<Shirt size={14} />}
              title={t('styleAnalysis')}
              subtitle={t('fashionExpression')}
            />
            <div className="space-y-3">
              {displayedAnalysis.analysis.style && (
                <AnalysisCard
                  label={t('style')}
                  content={displayedAnalysis.analysis.style}
                  accentColor="bg-[var(--soft)]"
                  bgColor="bg-[var(--soft)]"
                />
              )}
              {displayedAnalysis.analysis.expression && (
                <AnalysisCard
                  label={t('expression')}
                  content={displayedAnalysis.analysis.expression}
                  accentColor="bg-[var(--soft)]"
                  bgColor="bg-[var(--soft)]"
                />
              )}
              {displayedAnalysis.analysis.concept && (
                <AnalysisCard
                  label={t('concept')}
                  content={displayedAnalysis.analysis.concept}
                  accentColor="bg-[var(--soft)]"
                  bgColor="bg-[var(--soft)]"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* 특성 레이더 차트 */}
        <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
          <SectionHeader
            icon={<Sparkles size={14} />}
            title={t('traitScore')}
            subtitle={t('perfumeMatchKey')}
          />
          {displayedAnalysis.traits && (
            <div className="flex justify-center">
              <TraitRadarChart traits={displayedAnalysis.traits} />
            </div>
          )}
        </motion.div>

        {/* 매칭 키워드 */}
        {displayedAnalysis.matchingKeywords && displayedAnalysis.matchingKeywords.length > 0 && (
          <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
            <SectionHeader
              icon={<Tag size={14} />}
              title={t('matchingKeywords')}
              subtitle={t('expressionWords')}
            />
            <KeywordCloud keywords={displayedAnalysis.matchingKeywords} />
          </motion.div>
        )}

        {/* 퍼스널 컬러 */}
        {displayedAnalysis.personalColor && (
          <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
            <SectionHeader
              icon={<Palette size={14} />}
              title={t('colorType')}
              subtitle={t('imageColorAnalysis')}
            />
            <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-14 h-14 rounded-[6px] flex-shrink-0 border border-[var(--line)]"
                  style={{
                    background: `linear-gradient(135deg, ${displayedAnalysis.personalColor.palette?.[0] || '#fff'}, ${displayedAnalysis.personalColor.palette?.[1] || '#f9f9f9'})`
                  }}
                />
                <div>
                  <div className="inline-flex px-3 py-1 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-2">
                    <span className="text-sm lg:text-sm font-bold text-[var(--ink)]">
                      {tLabels(`seasons.${displayedAnalysis.personalColor.season}`)} {tLabels(`tones.${displayedAnalysis.personalColor.tone}`)}
                    </span>
                  </div>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                    {displayedAnalysis.personalColor.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {displayedAnalysis.personalColor.palette?.map((color, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-[6px] border border-[var(--line)] transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // 모바일: 키치 스타일
  return (
    <motion.div
      key="analysis"
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-5"
    >
      {/* 이미지 분위기 */}
      {displayedAnalysis.analysis && (
        <motion.div variants={fadeIn}>
          <SectionHeader
            icon={<MessageCircle size={14} />}
            title={t('imageMood')}
            subtitle={t('aiFirstImpression')}
          />
          <div className="relative bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 overflow-hidden border border-[var(--line)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center flex-shrink-0">
                <MessageCircle size={15} className="text-[var(--muted-ink)]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[var(--muted-ink)] text-sm lg:text-base font-bold leading-relaxed">
                  &quot;{displayedAnalysis.analysis.mood}&quot;
                </p>
                <p className="text-[var(--muted-ink)] text-sm lg:text-sm mt-2 font-bold">
                  @acscent_ai
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 특성 레이더 차트 */}
      <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
        <SectionHeader
          icon={<Sparkles size={14} />}
          title={t('traitScore')}
          subtitle={t('perfumeMatchKey')}
        />
        {displayedAnalysis.traits && (
          <TraitRadarChart traits={displayedAnalysis.traits} />
        )}
      </motion.div>

      {/* 스타일 분석 */}
      {displayedAnalysis.analysis && (
        <motion.div variants={fadeIn}>
          <SectionHeader
            icon={<Shirt size={14} />}
            title={t('styleAnalysis')}
            subtitle={t('fashionExpression')}
          />
          <div className="space-y-3">
            {displayedAnalysis.analysis.style && (
              <AnalysisCard
                label={t('style')}
                content={displayedAnalysis.analysis.style}
                accentColor="bg-[var(--soft)]"
                bgColor="bg-[var(--soft)]"
              />
            )}
            {displayedAnalysis.analysis.expression && (
              <AnalysisCard
                label={t('expression')}
                content={displayedAnalysis.analysis.expression}
                accentColor="bg-[var(--soft)]"
                bgColor="bg-[var(--soft)]"
              />
            )}
            {displayedAnalysis.analysis.concept && (
              <AnalysisCard
                label={t('concept')}
                content={displayedAnalysis.analysis.concept}
                accentColor="bg-[var(--soft)]"
                bgColor="bg-[var(--soft)]"
              />
            )}
          </div>
        </motion.div>
      )}

      {/* 매칭 키워드 */}
      {displayedAnalysis.matchingKeywords && displayedAnalysis.matchingKeywords.length > 0 && (
        <motion.div variants={fadeIn} className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
          <SectionHeader
            icon={<Tag size={14} />}
            title={t('matchingKeywords')}
            subtitle={t('expressionWords')}
          />
          <KeywordCloud keywords={displayedAnalysis.matchingKeywords} />
        </motion.div>
      )}

      {/* 퍼스널 컬러 */}
      {displayedAnalysis.personalColor && (
        <motion.div variants={fadeIn}>
          <SectionHeader
            icon={<Palette size={14} />}
            title={t('colorType')}
            subtitle={t('imageColorAnalysis')}
          />
          <div className="bg-[var(--soft)] rounded-[6px] p-4 border border-[var(--line)]">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-[6px] flex-shrink-0 border border-[var(--line)]"
                style={{
                  background: `linear-gradient(135deg, ${displayedAnalysis.personalColor.palette?.[0] || '#fff'}, ${displayedAnalysis.personalColor.palette?.[1] || '#f9f9f9'})`
                }}
              />
              <div>
                <div className="inline-flex px-3 py-1 bg-[var(--soft)] rounded-[6px] border border-[var(--line)] mb-2">
                  <span className="text-sm lg:text-sm font-bold text-[var(--ink)]">
                    {tLabels(`seasons.${displayedAnalysis.personalColor.season}`)} {tLabels(`tones.${displayedAnalysis.personalColor.tone}`)}
                  </span>
                </div>
                <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium">
                  {displayedAnalysis.personalColor.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {displayedAnalysis.personalColor.palette?.map((color, index) => (
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
  )
}

// 섹션 헤더 컴포넌트 - 키치 스타일
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

// 분석 카드 컴포넌트 - 키치 스타일
function AnalysisCard({ label, content, accentColor, bgColor }: {
  label: string
  content: string
  accentColor: string
  bgColor: string
}) {
  return (
    <div className={`relative rounded-[6px] p-4 overflow-hidden ${bgColor} border border-[var(--line)]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
      <p className="text-[12px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider mb-1 pl-2">{label}</p>
      <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed font-medium pl-2">{content}</p>
    </div>
  )
}
