'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../components/AdminHeader'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  Edit3,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'

interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  display_order: number
  updated_at: string | null
}

interface ProductFormData {
  slug: string
  name: string
  is_active: boolean
  display_order: string
}

const DEFAULT_FORM: ProductFormData = {
  slug: '',
  name: '',
  is_active: false,
  display_order: '0',
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProductCreateModal({
  nextOrder,
  onClose,
  onSave,
}: {
  nextOrder: number
  onClose: () => void
  onSave: (form: ProductFormData) => Promise<void>
}) {
  const [form, setForm] = useState<ProductFormData>({ ...DEFAULT_FORM, display_order: String(nextOrder) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateName = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug ? prev.slug : slugify(name),
    }))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) {
      setError('상품명을 입력해주세요.')
      return
    }
    if (!form.slug.trim()) {
      setError('slug를 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상품 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg rounded-2xl border-2 border-slate-900 bg-white shadow-[6px_6px_0px_#0f172a]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">새 상품 추가</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              추가 후 기본 상세 템플릿이 생성되고 상품 관리 페이지로 이동합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">상품명</label>
            <input
              value={form.name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="예: 여름 한정 퍼퓸"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-colors focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">slug</label>
            <input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
              placeholder="summer-perfume"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">정렬 순서</label>
              <input
                type="number"
                min={0}
                value={form.display_order}
                onChange={(event) => setForm({ ...form, display_order: event.target.value })}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-colors focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">노출 상태</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                  form.is_active
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {form.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {form.is_active ? '활성' : '비활성'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            추가
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const productsRef = useRef<AdminProduct[]>([])
  const originalProductsRef = useRef<AdminProduct[] | null>(null)
  const hasReorderedRef = useRef(false)

  productsRef.current = products

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '상품 목록 조회 실패')
      setProducts((json.products ?? []) as AdminProduct[])
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상품 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchProducts()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchProducts])

  const nextOrder = useMemo(() => {
    if (products.length === 0) return 0
    return Math.max(...products.map((product) => product.display_order)) + 1
  }, [products])

  const goToProduct = (slug: string) => {
    router.push(`/admin/products/${slug}`)
  }

  const moveProduct = useCallback((dragSlug: string, targetSlug: string) => {
    if (dragSlug === targetSlug) return

    setProducts((current) => {
      const fromIndex = current.findIndex((product) => product.slug === dragSlug)
      const toIndex = current.findIndex((product) => product.slug === targetSlug)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      hasReorderedRef.current = true

      return next.map((product, index) => ({
        ...product,
        display_order: index,
      }))
    })
  }, [])

  const persistProductOrder = useCallback(async () => {
    if (!hasReorderedRef.current) {
      setDraggingSlug(null)
      originalProductsRef.current = null
      return
    }

    const orderedProducts = productsRef.current.map((product, index) => ({
      ...product,
      display_order: index,
    }))
    const originalProducts = originalProductsRef.current
    const originalOrderMap = new Map(originalProducts?.map((product) => [product.slug, product.display_order]) ?? [])
    const changedProducts = orderedProducts.filter((product) => originalOrderMap.get(product.slug) !== product.display_order)

    setProducts(orderedProducts)
    setDraggingSlug(null)

    if (changedProducts.length === 0) {
      hasReorderedRef.current = false
      originalProductsRef.current = null
      return
    }

    setSavingOrder(true)
    try {
      await Promise.all(changedProducts.map(async (product) => {
        const res = await fetch('/api/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: product.slug,
            display_order: product.display_order,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || '상품 순서 저장 실패')
      }))
      showToast('상품 순서가 저장되었습니다')
    } catch (error) {
      if (originalProducts) setProducts(originalProducts)
      showToast(error instanceof Error ? error.message : '상품 순서 저장 실패')
    } finally {
      setSavingOrder(false)
      hasReorderedRef.current = false
      originalProductsRef.current = null
    }
  }, [showToast])

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, slug: string) => {
    if (savingOrder) {
      event.preventDefault()
      return
    }

    originalProductsRef.current = productsRef.current
    hasReorderedRef.current = false
    setDraggingSlug(slug)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', slug)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetSlug: string) => {
    const dragSlug = draggingSlug || event.dataTransfer.getData('text/plain')
    if (!dragSlug) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    moveProduct(dragSlug, targetSlug)
  }

  const handleDragEnd = () => {
    persistProductOrder()
  }

  const handleCreate = async (form: ProductFormData) => {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: form.slug,
        name: form.name.trim(),
        is_active: form.is_active,
        display_order: Number(form.display_order),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '상품 추가 실패')
    const slug = json.product?.slug || form.slug
    router.push(`/admin/products/${slug}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="상품 관리"
        subtitle="상품을 선택하면 기본정보, 이미지, 상세페이지 관리 화면으로 이동합니다"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              disabled={savingOrder}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${savingOrder ? 'animate-spin' : ''}`} />
              {savingOrder ? '순서 저장 중' : '새로고침'}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              상품 추가
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl p-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">등록된 상품이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500">
              <div className="col-span-1 text-center">이동</div>
              <div className="col-span-3">상품</div>
              <div className="col-span-3">slug</div>
              <div className="col-span-1 text-center">순서</div>
              <div className="col-span-2 text-center">상태</div>
              <div className="col-span-1">수정일</div>
              <div className="col-span-1 text-right">관리</div>
            </div>

            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <div
                  key={product.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToProduct(product.slug)}
                  onDragOver={(event) => handleDragOver(event, product.slug)}
                  onDrop={(event) => {
                    event.preventDefault()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      goToProduct(product.slug)
                    }
                  }}
                  className={`grid cursor-pointer grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-yellow-50 ${
                    product.is_active ? '' : 'opacity-70'
                  } ${
                    draggingSlug === product.slug ? 'bg-yellow-100 opacity-90 shadow-[inset_4px_0_0_#facc15]' : ''
                  }`}
                >
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      draggable={!savingOrder}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleDragStart(event, product.slug)}
                      onDragEnd={handleDragEnd}
                      className="flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={savingOrder}
                      title="드래그해서 순서 변경"
                      aria-label={`${product.name} 순서 변경`}
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="col-span-3 flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">{product.name}</div>
                      <p className="mt-0.5 text-xs text-slate-400">클릭해서 관리</p>
                    </div>
                  </div>

                  <div className="col-span-3 truncate font-mono text-xs text-slate-500">
                    {product.slug}
                  </div>
                  <div className="col-span-1 text-center font-mono text-sm text-slate-700">
                    {product.display_order}
                  </div>
                  <div className="col-span-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {product.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {product.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div className="col-span-1 text-xs text-slate-500">
                    {formatDate(product.updated_at)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        goToProduct(product.slug)
                      }}
                      className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-yellow-100"
                      title="관리"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <ProductCreateModal
            nextOrder={nextOrder}
            onClose={() => setModalOpen(false)}
            onSave={handleCreate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[60] flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl"
          >
            <Check className="h-4 w-4 text-yellow-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
