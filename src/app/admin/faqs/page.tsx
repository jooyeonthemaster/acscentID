'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { loadFaqs, saveFaqs, type FAQItem } from '@/lib/faq/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Search,
  MessageSquare,
  Tag,
} from 'lucide-react'

interface FAQFormData {
  category: string
  question: string
  answer: string
  is_active: boolean
}

const DEFAULT_FORM: FAQFormData = {
  category: '',
  question: '',
  answer: '',
  is_active: true,
}

const ALL = '__all__'

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ========================================
// Delete Confirmation Modal
// ========================================
function DeleteConfirmModal({
  faq,
  onConfirm,
  onCancel,
  loading,
}: {
  faq: FAQItem
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
          <h3 className="text-lg font-bold text-slate-900">FAQ 삭제</h3>
        </div>
        <p className="text-slate-600 mb-1">다음 FAQ를 삭제하시겠습니까?</p>
        <p className="text-sm font-medium text-slate-900 mb-6 bg-slate-50 p-3 rounded-lg line-clamp-3">
          &ldquo;{faq.question}&rdquo;
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
// Create/Edit Modal
// ========================================
function FAQFormModal({
  isOpen,
  editingFaq,
  categories,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  editingFaq: FAQItem | null
  categories: string[]
  onClose: () => void
  onSubmit: (data: FAQFormData) => Promise<void>
}) {
  const [form, setForm] = useState<FAQFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (editingFaq) {
        setForm({
          category: editingFaq.category,
          question: editingFaq.question,
          answer: editingFaq.answer,
          is_active: editingFaq.is_active,
        })
      } else {
        setForm({ ...DEFAULT_FORM, category: categories[0] ?? '' })
      }
      setErrors({})
    }
  }, [isOpen, editingFaq, categories])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.category.trim()) newErrors.category = '카테고리를 입력해주세요.'
    if (!form.question.trim()) newErrors.question = '질문을 입력해주세요.'
    if (!form.answer.trim()) newErrors.answer = '답변을 입력해주세요.'
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
    } catch (err) {
      setErrors({ _general: err instanceof Error ? err.message : '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof FAQFormData>(key: K, value: FAQFormData[K]) => {
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
          <h2 className="text-xl font-bold text-slate-900">{editingFaq ? 'FAQ 수정' : '새 FAQ 작성'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="faq-category-list"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="예: 주문/결제"
              className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none
                ${errors.category ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
            />
            <datalist id="faq-category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-slate-400 mt-1">같은 카테고리끼리 공개 페이지에서 탭으로 묶여 표시됩니다</p>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              질문 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => updateField('question', e.target.value)}
              placeholder="질문을 입력하세요"
              className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none
                ${errors.question ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
            />
            {errors.question && <p className="text-xs text-red-500 mt-1">{errors.question}</p>}
          </div>

          {/* Answer */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              답변 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.answer}
              onChange={(e) => updateField('answer', e.target.value)}
              placeholder="답변을 입력하세요. 줄바꿈은 그대로 표시됩니다."
              rows={6}
              className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm transition-colors outline-none resize-none
                ${errors.answer ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-yellow-400'}`}
            />
            {errors.answer && <p className="text-xs text-red-500 mt-1">{errors.answer}</p>}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-slate-700">공개 상태</span>
              <p className="text-xs text-slate-500 mt-0.5">비공개 시 FAQ 페이지에 표시되지 않습니다</p>
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
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editingFaq ? '수정' : '등록'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ========================================
// FAQ Row Component
// ========================================
function FAQRow({
  faq,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  faq: FAQItem
  index: number
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-4">
        {/* Top Row */}
        <div className="flex items-start gap-3">
          {/* Order Controls */}
          <div className="flex flex-col items-center border-2 border-slate-200 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="위로 이동"
            >
              <ChevronUp className="w-4 h-4 text-slate-600" />
            </button>
            <div className="h-px w-5 bg-slate-200" />
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="아래로 이동"
            >
              <ChevronDown className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <button onClick={() => setExpanded((v) => !v)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                <Tag className="w-3 h-3" />
                {faq.category}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  faq.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {faq.is_active ? '공개' : '비공개'}
              </span>
              <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate">{faq.question}</h3>
            <p className={`text-sm text-slate-500 mt-1 whitespace-pre-line ${expanded ? '' : 'line-clamp-1'}`}>
              {faq.answer}
            </p>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-end">
          <button
            onClick={onToggleActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
              faq.is_active
                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {faq.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {faq.is_active ? '공개' : '비공개'}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            수정
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ========================================
// Main Page Component
// ========================================
export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>(ALL)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FAQItem | null>(null)

  // ---- Fetch ----
  useEffect(() => {
    let cancelled = false
    loadFaqs(true)
      .then((data) => {
        if (!cancelled) setFaqs(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 변경된 전체 목록을 저장하고 화면 상태도 갱신
  const persist = useCallback(async (next: FAQItem[]) => {
    setSaving(true)
    try {
      await saveFaqs(next)
      setFaqs(next)
    } catch (err) {
      console.error('Failed to save faqs:', err)
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [])

  // ---- Categories (in list order, first-appearance) ----
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const f of faqs) if (!seen.includes(f.category)) seen.push(f.category)
    return seen
  }, [faqs])

  // ---- Create / Update ----
  const handleSubmitForm = async (formData: FAQFormData) => {
    const clean = {
      category: formData.category.trim(),
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      is_active: formData.is_active,
    }
    const next = editingFaq
      ? faqs.map((f) => (f.id === editingFaq.id ? { ...f, ...clean } : f))
      : [...faqs, { id: newId(), ...clean }]
    await persist(next)
  }

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return
    const next = faqs.filter((f) => f.id !== deleteTarget.id)
    await persist(next)
    setDeleteTarget(null)
  }

  // ---- Toggle Active ----
  const handleToggleActive = async (faq: FAQItem) => {
    const next = faqs.map((f) => (f.id === faq.id ? { ...f, is_active: !f.is_active } : f))
    await persist(next)
  }

  // ---- Reorder (operates on the full list using the visible neighbour) ----
  const handleMove = async (faqId: string, direction: 'up' | 'down') => {
    // 현재 보이는 목록 기준으로 이웃을 찾고, 전체 배열에서 두 항목의 위치를 맞바꾼다.
    const visIdx = visibleFaqs.findIndex((f) => f.id === faqId)
    const neighbour = visibleFaqs[direction === 'up' ? visIdx - 1 : visIdx + 1]
    if (!neighbour) return

    const next = [...faqs]
    const a = next.findIndex((f) => f.id === faqId)
    const b = next.findIndex((f) => f.id === neighbour.id)
    if (a < 0 || b < 0) return
    ;[next[a], next[b]] = [next[b], next[a]]
    await persist(next)
  }

  // ---- Filter ----
  const visibleFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return faqs
      .filter((f) => (activeCategory === ALL ? true : f.category === activeCategory))
      .filter((f) => (q ? `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(q) : true))
  }, [faqs, activeCategory, searchQuery])

  // Stats
  const totalCount = faqs.length
  const activeCount = faqs.filter((f) => f.is_active).length
  const categoryCount = categories.length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="FAQ 관리"
        subtitle="FAQ 페이지에 표시되는 자주 묻는 질문을 게시판처럼 관리합니다"
        actions={
          <button
            onClick={() => {
              setEditingFaq(null)
              setFormModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-slate-900 text-slate-900 font-bold text-sm rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />새 FAQ
          </button>
        }
      />

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500">전체 FAQ</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              <p className="text-xs text-slate-500">공개 중</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{categoryCount}</p>
              <p className="text-xs text-slate-500">카테고리</p>
            </div>
          </div>
        </div>

        {/* Category Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
            <button
              onClick={() => setActiveCategory(ALL)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 whitespace-nowrap transition-colors ${
                activeCategory === ALL
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 whitespace-nowrap transition-colors ${
                  activeCategory === c
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="FAQ 검색..."
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

        {saving && (
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            저장 중...
          </div>
        )}

        {/* FAQ List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : visibleFaqs.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-400 mb-2">
              {searchQuery || activeCategory !== ALL ? '조건에 맞는 FAQ가 없습니다' : '등록된 FAQ가 없습니다'}
            </p>
            {!searchQuery && activeCategory === ALL && (
              <button
                onClick={() => {
                  setEditingFaq(null)
                  setFormModalOpen(true)
                }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-slate-900 text-slate-900 font-bold text-sm rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />첫 FAQ 작성하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleFaqs.map((faq, idx) => (
                <FAQRow
                  key={faq.id}
                  faq={faq}
                  index={idx}
                  onEdit={() => {
                    setEditingFaq(faq)
                    setFormModalOpen(true)
                  }}
                  onDelete={() => setDeleteTarget(faq)}
                  onToggleActive={() => handleToggleActive(faq)}
                  onMoveUp={() => handleMove(faq.id, 'up')}
                  onMoveDown={() => handleMove(faq.id, 'down')}
                  isFirst={idx === 0}
                  isLast={idx === visibleFaqs.length - 1}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {formModalOpen && (
          <FAQFormModal
            isOpen={formModalOpen}
            editingFaq={editingFaq}
            categories={categories}
            onClose={() => {
              setFormModalOpen(false)
              setEditingFaq(null)
            }}
            onSubmit={handleSubmitForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            faq={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={saving}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
