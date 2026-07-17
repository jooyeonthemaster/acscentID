"use client"

import React from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Eye, User, Sparkles, CheckCircle2, Lightbulb, GitCompare, Target } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'

interface ComparisonTabProps {
  displayedAnalysis: ImageAnalysisResult
  isDesktop?: boolean
}

interface ParsedReflection {
  agree: string
  hidden: string
  gap: string
  final: string
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

// reflectionDetails를 4개 섹션으로 파싱
function parseReflectionDetails(text: string): ParsedReflection {
  const sections = {
    agree: '',
    hidden: '',
    gap: '',
    final: ''
  }

  const bracketSections = Array.from(text.matchAll(/(?:【([^】]+)】|\[([^\]]+)\])([\s\S]*?)(?=(?:【[^】]+】|\[[^\]]+\])|$)/g))
    .map((match) => ({
      label: (match[1] || match[2] || '').trim().toLowerCase(),
      content: (match[3] || '').trim(),
    }))
    .filter((section) => section.label && section.content)

  const pick = (labels: string[]) => (
    bracketSections.find((section) => labels.some((label) => section.label.includes(label)))?.content || ''
  )

  sections.agree = pick([
    'ㅇㅈ', '일치', '공감', 'agree', 'agreement', 'match point',
    '一致', '共感', '同意', 'punto de acuerdo', 'coincidencia',
  ])
  sections.hidden = pick([
    '숨은', '차이', 'hidden', 'charm', 'difference',
    '隠れ', '魅力', '隐藏', '差异', 'encanto oculto',
  ])
  sections.gap = pick([
    '갭', '대조', 'gap', 'contrast',
    'ギャップ', '差距', '对比', 'brecha', 'contraste',
  ])
  sections.final = pick([
    '최종', '향수', 'final', 'perfume match', 'scent match',
    '最終', '香水', '最终', '匹配', 'match final',
  ])

  if (!sections.agree && !sections.hidden && !sections.gap && !sections.final) {
    if (bracketSections.length >= 4) {
      sections.agree = bracketSections[0].content
      sections.hidden = bracketSections[1].content
      sections.gap = bracketSections[2].content
      sections.final = bracketSections[3].content
    } else {
      sections.final = text.trim()
    }
  }

  return sections
}

