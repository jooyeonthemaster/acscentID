"use client"

import { Star, Camera, MessageCircle } from "lucide-react"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

interface ReviewStatsProps {
  stats: ReviewStatsType
  onRatingFilter?: (rating: number | null) => void
  selectedRating?: number | null
}

export function ReviewStats({ stats, onRatingFilter, selectedRating }: ReviewStatsProps) {
  const { average_rating, total_count, rating_distribution, photo_review_count } = stats

  const maxCount = Math.max(...Object.values(rating_distribution), 1)

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 md:p-6 shadow-[4px_4px_0_0_black]">
      {/* 모바일: 세로 레이아웃 / 데스크톱: 가로 레이아웃 */}
      <div className="space-y-4 md:space-y-0 md:flex md:gap-8">

        {/* 평균 별점 + 사진/전체 카운트 (모바일에서 가로 배치) */}
        <div className="flex items-center justify-between md:flex-col md:items-start md:justify-start gap-4">
          {/* 평균 별점 */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={star <= Math.round(average_rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-200"
                  }
                />
              ))}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-black text-black">{average_rating.toFixed(1)}</span>
              <span className="text-slate-400 text-sm font-medium">/ 5.0</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              총 {total_count.toLocaleString()}개의 리뷰
            </p>
          </div>

          {/* 사진/전체 리뷰 카운트 - 모바일에서 세로로 */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 rounded-lg border border-pink-200">
              <Camera size={14} className="text-pink-500" />
              <span className="text-xs font-bold text-pink-700">사진 {photo_review_count}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
              <MessageCircle size={14} className="text-purple-500" />
              <span className="text-xs font-bold text-purple-700">전체 {total_count}</span>
            </div>
          </div>
        </div>

        {/* 별점 분포 */}
        <div className="flex-1 space-y-1.5 md:space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = rating_distribution[rating as keyof typeof rating_distribution]
            const percentage = total_count > 0 ? (count / total_count) * 100 : 0
            const barWidth = (count / maxCount) * 100
            const isSelected = selectedRating === rating

            return (
              <button
                key={rating}
                onClick={() => onRatingFilter?.(isSelected ? null : rating)}
                className={`w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-yellow-100 border border-yellow-400'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-xs md:text-sm font-bold text-slate-600 w-8 flex-shrink-0">{rating}점</span>
                <div className="flex-1 h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[10px] md:text-xs text-slate-500 w-14 md:w-16 text-right flex-shrink-0">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </button>
            )
          })}
        </div>

        {/* 사진/전체 리뷰 카운트 - 데스크톱에서만 표시 */}
        <div className="hidden md:flex md:flex-col justify-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-xl border border-pink-200">
            <Camera size={18} className="text-pink-500" />
            <div className="text-left">
              <p className="text-xs text-pink-600 font-medium">사진리뷰</p>
              <p className="text-lg font-black text-pink-700">{photo_review_count.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
            <MessageCircle size={18} className="text-purple-500" />
            <div className="text-left">
              <p className="text-xs text-purple-600 font-medium">전체리뷰</p>
              <p className="text-lg font-black text-purple-700">{total_count.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
