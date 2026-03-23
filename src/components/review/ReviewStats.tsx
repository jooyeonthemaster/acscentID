"use client"

import { Star } from "lucide-react"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

interface ReviewStatsProps {
  stats: ReviewStatsType
  onRatingFilter?: (rating: number | null) => void
  selectedRating?: number | null
}

export function ReviewStats({ stats, onRatingFilter, selectedRating }: ReviewStatsProps) {
  const { average_rating, total_count, rating_distribution } = stats

  const maxCount = Math.max(...Object.values(rating_distribution), 1)

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black]">
      {/* 상단: 평균 별점 */}
      <div className="mb-4">
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
