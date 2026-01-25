"use client"

import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Sparkles, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { StepHeader } from "./StepHeader"
import type { Step5Props } from "../types"

export function Step5({
    imagePreview,
    showImageGuide,
    setShowImageGuide,
    handleImageUpload,
    removeImage,
    isIdol,
    isCompressing = false
}: Step5Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full lg:h-auto px-2 pt-2 pb-4 flex flex-col"
        >
            <StepHeader
                title={`${isIdol ? "최애" : "나"} 이미지`}
                step={5}
                description={`${isIdol ? "최애" : "본인"}의 이미지를 업로드해주세요. 향수 추천에 활용됩니다.`}
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
                                <span className="text-sm font-bold text-yellow-700">이미지 비율 안내</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                <span className="font-semibold text-yellow-700">5:6 비율</span>의 세로로 조금 긴 이미지를
                                업로드해주시면 가장 좋은 결과를 얻을 수 있어요!
                            </p>
                            <p className="text-xs text-slate-500 mb-3">
                                (예: 500×600px, 400×480px 등)
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/60">
                                <Sparkles size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600">
                                    <span className="font-semibold">팁:</span> {isIdol ? "최애" : "본인"}가 잘 보이는 고화질 사진을
                                    선택하시면 더 정확한 분석이 가능해요!
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
                                    다시 안내보기
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
                                            <span className="text-xs">이미지 최적화 중...</span>
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
                                * 이미지가 자동으로 최적화됩니다 (최대 800px, 품질 80%)
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
                                이미지 업로드하기
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
