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
                        <div className="text-xs lg:text-sm text-center text-[#8B8578] mb-2 font-medium">{t('step6.original')}</div>
                        <div className="aspect-[3/4] rounded-[12px] overflow-hidden border-2 border-[#262A38] bg-[#1B1F2C]">
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
                            <ArrowRight size={24} className="text-[#B3B3B3]" />
                        </motion.div>
                    </div>

                    {/* 변환된 이미지 */}
                    <div className="flex-1">
                        <div className="text-xs lg:text-sm text-center text-[#8B8578] mb-2 font-medium">
                            {hasTransformed ? t('step6.transformComplete') : t('step6.afterTransform')}
                        </div>
                        <div className="aspect-[3/4] rounded-[12px] overflow-hidden border-2 border-[#B3B3B3] bg-gradient-to-br from-[#f8f4e8] to-[#151823]">
                            <AnimatePresence mode="wait">
                                {isTransforming ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="w-full h-full flex flex-col items-center justify-center"
                                    >
                                        <Loader2 size={32} className="text-[#393939] animate-spin mb-2" />
                                        <span className="text-xs lg:text-sm text-[#8B8578]">{t('step6.transforming')}</span>
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
                                        <ImageIcon size={32} className="text-[#B3B3B3]/50 mb-2" />
                                        <span className="text-xs lg:text-sm text-[#8B8578]">{t('step6.preview')}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 안내 메시지 */}
                <div className="w-full max-w-sm p-3 rounded-[12px] bg-gradient-to-br from-[#f8f4e8] to-[#151823] border border-[#B3B3B3]/20">
                    <div className="flex items-start gap-2">
                        <Sparkles size={16} className="text-[#B3B3B3] flex-shrink-0 mt-0.5" />
                        <div className="text-xs lg:text-sm text-[#A69F8D]">
                            <p className="font-semibold mb-1">{t('step6.aiTransformTitle')}</p>
                            <p className="text-[#8B8578]">
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
                                className="w-full py-3.5 rounded-[12px] font-bold text-[#E9E2D0] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
                                className="w-full py-3 rounded-[12px] font-medium text-[#A69F8D] border-2 border-[#262A38] bg-[#12141D] hover:bg-[#151823] transition-all disabled:opacity-50"
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
                            className="w-full py-3.5 rounded-[12px] font-bold text-[#E9E2D0] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
