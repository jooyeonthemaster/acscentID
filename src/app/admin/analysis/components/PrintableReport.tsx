'use client'

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react'
import { ImageAnalysisResult, TraitScores, ScentCategoryScores, TRAIT_LABELS, TRAIT_ICONS, CATEGORY_INFO, SEASON_LABELS, TONE_LABELS, ChemistryProfile, SajuAnalysisResult, SajuElement, SAJU_ELEMENT_INFO, SAJU_PURPOSES } from '@/types/analysis'

interface PrintableAnalysis {
  id: string
  analysis_data: ImageAnalysisResult
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  matching_keywords: string[]
  idol_name: string | null
  idol_gender: string | null
  product_type?: string | null
  service_mode: string
  created_at: string
  user_image_url?: string | null
  target_type?: 'idol' | 'self' | null
  character_name?: string | null
}

interface PrintableLayeringSession {
  analysis_a_id?: string | null
  analysis_b_id?: string | null
  chemistry_data?: ChemistryProfile | null
  target_type?: 'idol' | 'self' | null
}

interface PrintableReportProps {
  analysis: PrintableAnalysis
  feedback?: {
    perfume_name: string
    retention_percentage: number
    generated_recipe?: {
      granules: Array<{
        id: string
        name: string
        mainCategory: string
        drops: number
        ratio: number
        reason?: string
      }>
      overallExplanation?: string
      totalDrops: number
    } | null
  } | null
  userProfile?: {
    name: string | null
    email: string | null
  } | null
  layeringSession?: PrintableLayeringSession | null
  partnerAnalysis?: PrintableAnalysis | null
  rootId?: string
  standalonePrintStyles?: boolean
}

