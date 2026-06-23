'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '../components/AdminHeader'
import { PRODUCT_PRICING, formatPrice } from '@/types/cart'
import type { PricingRow } from '@/components/admin/EditPricingModal'
import { STORE_PRODUCT_TYPE, type StoreProduct } from '@/lib/products/store-products'
import {
  AlertTriangle,
  Check,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShoppingBag,
  Tag,
} from 'lucide-react'

const STORE_DEFAULT_OPTIONS = PRODUCT_PRICING.store_product
const INITIAL_FORM = {
  slug: '',
  title: '',
  shortLabel: '',
  size: '',
  badge: '상품',
  description: '',
  price: '24000',
  imageUrl: '',
  included: '선택 향 상품\n주문 후 2~3일 내 배송',
}

function optionLabel(size: string): string {
  return STORE_DEFAULT_OPTIONS.find((option) => option.size === size)?.label || size
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/[가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [toast, setToast] = useState('')
  const [storeTableUnavailable, setStoreTableUnavailable] = useState(false)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }, [])

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/admin/store-products', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '상품 목록 조회 실패')
    setProducts((json.products ?? []) as StoreProduct[])
    setStoreTableUnavailable(json.unavailable === true)
  }, [])

  const fetchPricing = useCallback(async () => {
    const res = await fetch('/api/admin/product-pricing', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '상품 가격 조회 실패')
    setPricingRows(((json.pricing ?? []) as PricingRow[]).filter((row) => row.product_type === STORE_PRODUCT_TYPE))
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([fetchProducts(), fetchPricing()])
    } catch (error) {
      showToast(error instanceof Error ? error.message : '상품 정보를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [fetchPricing, fetchProducts, showToast])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const rowsBySize = useMemo(() => {
    return new Map(pricingRows.map((row) => [row.size, row]))
  }, [pricingRows])

  const missingOptions = useMemo(() => {
    return products.filter((product) => !rowsBySize.has(product.size))
  }, [products, rowsBySize])

  const activeCount = products.filter((product) => product.isActive ?? true).length

  const handleSeedDefaults = async () => {
    if (missingOptions.length === 0) return
    setSyncing(true)
    try {
      for (const product of missingOptions) {
        const res = await fetch('/api/admin/product-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_type: STORE_PRODUCT_TYPE,
            size: product.size,
            label: product.title,
            price: product.fallbackPrice,
            original_price: null,
            is_active: product.isActive ?? true,
          }),
        })
        if (!res.ok && res.status !== 409) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || `${product.title} 등록 실패`)
        }
      }
      showToast('상품 가격이 체크아웃에 연동되었습니다')
      await fetchPricing()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '가격 연동 실패')
    } finally {
      setSyncing(false)
    }
  }

  const updateForm = (key: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !current.slug ? { slug: slugify(value) } : {}),
      ...(key === 'title' && !current.shortLabel ? { shortLabel: value } : {}),
      ...(key === 'slug' && !current.size ? { size: value } : {}),
    }))
  }

  const handleCreateProduct = async () => {
    const title = form.title.trim()
    const slug = form.slug.trim()
    const size = form.size.trim()
    const price = Number(form.price)

    if (!title || !slug || !size) {
      showToast('상품명, slug, 옵션 코드는 필수입니다')
      return
    }
    if (!Number.isInteger(price) || price < 0) {
      showToast('가격은 0 이상의 정수여야 합니다')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/store-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          short_label: form.shortLabel.trim() || title,
          size,
          badge: form.badge.trim() || '상품',
          description: form.description.trim(),
          fallback_price: price,
          image_url: form.imageUrl.trim() || null,
          included: form.included,
          is_active: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '상품 추가 실패')
      setAddOpen(false)
      setForm(INITIAL_FORM)
      await refreshAll()
      showToast('상품이 추가되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '상품 추가 실패')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="상품 관리"
        subtitle="상품 자체와 가격, 판매 상세페이지를 관리합니다"
        actions={
          <>
            <button
              onClick={refreshAll}
              disabled={loading || syncing}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              상품 추가
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">등록 상품</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{products.length}개</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">판매 가능</p>
            <p className="mt-2 text-2xl font-black text-emerald-600">{activeCount}개</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">체크아웃 가격 연동</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{pricingRows.length}개</p>
          </div>
        </div>

        {storeTableUnavailable && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-900">Supabase 상품 테이블 없이 임시 저장 모드로 작동 중입니다.</p>
              <p className="mt-1 text-xs font-medium text-amber-800">
                지금 수정한 상품 정보는 로컬 저장소에 보관되고 체크아웃 가격에도 연동됩니다.
                운영 DB에 영구 반영하려면 `20260607_admin_store_products.sql` 마이그레이션을 나중에 적용해주세요.
              </p>
            </div>
          </div>
        )}

        {missingOptions.length > 0 && (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-black text-amber-900">일부 상품의 체크아웃 가격이 아직 연동되지 않았습니다.</p>
                <p className="mt-1 text-xs font-medium text-amber-800">
                  미등록 상품: {missingOptions.map((product) => product.title).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleSeedDefaults}
              disabled={syncing}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              가격 연동 등록
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const row = rowsBySize.get(product.size)
              const price = row?.price ?? product.fallbackPrice
              const label = row?.label ?? optionLabel(product.size)
              const isActive = product.isActive ?? true

              return (
                <section key={product.slug} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-black text-slate-900">{product.title}</h2>
                          <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-700">
                            {product.badge}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isActive ? '판매' : '중지'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">{product.description}</p>
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{product.slug}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-400">옵션 코드</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{label}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-slate-400">{product.size}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-400">판매가</p>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">₩{formatPrice(price)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      구매 페이지
                    </Link>
                    <Link
                      href={`/admin/products/${product.slug}?kind=store`}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      상품/가격 편집
                    </Link>
                  </div>
                </section>
              )
            })}
          </div>
        )}

      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">상품 추가</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">상품 생성 시 체크아웃 가격과 상세페이지 초안이 함께 만들어집니다.</p>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
            <div className="grid max-h-[72vh] grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">상품명</span>
                <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">slug</span>
                <input value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} placeholder="ex. room-spray" className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">옵션/사이즈 코드</span>
                <input value={form.size} onChange={(event) => updateForm('size', event.target.value)} placeholder="ex. room_spray_100ml" className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">판매가</span>
                <input value={form.price} onChange={(event) => updateForm('price', event.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">짧은 라벨</span>
                <input value={form.shortLabel} onChange={(event) => updateForm('shortLabel', event.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">뱃지</span>
                <input value={form.badge} onChange={(event) => updateForm('badge', event.target.value)} className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">설명</span>
                <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={3} className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">대표 이미지 URL</span>
                <input value={form.imageUrl} onChange={(event) => updateForm('imageUrl', event.target.value)} placeholder="/images/..." className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">구성 안내</span>
                <textarea value={form.included} onChange={(event) => updateForm('included', event.target.value)} rows={4} className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-5">
              <button onClick={() => setAddOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={handleCreateProduct} disabled={creating} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                상품 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check className="h-4 w-4 text-yellow-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
