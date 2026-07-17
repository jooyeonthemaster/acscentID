"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles } from "lucide-react"
import { useMemo, useEffect, useState } from "react"
import { createPortal } from "react-dom"

// ==================== TYPES ====================
export interface HeroAnalysisData {
    radarScores: Record<string, number>
    hashtags: string[]
    fragranceHints: Array<{
        name: string
        score: number
        emoji: string
        color: string
    }>
    mainFragrance: {
        name: string
        emoji: string
    }
    teaser: string
}

interface HeroAnalysisModalProps {
    isOpen: boolean
    onClose: () => void
    data: HeroAnalysisData | null
    onDetailClick: () => void
}

// ==================== COLOR MAPS ====================
const FRAGRANCE_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
    yellow: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    red: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", fill: "bg-red-400" },
    pink: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    amber: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    purple: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    orange: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    green: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    blue: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
    teal: { bg: "bg-[#0C0E16]", border: "border-[#262A38]", text: "text-[#A69F8D]", fill: "bg-[#161925]" },
}

const HASHTAG_STYLES = [
    "bg-gradient-to-br from-[#232838] to-[#232838] text-[#E9E2D0] border-[#262A38] shadow-[#151823]",
    "bg-gradient-to-r from-[#161925] to-[#161925] text-[#E9E2D0] shadow-stone-200",
    "bg-[#0C0E16] text-[#A69F8D] border-2 border-[#262A38]",
    "bg-gradient-to-br from-[#232838] to-[#232838] text-[#E9E2D0] border-[#262A38]",
    "bg-gradient-to-r from-[#232838] to-[#232838] text-[#E9E2D0] shadow-stone-200",
    "bg-gradient-to-br from-[#232838] to-[#232838] text-[#A69F8D] border-[#262A38]",
    "bg-gradient-to-r from-[#161925] to-[#161925] text-[#E9E2D0] shadow-stone-200",
]

// ==================== RADAR CHART ====================
function RadarChart({ scores }: { scores: Record<string, number> }) {
    const labels = Object.keys(scores)
    const values = Object.values(scores)
    const n = labels.length

    const size = 220
    const center = size / 2
    const maxRadius = 80

    // 각도 계산 (위에서 시작)
    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / n - Math.PI / 2
        const radius = (value / 10) * maxRadius
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle)
        }
    }

    // 레이블 위치
    const getLabelPoint = (index: number) => {
        const angle = (Math.PI * 2 * index) / n - Math.PI / 2
        const radius = maxRadius + 25
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle)
        }
    }

    // 데이터 경로
    const dataPath = useMemo(() => {
        return values.map((v, i) => {
            const point = getPoint(i, v)
            return `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`
        }).join(' ') + ' Z'
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values])

    // 그리드 원
    const gridCircles = [2, 4, 6, 8, 10]

    return (
        <div className="flex justify-center bg-stone-50/50 rounded-[12px] p-3">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <linearGradient id="heroChartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9F9F9F" />
                        <stop offset="50%" stopColor="#D1D1D1" />
                        <stop offset="100%" stopColor="#A2A2A2" />
                    </linearGradient>
                </defs>

                {/* 그리드 원 */}
                {gridCircles.map((level) => (
                    <circle
                        key={level}
                        cx={center}
                        cy={center}
                        r={(level / 10) * maxRadius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                    />
                ))}

                {/* 축 선 */}
                {labels.map((_, i) => {
                    const point = getPoint(i, 10)
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={point.x}
                            y2={point.y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                    )
                })}

                {/* 데이터 영역 */}
                <motion.path
                    d={dataPath}
                    fill="rgba(155,155,155, 0.15)"
                    stroke="url(#heroChartGradient)"
                    strokeWidth="2.5"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                />

                {/* 데이터 포인트 */}
                {values.map((v, i) => {
                    const point = getPoint(i, v)
                    return (
                        <motion.circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="url(#heroChartGradient)"
                            stroke="#fff"
                            strokeWidth="2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                        />
                    )
                })}

                {/* 레이블 */}
                {labels.map((label, i) => {
                    const point = getLabelPoint(i)
                    return (
                        <text
                            key={i}
                            x={point.x}
                            y={point.y}
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="600"
                            fill="#737373"
                        >
                            {label}
                        </text>
                    )
                })}
            </svg>
        </div>
    )
}

