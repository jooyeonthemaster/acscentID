'use client'

import { useMemo } from 'react'
import { ImageAnalysisResult, TraitScores, ScentCategoryScores, TRAIT_LABELS, TRAIT_ICONS, CATEGORY_INFO, SEASON_LABELS, TONE_LABELS } from '@/types/analysis'

interface PrintableReportProps {
  analysis: {
    id: string
    analysis_data: ImageAnalysisResult
    twitter_name: string
    perfume_name: string
    perfume_brand: string
    matching_keywords: string[]
    idol_name: string | null
    idol_gender: string | null
    service_mode: string
    created_at: string
    user_image_url?: string | null
  }
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
function PrintRadarChart({ traits }: { traits: TraitScores }) {
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
        fill="rgba(6, 182, 212, 0.15)"
        stroke="url(#printGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="printGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#60A5FA" />
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

export function PrintableReport({ analysis }: PrintableReportProps) {
  const analysisData = analysis.analysis_data
  const traits = analysisData.traits
  const scentCategories = analysisData.scentCategories
  const personalColor = analysisData.personalColor
  const matchingPerfume = analysisData.matchingPerfumes?.[0]
  const scentRecommendation = analysisData.scentRecommendation

  // 상위 3개 특성
  const topTraits = useMemo(() =>
    Object.entries(traits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, value]) => ({
        key: key as keyof TraitScores,
        value,
        label: TRAIT_LABELS[key as keyof TraitScores],
        icon: TRAIT_ICONS[key as keyof TraitScores],
        colors: TRAIT_COLORS[key as keyof TraitScores]
      })),
    [traits]
  )

  // 향 카테고리 정렬
  const sortedScents = useMemo(() =>
    Object.entries(scentCategories).sort(([, a], [, b]) => b - a),
    [scentCategories]
  )

  // 컬러 타입 이름
  const colorTypeName = personalColor
    ? `${SEASON_LABELS[personalColor.season]} ${TONE_LABELS[personalColor.tone]}`
    : ''

  // 키워드에 스타일 할당
  const styledKeywords = useMemo(() => {
    return (analysis.matching_keywords || []).slice(0, 5).map((keyword, index) => {
      const styleIndex = Math.floor(seededRandom(index + 100) * KEYWORD_STYLES.length)
      return { text: keyword, style: KEYWORD_STYLES[styleIndex] }
    })
  }, [analysis.matching_keywords])

  return (
    <>
      {/* 프린트 스타일 */}
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
          #printable-report,
          #printable-report * {
            visibility: visible;
          }

          /* 보고서를 좌상단에 고정 (레이아웃 유지) */
          #printable-report {
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

      {/* 보고서 컨테이너 */}
      <div id="printable-report" className="w-[842px] h-[595px] relative mx-auto bg-white overflow-hidden">
        {/* 배경 SVG */}
        <img src="/background.svg" alt="" className="absolute inset-0 w-full h-full object-fill pointer-events-none" />

        {/* ===== IMAGE PROFILE 섹션 ===== */}

