"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, Shirt, Palette, Sparkles, BookOpen, Clock, Tag, Droplets, FlaskConical } from "lucide-react"
import type { ImageAnalysisResult } from "@/types/analysis"
import { CATEGORY_INFO, SEASON_LABELS, TONE_LABELS } from "@/types/analysis"
import TraitRadarChart from "@/components/chart/TraitRadarChart"
import KeywordCloud from "@/components/chart/KeywordCloud"
import { ScentRecommendationCard } from "../ScentRecommendationCard"

type SubTabType = 'perfume' | 'analysis'

interface CharacterScentChapterProps {
  characterName: string
  emoji: string
  analysis: ImageAnalysisResult
  accentColor: 'violet' | 'pink'
  activeSubTab?: SubTabType
}

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

// 카테고리 컬러 매핑 (PerfumeProfile.tsx 기존 스타일)
const categoryColors: Record<string, { bar: string; bg: string; border: string; text: string }> = {
  citrus: { bar: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
  floral: { bar: 'bg-pink-400', bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  woody: { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  musky: { bar: 'bg-purple-400', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  fruity: { bar: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  spicy: { bar: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' }
}

export function CharacterScentChapter({
  characterName, emoji, analysis, accentColor, activeSubTab,
}: CharacterScentChapterProps) {
  const [internalSubTab, setInternalSubTab] = useState<SubTabType>('perfume')
  const subTab = activeSubTab || internalSubTab
  const perfume = analysis.matchingPerfumes[0]
  const persona = perfume?.persona
  const isViolet = accentColor === 'violet'
  const activeBg = isViolet ? 'bg-violet-500' : 'bg-pink-500'

  const primaryColor = persona?.primaryColor || '#FBBF24'
  const secondaryColor = persona?.secondaryColor || '#F59E0B'

  return (
    <div className="px-4 space-y-5">
      {/* 서브탭 네비게이션 — activeSubTab이 없을 때만 내부 탭 표시 (fallback) */}
      {!activeSubTab && (
        <div className="bg-[#FEF9C3] p-2 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0_0_black]">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInternalSubTab('perfume')}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm transition-all rounded-xl border-2 ${
                subTab === 'perfume'
                  ? 'text-slate-900 bg-white border-slate-900 shadow-[2px_2px_0px_#000]'
                  : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">💎</span>
                <span className="font-bold text-xs">퍼퓸 추천</span>
              </span>
            </button>
            <button
              onClick={() => setInternalSubTab('analysis')}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm transition-all rounded-xl border-2 ${
                subTab === 'analysis'
                  ? 'text-slate-900 bg-white border-slate-900 shadow-[2px_2px_0px_#000]'
                  : 'text-slate-500 bg-white/50 border-transparent hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">🔍</span>
                <span className="font-bold text-xs">분석 결과</span>
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
            className="space-y-5"
          >
            {/* ===== 1. 향수 헤더 카드 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            {persona && (
              <motion.div variants={fadeIn}>
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
                    {/* 추천 향수 뱃지 */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#000] mb-2">
                      <span className="text-xs">💎</span>
                      <span className="text-[10px] font-black text-slate-900">추천 향수</span>
                    </div>
                    <h2 className="text-2xl font-black leading-tight text-slate-900">
                      {persona.id || '맞춤 향수'}
                    </h2>
                    <p className="text-sm mt-1 text-slate-600 mb-3">
                      {persona.name || ''}
                    </p>

                    {/* 매칭 점수 */}

                    {/* 키워드 - 키치 스타일 */}
                    {persona.keywords && (
                      <div className="flex flex-wrap gap-1.5">
                        {persona.keywords.slice(0, 5).map((keyword, i) => (
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
              </motion.div>
            )}

            {/* ===== 2. 향 노트 — PerfumeNotes.tsx 모바일 스타일 그대로 ===== */}
            {persona && (
              <motion.div variants={fadeIn}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-md bg-amber-400 border border-slate-900 flex items-center justify-center">
                    <Droplets size={10} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">향 노트</h3>
                    <p className="text-[9px] text-slate-400">탑 → 미들 → 베이스</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
                  <div className="space-y-2">
                    {/* 탑노트 */}
                    <MobileNoteCard
                      type="TOP"
                      name={persona.mainScent?.name || '탑 노트'}
                      description={persona.mainScent?.fanComment || '첫 인상을 결정하는 향'}
                      time="0~30분"
                      bgColor="bg-gradient-to-r from-amber-50 to-yellow-50"
                      accentColor="bg-amber-400"
                      textColor="text-amber-800"
                      timeColor="text-amber-600"
                    />

                    {/* 미들노트 */}
                    <MobileNoteCard
                      type="HEART"
                      name={persona.subScent1?.name || '미들 노트'}
                      description={persona.subScent1?.fanComment || '향의 중심을 잡아주는 향'}
                      time="30분~2시간"
                      bgColor="bg-gradient-to-r from-pink-50 to-rose-50"
                      accentColor="bg-pink-400"
                      textColor="text-pink-800"
                      timeColor="text-pink-600"
                    />

                    {/* 베이스노트 */}
                    <MobileNoteCard
                      type="BASE"
                      name={persona.subScent2?.name || '베이스 노트'}
                      description={persona.subScent2?.fanComment || '잔향으로 남는 깊은 향'}
                      time="2시간~"
                      bgColor="bg-gradient-to-r from-slate-100 to-slate-200"
                      accentColor="bg-slate-600"
                      textColor="text-slate-700"
                      timeColor="text-slate-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 3. 향수 프로필 (바 차트) — PerfumeProfile.tsx 모바일 스타일 그대로 ===== */}
            {persona?.categories && (
              <motion.div variants={fadeIn}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-md bg-purple-400 border-2 border-slate-900 flex items-center justify-center">
                    <FlaskConical size={10} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">향 프로필</h3>
                    <p className="text-[9px] text-slate-400">카테고리별 구성 비율</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[2px_2px_0px_#000]">
                  <div className="space-y-2">
                    {Object.entries(persona.categories)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, value], index) => {
                        const info = CATEGORY_INFO[category] || { icon: '⚪', name: category }
                        const colors = categoryColors[category] || {
                          bar: 'bg-slate-400',
                          bg: 'bg-slate-50',
                          border: 'border-slate-300',
                          text: 'text-slate-700'
                        }
                        const isMain = index === 0

                        return (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
                            className={`relative rounded-lg p-2 ${colors.bg} border ${colors.border} ${
                              isMain ? 'ring-2 ring-offset-1 ring-yellow-400 border-2' : ''
                            }`}
                          >
                            {/* 메인 배지 */}
                            {isMain && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px]">
                                👑
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {/* 아이콘 + 이름 */}
                              <div className="flex items-center gap-1 min-w-[56px]">
                                <span className="text-sm">{info.icon}</span>
                                <span className={`text-[10px] font-bold ${colors.text}`}>{info.name}</span>
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
                                        ? `${colors.bar} border-slate-900`
                                        : 'bg-slate-200 border-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* 숫자 박스 */}
                              <div className={`flex-shrink-0 w-6 h-6 rounded-md ${colors.bar} border-2 border-slate-900 flex items-center justify-center`}>
                                <span className="text-[10px] font-black text-white">
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
                    className="mt-3 pt-2 border-t-2 border-dashed border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Sparkles size={12} className="text-yellow-500" />
                        <span className="text-[10px] font-bold text-slate-500">메인 계열</span>
                      </div>
                      {(() => {
                        const mainCategory = Object.entries(persona.categories).sort(([, a], [, b]) => b - a)[0]
                        return (
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 px-2.5 py-1 rounded-full border-2 border-slate-900">
                            <span className="text-sm">{CATEGORY_INFO[mainCategory[0]]?.icon || '⚪'}</span>
                            <span className="text-xs font-black text-slate-800">
                              {CATEGORY_INFO[mainCategory[0]]?.name || mainCategory[0]}
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
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                  <SectionHeader
                    icon={<Sparkles size={14} />}
                    title="향수 스토리"
                    subtitle="전문가 평가"
                  />
                  <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                    <p className="text-slate-700 text-sm leading-relaxed italic font-medium">
                      &quot;{perfume.matchReason}&quot;
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 5. 사용 추천 + 계절/시간대 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            {persona?.recommendation && (
              <motion.div variants={fadeIn}>
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                  <SectionHeader
                    icon={<Clock size={14} />}
                    title="사용 추천"
                    subtitle="상황별 추천"
                  />
                  <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 overflow-hidden border-2 border-amber-200">
                    <p className="text-slate-700 text-sm leading-relaxed font-medium">
                      {persona.recommendation}
                    </p>
                  </div>
                  {/* 추천 계절/시간대 */}
                  <ScentRecommendationCard
                    recommendation={analysis.scentRecommendation}
                    isDesktop={false}
                  />
                </div>
              </motion.div>
            )}

            {/* ===== 6. 사용 가이드 — PerfumeTab.tsx 모바일 스타일 그대로 ===== */}
            <motion.div variants={fadeIn}>
              <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                <SectionHeader
                  icon={<BookOpen size={14} />}
                  title="사용 가이드"
                  subtitle="이렇게 사용해 보세요"
                />
                <div className="bg-[#FEF9C3] rounded-xl p-4 space-y-3 border-2 border-slate-200">
                  {persona?.usageGuide?.tips && persona.usageGuide.tips.length > 0 ? (
                    persona.usageGuide.tips.map((tip, i) => (
                      <GuideItem key={i} text={tip} />
                    ))
                  ) : (
                    <>
                      <GuideItem text="손목 안쪽이나 목 뒤에 가볍게 뿌려주세요" />
                      <GuideItem text="향이 은은하게 퍼지면서 자연스러운 분위기를 연출해요" />
                      <GuideItem text="옷감에 직접 뿌리지 말고 피부에 뿌려야 본연의 향을 느낄 수 있어요" />
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
            className="space-y-5"
          >
            {/* ===== 1. AI의 첫인상 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.analysis && (
              <motion.div variants={fadeIn}>
                <SectionHeader
                  icon={<MessageCircle size={14} />}
                  title="이미지 분위기"
                  subtitle="AI의 첫인상"
                />
                <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 overflow-hidden border-2 border-amber-200">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-300/20 rounded-full blur-2xl" />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-400 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#000]">
                      <span className="text-sm">💭</span>
                    </div>
                    <div>
                      <p className="text-slate-700 text-sm font-bold leading-relaxed">
                        &quot;{analysis.analysis.mood}&quot;
                      </p>
                      <p className="text-amber-600 text-xs mt-2 font-black">
                        @acscent_ai
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== 2. 특성 레이더 차트 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
              <SectionHeader
                icon={<Sparkles size={14} />}
                title="특성 점수"
                subtitle="향수 매칭의 핵심 지표"
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
                  title="스타일 분석"
                  subtitle="패션과 표현"
                />
                <div className="space-y-3">
                  {analysis.analysis.style && (
                    <AnalysisCard
                      label="STYLE"
                      content={analysis.analysis.style}
                      accentColor="bg-pink-500"
                      bgColor="bg-pink-50"
                    />
                  )}
                  {analysis.analysis.expression && (
                    <AnalysisCard
                      label="EXPRESSION"
                      content={analysis.analysis.expression}
                      accentColor="bg-purple-500"
                      bgColor="bg-purple-50"
                    />
                  )}
                  {analysis.analysis.concept && (
                    <AnalysisCard
                      label="CONCEPT"
                      content={analysis.analysis.concept}
                      accentColor="bg-indigo-500"
                      bgColor="bg-indigo-50"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== 4. 매칭 키워드 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.matchingKeywords && analysis.matchingKeywords.length > 0 && (
              <motion.div variants={fadeIn} className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                <SectionHeader
                  icon={<Tag size={14} />}
                  title="매칭 키워드"
                  subtitle="나를 표현하는 단어들"
                />
                <KeywordCloud keywords={analysis.matchingKeywords} />
              </motion.div>
            )}

            {/* ===== 5. 퍼스널 컬러 — AnalysisTab.tsx 모바일 스타일 그대로 ===== */}
            {analysis.personalColor && (
              <motion.div variants={fadeIn}>
                <SectionHeader
                  icon={<Palette size={14} />}
                  title="퍼스널 컬러"
                  subtitle="이미지 컬러 분석"
                />
                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex-shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#000]"
                      style={{
                        background: `linear-gradient(135deg, ${analysis.personalColor.palette?.[0] || '#fff'}, ${analysis.personalColor.palette?.[1] || '#f9f9f9'})`
                      }}
                    />
                    <div>
                      <div className="inline-flex px-3 py-1 bg-yellow-400 rounded-lg border-2 border-slate-900 mb-2">
                        <span className="text-xs font-black text-slate-900">
                          {SEASON_LABELS[analysis.personalColor.season]} {TONE_LABELS[analysis.personalColor.tone]}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        {analysis.personalColor.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {analysis.personalColor.palette?.map((color, index) => (
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
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== 섹션 헤더 — PerfumeTab/AnalysisTab 키치 스타일 그대로 =====
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

// ===== 가이드 아이템 — PerfumeTab 키치 스타일 그대로 =====
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2 h-2 rounded-full bg-yellow-400 border border-slate-900 mt-1 flex-shrink-0" />
      <p className="text-slate-700 text-xs font-medium leading-relaxed">{text}</p>
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
    <div className={`relative rounded-xl p-4 overflow-hidden ${bgColor} border-2 border-slate-200`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 pl-2">{label}</p>
      <p className="text-slate-700 text-sm leading-relaxed font-medium pl-2">{content}</p>
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
      className={`relative ${bgColor} rounded-lg p-2.5 overflow-hidden`}
    >
      {/* 좌측 액센트 바 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className="pl-2">
        {/* 상단: 타입 + 이름 + 시간 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black ${timeColor} tracking-wider`}>{type}</span>
            <span className={`text-[10px] ${timeColor}`}>•</span>
            <span className={`text-xs font-black ${textColor}`}>{name}</span>
          </div>
          <span className={`text-[9px] font-medium ${timeColor}`}>{time}</span>
        </div>

        {/* 설명 */}
        <p className={`text-[11px] leading-relaxed ${textColor} opacity-80`}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}
