"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import type { ChemistryProfile } from "@/types/analysis"

// ========================================
// 공통 컴포넌트 (exported for ChemistryMeetingChapter)
// ========================================
export function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[var(--soft)] px-4 py-3 border-b border-[var(--line)] text-center">
      <h3 className="text-[18px] lg:text-[20px] font-bold tracking-[-0.01em] text-[var(--ink)]">{title}</h3>
    </div>
  )
}

// ========================================
// 3-7. "What if" scenario card carousel
// ========================================
export function ScenarioCarousel({ scenarios }: { scenarios: { title: string; content: string }[] }) {
  const t = useTranslations()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const idx = Math.round(el.scrollLeft / (el.clientWidth * 0.78))
    setActiveIdx(idx)
  }

  const scenarioIcons = ['🎬', '🎭', '🌟', '💭', '✨']

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.scenarios')} />
      <div className="pb-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 py-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {scenarios.map((sc, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="flex-shrink-0 w-[78%] snap-center bg-gradient-to-br from-[var(--soft)] to-[var(--canvas)] border border-[var(--line)] rounded-[6px] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{scenarioIcons[i % scenarioIcons.length]}</span>
                <h4 className="text-sm lg:text-base font-bold text-[var(--ink)]">{sc.title}</h4>
              </div>
              <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed line-clamp-4">{sc.content}</p>
            </motion.div>
          ))}
        </div>
        {/* 인디케이터 */}
        <div className="flex justify-center gap-1.5 mt-3">
          {scenarios.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'bg-[var(--soft)] w-4' : 'bg-[var(--line)]'
              }`}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-8. 대표 대사 말풍선 (채팅 UI)
// ========================================
export function DialogueBubbles({ dialogues, nameA, nameB }: {
  dialogues: ChemistryProfile['dialogues']; nameA: string; nameB: string
}) {
  const t = useTranslations()
  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.dialogues')} />
      <div className="p-4 space-y-3">
        {/* A 말풍선 (왼쪽) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex gap-2 items-end"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm lg:text-base">🌙</span>
          </div>
          <div className="max-w-[75%]">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1">{nameA}</span>
            <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] rounded-bl-[6px] p-3">
              <p className="text-sm lg:text-base font-bold text-[var(--ink)] italic">&ldquo;{dialogues.aToB.line}&rdquo;</p>
              <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] mt-1.5 italic">({dialogues.aToB.action})</p>
            </div>
          </div>
        </motion.div>

        {/* B 말풍선 (오른쪽) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 items-end flex-row-reverse"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm lg:text-base">☀️</span>
          </div>
          <div className="max-w-[75%]">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1 text-right">{nameB}</span>
            <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] rounded-br-[6px] p-3">
              <p className="text-sm lg:text-base font-bold text-[var(--ink)] italic">&ldquo;{dialogues.bToA.line}&rdquo;</p>
              <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] mt-1.5 italic">({dialogues.bToA.action})</p>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-9. 이름 케미 (숫자 피라미드)
// ========================================
export function NameChemistryPyramid({ nameA, nameB }: { nameA: string; nameB: string }) {
  const t = useTranslations()
  // 이름 획수 계산 (간단히 유니코드 코드포인트 기반)
  const getStrokes = (name: string): number[] => {
    return name.split('').map(ch => {
      const code = ch.charCodeAt(0)
      // 한글: (code - 0xAC00) 기반 pseudo 획수
      if (code >= 0xAC00 && code <= 0xD7A3) {
        return ((code - 0xAC00) % 19) + 1
      }
      // 영문: 간단히 (code % 9) + 1
      return (code % 9) + 1
    })
  }

  const strokesA = getStrokes(nameA)
  const strokesB = getStrokes(nameB)

  // 두 이름의 획수를 교차 배열
  const merged: number[] = []
  const maxLen = Math.max(strokesA.length, strokesB.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < strokesA.length) merged.push(strokesA[i])
    if (i < strokesB.length) merged.push(strokesB[i])
  }

  // 피라미드 계산
  const pyramid: number[][] = [merged.map(n => n % 10)]
  while (pyramid[pyramid.length - 1].length > 2) {
    const prev = pyramid[pyramid.length - 1]
    const next: number[] = []
    for (let i = 0; i < prev.length - 1; i++) {
      next.push((prev[i] + prev[i + 1]) % 10)
    }
    pyramid.push(next)
  }

  // 최종 결과
  const finalRow = pyramid[pyramid.length - 1]
  const finalNumber = finalRow.length === 2 ? finalRow[0] * 10 + finalRow[1] : finalRow[0]

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.nameChemistry')} />
      <div className="p-4">
        <div className="text-center mb-3">
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] bg-[var(--soft)] px-2 py-0.5 rounded-full">
            {t('chemistry.result.nameChemistrySubtitle')}
          </span>
        </div>

        {/* 이름 표시 */}
        <div className="flex justify-center gap-3 mb-4">
          <span className="text-xs lg:text-sm font-medium text-[var(--muted-ink)] bg-[var(--soft)] px-2 py-1 rounded-[6px] border border-[var(--line)]">🌙 {nameA}</span>
          <span className="text-xs lg:text-sm text-[var(--muted-ink)] font-medium">x</span>
          <span className="text-xs lg:text-sm font-medium text-[var(--muted-ink)] bg-[var(--soft)] px-2 py-1 rounded-[6px] border border-[var(--line)]">☀️ {nameB}</span>
        </div>

        {/* 피라미드 (최대 5줄만 표시) */}
        <div className="space-y-1">
          {pyramid.slice(0, 5).map((row, ri) => (
            <motion.div
              key={ri}
              initial={{ opacity: 0, y: -5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * ri }}
              className="flex justify-center gap-1"
            >
              {row.slice(0, 12).map((num, ci) => (
                <div
                  key={ci}
                  className={`w-6 h-6 rounded-[6px] flex items-center justify-center text-[10px] lg:text-[12px] font-medium ${
                    ri === pyramid.length - 1 || (pyramid.length > 5 && ri === 4)
                      ? 'bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] text-[var(--ink)]'
                      : ri === 0
                        ? ci % 2 === 0 ? 'bg-[var(--soft)] text-[var(--muted-ink)]' : 'bg-[var(--soft)] text-[var(--muted-ink)]'
                        : 'bg-[var(--soft)] text-[var(--muted-ink)]'
                  }`}
                >
                  {num}
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* 최종 결과 */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, type: "spring" }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] text-[var(--ink)] px-5 py-2.5 rounded-full border border-[var(--line)]">
            <span className="text-lg font-bold">{finalNumber}%</span>
          </div>
          <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] mt-2">
            {finalNumber >= 80
              ? t('chemistry.result.nameChemistryLevels.perfect')
              : finalNumber >= 60
                ? t('chemistry.result.nameChemistryLevels.good')
                : finalNumber >= 40
                  ? t('chemistry.result.nameChemistryLevels.pushPull')
                  : t('chemistry.result.nameChemistryLevels.twist')}
          </p>
        </motion.div>
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-10. 레이어링 가이드 인포그래픽
// ========================================
export function LayeringInfographic({ guide, nameA, nameB }: {
  guide: ChemistryProfile['layeringGuide']; nameA: string; nameB: string
}) {
  const t = useTranslations()
  const tLabels = useTranslations('labels')
  // 비율 파싱 — "3:7" → 30:70으로 정규화
  const ratioMatch = guide.ratio.match(/(\d+)\s*:\s*(\d+)/)
  let ratioA = ratioMatch ? parseInt(ratioMatch[1]) : 6
  let ratioB = ratioMatch ? parseInt(ratioMatch[2]) : 4
  // 합이 10 이하면 x10 (3:7 → 30:70)
  if (ratioA + ratioB <= 10) { ratioA *= 10; ratioB *= 10 }
  const total = ratioA + ratioB
  const percentA = Math.round(ratioA / total * 100)
  const percentB = 100 - percentA

  const seasonIcons: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' }
  const seasonLabel = `${tLabels(`seasons.${guide.seasonTime.best_season}`)} ${seasonIcons[guide.seasonTime.best_season] || ''}`.trim()
  const timeLabel = tLabels(`times.${guide.seasonTime.best_time}`)

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.layeringGuide')} />
      <div className="p-4 space-y-5">

        {/* 뿌리는 순서 */}
        <div>
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-3">{t('chemistry.result.sprayOrder')}</span>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                <span className="text-lg">🌙</span>
              </div>
              <span className="text-[11px] lg:text-[13px] font-medium text-[var(--muted-ink)]">{nameA}</span>
              <span className="text-[9px] text-[var(--muted-ink)] font-medium">FIRST</span>
            </div>
            <div className="flex flex-col items-center">
              <svg width="40" height="16" viewBox="0 0 40 16" className="flex-shrink-0">
                <path d="M0 8h30M26 3l8 5-8 5" fill="none" stroke="#7B7B7B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                <span className="text-lg">☀️</span>
              </div>
              <span className="text-[11px] lg:text-[13px] font-medium text-[var(--muted-ink)]">{nameB}</span>
              <span className="text-[9px] text-[var(--muted-ink)] font-medium">SECOND</span>
            </div>
          </div>
        </div>

        {/* 비율 — 가로 바 형태 */}
        <div>
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-2">{t('chemistry.result.ratio')}</span>
          <div className="flex h-8 rounded-full overflow-hidden border border-[var(--line)]">
            <div className="bg-[var(--soft)] flex items-center justify-center" style={{ width: `${percentA}%` }}>
              <span className="text-[10px] lg:text-[12px] font-medium text-[var(--ink)]">{percentA}%</span>
            </div>
            <div className="bg-[var(--soft)] flex items-center justify-center" style={{ width: `${percentB}%` }}>
              <span className="text-[10px] lg:text-[12px] font-medium text-[var(--ink)]">{percentB}%</span>
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">🌙 {nameA}</span>
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)]">☀️ {nameB}</span>
          </div>
        </div>

        {/* 레이어링 팁 */}
        <div className="bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] p-3 border border-[var(--line)]">
          <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider block mb-1.5">{t('chemistry.result.layeringTip')}</span>
          <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed font-medium">{guide.method}</p>
        </div>

        {/* 추천 상황/계절/시간 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3 text-center">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1">{t('chemistry.result.season')}</span>
            <span className="text-xs lg:text-sm font-medium text-[var(--muted-ink)]">{seasonLabel}</span>
          </div>
          <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3 text-center">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1">{t('chemistry.result.time')}</span>
            <span className="text-xs lg:text-sm font-medium text-[var(--muted-ink)]">{timeLabel}</span>
          </div>
          <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-3 text-center">
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] block mb-1">{t('chemistry.result.situation')}</span>
            <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] leading-tight block">{guide.situation}</span>
          </div>
        </div>

        {/* 이유 */}
        {guide.seasonTime.reason && (
          <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] leading-relaxed italic">💡 {guide.seasonTime.reason}</p>
        )}
      </div>
    </SectionCard>
  )
}

// ========================================
// 3-11. 미래 예측 타임라인
// ========================================
export function FutureTimeline({ predictions, futureVision }: {
  predictions?: { timeLabel: string; prediction: string }[]
  futureVision: string
}) {
  const t = useTranslations()
  const milestones = predictions && predictions.length > 0
    ? predictions
    : generateDefaultPredictions(futureVision, t)

  const dotColors = ['bg-[var(--soft)]', 'bg-[var(--soft)]', 'bg-[var(--soft)]', 'bg-[var(--soft)]', 'bg-[var(--soft)]']
  const emojis = ['🌱', '🌿', '🌸', '🌳', '✨']

  return (
    <SectionCard>
      <SectionHeader title={t('chemistry.result.future')} />
      <div className="p-4">
        <div className="space-y-0">
          {milestones.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * i }}
              className="flex gap-3"
            >
              {/* 타임라인 축 */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 24 }}>
                <div className={`w-6 h-6 rounded-full ${dotColors[i] || dotColors[0]} flex items-center justify-center text-[10px] lg:text-[12px] shadow-sm`}>
                  {emojis[i] || '⭐'}
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-[var(--line)] to-[var(--line)] my-1" />
                )}
              </div>
              {/* 콘텐츠 */}
              <div className="pb-4 flex-1 min-w-0">
                <span className="text-[10px] lg:text-[12px] font-medium text-[var(--muted-ink)] uppercase tracking-wider">{m.timeLabel}</span>
                <p className="text-xs lg:text-sm text-[var(--muted-ink)] leading-relaxed mt-1 font-medium">{m.prediction}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

function generateDefaultPredictions(futureVision: string, t: (key: string) => string): { timeLabel: string; prediction: string }[] {
  // 문장을 더 안전하게 분리 — 빈 문장 방지
  const sentences = futureVision
    .split(/(?<=[.!?~])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5)

  const labels = [
    t('chemistry.result.timeline.firstDay'),
    t('chemistry.result.timeline.oneWeek'),
    t('chemistry.result.timeline.oneMonth'),
    t('chemistry.result.timeline.oneYear'),
    t('chemistry.result.timeline.forever'),
  ]

  if (sentences.length >= 4) {
    return labels.slice(0, sentences.length).map((label, i) => ({
      timeLabel: label,
      prediction: sentences[i],
    }))
  }

  // 문장이 부족하면 전체를 하나로 + 보충 멘트
  return [
    { timeLabel: t('chemistry.result.timeline.firstDay'), prediction: sentences[0] || futureVision },
    { timeLabel: t('chemistry.result.timeline.oneMonth'), prediction: sentences[1] || t('chemistry.result.timeline.monthFallback') },
    { timeLabel: t('chemistry.result.timeline.oneYear'), prediction: sentences[2] || t('chemistry.result.timeline.yearFallback') },
    { timeLabel: t('chemistry.result.timeline.forever'), prediction: sentences[3] || t('chemistry.result.timeline.foreverFallback') },
  ]
}
