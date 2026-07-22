"use client"

import { useState, useEffect } from "react"
import { PenLine } from "lucide-react"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useTranslations } from "next-intl"

type ProgramType = 'idol_image' | 'personal' | 'figure' | 'graduation' | 'le-quack' | 'chemistry_set' | 'saju_perfume'

interface ProgramReviewSectionProps {
  programType: ProgramType
  programName: string
  currentUserId?: string
  isLoggedIn: boolean
  onLoginRequired: () => void
}

export function ProgramReviewSection({
  programType,
  programName,
  currentUserId,
  isLoggedIn,
  onLoginRequired,
}: ProgramReviewSectionProps) {
  const t = useTranslations()
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReviewWriteModal, setShowReviewWriteModal] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null)

  useEffect(() => {
    const loadReviewStats = async () => {
      try {
        const stats = await getReviewStats(programType)
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [programType])

  return (
    <>
      {/* 리뷰 트리거 (히어로에서 사용할 수 있도록 export) */}

      {/* 리뷰 섹션 */}
      <section id="reviews" className="py-8 px-4 bg-[var(--soft)]">
        <div className="w-full">
          <div className="text-center mb-4">
            <div className="inline-block px-3 py-1.5 bg-[var(--ink)] text-white text-xs lg:text-sm font-black rounded-full border border-[var(--line)] mb-3">
              {t('programs.reviews.badge')}
            </div>
            <h2 className="text-2xl font-black text-[var(--ink)] mb-2 break-keep">
              {t('programs.reviews.title')}
            </h2>
            <button
              onClick={() => setShowReviewModal(true)}
              className="text-xs lg:text-sm text-[var(--muted-ink)] hover:text-[var(--ink)] transition-colors underline underline-offset-4"
            >
              {t('programs.reviews.viewAll')}
            </button>
          </div>

          {/* 리뷰 통계 */}
          {reviewStats && (
            <div className="mb-4">
              <ReviewStats
                stats={reviewStats}
                onRatingFilter={setReviewRatingFilter}
                selectedRating={reviewRatingFilter}
              />
            </div>
          )}

          {/* 리뷰 작성 버튼 */}
          <div className="mb-4">
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onLoginRequired()
                } else {
                  setShowReviewModal(true)
                }
              }}
              className="w-full py-3 bg-[var(--paper)] text-[var(--ink)] text-sm lg:text-base font-black rounded-[6px] border border-[var(--line)] transition-all flex items-center justify-center gap-2"
            >
              <PenLine size={16} />
              {t('review.writeButton')}
            </button>
          </div>

          {/* 리뷰 목록 */}
          <div>
            <ReviewList
              programType={programType}
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </div>
        </div>
      </section>

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType={programType}
        programName={programName}
        currentUserId={currentUserId}
        onWriteReview={() => {
          setShowReviewModal(false)
          setShowReviewWriteModal(true)
        }}
      />

      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={showReviewWriteModal}
        onClose={() => setShowReviewWriteModal(false)}
        programType={programType}
        programName={programName}
        userId={currentUserId || ''}
        onSuccess={() => {
          getReviewStats(programType).then(setReviewStats)
        }}
      />
    </>
  )
}

/**
 * ReviewTrigger를 외부에서 사용하기 위해 re-export
 */
export { ReviewTrigger } from "@/components/review"