        {/* NAME 값 */}
        <div
          className="absolute text-sm font-bold text-slate-900 leading-tight"
          style={{ left: 320, top: 115, maxWidth: 70, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
        >
          {analysis.idol_name || analysis.twitter_name || '-'}
        </div>




        {/* GENDER 값 */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 320, top: 152 }}>
          {analysis.idol_gender === 'Male' ? '남성' : analysis.idol_gender === 'Female' ? '여성' : '기타'}
        </div>




        {/* KEYWORDS - 기존 KeywordCloud 스타일 */}
        <div className="absolute flex flex-wrap gap-1" style={{ left: 210, top: 210, width: 180 }}>
          {styledKeywords.map((keyword, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center text-[10px] px-2 py-1 font-bold ${keyword.style.bg} ${keyword.style.text} ${keyword.style.shape} ${keyword.style.border}`}
              style={{ transform: `rotate(${(idx % 2 === 0 ? -2 : 2)}deg)` }}
            >
              {keyword.text}
            </span>
          ))}
        </div>

        {/* 분석 이미지 */}
        <div
          className="absolute overflow-hidden rounded-lg shadow-[2px_2px_0px_#000]"
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
          <PrintRadarChart traits={traits} />
        </div>





        {/* Top 3 특성 배지 - 심플 스타일 */}
        <div
          className="absolute bg-white border-2 border-gray-700 rounded-xl p-1 flex flex-col gap-1.5"
          style={{ left: 210, top: 349, width: 160 }}
        >
          {topTraits.map((trait, idx) => (
            <div key={trait.key} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[8px] font-bold">{idx + 1}</span>
              </div>
              <span className="text-[11px] font-black text-gray-700">{trait.label}</span>
            </div>
          ))}
        </div>

        {/* COLOR TYPE - 컬러 동그라미들 */}
        <div className="absolute flex gap-1" style={{ left: 45, top: 490 }}>
          {personalColor?.palette?.slice(0, 4).map((color, idx) => (
            <div
              key={idx}
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* COLOR TYPE - 설명 박스 */}
        <div className="absolute" style={{ left: 210, top: 478, width: 160 }}>
          <div className="border-2 border-gray-700 rounded-[16px] p-2 min-h-[70px] bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-3 h-3 rounded-full border border-slate-300"
                style={{ backgroundColor: personalColor?.palette?.[0] }}
              />
              <span className="text-[12px] font-black text-blue-900 uppercase tracking-wide">
                {colorTypeName}
              </span>
            </div>
            <p className="text-[8px] font-bold text-slate-600 leading-tight">
              {personalColor?.description
                ?.split(/(?<=[!.?])\s+/)
                .slice(0, 2)
                .join(' ')}
            </p>
          </div>
        </div>


        {/* ===== SCENT PROFILE 섹션 ===== */}

        {/* TOP NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 128 }}>
          {matchingPerfume?.persona?.mainScent?.name || '-'}
        </div>

        {/* MIDDLE NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 166 }}>
          {matchingPerfume?.persona?.subScent1?.name || '-'}
        </div>

        {/* BASE NOTE */}
        <div className="absolute text-sm font-bold text-slate-900" style={{ left: 610, top: 204 }}>
          {matchingPerfume?.persona?.subScent2?.name || '-'}
        </div>

        {/* 향기 계열 바 차트 - 기존 PerfumeProfile 스타일 (도트 형태) */}
        <div className="absolute space-y-0" style={{ left: 460, top: 245, width: 320 }}>
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
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full border border-slate-900 flex items-center justify-center text-[10px]">
                    👑
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 min-w-[75px]">
                    <span className="text-[14px]">{info.icon}</span>
                    <span className={`text-[12px] font-bold ${colors.text}`}>{info.name}</span>
                  </div>
                  <div className="flex-grow flex items-center gap-[5px] ml-2">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border ${i < value ? `${colors.bar} border-slate-900` : 'bg-slate-200 border-slate-300'
                          }`}
                        style={{ transform: i >= value ? 'scale(0.6)' : 'scale(1)' }}
                      />
                    ))}
                  </div>
                  <div className={`flex-shrink-0 w-6 h-6 rounded ${colors.bar} border border-slate-900 flex items-center justify-center`}>
                    <span className="text-[10px] font-black text-white">{value}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* BEST SEASON - 기존 스타일 */}
        <div className="absolute border-2 border-gray-700 rounded-xl py-2 px-1 bg-white" style={{ left: 474, top: 475 }}>
          <div className="flex gap-1">
            {(['spring', 'summer', 'autumn', 'winter'] as const).map((season) => {
              const isSelected = scentRecommendation?.best_season === season
              const icon = SEASON_ICONS[season]
              return (
                <div
                  key={season}
                  className={`flex flex-col items-center justify-center w-8 h-11 rounded-lg border-2 ${isSelected
                    ? 'bg-emerald-400 border-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                >
                  <span className={`text-[10px] ${!isSelected ? 'grayscale opacity-50' : ''}`}>{icon.emoji}</span>
                  <span className="text-[8px] font-bold">{icon.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* BEST TIME - 기존 스타일 */}
        <div className="absolute border-2 border-gray-700 rounded-xl py-2 px-1 bg-white" style={{ left: 650, top: 475 }}>
          <div className="flex gap-1">
            {(['morning', 'afternoon', 'evening', 'night'] as const).map((time) => {
              const isSelected = scentRecommendation?.best_time === time
              const icon = TIME_ICONS[time]
              return (
                <div
                  key={time}
                  className={`flex flex-col items-center justify-center w-8 h-11 rounded-lg border-2 ${isSelected
                    ? 'bg-blue-400 border-blue-600 text-white shadow-md'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                >
                  <span className={`text-[10px] ${!isSelected ? 'grayscale opacity-50' : ''}`}>{icon.emoji}</span>
                  <span className="text-[8px] font-bold">{icon.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
