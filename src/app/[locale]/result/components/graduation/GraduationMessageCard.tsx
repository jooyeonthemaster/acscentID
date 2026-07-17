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
                className="relative overflow-hidden bg-gradient-to-br from-[#FDFAF1] via-[#FDFAF1] to-[#FDFAF1] rounded-[12px] border-2 border-[#D8CFBB]"
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
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#EFE4C8] to-[#EFE4C8] border-2 border-[#D8CFBB] mb-3">
                            <span className="text-3xl">🎓</span>
                        </div>
                        <h2 className={`font-black text-[#1A1610] ${isDesktop ? 'text-2xl' : 'text-xl'}`}>
                            {userName ? `${userName}님,` : ''} 축하해요!
                        </h2>
                        {displaySchool && (
                            <p className="text-[#5C564A] font-bold mt-1">
                                {displaySchool} 졸업을 진심으로 축하합니다 🌸
                            </p>
                        )}
                    </div>

                    {/* 축하 메시지 */}
                    <div className="bg-[#F5EFE2]/80 rounded-[12px] border-2 border-[#D8CFBB] p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">🎊</span>
                            <div>
                                <h3 className={`font-black text-[#5C564A] mb-2 ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                    졸업 축하 메시지
                                </h3>
                                <p className={`text-[#5C564A] leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                    {graduationMessage.congratulation}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 응원 메시지 */}
                    <div className="bg-[#F5EFE2]/80 rounded-[12px] border-2 border-[#D8CFBB] p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">🚀</span>
                            <div>
                                <h3 className={`font-black text-[#5C564A] mb-2 ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                    미래를 향한 응원
                                </h3>
                                <p className={`text-[#5C564A] leading-relaxed whitespace-pre-line ${isDesktop ? 'text-base' : 'text-sm lg:text-base'}`}>
                                    {graduationMessage.encouragement}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 장식 바 */}
                <div className="h-3 bg-gradient-to-r from-[#EFE4C8] via-[#EFE4C8] to-[#EFE4C8]" />
            </motion.div>

            {/* 인증서 스타일 카드 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative bg-gradient-to-br from-[#EDE5D2] to-[#F5EFE2] rounded-[12px] border-2 border-[#D8CFBB] p-6 text-center"
            >
                {/* 골드 프레임 */}
                <div className="absolute inset-3 border-2 border-[#D8CFBB] rounded-[12px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="text-4xl mb-3">📜</div>
                    <h3 className="text-lg font-black text-[#1A1610] mb-2">졸업 기념 퍼퓸 인증서</h3>
                    <div className="w-20 h-0.5 bg-[#EFE4C8] mx-auto mb-4" />
                    <p className={`text-[#5C564A] ${isDesktop ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>
                        이 향수는 {userName || '당신'}님의<br />
                        학창 시절의 추억, 현재의 성장, 미래의 꿈을<br />
                        담아 특별히 추천되었습니다.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EDE5D2] to-[#EDE5D2] rounded-full border border-[#C9BFA8]">
                        <span className="text-[#5C564A] font-bold text-sm lg:text-base">
                            🎓 {new Date().getFullYear()}년 졸업생
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