// 특성 컬러 테마 (기존 TraitRadarChart와 동일)
const TRAIT_COLORS: Record<keyof TraitScores, { bg: string; text: string; border: string }> = {
  sexy: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400' },
  cute: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-400' },
  charisma: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  darkness: { bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-500' },
  freshness: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
  elegance: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-400' },
  freedom: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-400' },
  luxury: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' },
  purity: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300' },
  uniqueness: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-400' },
}

// 향 카테고리 컬러 (기존 PerfumeProfile과 동일)
const categoryColors: Record<string, { bar: string; bg: string; border: string; text: string }> = {
  citrus: { bar: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
  floral: { bar: 'bg-pink-400', bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  woody: { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  musky: { bar: 'bg-purple-400', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  fruity: { bar: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  spicy: { bar: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
}

// 키워드 스타일 (기존 KeywordCloud와 동일)
const KEYWORD_STYLES = [
  { bg: 'bg-gradient-to-r from-pink-400 to-rose-400', text: 'text-white', shape: 'rounded-lg', decoration: '🎀', border: '' },
  { bg: 'bg-[#FEF9C3]', text: 'text-amber-800', shape: 'rounded-xl', decoration: '⭐', border: 'border-2 border-slate-900' },
  { bg: 'bg-gradient-to-br from-cyan-200 to-teal-200', text: 'text-teal-800', shape: 'rounded-full', decoration: '✨', border: 'border border-teal-300' },
  { bg: 'bg-violet-100', text: 'text-violet-700', shape: 'rounded-2xl', decoration: '💜', border: 'border-2 border-violet-300 border-dashed' },
  { bg: 'bg-gradient-to-r from-orange-400 to-amber-400', text: 'text-white', shape: 'rounded-lg', decoration: '🔥', border: '' },
  { bg: 'bg-sky-50', text: 'text-sky-700', shape: 'rounded-lg', decoration: '💙', border: 'border-2 border-sky-300' },
  { bg: 'bg-rose-50', text: 'text-rose-600', shape: 'rounded-xl', decoration: '💕', border: 'border-2 border-rose-200' },
  { bg: 'bg-gradient-to-r from-emerald-400 to-green-400', text: 'text-white', shape: 'rounded-full', decoration: '🌿', border: '' },
]

// 계절/시간 아이콘
const SEASON_ICONS: Record<string, { emoji: string; label: string }> = {
  spring: { emoji: '🌸', label: '봄' },
  summer: { emoji: '☀️', label: '여름' },
  autumn: { emoji: '🍂', label: '가을' },
  winter: { emoji: '❄️', label: '겨울' },
}

const TIME_ICONS: Record<string, { emoji: string; label: string }> = {
  morning: { emoji: '🌅', label: '오전' },
  afternoon: { emoji: '☀️', label: '오후' },
  evening: { emoji: '🌆', label: '저녁' },
  night: { emoji: '🌙', label: '밤' },
}

// 시드 기반 랜덤 (KeywordCloud와 동일)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// 정적 레이더 차트 (기존 TraitRadarChart 스타일)
function PrintRadarChart({ traits, monochrome = false }: { traits: TraitScores, monochrome?: boolean }) {
  const centerX = 100
  const centerY = 100
  const radius = 55
  const maxValue = 10



  const characteristics = Object.entries(traits).map(([key, value]) => ({
    key: key as keyof TraitScores,
    label: TRAIT_LABELS[key as keyof TraitScores],
    value,
    icon: TRAIT_ICONS[key as keyof TraitScores]
  }))

  const angleStep = (Math.PI * 2) / characteristics.length

  const getCoordinates = (value: number, index: number) => {
    const normalizedValue = value / maxValue
    const angle = index * angleStep - Math.PI / 2
    const x = centerX + radius * normalizedValue * Math.cos(angle)
    const y = centerY + radius * normalizedValue * Math.sin(angle)
    return { x, y }
  }

  const createPath = () => {
    const points = characteristics.map((char, i) => {
      const { x, y } = getCoordinates(char.value, i)
      return `${x},${y}`
    })
    return `M${points.join(' L')} Z`
  }

  // 그리드 원 (5단계)
  const gridCircles = Array.from({ length: 5 }).map((_, i) => {
    const gridRadius = (radius * (i + 1)) / 5
    return (
      <circle
        key={`grid-${i}`}
        cx={centerX}
        cy={centerY}
        r={gridRadius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  })

  // 축선 (10개)
  const axisLines = characteristics.map((_, i) => {
    const { x, y } = getCoordinates(maxValue, i)
    return (
      <line
        key={`axis-${i}`}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#e2e8f0"
        strokeWidth="1"
        strokeLinecap="round"
      />
    )
  })

  // 라벨
  const labels = characteristics.map((char, i) => {
    const angle = i * angleStep - Math.PI / 2
    // 텍스트 정렬을 위한 좌표 (그래프와 더 가깝게 모음)
    const labelRadius = radius * 1.12
    const x = centerX + labelRadius * Math.cos(angle)


    const y = centerY + labelRadius * Math.sin(angle)

    // 각도에 따른 텍스트 정렬 설정 (겹침 방지)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    let textAnchor: "middle" | "start" | "end" = "middle"
    if (cos > 0.2) textAnchor = "start"
    else if (cos < -0.2) textAnchor = "end"

    let dominantBaseline: "middle" | "auto" | "hanging" = "middle"
    if (sin > 0.5) dominantBaseline = "hanging"
    else if (sin < -0.5) dominantBaseline = "auto"

    return (
      <text
        key={`label-${i}`}
        x={x}
        y={y}
        dominantBaseline={dominantBaseline}
        textAnchor={textAnchor}
        fontSize="8"
        fontWeight="900"
        fill="#64748b"
      >


        {char.label}
      </text>
    )
  })

  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      style={{ transform: 'translateZ(0)' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {gridCircles}
      {axisLines}
      <path
        d={createPath()}
        fill={monochrome ? "rgba(100, 116, 139, 0.15)" : "rgba(6, 182, 212, 0.15)"}
        stroke="url(#printGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="printGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={monochrome ? "#94A3B8" : "#F472B6"} />
          <stop offset="50%" stopColor={monochrome ? "#64748B" : "#FACC15"} />
          <stop offset="100%" stopColor={monochrome ? "#475569" : "#60A5FA"} />
        </linearGradient>
      </defs>
      {labels}
      {characteristics.map((char, i) => {
        const { x, y } = getCoordinates(char.value, i)
        return <circle key={`point-${i}`} cx={x} cy={y} r={4} fill="url(#printGradient)" stroke="#fff" strokeWidth="1.5" />
      })}
    </svg>
  )
}

function ComparativePrintRadarChart({ traitsA, traitsB, monochrome = false }: { traitsA: TraitScores, traitsB: TraitScores, monochrome?: boolean }) {
  const centerX = 100
  const centerY = 100
  const radius = 60
  const maxValue = 10

  const characteristicsA: Array<{ label: string; value: number }> = Object.entries(traitsA).map(([key, value]) => ({ label: TRAIT_LABELS[key as keyof TraitScores], value }))
  const characteristicsB: Array<{ label: string; value: number }> = Object.entries(traitsB).map(([key, value]) => ({ label: TRAIT_LABELS[key as keyof TraitScores], value }))

  const angleStep = (Math.PI * 2) / characteristicsA.length

  const getCoordinates = (value: number, index: number) => {
    const normalizedValue = value / maxValue
    const angle = index * angleStep - Math.PI / 2
    const x = centerX + radius * normalizedValue * Math.cos(angle)
    const y = centerY + radius * normalizedValue * Math.sin(angle)
    return { x, y }
  }

  const createPath = (characteristics: Array<{ label: string; value: number }>) => {
    const points = characteristics.map((char, i) => {
      const { x, y } = getCoordinates(char.value, i)
      return `${x},${y}`
    })
    return `M${points.join(' L')} Z`
  }

  const gridStroke = monochrome ? "#d4d4d8" : "#e2e8f0"
  const labelFill = monochrome ? "#27272a" : "#64748b"
  const colorA = monochrome ? "#111827" : "#7c3aed"
  const colorB = monochrome ? "#ffffff" : "#db2777"
  const fillA = monochrome ? "rgba(17, 24, 39, 0.13)" : "rgba(124, 58, 237, 0.15)"
  const fillB = monochrome ? "rgba(255, 255, 255, 0.55)" : "rgba(219, 39, 119, 0.15)"

  const gridCircles = Array.from({ length: 5 }).map((_, i) => (
    <circle key={`grid-${i}`} cx={centerX} cy={centerY} r={(radius * (i + 1)) / 5} fill="none" stroke={gridStroke} strokeWidth="1" />
  ))

  const axisLines = characteristicsA.map((_, i) => {
    const { x, y } = getCoordinates(maxValue, i)
    return <line key={`axis-${i}`} x1={centerX} y1={centerY} x2={x} y2={y} stroke={gridStroke} strokeWidth="1" />
  })

  const labels = characteristicsA.map((char, i) => {
    const angle = i * angleStep - Math.PI / 2
    const labelRadius = radius * 1.15
    const x = centerX + labelRadius * Math.cos(angle)
    const y = centerY + labelRadius * Math.sin(angle)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    let textAnchor: "middle" | "start" | "end" = "middle"
    if (cos > 0.2) textAnchor = "start"
    else if (cos < -0.2) textAnchor = "end"
    let dominantBaseline: "middle" | "auto" | "hanging" = "middle"
    if (sin > 0.5) dominantBaseline = "hanging"
    else if (sin < -0.5) dominantBaseline = "auto"
    return (
      <text key={`label-${i}`} x={x} y={y} dominantBaseline={dominantBaseline} textAnchor={textAnchor} fontSize="7" fontWeight="bold" fill={labelFill}>
        {char.label}
      </text>
    )
  })

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      {gridCircles}
      {axisLines}
      <path d={createPath(characteristicsA)} fill={fillA} stroke={colorA} strokeWidth={1.5} />
      {monochrome && <path d={createPath(characteristicsB)} fill="none" stroke="#111827" strokeWidth={3} />}
      <path d={createPath(characteristicsB)} fill={fillB} stroke={colorB} strokeWidth={1.5} />
      {labels}
      {characteristicsA.map((char, i) => {
        const { x, y } = getCoordinates(char.value, i)
        return <circle key={`pointA-${i}`} cx={x} cy={y} r={2} fill={colorA} />
      })}
      {characteristicsB.map((char, i) => {
        const { x, y } = getCoordinates(char.value, i)
        return <circle key={`pointB-${i}`} cx={x} cy={y} r={2} fill={colorB} stroke={monochrome ? "#111827" : undefined} strokeWidth={monochrome ? 0.8 : undefined} />
      })}
    </svg>
  )
}

// ============================================================
// 사주 분석 퍼퓸 (saju_perfume) 인쇄 보고서 — UI-SPEC §7
// 캔버스 842×595 / 배경 3-1(idol·금박+오행 컬러) · 3-2(self·먹 단색 젠)
// 배경 SVG는 장식 전용, 모든 라벨·값은 HTML 절대 배치(§7.0 의도적 이탈)
// 폰트: Noto Serif KR 단일 (전역 next/font variable — 좌표 안정성)
// ============================================================

// 오행 행 순서 (§7.2 L12 — 木火土金水)
// 용신 오행명 한 줄 에피셋 (CONTENT.md §3 감각 번역 어휘 — 인쇄 전용 한국어, §7.2 L15)
const SAJU_YONGSIN_EPITHET: Record<SajuElement, string> = {
  목: '틔워주는 새순',
  화: '지펴주는 온기',
  토: '다져주는 무게',
  금: '벼려주는 광택',
  수: '스며드는 고요',
}

// §7.3 R11 — 계절 칩 (선택 시 3-1 계절색: 봄 wood/여름 fire/가을 earth/겨울 water)
const SAJU_SEASON_CHIPS = [
  { key: 'spring', label: '봄', color: '#3E7C4F' },
  { key: 'summer', label: '여름', color: '#C0392B' },
  { key: 'autumn', label: '가을', color: '#C9A227' },
  { key: 'winter', label: '겨울', color: '#2C3E60' },
] as const

// §7.3 R13 — 시간 칩 (선택 시 3-1 금 단일색)
const SAJU_TIME_CHIPS = [
  { key: 'morning', label: '아침' },
  { key: 'afternoon', label: '낮' },
  { key: 'evening', label: '저녁' },
  { key: 'night', label: '밤' },
] as const

const SAJU_PILLAR_TILE_LEFT = 70
const SAJU_PILLAR_TILE_STEP = 76

function sajuPrintFit(text: string | null | undefined, max: number): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const chars = Array.from(normalized)
  if (chars.length <= max) return normalized

  const hard = chars.slice(0, max).join('')
  const lastSpace = hard.lastIndexOf(' ')
  const cut = lastSpace >= max * 0.58 ? hard.slice(0, lastSpace) : hard
  return cut.replace(/[\s,.·…:;—-]+$/u, '')
}

function sajuPrintSentence(text: string | null | undefined, max: number): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const firstSentence = normalized.match(/^[^.!?。！？]+[.!?。！？]?/u)?.[0] || normalized
  const summary = sajuPrintFit(firstSentence.replace(/[.!?。！？]+$/u, ''), max)
  return summary ? `${summary.replace(/\s+—\s+/gu, ' —\n')}.` : ''
}

/** 글리프 폭 추정 단위 — 한글/한자 1, 라틴·숫자·기호 ≈ 0.55 */
function sajuCharUnits(s: string): number {
  let units = 0
  for (const ch of s) units += /[ -ÿ]/.test(ch) ? 0.55 : 1
  return units
}

/** break-keep(어절 단위 줄바꿈) 기준 렌더 줄 수 추정 — 그리디 워드랩 시뮬레이션 */
function sajuEstimateLines(text: string, unitsPerLine: number): number {
  const words = text.split(' ')
  let lines = 1
  let current = 0
  for (const word of words) {
    const wordUnits = sajuCharUnits(word)
    const withWord = current === 0 ? wordUnits : current + 0.5 + wordUnits
    if (withWord > unitsPerLine && current > 0) {
      lines += 1
      current = wordUnits
    } else {
      current = withWord
    }
  }
  return lines
}

/** 서사 블록용 — 완결 문장 단위로만 채운다(문장 중간에서 자르지 않음).
 *  글자 수가 아니라 렌더 줄 수를 시뮬레이션해, 박스에 들어가는 마지막 문장까지 꽉 채운다.
 *  첫 문장부터 박스를 넘는 극단적인 경우에만 어절 단위 컷 + 말줄임으로 강등. */
function sajuPrintNarrative(
  text: string | null | undefined,
  unitsPerLine: number,
  maxLines: number
): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const sentences =
    normalized.match(/[^.!?。！？]+[.!?。！？]+["'』」)]*|[^.!?。！？]+$/gu) || [normalized]

  let out = ''
  for (const s of sentences) {
    const candidate = out ? `${out} ${s.trim()}` : s.trim()
    if (sajuEstimateLines(candidate, unitsPerLine) > maxLines) break
    out = candidate
  }

  if (!out) return `${sajuPrintFit(normalized, Math.floor(unitsPerLine * maxLines * 0.92))}…`
  // 마침표 없는 마지막 조각이 통째로 들어온 경우 종결 부호 보정
  return /[.!?。！？]["'』」)]*$/u.test(out) ? out : `${out}.`
}

function sajuPrintPerfumeCode(code: string): string {
  const number = code.match(/\d+/)?.[0]
  return number ? `악센트 ${number}호` : '악센트'
}

// 인쇄용 GanjiTile 정적 재현 (§7.2 L9/L10) — 크림 면은 배경 SVG에 맡긴다
function SajuPrintTile({ left, top, hanja, reading, barColor, unknown = false, isSelf }: {
  left: number; top: number; hanja: string; reading: string; barColor: string; unknown?: boolean; isSelf: boolean
}) {
  return (
    <div className="absolute" style={{ left, top, width: 54, height: 70, border: '1px solid #C8BFA9' }}>
      {/* 상단 오행 바 (3-2: 먹 2px / 3-1: 오행색 3px) */}
      <div style={{ height: isSelf ? 2 : 3, width: '100%', backgroundColor: barColor }} />
      <div className="flex flex-col items-center justify-center" style={{ height: isSelf ? 66 : 65 }}>
        <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: '#1A1610', opacity: unknown ? 0.15 : 1 }}>{hanja}</span>
        <span style={{ fontSize: 7.5, lineHeight: 1, color: unknown ? '#8B8578' : '#5C564A', marginTop: 4 }}>{reading}</span>
      </div>
    </div>
  )
}

// 낙관(도장) 인라인 재현 (§7.2 L1/L13 — SealStamp 정적 버전)
function SajuPrintSeal({ left, top, size, chars, isSelf }: {
  left: number; top: number; size: number; chars: string; isSelf: boolean
}) {
  const charSize = chars.length === 1 ? Math.round(size * 0.56) : Math.round(size * 0.4)
  return (
    <div
      className="absolute flex flex-col items-center justify-center"
      style={{
        left, top, width: size, height: size,
        borderRadius: '18%',
        transform: 'rotate(-3deg)',
        background: isSelf
          ? '#1A1610'
          : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%), #B03325',
        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.25)',
      }}
    >
      {chars.split('').map((c, i) => (
        <span key={i} style={{ fontSize: charSize, fontWeight: 900, color: '#F5EFE2', lineHeight: 1.05 }}>{c}</span>
      ))}
    </div>
  )
}

function SajuPrintReport({ analysis, rootId, standalonePrintStyles }: {
  analysis: PrintableAnalysis; rootId: string; standalonePrintStyles: boolean
}) {
  const data = analysis.analysis_data as unknown as Partial<SajuAnalysisResult> | null
  const chart = data?.sajuChart
  const saju = data?.sajuAnalysis
  const isSelfSaju = analysis.target_type === 'self' // self → 3-2(먹 젠) / idol → 3-1(금박+컬러)

  // §7.4 — 라벨 금색은 3-1 전용, 3-2는 전부 먹/보조색으로 통일
  const labelColor = isSelfSaju ? '#5C564A' : '#7A5C14'
  const accent = isSelfSaju ? '#1A1610' : '#C0392B'
  const labelStyle: CSSProperties = { fontSize: 7.5, fontWeight: 600, letterSpacing: '0.14em', color: labelColor, lineHeight: 1.2 }

  // L5/L7 — 이름·생시
  const displayName = sajuPrintFit(analysis.idol_name || analysis.twitter_name || '', 10)
  const bd = chart?.birthDisplay
  const birthLine1 = bd ? `${bd.solarDate.replace(/-/g, '.')} (${bd.calendar === 'lunar' ? '음력' : '양력'})` : ''
  const genderRaw = (analysis.idol_gender || '').toLowerCase()
  const genderLabel = genderRaw.startsWith('m') || genderRaw.includes('남')
    ? '남성(男)'
    : genderRaw.startsWith('f') || genderRaw.includes('여') ? '여성(女)' : ''
  const sijinLabel = chart ? (chart.isThreePillar || !bd?.sijin ? '시(時) 미상' : bd.sijin) : ''
  const birthLine2 = [sijinLabel, genderLabel].filter(Boolean).join(' · ')

  // L8~L10 — 명식 열 (좌→우: 時 日 月 年, 스냅숏만 렌더 — 재계산 금지)
  const pillarColumns = chart ? [
    { header: '時柱', pillar: chart.pillars.hour, unknown: !chart.pillars.hour },
    { header: '日柱', pillar: chart.pillars.day, unknown: false },
    { header: '月柱', pillar: chart.pillars.month, unknown: false },
    { header: '年柱', pillar: chart.pillars.year, unknown: false },
  ] : []

  const yongsinElement = chart?.yongsin?.element
  const yongsinInfo = yongsinElement ? SAJU_ELEMENT_INFO[yongsinElement] : null
  const yongsinReason = sajuPrintSentence(saju?.elementFlow?.yongsinNarrative || '', 68)

  // 선택한 분석 유형 (종합/연애/재물/직업/궁합) — 우측 패널 헤더 칩
  const purposeMeta = SAJU_PURPOSES.find(
    (p) => p.id === (saju?.purposeReading?.purpose ?? data?.sajuPurpose)
  )

  // 오행 분포 (L12' 우측 미니 바) — 웹 三章과 동일한 원국 스냅숏 개수(elementCount) 기준
  const elementRows = chart
    ? (['목', '화', '토', '금', '수'] as SajuElement[]).map((el) => ({
        el,
        info: SAJU_ELEMENT_INFO[el],
        count: chart.elementCount?.[el] ?? 0,
      }))
    : []
  const elementMax = Math.max(1, ...elementRows.map((r) => r.count))

  // L11'/L12' — 일간(타고난 기질) 서사 + 오행 분포 미니 바(우측 110px 열)
  const dayMaster = saju?.dayMasterReading
  const dayMasterTitle = dayMaster
    ? [dayMaster.archetypeTitle, dayMaster.hanja].filter(Boolean).join(' · ')
    : ''
  // 박스: width 196 / font 8.5 ≈ 23유닛·줄, 높이 92 / 행간 12.75 = 7줄 (우측은 오행 분포)
  const dayMasterBody = sajuPrintNarrative(
    [dayMaster?.natureMetaphor, dayMaster?.narrative].filter(Boolean).join(' '),
    23,
    7
  )

  // R3~R7 — 향
  const matching = data?.matchingPerfumes?.[0]
  const persona = matching?.persona
  const perfumeName = sajuPrintFit(persona?.name || analysis.perfume_name || '', 32)
  const rawPerfumeId = matching?.perfumeId || persona?.id || ''
  const brandLine = rawPerfumeId ? sajuPrintPerfumeCode(rawPerfumeId) : ''
  const noteRows = [
    { chip: '겉향', name: persona?.mainScent?.name, meaning: saju?.scentDestiny?.topMeaning, top: 144 },
    { chip: '중심향', name: persona?.subScent1?.name, meaning: saju?.scentDestiny?.middleMeaning, top: 203 },
    { chip: '잔향', name: persona?.subScent2?.name, meaning: saju?.scentDestiny?.baseMeaning, top: 262 },
  ]

  // R8'/R9' — 처방의 연유: 6계열 그래프 자리를 命→香 서사로 대체
  // 박스: width 328 / font 8.5 ≈ 38유닛·줄, 높이 90 / 행간 12.75 = 7줄
  const scentBridge = sajuPrintFit(saju?.scentDestiny?.elementBridge || '', 34)
  const scentWhy = sajuPrintNarrative(saju?.scentDestiny?.whyNarrative || '', 38, 7)
  const scentRecommendation = data?.scentRecommendation
  const timingAdvice = sajuPrintSentence(saju?.purposeReading?.timingAdvice || '', 72)
  const reportDate = (analysis.created_at || '').slice(0, 10).replace(/-/g, '.')

  return (
    <>
      {standalonePrintStyles && (
        <style jsx global>{`
          @media print {
            @page { size: A4 landscape; margin: 0; }
            body * { visibility: hidden; }
            .printable-report-root, .printable-report-root * { visibility: visible; }
            .printable-report-root { position: fixed !important; left: 0 !important; top: 0 !important; margin: 0 !important; background: white !important; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          }
        `}</style>
      )}
      <div
        id={rootId}
        className="printable-report-root w-[842px] h-[595px] relative mx-auto bg-white overflow-hidden"
        style={{ fontFamily: "var(--font-noto-serif-kr, 'Noto Serif KR'), serif" }}
      >
        {/* 배경 — 장식 전용 SVG (3-1 최애 / 3-2 나) */}
        <img
          src={isSelfSaju ? '/background/3-2.svg?v=no-frame-20260715' : '/background/3-1.svg?v=no-frame-20260715'}
          alt=""
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />

        {/* ===== 좌측 패널 — 命式 (§7.2) ===== */}

        {/* L1 프로그램 낙관 — 사주 분석 로고 */}
        <img
          src="/images/saju/saju-logo.png"
          alt="사주 분석 퍼퓸"
          className="absolute object-contain"
          style={{ left: 36, top: 36, width: 44, height: 44 }}
        />

        {/* L2 타이틀 */}
        <div className="absolute" style={{ left: 92, top: 40, width: 240, height: 18, fontSize: 13, fontWeight: 900, letterSpacing: '0.35em', color: '#1A1610', lineHeight: 1.2 }}>
          四柱命式
        </div>

        {/* L3 서브타이틀 */}
        <div className="absolute" style={{ left: 92, top: 60, width: 240, height: 12, fontSize: 8.5, color: '#5C564A', lineHeight: 1.2 }}>
          사주 분석 보고서
        </div>

        {/* L4 이름 라벨 */}
        <div className="absolute" style={{ left: 36, top: 94, width: 60, height: 10, ...labelStyle }}>이름</div>

        {/* L5 이름 값 — 10자 truncate */}
        <div className="absolute" style={{ left: 36, top: 106, width: 150, height: 20, fontSize: 14, fontWeight: 900, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.3 }}>
          {displayName || '-'}
        </div>

        {/* L6 생시 라벨 */}
        <div className="absolute" style={{ left: 196, top: 94, width: 140, height: 10, ...labelStyle }}>생시</div>

        {/* L7 생시 값 — 2줄, 각 줄 truncate */}
        {/* top 110 — 이름(14px)과 생시 1줄(9.5px)의 베이스라인 정합(글자 크기 차 보정) */}
        {(birthLine1 || birthLine2) && (
          <div className="absolute" style={{ left: 196, top: 110, width: 170, height: 30 }}>
            <div style={{ fontSize: 9.5, lineHeight: 1.5, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden' }}>{birthLine1}</div>
            <div style={{ fontSize: 9.5, lineHeight: 1.5, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden' }}>{birthLine2}</div>
          </div>
        )}

        {/* L8 열 헤더 + L9/L10 간지 타일 (좌→우 時柱 日柱 月柱 年柱) */}
        {pillarColumns.map((col, i) => {
          const left = SAJU_PILLAR_TILE_LEFT + SAJU_PILLAR_TILE_STEP * i
          const ganBar = col.unknown ? '#8B8578' : isSelfSaju ? '#1A1610' : (col.pillar ? SAJU_ELEMENT_INFO[col.pillar.ganElement].color : '#8B8578')
          const jiBar = col.unknown ? '#8B8578' : isSelfSaju ? '#1A1610' : (col.pillar ? SAJU_ELEMENT_INFO[col.pillar.jiElement].color : '#8B8578')
          return (
            <div key={col.header}>
              <div className="absolute text-center" style={{ left, top: 148, width: 54, height: 12, fontSize: 9, fontWeight: 600, color: '#5C564A', lineHeight: 1.2 }}>
                {col.header}
              </div>
              <SajuPrintTile
                left={left}
                top={164}
                hanja={col.unknown || !col.pillar ? '時' : col.pillar.ganHanja}
                reading={col.unknown || !col.pillar ? '미상' : `${col.pillar.gan}${col.pillar.ganElement}`}
                barColor={ganBar}
                unknown={col.unknown}
                isSelf={isSelfSaju}
              />
              <SajuPrintTile
                left={left}
                top={244}
                hanja={col.unknown || !col.pillar ? '時' : col.pillar.jiHanja}
                reading={col.unknown || !col.pillar ? '미상' : col.pillar.ji}
                barColor={jiBar}
                unknown={col.unknown}
                isSelf={isSelfSaju}
              />
            </div>
          )
        })}

        {/* L11' 일간 라벨 */}
        <div className="absolute" style={{ left: 52, top: 330, width: 200, height: 10, ...labelStyle }}>일간(日干) · 타고난 기질</div>

        {/* L12' 일간 원형 제목 + 서사 본문 (좌 196px) */}
        {dayMasterTitle && (
          <div className="absolute" style={{ left: 52, top: 344, width: 318, height: 18, fontSize: 13, fontWeight: 900, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.3 }}>
            {dayMasterTitle}
          </div>
        )}
        {dayMasterBody && (
          <div
            className="absolute"
            style={{ left: 52, top: 368, width: 196, height: 92, fontSize: 8.5, lineHeight: 1.5, color: '#5C564A', overflow: 'hidden', wordBreak: 'keep-all' }}
          >
            {dayMasterBody}
          </div>
        )}

        {/* L12'' 오행 분포 — 원국 8자 기준 개수 미니 바 (우 110px, 웹 三章과 동일 데이터) */}
        {elementRows.length > 0 && (
          <>
            <div className="absolute" style={{ left: 260, top: 368, width: 110, height: 10, ...labelStyle }}>오행 분포</div>
            {elementRows.map((row, i) => (
              <div key={row.el} className="absolute flex items-center" style={{ left: 260, top: 383 + i * 13, width: 110, height: 11 }}>
                <span style={{ width: 14, fontSize: 8.5, fontWeight: 700, color: '#1A1610', lineHeight: 1, flexShrink: 0 }}>
                  {row.info.hanja}
                </span>
                <div style={{ width: 62, height: 5, backgroundColor: 'rgba(26,22,16,0.08)', borderRadius: 1, flexShrink: 0 }}>
                  <div
                    style={{
                      width: row.count > 0 ? Math.max(4, Math.round((row.count / elementMax) * 62)) : 0,
                      height: 5,
                      borderRadius: 1,
                      backgroundColor: isSelfSaju ? '#1A1610' : row.info.color,
                    }}
                  />
                </div>
                <span style={{ width: 30, textAlign: 'right', fontSize: 7.5, color: '#5C564A', lineHeight: 1, flexShrink: 0 }}>
                  {row.count}
                </span>
              </div>
            ))}
          </>
        )}

        {/* L13 용신 낙관 */}
        {yongsinInfo && (
          <SajuPrintSeal left={52} top={484} size={36} chars={yongsinInfo.hanja} isSelf={isSelfSaju} />
        )}

        {/* L14 용신 라벨 */}
        <div className="absolute" style={{ left: 100, top: 470, width: 280, height: 10, ...labelStyle }}>용신(用神) · 필요한 기운</div>

        {/* L15 용신 오행명 — 1줄 truncate */}
        {yongsinElement && yongsinInfo && (
          <div className="absolute" style={{ left: 100, top: 483, width: 280, height: 18, fontSize: 13, fontWeight: 900, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.3 }}>
            {yongsinElement}({yongsinInfo.hanja}) · {SAJU_YONGSIN_EPITHET[yongsinElement]}
          </div>
        )}

        {/* L16 용신 근거 — 2줄 클램프(60자 slice) */}
        {yongsinReason && (
          <div
            className="absolute"
            style={{ left: 100, top: 504, width: 280, height: 38, fontSize: 8.5, lineHeight: 1.45, color: '#5C564A', overflow: 'hidden', whiteSpace: 'pre-line', wordBreak: 'keep-all' }}
          >
            {yongsinReason}
          </div>
        )}

        {/* L17 푸터 */}
        <div className="absolute" style={{ left: 52, top: 552, width: 318, height: 12, fontSize: 7, color: '#8B8578', letterSpacing: '0.1em', lineHeight: 1.2 }}>
          AC&apos;SCENT IDENTITY{reportDate ? ` · ${reportDate}` : ''}
        </div>

        {/* ===== 우측 패널 — 香處方 (§7.3) ===== */}

        {/* R1 헤더 */}
        <div className="absolute" style={{ left: 462, top: 40, width: 220, height: 14, fontSize: 11, fontWeight: 900, letterSpacing: '0.32em', color: isSelfSaju ? '#1A1610' : '#7A5C14', lineHeight: 1.2 }}>
          香處方
        </div>

        {/* R2 서브 */}
        <div className="absolute" style={{ left: 462, top: 58, width: 220, height: 12, fontSize: 8.5, color: '#5C564A', lineHeight: 1.2 }}>
          처방된 운명의 향
        </div>

        {/* L2' 분석 유형 칩 — 사용자가 선택한 풀이 목적 (종합운/연애운/재물운/직업운/궁합), 좌측 페이지 우상단 */}
        {purposeMeta && (
          <div
            className="absolute flex items-center justify-center"
            style={{
              right: 472, top: 38, height: 20, padding: '0 8px 2px', borderRadius: 2,
              border: `1px solid ${accent}`, color: accent,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1,
            }}
          >
            {purposeMeta.hanja} · {purposeMeta.label} 분석
          </div>
        )}

        {/* R3 향수명 — 2줄 클램프(24자 slice). lineHeight 20px = 2줄이 슬롯 40px에 정합(§7.3 h:40와 1.25 행간의 충돌 조정) */}
        {(perfumeName || brandLine) && (
          <div className="absolute flex items-baseline" style={{ left: 462, top: 82, width: 328, height: 40, overflow: 'hidden' }}>
            <span style={{ fontSize: 18, fontWeight: 900, lineHeight: '20px', color: '#1A1610', wordBreak: 'keep-all' }}>
              {perfumeName}
            </span>
            {/* R4 브랜드 라인 — 향수명 오른쪽, 베이스라인 정렬 */}
            {brandLine && (
              <span style={{ marginLeft: 10, fontSize: 8, letterSpacing: '0.15em', color: '#5C564A', lineHeight: 1.2, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {brandLine}
              </span>
            )}
          </div>
        )}

        {/* R5~R7 노트 3단 (겉기운/중심기운/뿌리기운) */}
        {noteRows.map((row) => (
          <div key={row.chip}>
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: 462, top: row.top, width: 54, height: 18, borderRadius: 2,
                // Noto Serif KR은 어센트>디센트라 글리프가 중심보다 낮게 앉음 — 시각 보정
                paddingBottom: 1.5,
                fontSize: 7.5, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1,
                ...(isSelfSaju
                  ? { border: '1px solid #1A1610', color: '#1A1610' }
                  : { backgroundColor: '#C0392B', color: '#F5EFE2' }),
              }}
            >
              {row.chip}
            </div>
            {row.name && (
              <div className="absolute flex items-center" style={{ left: 528, top: row.top, width: 262, height: 18, paddingBottom: 2.5, fontSize: 12.5, fontWeight: 700, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {sajuPrintFit(row.name, 20)}
              </div>
            )}
            {row.meaning && (
              <div
                className="absolute"
                style={{ left: 462, top: row.top + 21, width: 328, height: 36, fontSize: 8, lineHeight: 1.5, color: '#5C564A', overflow: 'hidden', whiteSpace: 'pre-line', wordBreak: 'keep-all' }}
              >
                {/* 문장 중간 컷 방지 — 3줄(width 328/font 8 ≈ 41유닛) 안에 들어가는 완결 문장까지 노출 */}
                {sajuPrintNarrative(row.meaning, 41, 3)}
              </div>
            )}
          </div>
        ))}

        {/* R8' 처방 연유 라벨 — 6계열 그래프 자리를 命→香 서사로 대체 */}
        <div className="absolute" style={{ left: 462, top: 326, width: 200, height: 10, ...labelStyle }}>처방의 연유 · 命과 香</div>

        {/* R9' 기운 다리(한 줄 강조) + 왜 이 향인가 서사 */}
        {scentBridge && (
          <div className="absolute flex items-center" style={{ left: 462, top: 340, width: 328, height: 18 }}>
            <div style={{ width: 2.5, height: 14, backgroundColor: accent, flexShrink: 0 }} />
            <span style={{ paddingLeft: 8, fontSize: 11, fontWeight: 900, color: '#1A1610', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.2 }}>
              {scentBridge}
            </span>
          </div>
        )}
        {scentWhy && (
          <div
            className="absolute"
            style={{ left: 462, top: 362, width: 328, height: 90, fontSize: 8.5, lineHeight: 1.5, color: '#5C564A', overflow: 'hidden', wordBreak: 'keep-all' }}
          >
            {scentWhy}
          </div>
        )}

        {/* R10 계절 라벨 */}
        <div className="absolute" style={{ left: 462, top: 456, width: 150, height: 10, ...labelStyle, letterSpacing: '0.18em' }}>길한 계절</div>

        {/* R11 SEASON 칩 ×4 */}
        <div className="absolute flex" style={{ left: 462, top: 470, width: 150, height: 36, gap: 6 }}>
          {SAJU_SEASON_CHIPS.map((chip) => {
            const selected = scentRecommendation?.best_season === chip.key
            return (
              <div
                key={chip.key}
                className="flex items-center justify-center"
                style={{
                  width: 26, height: 34, borderRadius: 2, paddingBottom: 2, fontSize: 10, fontWeight: 700, lineHeight: 1,
                  ...(selected
                    ? { backgroundColor: isSelfSaju ? '#1A1610' : chip.color, color: '#F5EFE2' }
                    : { border: '1px solid #C8BFA9', color: '#8B8578' }),
                }}
              >
                {chip.label}
              </div>
            )
          })}
        </div>

        {/* R12 시간 라벨 */}
        <div className="absolute" style={{ left: 640, top: 456, width: 150, height: 10, ...labelStyle, letterSpacing: '0.18em' }}>길한 시간</div>

        {/* R13 TIME 칩 ×4 */}
        <div className="absolute flex" style={{ left: 640, top: 470, width: 150, height: 36, gap: 6 }}>
          {SAJU_TIME_CHIPS.map((chip) => {
            const selected = scentRecommendation?.best_time === chip.key
            return (
              <div
                key={chip.key}
                className="flex items-center justify-center"
                style={{
                  width: 26, height: 34, borderRadius: 2, paddingBottom: 2, fontSize: 10, fontWeight: 700, lineHeight: 1,
                  ...(selected
                    ? { backgroundColor: isSelfSaju ? '#1A1610' : '#C9A227', color: '#F5EFE2' }
                    : { border: '1px solid #C8BFA9', color: '#8B8578' }),
                }}
              >
                {chip.label}
              </div>
            )
          })}
        </div>

        {/* R14 처방 한 줄 — 2줄 클램프(80자 slice) */}
        {timingAdvice && (
          <div className="absolute flex" style={{ left: 462, top: 520, width: 328, height: 40 }}>
            <div style={{ width: 2.5, backgroundColor: accent, flexShrink: 0 }} />
            <p
              style={{ paddingLeft: 8, fontSize: 9, lineHeight: 1.5, color: '#1A1610', overflow: 'hidden', whiteSpace: 'pre-line', wordBreak: 'keep-all', margin: 0 }}
            >
              {timingAdvice}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export function PrintableReport({
  analysis,
  layeringSession,
  partnerAnalysis,
  rootId = 'printable-report',
  standalonePrintStyles = true,
}: PrintableReportProps) {
  const analysisData = analysis.analysis_data

  // 사주 분석 퍼퓸 — chemistry/traits 폴백보다 먼저 분기한다
  // (saju 결과가 '데이터가 충분하지 않습니다' 카드나 기본 이미지 보고서로 떨어지지 않도록)
  if (analysis.product_type === 'saju_perfume') {
    return (
      <SajuPrintReport analysis={analysis} rootId={rootId} standalonePrintStyles={standalonePrintStyles} />
    )
  }

  // [FIX] CRITICAL #17: chemistry_set이면 전용 디자인 렌더링
  if (analysis.product_type === 'chemistry_set' || !analysisData?.traits) {
    if (analysis.product_type === 'chemistry_set') {
      const isA = layeringSession?.analysis_a_id === analysis.id
      const charAInfo = isA ? analysis : partnerAnalysis
      const charBInfo = isA ? partnerAnalysis : analysis
      const sessionChem = layeringSession?.chemistry_data
      const charAData = charAInfo?.analysis_data
      const charBData = charBInfo?.analysis_data

      if (charAData && charBData && sessionChem) {
        const aMainScent = charAData.matchingPerfumes?.[0]?.persona?.mainScent?.name || '-'
        const aMidScent = charAData.matchingPerfumes?.[0]?.persona?.subScent1?.name || '-'
        const aBaseScent = charAData.matchingPerfumes?.[0]?.persona?.subScent2?.name || '-'

        const bMainScent = charBData.matchingPerfumes?.[0]?.persona?.mainScent?.name || '-'
        const bMidScent = charBData.matchingPerfumes?.[0]?.persona?.subScent1?.name || '-'
        const bBaseScent = charBData.matchingPerfumes?.[0]?.persona?.subScent2?.name || '-'

        const nameA = charAInfo.twitter_name || charAInfo.idol_name || charAInfo.character_name || '-'
        const nameB = charBInfo.twitter_name || charBInfo.idol_name || charBInfo.character_name || '-'

        // 화학 키워드 배지
        const styledChemKeywords: Array<{ text: string; style: typeof KEYWORD_STYLES[number] }> = (sessionChem.relationshipDynamic?.chemistryKeywords || []).slice(0, 4).map((keyword: string, index: number) => {
          const styleIndex = Math.floor(seededRandom(index + 200) * KEYWORD_STYLES.length)
          return { text: keyword, style: KEYWORD_STYLES[styleIndex] }
        })

        const chemistryTargetType = (layeringSession?.target_type || analysis.target_type) === 'self' ? 'self' : 'idol'
        const isSelfChemistry = chemistryTargetType === 'self'
        const tagAClass = isSelfChemistry ? 'bg-slate-950 text-white' : 'bg-[#9B72F5] text-white'
        const tagBClass = isSelfChemistry ? 'border border-slate-950 bg-white text-slate-950' : 'bg-[#F2539B] text-white'
        const barAClass = isSelfChemistry ? 'bg-slate-950' : 'bg-violet-400'
        const barBClass = isSelfChemistry ? 'border border-slate-950 bg-white' : 'bg-pink-400'
        const valueAClass = isSelfChemistry ? 'text-slate-950' : 'text-violet-700'
        const valueBClass = isSelfChemistry ? 'text-slate-950' : 'text-pink-700'
        const panelClass = isSelfChemistry
          ? 'border border-slate-200 bg-white p-[8px] rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
          : 'bg-white/90 p-[8px] rounded-[6px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'

        return (
          <>
            {standalonePrintStyles && (
              <style jsx global>{`
                @media print {
                  @page { size: A4 landscape; margin: 0; }
                  body * { visibility: hidden; }
                  .printable-report-root, .printable-report-root * { visibility: visible; }
                  .printable-report-root { position: fixed !important; left: 0 !important; top: 0 !important; margin: 0 !important; background: white !important; }
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                }
              `}</style>
            )}
            <div id={rootId} className="printable-report-root w-[842px] h-[595px] relative mx-auto bg-white overflow-hidden" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              <img
                src={(() => {
                  // 케미(2) × 최애/나 — 1-1/1-2은 이미지, 2-1/2-2는 케미
                  return isSelfChemistry ? '/background/2-2.svg' : '/background/2-1.svg'
                })()}
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              />

              {/* === LEFT PAGE === */}
              <div className="absolute flex flex-col p-6" style={{ left: 11, top: 21, width: 389, height: 552 }}>

                {/* Image Section */}
                <div className="flex justify-center items-center gap-4 mb-2 mt-0 px-6">
                  <div className={`w-[125px] h-[145px] overflow-hidden border-[3px] shadow-md bg-slate-100 flex-shrink-0 ${isSelfChemistry ? 'rounded-[4px] border-slate-950 shadow-none' : 'rounded-2xl border-white'}`}>
                    <img src={charAInfo?.user_image_url || '/images/product-placeholder.svg'} alt={nameA} className="w-full h-full object-cover" />
                  </div>
                  <div className={`text-4xl font-black ${isSelfChemistry ? 'text-slate-950' : 'text-slate-800'}`}>X</div>
                  <div className={`w-[125px] h-[145px] overflow-hidden border-[3px] shadow-md bg-slate-100 flex-shrink-0 ${isSelfChemistry ? 'rounded-[4px] border-slate-950 shadow-none' : 'rounded-2xl border-white'}`}>
                    <img src={charBInfo?.user_image_url || '/images/product-placeholder.svg'} alt={nameB} className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Title */}
                <div className="px-5 pt-1 pb-1 text-center">
                  <h1 className="text-[13px] font-extrabold text-slate-800 leading-snug mb-1">“{sessionChem.chemistryTitle}”</h1>
                  <p className="mx-auto max-w-[310px] text-[9px] leading-[1.35] text-slate-500 font-bold italic whitespace-normal break-keep">
                    {(sessionChem.traitsSynergy?.synergyOneLiner || sessionChem.chemistryStory?.split(/[.?!]/)[0] + '!')}
                  </p>
                </div>

                {/* Name & Notes — fixed grid matching the reference layout */}
                <div className="mx-auto mb-2 mt-2 grid w-[288px] grid-cols-[66px_45px_28px_45px_66px] items-center gap-x-[9.5px] gap-y-[8px]">
                  <span className="col-start-1 row-start-1 w-full truncate text-right text-[10px] font-extrabold leading-none text-slate-900">{nameA}</span>
                  <span className={`col-start-2 row-start-1 ml-auto flex h-[15px] w-[45px] items-center justify-center text-[8px] font-black leading-none tracking-[0.08em] ${tagAClass}`}>NAME</span>
                  <span className={`col-start-4 row-start-1 flex h-[15px] w-[45px] items-center justify-center text-[8px] font-black leading-none tracking-[0.08em] ${tagBClass}`}>NAME</span>
                  <span className="col-start-5 row-start-1 w-full truncate text-left text-[10px] font-extrabold leading-none text-slate-900">{nameB}</span>

                  <span className="col-start-1 row-start-2 w-full truncate text-right text-[9.5px] font-bold leading-none text-slate-800">{aMainScent}</span>
                  <span className={`col-start-2 row-start-2 ml-auto flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagAClass}`}>TOP</span>
                  <span className={`col-start-4 row-start-2 flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagBClass}`}>TOP</span>
                  <span className="col-start-5 row-start-2 w-full truncate text-left text-[9.5px] font-bold leading-none text-slate-800">{bMainScent}</span>

                  <span className="col-start-1 row-start-3 w-full truncate text-right text-[9.5px] font-bold leading-none text-slate-800">{aMidScent}</span>
                  <span className={`col-start-2 row-start-3 ml-auto flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagAClass}`}>MIDDLE</span>
                  <span className={`col-start-4 row-start-3 flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagBClass}`}>MIDDLE</span>
                  <span className="col-start-5 row-start-3 w-full truncate text-left text-[9.5px] font-bold leading-none text-slate-800">{bMidScent}</span>

                  <span className="col-start-1 row-start-4 w-full truncate text-right text-[9.5px] font-bold leading-none text-slate-800">{aBaseScent}</span>
                  <span className={`col-start-2 row-start-4 ml-auto flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagAClass}`}>BASE</span>
                  <span className={`col-start-4 row-start-4 flex h-[12px] w-[41px] items-center justify-center text-[7px] font-black leading-none ${tagBClass}`}>BASE</span>
                  <span className="col-start-5 row-start-4 w-full truncate text-left text-[9.5px] font-bold leading-none text-slate-800">{bBaseScent}</span>
                </div>

                {/* Scent Categories */}
                <div className="px-8 pt-0 -mt-2 flex-grow flex flex-col justify-center mb-0">
                  <div className="space-y-[5px]">
                    {Object.entries(charAData.scentCategories || {}).map((entry) => {
                      const catName = entry[0] as keyof ScentCategoryScores
                      const valA = entry[1] as number
                      const valB = (charBData.scentCategories || {})[catName] as number || 0
                      const info = CATEGORY_INFO[catName] || { icon: '⚪', name: catName }
                      return (
                        <div key={catName} className="flex items-center gap-1">
                          <div className="flex-1 flex justify-end items-center gap-[3px]">
                            <span className={`text-[7.5px] font-black ${valueAClass}`}>{valA}</span>
                            <div className={`h-[12px] ${isSelfChemistry ? 'rounded-none' : 'rounded-l-full'} ${barAClass}`} style={{ width: `${Math.max(10, valA * 10)}%` }} />
                          </div>
                          <div className="w-11 text-center flex-shrink-0 flex flex-col leading-none">
                            <span className="text-[9px] leading-none mb-0.5 inline-block">{info.icon}</span>
                            <span className="text-[6.5px] font-bold text-slate-600 block">{info.name}</span>
                          </div>
                          <div className="flex-1 flex justify-start items-center gap-[3px]">
                            <div className={`h-[12px] ${isSelfChemistry ? 'rounded-none' : 'rounded-r-full'} ${barBClass}`} style={{ width: `${Math.max(10, valB * 10)}%` }} />
                            <span className={`text-[7.5px] font-black ${valueBClass}`}>{valB}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Layering Tip */}
                <div className={`-mt-1 mb-0 mx-2 px-[14px] py-[5px] relative overflow-hidden flex-shrink-0 ${isSelfChemistry ? 'rounded-[3px] border border-slate-300 bg-white shadow-none' : 'bg-[#fdfafb] rounded-[10px] shadow-sm'}`}>
                  {/* Subtle purple gradient effect behind */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-violet-100/40 to-pink-100/40 opacity-50 ${isSelfChemistry ? 'hidden' : 'block'}`} />
                  <div className="relative z-10">
                    <div className={`text-[9px] font-black mb-0 ${isSelfChemistry ? 'text-slate-950' : 'text-violet-600'}`}>레이어링 팁</div>
                    <p className="text-[9px] text-slate-700 leading-[1.15] font-medium tracking-tight">
                      {sessionChem.layeringGuide?.method ||
                        sessionChem.scentHarmony?.layeringEffect ||
                        sessionChem.scentHarmony?.overallHarmony ||
                        sessionChem.chemistryStory ||
                        "레이어링 팁 정보를 불러올 수 없습니다."}
                    </p>
                  </div>
                </div>
              </div>

              {/* === RIGHT PAGE === */}
              <div className="absolute flex flex-col px-8 pt-[92px] pb-[18px]" style={{ left: 438, top: 21, width: 389, height: 552 }}>

                {/* 1. Radar Chart & Lists */}
                <div className="flex gap-1.5 mt-[2px]">
                  <div className="w-[140px] flex-shrink-0 flex flex-col items-center -ml-[12px] -mt-[6px]">
                    <div style={{ transform: 'scale(0.72)', transformOrigin: 'center top', width: 200, height: 200 }}>
                      <ComparativePrintRadarChart traitsA={charAData.traits} traitsB={charBData.traits} monochrome={isSelfChemistry} />
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-2.5 -mt-[49px]">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${isSelfChemistry ? 'bg-slate-950' : 'bg-violet-500'}`} />
                        <span className="text-[7.5px] font-bold text-slate-700">{isSelfChemistry ? nameA : `🌙 ${nameA}`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${isSelfChemistry ? 'border border-slate-950 bg-white' : 'bg-pink-500'}`} />
                        <span className="text-[7.5px] font-bold text-slate-700">{isSelfChemistry ? nameB : `☀️ ${nameB}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-[14px] pr-0 -mr-[12px] pt-0 -mt-[6px]">
                    <div className={panelClass}>
                      <div className={`border-l-[3px] pl-2 ${isSelfChemistry ? 'border-slate-950' : 'border-violet-500'}`}>
                        <div className={`text-[7.5px] font-black mb-1.5 uppercase tracking-wide ${isSelfChemistry ? 'text-slate-950' : 'text-violet-600'}`}>SHARED STRENGTHS</div>
                        <div className="space-y-[5px]">
                          {(sessionChem.traitsSynergy?.sharedStrengths || []).slice(0, 2).map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`text-[6px] leading-[1.3] relative top-[1.5px] ${isSelfChemistry ? 'text-slate-950' : 'text-violet-400'}`}>&#9679;</span>
                              <span className="text-[7.5px] font-medium text-slate-600 leading-[1.3] overflow-hidden min-w-0" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={panelClass}>
                      <div className={`border-l-[3px] pl-2 ${isSelfChemistry ? 'border-zinc-500' : 'border-pink-500'}`}>
                        <div className={`text-[7.5px] font-black mb-1.5 uppercase tracking-wide ${isSelfChemistry ? 'text-zinc-700' : 'text-pink-600'}`}>COMPLEMENTARY</div>
                        <div className="space-y-[5px]">
                          {(sessionChem.traitsSynergy?.complementaryTraits || []).slice(0, 2).map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`text-[6px] leading-[1.3] relative top-[1.5px] ${isSelfChemistry ? 'text-zinc-600' : 'text-pink-400'}`}>&#9679;</span>
                              <span className="text-[7.5px] font-medium text-slate-600 leading-[1.3] overflow-hidden min-w-0" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Keywords Area (Clearing KEYWORDS pill vertically)
                    Self chemistry uses the stark zine-style template, so the keyword
                    chips sit a little closer to the KEYWORDS title and read larger.
                */}
                <div className={`${isSelfChemistry ? 'mt-[66px] gap-2' : 'mt-[66px] gap-2'} flex justify-center flex-nowrap px-4 whitespace-nowrap`}>
                  {styledChemKeywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className={isSelfChemistry
                        ? `inline-flex items-center border border-slate-950 px-[9px] py-[3.5px] text-[10.5px] font-extrabold ${idx % 2 === 0 ? 'bg-slate-950 text-white' : 'bg-white text-slate-950'}`
                        : `inline-flex items-center text-[10px] px-[9px] py-[3.5px] font-extrabold ${keyword.style.bg} ${keyword.style.text} ${keyword.style.shape} ${keyword.style.border}`
                      }
                      style={{ transform: `rotate(${(idx % 2 === 0 ? -1 : 1)}deg)` }}
                    >
                      {isSelfChemistry ? keyword.text : `${keyword.style.decoration} ${keyword.text}`}
                    </span>
                  ))}
                </div>

                {/* Description Text */}
                <div className={`${isSelfChemistry ? 'mt-[12px]' : 'mt-[12px]'} px-6 text-center flex-shrink-0`}>
                  <p className={`text-[9.5px] leading-[1.5] font-semibold tracking-tight break-keep ${isSelfChemistry ? 'text-slate-700' : 'text-slate-500'}`}>
                    {sessionChem.relationshipDynamic?.dynamicDescription || sessionChem.chemistryStory}
                  </p>
                </div>

                {/* 3. Best Moment */}
                <div className={`mt-auto ${isSelfChemistry ? 'mb-[10px] translate-y-[6px]' : 'mb-1'} mx-2 p-[10px] relative flex-shrink-0 ${isSelfChemistry ? 'rounded-[3px] border-[1.5px] border-slate-950 bg-white shadow-none' : 'bg-[#FFF5F8]/90 border-[1.5px] border-[#FCE7F3] rounded-[10px] shadow-[0_1px_3px_rgba(236,72,153,0.06)]'}`}>
                  <span className={`font-black text-[9px] block mb-[6px] tracking-tight ${isSelfChemistry ? 'text-slate-950' : 'text-[#EC4899]'}`}>Best Moment</span>
                  <p className={`text-[8.5px] font-bold leading-[1.4] break-keep ${isSelfChemistry ? 'text-slate-800' : 'text-[#BE185D]'}`}>
                    {sessionChem.relationshipDynamic?.bestMoment}
                  </p>
                </div>
              </div>
            </div>
          </>
        )
      }
    }

    // Default basic rendering if something is missing
    return (
      <div id={rootId} className="printable-report-root max-w-4xl mx-auto p-8 bg-white print:p-4" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900">AC&apos;SCENT ANALYSIS REPORT</h1>
        </div>
        <div className="border-2 border-slate-200 rounded-xl p-6 mb-6">
          <p>데이터가 충분하지 않거나 레이어링 퍼퓸 모드가 아닙니다.</p>
        </div>
      </div>
    )
  }

  const traits = analysisData.traits
  const scentCategories = analysisData.scentCategories
  const personalColor = analysisData.personalColor
  const matchingPerfume = analysisData.matchingPerfumes?.[0]
  const scentRecommendation = analysisData.scentRecommendation

  // 상위 3개 특성
  const topTraits = Object.entries(traits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, value]) => ({
      key: key as keyof TraitScores,
      value,
      label: TRAIT_LABELS[key as keyof TraitScores],
      icon: TRAIT_ICONS[key as keyof TraitScores],
      colors: TRAIT_COLORS[key as keyof TraitScores]
    }))

  // 향 카테고리 정렬
  const sortedScents = Object.entries(scentCategories).sort(([, a], [, b]) => b - a)

  const isSelfImageReport = analysis.target_type === 'self'

  // 컬러 타입 이름
  const colorTypeName = personalColor
    ? `${SEASON_LABELS[personalColor.season]} ${TONE_LABELS[personalColor.tone]}`
    : ''

  // 키워드에 스타일 할당
  const styledKeywords = (analysis.matching_keywords || []).slice(0, 4).map((keyword, index) => {
    const styleIndex = Math.floor(seededRandom(index + 100) * KEYWORD_STYLES.length)
    return { text: keyword, style: KEYWORD_STYLES[styleIndex] }
  })

  return (
    <>
      {/* 프린트 스타일 */}
      {standalonePrintStyles && (
        <style jsx global>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }

            /* 모든 요소 숨기기 */
            body * {
              visibility: hidden;
            }

            /* 보고서 컨테이너와 그 자식들만 보이기 */
            .printable-report-root,
            .printable-report-root * {
              visibility: visible;
            }

            /* 보고서를 좌상단에 고정 (레이아웃 유지) */
            .printable-report-root {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              margin: 0 !important;
              background: white !important;
            }

            /* 컬러 정확하게 출력 */
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}</style>
      )}

      {/* 보고서 컨테이너 */}
      <div id={rootId} className="printable-report-root w-[842px] h-[595px] relative mx-auto bg-white overflow-hidden">
        {/* 배경 SVG — public/background 폴더의 최신 배경 사용 */}
        <img
          src={isSelfImageReport ? '/background/1-2.svg' : '/background/1-1.svg'}
          alt=""
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />

        {/* ===== IMAGE PROFILE 섹션 ===== */}

        {/* NAME 값 */}
        <div
          className="absolute text-sm font-bold text-slate-900 leading-tight"
          style={{ left: 320, top: 119, maxWidth: 70, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
        >
          {analysis.idol_name || analysis.twitter_name || '-'}
        </div>




        {/* GENDER 값 */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 320, top: 152 }}>
          {analysis.idol_gender === 'Male' ? '남성' : analysis.idol_gender === 'Female' ? '여성' : '기타'}
        </div>




        {/* KEYWORDS */}
        <div className={`absolute flex flex-wrap gap-x-1 gap-y-0.5 ${isSelfImageReport ? 'grayscale' : ''}`} style={{ left: 210, top: 214, width: 160, maxHeight: 40, overflow: 'hidden' }}>
          {styledKeywords.map((keyword, idx) => (
            <span
              key={idx}
              className={`inline-flex h-[18px] items-center text-[9.5px] px-2 py-0 font-bold leading-none ${keyword.style.bg} ${keyword.style.text} ${keyword.style.shape} ${keyword.style.border}`}
              style={{ transform: `rotate(${(idx % 2 === 0 ? -2 : 2)}deg)` }}
            >
              {isSelfImageReport ? keyword.text : `${keyword.style.decoration} ${keyword.text}`}
            </span>
          ))}
        </div>

        {/* 분석 이미지 */}
        <div
          className={`absolute overflow-hidden ${isSelfImageReport ? 'rounded-none' : 'rounded-lg'}`}
          style={{ left: 32, top: 95, width: 156, height: 189 }}
        >
          {analysis.user_image_url ? (
            <img src={analysis.user_image_url} alt="분석 이미지" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <span className="text-slate-400 text-[8px]">이미지 없음</span>
            </div>
          )}
        </div>

        {/* FEATURE 레이더 차트 */}
        <div
          className="absolute"
          style={{
            left: 10,
            top: 280,
            transform: 'translate3d(0,0,0)',
            filter: 'blur(0)',
            WebkitFilter: 'blur(0)',
          }}
        >
          <PrintRadarChart traits={traits} monochrome={isSelfImageReport} />
        </div>





        {/* Top 3 특성 */}
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ left: 235, top: 320, width: 160 }}
        >
          {topTraits.map((trait) => (
            <div key={trait.key} className="flex items-center">
              <span className="text-[13px] font-black text-gray-700">{trait.label}</span>
            </div>
          ))}
        </div>

        {/* COLOR TYPE - 컬러 동그라미들 */}
        <div className="absolute flex gap-1.5" style={{ left: 45, top: 476 }}>
          {personalColor?.palette?.slice(0, 3).map((color, idx) => (
            <div
              key={idx}
              className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* COLOR TYPE - 설명 텍스트만 */}
        <div className="absolute" style={{ left: 210, top: 476, width: 145 }}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 -translate-y-3.5">
              <div
                className="w-3.5 h-3.5 rounded-full border border-slate-300"
                style={{ backgroundColor: personalColor?.palette?.[0] }}
              />
              <span className="text-[14px] font-black text-slate-800 uppercase tracking-wide">
                {colorTypeName}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-600 leading-tight -mt-1 -ml-0.5">
              {personalColor?.description}
            </p>
          </div>
        </div>


        {/* ===== SCENT PROFILE 섹션 ===== */}

        {/* TOP NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 120.5 }}>
          {matchingPerfume?.persona?.mainScent?.name || '-'}
        </div>

        {/* MIDDLE NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 162 }}>
          {matchingPerfume?.persona?.subScent1?.name || '-'}
        </div>

        {/* BASE NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 204 }}>
          {matchingPerfume?.persona?.subScent2?.name || '-'}
        </div>

        {/* 향기 계열 바 차트 - 기존 PerfumeProfile 스타일 (도트 형태) */}
        <div className="absolute space-y-0" style={{ left: 460, top: 240, width: 320 }}>
          {sortedScents.map(([key, value], index) => {
            const info = CATEGORY_INFO[key] || { icon: '⚪', name: key }
            const colors = categoryColors[key] || { bar: 'bg-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700' }
            const isMain = index === 0

            return (
              <div
                key={key}
                className="relative rounded-md py-0.5 px-1.5"
              >
                {isMain && (
                  <div className={isSelfImageReport
                    ? 'absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] text-white'
                    : 'absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full border border-slate-900 flex items-center justify-center text-[10px]'
                  }>
                    {isSelfImageReport ? '★' : '👑'}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 min-w-[75px] pl-1">
                    <span className="text-[12px] font-bold text-slate-800">{info.name}</span>
                  </div>
                  <div className="flex-grow flex items-center gap-[2px] ml-2">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={isSelfImageReport
                          ? `flex-1 h-3 border ${i < value ? 'bg-slate-800 border-slate-900' : 'bg-slate-100 border-slate-300'}`
                          : `w-2.5 h-2.5 rounded-full border ${i < value ? `${colors.bar} border-slate-900` : 'bg-slate-200 border-slate-300'}`
                        }
                        style={isSelfImageReport ? undefined : { transform: i >= value ? 'scale(0.6)' : 'scale(1)' }}
                      />
                    ))}
                  </div>
                  <div className={isSelfImageReport
                    ? 'flex-shrink-0 w-6 h-5 bg-slate-800 border border-slate-900 flex items-center justify-center'
                    : `flex-shrink-0 w-6 h-6 rounded ${colors.bar} border border-slate-900 flex items-center justify-center`
                  }>
                    <span className="text-[10px] font-black text-white">{value}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* BEST SEASON AREA */}
        <div className="absolute flex flex-col gap-2" style={{ left: 470, top: 444, width: 155 }}>
          <div className="rounded-xl py-1.5 px-1 self-center">
            <div className="flex gap-1">
              {(['spring', 'summer', 'autumn', 'winter'] as const).map((season) => {
                const isSelected = scentRecommendation?.best_season === season
                const icon = SEASON_ICONS[season]
                return (
                  <div
                    key={season}
                    className={`flex flex-col items-center justify-center w-8 h-10 rounded-lg border-2 ${isSelected
                      ? 'bg-emerald-400 border-emerald-600 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                  >
                    <span className={`text-[10px] ${!isSelected ? 'grayscale opacity-50' : ''}`}>{icon.emoji}</span>
                    <span className="text-[8px] font-bold mt-0.5">{icon.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-600 leading-tight break-keep border-l-[2.5px] border-slate-800 pl-1.5 ml-1 mt-[3px]">
            {scentRecommendation?.season_reason || "계절에 어울리는 향수 코멘트가 이곳에 표시됩니다."}
          </p>
        </div>

        {/* BEST TIME AREA */}
        <div className="absolute flex flex-col gap-2" style={{ left: 640, top: 444, width: 155 }}>
          <div className="rounded-xl py-1.5 px-1 self-center">
            <div className="flex gap-1">
              {(['morning', 'afternoon', 'evening', 'night'] as const).map((time) => {
                const isSelected = scentRecommendation?.best_time === time
                const icon = TIME_ICONS[time]
                return (
                  <div
                    key={time}
                    className={`flex flex-col items-center justify-center w-8 h-10 rounded-lg border-2 ${isSelected
                      ? 'bg-blue-400 border-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                  >
                    <span className={`text-[10px] ${!isSelected ? 'grayscale opacity-50' : ''}`}>{icon.emoji}</span>
                    <span className="text-[8px] font-bold mt-0.5">{icon.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-600 leading-tight break-keep border-l-[2.5px] border-slate-800 pl-1.5 ml-1 mt-[3px]">
            {scentRecommendation?.time_reason || "시간대에 어울리는 향수 코멘트가 이곳에 표시됩니다."}
          </p>
        </div>
      </div>
    </>
  )
}