export function ComparisonTab({ displayedAnalysis, isDesktop = false }: ComparisonTabProps) {
  const t = useTranslations('comparison')
  const comparison = displayedAnalysis.comparisonAnalysis

  // comparisonAnalysis가 없으면 기본 메시지 표시
  if (!comparison) {
    return (
      <motion.div
        key="comparison"
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        className={`text-center ${isDesktop ? 'py-12' : 'py-8'}`}
      >
        <p className="text-[#8B8578] text-sm lg:text-base">{t('noComparisonData')}</p>
      </motion.div>
    )
  }

  // reflectionDetails 파싱
  const parsedReflection = parseReflectionDetails(comparison.reflectionDetails)

  // PC: 2컬럼 그리드 레이아웃
  if (isDesktop) {
    return (
      <motion.div
        key="comparison"
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-6"
      >
        {/* 2컬럼: AI 해석 + 유저 요약 */}
        <div className="grid grid-cols-2 gap-6">
          {/* AI 이미지 해석 */}
          <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-5 border-2 border-[#D8CFBB]">
            <SectionHeader
              icon={<Eye size={14} />}
              title={t('aiImageInterpretation')}
              subtitle={t('aiImageSubtitle')}
            />
            <div className="relative bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 overflow-hidden border-2 border-[#D8CFBB] h-[calc(100%-48px)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-stone-300/20 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-wrap flex-1 font-medium">
                  {comparison.imageInterpretation}
                </p>
                <p className="text-[#5C564A] text-xs lg:text-sm mt-3 font-black">
                  - AI Vision System
                </p>
              </div>
            </div>
          </motion.div>

          {/* 유저 응답 요약 */}
          <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-5 border-2 border-[#D8CFBB]">
            <SectionHeader
              icon={<User size={14} />}
              title={t('myImageView')}
              subtitle={t('myImageSubtitle')}
            />
            <div className="relative bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 overflow-hidden border-2 border-[#D8CFBB] h-[calc(100%-48px)]">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-stone-300/20 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-wrap flex-1 font-medium">
                  {comparison.userInputSummary}
                </p>
                <p className="text-[#5C564A] text-xs lg:text-sm mt-3 font-black">
                  - {t('myAnalysis')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 비교 분석 상세 */}
        <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-5 border-2 border-[#D8CFBB]">
          <SectionHeader
            icon={<Sparkles size={14} />}
            title={t('matchSecret')}
            subtitle={t('matchSecretSubtitle')}
          />

          {/* 2x2 그리드로 분석 카드 배치 */}
          <div className="grid grid-cols-2 gap-4">
            {/* ㅇㅈ 포인트 */}
            {parsedReflection.agree && (
              <AnalysisCard
                icon={<CheckCircle2 size={16} />}
                badge={t('agreePoint')}
                badgeColor="bg-[#EFE4C8]"
                bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
                borderColor="border-stone-200/50"
                content={parsedReflection.agree}
              />
            )}

            {/* 숨은 매력 발견 */}
            {parsedReflection.hidden && (
              <AnalysisCard
                icon={<Lightbulb size={16} />}
                badge={t('hiddenCharm')}
                badgeColor="bg-[#EFE4C8]"
                bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
                borderColor="border-stone-200/50"
                content={parsedReflection.hidden}
              />
            )}

            {/* 갭 분석 */}
            {parsedReflection.gap && (
              <AnalysisCard
                icon={<GitCompare size={16} />}
                badge={t('gapAnalysis')}
                badgeColor="bg-[#EFE4C8]"
                bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
                borderColor="border-stone-200/50"
                content={parsedReflection.gap}
              />
            )}

            {/* 최종 향수 매칭 */}
            {parsedReflection.final && (
              <AnalysisCard
                icon={<Target size={16} />}
                badge={t('finalPerfumeMatch')}
                badgeColor="bg-[#EFE4C8]"
                bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
                borderColor="border-stone-200/50"
                content={parsedReflection.final}
                highlight
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-[#EDE5D2] rounded-[12px] border-2 border-[#D8CFBB]">
            <span>🎯</span>
            <span className="text-sm lg:text-base text-[#1A1610] font-black">{t('aiFanFormula')}</span>
            <span>✨</span>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // 모바일: 키치 스타일
  return (
    <motion.div
      key="comparison"
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-5"
    >
      {/* AI 이미지 해석 */}
      <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB]">
        <SectionHeader
          icon={<Eye size={14} />}
          title={t('aiImageInterpretation')}
          subtitle={t('aiImageSubtitle')}
        />
        <div className="relative bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 overflow-hidden border-2 border-[#D8CFBB]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-wrap font-medium">
              {comparison.imageInterpretation}
            </p>
            <p className="text-[#5C564A] text-xs lg:text-sm mt-3 font-black">
              - AI Vision System
            </p>
          </div>
        </div>
      </motion.div>

      {/* 유저 응답 요약 */}
      <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB]">
        <SectionHeader
          icon={<User size={14} />}
          title={t('myImageView')}
          subtitle={t('myImageSubtitle')}
        />
        <div className="relative bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] rounded-[12px] p-4 overflow-hidden border-2 border-[#D8CFBB]">
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-wrap font-medium">
              {comparison.userInputSummary}
            </p>
            <p className="text-[#5C564A] text-xs lg:text-sm mt-3 font-black">
              - {t('myAnalysis')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 비교 분석 상세 */}
      <motion.div variants={fadeIn} className="bg-[#F5EFE2] rounded-[12px] p-4 border-2 border-[#D8CFBB]">
        <SectionHeader
          icon={<Sparkles size={14} />}
          title={t('matchSecret')}
          subtitle={t('matchSecretSubtitle')}
        />

        <div className="space-y-3">
          {/* ㅇㅈ 포인트 */}
          {parsedReflection.agree && (
            <AnalysisCard
              icon={<CheckCircle2 size={16} />}
              badge={t('agreePoint')}
              badgeColor="bg-[#EFE4C8]"
              bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
              borderColor="border-stone-200/50"
              content={parsedReflection.agree}
            />
          )}

          {/* 숨은 매력 발견 */}
          {parsedReflection.hidden && (
            <AnalysisCard
              icon={<Lightbulb size={16} />}
              badge={t('hiddenCharm')}
              badgeColor="bg-[#EFE4C8]"
              bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
              borderColor="border-stone-200/50"
              content={parsedReflection.hidden}
            />
          )}

          {/* 갭 분석 */}
          {parsedReflection.gap && (
            <AnalysisCard
              icon={<GitCompare size={16} />}
              badge={t('gapAnalysis')}
              badgeColor="bg-[#EFE4C8]"
              bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
              borderColor="border-stone-200/50"
              content={parsedReflection.gap}
            />
          )}

          {/* 최종 향수 매칭 */}
          {parsedReflection.final && (
            <AnalysisCard
              icon={<Target size={16} />}
              badge={t('finalPerfumeMatch')}
              badgeColor="bg-[#EFE4C8]"
              bgGradient="from-[#FDFAF1] to-[#FDFAF1]"
              borderColor="border-stone-200/50"
              content={parsedReflection.final}
              highlight
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 px-3 py-2 bg-[#EDE5D2] rounded-[12px] border-2 border-[#D8CFBB]">
          <span>🎯</span>
          <span className="text-xs lg:text-sm text-[#1A1610] font-black">{t('aiFanFormula')}</span>
          <span>✨</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// 섹션 헤더 컴포넌트 - 키치 스타일
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-[12px] bg-[#EFE4C8] border-2 border-[#D8CFBB] flex items-center justify-center text-[#1A1610]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm lg:text-base font-black text-[#1A1610]">{title}</h3>
        <p className="text-[10px] lg:text-[12px] text-[#8B8578] font-bold">{subtitle}</p>
      </div>
    </div>
  )
}

// \n 리터럴 문자열을 실제 줄바꿈으로 변환
function cleanContent(text: string): string {
  return text
    .replace(/\\n\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim()
}

// 분석 카드 컴포넌트 - 키치 스타일
function AnalysisCard({
  icon,
  badge,
  badgeColor,
  bgGradient,
  borderColor,
  content,
  highlight = false
}: {
  icon: React.ReactNode
  badge: string
  badgeColor: string
  bgGradient: string
  borderColor: string
  content: string
  highlight?: boolean
}) {
  const cleanedContent = cleanContent(content)

  return (
    <div className={`relative bg-gradient-to-br ${bgGradient} rounded-[12px] p-4 overflow-hidden border-2 border-[#D8CFBB] ${highlight ? 'ring-2 ring-[#C9BFA8] ring-offset-1' : ''}`}>
      {/* 데코 패턴 */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${badgeColor} opacity-10 rounded-full blur-2xl`} />

      <div className="relative z-10">
        {/* 배지 헤더 - 키치 스타일 */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${badgeColor} text-[#1A1610] rounded-[12px] border-2 border-[#D8CFBB]`}>
            {icon}
            <span className="text-xs lg:text-sm font-black">{badge}</span>
          </div>
        </div>

        {/* 내용 */}
        <div className="bg-[#F5EFE2]/80 rounded-[12px] p-3 border border-[#D8CFBB]">
          <p className="text-[#5C564A] text-sm lg:text-base leading-relaxed whitespace-pre-line font-medium">
            {cleanedContent}
          </p>
        </div>
      </div>
    </div>
  )
}
