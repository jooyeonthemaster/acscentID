'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Ticket,
} from 'lucide-react'
import type { Promotion } from '@/types/promotion'

// ======================
// Types
// ======================
interface PromotionFormData {
  name: string
  type: 'free_shipping'
  description: string
  is_active: boolean
  min_order_amount: string
  start_date: string
  end_date: string
}

const DEFAULT_FORM: PromotionFormData = {
  name: '',
  type: 'free_shipping',
  description: '',
  is_active: true,
  min_order_amount: '',
  start_date: '',
  end_date: '',
}

const TYPE_LABELS: Record<string, string> = {
  free_shipping: '배송비 무료',
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '조건 없음'
  return `${amount.toLocaleString('ko-KR')}원 이상`
}

// ======================
// Delete Confirmation Modal
// ======================
function DeleteConfirmModal({
  promotion,
  onConfirm,
  onCancel,
}: {
  promotion: Promotion
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
          <h3 className="text-lg font-bold text-slate-900">프로모션 삭제</h3>
        </div>
        <p className="text-slate-600 mb-2">
          다음 프로모션을 정말 삭제하시겠습니까?
        </p>
        <div className="bg-slate-50 rounded-lg p-3 mb-6 border border-slate-200">
          <p className="font-semibold text-slate-900">{promotion.name}</p>
          <p className="text-sm text-slate-500 mt-1">
            {TYPE_LABELS[promotion.type] || promotion.type}
          </p>
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
function PromotionFormModal({
  isOpen,
  editingPromotion,
  onSave,
  onClose,
}: {
  isOpen: boolean
  editingPromotion: Promotion | null
  onSave: (data: PromotionFormData, id?: string) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<PromotionFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (editingPromotion) {
        setForm({
          name: editingPromotion.name,
          type: editingPromotion.type,
          description: editingPromotion.description || '',
          is_active: editingPromotion.is_active,
          min_order_amount:
            editingPromotion.min_order_amount !== null
              ? String(editingPromotion.min_order_amount)
              : '',
          start_date: editingPromotion.start_date
            ? editingPromotion.start_date.slice(0, 16)
            : '',
          end_date: editingPromotion.end_date
            ? editingPromotion.end_date.slice(0, 16)
            : '',
        })
      } else {
        setForm({ ...DEFAULT_FORM })
      }
      setError('')
    }
  }, [isOpen, editingPromotion])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('프로모션 이름을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      await onSave(form, editingPromotion?.id)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 실패'
      setError(message)
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
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] w-full max-w-lg mx-4 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {editingPromotion ? '프로모션 수정' : '새 프로모션 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              프로모션 이름
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 오픈 기념 배송비 무료"
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors text-slate-900"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              프로모션 타입
            </label>
            <div className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-600">
              배송비 무료
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              활성화
            </label>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
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

          {/* Min Order Amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              최소 주문 금액
            </label>
            <input
              type="number"
              value={form.min_order_amount}
              onChange={(e) =>
                setForm({ ...form, min_order_amount: e.target.value })
              }
              placeholder="비워두면 조건 없음"
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors text-slate-900"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              비워두면 모든 주문에 배송비 무료가 적용됩니다
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              시작일
            </label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors text-slate-900"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              종료일
            </label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors text-slate-900"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : editingPromotion ? (
              '수정'
            ) : (
              '추가'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ======================
// Main Page
// ======================
export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/promotions')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPromotions(data.promotions || [])
    } catch (err) {
      console.error('프로모션 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const handleSave = async (formData: PromotionFormData, id?: string) => {
    const body = {
      ...(id ? { id } : {}),
      type: formData.type,
      name: formData.name,
      description: formData.description || null,
      is_active: formData.is_active,
      min_order_amount: formData.min_order_amount
        ? Number(formData.min_order_amount)
        : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    }

    const res = await fetch('/api/admin/promotions', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '저장 실패')
    }

    await fetchPromotions()
  }

  const handleDelete = async () => {
    if (!deletingPromotion) return
    try {
      const res = await fetch(
        `/api/admin/promotions?id=${deletingPromotion.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('삭제 실패')
      await fetchPromotions()
    } catch (err) {
      console.error('프로모션 삭제 실패:', err)
    } finally {
      setDeletingPromotion(null)
    }
  }

  const handleToggleActive = async (promotion: Promotion) => {
    setTogglingId(promotion.id)
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promotion.id,
          is_active: !promotion.is_active,
        }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      await fetchPromotions()
    } catch (err) {
      console.error('상태 변경 실패:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const openCreate = () => {
    setEditingPromotion(null)
    setModalOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="프로모션 관리"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-slate-600" />
            <span className="text-sm text-slate-600 font-medium">
              총 {promotions.length}개
            </span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            프로모션 추가
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              등록된 프로모션이 없습니다
            </p>
            <p className="text-sm text-slate-400 mt-1">
              첫 번째 프로모션을 추가해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {promotions.map((promo) => (
                <motion.div
                  key={promo.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                          {promo.name}
                        </h3>
                        {/* Type Badge */}
                        <span className="flex-shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          {TYPE_LABELS[promo.type] || promo.type}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            promo.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {promo.is_active ? '활성' : '비활성'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>
                          최소 금액: {formatCurrency(promo.min_order_amount)}
                        </span>
                        <span>
                          기간: {formatDateTime(promo.start_date)} ~{' '}
                          {formatDateTime(promo.end_date)}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingId === promo.id}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          promo.is_active ? 'bg-green-500' : 'bg-slate-300'
                        } ${togglingId === promo.id ? 'opacity-50' : ''}`}
                        title={promo.is_active ? '비활성화' : '활성화'}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            promo.is_active
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => openEdit(promo)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </button>

                      <button
                        onClick={() => setDeletingPromotion(promo)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen && (
          <PromotionFormModal
            isOpen={modalOpen}
            editingPromotion={editingPromotion}
            onSave={handleSave}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingPromotion && (
          <DeleteConfirmModal
            promotion={deletingPromotion}
            onConfirm={handleDelete}
            onCancel={() => setDeletingPromotion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
