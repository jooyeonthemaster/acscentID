'use client'

import { motion } from 'framer-motion'
import { Sparkles, Calendar, Trash2, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'

interface Analysis {
  id: string
  created_at: string
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: object
}

interface SavedAnalysisListProps {
  analyses: Analysis[]
  loading: boolean
  onDelete: (id: string) => void
}

export function SavedAnalysisList({ analyses, loading, onDelete }: SavedAnalysisListProps) {
  // 상대 시간 포맷
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 빈 상태
  if (analyses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
          <Sparkles size={36} className="text-purple-300" />
        </div>
        <p className="text-slate-600 font-medium">저장된 분석 결과가 없어요</p>
        <p className="text-slate-400 text-sm mt-1">
          이미지를 분석하고 나만의 향수를 찾아보세요!
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-shadow"
        >
          분석 시작하기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {analyses.map((analysis, index) => (
        <motion.div
          key={analysis.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* 이미지 또는 아이콘 */}
            {analysis.user_image_url ? (
              <img
                src={analysis.user_image_url}
                alt="분석 이미지"
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-purple-600" />
              </div>
            )}

            {/* 분석 정보 */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{analysis.twitter_name}</h3>

              {/* 향수 정보 */}
              <p className="text-xs text-slate-600 truncate mt-0.5">
                {analysis.perfume_name}
                <span className="text-slate-400 ml-1">· {analysis.perfume_brand}</span>
              </p>

              {/* 날짜 */}
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Calendar size={11} />
                {formatRelativeTime(analysis.created_at)}
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onDelete(analysis.id)
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="삭제"
              >
                <Trash2 size={16} />
              </button>

              <Link
                href={`/result?id=${analysis.id}`}
                className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                title="상세보기"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
