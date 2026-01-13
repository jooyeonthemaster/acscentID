"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Palette, Tag, Shirt, Sparkles } from 'lucide-react'
import { ImageAnalysisResult, SEASON_LABELS, TONE_LABELS } from '@/types/analysis'
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
  // PC: 2컬럼 그리드 레이아웃
  if (isDesktop) {
    return (
      <motion.div
        key="analysis"
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 gap-6 xl:gap-8"
      >
        {/* 좌측 컬럼 */}
        <div className="space-y-6">
          {/* 이미지 분위기 */}
          {displayedAnalysis.analysis && (
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
              <SectionHeader
                icon={<MessageCircle size={14} />}
                title="이미지 분위기"
                subtitle="AI의 첫인상"
              />
              <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-300/20 rounded-full blur-2xl" />
                <div className="absolute top-2 right-2 text-base">✨</div>
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#000]">
                    <span className="text-base">💭</span>
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm font-bold leading-relaxed">
                      &quot;{displayedAnalysis.analysis.mood}&quot;
                    </p>
                    <p className="text-amber-600 text-xs mt-2 font-black">
                      @acscent_ai
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 특성 레이더 차트 */}
          <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
            <SectionHeader
              icon={<Sparkles size={14} />}
              title="이미지 특성 점수"
              subtitle="향수 매칭의 핵심"
            />
            {displayedAnalysis.traits && (
              <div className="flex justify-center">
                <TraitRadarChart traits={displayedAnalysis.traits} />
              </div>
            )}
          </motion.div>

          {/* 퍼스널 컬러 */}
          {displayedAnalysis.personalColor && (
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
              <SectionHeader
                icon={<Palette size={14} />}
                title="컬러 타입"
                subtitle="이미지 컬러 분석"
              />
              <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex-shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#000]"
                    style={{
                      background: `linear-gradient(135deg, ${displayedAnalysis.personalColor.palette?.[0] || '#fff'}, ${displayedAnalysis.personalColor.palette?.[1] || '#f9f9f9'})`
                    }}
                  />
                  <div>
                    <div className="inline-flex px-3 py-1 bg-yellow-400 rounded-lg border-2 border-slate-900 mb-2">
                      <span className="text-xs font-black text-slate-900">
                        {SEASON_LABELS[displayedAnalysis.personalColor.season]} {TONE_LABELS[displayedAnalysis.personalColor.tone]}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      {displayedAnalysis.personalColor.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {displayedAnalysis.personalColor.palette?.map((color, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000] transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 우측 컬럼 */}
        <div className="space-y-6">
          {/* 스타일 분석 */}
          {displayedAnalysis.analysis && (
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
              <SectionHeader
                icon={<Shirt size={14} />}
                title="스타일 분석"
                subtitle="패션 & 표현"
              />
              <div className="space-y-3">
                {displayedAnalysis.analysis.style && (
                  <AnalysisCard
                    label="스타일"
                    content={displayedAnalysis.analysis.style}
                    accentColor="bg-pink-500"
                    bgColor="bg-pink-50"
                  />
                )}
                {displayedAnalysis.analysis.expression && (
                  <AnalysisCard
                    label="표현과 연출"
                    content={displayedAnalysis.analysis.expression}
                    accentColor="bg-purple-500"
                    bgColor="bg-purple-50"
                  />
                )}
                {displayedAnalysis.analysis.concept && (
                  <AnalysisCard
                    label="콘셉트"
                    content={displayedAnalysis.analysis.concept}
                    accentColor="bg-indigo-500"
                    bgColor="bg-indigo-50"
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* 매칭 키워드 */}
          {displayedAnalysis.matchingKeywords && displayedAnalysis.matchingKeywords.length > 0 && (
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
              <SectionHeader
                icon={<Tag size={14} />}
                title="매칭 키워드"
                subtitle="당신을 표현하는 단어"
              />
              <KeywordCloud keywords={displayedAnalysis.matchingKeywords} />
            </motion.div>
          )}
        </div>
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
            title="이미지 분위기"
            subtitle="AI의 첫인상"
          />
          <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 overflow-hidden border-2 border-amber-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-300/20 rounded-full blur-2xl" />
            <div className="absolute top-2 right-2 text-base">✨</div>
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-400 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#000]">
                <span className="text-sm">💭</span>
              </div>
              <div>
                <p className="text-slate-700 text-sm font-bold leading-relaxed">
                  &quot;{displayedAnalysis.analysis.mood}&quot;
                </p>
                <p className="text-amber-600 text-xs mt-2 font-black">
                  @acscent_ai
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 특성 레이더 차트 */}
      <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
        <SectionHeader
          icon={<Sparkles size={14} />}
          title="이미지 특성 점수"
          subtitle="향수 매칭의 핵심"
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
            title="스타일 분석"
            subtitle="패션 & 표현"
          />
          <div className="space-y-3">
            {displayedAnalysis.analysis.style && (
              <AnalysisCard
                label="스타일"
                content={displayedAnalysis.analysis.style}
                accentColor="bg-pink-500"
                bgColor="bg-pink-50"
              />
            )}
            {displayedAnalysis.analysis.expression && (
              <AnalysisCard
                label="표현과 연출"
                content={displayedAnalysis.analysis.expression}
                accentColor="bg-purple-500"
                bgColor="bg-purple-50"
              />
            )}
            {displayedAnalysis.analysis.concept && (
              <AnalysisCard
                label="콘셉트"
                content={displayedAnalysis.analysis.concept}
                accentColor="bg-indigo-500"
                bgColor="bg-indigo-50"
              />
            )}
          </div>
        </motion.div>
      )}

      {/* 매칭 키워드 */}
      {displayedAnalysis.matchingKeywords && displayedAnalysis.matchingKeywords.length > 0 && (
        <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
          <SectionHeader
            icon={<Tag size={14} />}
            title="매칭 키워드"
            subtitle="당신을 표현하는 단어"
          />
          <KeywordCloud keywords={displayedAnalysis.matchingKeywords} />
        </motion.div>
      )}

      {/* 퍼스널 컬러 */}
      {displayedAnalysis.personalColor && (
        <motion.div variants={fadeIn}>
          <SectionHeader
            icon={<Palette size={14} />}
            title="컬러 타입"
            subtitle="이미지 컬러 분석"
          />
          <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#000]"
                style={{
                  background: `linear-gradient(135deg, ${displayedAnalysis.personalColor.palette?.[0] || '#fff'}, ${displayedAnalysis.personalColor.palette?.[1] || '#f9f9f9'})`
                }}
              />
              <div>
                <div className="inline-flex px-3 py-1 bg-yellow-400 rounded-lg border-2 border-slate-900 mb-2">
                  <span className="text-xs font-black text-slate-900">
                    {SEASON_LABELS[displayedAnalysis.personalColor.season]} {TONE_LABELS[displayedAnalysis.personalColor.tone]}
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  {displayedAnalysis.personalColor.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {displayedAnalysis.personalColor.palette?.map((color, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000] transition-transform hover:scale-110"
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

// 분석 카드 컴포넌트 - 키치 스타일
function AnalysisCard({ label, content, accentColor, bgColor }: {
  label: string
  content: string
  accentColor: string
  bgColor: string
}) {
  return (
    <div className={`relative rounded-xl p-4 overflow-hidden ${bgColor} border-2 border-slate-200`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 pl-2">{label}</p>
      <p className="text-slate-700 text-sm leading-relaxed font-medium pl-2">{content}</p>
    </div>
  )
}