// ==================== HASHTAG BADGES ====================
function HashtagBadges({ hashtags }: { hashtags: string[] }) {
    const rotations = [-3, 2, -2, 3, -1, 2, -3]

    return (
        <div className="flex flex-wrap gap-2 justify-center p-2">
            {hashtags.map((tag, i) => (
                <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                    animate={{ opacity: 1, scale: 1, rotate: rotations[i % rotations.length] }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                    <span
                        className={`
                            inline-flex items-center gap-1 font-bold
                            rounded-full shadow-lg text-sm lg:text-base px-3 py-1.5
                            border select-none
                            ${HASHTAG_STYLES[i % HASHTAG_STYLES.length]}
                        `}
                    >
                        {i === 0 && <span className="text-[10px] lg:text-[12px]">✨</span>}
                        {i === 3 && <span className="text-[10px] lg:text-[12px]">🌿</span>}
                        <span className="whitespace-nowrap">{tag}</span>
                    </span>
                </motion.div>
            ))}
        </div>
    )
}

// ==================== FRAGRANCE HINT BARS ====================
function FragranceHintBars({ hints, mainFragrance }: {
    hints: HeroAnalysisData['fragranceHints']
    mainFragrance: HeroAnalysisData['mainFragrance']
}) {
    return (
        <div className="bg-[#12141D] border-2 border-[#262A38] rounded-[12px] p-3">
            <div className="space-y-2">
                {hints.slice(0, 6).map((hint, index) => {
                    const colors = FRAGRANCE_COLORS[hint.color] || FRAGRANCE_COLORS.purple
                    const isMain = hint.name === mainFragrance.name

                    return (
                        <motion.div
                            key={hint.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`relative rounded-[12px] p-2 ${colors.bg} border-2 ${colors.border} ${isMain ? 'ring-2 ring-offset-1 ring-[#343A4C]' : ''}`}
                        >
                            {isMain && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#161925] rounded-full border-2 border-[#262A38] flex items-center justify-center text-[10px] lg:text-[12px]">
                                    👑
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 min-w-[60px]">
                                    <span className="text-base">{hint.emoji}</span>
                                    <span className={`text-[10px] lg:text-[12px] font-bold ${colors.text}`}>{hint.name}</span>
                                </div>
                                <div className="flex-grow flex items-center gap-0.5">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: i < hint.score ? 1 : 0.4 }}
                                            transition={{ duration: 0.2, delay: index * 0.1 + i * 0.03 }}
                                            className={`w-2 h-2 rounded-full border ${i < hint.score
                                                ? `${colors.fill} border-[#262A38]`
                                                : 'bg-[#232838] border-[#262A38]'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className={`flex-shrink-0 w-6 h-6 rounded-[12px] ${colors.fill} border-2 border-[#262A38] flex items-center justify-center`}>
                                    <span className="text-[10px] lg:text-[12px] font-black text-[#E9E2D0]">{hint.score}</span>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* 메인 향료 표시 */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="mt-3 pt-2 border-t-2 border-dashed border-[#262A38]"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Sparkles size={12} className="text-[#8B8578]" />
                        <span className="text-[10px] lg:text-[12px] font-bold text-[#8B8578]">메인 계열</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#151823] to-[#151823] px-2.5 py-1 rounded-full border-2 border-[#262A38]">
                        <span className="text-sm lg:text-base">{mainFragrance.emoji}</span>
                        <span className="text-xs lg:text-sm font-black text-[#E9E2D0]">{mainFragrance.name}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// ==================== MAIN MODAL ====================
export function HeroAnalysisModal({ isOpen, onClose, data, onDetailClick }: HeroAnalysisModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!data || !mounted) return null

    // Portal로 document.body에 직접 렌더링하여 stacking context 문제 해결
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 배경 오버레이 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                    />

                    {/* 모달 */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[10000] max-h-[85vh] overflow-y-auto"
                    >
                        <div className="bg-[#0C0E16] rounded-t-[12px] border-t-4 border-x-4 border-[#262A38] shadow-2xl">
                            {/* 핸들 바 */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1.5 bg-[#232838] rounded-full" />
                            </div>

                            {/* 헤더 */}
                            <div className="flex items-center justify-between px-5 pb-3">
                                <div>
                                    <h2 className="text-lg font-black text-[#E9E2D0] flex items-center gap-2">
                                        <span className="text-xl">✨</span>
                                        이미지 분석 결과
                                    </h2>
                                    <p className="text-xs lg:text-sm text-[#8B8578] font-medium mt-0.5">
                                        {data.teaser}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-[#1B1F2C] flex items-center justify-center text-[#8B8578] hover:bg-[#232838] transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* 콘텐츠 */}
                            <div className="px-4 pb-4 space-y-4">
                                {/* 1. 레이더 차트 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm lg:text-base">📊</span>
                                        <span className="text-xs lg:text-sm font-bold text-[#A69F8D]">이미지 분위기 분석</span>
                                    </div>
                                    <RadarChart scores={data.radarScores} />
                                </div>

                                {/* 2. 해시태그 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm lg:text-base">#️⃣</span>
                                        <span className="text-xs lg:text-sm font-bold text-[#A69F8D]">이미지 키워드</span>
                                    </div>
                                    <HashtagBadges hashtags={data.hashtags} />
                                </div>

                                {/* 3. 향료 힌트 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm lg:text-base">🧪</span>
                                        <span className="text-xs lg:text-sm font-bold text-[#A69F8D]">어울리는 향료 힌트</span>
                                    </div>
                                    <FragranceHintBars hints={data.fragranceHints} mainFragrance={data.mainFragrance} />
                                </div>
                            </div>

                            {/* 하단 버튼 - 모바일 하단 네비게이션 고려하여 패딩 추가 */}
                            <div className="sticky bottom-0 px-4 pt-8 pb-24 md:pb-6 bg-gradient-to-t from-[#0C0E16] via-[#0C0E16] to-transparent">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onDetailClick}
                                    className="w-full py-4 bg-[#161925] text-[#E9E2D0] font-black text-base rounded-[12px] border-4 border-[#262A38] transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={20} />
                                    자세한 분석 받기
                                </motion.button>
                                <p className="text-center text-[10px] lg:text-[12px] text-[#8B8578] mt-2">
                                    최종 퍼퓸 레시피와 맞춤 추천을 받아보세요
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
