'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Heart, Trash2, X, Calendar, ShoppingBag, Eye, ChevronRight, Beaker, Droplets } from 'lucide-react'
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
  idol_name: string | null
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: AnalysisData
  confirmed_recipe: ConfirmedRecipe | null
}

// 분석 데이터 타입 (레시피 모달에서 사용)
interface AnalysisData {
  matchingPerfumes?: Array<{
    matchScore?: number
    persona?: {
      name?: string
      recommendation?: string
      scentProfile?: {
        top?: string[]
        middle?: string[]
        base?: string[]
      }
      keywords?: string[]
    }
  }>
  matchingKeywords?: string[]
}

interface SavedAnalysisListProps {
  analyses: Analysis[]
  loading: boolean
  onDelete: (id: string) => void
  viewMode?: 'grid' | 'list'
}

export function SavedAnalysisList({ analyses, loading, onDelete, viewMode = 'grid' }: SavedAnalysisListProps) {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<Analysis | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null)
  const [recipeModalTarget, setRecipeModalTarget] = useState<Analysis | null>(null)

  // 구매하기 버튼 클릭 - 체크아웃으로 이동
  const handlePurchase = (analysis: Analysis, e: React.MouseEvent) => {
    e.stopPropagation()

    // 분석 결과를 localStorage에 저장 (checkout 페이지에서 사용)
    const analysisResult = {
      matchingPerfumes: [{
        perfumeId: analysis.id,
        persona: {
          name: analysis.perfume_name,
          recommendation: analysis.perfume_brand
        }
      }],
      matchingKeywords: analysis.confirmed_recipe?.granules?.map(g => g.name) || []
    }

    localStorage.setItem('analysisResult', JSON.stringify(analysisResult))
    localStorage.setItem('userImage', analysis.user_image_url || '')
    localStorage.setItem('serviceMode', 'online')

    router.push('/checkout')
  }

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

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl animate-pulse border-2 border-black shadow-[4px_4px_0_0_black] overflow-hidden"
          >
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 빈 상태
  if (analyses.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-12 text-center shadow-[4px_4px_0_0_black]">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black]">
          <Sparkles size={40} className="text-purple-500" />
        </div>
        <h3 className="text-xl font-black mb-2">나만의 갤러리가 비어있어요</h3>
        <p className="text-slate-500 text-sm mb-6">
          이미지를 분석하고 최애 향수를 찾아보세요!
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-purple-500 text-white font-bold rounded-xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          분석 시작하기 →
        </Link>
      </div>
    )
  }

  // 그리드 뷰
  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {analyses.map((analysis, index) => (
            <motion.div
              key={analysis.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
            >
              {/* 키치 스타일 카드 */}
              <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group">
                {/* 이미지 영역 */}
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
                        <span className="text-purple-400 text-xs font-bold">No Image</span>
                      </div>
                    </div>
                  )}

                  {/* 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* 좋아요 버튼 */}
                  <button
                    onClick={(e) => toggleLike(analysis.id, e)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_0_black] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                  >
                    <Heart
                      size={14}
                      className={likedIds.has(analysis.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                    />
                  </button>

                  {/* 날짜 뱃지 */}
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-white border-2 border-black text-[10px] font-bold flex items-center gap-1 shadow-[2px_2px_0_0_black]">
                    <Calendar size={10} />
                    {formatRelativeTime(analysis.created_at)}
                  </div>

                  {/* 보기 버튼 (호버 시) */}
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedImage(analysis)}
                      className="w-full py-2 bg-white border-2 border-black rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_black] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      <Eye size={12} />
                      자세히 보기
                    </button>
                  </div>
                </div>

                {/* 정보 영역 */}
                <div className="p-3 border-t-2 border-black">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm truncate leading-tight">
                        {analysis.idol_name || analysis.twitter_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {analysis.perfume_name}
                      </p>
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteTarget(analysis)
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex flex-col gap-2 mt-3">
                    <button
                      onClick={(e) => handlePurchase(analysis, e)}
                      className="w-full py-2 bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
                    >
                      <ShoppingBag size={12} className="text-yellow-400" />
                      향수 구매하기
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRecipeModalTarget(analysis)
                      }}
                      className="w-full py-2 bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-amber-300 transition-colors border-2 border-black"
                    >
                      <Beaker size={12} />
                      레시피 확인하기
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 모달들 */}
        {renderModals()}
      </>
    )
  }

  // 리스트 뷰
  return (
    <>
      <div className="space-y-3">
        {analyses.map((analysis, index) => (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-4 p-4">
                {/* 이미지 */}
                <div
                  className="w-20 h-20 rounded-xl overflow-hidden border-2 border-black flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedImage(analysis)}
                >
                  {analysis.user_image_url ? (
                    <img
                      src={analysis.user_image_url}
                      alt={analysis.twitter_name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <Sparkles size={24} className="text-purple-400" />
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-lg truncate">{analysis.idol_name || analysis.twitter_name}</h3>
                    <button
                      onClick={(e) => toggleLike(analysis.id, e)}
                      className="p-1"
                    >
                      <Heart
                        size={16}
                        className={likedIds.has(analysis.id) ? 'fill-red-500 text-red-500' : 'text-slate-300 hover:text-red-400'}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{analysis.perfume_name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatRelativeTime(analysis.created_at)}
                    </span>
                    {analysis.confirmed_recipe?.granules && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold">
                        레시피 {analysis.confirmed_recipe.granules.length}개
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteTarget(analysis)
                    }}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRecipeModalTarget(analysis)
                    }}
                    className="px-4 py-2.5 bg-amber-400 text-black text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-1.5 border-2 border-black"
                  >
                    <Beaker size={16} />
                    레시피
                  </button>

                  <Link
                    href={`/result?id=${analysis.id}`}
                    className="px-4 py-2.5 bg-purple-500 text-white text-sm font-bold rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                  >
                    상세보기
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 모달들 */}
      {renderModals()}
    </>
  )

  // 모달 렌더링 함수
  function renderModals() {
    return (
      <>
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
                className="relative max-w-md w-full"
              >
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                {/* 카드 */}
                <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0_0_black]">
                  {/* 이미지 */}
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
                      className="absolute top-4 right-4 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_0_black] hover:scale-110 transition-transform"
                    >
                      <Heart
                        size={24}
                        className={likedIds.has(selectedImage.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                      />
                    </button>
                  </div>

                  {/* 정보 */}
                  <div className="p-5 border-t-2 border-black">
                    <h2 className="font-black text-xl">{selectedImage.idol_name || selectedImage.twitter_name}</h2>
                    <p className="text-slate-600 text-sm mt-1">{selectedImage.perfume_name}</p>

                    {/* 확정 레시피 */}
                    {selectedImage.confirmed_recipe?.granules && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                        <p className="text-xs font-black text-yellow-700 mb-2">🧪 확정 레시피</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedImage.confirmed_recipe.granules.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-yellow-800 border border-yellow-300"
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
                        className="flex-1 py-3 bg-white border-2 border-black text-black rounded-xl font-bold text-center hover:bg-slate-50 transition-colors"
                      >
                        결과 상세보기
                      </Link>
                      <button
                        onClick={(e) => handlePurchase(selectedImage, e)}
                        className="flex-[1.5] py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                      >
                        <ShoppingBag size={18} className="text-yellow-400" />
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
                className="bg-white border-2 border-black rounded-2xl p-6 max-w-xs w-full shadow-[8px_8px_0_0_black]"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center border-2 border-black">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black mb-2">삭제할까요?</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    "{deleteTarget.idol_name || deleteTarget.twitter_name}" 분석 결과를 삭제합니다.<br />
                    이 작업은 되돌릴 수 없어요.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors border-2 border-black"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        onDelete(deleteTarget.id)
                        setDeleteTarget(null)
                      }}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors border-2 border-black"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 레시피 확인 모달 */}
        <AnimatePresence>
          {recipeModalTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecipeModalTarget(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-[8px_8px_0_0_black]"
              >
                {/* 모달 헤더 */}
                <div className="px-5 py-4 border-b-2 border-black bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Beaker size={20} />
                    {recipeModalTarget.confirmed_recipe ? '확정 레시피' : '향수 분석 정보'}
                  </h3>
                  <button
                    onClick={() => setRecipeModalTarget(null)}
                    className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 모달 콘텐츠 */}
                <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)]">
                  {/* 대상 정보 */}
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
                    {recipeModalTarget.user_image_url ? (
                      <img
                        src={recipeModalTarget.user_image_url}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center border-2 border-black">
                        <Sparkles size={24} className="text-purple-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-black text-lg">{recipeModalTarget.idol_name || recipeModalTarget.twitter_name}</p>
                      <p className="text-sm text-slate-500">{recipeModalTarget.perfume_name}</p>
                    </div>
                  </div>

                  {recipeModalTarget.confirmed_recipe?.granules ? (
                    /* 확정 레시피가 있는 경우: 향료별 계량 표시 */
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-600 mb-3">🧪 커스텀 조향 레시피</p>
                      {recipeModalTarget.confirmed_recipe.granules.map((granule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border-2 border-amber-200"
                        >
                          <div className="flex items-center gap-2">
                            <Droplets size={16} className="text-amber-600" />
                            <span className="font-bold">{granule.name}</span>
                          </div>
                          <span className="px-3 py-1 bg-white rounded-lg font-black text-amber-700 border border-amber-300">
                            {granule.ratio}%
                          </span>
                        </div>
                      ))}
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-xs text-slate-500">
                          피드백을 통해 조정된 나만의 레시피에요
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 확정 레시피가 없는 경우: 기본 향수 분석 정보 */
                    <div className="space-y-4">
                      {(() => {
                        const perfume = recipeModalTarget.analysis_data?.matchingPerfumes?.[0]
                        const persona = perfume?.persona
                        const matchScore = perfume?.matchScore

                        return (
                          <>
                            {/* 매칭률 */}
                            {matchScore && (
                              <div className="text-center p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                                <p className="text-xs text-purple-600 font-bold mb-1">매칭률</p>
                                <p className="text-3xl font-black text-purple-700">{Math.round(matchScore)}%</p>
                              </div>
                            )}

                            {/* 향노트 */}
                            {persona?.scentProfile && (
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-slate-600">🌸 향노트</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {persona.scentProfile.top && persona.scentProfile.top.length > 0 && (
                                    <div className="p-2 bg-pink-50 rounded-lg border border-pink-200 text-center">
                                      <p className="text-[10px] text-pink-600 font-bold">TOP</p>
                                      <p className="text-xs font-bold mt-1 truncate">
                                        {persona.scentProfile.top.slice(0, 2).join(', ')}
                                      </p>
                                    </div>
                                  )}
                                  {persona.scentProfile.middle && persona.scentProfile.middle.length > 0 && (
                                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-center">
                                      <p className="text-[10px] text-rose-600 font-bold">MIDDLE</p>
                                      <p className="text-xs font-bold mt-1 truncate">
                                        {persona.scentProfile.middle.slice(0, 2).join(', ')}
                                      </p>
                                    </div>
                                  )}
                                  {persona.scentProfile.base && persona.scentProfile.base.length > 0 && (
                                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-center">
                                      <p className="text-[10px] text-amber-600 font-bold">BASE</p>
                                      <p className="text-xs font-bold mt-1 truncate">
                                        {persona.scentProfile.base.slice(0, 2).join(', ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 키워드 */}
                            {(persona?.keywords || recipeModalTarget.analysis_data?.matchingKeywords) && (
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-slate-600">✨ 매칭 키워드</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(persona?.keywords || recipeModalTarget.analysis_data?.matchingKeywords || [])
                                    .slice(0, 6)
                                    .map((keyword, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* 분석 정보가 없는 경우 */}
                            {!matchScore && !persona?.scentProfile && !persona?.keywords && (
                              <div className="text-center py-8">
                                <p className="text-slate-400 text-sm">상세 분석 정보가 없어요</p>
                                <Link
                                  href={`/result?id=${recipeModalTarget.id}`}
                                  className="inline-block mt-3 px-4 py-2 bg-purple-500 text-white text-sm font-bold rounded-lg"
                                >
                                  결과 페이지에서 확인하기
                                </Link>
                              </div>
                            )}
                          </>
                        )
                      })()}

                      <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-xs text-slate-500">
                          피드백을 통해 나만의 레시피를 만들어보세요!
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 모달 푸터 */}
                <div className="px-5 py-4 border-t-2 border-black bg-slate-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRecipeModalTarget(null)}
                      className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-bold hover:bg-slate-100 transition-colors"
                    >
                      닫기
                    </button>
                    <Link
                      href={`/result?id=${recipeModalTarget.id}`}
                      className="flex-1 py-3 bg-purple-500 text-white border-2 border-black rounded-xl font-bold text-center hover:bg-purple-600 transition-colors"
                      onClick={() => setRecipeModalTarget(null)}
                    >
                      결과 상세보기
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }
}
