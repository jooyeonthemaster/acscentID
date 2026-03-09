'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { X, Clock, Droplet, ChevronRight, Trash2, Loader2, Sparkles, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackRecord, GeneratedRecipe } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { RecipeConfirm } from './RecipeConfirm'

interface FeedbackHistoryProps {
  isOpen: boolean
  onClose: () => void
}

// 날짜 포맷팅 (locale-aware)
function formatDateWithT(dateString: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}${t('timeAgoMin')}`
    }
    return `${hours}${t('timeAgoHour')}`
  }
  if (days === 1) return t('timeAgoYesterday')
  if (days < 7) return `${days}${t('timeAgoDays')}`

  const localeMap: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES' }
  return date.toLocaleDateString(localeMap[locale] || 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 향수 색상 가져오기
function getPerfumeColor(id: string): string {
  const perfume = perfumes.find((p) => p.id === id)
  return perfume?.primaryColor || '#6B7280'
}

export function FeedbackHistory({ isOpen, onClose }: FeedbackHistoryProps) {
  const t = useTranslations('feedback')
  const locale = useLocale()
  const router = useRouter()
  const { getLocalizedName } = useLocalizedPerfumes()
  const formatDate = useCallback((dateString: string) => formatDateWithT(dateString, t as any, locale), [t, locale])
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 레시피 확정 뷰 상태
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null)
  const [showRecipeConfirm, setShowRecipeConfirm] = useState(false)

  // 피드백 목록 로드
  useEffect(() => {
    if (!isOpen) return

    const fetchFeedbacks = async () => {
      setLoading(true)
      setError(null)

      try {
        // fingerprint 가져오기
        const fingerprint = localStorage.getItem('user_fingerprint')
        if (!fingerprint) {
          setFeedbacks([])
          setLoading(false)
          return
        }

        const response = await fetch(`/api/feedback?userFingerprint=${fingerprint}&limit=20`)
        const data = await response.json()

        if (data.success) {
          setFeedbacks(data.feedbacks || [])
        } else {
          setError(data.error || t('historyFetchError'))
        }
      } catch (err) {
        console.error('Fetch feedbacks error:', err)
        setError(t('networkError'))
      } finally {
        setLoading(false)
      }
    }

    fetchFeedbacks()
  }, [isOpen, t])

  // 피드백 삭제
  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/feedback/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id))
      } else {
        alert(data.error || t('deleteError'))
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert(t('networkError'))
    } finally {
      setDeletingId(null)
    }
  }

  // 바디 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              {showRecipeConfirm && selectedFeedback ? (
                <>
                  <button
                    onClick={() => {
                      setShowRecipeConfirm(false)
                      setSelectedFeedback(null)
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-slate-600" />
                  </button>
                  <div className="flex-1 text-center">
                    <h2 className="text-lg font-bold text-slate-900">{t('confirmRecipe')}</h2>
                    <p className="text-xs text-slate-500">{selectedFeedback.perfumeName}</p>
                  </div>
                  <div className="w-9" /> {/* 균형을 위한 spacer */}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{t('historyTitle')}</h2>
                      <p className="text-xs text-slate-500">{t('historySubtitle')}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </>
              )}
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* RecipeConfirm 뷰 */}
              {showRecipeConfirm && selectedFeedback && selectedFeedback.generatedRecipe && (
                <RecipeConfirm
                  recipe={selectedFeedback.generatedRecipe as GeneratedRecipe}
                  perfumeName={selectedFeedback.perfumeName}
                  onBack={() => {
                    setShowRecipeConfirm(false)
                    setSelectedFeedback(null)
                  }}
                  onComplete={() => {
                    setShowRecipeConfirm(false)
                    setSelectedFeedback(null)
                    onClose()
                    router.push('/mypage')
                  }}
                />
              )}

              {/* 로딩 */}
              {!showRecipeConfirm && loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="text-amber-500 animate-spin mb-3" />
                  <p className="text-slate-500 text-sm">{t('historyLoading')}</p>
                </div>
              )}

              {/* 에러 */}
              {!showRecipeConfirm && error && !loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-4xl mb-3">😢</span>
                  <p className="text-slate-600 font-medium">{error}</p>
                </div>
              )}

              {/* 빈 상태 */}
              {!showRecipeConfirm && !loading && !error && feedbacks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-5xl mb-4">✨</span>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">{t('historyEmptyTitle')}</h3>
                  <p className="text-slate-500 text-sm text-center whitespace-pre-line">
                    {t('historyEmptyDescription')}
                  </p>
                </div>
              )}

              {/* 피드백 목록 */}
              {!showRecipeConfirm && !loading && !error && feedbacks.length > 0 && (
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <motion.div
                      key={feedback.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 rounded-2xl overflow-hidden"
                    >
                      {/* 카드 헤더 */}
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === feedback.id ? null : feedback.id)
                        }
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-100 transition-colors"
                      >
                        {/* 향수 아이콘 */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0"
                          style={{ backgroundColor: getPerfumeColor(feedback.perfumeId) }}
                        >
                          {feedback.retentionPercentage}%
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">
                            {feedback.perfumeName}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={12} />
                            <span>{formatDate(feedback.createdAt)}</span>
                            {feedback.generatedRecipe && (
                              <>
                                <span>•</span>
                                <Droplet size={12} className="text-amber-500" />
                                <span>
                                  {t('totalDrops', { count: (feedback.generatedRecipe as GeneratedRecipe).totalDrops || 0 })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 화살표 */}
                        <motion.div
                          animate={{ rotate: expandedId === feedback.id ? 90 : 0 }}
                          className="flex-shrink-0"
                        >
                          <ChevronRight size={20} className="text-slate-400" />
                        </motion.div>
                      </button>

                      {/* 확장 콘텐츠 */}
                      <AnimatePresence>
                        {expandedId === feedback.id && feedback.generatedRecipe && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {/* 레시피 설명 */}
                              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-3 border border-yellow-200/50">
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {(feedback.generatedRecipe as GeneratedRecipe).overallExplanation}
                                </p>
                              </div>

                              {/* 레시피 구성 */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={14} className="text-amber-500" />
                                  <span className="text-xs font-bold text-slate-600">{t('recipeComposition')}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(feedback.generatedRecipe as GeneratedRecipe).granules.map(
                                    (granule, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-100"
                                      >
                                        <div
                                          className="w-4 h-4 rounded-full"
                                          style={{ backgroundColor: getPerfumeColor(granule.id) }}
                                        />
                                        <span className="text-xs font-medium text-slate-700">
                                          {getLocalizedName(granule.id, granule.name)}
                                        </span>
                                        <span className="text-xs text-amber-600 font-bold">
                                          {granule.drops}{t('drops')}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* 팬 메시지 */}
                              {(feedback.generatedRecipe as GeneratedRecipe).fanMessage && (
                                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 border border-purple-200/50">
                                  <p className="text-xs text-purple-700 italic leading-relaxed">
                                    💜 {(feedback.generatedRecipe as GeneratedRecipe).fanMessage}
                                  </p>
                                </div>
                              )}

                              {/* 버튼들 */}
                              <div className="flex gap-2">
                                {/* 확정하기 버튼 */}
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFeedback(feedback)
                                    setShowRecipeConfirm(true)
                                  }}
                                  className="flex-1 h-9 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium shadow-md shadow-green-500/20"
                                >
                                  <Check size={14} className="mr-1" />
                                  {t('confirm')}
                                </Button>

                                {/* 삭제 버튼 */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(feedback.id)}
                                  disabled={deletingId === feedback.id}
                                  className="h-9 px-3 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl"
                                >
                                  {deletingId === feedback.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
              <Button
                onClick={onClose}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold"
              >
                {t('closeButton')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
