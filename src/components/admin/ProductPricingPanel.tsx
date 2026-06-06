'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react'
import { PRODUCT_TYPE_TO_SLUG } from '@/lib/products/active'
import { PRODUCT_TYPE_BADGES, type ProductType, formatPrice } from '@/types/cart'
import type { StoreProduct } from '@/lib/products/store-products'
import {
  EditPricingModal,
  discountPercent,
  type PricingRow,
  type PricingSavePayload,
} from './EditPricingModal'
import { AddPricingOptionModal, type AddPricingPayload } from './AddPricingOptionModal'

// admin_products.slug → 연결된 pricing product_type 목록 (역매핑)
const SLUG_TO_PRODUCT_TYPES: Record<string, ProductType[]> = Object.entries(
  PRODUCT_TYPE_TO_SLUG
).reduce<Record<string, ProductType[]>>((acc, [productType, slug]) => {
  if (!acc[slug]) acc[slug] = []
  acc[slug].push(productType as ProductType)
  return acc
}, {})

export function ProductPricingPanel({
  slug,
  productTypes: explicitProductTypes,
  title = '가격 옵션',
  selectFromStoreProducts = false,
  onToast,
}: {
  slug?: string
  productTypes?: ProductType[]
  title?: string
  selectFromStoreProducts?: boolean
  onToast?: (message: string) => void
}) {
  const productTypes = useMemo<ProductType[]>(() => {
    if (explicitProductTypes) return explicitProductTypes
    if (!slug) return []
    return SLUG_TO_PRODUCT_TYPES[slug] ?? []
  }, [explicitProductTypes, slug])
  const [rows, setRows] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([])
  const [storeLoading, setStoreLoading] = useState(false)
  const [storeProductsUnavailable, setStoreProductsUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<PricingRow | null>(null)
  const [addingType, setAddingType] = useState<ProductType | null>(null)

  const fetchPricing = useCallback(async () => {
    if (productTypes.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/product-pricing', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const all = (json.pricing ?? []) as PricingRow[]
      const filtered = all
        .filter((row) => productTypes.includes(row.product_type))
        .sort((a, b) => a.sort_order - b.sort_order)
      setRows(filtered)
    } catch (e) {
      console.error('[ProductPricingPanel] fetch failed:', e)
      onToast?.('가격 정보를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [productTypes, onToast])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  const fetchStoreProducts = useCallback(async () => {
    if (!selectFromStoreProducts) return
    setStoreLoading(true)
    try {
      const res = await fetch('/api/admin/store-products', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const products = ((json.products ?? []) as StoreProduct[]).sort((a, b) => {
        const orderA = a.displayOrder ?? 0
        const orderB = b.displayOrder ?? 0
        if (orderA !== orderB) return orderA - orderB
        return a.title.localeCompare(b.title, 'ko-KR')
      })
      setStoreProducts(products)
      setStoreProductsUnavailable(Boolean(json.unavailable))
    } catch (e) {
      console.error('[ProductPricingPanel] store products fetch failed:', e)
      onToast?.('상품 목록을 불러오지 못했습니다')
    } finally {
      setStoreLoading(false)
    }
  }, [selectFromStoreProducts, onToast])

  useEffect(() => {
    fetchStoreProducts()
  }, [fetchStoreProducts])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchPricing(), fetchStoreProducts()])
  }, [fetchPricing, fetchStoreProducts])

  // product_type 별 그룹 (정렬 순서 유지)
  const groups = useMemo(() => {
    return productTypes.map((pt) => ({
      productType: pt,
      list: rows.filter((r) => r.product_type === pt).sort((a, b) => a.sort_order - b.sort_order),
    }))
  }, [productTypes, rows])

  const handleSave = async (payload: PricingSavePayload) => {
    if (!editing) return
    const res = await fetch('/api/admin/product-pricing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_type: editing.product_type,
        size: editing.size,
        ...payload,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? '저장 실패')
    }
    setEditing(null)
    onToast?.('가격이 수정되었습니다')
    await fetchPricing()
  }

  const handleAdd = async (payload: AddPricingPayload) => {
    const res = await fetch('/api/admin/product-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? '옵션 추가 실패')
    }
    setAddingType(null)
    onToast?.('가격 옵션이 추가되었습니다')
    await fetchPricing()
  }

  const handleDelete = async (row: PricingRow) => {
    if (!window.confirm(`"${row.label}" 옵션을 완전히 삭제하시겠습니까?\n(기존 주문에는 영향 없음)`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/product-pricing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: row.product_type, size: row.size }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? '삭제 실패')
      }
      onToast?.('옵션이 삭제되었습니다')
      await fetchPricing()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setBusy(false)
    }
  }

  const patchPricingRow = async (
    row: Pick<PricingRow, 'product_type' | 'size'>,
    payload: Record<string, unknown>
  ) => {
    const res = await fetch('/api/admin/product-pricing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_type: row.product_type,
        size: row.size,
        ...payload,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? '저장 실패')
    }
  }

  const handleConnectStoreProduct = async (
    productType: ProductType,
    product: StoreProduct,
    existingRow?: PricingRow
  ) => {
    setBusy(true)
    try {
      if (existingRow) {
        await patchPricingRow(existingRow, {
          label: product.title,
          is_active: true,
          image_url: existingRow.image_url || product.image,
          reason: '판매 상품 연결',
        })
      } else {
        const res = await fetch('/api/admin/product-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_type: productType,
            size: product.size,
            label: product.title,
            price: product.fallbackPrice,
            original_price: null,
            is_active: true,
            image_url: product.image,
          }),
        })

        if (res.status === 409) {
          await patchPricingRow({ product_type: productType, size: product.size }, {
            label: product.title,
            is_active: true,
            image_url: product.image,
            reason: '판매 상품 다시 연결',
          })
        } else if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? '상품 연결 실패')
        }
      }

      onToast?.('상품이 프로그램에 연결되었습니다')
      await fetchPricing()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '상품 연결 실패')
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnectStoreProduct = async (row: PricingRow) => {
    setBusy(true)
    try {
      await patchPricingRow(row, {
        is_active: false,
        reason: '판매 상품 연결 해제',
      })
      onToast?.('상품 연결이 해제되었습니다')
      await fetchPricing()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '상품 연결 해제 실패')
    } finally {
      setBusy(false)
    }
  }

  const handleApplyStoreProductPrice = async (row: PricingRow, product: StoreProduct) => {
    setBusy(true)
    try {
      await patchPricingRow(row, {
        label: product.title,
        price: product.fallbackPrice,
        original_price: null,
        is_active: true,
        image_url: product.image,
        reason: '상품 관리 기준가 적용',
      })
      onToast?.('상품 관리 기준가를 적용했습니다')
      await fetchPricing()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '상품 기준가 적용 실패')
    } finally {
      setBusy(false)
    }
  }

  const handleMove = async (productType: ProductType, list: PricingRow[], index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const reordered = [...list]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    // 낙관적 업데이트
    setRows((prev) => {
      const others = prev.filter((r) => r.product_type !== productType)
      const updated = reordered.map((r, i) => ({ ...r, sort_order: i }))
      return [...others, ...updated]
    })
    setBusy(true)
    try {
      const res = await fetch('/api/admin/product-pricing/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: productType, sizes: reordered.map((r) => r.size) }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? '순서 변경 실패')
      }
      await fetchPricing()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '순서 변경 실패')
      await fetchPricing()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
          <Tag className="h-4 w-4 text-slate-500" />
          {title}
        </h2>
        {productTypes.length > 0 && (
          <button
            onClick={selectFromStoreProducts ? refreshAll : fetchPricing}
            disabled={loading || storeLoading || busy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || storeLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        )}
      </div>

      {productTypes.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">
          이 상품에는 연결된 가격 정책이 없습니다.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
        </div>
      ) : selectFromStoreProducts ? (
        <div className="space-y-4">
          {storeLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
            </div>
          ) : (
            groups.map(({ productType, list }) => {
              const badge = PRODUCT_TYPE_BADGES[productType] ?? PRODUCT_TYPE_BADGES.image_analysis
              const orphanRows = list.filter((row) => !storeProducts.some((product) => product.size === row.size))

              return (
                <div key={productType} className="space-y-3">
                  {groups.length > 1 && (
                    <div className="flex items-center gap-2 px-0.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{productType}</span>
                    </div>
                  )}

                  {storeProducts.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">
                      상품 관리에 등록된 판매 상품이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {storeProducts.map((product) => {
                        const linkedRow = list.find((row) => row.size === product.size)
                        const isConnected = Boolean(linkedRow?.is_active)
                        const isProductActive = product.isActive !== false
                        const priceDiffers = Boolean(linkedRow && linkedRow.price !== product.fallbackPrice)

                        return (
                          <div
                            key={`${productType}-${product.slug}-${product.size}`}
                            className={`rounded-xl border p-3 transition-colors ${
                              isConnected
                                ? 'border-yellow-300 bg-yellow-50/50'
                                : 'border-slate-200 bg-white'
                            } ${!isProductActive ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {product.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.image}
                                    alt={product.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-slate-400" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate text-sm font-black text-slate-900">{product.title}</span>
                                  <span className="rounded bg-lime-100 px-1.5 py-0.5 text-[10px] font-black text-lime-700">
                                    {product.badge || '상품'}
                                  </span>
                                  {!isProductActive && (
                                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                      상품 중지
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono text-slate-400">{product.size}</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    상품가 ₩{formatPrice(product.fallbackPrice)}
                                  </span>
                                  {linkedRow && (
                                    <span className="font-mono text-slate-500">
                                      프로그램가 ₩{formatPrice(linkedRow.price)}
                                    </span>
                                  )}
                                </div>
                                {product.description && (
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <span className={`text-[10px] font-bold ${isConnected ? 'text-green-600' : 'text-slate-400'}`}>
                                  {isConnected ? '노출' : '미노출'}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isConnected}
                                  aria-label={isConnected ? '노출 끄기' : '노출 켜기'}
                                  title={!isConnected && !isProductActive ? '상품이 중지 상태입니다' : undefined}
                                  onClick={() =>
                                    isConnected && linkedRow
                                      ? handleDisconnectStoreProduct(linkedRow)
                                      : handleConnectStoreProduct(productType, product, linkedRow)
                                  }
                                  disabled={busy || (!isConnected && !isProductActive)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isConnected ? 'bg-green-500' : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                      isConnected ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {linkedRow && isConnected && (
                              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                {priceDiffers && (
                                  <button
                                    onClick={() => handleApplyStoreProductPrice(linkedRow, product)}
                                    disabled={busy}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                  >
                                    상품가 적용
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditing(linkedRow)}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-yellow-50"
                                  title="프로그램 가격 수정"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  프로그램가 수정
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {orphanRows.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-500">상품 관리에 없는 기존 옵션</p>
                      {orphanRows.map((row) => (
                        <div key={`${row.product_type}-${row.size}`} className="flex items-center gap-2 rounded-lg bg-white p-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-slate-900">{row.label}</span>
                              <span className="font-mono text-[10px] text-slate-400">{row.size}</span>
                            </div>
                            <p className="font-mono text-xs font-bold text-slate-900">₩{formatPrice(row.price)}</p>
                          </div>
                          <button
                            onClick={() => setEditing(row)}
                            className="rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-yellow-100"
                            title="가격 수정"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDisconnectStoreProduct(row)}
                            disabled={busy}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            비활성화
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                            title="옵션 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            상품 관리에 등록된 판매 상품 중 이 프로그램에서 노출할 항목을 선택합니다. 연결된 상품은
            체크아웃 가격 옵션으로 자동 반영되며, 프로그램가가 상품가와 다르면 상품가 적용 버튼으로 동기화할 수 있습니다.
          </p>
          {storeProductsUnavailable && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700">
              현재 상품 관리 DB 테이블이 준비되지 않아 기본 상품 목록을 표시 중입니다. 마이그레이션 적용 후
              새로 등록한 상품까지 이 목록에 나타납니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ productType, list }) => {
            const badge = PRODUCT_TYPE_BADGES[productType] ?? PRODUCT_TYPE_BADGES.image_analysis
            return (
              <div key={productType} className="space-y-2">
                {groups.length > 1 && (
                  <div className="flex items-center gap-2 px-0.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{productType}</span>
                  </div>
                )}

                {list.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400">
                    등록된 옵션이 없습니다.
                  </div>
                ) : (
                  list.map((row, index) => {
                    const discount = discountPercent(row.price, row.original_price)
                    return (
                      <div
                        key={`${row.product_type}-${row.size}`}
                        className={`flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 ${
                          row.is_active ? '' : 'opacity-60'
                        }`}
                      >
                        {/* 순서 변경 */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMove(productType, list, index, -1)}
                            disabled={busy || index === 0}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            title="위로"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(productType, list, index, 1)}
                            disabled={busy || index === list.length - 1}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            title="아래로"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {row.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image_url}
                            alt={row.label}
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-slate-900">{row.label}</span>
                            <span className="shrink-0 font-mono text-[10px] text-slate-400">{row.size}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-xs tabular-nums">
                            <span className="font-bold text-slate-900">₩{formatPrice(row.price)}</span>
                            {row.original_price !== null && (
                              <span className="text-slate-400 line-through">
                                ₩{formatPrice(row.original_price)}
                              </span>
                            )}
                            {discount !== null && (
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-rose-600">
                                {discount}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold ${
                            row.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {row.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {row.is_active ? '판매' : '중지'}
                        </span>
                        <button
                          onClick={() => setEditing(row)}
                          className="shrink-0 rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-yellow-100"
                          title="가격 수정"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={busy}
                          className="shrink-0 rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          title="옵션 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })
                )}

                <button
                  onClick={() => setAddingType(productType)}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  가격 옵션 추가
                </button>
              </div>
            )
          })}

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            변경/추가/삭제/순서는 즉시 반영되며 체크아웃 화면에도 자동 적용됩니다. 기존 주문 금액은
            주문 시점 가격이 그대로 보존됩니다.
          </p>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EditPricingModal row={editing} onSave={handleSave} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addingType && (
          <AddPricingOptionModal
            productType={addingType}
            existingSizes={rows
              .filter((r) => r.product_type === addingType)
              .map((r) => r.size)}
            onSave={handleAdd}
            onClose={() => setAddingType(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
