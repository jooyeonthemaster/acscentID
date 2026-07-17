"use client"

import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, X, Loader2, ImageIcon } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { StepHeader } from "../../components/StepHeader"
import { GRADUATION_THEME } from "../constants"

interface GraduationStep5Props {
    imagePreview: string | null
    showImageGuide: boolean
    isCompressing: boolean
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    removeImage: () => void
    setShowImageGuide: (show: boolean) => void
}

export function GraduationStep5({
    imagePreview,
    showImageGuide,
    isCompressing,
    handleImageUpload,
    removeImage,
    setShowImageGuide
}: GraduationStep5Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const t = useTranslations('graduationInput')

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={t('step5.title')}
                step={5}
                description={t('step5.description')}
            />

            <div className="flex-1 flex flex-col items-center justify-center mt-4">
                <AnimatePresence mode="wait">
                    {!imagePreview ? (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-xs"
                        >
                            {/* 가이드 메시지 */}
                            {showImageGuide && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 p-3 rounded-[12px] bg-gradient-to-br from-[#f8f4e8] to-[#151823] border-2 border-[#B3B3B3]/30"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">💡</span>
                                        <div className="text-xs lg:text-sm text-[#A69F8D]">
                                            <p className="font-semibold mb-1">{t('step5.guideTitle')}</p>
                                            <ul className="space-y-0.5 text-[#8B8578]">
                                                <li>• {t('step5.guideItem1')}</li>
                                                <li>• {t('step5.guideItem2')}</li>
                                                <li>• {t('step5.guideItem3')}</li>
                                            </ul>
                                        </div>
                                        <button
                                            onClick={() => setShowImageGuide(false)}
                                            className="text-[#8B8578] hover:text-[#A69F8D]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* 업로드 버튼 */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => inputRef.current?.click()}
                                disabled={isCompressing}
                                className="w-full aspect-[4/5] rounded-[12px] border-2 border-dashed border-[#393939]/30 bg-[#12141D]/60 backdrop-blur-md flex flex-col items-center justify-center gap-3 transition-all hover:border-[#393939]/50 hover:bg-[#12141D]/80 disabled:opacity-50"
                            >
                                {isCompressing ? (
                                    <>
                                        <Loader2 size={40} className="text-[#393939] animate-spin" />
                                        <span className="text-sm lg:text-base text-[#8B8578]">{t('step5.processing')}</span>
                                    </>
                                ) : (
                                    <>
                                        <div
                                            className="w-16 h-16 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: GRADUATION_THEME.primary }}
                                        >
                                            <Camera size={28} className="text-[#E9E2D0]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm lg:text-base font-semibold text-[#A69F8D]">
                                                {t('step5.uploadButton')}
                                            </p>
                                            <p className="text-xs lg:text-sm text-[#8B8578] mt-1">
                                                {t('step5.uploadHint')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </motion.button>

                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-xs"
                        >
                            {/* 이미지 미리보기 */}
                            <div className="relative aspect-[4/5] rounded-[12px] overflow-hidden border-2 border-[#B3B3B3] shadow-lg">
                                <Image
                                    src={imagePreview}
                                    alt={t('step5.uploadedAlt')}
                                    fill
                                    className="object-cover"
                                />
                                {/* 삭제 버튼 */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={removeImage}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500 text-[#E9E2D0] flex items-center justify-center shadow-lg"
                                >
                                    <X size={18} />
                                </motion.button>
                                {/* 성공 배지 */}
                                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-[12px] bg-[#393939] text-[#E9E2D0] text-xs lg:text-sm font-semibold flex items-center gap-1.5">
                                    <ImageIcon size={14} />
                                    <span>{t('step5.uploadComplete')}</span>
                                </div>
                            </div>

                            {/* 다시 선택 버튼 */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => inputRef.current?.click()}
                                className="w-full mt-3 py-2.5 rounded-[12px] border-2 border-[#262A38] bg-[#12141D]/80 text-sm lg:text-base font-medium text-[#A69F8D] hover:bg-[#12141D] hover:border-[#262A38] transition-all"
                            >
                                {t('step5.selectOther')}
                            </motion.button>

                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
