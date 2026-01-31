"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Camera, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { createReview } from "@/lib/supabase/reviews"
import type { CreateReviewInput } from "@/lib/supabase/reviews"

interface ReviewWriteModalProps {
  isOpen: boolean
  onClose: () => void
  programType: 'idol_image' | 'personal' | 'figure' | 'graduation' | 'le-quack'
  programName: string
  userId: string
  orderId?: string
  optionInfo?: string
  idolName?: string
  onSuccess?: () => void
}

const MAX_IMAGES = 5
const MAX_CONTENT_LENGTH = 500

export function ReviewWriteModal({
  isOpen,
  onClose,
  programType,
  programName,
  userId,
  orderId,
  optionInfo,
  idolName,
  onSuccess
}: ReviewWriteModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요`)
      return
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있어요')
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('10MB 이하의 이미지만 업로드할 수 있어요')
        return false
      }
      return true
    })

    setImages(prev => [...prev, ...validFiles])

    // 미리보기 생성
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('별점을 선택해주세요')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const input: CreateReviewInput = {
        program_type: programType,
        order_id: orderId,
        rating,
        content: content.trim() || undefined,
        idol_name: idolName,
        option_info: optionInfo,
        images: images.length > 0 ? images : undefined
      }

      await createReview(userId, input)

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
        resetForm()
      }, 1500)
    } catch (err) {
      console.error('Failed to submit review:', err)
      setError('리뷰 작성에 실패했어요. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setRating(0)
    setContent("")
    setImages([])
    setPreviews([])
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const ratingLabels = ['', '별로예요', '그냥 그래요', '괜찮아요', '좋아요', '최고예요!']

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto"
          >
            <div className="bg-[#FFFDF5] rounded-3xl border-2 border-black shadow-[8px_8px_0_0_black] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b-2 border-black bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">리뷰 작성</h2>
                    <p className="text-sm text-slate-500">{programName}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              {success ? (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 mx-auto mb-4 bg-green-400 rounded-full flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_black]"
                  >
                    <CheckCircle size={40} className="text-white" />
                  </motion.div>
                  <h3 className="text-xl font-black text-black mb-2">리뷰 작성 완료!</h3>
                  <p className="text-slate-600">소중한 리뷰 감사합니다</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* 주문 정보 */}
                  {(optionInfo || idolName) && (
                    <div className="px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-600">
                      {idolName && <span className="font-bold text-black">{idolName}</span>}
                      {idolName && optionInfo && <span className="mx-2">·</span>}
                      {optionInfo && <span>{optionInfo}</span>}
                    </div>
                  )}

                  {/* 별점 선택 */}
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 mb-3">퍼퓸이 어떠셨나요?</p>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={36}
                            className={`transition-colors ${
                              star <= (hoverRating || rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-2 h-5">
                      {ratingLabels[hoverRating || rating]}
                    </p>
                  </div>

                  {/* 리뷰 내용 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      리뷰 작성 (선택)
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                      placeholder="이 향기가 어떠셨나요? 솔직한 후기를 남겨주세요!"
                      className="w-full h-28 px-4 py-3 bg-white border-2 border-black rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                    />
                    <p className="text-xs text-slate-400 text-right mt-1">
                      {content.length}/{MAX_CONTENT_LENGTH}
                    </p>
                  </div>

                  {/* 이미지 첨부 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      사진 첨부 (선택, 최대 {MAX_IMAGES}장)
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {/* 미리보기 */}
                      {previews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-black shadow-[2px_2px_0_0_black]"
                        >
                          <img
                            src={preview}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-black"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}

                      {/* 추가 버튼 */}
                      {images.length < MAX_IMAGES && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-colors"
                        >
                          <Camera size={24} />
                          <span className="text-xs mt-1">{images.length}/{MAX_IMAGES}</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* 에러 메시지 */}
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  {/* 제출 버튼 */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                    className="w-full py-4 bg-yellow-400 text-black font-black text-lg rounded-2xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        리뷰 등록 중...
                      </>
                    ) : (
                      '리뷰 등록하기'
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
