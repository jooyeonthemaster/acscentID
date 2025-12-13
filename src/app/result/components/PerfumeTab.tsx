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
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export function PerfumeTab({ displayedAnalysis }: PerfumeTabProps) {
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
        displayedAnalysis.matchingPerfumes.map((match, index) => (
          <motion.div key={index} variants={fadeIn} className="space-y-5">
            {/* 향수 헤더 카드 */}
            <div
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${match.persona?.primaryColor || '#1E293B'}dd, ${match.persona?.secondaryColor || '#0F172A'}dd)`
              }}
            >
              {/* 데코 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10">
                {/* 상단: ID + 매칭률 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge className="bg-white/20 text-white border-0 mb-2 text-[10px]">
                      추천 향수
                    </Badge>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {match.persona?.id || '맞춤 향수'}
                    </h2>
                    <p className="text-white/70 text-sm mt-1">
                      {match.persona?.name || ''}
                    </p>
                  </div>

                  {/* 매칭률 원형 */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18" cy="18" r="15"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="18" cy="18" r="15"
                          fill="none"
                          stroke="#FBBF24"
                          strokeWidth="2"
                          strokeDasharray={`${Math.round(match.score * 100)} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {Math.round(match.score * 100)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-white/60 text-[10px] mt-1">매칭률</span>
                  </div>
                </div>

                {/* 키워드 */}
                {match.persona?.keywords && (
                  <div className="flex flex-wrap gap-1.5">
                    {match.persona.keywords.slice(0, 5).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/10 text-white/80 text-[10px] rounded-full"
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
                  subtitle="이럴 때 뿌리세요"
                />
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-100">
                  <p className="text-slate-600 text-sm leading-relaxed">
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
                subtitle="향수 사용 팁"
              />
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <GuideItem text="손목 안쪽이나 귀 뒤에 뿌려주세요" />
                <GuideItem text="문지르지 말고 자연스럽게 마르도록 해주세요" />
                <GuideItem text="옷보다는 피부에 직접 뿌리는 것이 좋아요" />
              </div>
            </div>
          </motion.div>
        ))
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
