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
    yellow: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", fill: "bg-yellow-400" },
    red: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", fill: "bg-red-400" },
    pink: { bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-700", fill: "bg-pink-400" },
    amber: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", fill: "bg-amber-500" },
    purple: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", fill: "bg-purple-400" },
    orange: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", fill: "bg-orange-500" },
    green: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", fill: "bg-green-500" },
    blue: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", fill: "bg-blue-400" },
    teal: { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700", fill: "bg-teal-400" },
}

const HASHTAG_STYLES = [
    "bg-gradient-to-br from-cyan-200 to-teal-200 text-teal-800 border-teal-300 shadow-cyan-100",
    "bg-gradient-to-r from-emerald-400 to-green-400 text-white shadow-emerald-200",
    "bg-rose-50 text-rose-600 border-2 border-rose-200",
    "bg-gradient-to-br from-violet-200 to-purple-200 text-purple-800 border-purple-300",
    "bg-gradient-to-r from-amber-300 to-yellow-300 text-amber-800 shadow-amber-200",
    "bg-gradient-to-br from-pink-200 to-rose-200 text-rose-700 border-rose-300",
    "bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-blue-200",
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
        <div className="flex justify-center bg-slate-50/50 rounded-2xl p-3">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <linearGradient id="heroChartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F472B6" />
                        <stop offset="50%" stopColor="#FACC15" />
                        <stop offset="100%" stopColor="#60A5FA" />
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
                    fill="rgba(14, 165, 233, 0.15)"
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
                            fill="#64748b"
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
                            rounded-full shadow-lg text-sm px-3 py-1.5
                            border select-none
                            ${HASHTAG_STYLES[i % HASHTAG_STYLES.length]}
                        `}
                    >
                        {i === 0 && <span className="text-[10px]">✨</span>}
                        {i === 3 && <span className="text-[10px]">🌿</span>}
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
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-3 shadow-[3px_3px_0px_#000]">
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
                            className={`relative rounded-xl p-2 ${colors.bg} border-2 ${colors.border} ${isMain ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}`}
                        >
                            {isMain && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px]">
                                    👑
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 min-w-[60px]">
                                    <span className="text-base">{hint.emoji}</span>
                                    <span className={`text-[10px] font-bold ${colors.text}`}>{hint.name}</span>
                                </div>
                                <div className="flex-grow flex items-center gap-0.5">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: i < hint.score ? 1 : 0.4 }}
                                            transition={{ duration: 0.2, delay: index * 0.1 + i * 0.03 }}
                                            className={`w-2 h-2 rounded-full border ${i < hint.score
                                                ? `${colors.fill} border-slate-900`
                                                : 'bg-slate-200 border-slate-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className={`flex-shrink-0 w-6 h-6 rounded-lg ${colors.fill} border-2 border-slate-900 flex items-center justify-center`}>
                                    <span className="text-[10px] font-black text-white">{hint.score}</span>
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
                className="mt-3 pt-2 border-t-2 border-dashed border-slate-200"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Sparkles size={12} className="text-yellow-500" />
                        <span className="text-[10px] font-bold text-slate-500">메인 계열</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 px-2.5 py-1 rounded-full border-2 border-slate-900">
                        <span className="text-sm">{mainFragrance.emoji}</span>
                        <span className="text-xs font-black text-slate-800">{mainFragrance.name}</span>
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
                        <div className="bg-[#FFFDF5] rounded-t-[32px] border-t-4 border-x-4 border-slate-900 shadow-2xl">
                            {/* 핸들 바 */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                            </div>

                            {/* 헤더 */}
                            <div className="flex items-center justify-between px-5 pb-3">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <span className="text-xl">✨</span>
                                        이미지 분석 결과
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {data.teaser}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* 콘텐츠 */}
                            <div className="px-4 pb-4 space-y-4">
                                {/* 1. 레이더 차트 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm">📊</span>
                                        <span className="text-xs font-bold text-slate-600">이미지 분위기 분석</span>
                                    </div>
                                    <RadarChart scores={data.radarScores} />
                                </div>

                                {/* 2. 해시태그 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm">#️⃣</span>
                                        <span className="text-xs font-bold text-slate-600">이미지 키워드</span>
                                    </div>
                                    <HashtagBadges hashtags={data.hashtags} />
                                </div>

                                {/* 3. 향료 힌트 */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                        <span className="text-sm">🧪</span>
                                        <span className="text-xs font-bold text-slate-600">어울리는 향료 힌트</span>
                                    </div>
                                    <FragranceHintBars hints={data.fragranceHints} mainFragrance={data.mainFragrance} />
                                </div>
                            </div>

                            {/* 하단 버튼 - 모바일 하단 네비게이션 고려하여 패딩 추가 */}
                            <div className="sticky bottom-0 px-4 pt-8 pb-24 md:pb-6 bg-gradient-to-t from-[#FFFDF5] via-[#FFFDF5] to-transparent">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onDetailClick}
                                    className="w-full py-4 bg-slate-900 text-white font-black text-base rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#FACC15] transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={20} />
                                    자세한 분석 받기
                                </motion.button>
                                <p className="text-center text-[10px] text-slate-400 mt-2">
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
