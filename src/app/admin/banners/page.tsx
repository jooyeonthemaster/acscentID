'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Link as LinkIcon,
  GripVertical,
  Loader2,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ======================
// Types
// ======================
interface Banner {
  id: string
  title: string
  image_url: string
  link_url: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface BannerFormData {
  title: string
  image_url: string
  link_url: string
  is_active: boolean
  display_order: number
}

const DEFAULT_FORM: BannerFormData = {
  title: '',
  image_url: '',
  link_url: '',
  is_active: true,
  display_order: 0,
}

// ======================
// Image Upload
// ======================
async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `banners/${timestamp}_${random}.${ext}`

  const { data, error } = await supabase.storage
    .from('admin-content')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('admin-content')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ======================
// Delete Confirmation Modal
// ======================
function DeleteConfirmModal({
  banner,
  onConfirm,
  onCancel,
}: {
  banner: Banner
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">배너 삭제</h3>
        </div>
        <p className="text-slate-600 mb-2">
          다음 배너를 정말 삭제하시겠습니까?
        </p>
        <div className="bg-slate-50 rounded-lg p-3 mb-6 border border-slate-200">
          <p className="font-semibold text-slate-900">{banner.title}</p>
          {banner.image_url && (
            <img
              src={banner.image_url}
              alt={banner.title}
              className="mt-2 w-full h-24 object-cover rounded-lg"
            />
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ======================
// Create/Edit Modal
// ======================
function BannerFormModal({
  isOpen,
  editingBanner,
  nextOrder,
  onSave,
  onClose,
}: {
  isOpen: boolean
  editingBanner: Banner | null
  nextOrder: number
  onSave: (data: BannerFormData, id?: string) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<BannerFormData>(DEFAULT_FORM)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (editingBanner) {
        setForm({
          title: editingBanner.title,
          image_url: editingBanner.image_url,
          link_url: editingBanner.link_url || '',
          is_active: editingBanner.is_active,
          display_order: editingBanner.display_order,
        })
      } else {
        setForm({ ...DEFAULT_FORM, display_order: nextOrder })
      }
      setUploadError('')
    }
  }, [isOpen, editingBanner, nextOrder])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadBannerImage(file)
      setForm((prev) => ({ ...prev, image_url: url }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '업로드 실패'
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setUploadError('제목을 입력해주세요.')
      return
    }
    if (!form.image_url) {
      setUploadError('이미지를 업로드해주세요.')
      return
    }

    setSaving(true)
    try {
      await onSave(form, editingBanner?.id)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 실패'
      setUploadError(message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] w-full max-w-2xl mx-4 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {editingBanner ? '배너 수정' : '새 배너 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="배너 제목 입력"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-yellow-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              배너 이미지 <span className="text-red-500">*</span>
            </label>

            {form.image_url ? (
              <div className="relative group">
                <div className="relative w-full aspect-[455/420] rounded-xl overflow-hidden border-2 border-slate-200">
                  <img
                    src={form.image_url}
                    alt="배너 미리보기"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
                      className="px-4 py-2 bg-white text-slate-900 font-semibold rounded-lg shadow-lg"
                    >
                      이미지 변경
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  히어로 섹션 미리보기 (실제 홈 표시 비율 ≈ 1:1, 가장자리는 잘릴 수 있음)
                </p>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full aspect-[455/420] rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragOver
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-300 bg-slate-50 hover:border-yellow-400 hover:bg-yellow-50/50'
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">업로드 중...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-7 h-7 text-yellow-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        클릭하거나 드래그하여 업로드
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG, WebP (최대 10MB) / 권장 1:1 정사각 (예: 1080×1080) · 중요 요소는 중앙에 배치 (양옆/위아래 일부 잘림)
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                e.target.value = ''
              }}
              className="hidden"
            />
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              링크 URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.link_url}
                onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
                placeholder="/programs/idol-image"
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-yellow-400 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              배너 클릭 시 이동할 경로 (비워두면 클릭 불가)
            </p>
          </div>

          {/* Active Toggle + Display Order */}
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                노출 순서
              </label>
              <input
                type="number"
                min={0}
                value={form.display_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-yellow-400 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                활성 상태
              </label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                className={`w-full py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.is_active
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {form.is_active ? (
                  <>
                    <Eye className="w-4 h-4" /> 활성
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" /> 비활성
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {uploadError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="px-6 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {editingBanner ? '수정 완료' : '배너 추가'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ======================
// Hero Preview
// ======================
function HeroPreview({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)
  const activeBanners = banners.filter((b) => b.is_active).sort((a, b) => a.display_order - b.display_order)

  useEffect(() => {
    setCurrent(0)
  }, [activeBanners.length])

  if (activeBanners.length === 0) {
    return (
      <div className="w-full aspect-[455/420] bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">활성 배너가 없습니다</p>
        </div>
      </div>
    )
  }

  const safeIndex = current >= activeBanners.length ? 0 : current

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[455/420] rounded-xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-slate-900">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeBanners[safeIndex].id}
            src={activeBanners[safeIndex].image_url}
            alt={activeBanners[safeIndex].title}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>

        {/* Title Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <span className="text-white font-bold text-sm drop-shadow-lg">
            {activeBanners[safeIndex].title}
          </span>
          {activeBanners[safeIndex].link_url && (
            <span className="text-white/70 text-xs flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              {activeBanners[safeIndex].link_url}
            </span>
          )}
        </div>

        {/* Nav Arrows */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((p) => (p === 0 ? activeBanners.length - 1 : p - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-900" />
            </button>
            <button
              onClick={() => setCurrent((p) => (p + 1) % activeBanners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-900" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {activeBanners.length > 1 && (
        <div className="flex justify-center gap-2">
          {activeBanners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full border border-slate-900 transition-all ${
                i === safeIndex ? 'bg-yellow-400 scale-125' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ======================
// Banner Card
// ======================
function BannerCard({
  banner,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  banner: Banner
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div
      className={`group relative bg-white rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${
        banner.is_active ? 'border-slate-900' : 'border-slate-200 opacity-70'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[455/420] bg-slate-100">
        <img
          src={banner.image_url}
          alt={banner.title}
          className="w-full h-full object-cover"
        />
        {/* Order Badge */}
        <div className="absolute top-2 left-2 w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-md">
          {banner.display_order}
        </div>
        {/* Active Badge */}
        <div
          className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
            banner.is_active
              ? 'bg-green-500 text-white'
              : 'bg-slate-500 text-white'
          }`}
        >
          {banner.is_active ? (
            <>
              <Eye className="w-3 h-3" /> 활성
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" /> 비활성
            </>
          )}
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Title overlay */}
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-white font-bold text-base drop-shadow-lg truncate">
            {banner.title}
          </h3>
          {banner.link_url && (
            <p className="text-white/70 text-xs mt-0.5 truncate flex items-center gap-1">
              <LinkIcon className="w-3 h-3 flex-shrink-0" />
              {banner.link_url}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5 flex items-center justify-between border-t border-slate-100">
        <div className="flex items-center gap-1">
          <GripVertical className="w-4 h-4 text-slate-300" />
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="위로 이동"
          >
            <ArrowUp className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="아래로 이동"
          >
            <ArrowDown className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              banner.is_active
                ? 'hover:bg-orange-50 text-orange-500'
                : 'hover:bg-green-50 text-green-500'
            }`}
            title={banner.is_active ? '비활성화' : '활성화'}
          >
            {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
            title="수정"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================
// Main Page
// ======================
export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }, [])

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_banners')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setBanners(data || [])
    } catch (err) {
      console.error('Failed to fetch banners:', err)
      showToast('배너 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  // Next display_order
  const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.display_order)) + 1 : 0

  // Save (create / update)
  const handleSave = async (formData: BannerFormData, id?: string) => {
    const payload = {
      title: formData.title.trim(),
      image_url: formData.image_url,
      link_url: formData.link_url.trim() || null,
      is_active: formData.is_active,
      display_order: formData.display_order,
      updated_at: new Date().toISOString(),
    }

    if (id) {
      const { error } = await supabase.from('admin_banners').update(payload).eq('id', id)
      if (error) throw error
      showToast('배너가 수정되었습니다.')
    } else {
      const { error } = await supabase.from('admin_banners').insert({
        ...payload,
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      showToast('새 배너가 추가되었습니다.')
    }

    await fetchBanners()
  }

  // Delete
  const handleDelete = async () => {
    if (!deletingBanner) return
    try {
      const { error } = await supabase
        .from('admin_banners')
        .delete()
        .eq('id', deletingBanner.id)
      if (error) throw error

      // Try to delete image from storage (best-effort)
      try {
        const url = new URL(deletingBanner.image_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/admin-content\/(.+)/)
        if (pathMatch) {
          await supabase.storage.from('admin-content').remove([pathMatch[1]])
        }
      } catch {
        // Ignore storage cleanup errors
      }

      showToast('배너가 삭제되었습니다.')
      setDeletingBanner(null)
      await fetchBanners()
    } catch (err) {
      console.error('Delete failed:', err)
      showToast('삭제에 실패했습니다.')
    }
  }

  // Toggle active
  const handleToggle = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('admin_banners')
        .update({
          is_active: !banner.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', banner.id)
      if (error) throw error
      showToast(banner.is_active ? '배너가 비활성화되었습니다.' : '배너가 활성화되었습니다.')
      await fetchBanners()
    } catch (err) {
      console.error('Toggle failed:', err)
      showToast('상태 변경에 실패했습니다.')
    }
  }

  // Batch toggle
  const handleBatchToggle = async (active: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_banners')
        .update({
          is_active: active,
          updated_at: new Date().toISOString(),
        })
        .neq('is_active', active)
      if (error) throw error
      showToast(active ? '모든 배너를 활성화했습니다.' : '모든 배너를 비활성화했습니다.')
      await fetchBanners()
    } catch (err) {
      console.error('Batch toggle failed:', err)
      showToast('일괄 변경에 실패했습니다.')
    }
  }

  // Reorder: swap display_order with neighbor
  const handleReorder = async (banner: Banner, direction: 'up' | 'down') => {
    const sorted = [...banners].sort((a, b) => a.display_order - b.display_order)
    const index = sorted.findIndex((b) => b.id === banner.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const current = sorted[index]
    const neighbor = sorted[swapIndex]

    try {
      const { error: e1 } = await supabase
        .from('admin_banners')
        .update({ display_order: neighbor.display_order, updated_at: new Date().toISOString() })
        .eq('id', current.id)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('admin_banners')
        .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
        .eq('id', neighbor.id)
      if (e2) throw e2

      await fetchBanners()
    } catch (err) {
      console.error('Reorder failed:', err)
      showToast('순서 변경에 실패했습니다.')
    }
  }

  // Open modal
  const openCreate = () => {
    setEditingBanner(null)
    setModalOpen(true)
  }

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setModalOpen(true)
  }

  const sorted = [...banners].sort((a, b) => a.display_order - b.display_order)
  const activeCount = banners.filter((b) => b.is_active).length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="배너 관리"
        subtitle={`총 ${banners.length}개 배너 / ${activeCount}개 활성`}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] transition-all"
          >
            <Plus className="w-4 h-4" />
            새 배너 추가
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Hero Preview Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">히어로 미리보기</h2>
              <p className="text-sm text-slate-500">실제 메인 페이지에 표시되는 모습입니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBatchToggle(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> 전체 활성
              </button>
              <button
                onClick={() => handleBatchToggle(false)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" /> 전체 비활성
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <HeroPreview banners={banners} />
          </div>
        </section>

        {/* Banner List */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            배너 목록
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium mb-1">등록된 배너가 없습니다</p>
              <p className="text-slate-400 text-sm mb-6">새 배너를 추가하여 메인 페이지를 꾸며보세요.</p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] transition-all"
              >
                <Plus className="w-4 h-4" />
                첫 배너 추가하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((banner, index) => (
                <BannerCard
                  key={banner.id}
                  banner={banner}
                  isFirst={index === 0}
                  isLast={index === sorted.length - 1}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => setDeletingBanner(banner)}
                  onToggle={() => handleToggle(banner)}
                  onMoveUp={() => handleReorder(banner, 'up')}
                  onMoveDown={() => handleReorder(banner, 'down')}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <BannerFormModal
            isOpen={modalOpen}
            editingBanner={editingBanner}
            nextOrder={nextOrder}
            onSave={handleSave}
            onClose={() => {
              setModalOpen(false)
              setEditingBanner(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deletingBanner && (
          <DeleteConfirmModal
            banner={deletingBanner}
            onConfirm={handleDelete}
            onCancel={() => setDeletingBanner(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-slate-900 text-white font-medium rounded-xl shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-yellow-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
