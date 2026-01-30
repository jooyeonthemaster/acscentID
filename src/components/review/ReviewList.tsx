"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Camera, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { ReviewCard } from "./ReviewCard"
import { getReviews, toggleReviewLike } from "@/lib/supabase/reviews"
import type { Review, ReviewFilter } from "@/lib/supabase/reviews"

interface ReviewListProps {
  programType: 'idol_image' | 'personal' | 'figure' | 'graduation' | 'le-quack'
  currentUserId?: string
  ratingFilter?: number | null
  onRatingFilterChange?: (rating: number | null) => void
}

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'rating_high', label: '별점 높은순' },
  { value: 'rating_low', label: '별점 낮은순' },
  { value: 'helpful', label: '도움순' },
] as const

const REVIEWS_PER_PAGE = 5

export function ReviewList({
  programType,
  currentUserId,
  ratingFilter,
  onRatingFilterChange
}: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)

  const [sortBy, setSortBy] = useState<'latest' | 'rating_high' | 'rating_low' | 'helpful'>('latest')
  const [photoOnly, setPhotoOnly] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE)

  const fetchReviews = useCallback(async (pageNum: number) => {
    setIsLoading(true)
    try {
      const filter: ReviewFilter = {
        program_type: programType,
        sort_by: sortBy,
        rating: ratingFilter,
        photo_only: photoOnly,
        page: pageNum,
        limit: REVIEWS_PER_PAGE
      }

      const result = await getReviews(filter, currentUserId)

      setReviews(result.reviews)
      setTotalCount(result.totalCount ?? 0)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }, [programType, sortBy, ratingFilter, photoOnly, currentUserId])

  // 필터 변경 시 리셋
  useEffect(() => {
    setPage(1)
    fetchReviews(1)
  }, [fetchReviews])

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
    fetchReviews(newPage)
  }

  const handleLike = async (reviewId: string) => {
    if (!currentUserId) return

    const result = await toggleReviewLike(currentUserId, reviewId)

    setReviews(prev => prev.map(r =>
      r.id === reviewId
        ? { ...r, has_liked: result.liked, helpful_count: result.count }
        : r
    ))
  }

  const handleClearFilters = () => {
    setSortBy('latest')
    setPhotoOnly(false)
    onRatingFilterChange?.(null)
  }

  const hasActiveFilters = sortBy !== 'latest' || photoOnly || ratingFilter

  return (
    <div className="space-y-6">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* 정렬 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white border-2 border-black rounded-xl font-bold text-xs md:text-sm shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black] transition-all"
          >
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showSortDropdown && (
              <>
                {/* 모바일 오버레이 */}
                <div
                  className="fixed inset-0 z-40 md:hidden"
                  onClick={() => setShowSortDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed left-4 right-4 bottom-4 md:absolute md:bottom-auto md:top-full md:left-0 md:right-auto md:mt-2 w-auto md:w-40 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_0_black] overflow-hidden z-50"
                >
                  <div className="p-2 border-b border-slate-200 md:hidden">
                    <p className="text-xs font-bold text-slate-500 text-center">정렬 방식</p>
                  </div>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value)
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-4 py-3 md:py-2.5 text-left text-sm font-medium transition-colors ${
                        sortBy === option.value
                          ? 'bg-yellow-100 text-black'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* 사진리뷰만 */}
        <button
          onClick={() => setPhotoOnly(!photoOnly)}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 border-2 border-black rounded-xl font-bold text-xs md:text-sm transition-all ${
            photoOnly
              ? 'bg-pink-400 text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black]'
          }`}
        >
          <Camera size={14} />
          <span className="hidden sm:inline">사진리뷰만</span>
          <span className="sm:hidden">사진</span>
        </button>

        {/* 별점 필터 표시 */}
        {ratingFilter && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 border-2 border-yellow-400 rounded-xl font-bold text-xs md:text-sm">
            {ratingFilter}점
            <button
              onClick={() => onRatingFilterChange?.(null)}
              className="text-yellow-600 hover:text-black"
            >
              ✕
            </button>
          </div>
        )}

        {/* 필터 초기화 */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-2 py-1.5 text-xs md:text-sm text-slate-500 hover:text-black transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 리뷰 목록 */}
      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <p className="text-slate-500">아직 리뷰가 없어요</p>
          <p className="text-xs md:text-sm text-slate-400 mt-1">첫 번째 리뷰를 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onLike={handleLike}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {/* 이전 버튼 */}
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`w-10 h-10 flex items-center justify-center border-2 border-black rounded-xl transition-all ${
              page === 1
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            <ChevronLeft size={18} />
          </button>

          {/* 페이지 번호들 */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                // 모바일: 현재 페이지 주변 1개씩만 표시
                // 데스크톱: 현재 페이지 주변 2개씩 표시
                const distance = Math.abs(p - page)
                return p === 1 || p === totalPages || distance <= 2
              })
              .map((p, idx, arr) => {
                // 생략 부호 표시
                const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1
                return (
                  <div key={p} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="px-2 text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={`w-10 h-10 flex items-center justify-center border-2 border-black rounded-xl font-bold text-sm transition-all ${
                        page === p
                          ? 'bg-yellow-400 shadow-[2px_2px_0_0_black]'
                          : 'bg-white shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5'
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                )
              })}
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`w-10 h-10 flex items-center justify-center border-2 border-black rounded-xl transition-all ${
              page === totalPages
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white shadow-[2px_2px_0_0_black] hover:shadow-[3px_3px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* 페이지 정보 */}
      {totalPages > 1 && !isLoading && (
        <p className="text-center text-xs text-slate-500 mt-3">
          {totalCount}개 리뷰 중 {(page - 1) * REVIEWS_PER_PAGE + 1}-{Math.min(page * REVIEWS_PER_PAGE, totalCount)}번째
        </p>
      )}
    </div>
  )
}
