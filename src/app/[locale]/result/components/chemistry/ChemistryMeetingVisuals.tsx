"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
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
      className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_black] overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

export function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="bg-[#FFF8E7] px-4 py-3 border-b-2 border-black flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
    </div>
  )
}

// ========================================
// 3-7. "만약에" 시나리오 카드 캐러셀
// ========================================
export function ScenarioCarousel({ scenarios }: { scenarios: { title: string; content: string }[] }) {
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
      <SectionHeader emoji="🔮" title="만약에..." />
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
              className="flex-shrink-0 w-[78%] snap-center bg-gradient-to-br from-[#FFFDF5] to-[#FFF8E7] border-2 border-slate-200 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{scenarioIcons[i % scenarioIcons.length]}</span>
                <h4 className="text-sm font-black text-slate-800">{sc.title}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{sc.content}</p>
            </motion.div>
          ))}
        </div>
        {/* 인디케이터 */}
        <div className="flex justify-center gap-1.5 mt-3">
          {scenarios.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'bg-violet-500 w-4' : 'bg-slate-300'
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
  return (
    <SectionCard>
      <SectionHeader emoji="💬" title="대표 대사" />
      <div className="p-4 space-y-3">
        {/* A 말풍선 (왼쪽) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex gap-2 items-end"
        >
          <div className="w-8 h-8 rounded-full bg-violet-100 border-2 border-violet-300 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🌙</span>
          </div>
          <div className="max-w-[75%]">
            <span className="text-[10px] font-black text-violet-600 block mb-1">{nameA}</span>
            <div className="bg-violet-100 border-2 border-violet-200 rounded-2xl rounded-bl-md p-3">
              <p className="text-sm font-bold text-slate-800 italic">&ldquo;{dialogues.aToB.line}&rdquo;</p>
              <p className="text-[10px] text-violet-500 mt-1.5 italic">({dialogues.aToB.action})</p>
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
          <div className="w-8 h-8 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">☀️</span>
          </div>
          <div className="max-w-[75%]">
            <span className="text-[10px] font-black text-pink-600 block mb-1 text-right">{nameB}</span>
            <div className="bg-pink-100 border-2 border-pink-200 rounded-2xl rounded-br-md p-3">
              <p className="text-sm font-bold text-slate-800 italic">&ldquo;{dialogues.bToA.line}&rdquo;</p>
              <p className="text-[10px] text-pink-500 mt-1.5 italic">({dialogues.bToA.action})</p>
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
      <SectionHeader emoji="🔢" title="이름 케미" />
      <div className="p-4">
        <div className="text-center mb-3">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            재미로 보는 이름 궁합
          </span>
        </div>

        {/* 이름 표시 */}
        <div className="flex justify-center gap-3 mb-4">
          <span className="text-xs font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg border border-violet-200">🌙 {nameA}</span>
          <span className="text-xs text-slate-400 font-bold">x</span>
          <span className="text-xs font-black text-pink-600 bg-pink-50 px-2 py-1 rounded-lg border border-pink-200">☀️ {nameB}</span>
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
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                    ri === pyramid.length - 1 || (pyramid.length > 5 && ri === 4)
                      ? 'bg-gradient-to-r from-violet-400 to-pink-400 text-white'
                      : ri === 0
                        ? ci % 2 === 0 ? 'bg-violet-100 text-violet-700' : 'bg-pink-100 text-pink-700'
                        : 'bg-slate-100 text-slate-600'
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
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-5 py-2.5 rounded-full border-2 border-black shadow-[3px_3px_0_0_black]">
            <span className="text-lg font-black">{finalNumber}%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {finalNumber >= 80 ? '완벽한 케미!' : finalNumber >= 60 ? '좋은 케미!' : finalNumber >= 40 ? '밀당 케미!' : '반전 매력 케미!'}
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
  // 비율 파싱 — "3:7" → 30:70으로 정규화
  const ratioMatch = guide.ratio.match(/(\d+)\s*:\s*(\d+)/)
  let ratioA = ratioMatch ? parseInt(ratioMatch[1]) : 6
  let ratioB = ratioMatch ? parseInt(ratioMatch[2]) : 4
  // 합이 10 이하면 x10 (3:7 → 30:70)
  if (ratioA + ratioB <= 10) { ratioA *= 10; ratioB *= 10 }
  const total = ratioA + ratioB
  const percentA = Math.round(ratioA / total * 100)
  const percentB = 100 - percentA

  // 계절 한글 매핑
  const seasonMap: Record<string, string> = { spring: '봄 🌸', summer: '여름 ☀️', autumn: '가을 🍂', winter: '겨울 ❄️' }
  const timeMap: Record<string, string> = { morning: '오전', afternoon: '오후', evening: '저녁', night: '밤' }
  const seasonLabel = seasonMap[guide.seasonTime.best_season] || guide.seasonTime.best_season
  const timeLabel = timeMap[guide.seasonTime.best_time] || guide.seasonTime.best_time

  return (
    <SectionCard>
      <SectionHeader emoji="✨" title="레이어링 가이드" />
      <div className="p-4 space-y-5">

        {/* 뿌리는 순서 */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">뿌리는 순서</span>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-violet-100 border-2 border-violet-300 flex items-center justify-center">
                <span className="text-lg">🌙</span>
              </div>
              <span className="text-[11px] font-black text-violet-700">{nameA}</span>
              <span className="text-[9px] text-violet-500 font-bold">FIRST</span>
            </div>
            <div className="flex flex-col items-center">
              <svg width="40" height="16" viewBox="0 0 40 16" className="flex-shrink-0">
                <path d="M0 8h30M26 3l8 5-8 5" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center">
                <span className="text-lg">☀️</span>
              </div>
              <span className="text-[11px] font-black text-pink-700">{nameB}</span>
              <span className="text-[9px] text-pink-500 font-bold">SECOND</span>
            </div>
          </div>
        </div>

        {/* 비율 — 가로 바 형태 */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">비율</span>
          <div className="flex h-8 rounded-full overflow-hidden border-2 border-slate-900 shadow-[2px_2px_0_0_black]">
            <div className="bg-violet-400 flex items-center justify-center" style={{ width: `${percentA}%` }}>
              <span className="text-[10px] font-black text-white">{percentA}%</span>
            </div>
            <div className="bg-pink-400 flex items-center justify-center" style={{ width: `${percentB}%` }}>
              <span className="text-[10px] font-black text-white">{percentB}%</span>
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-bold text-violet-600">🌙 {nameA}</span>
            <span className="text-[10px] font-bold text-pink-600">☀️ {nameB}</span>
          </div>
        </div>

        {/* 레이어링 팁 */}
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-3 border border-violet-200">
          <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider block mb-1.5">레이어링 팁</span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{guide.method}</p>
        </div>

        {/* 추천 상황/계절/시간 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-black text-slate-400 block mb-1">계절</span>
            <span className="text-xs font-black text-amber-700">{seasonLabel}</span>
          </div>
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-black text-slate-400 block mb-1">시간대</span>
            <span className="text-xs font-black text-indigo-700">{timeLabel}</span>
          </div>
          <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-black text-slate-400 block mb-1">상황</span>
            <span className="text-[10px] font-black text-rose-700 leading-tight block">{guide.situation}</span>
          </div>
        </div>

        {/* 이유 */}
        {guide.seasonTime.reason && (
          <p className="text-[11px] text-slate-500 leading-relaxed italic">💡 {guide.seasonTime.reason}</p>
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
  const milestones = predictions && predictions.length > 0
    ? predictions
    : generateDefaultPredictions(futureVision)

  const dotColors = ['bg-violet-500', 'bg-fuchsia-400', 'bg-pink-400', 'bg-rose-400', 'bg-amber-500']
  const emojis = ['🌱', '🌿', '🌸', '🌳', '✨']

  return (
    <SectionCard>
      <SectionHeader emoji="🔮" title="미래 예측" />
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
                <div className={`w-6 h-6 rounded-full ${dotColors[i] || dotColors[0]} flex items-center justify-center text-[10px] shadow-sm`}>
                  {emojis[i] || '⭐'}
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-violet-200 to-pink-200 my-1" />
                )}
              </div>
              {/* 콘텐츠 */}
              <div className="pb-4 flex-1 min-w-0">
                <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">{m.timeLabel}</span>
                <p className="text-xs text-slate-700 leading-relaxed mt-1 font-medium">{m.prediction}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

function generateDefaultPredictions(futureVision: string): { timeLabel: string; prediction: string }[] {
  // 문장을 더 안전하게 분리 — 빈 문장 방지
  const sentences = futureVision
    .split(/(?<=[.!?~])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5)

  const labels = ['처음 만난 날', '일주일 후', '한 달 후', '일 년 후', '영원히']

  if (sentences.length >= 4) {
    return labels.slice(0, sentences.length).map((label, i) => ({
      timeLabel: label,
      prediction: sentences[i],
    }))
  }

  // 문장이 부족하면 전체를 하나로 + 보충 멘트
  return [
    { timeLabel: '처음 만난 날', prediction: sentences[0] || futureVision },
    { timeLabel: '한 달 후', prediction: sentences[1] || '서로의 향기에 점점 익숙해지는 중...' },
    { timeLabel: '일 년 후', prediction: sentences[2] || '이제 이 향기 없인 살 수 없는 사이가 됐어!' },
    { timeLabel: '영원히', prediction: sentences[3] || '두 향기가 하나의 전설이 되는 순간 ✨' },
  ]
}
