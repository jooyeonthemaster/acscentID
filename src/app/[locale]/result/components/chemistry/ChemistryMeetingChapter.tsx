"use client"

import React, { useRef } from "react"
import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'
import type { ChemistryProfile, TraitScores, ScentCategoryScores, ImageAnalysisResult } from "@/types/analysis"
import { CATEGORY_INFO, CHEMISTRY_TYPE_COLORS, CHEMISTRY_TYPE_ICONS } from "@/types/analysis"
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

  const setSectionRef = (id: string) => (el: HTMLDivElement | null) => {
    if (sectionRefs.current) {
      sectionRefs.current[id] = el
    }
  }

  return (
    <div className="px-4 space-y-5">
      {/* 챕터 헤더 */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--ink)]">{t('chemistry.result.meetingTitle')}</h2>
        <p className="text-xs lg:text-sm text-[var(--muted-ink)] mt-1">{t('chemistry.result.meetingSubtitle')}</p>
      </div>

      {/* === 섹션: 얼굴합 === */}
      {chemistry.faceMatch && (
        <div ref={setSectionRef('face')} className="scroll-mt-[190px]">
          <FaceCompatibilitySection faceMatch={chemistry.faceMatch} />
        </div>
      )}

      {/* === 섹션: 케미 타입 === */}
      <div ref={setSectionRef('type')} className="scroll-mt-[190px]">
        {/* 케미 타입 대형 카드 (최상단) */}
        <ChemistryTypeCard chemistry={chemistry} />

        {/* 케미 스토리 (주접 멘트) */}
        {chemistry.chemistryStory && (
          <div className="mt-5">
            <SectionCard>
              <SectionHeader title={t('chemistry.result.story')} />
              <div className="p-4">
                <div className="relative bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-4 overflow-hidden border border-[var(--line)]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-stone-300/20 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-[var(--muted-ink)] text-sm lg:text-base font-medium leading-relaxed whitespace-pre-wrap italic">
                      &ldquo;{chemistry.chemistryStory}&rdquo;
                    </p>
                    <p className="text-[var(--muted-ink)] text-xs lg:text-sm mt-3 font-medium">
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
      <div ref={setSectionRef('traits')} className="scroll-mt-[190px] space-y-5">
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
      <div ref={setSectionRef('scent')} className="scroll-mt-[190px] space-y-5">
        {characterA && characterB && (
          <ScentComparisonChart
            categoriesA={characterA.scentCategories}
            categoriesB={characterB.scentCategories}
            nameA={character1Name}
            nameB={character2Name}
            harmonyComment={chemistry.scentHarmony.layeringEffect}
          />
        )}

        <ScentHarmonyDiagram chemistry={chemistry} />

        <LayeringInfographic
          guide={chemistry.layeringGuide}
          nameA={character1Name}
          nameB={character2Name}
        />
      </div>

      {/* === 섹션: 관계 다이나믹 === */}
      <div ref={setSectionRef('dynamic')} className="scroll-mt-[190px] space-y-5">
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
  const t = useTranslations()
  const typeColor = CHEMISTRY_TYPE_COLORS[chemistry.chemistryType]
  const typeLabel = t(`chemistry.typeLabels.${chemistry.chemistryType}`)
  const typeIcon = CHEMISTRY_TYPE_ICONS[chemistry.chemistryType]

  return (
    <SectionCard>
      {/* 타입 헤더 */}
      <div className={`bg-gradient-to-br ${typeColor.gradient} p-6 text-center text-[var(--ink)] relative overflow-hidden`}>
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
        <h3 className="text-xl font-bold relative z-10">{typeLabel}</h3>
        <p className="text-sm lg:text-base text-white/90 mt-2 relative z-10 font-medium leading-relaxed">
          &ldquo;{chemistry.chemistryTitle}&rdquo;
        </p>
      </div>

      {/* 시너지 분석 보고서 */}
      <div className="p-5 space-y-4">
        {/* 공유 강점 */}
        <div className="border-l-4 border-[var(--line)] pl-3">
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-2">{t('chemistry.result.sharedStrengths')}</span>
          <div className="space-y-2">
            {chemistry.traitsSynergy.sharedStrengths.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--muted-ink)] text-xs lg:text-sm mt-0.5 flex-shrink-0">&#9679;</span>
                <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-[var(--line)]" />

        {/* 보완 특성 */}
        {chemistry.traitsSynergy.complementaryTraits.length > 0 && (
          <div className="border-l-4 border-[var(--line)] pl-3">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-2">{t('chemistry.result.complementaryTraits')}</span>
            <div className="space-y-2">
              {chemistry.traitsSynergy.complementaryTraits.slice(0, 2).map((ct, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[var(--muted-ink)] text-xs lg:text-sm mt-0.5 flex-shrink-0">&#9679;</span>
                  <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed">{ct}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다이나믹 텐션 */}
        {chemistry.traitsSynergy.dynamicTension && (
          <>
            <div className="border-t border-[var(--line)]" />
            <div className="bg-gradient-to-r from-[var(--soft)]/80 to-[var(--soft)]/80 rounded-[6px] p-3 border border-[var(--line)]">
              <span className="text-[9px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-1.5">{t('chemistry.result.summaryLabel')}</span>
              <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] leading-relaxed">{chemistry.traitsSynergy.dynamicTension}</p>
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
  const t = useTranslations()
  const tLabels = useTranslations('labels')
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
      <SectionHeader title={t('chemistry.result.traitsRadar')} />
      <div className="p-4">
        {/* 범례 */}
        <div className="flex justify-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[var(--soft)]" />
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">🌙 {nameA}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[var(--soft)]" />
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">☀️ {nameB}</span>
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
              fill="rgba(123,123,123, 0.15)"
              stroke="#7B7B7B"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            />
            {/* B 데이터 */}
            <motion.path
              d={makePath(entriesB)}
              fill="rgba(136,136,136, 0.15)"
              stroke="#888888"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            {/* 점 */}
            {entriesA.map(([, v], i) => {
              const { x, y } = getXY(v, i)
              return <circle key={`a-${i}`} cx={x} cy={y} r="3" fill="#7B7B7B" stroke="white" strokeWidth="1.5" />
            })}
            {entriesB.map(([, v], i) => {
              const { x, y } = getXY(v, i)
              return <circle key={`b-${i}`} cx={x} cy={y} r="3" fill="#888888" stroke="white" strokeWidth="1.5" />
            })}
            {/* 라벨 */}
            {entriesA.map(([key], i) => {
              const { x, y } = getXY(max * 1.2, i)
              return (
                <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontWeight="700" fill="#737373">
                  {tLabels(`traits.${key}`)}
                </text>
              )
            })}
          </svg>
        </div>

        {/* 시너지 코멘트 (주접 텍스트) */}
        {synergyComment && (
          <div className="mt-3 p-3 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)]">
            <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed italic">{synergyComment}</p>
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
  const t = useTranslations()
  const tLabels = useTranslations('labels')
  const keys = Object.keys(categoriesA) as (keyof ScentCategoryScores)[]

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.scentProfileComparison')} />
      <div className="p-4">
        {/* 범례 */}
        <div className="flex justify-between mb-3 px-2">
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">🌙 {nameA}</span>
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">☀️ {nameB}</span>
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
                    className="h-5 bg-[var(--soft)] rounded-l-full flex items-center justify-start pl-1.5"
                  >
                    <span className="text-[9px] font-medium text-[var(--ink)]">{valA}</span>
                  </motion.div>
                </div>
                {/* 중앙 라벨 */}
                <div className="w-14 text-center flex-shrink-0">
                  <span className="text-[10px] lg:text-[12px]">{info.icon}</span>
                  <span className="text-[9px] font-medium text-[var(--muted-ink)] block">{tLabels(`categories.${key}`)}</span>
                </div>
                {/* B 바 (왼쪽 정렬) */}
                <div className="flex-1 flex justify-start">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(valB / 10) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-5 bg-[var(--soft)] rounded-r-full flex items-center justify-end pr-1.5"
                  >
                    <span className="text-[9px] font-medium text-[var(--ink)]">{valB}</span>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 레이어링 효과 코멘트 (주접 텍스트) */}
        {harmonyComment && (
          <div className="mt-3 p-3 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)]">
            <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed italic">{harmonyComment}</p>
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
  const t = useTranslations()

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.colorChemistry')} />
      <div className="p-4 space-y-4">
        {/* A의 컬러 */}
        <ColorRow label={`🌙 ${nameA}`} colors={paletteA} />
        {/* 블렌딩 컬러 (중앙, 강조) */}
        <div className="text-center">
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] mb-1.5 block">BLEND</span>
          <div className="flex gap-2 justify-center">
            {blended.map((color, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -90 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, type: "spring" }}
                className="w-11 h-11 rounded-full border border-[var(--line)]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        {/* B의 컬러 */}
        <ColorRow label={`☀️ ${nameB}`} colors={paletteB} />

        <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] text-center font-medium mt-2">{chemistry.colorChemistry.description}</p>
      </div>
    </SectionCard>
  )
}

function ColorRow({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="text-center">
      <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] mb-1.5 block">{label}</span>
      <div className="flex gap-2 justify-center">
        {colors.map((color, i) => (
          <div key={i} className="w-9 h-9 rounded-full border border-[var(--line)] shadow-sm" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  )
}

// ========================================
// 3-5. 향 하모니 도식 (피라미드 + 연결선)
// ========================================
function ScentHarmonyDiagram({ chemistry }: {
  chemistry: ChemistryProfile
}) {
  const t = useTranslations()
  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.scentHarmonyDiagram')} />
      <div className="p-5">
        {/* 3단 피라미드 시각화 - 개선된 버전 */}
        <div className="space-y-3">
          <HarmonyLevel
            level="TOP"
            levelLabel={t('chemistry.result.firstImpression')}
            content={chemistry.scentHarmony.topNoteInteraction}
            gradient="from-[var(--soft)] to-[var(--soft)]"
            bg="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]"
            border="border-[var(--line)]"
            delay={0}
          />
          <HarmonyLevel
            level="MIDDLE"
            levelLabel={t('chemistry.result.mood')}
            content={chemistry.scentHarmony.middleNoteInteraction}
            gradient="from-[var(--line)] to-[var(--line)]"
            bg="bg-gradient-to-r from-[var(--soft)]/60 to-[var(--soft)]/60"
            border="border-[var(--line)]"
            delay={0.15}
          />
          <HarmonyLevel
            level="BASE"
            levelLabel={t('chemistry.result.trail')}
            content={chemistry.scentHarmony.baseNoteInteraction}
            gradient="from-[var(--line)] to-[var(--line)]"
            bg="bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]"
            border="border-[var(--line)]"
            delay={0.3}
          />
        </div>

        {/* 전체 하모니 요약 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-5 p-4 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)]"
        >
          <span className="text-[9px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-1.5">{t('chemistry.result.overallHarmony')}</span>
          <p className="text-xs lg:text-sm font-medium text-[var(--muted-ink)] leading-relaxed">{chemistry.scentHarmony.overallHarmony}</p>
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
      className={`${bg} border ${border} rounded-[6px] p-3.5 flex items-start gap-3`}
    >
      <div className="flex-shrink-0 text-center">
        <div className={`w-12 h-12 rounded-[6px] bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--ink)]">{level}</span>
        </div>
        <span className="text-[9px] text-[var(--muted-ink)] font-medium mt-1 block">{levelLabel}</span>
      </div>
      <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] leading-relaxed flex-1 pt-1">{content}</p>
    </motion.div>
  )
}

// ========================================
// 3-6. 관계 다이나믹 키워드 클라우드
// ========================================
function KeywordBubbleCloud({ keywords, description, bestMoment }: {
  keywords: string[]; description: string; bestMoment: string
}) {
  const t = useTranslations()
  const sizes = [
    { size: 'text-base px-4 py-2', scale: 1.2 },
    { size: 'text-sm lg:text-base px-3.5 py-1.5', scale: 1.1 },
    { size: 'text-xs lg:text-sm px-3 py-1.5', scale: 1 },
    { size: 'text-xs lg:text-sm px-2.5 py-1', scale: 0.9 },
    { size: 'text-[11px] lg:text-[13px] px-2.5 py-1', scale: 0.85 },
  ]
  const colors = [
    'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] text-[var(--ink)]',
    'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] text-[var(--ink)]',
    'bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)]',
    'bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)]',
    'bg-[var(--soft)] text-[var(--muted-ink)] border border-[var(--line)]',
  ]

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.relationship')} />
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
                className={`${s.size} ${c} rounded-full font-bold shadow-sm whitespace-nowrap`}
              >
                #{kw}
              </motion.div>
            )
          })}
        </div>

        {/* 다이나믹 설명 */}
        {description && (
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] text-center mt-4 leading-relaxed">{description}</p>
        )}

        {/* Best Moment */}
        {bestMoment && (
          <div className="mt-3 p-3 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1">{t('chemistry.result.bestMoment')}</span>
            <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed">{bestMoment}</p>
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
  const t = useTranslations()
  const score = faceMatch.score

  // 티어 판정 (최소 50%)
  const getTier = (s: number) => {
    if (s >= 90) return { labelKey: 'soulmate', emoji: '💘', color: 'text-[var(--muted-ink)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]' }
    if (s >= 75) return { labelKey: 'realDeal', emoji: '🔥', color: 'text-[var(--muted-ink)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]' }
    if (s >= 65) return { labelKey: 'subtle', emoji: '✨', color: 'text-[var(--muted-ink)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]' }
    return { labelKey: 'mysterious', emoji: '🌙', color: 'text-[var(--muted-ink)]', bg: 'bg-[var(--soft)]', border: 'border-[var(--line)]' }
  }

  // 개별 바 색상 — 각 척도 자체 점수 기반
  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]'
    if (s >= 65) return 'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]'
    return 'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)]'
  }

  const tier = getTier(score)

  const criteria = [
    { label: t('chemistry.result.faceCriteria.atmosphere'), emoji: '🌐', score: faceMatch.atmosphere, desc: faceMatch.atmosphereDesc },
    { label: t('chemistry.result.faceCriteria.contrast'), emoji: '❄️🔥', score: faceMatch.contrast, desc: faceMatch.contrastDesc },
    { label: t('chemistry.result.faceCriteria.colorHarmony'), emoji: '🎨', score: faceMatch.colorHarmony, desc: faceMatch.colorHarmonyDesc },
    { label: t('chemistry.result.faceCriteria.styleMatch'), emoji: '👔', score: faceMatch.styleMatch, desc: faceMatch.styleMatchDesc },
  ]

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.faceMatch')} />
      <div className="p-5">
        {/* 큰 점수 + 라벨 + 티어 뱃지 */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-[0.2em] block mb-1">Face Match</span>
            <div className="flex items-baseline justify-center gap-0">
              <span className={`text-8xl font-bold ${tier.color} tabular-nums leading-none`}>{score}</span>
              <span className={`text-4xl font-bold ${tier.color} -ml-1`}>%</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 ${tier.bg} ${tier.border} border rounded-full`}>
                <span className="text-lg">{tier.emoji}</span>
                <span className={`text-sm lg:text-base font-bold ${tier.color}`}>{t(`chemistry.tiers.${tier.labelKey}`)}</span>
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
                  <span className="text-sm lg:text-base">{item.emoji}</span>
                  <span className="text-xs lg:text-sm font-medium text-[var(--muted-ink)]">{item.label}</span>
                </div>
                <span className="text-sm lg:text-base font-bold text-[var(--ink)] tabular-nums">{item.score}</span>
              </div>
              {/* 바 — h-5, 50% 참조선 */}
              <div className="relative w-full h-5 bg-[var(--soft)] rounded-full overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-300/60 z-10" />
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
                <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] mt-1.5 leading-relaxed">{item.desc}</p>
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
            className="mt-5 p-4 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)] text-center"
          >
            <p className="text-sm lg:text-base font-bold text-[var(--ink)]">{faceMatch.verdict}</p>
          </motion.div>
        )}
      </div>
    </SectionCard>
  )
}
