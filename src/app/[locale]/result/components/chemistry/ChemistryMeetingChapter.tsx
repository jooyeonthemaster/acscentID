"use client"

import React, { useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'
import type { ChemistryProfile, TraitScores, ScentCategoryScores, ImageAnalysisResult } from "@/types/analysis"
import { TRAIT_LABELS, CATEGORY_INFO, CHEMISTRY_TYPE_COLORS, CHEMISTRY_TYPE_LABELS, CHEMISTRY_TYPE_ICONS } from "@/types/analysis"
import {
  SectionCard, SectionHeader,
  NameChemistryPyramid,
  LayeringInfographic,
} from "./ChemistryMeetingVisuals"


interface ChemistryMeetingChapterProps {
  chemistry: ChemistryProfile
  character1Name: string
  character2Name: string
  characterA?: ImageAnalysisResult
  characterB?: ImageAnalysisResult
  sectionRefs?: React.RefObject<Record<string, HTMLDivElement | null>>
}

export function ChemistryMeetingChapter({
  chemistry, character1Name, character2Name, characterA, characterB, sectionRefs: externalRefs,
}: ChemistryMeetingChapterProps) {
  const t = useTranslations()
  const internalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const sectionRefs = externalRefs || internalRefs

  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (sectionRefs.current) {
      sectionRefs.current[id] = el
    }
  }, [sectionRefs])

  return (
    <div className="px-4 space-y-5">
      {/* 챕터 헤더 */}
      <div className="text-center">
        <h2 className="text-lg font-black text-slate-900">{t('chemistry.result.meetingTitle')}</h2>
        <p className="text-xs text-slate-500 mt-1">{t('chemistry.result.meetingSubtitle')}</p>
      </div>

      {/* === 섹션: 얼굴합 === */}
      {chemistry.faceMatch && (
        <div ref={setSectionRef('face')} className="scroll-mt-[256px]">
          <FaceCompatibilitySection faceMatch={chemistry.faceMatch} />
        </div>
      )}

      {/* === 섹션: 케미 타입 === */}
      <div ref={setSectionRef('type')} className="scroll-mt-[256px]">
        {/* 케미 타입 대형 카드 (최상단) */}
        <ChemistryTypeCard chemistry={chemistry} />

        {/* 케미 스토리 (주접 멘트) */}
        {chemistry.chemistryStory && (
          <div className="mt-5">
            <SectionCard>
              <SectionHeader emoji={String.fromCodePoint(0x1F4D6)} title="케미 스토리" />
              <div className="p-4">
                <div className="relative bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-4 overflow-hidden border-2 border-violet-200">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-300/20 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap italic">
                      &ldquo;{chemistry.chemistryStory}&rdquo;
                    </p>
                    <p className="text-violet-500 text-xs mt-3 font-black">
                      @acscent_ai
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {/* === 섹션: 특성 비교 === */}
      <div ref={setSectionRef('traits')} className="scroll-mt-[256px] space-y-5">
        {characterA && characterB && (
          <DualRadarChart
            traitsA={characterA.traits}
            traitsB={characterB.traits}
            nameA={character1Name}
            nameB={character2Name}
            synergyComment={chemistry.traitsSynergy.traitsComparisonComment || ''}
          />
        )}

        {/* 색채 케미 팔레트 */}
        <ColorChemistryPalette
          chemistry={chemistry}
          characterA={characterA}
          characterB={characterB}
          nameA={character1Name}
          nameB={character2Name}
        />
      </div>

      {/* === 섹션: 향 분석 === */}
      <div ref={setSectionRef('scent')} className="scroll-mt-[256px] space-y-5">
        {characterA && characterB && (
          <ScentComparisonChart
            categoriesA={characterA.scentCategories}
            categoriesB={characterB.scentCategories}
            nameA={character1Name}
            nameB={character2Name}
            harmonyComment={chemistry.scentHarmony.layeringEffect}
          />
        )}

        <ScentHarmonyDiagram chemistry={chemistry} nameA={character1Name} nameB={character2Name} />

        <LayeringInfographic
          guide={chemistry.layeringGuide}
          nameA={character1Name}
          nameB={character2Name}
        />
      </div>

      {/* === 섹션: 관계 다이나믹 === */}
      <div ref={setSectionRef('dynamic')} className="scroll-mt-[256px] space-y-5">
        <KeywordBubbleCloud
          keywords={chemistry.relationshipDynamic.chemistryKeywords}
          description={chemistry.relationshipDynamic.dynamicDescription}
          bestMoment={chemistry.relationshipDynamic.bestMoment}
        />

        <NameChemistryPyramid nameA={character1Name} nameB={character2Name} />
      </div>

      {/* 미래 예측 섹션 제거됨 */}
    </div>
  )
}

// ========================================
// 3-1. 케미 타입 대형 카드
// ========================================
function ChemistryTypeCard({ chemistry }: { chemistry: ChemistryProfile }) {
  const typeColor = CHEMISTRY_TYPE_COLORS[chemistry.chemistryType]
  const typeLabel = CHEMISTRY_TYPE_LABELS[chemistry.chemistryType]
  const typeIcon = CHEMISTRY_TYPE_ICONS[chemistry.chemistryType]

  return (
    <SectionCard>
      {/* 타입 헤더 */}
      <div className={`bg-gradient-to-br ${typeColor.gradient} p-6 text-center text-white relative overflow-hidden`}>
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full" />
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-5xl mb-3 relative z-10"
        >
          {typeIcon}
        </motion.div>
        <h3 className="text-xl font-black relative z-10">{typeLabel}</h3>
        <p className="text-sm text-white/90 mt-2 relative z-10 font-medium leading-relaxed">
          &ldquo;{chemistry.chemistryTitle}&rdquo;
        </p>
      </div>

      {/* 시너지 분석 보고서 */}
      <div className="p-5 space-y-4">
        {/* 공유 강점 */}
        <div className="border-l-4 border-violet-400 pl-3">
          <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider block mb-2">Shared Strengths</span>
          <div className="space-y-2">
            {chemistry.traitsSynergy.sharedStrengths.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-violet-400 text-xs mt-0.5 flex-shrink-0">&#9679;</span>
                <p className="text-xs text-slate-700 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-slate-100" />

        {/* 보완 특성 */}
        {chemistry.traitsSynergy.complementaryTraits.length > 0 && (
          <div className="border-l-4 border-pink-400 pl-3">
            <span className="text-[10px] font-black text-pink-500 uppercase tracking-wider block mb-2">Complementary</span>
            <div className="space-y-2">
              {chemistry.traitsSynergy.complementaryTraits.slice(0, 2).map((ct, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-pink-400 text-xs mt-0.5 flex-shrink-0">&#9679;</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{ct}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다이나믹 텐션 */}
        {chemistry.traitsSynergy.dynamicTension && (
          <>
            <div className="border-t border-slate-100" />
            <div className="bg-gradient-to-r from-violet-50/80 to-pink-50/80 rounded-xl p-3 border border-violet-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Summary</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">{chemistry.traitsSynergy.dynamicTension}</p>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-2. 두 캐릭터 트레이트 레이더 겹침 차트
// ========================================
function DualRadarChart({ traitsA, traitsB, nameA, nameB, synergyComment }: {
  traitsA: TraitScores; traitsB: TraitScores; nameA: string; nameB: string; synergyComment?: string
}) {
  const cx = 130, cy = 130, r = 90, max = 10
  const entriesA = Object.entries(traitsA) as [keyof TraitScores, number][]
  const entriesB = Object.entries(traitsB) as [keyof TraitScores, number][]
  const n = entriesA.length
  const step = (Math.PI * 2) / n

  const getXY = (val: number, i: number) => {
    const a = i * step - Math.PI / 2
    return { x: cx + r * (val / max) * Math.cos(a), y: cy + r * (val / max) * Math.sin(a) }
  }

  const makePath = (entries: [string, number][]) =>
    entries.map(([, v], i) => {
      const { x, y } = getXY(v, i)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ') + ' Z'

  return (
    <SectionCard>
      <SectionHeader emoji="📊" title="특성 레이더 비교" />
      <div className="p-4">
        {/* 범례 */}
        <div className="flex justify-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-[10px] font-bold text-slate-600">🌙 {nameA}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-[10px] font-bold text-slate-600">☀️ {nameB}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <svg width="260" height="260" viewBox="0 0 260 260">
            {/* 그리드 */}
            {[2, 4, 6, 8, 10].map((lv) => {
              const pts = entriesA.map((_, i) => {
                const { x, y } = getXY(lv, i)
                return `${x},${y}`
              }).join(' ')
              return <polygon key={lv} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />
            })}
            {entriesA.map((_, i) => {
              const { x, y } = getXY(max, i)
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            })}
            {/* A 데이터 */}
            <motion.path
              d={makePath(entriesA)}
              fill="rgba(139, 92, 246, 0.15)"
              stroke="#8b5cf6"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            />
            {/* B 데이터 */}
            <motion.path
              d={makePath(entriesB)}
              fill="rgba(236, 72, 153, 0.15)"
              stroke="#ec4899"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            {/* 점 */}
            {entriesA.map(([, v], i) => {
              const { x, y } = getXY(v, i)
              return <circle key={`a-${i}`} cx={x} cy={y} r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
            })}
            {entriesB.map(([, v], i) => {
              const { x, y } = getXY(v, i)
              return <circle key={`b-${i}`} cx={x} cy={y} r="3" fill="#ec4899" stroke="white" strokeWidth="1.5" />
            })}
            {/* 라벨 */}
            {entriesA.map(([key], i) => {
              const { x, y } = getXY(max * 1.2, i)
              return (
                <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontWeight="700" fill="#64748b">
                  {TRAIT_LABELS[key as keyof TraitScores]}
                </text>
              )
            })}
          </svg>
        </div>

        {/* 시너지 코멘트 (주접 텍스트) */}
        {synergyComment && (
          <div className="mt-3 p-3 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200">
            <p className="text-xs text-slate-600 leading-relaxed italic">{synergyComment}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-3. 향 카테고리 비교 바 차트 (좌우 대비)
// ========================================
function ScentComparisonChart({ categoriesA, categoriesB, nameA, nameB, harmonyComment }: {
  categoriesA: ScentCategoryScores; categoriesB: ScentCategoryScores; nameA: string; nameB: string; harmonyComment?: string
}) {
  const keys = Object.keys(categoriesA) as (keyof ScentCategoryScores)[]

  return (
    <SectionCard>
      <SectionHeader emoji="🌺" title="향 프로필 비교" />
      <div className="p-4">
        {/* 범례 */}
        <div className="flex justify-between mb-3 px-2">
          <span className="text-[10px] font-black text-violet-600">🌙 {nameA}</span>
          <span className="text-[10px] font-black text-pink-600">☀️ {nameB}</span>
        </div>
        <div className="space-y-2.5">
          {keys.map((key) => {
            const info = CATEGORY_INFO[key]
            if (!info) return null
            const valA = categoriesA[key]
            const valB = categoriesB[key]
            return (
              <div key={key} className="flex items-center gap-1">
                {/* A 바 (오른쪽 정렬) */}
                <div className="flex-1 flex justify-end">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(valA / 10) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="h-5 bg-violet-400 rounded-l-full flex items-center justify-start pl-1.5"
                  >
                    <span className="text-[9px] font-black text-white">{valA}</span>
                  </motion.div>
                </div>
                {/* 중앙 라벨 */}
                <div className="w-14 text-center flex-shrink-0">
                  <span className="text-[10px]">{info.icon}</span>
                  <span className="text-[9px] font-bold text-slate-600 block">{info.name}</span>
                </div>
                {/* B 바 (왼쪽 정렬) */}
                <div className="flex-1 flex justify-start">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(valB / 10) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-5 bg-pink-400 rounded-r-full flex items-center justify-end pr-1.5"
                  >
                    <span className="text-[9px] font-black text-white">{valB}</span>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 레이어링 효과 코멘트 (주접 텍스트) */}
        {harmonyComment && (
          <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <p className="text-xs text-slate-600 leading-relaxed italic">{harmonyComment}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-4. 색채 케미 팔레트
// ========================================
function ColorChemistryPalette({ chemistry, characterA, characterB, nameA, nameB }: {
  chemistry: ChemistryProfile
  characterA?: ImageAnalysisResult
  characterB?: ImageAnalysisResult
  nameA: string
  nameB: string
}) {
  const paletteA = characterA?.personalColor?.palette?.slice(0, 4) || []
  const paletteB = characterB?.personalColor?.palette?.slice(0, 4) || []
  const blended = chemistry.colorChemistry.blendedPalette.slice(0, 4)

  return (
    <SectionCard>
      <SectionHeader emoji="🎨" title="색채 케미" />
      <div className="p-4 space-y-4">
        {/* A의 컬러 */}
        <ColorRow label={`🌙 ${nameA}`} colors={paletteA} />
        {/* 블렌딩 컬러 (중앙, 강조) */}
        <div className="text-center">
          <span className="text-[10px] font-black text-slate-400 mb-1.5 block">BLEND</span>
          <div className="flex gap-2 justify-center">
            {blended.map((color, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -90 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, type: "spring" }}
                className="w-11 h-11 rounded-full border-2 border-black shadow-[2px_2px_0_0_black]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        {/* B의 컬러 */}
        <ColorRow label={`☀️ ${nameB}`} colors={paletteB} />

        <p className="text-[11px] text-slate-500 text-center font-medium mt-2">{chemistry.colorChemistry.description}</p>
      </div>
    </SectionCard>
  )
}

function ColorRow({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="text-center">
      <span className="text-[10px] font-black text-slate-400 mb-1.5 block">{label}</span>
      <div className="flex gap-2 justify-center">
        {colors.map((color, i) => (
          <div key={i} className="w-9 h-9 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  )
}

// ========================================
// 3-5. 향 하모니 도식 (피라미드 + 연결선)
// ========================================
function ScentHarmonyDiagram({ chemistry, nameA, nameB }: {
  chemistry: ChemistryProfile; nameA: string; nameB: string
}) {
  return (
    <SectionCard>
      <SectionHeader emoji="🧪" title="향 하모니" />
      <div className="p-5">
        {/* 3단 피라미드 시각화 - 개선된 버전 */}
        <div className="space-y-3">
          <HarmonyLevel
            level="TOP"
            levelLabel="첫 인상"
            content={chemistry.scentHarmony.topNoteInteraction}
            gradient="from-violet-400 to-pink-400"
            bg="bg-gradient-to-r from-violet-50 to-pink-50"
            border="border-violet-200"
            delay={0}
          />
          <HarmonyLevel
            level="MIDDLE"
            levelLabel="분위기"
            content={chemistry.scentHarmony.middleNoteInteraction}
            gradient="from-violet-300 to-pink-300"
            bg="bg-gradient-to-r from-violet-50/60 to-pink-50/60"
            border="border-violet-100"
            delay={0.15}
          />
          <HarmonyLevel
            level="BASE"
            levelLabel="여운"
            content={chemistry.scentHarmony.baseNoteInteraction}
            gradient="from-slate-300 to-violet-300"
            bg="bg-gradient-to-r from-slate-50 to-violet-50"
            border="border-slate-200"
            delay={0.3}
          />
        </div>

        {/* 전체 하모니 요약 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-5 p-4 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border-2 border-violet-200"
        >
          <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider block mb-1.5">Overall Harmony</span>
          <p className="text-xs font-medium text-violet-700 leading-relaxed">{chemistry.scentHarmony.overallHarmony}</p>
        </motion.div>
      </div>
    </SectionCard>
  )
}

function HarmonyLevel({ level, levelLabel, content, gradient, bg, border, delay }: {
  level: string; levelLabel: string; content: string; gradient: string; bg: string; border: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className={`${bg} border ${border} rounded-xl p-3.5 flex items-start gap-3`}
    >
      <div className="flex-shrink-0 text-center">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-[10px] font-black text-white">{level}</span>
        </div>
        <span className="text-[9px] text-slate-400 font-bold mt-1 block">{levelLabel}</span>
      </div>
      <p className="text-[11px] text-slate-700 leading-relaxed flex-1 pt-1">{content}</p>
    </motion.div>
  )
}

// ========================================
// 3-6. 관계 다이나믹 키워드 클라우드
// ========================================
function KeywordBubbleCloud({ keywords, description, bestMoment }: {
  keywords: string[]; description: string; bestMoment: string
}) {
  const sizes = [
    { size: 'text-base px-4 py-2', scale: 1.2 },
    { size: 'text-sm px-3.5 py-1.5', scale: 1.1 },
    { size: 'text-xs px-3 py-1.5', scale: 1 },
    { size: 'text-xs px-2.5 py-1', scale: 0.9 },
    { size: 'text-[11px] px-2.5 py-1', scale: 0.85 },
  ]
  const colors = [
    'bg-gradient-to-r from-violet-400 to-violet-500 text-white',
    'bg-gradient-to-r from-pink-400 to-pink-500 text-white',
    'bg-amber-100 text-amber-800 border-2 border-amber-300',
    'bg-cyan-100 text-cyan-800 border-2 border-cyan-300',
    'bg-rose-100 text-rose-700 border-2 border-rose-300',
  ]

  return (
    <SectionCard>
      <SectionHeader emoji="💫" title="관계 다이나믹" />
      <div className="p-5">
        {/* 키워드 버블 */}
        <div className="flex flex-wrap justify-center gap-2.5 items-center">
          {keywords.slice(0, 5).map((kw, i) => {
            const s = sizes[i] || sizes[sizes.length - 1]
            const c = colors[i % colors.length]
            return (
              <motion.div
                key={kw}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: s.scale, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, type: "spring" }}
                className={`${s.size} ${c} rounded-full font-black shadow-sm whitespace-nowrap`}
              >
                #{kw}
              </motion.div>
            )
          })}
        </div>

        {/* 다이나믹 설명 */}
        {description && (
          <p className="text-xs text-slate-600 text-center mt-4 leading-relaxed">{description}</p>
        )}

        {/* Best Moment */}
        {bestMoment && (
          <div className="mt-3 p-3 bg-pink-50 rounded-xl border border-pink-200">
            <span className="text-[10px] font-black text-pink-500 block mb-1">Best Moment</span>
            <p className="text-xs text-pink-700 leading-relaxed">{bestMoment}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ========================================
// 얼굴합 (비주얼 궁합) 섹션
// ========================================
function FaceCompatibilitySection({ faceMatch }: { faceMatch: import('@/types/analysis').FaceMatch }) {
  const score = faceMatch.score

  // 티어 판정 (최소 50%)
  const getTier = (s: number) => {
    if (s >= 90) return { label: '천생연분', emoji: '💘', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' }
    if (s >= 75) return { label: '찐이다 찐', emoji: '🔥', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' }
    if (s >= 65) return { label: '은근 케미', emoji: '✨', color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' }
    return { label: '묘한 끌림', emoji: '🌙', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
  }

  // 개별 바 색상 — 각 척도 자체 점수 기반
  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-gradient-to-r from-rose-400 to-pink-500'
    if (s >= 65) return 'bg-gradient-to-r from-violet-400 to-purple-500'
    return 'bg-gradient-to-r from-cyan-400 to-blue-500'
  }

  const tier = getTier(score)

  const criteria = [
    { label: '분위기 조화', emoji: '🌐', score: faceMatch.atmosphere, desc: faceMatch.atmosphereDesc },
    { label: '냉온 밸런스', emoji: '❄️🔥', score: faceMatch.contrast, desc: faceMatch.contrastDesc },
    { label: '색감 조화', emoji: '🎨', score: faceMatch.colorHarmony, desc: faceMatch.colorHarmonyDesc },
    { label: '스타일 호환', emoji: '👔', score: faceMatch.styleMatch, desc: faceMatch.styleMatchDesc },
  ]

  return (
    <SectionCard>
      <SectionHeader emoji={String.fromCodePoint(0x1F4F8)} title="얼굴합" />
      <div className="p-5">
        {/* 큰 점수 + 라벨 + 티어 뱃지 */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Face Match</span>
            <div className="flex items-baseline justify-center gap-0">
              <span className={`text-8xl font-black ${tier.color} tabular-nums leading-none`}>{score}</span>
              <span className={`text-4xl font-black ${tier.color} -ml-1`}>%</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 ${tier.bg} ${tier.border} border-2 rounded-full`}>
                <span className="text-lg">{tier.emoji}</span>
                <span className={`text-sm font-black ${tier.color}`}>{tier.label}</span>
              </span>
            </div>
          </motion.div>
        </div>

        {/* 4가지 척도 바 차트 — 개별 색상 */}
        <div className="space-y-4">
          {criteria.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 + 0.1 * i }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-xs font-black text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-black text-slate-800 tabular-nums">{item.score}</span>
              </div>
              {/* 바 — h-5, 50% 참조선 */}
              <div className="relative w-full h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300/60 z-10" />
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.score}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.4 + 0.12 * i, ease: "easeOut" }}
                  className={`h-full ${getBarColor(item.score)} rounded-full`}
                />
              </div>
              {/* 설명 */}
              {item.desc && (
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{item.desc}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* 종합 판정 — 다크 스탬프 스타일 */}
        {faceMatch.verdict && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-5 p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border-2 border-slate-700 text-center"
          >
            <p className="text-sm font-black text-white">{faceMatch.verdict}</p>
          </motion.div>
        )}
      </div>
    </SectionCard>
  )
}

