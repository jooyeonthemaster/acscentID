"use client"

import { motion } from "framer-motion"
import type { GraduationAnalysisResult } from "@/types/analysis"

interface GraduationMessageCardProps {
    displayedAnalysis: GraduationAnalysisResult
    userName?: string
    isDesktop?: boolean
}

export function GraduationMessageCard({ displayedAnalysis, userName, isDesktop = false }: GraduationMessageCardProps) {
    const { graduationMessage, graduationType, schoolName } = displayedAnalysis

    if (!graduationMessage) {
        return null
    }

    const graduationTypeLabels: Record<string, string> = {
        elementary: '초등학교',
        middle: '중학교',
        high: '고등학교',
        university: '대학교',
        graduate: '대학원',
        other: ''
    }

    const graduationLabel = graduationType ? graduationTypeLabels[graduationType] || '' : ''
    const displaySchool = schoolName || graduationLabel

    return (
        <div className={`space-y-4 ${isDesktop ? 'lg:space-y-6' : ''}`}>
            {/* 축하 메시지 카드 */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
            >
                {/* 배경 장식 */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-4 left-4 text-6xl">🎓</div>
                    <div className="absolute top-8 right-8 text-4xl">🌸</div>
                    <div className="absolute bottom-6 left-1/3 text-5xl">🎉</div>
                    <div className="absolute bottom-4 right-4 text-4xl">✨</div>
                </div>

                <div className={`relative z-10 p-5 ${isDesktop ? 'lg:p-6' : ''}`}>
                    {/* 헤더 */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 border-2 border-slate-900 shadow-[2px_2px_0px_#000] mb-3">
                            <span className="text-3xl">🎓</span>
                        </div>
                        <h2 className={`font-black text-slate-900 ${isDesktop ? 'text-2xl' : 'text-xl'}`}>
                            {userName ? `${userName}님,` : ''} 축하해요!
                        </h2>
                        {displaySchool && (
                            <p className="text-amber-700 font-bold mt-1">
                                {displaySchool} 졸업을 진심으로 축하합니다 🌸
                            </p>
                        )}
                    </div>

                    {/* 축하 메시지 */}
                    <div className="bg-white/80 rounded-xl border-2 border-amber-300 p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">🎊</span>
                            <div>
                                <h3 className={`font-black text-amber-700 mb-2 ${isDesktop ? 'text-base' : 'text-sm'}`}>
                                    졸업 축하 메시지
                                </h3>
                                <p className={`text-slate-700 leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm'}`}>
                                    {graduationMessage.congratulation}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 응원 메시지 */}
                    <div className="bg-white/80 rounded-xl border-2 border-purple-300 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">🚀</span>
                            <div>
                                <h3 className={`font-black text-purple-700 mb-2 ${isDesktop ? 'text-base' : 'text-sm'}`}>
                                    미래를 향한 응원
                                </h3>
                                <p className={`text-slate-700 leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm'}`}>
                                    {graduationMessage.encouragement}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 장식 바 */}
                <div className="h-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
            </motion.div>

            {/* 인증서 스타일 카드 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000] p-6 text-center"
            >
                {/* 골드 프레임 */}
                <div className="absolute inset-3 border-2 border-amber-300 rounded-xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="text-4xl mb-3">📜</div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">졸업 기념 퍼퓸 인증서</h3>
                    <div className="w-20 h-0.5 bg-amber-400 mx-auto mb-4" />
                    <p className={`text-slate-600 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                        이 향수는 {userName || '당신'}님의<br />
                        학창 시절의 추억, 현재의 성장, 미래의 꿈을<br />
                        담아 특별히 추천되었습니다.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full border border-amber-400">
                        <span className="text-amber-700 font-bold text-sm">
                            🎓 {new Date().getFullYear()}년 졸업생
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
