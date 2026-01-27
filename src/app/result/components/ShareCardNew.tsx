"use client"

import { forwardRef, useMemo } from 'react'
import { ImageAnalysisResult, TraitScores } from '@/types/analysis'

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

export const ShareCardNew = forwardRef<HTMLDivElement, ShareCardProps>(
    function ShareCardNew({ userImage, twitterName, userName, analysisData }, ref) {
        const { traits, matchingPerfumes } = analysisData
        const persona = matchingPerfumes?.[0]?.persona

        // 작은 레이더 차트용 (center=60, radius=40)
        const polygonPoints = useMemo(() => calculateRadarPoints(traits, 60, 40), [traits])
        const markers = useMemo(() => calculateMarkerPoints(traits, 60, 40), [traits])

        // Notes Data
        const notesData = [
            { type: 'TOP', name: persona?.mainScent?.name || 'Top Note' },
            { type: 'MID', name: persona?.subScent1?.name || 'Middle Note' },
            { type: 'BASE', name: persona?.subScent2?.name || 'Base Note' }
        ]

        // ID Number
        const idNumber = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')

        return (
            <div
                ref={ref}
                style={{
                    width: 430,
                    height: 932,
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-jua), "Jua", sans-serif',
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

                {/* 1. AC'SCENT ID Number */}
                <div
                    style={{
                        position: 'absolute',
                        top: 108,
                        left: '50%',
                        transform: 'translateX(35px)',
                        fontSize: 18,
                        fontWeight: 900,
                        color: '#451a03',
                        letterSpacing: 2,
                        zIndex: 10,
                    }}
                >
                    {idNumber}
                </div>

                {/* 2. 최애 이미지 - Top Square Box */}
                <div
                    style={{
                        position: 'absolute',
                        top: 250,
                        left: '50%',
                        transform: 'translateX(-56%)',
                        width: 115,
                        height: 115,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        overflow: 'hidden',
                        borderRadius: 8,
                    }}
                >
                    {userImage ? (
                        <img
                            src={userImage}
                            alt="최애 이미지"
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
                            이미지 없음
                        </div>
                    )}
                </div>

                {/* 3. Description (Jujeop) - Middle Dotted Box */}
                <div
                    style={{
                        position: 'absolute',
                        top: 440,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 320,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 10,
                    }}
                >
                    <p
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#451a03',
                            lineHeight: 1.5,
                            margin: 0,
                            wordBreak: 'keep-all',
                            padding: '0 10px'
                        }}
                    >
                        {twitterName || `${userName}님만의 특별한 향기`}
                    </p>
                </div>

                {/* 4. NOTE Box - Bottom Left */}
                <div
                    style={{
                        position: 'absolute',
                        top: 600,
                        left: 45,
                        width: 160,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                    }}
                >
                    <div style={{ marginTop: 35, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {notesData.map((note, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    paddingLeft: 4
                                }}
                            >
                                <div style={{
                                    backgroundColor: '#FFFBEB',
                                    border: '1px solid #d97706',
                                    borderRadius: 12,
                                    padding: '4px 8px',
                                    fontSize: 10,
                                    fontWeight: 900,
                                    color: '#92400E',
                                    minWidth: 40,
                                    textAlign: 'center'
                                }}>
                                    {note.type}
                                </div>
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#334155',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {note.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Radar Chart - Bottom Right (STYLE 위치) */}
                <div
                    style={{
                        position: 'absolute',
                        top: 590,
                        right: 35,
                        width: 170,
                        height: 170,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg width="140" height="140" viewBox="0 0 120 120">
                        <defs>
                            <linearGradient id="shareChartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F472B6" />
                                <stop offset="50%" stopColor="#FACC15" />
                                <stop offset="100%" stopColor="#60A5FA" />
                            </linearGradient>
                        </defs>

                        {/* Grid Circles */}
                        {[8, 16, 24, 32, 40].map(r => (
                            <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.4" />
                        ))}
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
                            const angle = -Math.PI / 2 + i * (Math.PI * 2) / 10
                            const x2 = 60 + 40 * Math.cos(angle)
                            const y2 = 60 + 40 * Math.sin(angle)
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

                        {/* Labels (축약) */}
                        {['귀', '섹', '럭', '순', '자', '카', '다', '우', '청', '독'].map((label, i) => {
                            const angle = -Math.PI / 2 + i * (Math.PI * 2) / 10
                            const labelRadius = 52
                            const x = 60 + labelRadius * Math.cos(angle)
                            const y = 60 + labelRadius * Math.sin(angle)
                            return (
                                <text
                                    key={i}
                                    x={x}
                                    y={y}
                                    dominantBaseline="middle"
                                    textAnchor="middle"
                                    fontSize="7"
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

            </div>
        )
    }
)
