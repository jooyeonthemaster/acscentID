"use client"

import { forwardRef, useMemo } from 'react'
import { ImageAnalysisResult, TraitScores, ScentCategoryScores, CATEGORY_INFO, SEASON_LABELS, TONE_LABELS } from '@/types/analysis'

interface ShareCardProps {
    userImage?: string
    twitterName: string
    userName: string
    userGender?: string
    perfumeName?: string
    perfumeBrand?: string
    analysisData: ImageAnalysisResult
}

// 작은 레이더 차트용 계산 함수 (center=60, maxRadius=40)
const calculateRadarPoints = (traits: TraitScores, center: number = 60, maxRadius: number = 40) => {
    const order: (keyof TraitScores)[] = [
        'cute', 'sexy', 'luxury', 'purity', 'freedom',
        'charisma', 'darkness', 'elegance', 'freshness', 'uniqueness'
    ]

    const points = order.map((trait, index) => {
        const score = traits[trait] || 0
        const normalizedScore = score / 10
        const radius = normalizedScore * maxRadius

        const angleStart = -Math.PI / 2
        const angleStep = (Math.PI * 2) / 10
        const angle = angleStart + index * angleStep

        const x = center + radius * Math.cos(angle)
        const y = center + radius * Math.sin(angle)

        return `${x},${y}`
    })

    return points.join(' ')
}

const calculateMarkerPoints = (traits: TraitScores, center: number = 60, maxRadius: number = 40) => {
    const order: (keyof TraitScores)[] = [
        'cute', 'sexy', 'luxury', 'purity', 'freedom',
        'charisma', 'darkness', 'elegance', 'freshness', 'uniqueness'
    ]

    return order.map((trait, index) => {
        const score = traits[trait] || 0
        const normalizedScore = score / 10
        const radius = normalizedScore * maxRadius

        const angleStart = -Math.PI / 2
        const angleStep = (Math.PI * 2) / 10
        const angle = angleStart + index * angleStep

        const x = center + radius * Math.cos(angle)
        const y = center + radius * Math.sin(angle)

        return { x, y }
    })
}

// 한글 라벨 (순서: 귀여움, 섹시함, 럭셔리, 순수함, 자유로움, 카리스마, 다크함, 우아함, 청량함, 독특함)
const TRAIT_KO_LABELS = ['귀여움', '섹시함', '럭셔리', '순수함', '자유로움', '카리스마', '다크함', '우아함', '청량함', '독특함']

// 텍스트 줄바꿈 함수 (20자 기준)
const formatDescription = (text: string) => {
    if (!text) return '';
    const firstSentence = text.split(/[.!?]/)[0] + (text.match(/[.!?]/)?.[0] || '');

    const lines = [];
    for (let i = 0; i < firstSentence.length; i += 20) {
        lines.push(firstSentence.slice(i, i + 20));
    }
    return lines.join('\n');
}

