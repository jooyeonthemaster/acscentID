"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star, ThumbsUp, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Review } from "@/lib/supabase/reviews"

interface ReviewCardProps {
  review: Review
  onLike?: (reviewId: string) => Promise<void>
  currentUserId?: string
}

export function ReviewCard({ review, onLike, currentUserId }: ReviewCardProps) {
  const t = useTranslations()
  const locale = useLocale()
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
    const dateLocale = {
      ko: 'ko-KR',
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN',
      es: 'es-ES',
    }[locale] || locale
    return date.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // admin_name이 있으면 우선 사용 (관리자 삽입 리뷰)
  const displayName = review.admin_name || review.user_profile?.name || t('review.anonymous')
  const maskedName = displayName.length <= 1
    ? displayName
    : displayName.length === 2
      ? displayName[0] + '*'
      : displayName[0] + '*'.repeat(displayName.length - 2) + displayName.slice(-1)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FDFAF1] border-2 border-[#D8CFBB] rounded-[12px] p-4 transition-all"
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
                    ? "fill-[#1A1610] text-[#1A1610]"
                    : "text-[#5C564A]"
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs lg:text-sm md:text-sm flex-wrap">
              <span className="font-bold text-[#1A1610]">{maskedName}</span>
              {review.idol_name && (
                <>
                  <span className="text-[#5C564A]">|</span>
                  <span className="text-[#8B8578] truncate">{review.idol_name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] lg:text-[12px] md:text-xs text-[#8B8578]">{formatDate(review.created_at)}</span>
            {review.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#EDE5D2] text-[#5C564A] text-[10px] lg:text-[12px] md:text-xs font-bold rounded-full">
                <CheckCircle2 size={10} />
                {t('review.verified')}
              </span>
            )}
          </div>
        </div>

        {/* 옵션 정보 */}
        {review.option_info && (
          <div className="text-[10px] lg:text-[12px] md:text-xs text-[#8B8578] mb-2 px-2 py-1 bg-[#F5EFE2] rounded-[12px] inline-block">
            {review.option_info}
          </div>
        )}

        {/* 리뷰 내용 */}
        {review.content && (
          <p className="text-sm lg:text-base text-[#5C564A] leading-relaxed mb-3">
            &ldquo;{review.content}&rdquo;
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
                className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[12px] md:rounded-[12px] overflow-hidden border-2 border-[#D8CFBB] transition-all"
              >
                <img
                  src={img.image_url}
                  alt={t('review.reviewImageAlt', { index: idx + 1 })}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {review.images.length > 3 && (
              <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[12px] md:rounded-[12px] bg-black/50 flex items-center justify-center text-[#1A1610] font-bold text-sm lg:text-base md:text-lg">
                +{review.images.length - 3}
              </div>
            )}
          </div>
        )}

        {/* 도움돼요 버튼 */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D8CFBB]">
          <button
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-[12px] transition-all ${
              localLiked
                ? 'bg-[#EDE5D2] text-[#5C564A] border border-[#D8CFBB]'
                : 'bg-[#F5EFE2] text-[#5C564A] border border-[#D8CFBB] hover:border-[#C9BFA8]'
            } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp size={12} className={localLiked ? 'fill-current' : ''} />
            <span className="text-xs lg:text-sm md:text-sm font-medium">
              {t('review.helpful')} {localCount > 0 && localCount}
            </span>
          </button>

          {!currentUserId && (
            <span className="text-[10px] lg:text-[12px] md:text-xs text-[#8B8578]">{t('review.loginToLike')}</span>
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
            className="absolute top-4 right-4 p-2 text-[#1A1610] hover:text-[#8B8578] transition-colors"
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
              className="max-w-full max-h-[80vh] object-contain rounded-[12px]"
            />

            {/* 네비게이션 */}
            {review.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : review.images.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors"
                >
                  <ChevronLeft size={24} className="text-[#1A1610]" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev < review.images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors"
                >
                  <ChevronRight size={24} className="text-[#1A1610]" />
                </button>

                {/* 인디케이터 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {review.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-[#F5EFE2] w-6' : 'bg-[#F5EFE2]/50'
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
