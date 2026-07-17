"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Sparkles, X, Image as ImageIcon, Loader2, AlertTriangle, Palette, MessageSquare } from "lucide-react"
import { useTranslations } from "next-intl"
import { StepHeader } from "./StepHeader"
import type { Step5Props } from "../types"

export function Step5({
    imagePreview,
    showImageGuide,
    setShowImageGuide,
    handleImageUpload,
    removeImage,
    isIdol,
    isCompressing = false,
    // 피규어 온라인 모드 전용
    isFigureOnline = false,
    modelingImagePreview,
    modelingRequest = "",
    setModelingRequest,
    handleModelingImageUpload,
    removeModelingImage,
    isModelingCompressing = false
}: Step5Props) {
    const t = useTranslations()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const modelingFileInputRef = useRef<HTMLInputElement>(null)
    const [showModelingWarning, setShowModelingWarning] = useState(false)

    // 피규어 온라인 모드: 컴팩트 레이아웃 (한 화면에 모두 표시)
    if (isFigureOnline) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="h-full lg:h-auto px-2 pt-1 pb-2 flex flex-col"
            >
                <StepHeader
                    title={t('input.step5.title')}
                    step={5}
                    description={t('input.step5.figureDesc')}
                />

                <div className="flex-1 mt-3 space-y-3">
                    {/* ===== 2열 그리드: AI 이미지 + 모델링 이미지 ===== */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* ===== AI 향 추천용 이미지 ===== */}
                        <div className="bg-[#12141D]/80 backdrop-blur-md rounded-[12px] p-3 border border-[#262A38] shadow-md">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 rounded-full bg-[#151823] flex items-center justify-center">
                                    <Sparkles size={12} className="text-[#A69F8D]" />
                                </div>
                                <h3 className="text-sm lg:text-base font-bold text-[#E9E2D0]">{t('input.step5.aiRecommendation')}</h3>
                            </div>

                            {imagePreview ? (
                                <div className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#1B1F2C]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imagePreview}
                                        alt={t('input.step5.aiRecommendation')}
                                        className="w-full h-full object-cover"
                                    />
                                    {isCompressing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 size={16} className="animate-spin text-[#E9E2D0]" />
                                        </div>
                                    )}
                                    <button
                                        onClick={removeImage}
                                        disabled={isCompressing}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-[#E9E2D0] hover:bg-black/70 transition-colors disabled:opacity-50"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full aspect-square rounded-[12px] border-2 border-dashed border-[#262A38] bg-[#0C0E16]/50 hover:bg-[#0C0E16] hover:border-[#343A4C] transition-all flex flex-col items-center justify-center gap-1 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#151823] group-hover:bg-[#232838] flex items-center justify-center transition-colors">
                                        <ImageIcon size={14} className="text-[#A69F8D]" />
                                    </div>
                                    <span className="text-[10px] lg:text-[12px] font-medium text-[#8B8578]">{t('input.step5.upload')}</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        {/* ===== 3D 모델링용 이미지 ===== */}
                        <div className="bg-[#12141D]/80 backdrop-blur-md rounded-[12px] p-3 border border-[#262A38] shadow-md">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 rounded-full bg-[#151823] flex items-center justify-center">
                                    <Palette size={12} className="text-[#A69F8D]" />
                                </div>
                                <h3 className="text-sm lg:text-base font-bold text-[#E9E2D0]">{t('input.step5.modeling3d')}</h3>
                            </div>

                            {modelingImagePreview ? (
                                <div className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#1B1F2C]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={modelingImagePreview}
                                        alt={t('input.step5.modeling3d')}
                                        className="w-full h-full object-cover"
                                    />
                                    {isModelingCompressing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 size={16} className="animate-spin text-[#E9E2D0]" />
                                        </div>
                                    )}
                                    <button
                                        onClick={removeModelingImage}
                                        disabled={isModelingCompressing}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-[#E9E2D0] hover:bg-black/70 transition-colors disabled:opacity-50"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowModelingWarning(true)}
                                    className="w-full aspect-square rounded-[12px] border-2 border-dashed border-[#262A38] bg-[#0C0E16]/50 hover:bg-[#0C0E16] hover:border-[#343A4C] transition-all flex flex-col items-center justify-center gap-1 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#151823] group-hover:bg-[#232838] flex items-center justify-center transition-colors">
                                        <ImageIcon size={14} className="text-[#A69F8D]" />
                                    </div>
                                    <span className="text-[10px] lg:text-[12px] font-medium text-[#8B8578]">{t('input.step5.upload')}</span>
                                </button>
                            )}
                            <input
                                ref={modelingFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleModelingImageUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* ===== 모델링 요청사항 (3D 모델링 섹션에 통합) ===== */}
                    <div className="bg-[#12141D]/80 backdrop-blur-md rounded-[12px] p-3 border border-[#262A38] shadow-md">
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-6 h-6 rounded-full bg-[#1B1F2C] flex items-center justify-center">
                                <MessageSquare size={12} className="text-[#A69F8D]" />
                            </div>
                            <h3 className="text-xs lg:text-sm font-bold text-[#E9E2D0]">
                                {t('input.step5.modelingRequest')} <span className="text-[10px] lg:text-[12px] font-normal text-[#8B8578]">{t('input.step5.optional')}</span>
                            </h3>
                        </div>

                        <textarea
                            value={modelingRequest}
                            onChange={(e) => setModelingRequest?.(e.target.value)}
                            placeholder={t('input.step5.modelingPlaceholder')}
                            className="w-full h-16 px-2.5 py-2 text-xs lg:text-sm rounded-[12px] border border-[#262A38] bg-[#12141D]/50 focus:outline-none focus:ring-2 focus:ring-[#262A38] focus:border-transparent resize-none placeholder:text-[#8B8578]"
                            maxLength={200}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-[9px] text-[#8B8578]">{t('input.step5.modelingNote')}</p>
                            <span className="text-[9px] text-[#8B8578]">{modelingRequest.length}/200</span>
                        </div>
                    </div>
                </div>

                {/* ===== 모델링 이미지 주의사항 모달 (컴팩트) ===== */}
                <AnimatePresence>
                    {showModelingWarning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                            onClick={() => setShowModelingWarning(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#12141D] rounded-[12px] p-4 max-w-xs w-full shadow-2xl"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-[#151823] flex items-center justify-center">
                                        <AlertTriangle size={16} className="text-[#A69F8D]" />
                                    </div>
                                    <h3 className="text-sm lg:text-base font-bold text-[#E9E2D0]">{t('input.step5.modelingImageGuide')}</h3>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-start gap-2 p-2 bg-[#151823] rounded-[12px]">
                                        <span className="text-xs lg:text-sm">🎨</span>
                                        <p className="text-xs lg:text-sm text-[#A69F8D]">
                                            {t('input.step5.modelingWhite')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-[#151823] rounded-[12px]">
                                        <span className="text-xs lg:text-sm">✨</span>
                                        <p className="text-xs lg:text-sm text-[#A69F8D]">
                                            {t('input.step5.modelingSimplified')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-[#151823] rounded-[12px]">
                                        <span className="text-xs lg:text-sm">📸</span>
                                        <p className="text-xs lg:text-sm text-[#A69F8D]">
                                            {t('input.step5.modelingAngle')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowModelingWarning(false)}
                                        className="flex-1 py-2.5 rounded-[12px] border border-[#262A38] text-xs lg:text-sm font-medium text-[#A69F8D] hover:bg-[#151823] transition-colors"
                                    >
                                        {t('buttons.cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowModelingWarning(false)
                                            modelingFileInputRef.current?.click()
                                        }}
                                        className="flex-1 py-2.5 rounded-[12px] bg-[#161925] text-xs lg:text-sm font-bold text-[#E9E2D0] hover:bg-[#161925] transition-colors"
                                    >
                                        {t('buttons.confirm')}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )
    }

    // ===== 일반 모드 (기존 레이아웃) =====
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={isIdol ? t('input.step5.titleIdol') : t('input.step5.titlePersonal')}
                step={5}
                description={isIdol ? t('input.step5.descIdol') : t('input.step5.descPersonal')}
            />

            <div className="flex-1 mt-4 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {showImageGuide && !imagePreview ? (
                        <motion.div
                            key="guide"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-gradient-to-br from-[#0C0E16]/90 to-[#0C0E16]/90 backdrop-blur-md rounded-[12px] p-5 border border-[#262A38] shadow-lg shadow-stone-900/5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Camera size={18} className="text-[#A69F8D]" />
                                <span className="text-sm lg:text-base font-bold text-[#A69F8D]">{t('input.step5.imageGuide')}</span>
                            </div>
                            <p className="text-sm lg:text-base text-[#A69F8D] leading-relaxed mb-3">
                                {t('input.step5.imageRatioDesc')}
                            </p>
                            <p className="text-xs lg:text-sm text-[#8B8578] mb-3">
                                {t('input.step5.imageRatioHint')}
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-[#12141D] rounded-[12px] border border-[#262A38]">
                                <Sparkles size={14} className="text-[#8B8578] mt-0.5 flex-shrink-0" />
                                <p className="text-xs lg:text-sm text-[#A69F8D]">
                                    <span className="font-semibold">{t('input.step5.tip')}</span> {isIdol ? t('input.step5.tipIdol') : t('input.step5.tipPersonal')}
                                </p>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`${showImageGuide && !imagePreview ? "mt-4" : ""}`}
                >
                    {imagePreview ? (
                        <div className="space-y-3">
                            {!showImageGuide && (
                                <button
                                    onClick={() => setShowImageGuide(true)}
                                    className="text-xs lg:text-sm text-[#A69F8D] font-medium hover:underline"
                                >
                                    {t('input.step5.reviewGuide')}
                                </button>
                            )}
                            <div className="relative aspect-[5/6] max-h-[260px] w-full rounded-[12px] overflow-hidden bg-[#1B1F2C]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                {isCompressing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2 text-[#E9E2D0]">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-xs lg:text-sm">{t('input.step5.optimizing')}</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={removeImage}
                                    disabled={isCompressing}
                                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-[#E9E2D0] hover:bg-black/70 transition-colors disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-[11px] lg:text-[13px] text-[#8B8578] text-center">
                                {t('input.step5.autoOptimize')}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[5/6] max-h-[220px] rounded-[12px] border-2 border-dashed border-[#262A38] bg-[#12141D]/80 backdrop-blur-md shadow-lg shadow-stone-900/5 hover:bg-[#12141D]/90 hover:border-[#343A4C] transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#1B1F2C] group-hover:bg-[#151823] flex items-center justify-center transition-colors">
                                <ImageIcon size={24} className="text-[#8B8578] group-hover:text-[#A69F8D] transition-colors" />
                            </div>
                            <span className="text-sm lg:text-base font-medium text-[#8B8578] group-hover:text-[#A69F8D]">
                                {t('input.step5.uploadImage')}
                            </span>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </motion.div>
            </div>
        </motion.div>
    )
}
