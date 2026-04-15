'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  Loader2,
  Check,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Filter,
  ChevronDown,
  Eye,
  Camera,
  ThumbsUp,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────

interface AdminReview {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  program_type: string
  order_id: string | null
  rating: number
  content: string | null
  idol_name: string | null
  option_info: string | null
  is_verified: boolean
  helpful_count: number
  admin_name: string | null
  is_admin_review: boolean
  review_images: { id: string; image_url: string; order_index: number }[]
  user_profiles: { name: string | null; avatar_url: string | null } | null
}

interface GeneratedReview {
  reviewer_name: string
  rating: number
  content: string
  idol_name: string | null
  selected?: boolean
}

// ─── Constants ─────────────────────────────────────────────────────

const PROGRAM_TYPES = [
  { value: 'idol_image', label: 'AI 이미지 분석 퍼퓸' },
  { value: 'figure', label: '피규어 화분 디퓨저' },
  { value: 'chemistry_set', label: '케미 향수 세트' },
  { value: 'graduation', label: '졸업 기념 퍼퓸' },
  { value: 'personal', label: '퍼스널 센트' },
  { value: 'le-quack', label: 'LE QUACK 시그니처' },
]

const PROGRAM_LABELS: Record<string, string> = Object.fromEntries(
  PROGRAM_TYPES.map((p) => [p.value, p.label])
)

// ─── Main Component ────────────────────────────────────────────────

