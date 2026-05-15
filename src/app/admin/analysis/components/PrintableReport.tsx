'use client'

/* eslint-disable @next/next/no-img-element */
import { ImageAnalysisResult, TraitScores, ScentCategoryScores, TRAIT_LABELS, TRAIT_ICONS, CATEGORY_INFO, SEASON_LABELS, TONE_LABELS, ChemistryProfile } from '@/types/analysis'

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

export function PrintableReport({ analysis, layeringSession, partnerAnalysis }: PrintableReportProps) {
  const analysisData = analysis.analysis_data

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
            <style jsx global>{`
              @media print {
                @page { size: A4 landscape; margin: 0; }
                body * { visibility: hidden; }
                #printable-report, #printable-report * { visibility: visible; }
                #printable-report { position: fixed !important; left: 0 !important; top: 0 !important; margin: 0 !important; background: white !important; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              }
            `}</style>
            <div id="printable-report" className="w-[842px] h-[595px] relative mx-auto bg-white overflow-hidden" style={{ fontFamily: 'Pretendard, sans-serif' }}>
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
                    <img src={charAInfo?.user_image_url || '/placeholder.jpg'} alt={nameA} className="w-full h-full object-cover" />
                  </div>
                  <div className={`text-4xl font-black ${isSelfChemistry ? 'text-slate-950' : 'text-slate-800'}`}>X</div>
                  <div className={`w-[125px] h-[145px] overflow-hidden border-[3px] shadow-md bg-slate-100 flex-shrink-0 ${isSelfChemistry ? 'rounded-[4px] border-slate-950 shadow-none' : 'rounded-2xl border-white'}`}>
                    <img src={charBInfo?.user_image_url || '/placeholder.jpg'} alt={nameB} className="w-full h-full object-cover" />
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
      <div className="max-w-4xl mx-auto p-8 bg-white print:p-4" style={{ fontFamily: 'Pretendard, sans-serif' }}>
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
          className={`absolute overflow-hidden ${isSelfImageReport ? 'rounded-none shadow-[2px_2px_0px_#000]' : 'rounded-lg shadow-[2px_2px_0px_#000]'}`}
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
