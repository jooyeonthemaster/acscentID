"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Clock, BookOpen, Search } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/analysis'
import { PerfumeNotes } from './PerfumeNotes'
import { PerfumeProfile } from './PerfumeProfile'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface PerfumeTabProps {
  displayedAnalysis: ImageAnalysisResult
  isDesktop?: boolean
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export function PerfumeTab({ displayedAnalysis, isDesktop = false }: PerfumeTabProps) {
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
                {/* 향수 헤더 카드 - PC용 확장 */}
                <div
                  className="relative rounded-2xl p-6 bg-white overflow-hidden border-2"
                  style={{
                    borderColor: primaryColor,
                    boxShadow: `0 8px 32px -8px ${primaryColor}40`
                  }}
                >
                  {/* 데코 패턴 */}
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-3xl opacity-15"
                    style={{ backgroundColor: secondaryColor }}
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    {/* 좌측: 향수 정보 */}
                    <div className="flex-1">
                      <Badge
                        className="border-0 mb-3 text-xs font-bold text-slate-700"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        추천 향수
                      </Badge>
                      <h2 className="text-3xl font-black leading-tight text-slate-800 mb-2">
                        {match.persona?.id || '맞춤 향수'}
                      </h2>
                      <p className="text-base text-slate-600 mb-4">
                        {match.persona?.name || ''}
                      </p>

                      {/* 키워드 */}
                      {match.persona?.keywords && (
                        <div className="flex flex-wrap gap-2">
                          {match.persona.keywords.slice(0, 6).map((keyword, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 text-xs font-medium rounded-full text-slate-700"
                              style={{
                                backgroundColor: `${primaryColor}20`,
                                border: `1px solid ${primaryColor}40`
                              }}
                            >
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 우측: 매칭률 */}
                    <div className="relative flex flex-col items-center ml-6">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.2)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth="3"
                            strokeDasharray={`${Math.round(match.score * 100)} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-bold text-lg text-slate-800">
                            {Math.round(match.score * 100)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-xs mt-2 text-slate-500 font-medium">매칭률</span>
                    </div>
                  </div>
                </div>

                {/* 2컬럼 그리드: 향 노트 + 향수 프로필 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/40 rounded-2xl p-5 border border-slate-100">
                    <PerfumeNotes persona={match.persona} />
                  </div>
                  <div className="bg-white/40 rounded-2xl p-5 border border-slate-100">
                    <PerfumeProfile persona={match.persona} />
                  </div>
                </div>

                {/* 2컬럼 그리드: 향수 스토리 + 사용 추천 */}
                <div className="grid grid-cols-2 gap-6">
                  {/* 향수 스토리 */}
                  {match.matchReason && (
                    <div className="bg-white/40 rounded-2xl p-5 border border-slate-100">
                      <SectionHeader
                        icon={<Sparkles size={14} />}
                        title="향수 스토리"
                        subtitle="전문가 평가"
                      />
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-400/30">
                            <span className="text-lg">💬</span>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed italic">
                            &quot;{match.matchReason}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 사용 추천 */}
                  {match.persona?.recommendation && (
                    <div className="bg-white/40 rounded-2xl p-5 border border-slate-100">
                      <SectionHeader
                        icon={<Clock size={14} />}
                        title="사용 추천"
                        subtitle="이 향기와 함께하면 완벽!"
                      />
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200/50">
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {match.persona.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 사용 가이드 - 전체 너비 */}
                <div className="bg-white/40 rounded-2xl p-5 border border-slate-100">
                  <SectionHeader
                    icon={<BookOpen size={14} />}
                    title="사용 가이드"
                    subtitle="우리 애와 함께하는 향수 팁"
                  />
                  <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-4">
                    {match.persona?.usageGuide?.tips && match.persona.usageGuide.tips.length > 0 ? (
                      match.persona.usageGuide.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                          <p className="text-slate-600 text-xs leading-relaxed">{tip}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                          <p className="text-slate-600 text-xs leading-relaxed">손목에 뿌리고 귀 뒤에 살짝 톡톡! 우리 애 생각하면서 향기 맡으면 행복 두 배!</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                          <p className="text-slate-600 text-xs leading-relaxed">옷보다 피부에 직접! 체온으로 향이 퍼지면서 우리 애의 따뜻한 매력이 느껴지는 느낌!</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                          <p className="text-slate-600 text-xs leading-relaxed">문지르지 말고 자연 건조! 향의 레이어가 살아있어야 다채로운 매력이 시간별로 펼쳐짐!</p>
                        </div>
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
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-center font-medium text-lg">매칭된 향수가 없습니다.</p>
            <p className="text-slate-400 text-sm text-center mt-1">다시 분석해보세요!</p>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // 모바일: 기존 레이아웃 유지
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
              {/* 향수 헤더 카드 */}
              <div
                className="relative rounded-2xl p-5 bg-white overflow-hidden border-2"
                style={{
                  borderColor: primaryColor,
                  boxShadow: `0 8px 32px -8px ${primaryColor}40`
                }}
              >
                {/* 컬러풀한 데코 - 향수 색상 사용 */}
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-15"
                  style={{ backgroundColor: secondaryColor }}
                />

                <div className="relative z-10">
                  {/* 상단: ID + 매칭률 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge
                        className="border-0 mb-2 text-[10px] font-bold text-slate-700"
                        style={{
                          backgroundColor: `${primaryColor}20`
                        }}
                      >
                        추천 향수
                      </Badge>
                      <h2 className="text-2xl font-black leading-tight text-slate-800">
                        {match.persona?.id || '맞춤 향수'}
                      </h2>
                      <p className="text-sm mt-1 text-slate-600">
                        {match.persona?.name || ''}
                      </p>
                    </div>

                    {/* 매칭률 원형 - 향수 색상 */}
                    <div className="relative flex flex-col items-center">
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.2)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth="2.5"
                            strokeDasharray={`${Math.round(match.score * 100)} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-bold text-sm text-slate-800">
                            {Math.round(match.score * 100)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] mt-1 text-slate-500 font-medium">매칭률</span>
                    </div>
                  </div>

                  {/* 키워드 - 향수 색상 */}
                  {match.persona?.keywords && (
                    <div className="flex flex-wrap gap-1.5">
                      {match.persona.keywords.slice(0, 5).map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-full text-slate-700"
                          style={{
                            backgroundColor: `${primaryColor}20`,
                            border: `1px solid ${primaryColor}40`
                          }}
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

              <Separator className="bg-slate-100" />

              {/* 향수 프로필 */}
              <PerfumeProfile persona={match.persona} />

              <Separator className="bg-slate-100" />

              {/* 향수 스토리 */}
              {match.matchReason && (
                <div>
                  <SectionHeader
                    icon={<Sparkles size={14} />}
                    title="향수 스토리"
                    subtitle="전문가 평가"
                  />
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-200/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-400/30">
                        <span className="text-lg">💬</span>
                      </div>
                      <div>
                        <p className="text-slate-700 text-sm leading-relaxed italic">
                          &quot;{match.matchReason}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 사용 추천 */}
              {match.persona?.recommendation && (
                <div>
                  <SectionHeader
                    icon={<Clock size={14} />}
                    title="사용 추천"
                    subtitle="이 향기와 함께하면 완벽!"
                  />
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200/50">
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {match.persona.recommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* 사용 가이드 */}
              <div>
                <SectionHeader
                  icon={<BookOpen size={14} />}
                  title="사용 가이드"
                  subtitle="우리 애와 함께하는 향수 팁"
                />
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  {match.persona?.usageGuide?.tips && match.persona.usageGuide.tips.length > 0 ? (
                    // AI 생성 주접 가이드가 있으면 표시
                    match.persona.usageGuide.tips.map((tip, i) => (
                      <GuideItem key={i} text={tip} />
                    ))
                  ) : (
                    // 기본 가이드
                    <>
                      <GuideItem text="손목에 뿌리고 귀 뒤에 살짝 톡톡! 우리 애 생각하면서 향기 맡으면 행복 두 배! 🌸✨" />
                      <GuideItem text="옷보다 피부에 직접! 체온으로 향이 퍼지면서 우리 애의 따뜻한 매력이 느껴지는 느낌! 💕" />
                      <GuideItem text="문지르지 말고 자연 건조! 향의 레이어가 살아있어야 다채로운 매력이 시간별로 펼쳐짐! 🌈✨" />
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
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Search size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-center font-medium">매칭된 향수가 없습니다.</p>
          <p className="text-slate-400 text-sm text-center mt-1">다시 분석해보세요!</p>
        </motion.div>
      )}
    </motion.div>
  )
}

// 섹션 헤더
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-yellow-400 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-[10px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

// 가이드 아이템
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
      <p className="text-slate-600 text-xs">{text}</p>
    </div>
  )
}
