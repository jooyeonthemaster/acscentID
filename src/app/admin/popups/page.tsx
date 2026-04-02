'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Search,
} from 'lucide-react'

import { ImageCropUploader, AspectRatioSelector, type AspectRatioOption } from './ImageCropUploader'

// ========================================
// Types
// ========================================
interface Popup {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string | null
  link_text: string | null
  is_active: boolean
  start_date: string
  end_date: string | null
  display_order: number
  image_aspect_ratio: string
  created_at: string
  updated_at: string
}

interface PopupFormData {
  title: string
  description: string
  image_url: string
  link_url: string
  link_text: string
  is_active: boolean
  start_date: string
  end_date: string
  display_order: number
  image_aspect_ratio: AspectRatioOption
}

const DEFAULT_FORM: PopupFormData = {
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  link_text: '',
  is_active: true,
  start_date: new Date().toISOString().slice(0, 16),
  end_date: '',
  display_order: 0,
  image_aspect_ratio: '4/5',
}

// ========================================
// Helpers
// ========================================
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isCurrentlyActive = (popup: Popup): boolean => {
  if (!popup.is_active) return false
  const now = new Date()
  const start = new Date(popup.start_date)
  if (now < start) return false
  if (popup.end_date && now > new Date(popup.end_date)) return false
  return true
}

