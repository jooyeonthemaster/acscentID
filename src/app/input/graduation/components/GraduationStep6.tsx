"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, ArrowRight, ImageIcon } from "lucide-react"
import Image from "next/image"
import { StepHeader } from "../../components/StepHeader"
import { GRADUATION_THEME } from "../constants"

interface GraduationStep6Props {
    imagePreview: string | null
    transformedImagePreview: string | null
    isTransforming: boolean
    handleTransformImage: () => void
    skipTransform: () => void
    handleComplete: () => void
    isSubmitting: boolean
}

export function GraduationStep6({
    imagePreview,
    transformedImagePreview,
    isTransforming,
    handleTransformImage,
    skipTransform,
    handleComplete,
    isSubmitting
}: GraduationStep6Props) {
    const hasTransformed = !!transformedImagePreview

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title="졸업사진 스타일 변환"
                step={6}
                description="AI가 졸업사진 느낌으로 변환해드릴까요? ✨ (선택)"
            />

            <div className="flex-1 flex flex-col items-center justify-center mt-4 space-y-4">
                {/* 이미지 비교 */}
                <div className="w-full max-w-sm flex items-center justify-center gap-3">
                    {/* 원본 이미지 */}
                    <div className="flex-1">
                        <div className="text-xs text-center text-slate-500 mb-2 font-medium">원본</div>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100">
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    alt="원본 이미지"
                                    width={150}
                                    height={200}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    </div>

                    {/* 화살표 */}
                    <div className="flex flex-col items-center">
                        <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <ArrowRight size={24} className="text-[#d4af37]" />
                        </motion.div>
                    </div>

                    {/* 변환된 이미지 */}
                    <div className="flex-1">
                        <div className="text-xs text-center text-slate-500 mb-2 font-medium">
                            {hasTransformed ? "변환 완료" : "변환 후"}
                        </div>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-[#d4af37] bg-gradient-to-br from-[#f8f4e8] to-[#fff8dc]">
                            <AnimatePresence mode="wait">
                                {isTransforming ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="w-full h-full flex flex-col items-center justify-center"
                                    >
                                        <Loader2 size={32} className="text-[#1e3a5f] animate-spin mb-2" />
                                        <span className="text-xs text-slate-500">변환 중...</span>
                                    </motion.div>
                                ) : hasTransformed ? (
                                    <motion.div
                                        key="transformed"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full h-full"
                                    >
                                        <Image
                                            src={transformedImagePreview}
                                            alt="변환된 이미지"
                                            width={150}
                                            height={200}
                                            className="w-full h-full object-cover"
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="placeholder"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="w-full h-full flex flex-col items-center justify-center"
                                    >
                                        <ImageIcon size={32} className="text-[#d4af37]/50 mb-2" />
                                        <span className="text-xs text-slate-400">미리보기</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 안내 메시지 */}
                <div className="w-full max-w-sm p-3 rounded-xl bg-gradient-to-br from-[#f8f4e8] to-[#fff8dc] border border-[#d4af37]/20">
                    <div className="flex items-start gap-2">
                        <Sparkles size={16} className="text-[#d4af37] flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600">
                            <p className="font-semibold mb-1">AI 이미지 변환</p>
                            <p className="text-slate-500">
                                업로드한 사진을 졸업사진 스타일로 변환합니다.
                                원본 사진으로 진행해도 분석 결과는 동일해요!
                            </p>
                        </div>
                    </div>
                </div>

                {/* 버튼들 */}
                <div className="w-full max-w-sm space-y-2">
                    {!hasTransformed ? (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleTransformImage}
                                disabled={isTransforming || isSubmitting}
                                className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: GRADUATION_THEME.primary }}
                            >
                                {isTransforming ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>변환 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>졸업사진 스타일로 변환</span>
                                    </>
                                )}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    skipTransform()
                                    handleComplete()
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-xl font-medium text-slate-600 border-2 border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                원본으로 분석 시작
                            </motion.button>
                        </>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleComplete}
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: GRADUATION_THEME.secondary }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>분석 중...</span>
                                </>
                            ) : (
                                <>
                                    <span>🎓</span>
                                    <span>향수 분석 시작!</span>
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
