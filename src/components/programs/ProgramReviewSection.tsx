"use client"

import { useState, useEffect } from "react"
import { PenLine } from "lucide-react"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useTranslations } from "next-intl"

type ProgramType = 'idol_image' | 'personal' | 'figure' | 'graduation' | 'le-quack' | 'chemistry_set'

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
      <section id="reviews" className="py-8 px-4 bg-white">
        <div className="w-full">
          <div className="text-center mb-4">
            <div className="inline-block px-3 py-1.5 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              {t('programs.reviews.badge')}
            </div>
            <h2 className="text-2xl font-black text-black mb-2 break-keep">
              {t('programs.reviews.title')}
            </h2>
            <button
              onClick={() => setShowReviewModal(true)}
              className="text-xs text-slate-500 hover:text-black transition-colors underline underline-offset-4"
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
              className="w-full py-3 bg-yellow-400 text-black text-sm font-black rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:shadow-[4px_4px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <PenLine size={16} />
              리뷰 작성하기
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
