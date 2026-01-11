'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Heart, Trash2, X, Calendar, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface ConfirmedRecipe {
  granules: RecipeGranule[]
}

interface Analysis {
  id: string
  created_at: string
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: object
  confirmed_recipe: ConfirmedRecipe | null  // 확정된 레시피
}

interface SavedAnalysisListProps {
  analyses: Analysis[]
  loading: boolean
  onDelete: (id: string) => void
}

export function SavedAnalysisList({ analyses, loading, onDelete }: SavedAnalysisListProps) {
  const [selectedImage, setSelectedImage] = useState<Analysis | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null)

  // 좋아요 토글
  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
      month: 'short',
      day: 'numeric',
    })
  }

  // 로딩 스켈레톤 (갤러리 스타일)
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-white rounded-2xl animate-pulse border border-slate-100 overflow-hidden"
          >
            <div className="h-3/4 bg-gradient-to-br from-slate-100 to-slate-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="h-2 bg-slate-100 rounded w-1/2" />
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
        <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/10">
          <Sparkles size={40} className="text-purple-400" />
        </div>
        <p className="text-slate-700 font-bold text-lg">나만의 갤러리가 비어있어요</p>
        <p className="text-slate-400 text-sm mt-2">
          이미지를 분석하고 최애 향수를 찾아보세요!
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all"
        >
          분석 시작하기
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* 갤러리 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {analyses.map((analysis, index) => (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
            className="group"
          >
            {/* 폴라로이드 스타일 카드 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
              {/* 이미지 영역 - 클릭 시 모달 열기 */}
              <div
                className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 cursor-pointer"
                onClick={() => setSelectedImage(analysis)}
              >
                {analysis.user_image_url ? (
                  <img
                    src={analysis.user_image_url}
                    alt={analysis.twitter_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">✨</div>
                      <span className="text-purple-400 text-xs font-medium">No Image</span>
                    </div>
                  </div>
                )}

                {/* 오버레이 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 좋아요 버튼 */}
                <button
                  onClick={(e) => toggleLike(analysis.id, e)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                >
                  <Heart
                    size={16}
                    className={likedIds.has(analysis.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                  />
                </button>

                {/* 날짜 뱃지 */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                  <Calendar size={10} />
                  {formatRelativeTime(analysis.created_at)}
                </div>

              </div>

              {/* 정보 영역 */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">
                      {analysis.twitter_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {analysis.perfume_name}
                    </p>
                  </div>
                  {/* 삭제 버튼 - 항상 표시 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteTarget(analysis)
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {/* 확정 레시피가 있으면 granules 표시 */}
                {analysis.confirmed_recipe?.granules && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {analysis.confirmed_recipe.granules.slice(0, 2).map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full text-[10px] font-medium text-amber-700"
                      >
                        {g.name} {g.ratio}%
                      </span>
                    ))}
                    {analysis.confirmed_recipe.granules.length > 2 && (
                      <span className="text-[10px] text-slate-400">
                        +{analysis.confirmed_recipe.granules.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* 구매하기 버튼 (카드 내부) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    alert('준비 중인 기능입니다!')
                  }}
                  className="w-full mt-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <ShoppingBag size={12} className="text-yellow-400" />
                  향수 구매하기
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 이미지 상세보기 모달 */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full"
            >
              {/* 닫기 버튼 */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              {/* 이미지 카드 */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                {/* 큰 이미지 */}
                <div className="relative aspect-square">
                  {selectedImage.user_image_url ? (
                    <img
                      src={selectedImage.user_image_url}
                      alt={selectedImage.twitter_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <span className="text-6xl">✨</span>
                    </div>
                  )}

                  {/* 좋아요 */}
                  <button
                    onClick={(e) => toggleLike(selectedImage.id, e)}
                    className="absolute top-4 right-4 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={24}
                      className={likedIds.has(selectedImage.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                    />
                  </button>
                </div>

                {/* 상세 정보 */}
                <div className="p-5">
                  <div>
                    <h2 className="font-black text-xl text-slate-900">
                      {selectedImage.twitter_name}
                    </h2>
                    <p className="text-slate-600 text-sm mt-1">
                      {selectedImage.perfume_name}
                    </p>
                  </div>

                  {/* 확정 레시피가 있으면 표시 */}
                  {selectedImage.confirmed_recipe?.granules && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-amber-700 mb-2">🧪 확정 레시피</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedImage.confirmed_recipe.granules.map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-amber-800 shadow-sm"
                          >
                            {g.name} {g.ratio}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/result?id=${selectedImage.id}`}
                      className="flex-1 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-center hover:bg-slate-50 transition-colors"
                    >
                      결과 상세보기
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        alert('준비 중인 기능입니다!')
                      }}
                      className="flex-[1.5] py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-[1.02] hover:shadow-purple-500/40 transition-all"
                    >
                      <ShoppingBag size={18} />
                      향수 구매하기
                    </button>
                  </div>

                  <p className="text-center text-slate-400 text-xs mt-4">
                    {formatRelativeTime(selectedImage.created_at)}에 분석됨
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 삭제 확인 모달 */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">삭제할까요?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  "{deleteTarget.twitter_name}" 분석 결과를 삭제합니다.<br />
                  이 작업은 되돌릴 수 없어요.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      onDelete(deleteTarget.id)
                      setDeleteTarget(null)
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
