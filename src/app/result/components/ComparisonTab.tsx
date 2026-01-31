"use client"

import React from 'react'
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

  // 【ㅇㅈ 포인트】, 【숨은 매력 발견】, 【갭 분석】, 【최종 향수 매칭】으로 분리
  const agreeMatch = text.match(/【ㅇㅈ 포인트】([\s\S]*?)(?=【|$)/)
  const hiddenMatch = text.match(/【숨은 매력 발견】([\s\S]*?)(?=【|$)/)
  const gapMatch = text.match(/【갭 분석】([\s\S]*?)(?=【|$)/)
  const finalMatch = text.match(/【최종 향수 매칭】([\s\S]*?)(?=【|$)/)

  if (agreeMatch) sections.agree = agreeMatch[1].trim()
  if (hiddenMatch) sections.hidden = hiddenMatch[1].trim()
  if (gapMatch) sections.gap = gapMatch[1].trim()
  if (finalMatch) sections.final = finalMatch[1].trim()

  return sections
}

export function ComparisonTab({ displayedAnalysis, isDesktop = false }: ComparisonTabProps) {
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
        <p className="text-slate-400 text-sm">비교 분석 데이터가 없습니다.</p>
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
          <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
            <SectionHeader
              icon={<Eye size={14} />}
              title="AI의 이미지 해석"
              subtitle="사진만 보고 느낀 첫인상"
            />
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 overflow-hidden border-2 border-blue-200 h-[calc(100%-48px)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap flex-1 font-medium">
                  {comparison.imageInterpretation}
                </p>
                <p className="text-indigo-600 text-xs mt-3 font-black">
                  - AI Vision System
                </p>
              </div>
            </div>
          </motion.div>

          {/* 유저 응답 요약 */}
          <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
            <SectionHeader
              icon={<User size={14} />}
              title="내가 본 이미지"
              subtitle="직접 선택한 매력 포인트"
            />
            <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 overflow-hidden border-2 border-purple-200 h-[calc(100%-48px)]">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap flex-1 font-medium">
                  {comparison.userInputSummary}
                </p>
                <p className="text-purple-600 text-xs mt-3 font-black">
                  - 내가 선택한 분석
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 비교 분석 상세 */}
        <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
          <SectionHeader
            icon={<Sparkles size={14} />}
            title="찰떡 조합의 비밀"
            subtitle="AI와 팬의 시선이 만나는 순간"
          />

          {/* 2x2 그리드로 분석 카드 배치 */}
          <div className="grid grid-cols-2 gap-4">
            {/* ㅇㅈ 포인트 */}
            {parsedReflection.agree && (
              <AnalysisCard
                icon={<CheckCircle2 size={16} />}
                badge="ㅇㅈ 포인트"
                badgeColor="bg-green-500"
                bgGradient="from-green-50 to-emerald-50"
                borderColor="border-green-200/50"
                content={parsedReflection.agree}
              />
            )}

            {/* 숨은 매력 발견 */}
            {parsedReflection.hidden && (
              <AnalysisCard
                icon={<Lightbulb size={16} />}
                badge="숨은 매력 발견"
                badgeColor="bg-amber-500"
                bgGradient="from-amber-50 to-yellow-50"
                borderColor="border-amber-200/50"
                content={parsedReflection.hidden}
              />
            )}

            {/* 갭 분석 */}
            {parsedReflection.gap && (
              <AnalysisCard
                icon={<GitCompare size={16} />}
                badge="갭 분석"
                badgeColor="bg-purple-500"
                bgGradient="from-purple-50 to-pink-50"
                borderColor="border-purple-200/50"
                content={parsedReflection.gap}
              />
            )}

            {/* 최종 향수 매칭 */}
            {parsedReflection.final && (
              <AnalysisCard
                icon={<Target size={16} />}
                badge="최종 향수 매칭"
                badgeColor="bg-rose-500"
                bgGradient="from-rose-50 to-pink-50"
                borderColor="border-rose-200/50"
                content={parsedReflection.final}
                highlight
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-[#FEF9C3] rounded-xl border-2 border-slate-900">
            <span>🎯</span>
            <span className="text-sm text-slate-800 font-black">AI + 팬 = 완벽한 향수 추천!</span>
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
      <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
        <SectionHeader
          icon={<Eye size={14} />}
          title="AI의 이미지 해석"
          subtitle="사진만 보고 느낀 첫인상"
        />
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 overflow-hidden border-2 border-blue-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-300/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {comparison.imageInterpretation}
            </p>
            <p className="text-indigo-600 text-xs mt-3 font-black">
              - AI Vision System
            </p>
          </div>
        </div>
      </motion.div>

      {/* 유저 응답 요약 */}
      <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
        <SectionHeader
          icon={<User size={14} />}
          title="내가 본 이미지"
          subtitle="직접 선택한 매력 포인트"
        />
        <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 overflow-hidden border-2 border-purple-200">
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-300/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {comparison.userInputSummary}
            </p>
            <p className="text-purple-600 text-xs mt-3 font-black">
              - 내가 선택한 분석
            </p>
          </div>
        </div>
      </motion.div>

      {/* 비교 분석 상세 */}
      <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
        <SectionHeader
          icon={<Sparkles size={14} />}
          title="찰떡 조합의 비밀"
          subtitle="AI와 팬의 시선이 만나는 순간"
        />

        <div className="space-y-3">
          {/* ㅇㅈ 포인트 */}
          {parsedReflection.agree && (
            <AnalysisCard
              icon={<CheckCircle2 size={16} />}
              badge="ㅇㅈ 포인트"
              badgeColor="bg-green-500"
              bgGradient="from-green-50 to-emerald-50"
              borderColor="border-green-200/50"
              content={parsedReflection.agree}
            />
          )}

          {/* 숨은 매력 발견 */}
          {parsedReflection.hidden && (
            <AnalysisCard
              icon={<Lightbulb size={16} />}
              badge="숨은 매력 발견"
              badgeColor="bg-amber-500"
              bgGradient="from-amber-50 to-yellow-50"
              borderColor="border-amber-200/50"
              content={parsedReflection.hidden}
            />
          )}

          {/* 갭 분석 */}
          {parsedReflection.gap && (
            <AnalysisCard
              icon={<GitCompare size={16} />}
              badge="갭 분석"
              badgeColor="bg-purple-500"
              bgGradient="from-purple-50 to-pink-50"
              borderColor="border-purple-200/50"
              content={parsedReflection.gap}
            />
          )}

          {/* 최종 향수 매칭 */}
          {parsedReflection.final && (
            <AnalysisCard
              icon={<Target size={16} />}
              badge="최종 향수 매칭"
              badgeColor="bg-rose-500"
              bgGradient="from-rose-50 to-pink-50"
              borderColor="border-rose-200/50"
              content={parsedReflection.final}
              highlight
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 px-3 py-2 bg-[#FEF9C3] rounded-xl border-2 border-slate-900">
          <span>🎯</span>
          <span className="text-xs text-slate-800 font-black">AI + 팬 = 완벽한 향수 추천!</span>
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
    <div className={`relative bg-gradient-to-br ${bgGradient} rounded-2xl p-4 overflow-hidden border-2 border-slate-200 ${highlight ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
      {/* 데코 패턴 */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${badgeColor} opacity-10 rounded-full blur-2xl`} />

      <div className="relative z-10">
        {/* 배지 헤더 - 키치 스타일 */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${badgeColor} text-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000]`}>
            {icon}
            <span className="text-xs font-black">{badge}</span>
          </div>
        </div>

        {/* 내용 */}
        <div className="bg-white/80 rounded-xl p-3 border border-slate-200">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium">
            {cleanedContent}
          </p>
        </div>
      </div>
    </div>
  )
}