export default function AdminReviewsPage() {
  // ── State ──
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState<string>('idol_image')
  const [stats, setStats] = useState({ total: 0, avgRating: 0, adminCount: 0, photoCount: 0 })

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [editingReview, setEditingReview] = useState<AdminReview | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ── Fetch Reviews ──
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        review_images (id, image_url, order_index),
        user_profiles!reviews_user_id_fkey (name, avatar_url)
      `)
      .eq('program_type', selectedProgram)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AdminReviews] Fetch error:', error)
      setReviews([])
    } else {
      setReviews(data || [])
    }
    setLoading(false)
  }, [selectedProgram])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // ── Stats Calculation ──
  useEffect(() => {
    if (reviews.length === 0) {
      setStats({ total: 0, avgRating: 0, adminCount: 0, photoCount: 0 })
      return
    }
    const total = reviews.length
    const avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    const adminCount = reviews.filter((r) => r.is_admin_review).length
    const photoCount = reviews.filter((r) => r.review_images?.length > 0).length
    setStats({ total, avgRating, adminCount, photoCount })
  }, [reviews])

  // ── Delete Review ──
  const handleDelete = async (review: AdminReview) => {
    // 이미지 스토리지 삭제
    if (review.review_images?.length > 0) {
      const paths = review.review_images
        .map((img) => {
          const url = img.image_url
          const bucketPath = 'review-images/'
          const pathIndex = url.indexOf(bucketPath)
          return pathIndex !== -1 ? url.substring(pathIndex + bucketPath.length) : null
        })
        .filter((p): p is string => p !== null)

      if (paths.length > 0) {
        await supabase.storage.from('review-images').remove(paths)
      }
    }

    const { error } = await supabase.from('reviews').delete().eq('id', review.id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    setDeleteTarget(null)
    fetchReviews()
  }

  // ── Reviewer Display Name ──
  const getReviewerName = (review: AdminReview) => {
    if (review.admin_name) return review.admin_name
    if (review.user_profiles?.name) return review.user_profiles.name
    return '익명'
  }

  const maskName = (name: string) => {
    if (name.length <= 1) return name
    if (name.length === 2) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="리뷰 관리"
        subtitle="상품별 리뷰를 관리하고 AI로 리뷰를 생성하세요"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              AI 리뷰 생성
            </button>
            <button
              onClick={() => { setEditingReview(null); setShowAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              리뷰 추가
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* ─── Program Filter Tabs ─── */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PROGRAM_TYPES.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedProgram(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border-2 ${
                selectedProgram === p.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500 mb-1">전체 리뷰</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}개</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500 mb-1">평균 별점</div>
            <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400" />
              {stats.avgRating || '-'}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500 mb-1">관리자 리뷰</div>
            <div className="text-2xl font-bold text-purple-600">{stats.adminCount}개</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500 mb-1">사진 리뷰</div>
            <div className="text-2xl font-bold text-blue-600">{stats.photoCount}개</div>
          </div>
        </div>

        {/* ─── Review List ─── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">
              {PROGRAM_LABELS[selectedProgram]} 리뷰 목록
            </h3>
            <span className="text-sm text-slate-500">{stats.total}개</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">리뷰를 불러오는 중...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">등록된 리뷰가 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">리뷰를 추가하거나 AI로 생성해보세요</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <div key={review.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Left: Review Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Stars */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                        {/* Name */}
                        <span className="font-bold text-sm text-slate-900">
                          {maskName(getReviewerName(review))}
                        </span>
                        {review.idol_name && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="text-sm text-slate-500">{review.idol_name}</span>
                          </>
                        )}
                        {/* Badges */}
                        {review.is_admin_review && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">
                            관리자
                          </span>
                        )}
                        {review.is_verified && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                            구매인증
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 mb-2 line-clamp-2">{review.content}</p>

                      {/* Images */}
                      {review.review_images?.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {review.review_images.map((img) => (
                            <button
                              key={img.id}
                              onClick={() => setPreviewImage(img.image_url)}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
                            >
                              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                        {review.helpful_count > 0 && (
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {review.helpful_count}
                          </span>
                        )}
                        {review.review_images?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {review.review_images.length}장
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingReview(review); setShowAddModal(true) }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(review)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showAddModal && (
          <ReviewFormModal
            review={editingReview}
            programType={selectedProgram}
            onClose={() => { setShowAddModal(false); setEditingReview(null) }}
            onSuccess={() => { setShowAddModal(false); setEditingReview(null); fetchReviews() }}
          />
        )}
        {showAiModal && (
          <AiGenerateModal
            programType={selectedProgram}
            onClose={() => setShowAiModal(false)}
            onSuccess={() => { setShowAiModal(false); fetchReviews() }}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            review={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget)}
          />
        )}
        {previewImage && (
          <ImagePreviewModal
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ReviewFormModal — 리뷰 추가/수정 모달
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReviewFormModal({
  review,
  programType,
  onClose,
  onSuccess,
}: {
  review: AdminReview | null
  programType: string
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!review
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    admin_name: review?.admin_name || '',
    rating: review?.rating || 5,
    content: review?.content || '',
    idol_name: review?.idol_name || '',
    is_verified: review?.is_verified ?? true,
    helpful_count: review?.helpful_count || 0,
    created_at: review?.created_at ? new Date(review.created_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  })

  const [newImages, setNewImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState(review?.review_images || [])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const total = existingImages.length - removedImageIds.length + newImages.length + files.length
    if (total > 5) {
      alert('이미지는 최대 5장까지 가능합니다.')
      return
    }
    setNewImages((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!formData.admin_name.trim()) {
      alert('리뷰어 이름을 입력해주세요.')
      return
    }
    if (!formData.content.trim()) {
      alert('리뷰 내용을 입력해주세요.')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      if (isEdit && review) {
        // ── Update ──
        const { error } = await supabase
          .from('reviews')
          .update({
            admin_name: formData.admin_name,
            rating: formData.rating,
            content: formData.content,
            idol_name: formData.idol_name || null,
            is_verified: formData.is_verified,
            helpful_count: formData.helpful_count,
            is_admin_review: true,
            created_at: new Date(formData.created_at).toISOString(),
          })
          .eq('id', review.id)

        if (error) throw error

        // 삭제할 이미지 처리
        if (removedImageIds.length > 0) {
          await supabase.from('review_images').delete().in('id', removedImageIds)
        }

        // 새 이미지 업로드
        if (newImages.length > 0) {
          await uploadAndInsertImages(user.id, review.id, newImages, existingImages.length)
        }
      } else {
        // ── Insert ──
        const { data: newReview, error } = await supabase
          .from('reviews')
          .insert({
            user_id: user.id,
            program_type: programType,
            rating: formData.rating,
            content: formData.content,
            idol_name: formData.idol_name || null,
            admin_name: formData.admin_name,
            is_admin_review: true,
            is_verified: formData.is_verified,
            helpful_count: formData.helpful_count,
            created_at: new Date(formData.created_at).toISOString(),
          })
          .select()
          .single()

        if (error) throw error

        // 이미지 업로드
        if (newImages.length > 0 && newReview) {
          await uploadAndInsertImages(user.id, newReview.id, newImages, 0)
        }
      }

      onSuccess()
    } catch (err) {
      console.error('[ReviewForm] Save error:', err)
      alert('저장 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-900">
            {isEdit ? '리뷰 수정' : '리뷰 추가'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Reviewer Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              리뷰어 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              placeholder="예: 김민지"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">UI에는 자동으로 마스킹되어 표시됩니다 (예: 김*지)</p>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">별점</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setFormData({ ...formData, rating: s })}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      s <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-200 hover:text-yellow-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              리뷰 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="리뷰 내용을 입력하세요..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{formData.content.length}/500</p>
          </div>

          {/* Idol Name (for idol_image) */}
          {programType === 'idol_image' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                아이돌/캐릭터 이름
              </label>
              <input
                type="text"
                value={formData.idol_name}
                onChange={(e) => setFormData({ ...formData, idol_name: e.target.value })}
                placeholder="예: 방탄소년단 뷔"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          )}

          {/* Options Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">도움돼요 수</label>
              <input
                type="number"
                min={0}
                value={formData.helpful_count}
                onChange={(e) => setFormData({ ...formData, helpful_count: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">작성일</label>
              <input
                type="datetime-local"
                value={formData.created_at}
                onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Verified Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormData({ ...formData, is_verified: !formData.is_verified })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.is_verified ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  formData.is_verified ? 'translate-x-6' : ''
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">구매인증 뱃지 표시</span>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              리뷰 이미지 (최대 5장)
            </label>
            <div className="flex gap-2 flex-wrap">
              {/* Existing images */}
              {existingImages
                .filter((img) => !removedImageIds.includes(img.id))
                .map((img) => (
                  <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setRemovedImageIds((prev) => [...prev, img.id])}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              {/* New images */}
              {newImages.map((file, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-300">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Add button */}
              {existingImages.length - removedImageIds.length + newImages.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-slate-400" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageAdd}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? '수정' : '추가'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AiGenerateModal — AI 리뷰 생성 모달
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AiGenerateModal({
  programType,
  onClose,
  onSuccess,
}: {
  programType: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [count, setCount] = useState(5)
  const [style, setStyle] = useState<'natural' | 'enthusiastic' | 'calm'>('natural')
  const [generating, setGenerating] = useState(false)
  const [generatedReviews, setGeneratedReviews] = useState<GeneratedReview[]>([])
  const [inserting, setInserting] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/reviews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programType, count, style }),
      })

      if (!res.ok) throw new Error('AI 생성 실패')

      const { reviews } = await res.json()
      setGeneratedReviews(reviews.map((r: GeneratedReview) => ({ ...r, selected: true })))
    } catch (err) {
      console.error('[AI Generate]', err)
      alert('AI 리뷰 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const handleInsert = async () => {
    const selectedReviews = generatedReviews.filter((r) => r.selected)
    if (selectedReviews.length === 0) {
      alert('삽입할 리뷰를 선택해주세요.')
      return
    }

    setInserting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 각 리뷰를 날짜를 분산시켜 삽입
      const now = new Date()
      for (let i = 0; i < selectedReviews.length; i++) {
        const r = selectedReviews[i]
        // 최근 1~30일 사이로 분산
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const hoursAgo = Math.floor(Math.random() * 24)
        const reviewDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000)

        const { error } = await supabase.from('reviews').insert({
          user_id: user.id,
          program_type: programType,
          rating: r.rating,
          content: r.content,
          idol_name: r.idol_name || null,
          admin_name: r.reviewer_name,
          is_admin_review: true,
          is_verified: true,
          helpful_count: Math.floor(Math.random() * 40) + 5,
          created_at: reviewDate.toISOString(),
        })

        if (error) {
          console.error('[AI Insert] Error:', error)
        }
      }

      onSuccess()
    } catch (err) {
      console.error('[AI Insert]', err)
      alert('리뷰 삽입에 실패했습니다.')
    } finally {
      setInserting(false)
    }
  }

  const toggleSelect = (index: number) => {
    setGeneratedReviews((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    )
  }

  const toggleAll = () => {
    const allSelected = generatedReviews.every((r) => r.selected)
    setGeneratedReviews((prev) => prev.map((r) => ({ ...r, selected: !allSelected })))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-lg text-slate-900">AI 리뷰 생성</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Generation Options */}
          {generatedReviews.length === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  상품: {PROGRAM_LABELS[programType]}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">생성 개수</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  >
                    {[3, 5, 7, 10].map((n) => (
                      <option key={n} value={n}>{n}개</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">톤 & 스타일</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as typeof style)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="natural">자연스러운</option>
                    <option value="enthusiastic">열정적인</option>
                    <option value="calm">차분한</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI가 리뷰를 생성하고 있어요...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    리뷰 생성하기
                  </>
                )}
              </button>
            </>
          )}

          {/* Generated Reviews Preview */}
          {generatedReviews.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {generatedReviews.length}개 생성됨 ·{' '}
                  {generatedReviews.filter((r) => r.selected).length}개 선택
                </p>
                <button
                  onClick={toggleAll}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {generatedReviews.every((r) => r.selected) ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              <div className="space-y-3">
                {generatedReviews.map((review, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSelect(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      review.selected
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                          review.selected ? 'bg-purple-600 border-purple-600' : 'border-slate-300'
                        }`}
                      >
                        {review.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-bold text-slate-900">
                            {review.reviewer_name}
                          </span>
                          {review.idol_name && (
                            <span className="text-xs text-slate-500">| {review.idol_name}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">{review.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setGeneratedReviews([])}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  다시 생성
                </button>
                <button
                  onClick={handleInsert}
                  disabled={inserting || generatedReviews.filter((r) => r.selected).length === 0}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inserting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      삽입 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      선택 리뷰 삽입 ({generatedReviews.filter((r) => r.selected).length}개)
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper — 이미지 업로드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function uploadAndInsertImages(
  userId: string,
  reviewId: string,
  files: File[],
  startIndex: number
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `admin/${reviewId}/${startIndex + i}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('review-images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload]', uploadError)
      continue
    }

    const { data: urlData } = supabase.storage
      .from('review-images')
      .getPublicUrl(filePath)

    await supabase.from('review_images').insert({
      review_id: reviewId,
      image_url: urlData.publicUrl,
      order_index: startIndex + i,
    })
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DeleteConfirmModal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DeleteConfirmModal({
  review,
  onClose,
  onConfirm,
}: {
  review: AdminReview
  onClose: () => void
  onConfirm: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-slate-900 mb-2">리뷰 삭제</h3>
        <p className="text-sm text-slate-600 mb-4">
          이 리뷰를 삭제하시겠습니까? 이미지도 함께 삭제됩니다.
        </p>
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-slate-700 line-clamp-2">&quot;{review.content}&quot;</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            삭제
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ImagePreviewModal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <img
        src={imageUrl}
        alt="Preview"
        className="max-w-full max-h-[85vh] rounded-lg object-contain"
      />
    </motion.div>
  )
}
