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
                        <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Sparkles size={12} className="text-yellow-600" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">{t('input.step5.aiRecommendation')}</h3>
                            </div>

                            {imagePreview ? (
                                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imagePreview}
                                        alt={t('input.step5.aiRecommendation')}
                                        className="w-full h-full object-cover"
                                    />
                                    {isCompressing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 size={16} className="animate-spin text-white" />
                                        </div>
                                    )}
                                    <button
                                        onClick={removeImage}
                                        disabled={isCompressing}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full aspect-square rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50/50 hover:bg-yellow-50 hover:border-yellow-400 transition-all flex flex-col items-center justify-center gap-1 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 group-hover:bg-yellow-200 flex items-center justify-center transition-colors">
                                        <ImageIcon size={14} className="text-yellow-600" />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-500">{t('input.step5.upload')}</span>
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
                        <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Palette size={12} className="text-blue-600" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">{t('input.step5.modeling3d')}</h3>
                            </div>

                            {modelingImagePreview ? (
                                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={modelingImagePreview}
                                        alt={t('input.step5.modeling3d')}
                                        className="w-full h-full object-cover"
                                    />
                                    {isModelingCompressing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 size={16} className="animate-spin text-white" />
                                        </div>
                                    )}
                                    <button
                                        onClick={removeModelingImage}
                                        disabled={isModelingCompressing}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowModelingWarning(true)}
                                    className="w-full aspect-square rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition-all flex flex-col items-center justify-center gap-1 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                                        <ImageIcon size={14} className="text-blue-600" />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-500">{t('input.step5.upload')}</span>
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
                    <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md">
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <MessageSquare size={12} className="text-slate-600" />
                            </div>
                            <h3 className="text-xs font-bold text-slate-800">
                                {t('input.step5.modelingRequest')} <span className="text-[10px] font-normal text-slate-400">{t('input.step5.optional')}</span>
                            </h3>
                        </div>

                        <textarea
                            value={modelingRequest}
                            onChange={(e) => setModelingRequest?.(e.target.value)}
                            placeholder={t('input.step5.modelingPlaceholder')}
                            className="w-full h-16 px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent resize-none placeholder:text-slate-400"
                            maxLength={200}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-[9px] text-slate-400">{t('input.step5.modelingNote')}</p>
                            <span className="text-[9px] text-slate-400">{modelingRequest.length}/200</span>
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
                                className="bg-white rounded-xl p-4 max-w-xs w-full shadow-2xl"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                        <AlertTriangle size={16} className="text-amber-600" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">{t('input.step5.modelingImageGuide')}</h3>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                                        <span className="text-xs">🎨</span>
                                        <p className="text-xs text-slate-600">
                                            {t('input.step5.modelingWhite')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                                        <span className="text-xs">✨</span>
                                        <p className="text-xs text-slate-600">
                                            {t('input.step5.modelingSimplified')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                                        <span className="text-xs">📸</span>
                                        <p className="text-xs text-slate-600">
                                            {t('input.step5.modelingAngle')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowModelingWarning(false)}
                                        className="flex-1 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        {t('buttons.cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowModelingWarning(false)
                                            modelingFileInputRef.current?.click()
                                        }}
                                        className="flex-1 py-2.5 rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
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
                            className="bg-gradient-to-br from-yellow-50/90 to-orange-50/90 backdrop-blur-md rounded-2xl p-5 border border-yellow-200 shadow-lg shadow-slate-900/5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Camera size={18} className="text-yellow-600" />
                                <span className="text-sm font-bold text-yellow-700">{t('input.step5.imageGuide')}</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                {t('input.step5.imageRatioDesc')}
                            </p>
                            <p className="text-xs text-slate-500 mb-3">
                                {t('input.step5.imageRatioHint')}
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/60">
                                <Sparkles size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600">
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
                                    className="text-xs text-yellow-600 font-medium hover:underline"
                                >
                                    {t('input.step5.reviewGuide')}
                                </button>
                            )}
                            <div className="relative aspect-[5/6] max-h-[260px] w-full rounded-2xl overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                {isCompressing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2 text-white">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-xs">{t('input.step5.optimizing')}</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={removeImage}
                                    disabled={isCompressing}
                                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 text-center">
                                {t('input.step5.autoOptimize')}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[5/6] max-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 bg-white/80 backdrop-blur-md shadow-lg shadow-slate-900/5 hover:bg-white/90 hover:border-yellow-400 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-yellow-100 flex items-center justify-center transition-colors">
                                <ImageIcon size={24} className="text-slate-400 group-hover:text-yellow-600 transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">
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
