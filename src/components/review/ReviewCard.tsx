"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star, ThumbsUp, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Review } from "@/lib/supabase/reviews"

interface ReviewCardProps {
  review: Review
  onLike?: (reviewId: string) => Promise<void>
  currentUserId?: string
}

export function ReviewCard({ review, onLike, currentUserId }: ReviewCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [localLiked, setLocalLiked] = useState(review.has_liked || false)
  const [localCount, setLocalCount] = useState(review.helpful_count)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleLike = async () => {
    if (!currentUserId || isLiking) return

    setIsLiking(true)
    try {
      // Optimistic update
      setLocalLiked(!localLiked)
      setLocalCount(prev => localLiked ? prev - 1 : prev + 1)

      await onLike?.(review.id)
    } catch {
      // Rollback on error
      setLocalLiked(localLiked)
      setLocalCount(review.helpful_count)
    } finally {
      setIsLiking(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const displayName = review.user_profile?.name || '익명'
  const maskedName = displayName.length > 2
    ? displayName[0] + '*'.repeat(displayName.length - 2) + displayName.slice(-1)
    : displayName[0] + '*'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-yellow-50 border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_black] hover:shadow-[4px_4px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
      >
        {/* 헤더: 별점 + 작성자 정보 */}
        <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={star <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-200"
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm flex-wrap">
              <span className="font-bold text-black">{maskedName}</span>
              {review.idol_name && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 truncate">{review.idol_name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] md:text-xs text-slate-400">{formatDate(review.created_at)}</span>
            {review.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] md:text-xs font-bold rounded-full">
                <CheckCircle2 size={10} />
                구매인증
              </span>
            )}
          </div>
        </div>

        {/* 옵션 정보 */}
        {review.option_info && (
          <div className="text-[10px] md:text-xs text-slate-500 mb-2 px-2 py-1 bg-white rounded-lg inline-block">
            {review.option_info}
          </div>
        )}

        {/* 리뷰 내용 */}
        {review.content && (
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            "{review.content}"
          </p>
        )}

        {/* 이미지 갤러리 */}
        {review.images.length > 0 && (
          <div className="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-1">
            {review.images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => {
                  setCurrentImageIndex(idx)
                  setShowImageModal(true)
                }}
                className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border-2 border-black shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black] transition-all"
              >
                <img
                  src={img.image_url}
                  alt={`리뷰 이미지 ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {review.images.length > 3 && (
              <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-black/50 flex items-center justify-center text-white font-bold text-sm md:text-lg">
                +{review.images.length - 3}
              </div>
            )}
          </div>
        )}

        {/* 도움돼요 버튼 */}
        <div className="flex items-center justify-between pt-3 border-t border-yellow-200">
          <button
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg transition-all ${
              localLiked
                ? 'bg-pink-100 text-pink-600 border border-pink-300'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
            } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp size={12} className={localLiked ? 'fill-current' : ''} />
            <span className="text-xs md:text-sm font-medium">
              도움돼요 {localCount > 0 && localCount}
            </span>
          </button>

          {!currentUserId && (
            <span className="text-[10px] md:text-xs text-slate-400">로그인 후 좋아요</span>
          )}
        </div>
      </motion.div>

      {/* 이미지 확대 모달 */}
      {showImageModal && review.images.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-yellow-400 transition-colors"
          >
            <X size={32} />
          </button>

          {/* 이미지 */}
          <div
            className="relative max-w-4xl max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={review.images[currentImageIndex].image_url}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />

            {/* 네비게이션 */}
            {review.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : review.images.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors"
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev < review.images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors"
                >
                  <ChevronRight size={24} className="text-white" />
                </button>

                {/* 인디케이터 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {review.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
