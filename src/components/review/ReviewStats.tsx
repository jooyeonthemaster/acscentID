"use client"

import { Star } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

interface ReviewStatsProps {
  stats: ReviewStatsType
  onRatingFilter?: (rating: number | null) => void
  selectedRating?: number | null
}

export function ReviewStats({ stats, onRatingFilter, selectedRating }: ReviewStatsProps) {
  const t = useTranslations()
  const { average_rating, total_count, rating_distribution } = stats

  const maxCount = Math.max(...Object.values(rating_distribution), 1)

  return (
    <div className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] p-4">
      {/* 상단: 평균 별점 */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={18}
              className={star <= Math.round(average_rating)
                ? "fill-[#1A1610] text-[#1A1610]"
                : "text-[#5C564A]"
              }
            />
          ))}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-[#1A1610]">{average_rating.toFixed(1)}</span>
          <span className="text-[#8B8578] text-sm lg:text-base font-medium">/ 5.0</span>
        </div>
        <p className="text-xs lg:text-sm text-[#8B8578] mt-0.5">
          {t('review.totalReviews', { count: total_count })}
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
              className={`w-full flex items-center gap-2 p-1.5 rounded-[12px] transition-all ${
                isSelected
                  ? 'bg-[#EDE5D2] border border-[#C9BFA8]'
                  : 'hover:bg-[#EDE5D2]'
              }`}
            >
              <span className="text-xs lg:text-sm font-bold text-[#5C564A] w-6 flex-shrink-0">{t('review.star', { rating })}</span>
              <div className="flex-1 h-3 bg-[#EDE5D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EFE4C8] rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[10px] lg:text-[12px] text-[#8B8578] w-14 text-right flex-shrink-0">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