// ========================================
// Delete Confirmation Modal
// ========================================
function DeleteConfirmModal({
  popup,
  onConfirm,
  onCancel,
  loading,
}: {
  popup: Popup
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">팝업 삭제</h3>
        </div>
        <p className="text-slate-600 mb-1">
          다음 팝업을 삭제하시겠습니까?
        </p>
        <p className="text-sm font-medium text-slate-900 mb-6 bg-slate-50 p-3 rounded-lg">
          &ldquo;{popup.title}&rdquo;
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            삭제
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ========================================
// Preview Modal (Main Page Popup Preview)
// ========================================
function PreviewModal({
  popup,
  onClose,
}: {
  popup: Popup
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-2xl max-w-[420px] w-full mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popup Image */}
        {popup.image_url && (
          <div className={`relative w-full bg-slate-100 ${
            popup.image_aspect_ratio === '16/9' ? 'aspect-[16/9]' :
            popup.image_aspect_ratio === '1/1' ? 'aspect-square' :
            popup.image_aspect_ratio === '3/4' ? 'aspect-[3/4]' :
            popup.image_aspect_ratio === '4/5' ? 'aspect-[4/5]' :
            'aspect-[4/5]'
          }`}>
            <Image
              src={popup.image_url}
              alt={popup.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{popup.title}</h2>
          {popup.description && (
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{popup.description}</p>
          )}

          {/* CTA Button */}
          {popup.link_url && (
            <a
              href={popup.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-center rounded-xl transition-colors mb-3"
            >
              {popup.link_text || '자세히 보기'}
            </a>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
              오늘 하루 보지 않기
            </button>
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              닫기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ========================================
// Create/Edit Modal
// ========================================
function PopupFormModal({
  isOpen,
  editingPopup,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  editingPopup: Popup | null
  onClose: () => void
  onSubmit: (data: PopupFormData) => Promise<void>
}) {
  const [form, setForm] = useState<PopupFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (editingPopup) {
        setForm({
          title: editingPopup.title,
          description: editingPopup.description || '',
          image_aspect_ratio: (editingPopup.image_aspect_ratio || '4/5') as AspectRatioOption,
          image_url: editingPopup.image_url || '',
          link_url: editingPopup.link_url || '',
          link_text: editingPopup.link_text || '',
          is_active: editingPopup.is_active,
          start_date: editingPopup.start_date
            ? new Date(editingPopup.start_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          end_date: editingPopup.end_date
            ? new Date(editingPopup.end_date).toISOString().slice(0, 16)
            : '',
          display_order: editingPopup.display_order,
        })
      } else {
        setForm({ ...DEFAULT_FORM, start_date: new Date().toISOString().slice(0, 16) })
      }
      setErrors({})
    }
  }, [isOpen, editingPopup])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title.trim()) newErrors.title = '제목을 입력해주세요.'
    if (!form.start_date) newErrors.start_date = '시작일을 선택해주세요.'
    if (form.end_date && form.start_date && new Date(form.end_date) <= new Date(form.start_date)) {
      newErrors.end_date = '종료일은 시작일 이후여야 합니다.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit(form)
      onClose()
    } catch (err: any) {
      setErrors({ _general: err.message || '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof PopupFormData>(key: K, value: PopupFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">
            {editingPopup ? '팝업 수정' : '새 팝업 생성'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {errors._general && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
              {errors._general}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="팝업 제목을 입력하세요"
              className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none
                ${errors.title ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="팝업 설명을 입력하세요 (선택)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-yellow-400 text-sm transition-colors outline-none resize-none"
            />
          </div>

          {/* Aspect Ratio Selector */}
          <AspectRatioSelector
            value={form.image_aspect_ratio}
            onChange={(v) => updateField('image_aspect_ratio', v)}
          />

          {/* Image Upload with Crop */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">이미지</label>
            <ImageCropUploader
              imageUrl={form.image_url}
              aspectRatio={form.image_aspect_ratio}
              onUpload={(url) => updateField('image_url', url)}
              onRemove={() => updateField('image_url', '')}
            />
          </div>

          {/* Link URL & Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">링크 URL</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => updateField('link_url', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-yellow-400 text-sm transition-colors outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">링크 텍스트</label>
              <input
                type="text"
                value={form.link_text}
                onChange={(e) => updateField('link_text', e.target.value)}
                placeholder="자세히 보기"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-yellow-400 text-sm transition-colors outline-none"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-slate-700">활성 상태</span>
              <p className="text-xs text-slate-500 mt-0.5">비활성 시 메인 페이지에 표시되지 않습니다</p>
            </div>
            <button
              type="button"
              onClick={() => updateField('is_active', !form.is_active)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.is_active ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none
                  ${errors.start_date ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
              />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                종료일 <span className="text-slate-400 text-xs font-normal">(선택)</span>
              </label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none
                  ${errors.end_date ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
              />
              {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
              <p className="text-xs text-slate-400 mt-1">비워두면 무기한 표시됩니다</p>
            </div>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">표시 순서</label>
            <input
              type="number"
              min={0}
              value={form.display_order}
              onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
              className="w-32 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-yellow-400 text-sm transition-colors outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">숫자가 낮을수록 먼저 표시됩니다</p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-bold rounded-xl bg-yellow-400 hover:bg-yellow-500 border-2 border-slate-900 text-slate-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {editingPopup ? '수정' : '생성'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ========================================
// Popup Card Component
// ========================================
function PopupCard({
  popup,
  onEdit,
  onDelete,
  onToggleActive,
  onPreview,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  popup: Popup
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onPreview: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const active = isCurrentlyActive(popup)
  const scheduled = popup.is_active && new Date(popup.start_date) > new Date()
  const expired = popup.is_active && popup.end_date && new Date(popup.end_date) < new Date()

  const statusLabel = !popup.is_active
    ? '비활성'
    : expired
      ? '만료됨'
      : scheduled
        ? '예약됨'
        : active
          ? '표시 중'
          : '비활성'

  const statusColor = !popup.is_active
    ? 'bg-slate-100 text-slate-600'
    : expired
      ? 'bg-red-50 text-red-600'
      : scheduled
        ? 'bg-blue-50 text-blue-600'
        : active
          ? 'bg-green-50 text-green-700'
          : 'bg-slate-100 text-slate-600'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Thumbnail */}
        <div className="sm:w-48 w-full h-36 sm:h-auto relative bg-slate-100 shrink-0">
          {popup.image_url ? (
            <Image
              src={popup.image_url}
              alt={popup.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-slate-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            {/* Title Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate">{popup.title}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">#{popup.display_order}</span>
                </div>
                {popup.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{popup.description}</p>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(popup.start_date)}
                {popup.end_date ? ` ~ ${formatDate(popup.end_date)}` : ' ~'}
              </span>
              {popup.link_url && (
                <span className="flex items-center gap-1 text-blue-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{popup.link_url}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {/* Order Controls */}
            <div className="flex items-center border-2 border-slate-200 rounded-lg overflow-hidden mr-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1.5 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="위로 이동"
              >
                <ChevronUp className="w-4 h-4 text-slate-600" />
              </button>
              <div className="w-px h-5 bg-slate-200" />
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1.5 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="아래로 이동"
              >
                <ChevronDown className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Toggle Active */}
            <button
              onClick={onToggleActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                popup.is_active
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {popup.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {popup.is_active ? '활성' : '비활성'}
            </button>

            {/* Preview */}
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              미리보기
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              수정
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ========================================
// Main Page Component
// ========================================
export default function AdminPopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Popup | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [previewPopup, setPreviewPopup] = useState<Popup | null>(null)

  // ---- Fetch ----
  const fetchPopups = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_popups')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setPopups(data || [])
    } catch (err) {
      console.error('Failed to fetch popups:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPopups()
  }, [fetchPopups])

  // ---- Create / Update ----
  const handleSubmitForm = async (formData: PopupFormData) => {
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      image_url: formData.image_url || null,
      link_url: formData.link_url.trim() || null,
      link_text: formData.link_text.trim() || null,
      is_active: formData.is_active,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      display_order: formData.display_order,
      image_aspect_ratio: formData.image_aspect_ratio,
      updated_at: new Date().toISOString(),
    }

    if (editingPopup) {
      const { error } = await supabase
        .from('admin_popups')
        .update(payload)
        .eq('id', editingPopup.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('admin_popups')
        .insert({ ...payload, created_at: new Date().toISOString() })
      if (error) throw error
    }

    await fetchPopups()
  }

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      // Delete image from storage if exists
      if (deleteTarget.image_url) {
        try {
          const url = new URL(deleteTarget.image_url)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/admin-content\/(.+)/)
          if (pathMatch) {
            await supabase.storage.from('admin-content').remove([pathMatch[1]])
          }
        } catch {
          // Ignore storage deletion errors
        }
      }

      const { error } = await supabase
        .from('admin_popups')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error

      setDeleteTarget(null)
      await fetchPopups()
    } catch (err) {
      console.error('Failed to delete popup:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  // ---- Toggle Active ----
  const handleToggleActive = async (popup: Popup) => {
    const { error } = await supabase
      .from('admin_popups')
      .update({
        is_active: !popup.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', popup.id)

    if (error) {
      console.error('Failed to toggle active:', error)
      return
    }
    await fetchPopups()
  }

  // ---- Reorder ----
  const handleReorder = async (popupId: string, direction: 'up' | 'down') => {
    const sorted = [...popups].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex((p) => p.id === popupId)
    if (idx < 0) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const currentOrder = sorted[idx].display_order
    const swapOrder = sorted[swapIdx].display_order

    // If orders are the same, offset them
    const newCurrentOrder = swapOrder
    const newSwapOrder = currentOrder === swapOrder ? currentOrder + (direction === 'up' ? 1 : -1) : currentOrder

    const updates = [
      supabase
        .from('admin_popups')
        .update({ display_order: newCurrentOrder, updated_at: new Date().toISOString() })
        .eq('id', sorted[idx].id),
      supabase
        .from('admin_popups')
        .update({ display_order: newSwapOrder, updated_at: new Date().toISOString() })
        .eq('id', sorted[swapIdx].id),
    ]

    await Promise.all(updates)
    await fetchPopups()
  }

  // ---- Filter ----
  const filteredPopups = popups.filter((p) =>
    searchQuery
      ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  )

  const sortedPopups = [...filteredPopups].sort((a, b) => a.display_order - b.display_order)

  // Stats
  const activeCount = popups.filter((p) => isCurrentlyActive(p)).length
  const scheduledCount = popups.filter(
    (p) => p.is_active && new Date(p.start_date) > new Date(),
  ).length
  const totalCount = popups.length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="팝업 관리"
        subtitle="메인 페이지에 표시되는 팝업을 관리합니다"
        actions={
          <button
            onClick={() => {
              setEditingPopup(null)
              setFormModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-slate-900 text-slate-900 font-bold text-sm rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 팝업
          </button>
        }
      />

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500">전체 팝업</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              <p className="text-xs text-slate-500">현재 표시 중</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
              <p className="text-xs text-slate-500">예약됨</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="팝업 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-yellow-400 text-sm transition-colors outline-none bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Popup List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : sortedPopups.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-400 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 팝업이 없습니다'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingPopup(null)
                  setFormModalOpen(true)
                }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-slate-900 text-slate-900 font-bold text-sm rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                첫 팝업 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedPopups.map((popup, idx) => (
                <PopupCard
                  key={popup.id}
                  popup={popup}
                  onEdit={() => {
                    setEditingPopup(popup)
                    setFormModalOpen(true)
                  }}
                  onDelete={() => setDeleteTarget(popup)}
                  onToggleActive={() => handleToggleActive(popup)}
                  onPreview={() => setPreviewPopup(popup)}
                  onMoveUp={() => handleReorder(popup.id, 'up')}
                  onMoveDown={() => handleReorder(popup.id, 'down')}
                  isFirst={idx === 0}
                  isLast={idx === sortedPopups.length - 1}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {formModalOpen && (
          <PopupFormModal
            isOpen={formModalOpen}
            editingPopup={editingPopup}
            onClose={() => {
              setFormModalOpen(false)
              setEditingPopup(null)
            }}
            onSubmit={handleSubmitForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            popup={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewPopup && (
          <PreviewModal
            popup={previewPopup}
            onClose={() => setPreviewPopup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
