"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, ArrowRight, ImageIcon } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
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
    const t = useTranslations('graduationInput')
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
                title={t('step6.title')}
                step={6}
                description={t('step6.description')}
            />

            <div className="flex-1 flex flex-col items-center justify-center mt-4 space-y-4">
                {/* 이미지 비교 */}
                <div className="w-full max-w-sm flex items-center justify-center gap-3">
                    {/* 원본 이미지 */}
                    <div className="flex-1">
                        <div className="text-xs text-center text-slate-500 mb-2 font-medium">{t('step6.original')}</div>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100">
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    alt={t('step6.originalAlt')}
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
                            {hasTransformed ? t('step6.transformComplete') : t('step6.afterTransform')}
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
                                        <span className="text-xs text-slate-500">{t('step6.transforming')}</span>
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
                                            alt={t('step6.transformedAlt')}
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
                                        <span className="text-xs text-slate-400">{t('step6.preview')}</span>
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
                            <p className="font-semibold mb-1">{t('step6.aiTransformTitle')}</p>
                            <p className="text-slate-500">
                                {t('step6.aiTransformDesc')}
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
                                        <span>{t('step6.transforming')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>{t('step6.transformButton')}</span>
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
                                {t('step6.startWithOriginal')}
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
                                    <span>{t('nav.analyzing')}</span>
                                </>
                            ) : (
                                <>
                                    <span>🎓</span>
                                    <span>{t('step6.startAnalysis')}</span>
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
