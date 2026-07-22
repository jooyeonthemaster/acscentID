"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Loader2, PenLine } from "lucide-react"
import { useTranslations } from "next-intl"
import { ReviewStats } from "./ReviewStats"
import { ReviewList } from "./ReviewList"
import { getReviewStats, checkPurchase } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  programType: 'idol_image' | 'personal' | 'figure' | 'graduation' | 'le-quack' | 'chemistry_set' | 'saju_perfume'
  programName: string
  currentUserId?: string
  onWriteReview?: () => void
}

export function ReviewModal({
  isOpen,
  onClose,
  programType,
  programName,
  currentUserId,
  onWriteReview
}: ReviewModalProps) {
  const t = useTranslations()
  const [stats, setStats] = useState<ReviewStatsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [canWriteReview, setCanWriteReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsData, purchaseData] = await Promise.all([
        getReviewStats(programType),
        currentUserId ? checkPurchase(currentUserId, programType) : null
      ])

      setStats(statsData)

      if (purchaseData) {
        setCanWriteReview(purchaseData.canReview && !purchaseData.hasReviewed)
        setHasReviewed(purchaseData.hasReviewed)
      }
    } catch (error) {
      console.error('Failed to load review data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, programType])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      loadData()
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, loadData])

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
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 bottom-0 top-16 z-[60] overflow-hidden md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-4xl md:max-h-[85vh] md:w-[95vw]"
          >
            <div className="h-full bg-[var(--soft)] rounded-t-[6px] md:rounded-[6px] border-t-2 md:border border-[var(--line)] shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b-2 border-[var(--line)] bg-[var(--soft)] rounded-t-[6px] md:rounded-t-[6px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
	                    <h2 className="text-lg md:text-xl font-black text-[var(--ink)]">{t('review.totalReview')}</h2>
                    <p className="text-xs lg:text-sm md:text-sm text-[var(--muted-ink)] truncate">{programName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* 리뷰 작성 버튼 */}
                    {currentUserId && (
                      <button
                        onClick={() => {
                          if (canWriteReview) {
                            onWriteReview?.()
                          } else if (hasReviewed) {
	                            alert(t('review.alreadyReviewedAlert'))
	                          } else {
	                            alert(t('review.purchaseRequiredAlert'))
	                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-[6px] font-bold text-xs lg:text-sm md:text-sm border border-[var(--line)] transition-all ${
                          canWriteReview
                            ? 'bg-[var(--paper)] text-[var(--ink)]'
                            : 'bg-[var(--soft)] text-[var(--ink)]'
                        }`}
                      >
                        <PenLine size={14} />
	                        <span className="hidden sm:inline">{t('review.writeButton')}</span>
                      </button>
                    )}

                    <button
                      onClick={onClose}
                      className="p-1.5 md:p-2 hover:bg-[var(--soft)] rounded-full transition-colors"
                    >
                      <X size={20} className="md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 md:pb-6 space-y-6 md:space-y-8">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-[var(--muted-ink)]" />
                  </div>
                ) : (
                  <>
                    {/* 리뷰 통계 */}
                    {stats && (
                      <ReviewStats
                        stats={stats}
                        onRatingFilter={setRatingFilter}
                        selectedRating={ratingFilter}
                      />
                    )}

                    {/* 리뷰 목록 */}
                    <ReviewList
                      programType={programType}
                      currentUserId={currentUserId}
                      ratingFilter={ratingFilter}
                      onRatingFilterChange={setRatingFilter}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * 상품 페이지에서 사용하는 별점 클릭 트리거 컴포넌트
 */
interface ReviewTriggerProps {
  averageRating: number
  totalCount: number
  onClick: () => void
}

export function ReviewTrigger({ averageRating, totalCount, onClick }: ReviewTriggerProps) {
  const t = useTranslations()
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={star <= Math.round(averageRating)
              ? "fill-[var(--ink)] text-[var(--ink)]"
              : "text-[var(--muted-ink)]"
            }
          />
        ))}
      </div>
      <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors">
        {averageRating.toFixed(1)} ({totalCount.toLocaleString()})
      </span>
      <span className="text-xs lg:text-sm text-[var(--muted-ink)] group-hover:text-[var(--muted-ink)]">
        {t('review.viewReviews')}
      </span>
    </button>
  )
}