export const ShareCardNew = forwardRef<HTMLDivElement, ShareCardProps>(
    function ShareCardNew({ userImage, twitterName, userName, perfumeName, perfumeBrand, analysisData }, ref) {
        const { traits, matchingPerfumes, scentCategories, personalColor } = analysisData
        const persona = matchingPerfumes?.[0]?.persona

        // 레이더 차트 (center=60, radius=40) -> 사용자 요청에 따라 위치/크기 조정 필요 시 여기서 값 조절
        // 현재는 SVG viewBox 내부 좌표계 기준임
        const polygonPoints = useMemo(() => calculateRadarPoints(traits, 60, 35), [traits])
        const markers = useMemo(() => calculateMarkerPoints(traits, 60, 35), [traits])

        // Notes Data
        const notesData = [
            { type: 'TOP', name: persona?.mainScent?.name || 'Top Note' },
            { type: 'MID', name: persona?.subScent1?.name || 'Middle Note' },
            { type: 'BASE', name: persona?.subScent2?.name || 'Base Note' }
        ]

        // ID Number
        const idNumber = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')

        // Scent Categories (Left Column, below Notes)
        // Order: Citrus, Floral, Woody, Musky, Fruity, Spicy
        const scentOrder: (keyof ScentCategoryScores)[] = ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy']

        return (
            <div
                ref={ref}
                style={{
                    width: 430,
                    height: 932,
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-jua), "Jua", sans-serif',
                    backgroundColor: '#FFF' // 기본 배경색
                }}
            >
                {/* Background Image */}
                <img
                    src="/images/shareback/backimage.png"
                    alt="background"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        zIndex: 0
                    }}
                    crossOrigin="anonymous"
                />



                {/* 1.5 Perfume ID Only (Nudge Right) */}
                <div
                    style={{
                        position: 'absolute',
                        top: 166,
                        left: '67%',
                        transform: 'translateX(-50%)',
                        width: 250,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}
                >
                    <h2 style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.1,
                        letterSpacing: -0.5
                    }}>
                        {persona?.id || perfumeBrand || '맞춤 향수'}
                    </h2>
                </div>

                {/* 2. 분석 이미지 - Top Square Box */}
                <div
                    style={{
                        position: 'absolute',
                        top: 210,
                        left: '50%',
                        transform: 'translateX(-61.5%)',
                        width: 130,
                        height: 173,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        overflow: 'hidden',
                        borderRadius: 4,
                        // border: '1px solid red' // for debug
                    }}
                >
                    {userImage ? (
                        <img
                            src={userImage}
                            alt="분석 이미지"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8',
                                fontSize: 14,
                            }}
                        >
                            NO IMAGE
                        </div>
                    )}
                </div>

                {/* 3. Name/Twitter - Below Image */}
                <div
                    style={{
                        position: 'absolute',
                        top: 385,
                        left: '50%',
                        transform: 'translateX(-52%)',
                        width: 320,
                        textAlign: 'center',
                        zIndex: 10,
                    }}
                >
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: 0 }}>
                        {userName}
                    </h2>
                </div>

                {/* 4. Description (Jujeop) - Middle Box */}
                <div
                    style={{
                        position: 'absolute',
                        top: 425,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 290,
                        height: 75,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 10,
                        // border: '1px solid blue'
                    }}
                >
                    <p
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#451a03',
                            lineHeight: 1.4,
                            margin: 0,
                            wordBreak: 'keep-all',
                            padding: '0 10px'
                        }}
                    >
                        {twitterName || `${userName}님만의 특별한 향기`}
                    </p>
                </div>

                {/* =================================================================================
                    BOTTOM LEFT AREA: NOTES & SCENT CATEGORIES
                   ================================================================================= */}
                {/* =================================================================================
                    BOTTOM LEFT AREA: SCENT CATEGORIES (High)
                   ================================================================================= */}
                <div
                    style={{
                        position: 'absolute',
                        top: 623,
                        left: 58,
                        width: 130,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Main Container: bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[2px_2px_0px_#000] */}
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: 6, // scaled rounded-xl
                        padding: 6, // scaled p-3
                        boxShadow: '1px 1px 0px #000', // scaled shadow
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4 // increased to prevent sticking with 1.5px rings
                    }}>
                        {scentOrder.map((catKey) => {
                            const info = CATEGORY_INFO[catKey]
                            const score = scentCategories?.[catKey] || 0
                            // New Design: 10 dots max usually, but snippet shows 8 dots specifically?
                            // Snippet: 8 dots. "Main" one has crown.
                            // User snippet seems to imply top category gets special treatment? 
                            // Or just listing all.
                            // Snippet shows "Citrus" as top with crown. 
                            // I should probably apply these styles generically.

                            const styles = getCategoryStyles(catKey)
                            const dots = []
                            // Snippet shows 8 dots + badge.
                            for (let i = 0; i < 8; i++) {
                                dots.push(i < score ? 'filled' : 'empty')
                            }

                            // Calculate if this is the max score (winner)? 
                            // The snippet shows a crown on the first item. 
                            // For now, I'll just render the items. 
                            // If user wants the crown logic, I can add it later. (Snippet has crown structure).

                            return (
                                <div key={catKey} style={{
                                    position: 'relative',
                                    borderRadius: 4, // scaled rounded-lg
                                    padding: '2px 4px', // scaled p-2, extra vertical tight
                                    backgroundColor: styles.bg,
                                    border: `0.5px solid ${styles.borderColor}`,
                                    // Ring simulation: scaled
                                    boxShadow: `0 0 0 0.5px #fff, 0 0 0 1.5px ${styles.ringColor}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    {/* Icon & Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 28 }}>
                                        <span style={{ fontSize: 8 }}>{info.icon}</span>
                                        <span style={{ fontSize: 8, fontWeight: 'bold', color: styles.textColor }}>{info.name}</span>
                                    </div>

                                    {/* Dots */}
                                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {dots.map((status, dIdx) => (
                                            <div
                                                key={dIdx}
                                                style={{
                                                    width: 3,
                                                    height: 3,
                                                    borderRadius: '50%',
                                                    backgroundColor: status === 'filled' ? styles.dotColor : '#e2e8f0',
                                                    border: status === 'filled' ? '0.5px solid #0f172a' : '0.5px solid #cbd5e1',
                                                    transform: status === 'empty' ? 'scale(0.4)' : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Score Badge */}
                                    <div style={{
                                        flexShrink: 0,
                                        width: 10,
                                        height: 10,
                                        borderRadius: 3,
                                        backgroundColor: styles.dotColor,
                                        border: '1px solid #0f172a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ fontSize: 5, fontWeight: 900, color: '#fff' }}>{Math.min(score, 10)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* =================================================================================
                    BOTTOM LEFT AREA: NOTES & KEYWORDS
                   ================================================================================= */}
                <div
                    style={{
                        position: 'absolute',
                        top: 555,
                        left: 115,
                        width: 100,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {notesData.map((note, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    height: 18,
                                    justifyContent: 'center',
                                    transform: idx === 0 ? 'translateY(-7px)' : idx === 1 ? 'translateY(-3px)' : 'translateY(2px)'
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 900,
                                        color: '#334155',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '100%'
                                    }}
                                >
                                    {note.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>


                {/* =================================================================================
                    BOTTOM RIGHT AREA: COLOR TYPE & RADAR CHART
                   ================================================================================= */}
                <div
                    style={{
                        position: 'absolute',
                        top: 550, // Moved up from 555
                        right: 40,
                        width: 155,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10
                    }}
                >
                    {/* COLOR TYPE LABEL REMOVED */}

                    {/* Personal Color Info */}
                    {personalColor && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 5 }}>
                            {/* Title */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 900, color: '#1e293b', transform: 'translate(29px, -5px)', textAlign: 'left' }}>
                                    {SEASON_LABELS[personalColor.season]} {TONE_LABELS[personalColor.tone]}
                                </div>
                                <div style={{ fontSize: 9, color: '#64748b', marginTop: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.3, textAlign: 'left', transform: 'translateX(-35px)' }}>
                                    {formatDescription(personalColor.description)}
                                </div>
                            </div>

                            {/* Palette Swatches */}
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', transform: 'translateX(-40px)' }}>
                                {personalColor.palette.slice(0, 4).map((color, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 6,
                                            backgroundColor: color,
                                            border: '1px solid rgba(0,0,0,0.1)',
                                            boxShadow: '1px 1px 0px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Radar Chart */}
                    <div
                        style={{
                            width: 130,
                            height: 130,
                            position: 'relative',
                            // 살짝 왼쪽으로 이동 요청 반영 + 추가 이동 35px (기존 -30px에서 늘림)
                            transform: 'translate(-40px, -20px)',
                            marginTop: 10
                        }}
                    >
                        <svg width="130" height="130" viewBox="0 0 120 120">
                            <defs>
                                <linearGradient id="shareChartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#F472B6" />
                                    <stop offset="50%" stopColor="#FACC15" />
                                    <stop offset="100%" stopColor="#60A5FA" />
                                </linearGradient>
                            </defs>

                            {/* Grid Circles */}
                            {[7, 14, 21, 28, 35].map(r => (
                                <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.4" />
                            ))}
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
                                const angle = -Math.PI / 2 + i * (Math.PI * 2) / 10
                                const x2 = 60 + 35 * Math.cos(angle)
                                const y2 = 60 + 35 * Math.sin(angle)
                                return <line key={i} x1="60" y1="60" x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.4" />
                            })}

                            {/* Data Polygon */}
                            <polygon
                                points={polygonPoints}
                                fill="rgba(236, 72, 153, 0.25)"
                                stroke="url(#shareChartGradient)"
                                strokeWidth="1.5"
                            />

                            {/* Markers */}
                            {markers.map((pt, i) => (
                                <circle key={i} cx={pt.x} cy={pt.y} r="2" fill="url(#shareChartGradient)" stroke="#fff" strokeWidth="1" />
                            ))}

                            {/* Labels */}
                            {TRAIT_KO_LABELS.map((label, i) => {
                                const angle = -Math.PI / 2 + i * (Math.PI * 2) / 10
                                const labelRadius = 45 // 라벨 위치 살짝 안쪽으로
                                const x = 60 + labelRadius * Math.cos(angle)
                                const y = 60 + labelRadius * Math.sin(angle)
                                return (
                                    <text
                                        key={i}
                                        x={x}
                                        y={y}
                                        dominantBaseline="middle"
                                        textAnchor="middle"
                                        fontSize="6" // 폰트 사이즈 조금 작게
                                        fontWeight="700"
                                        fill="#64748b"
                                        style={{ fontFamily: 'var(--font-jua), "Jua", sans-serif' }}
                                    >
                                        {label}
                                    </text>
                                )
                            })}
                        </svg>
                    </div>

                    {/* Keywords (Bottom Right, under Radar Chart) */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'nowrap', // Changed from 'wrap' to prevent wrapping in download
                        justifyContent: 'center',
                        gap: 2, // Slightly reduced gap further to fit horizontal
                        marginTop: -48, // Moved 2px further down from -50
                        transform: 'translateX(-40px)', // Align with chart
                        zIndex: 10
                    }}>
                        {(analysisData.matchingKeywords || persona?.keywords || []).slice(0, 3).map((keyword, idx) => (
                            <div key={idx} style={{
                                opacity: 1
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: idx === 0
                                        ? 'linear-gradient(135deg, #CFFAFE, #99F6E4)'
                                        : idx === 1
                                            ? 'linear-gradient(135deg, #CFFAFE, #99F6E4)'
                                            : 'linear-gradient(135deg, #34D399, #4ADE80)',
                                    color: idx === 2 ? '#FFFFFF' : '#0F766E',
                                    fontWeight: 'bold',
                                    borderRadius: '9999px',
                                    padding: '2px 5px', // Slightly tightened padding
                                    fontSize: '7px', // Reduced from 8px
                                    border: idx === 2 ? 'none' : '0.5px solid #5EEAD4',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <span style={{ whiteSpace: 'nowrap' }}>{keyword}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Icon/Logo - if needed, using background image's bottom area */}
                {/* <div style={{ position: 'absolute', bottom: 30, width: '100%', textAlign: 'center' }}>
                    <img src="/logo.png" style={{ width: 40, margin: '0 auto' }} /> 
                </div> */}

            </div>
        )
    }
)

// Helper for New Design Colors
function getCategoryStyles(cat: string) {
    switch (cat) {
        case 'citrus':
            return {
                bg: '#fefce8', // yellow-50
                borderColor: '#fde047', // yellow-300 (approx)
                ringColor: '#facc15', // yellow-400
                textColor: '#a16207', // yellow-700
                dotColor: '#facc15' // yellow-400
            }
        case 'fruity':
            return {
                bg: '#fef2f2', // red-50
                borderColor: '#fca5a5', // red-300
                ringColor: '#f87171', // red-400
                textColor: '#b91c1c', // red-700
                dotColor: '#f87171' // red-400
            }
        case 'spicy':
            return {
                bg: '#fff7ed', // orange-50
                borderColor: '#fdba74', // orange-300
                ringColor: '#fb923c', // orange-400 (or 500?) Snippet: orange-500
                textColor: '#c2410c', // orange-700
                dotColor: '#f97316' // orange-500
            }
        case 'woody':
            return {
                bg: '#fffbeb', // amber-50
                borderColor: '#fcd34d', // amber-300
                ringColor: '#fbbf24', // amber-400
                textColor: '#b45309', // amber-700
                dotColor: '#f59e0b' // amber-500
            }
        case 'musky':
            return {
                bg: '#faf5ff', // purple-50
                borderColor: '#d8b4fe', // purple-300
                ringColor: '#c084fc', // purple-400
                textColor: '#7e22ce', // purple-700
                dotColor: '#c084fc' // purple-400
            }
        case 'floral':
            return {
                bg: '#fdf2f8', // pink-50
                borderColor: '#f9a8d4', // pink-300
                ringColor: '#f472b6', // pink-400
                textColor: '#be185d', // pink-700
                dotColor: '#f472b6' // pink-400
            }
        default:
            return {
                bg: '#f8fafc',
                borderColor: '#cbd5e1',
                ringColor: '#94a3b8',
                textColor: '#334155',
                dotColor: '#94a3b8'
            }
    }
}
