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
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black]">
      {/* 상단: 평균 별점 + 카운트 배지 */}
      <div className="flex items-center justify-between mb-4">
        {/* 평균 별점 */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                className={star <= Math.round(average_rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-200"
                }
              />
            ))}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-black">{average_rating.toFixed(1)}</span>
            <span className="text-slate-400 text-sm font-medium">/ 5.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            총 {total_count.toLocaleString()}개의 리뷰
          </p>
        </div>

        {/* 사진/전체 리뷰 카운트 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 rounded-xl border border-pink-200">
            <Camera size={14} className="text-pink-500" />
            <div className="text-right">
              <p className="text-[10px] text-pink-600 font-medium">사진리뷰</p>
              <p className="text-base font-black text-pink-700">{photo_review_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-xl border border-purple-200">
            <MessageCircle size={14} className="text-purple-500" />
            <div className="text-right">
              <p className="text-[10px] text-purple-600 font-medium">전체리뷰</p>
              <p className="text-base font-black text-purple-700">{total_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 별점 분포 */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = rating_distribution[rating as keyof typeof rating_distribution]
          const percentage = total_count > 0 ? (count / total_count) * 100 : 0
          const barWidth = (count / maxCount) * 100
          const isSelected = selectedRating === rating

          return (
            <button
              key={rating}
              onClick={() => onRatingFilter?.(isSelected ? null : rating)}
              className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                isSelected
                  ? 'bg-yellow-100 border border-yellow-400'
                  : 'hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-bold text-slate-600 w-6 flex-shrink-0">{rating}점</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-14 text-right flex-shrink-0">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
