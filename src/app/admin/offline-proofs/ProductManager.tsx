'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import {
  OFFLINE_PROOF_PRODUCT_NAME_MAX,
  type OfflineProofProduct,
} from '@/lib/offline-proof'

const API = '/api/admin/offline-proofs/products'

interface Draft {
  name: string
  /** 숫자만, 빈 문자열 = 기준 가격 없음 */
  price: string
}

function toDraft(product: OfflineProofProduct): Draft {
  return { name: product.name, price: product.price === null ? '' : String(product.price) }
}

function priceDigits(value: string) {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
}

function displayPrice(digits: string) {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

interface ProductManagerProps {
  /** 목록을 읽을 때마다 — 상단 상품 필터에 쓴다 */
  onLoaded: (products: OfflineProofProduct[]) => void
  /** 기준 가격이 바뀌었을 수 있을 때 — 접수 목록의 차액을 다시 계산하도록 */
  onPricesChanged: () => void
}

/**
 * 증빙 상품 관리 — 손님 폼 「구매 상품」 목록과 차액 계산용 기준 가격.
 * 기준 가격은 손님에게 보이지 않는다.
 */
export function ProductManager({ onLoaded, onPricesChanged }: ProductManagerProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<OfflineProofProduct[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [adding, setAdding] = useState(false)

  const onLoadedRef = useRef(onLoaded)
  useEffect(() => {
    onLoadedRef.current = onLoaded
  })

  const load = useCallback(async () => {
    try {
      const response = await fetch(API)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '상품 목록을 불러오지 못했습니다')
      const list: OfflineProofProduct[] = data.products || []
      setProducts(list)
      setDrafts(Object.fromEntries(list.map(product => [product.id, toDraft(product)])))
      setError(null)
      onLoadedRef.current(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '상품 목록을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  const initialFetched = useRef(false)
  useEffect(() => {
    if (initialFetched.current) return
    initialFetched.current = true
    load()
  }, [load])

  const request = async (method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) => {
    const response = await fetch(API, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '저장에 실패했습니다')
  }

  const saveProduct = async (product: OfflineProofProduct) => {
    const draft = drafts[product.id]
    if (!draft) return
    setBusyId(product.id)
    try {
      await request('PATCH', {
        id: product.id,
        name: draft.name,
        price: draft.price === '' ? null : Number(draft.price),
      })
      await load()
      onPricesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (product: OfflineProofProduct) => {
    setBusyId(product.id)
    try {
      await request('PATCH', { id: product.id, is_active: !product.is_active })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setBusyId(null)
    }
  }

  const deleteProduct = async (product: OfflineProofProduct) => {
    const confirmed = window.confirm(
      `'${product.name}' 상품을 삭제할까요?\n\n이미 들어온 접수에는 상품명이 남지만, 그 접수들은 차액을 계산할 수 없게 됩니다.\n손님 폼에서만 빼려면 '숨기기'를 쓰세요.`
    )
    if (!confirmed) return
    setBusyId(product.id)
    try {
      await request('DELETE', { id: product.id })
      await load()
      onPricesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setBusyId(null)
    }
  }

  const addProduct = async () => {
    if (!newName.trim()) {
      alert('상품명을 입력해주세요')
      return
    }
    setAdding(true)
    try {
      await request('POST', { name: newName, price: newPrice === '' ? null : Number(newPrice) })
      setNewName('')
      setNewPrice('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '상품 추가에 실패했습니다')
    } finally {
      setAdding(false)
    }
  }

  const activeProducts = products.filter(product => product.is_active)
  const missingPrice = activeProducts.filter(product => product.price === null).length

  return (
    <div className="mb-6 rounded-xl border-2 border-slate-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50">
          <Package className="h-4 w-4 text-slate-900" />
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-black text-slate-900">증빙 상품 관리</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {loading
              ? '불러오는 중…'
              : activeProducts.length > 0
                ? `손님 폼에 보이는 상품: ${activeProducts.map(product => product.name).join(' · ')}`
                : '손님 폼에 보이는 상품이 없습니다 — 구매 상품 칸이 숨겨집니다'}
          </p>
        </div>
        {missingPrice > 0 && (
          <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            기준 가격 미입력 {missingPrice}개
          </span>
        )}
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4">
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            손님 폼 <span className="font-bold">구매 상품</span> 목록입니다. <span className="font-bold">기준 가격</span>은
            차액(결제 금액 − 기준 가격 × 수량) 계산에만 쓰이고 손님에게는 보이지 않습니다. 비워 두면 그 상품은 차액을 계산하지 않습니다.
          </p>

          {error && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="space-y-2">
            {products.map(product => {
              const draft = drafts[product.id] ?? toDraft(product)
              const dirty =
                draft.name.trim() !== product.name ||
                (draft.price === '' ? null : Number(draft.price)) !== product.price
              const busy = busyId === product.id
              return (
                <div
                  key={product.id}
                  className={`flex flex-wrap items-center gap-2 rounded-lg border-2 p-2 ${
                    product.is_active ? 'border-slate-200' : 'border-dashed border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setDrafts(prev => ({ ...prev, [product.id]: { ...draft, name: e.target.value } }))
                    }
                    maxLength={OFFLINE_PROOF_PRODUCT_NAME_MAX}
                    aria-label="상품명"
                    className="min-w-[160px] flex-1 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-yellow-400 focus:outline-none"
                  />
                  <div className="relative">
                    <input
                      value={displayPrice(draft.price)}
                      onChange={(e) =>
                        setDrafts(prev => ({ ...prev, [product.id]: { ...draft, price: priceDigits(e.target.value) } }))
                      }
                      inputMode="numeric"
                      placeholder="기준 가격"
                      aria-label="기준 가격"
                      className="w-36 rounded-lg border-2 border-slate-200 py-1.5 pl-3 pr-7 text-right text-sm text-slate-900 focus:border-yellow-400 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                  </div>
                  {!product.is_active && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">숨김</span>
                  )}
                  <button
                    onClick={() => saveProduct(product)}
                    disabled={!dirty || busy}
                    className="flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-yellow-400 px-2.5 py-1.5 text-sm font-medium text-slate-900 disabled:border-slate-200 disabled:bg-white disabled:text-slate-300"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    저장
                  </button>
                  <button
                    onClick={() => toggleActive(product)}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-lg border-2 border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    title={product.is_active ? '손님 폼에서 숨기기 (기존 접수는 그대로)' : '손님 폼에 다시 보이기'}
                  >
                    {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {product.is_active ? '숨기기' : '보이기'}
                  </button>
                  <button
                    onClick={() => deleteProduct(product)}
                    disabled={busy}
                    className="rounded-lg border-2 border-slate-200 p-1.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`${product.name} 삭제`}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}

            {/* 새 상품 */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProduct()}
                maxLength={OFFLINE_PROOF_PRODUCT_NAME_MAX}
                placeholder="새 상품명"
                aria-label="새 상품명"
                className="min-w-[160px] flex-1 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-yellow-400 focus:outline-none"
              />
              <div className="relative">
                <input
                  value={displayPrice(newPrice)}
                  onChange={(e) => setNewPrice(priceDigits(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && addProduct()}
                  inputMode="numeric"
                  placeholder="기준 가격 (선택)"
                  aria-label="새 상품 기준 가격"
                  className="w-36 rounded-lg border-2 border-slate-200 py-1.5 pl-3 pr-7 text-right text-sm text-slate-900 focus:border-yellow-400 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
              </div>
              <button
                onClick={addProduct}
                disabled={adding}
                className="flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-yellow-400 px-3 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                상품 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
