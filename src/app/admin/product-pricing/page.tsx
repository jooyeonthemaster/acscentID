'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  AlertTriangle,
  Check,
  X,
  Edit3,
  History,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  EyeOff,
  Eye,
} from 'lucide-react'
import { AdminHeader } from '../components/AdminHeader'
import { PRODUCT_TYPE_BADGES, type ProductType, formatPrice } from '@/types/cart'

interface PricingRow {
  product_type: ProductType
  size: string
  price: number
  original_price: number | null
  label: string
  sort_order: number
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

interface PricingLog {
  id: string
  product_type: string
  size: string
  old_price: number | null
  new_price: number | null
  old_original_price: number | null
  new_original_price: number | null
  old_is_active: boolean | null
  new_is_active: boolean | null
  changed_by: string | null
  changed_at: string
  reason: string | null
}

const PRODUCT_TYPE_ORDER: ProductType[] = [
  'image_analysis',
  'figure_diffuser',
  'chemistry_set',
  'graduation',
  'signature',
  'personal_scent',
  'payment_test',
]

function discountPercent(price: number, originalPrice: number | null): number | null {
  if (!originalPrice || originalPrice <= price) return null
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// =====================================================
// Edit Modal
// =====================================================
function EditPricingModal({
  row,
  onSave,
  onClose,
}: {
  row: PricingRow
  onSave: (payload: {
    price: number
    original_price: number | null
    is_active: boolean
    reason: string
  }) => Promise<void>
  onClose: () => void
}) {
  const [price, setPrice] = useState<string>(String(row.price))
  const [originalPrice, setOriginalPrice] = useState<string>(
    row.original_price !== null ? String(row.original_price) : ''
  )
  const [isActive, setIsActive] = useState<boolean>(row.is_active)
  const [reason, setReason] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string>('')

  const numericPrice = parseInt(price, 10)
  const numericOriginal = originalPrice.trim() === '' ? null : parseInt(originalPrice, 10)

  const validation = useMemo(() => {
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return '가격은 0 이상의 숫자여야 합니다'
    }
    if (numericOriginal !== null) {
      if (!Number.isFinite(numericOriginal) || numericOriginal < 0) {
        return '정가는 0 이상의 숫자 또는 비워두기여야 합니다'
      }
      if (numericOriginal < numericPrice) {
        return '정가는 가격보다 크거나 같아야 합니다'
      }
    }
    return null
  }, [numericPrice, numericOriginal])

  const isUnchanged =
    numericPrice === row.price &&
    (numericOriginal ?? null) === (row.original_price ?? null) &&
    isActive === row.is_active

  const handleSubmit = async () => {
    if (validation) {
      setErr(validation)
      return
    }
    if (isUnchanged) {
      setErr('변경된 항목이 없습니다')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        price: numericPrice,
        original_price: numericOriginal,
        is_active: isActive,
        reason: reason.trim(),
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const badge = PRODUCT_TYPE_BADGES[row.product_type] ?? PRODUCT_TYPE_BADGES.image_analysis
  const previewDiscount = discountPercent(numericPrice, numericOriginal)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] w-full max-w-md mx-4 my-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">가격 수정</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 ${badge.bg} ${badge.text} text-xs font-bold rounded ${badge.border} border`}>
                {badge.label}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-700 font-medium">{row.label}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              판매가 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">현재: ₩{formatPrice(row.price)}</p>
          </div>

          {/* Original Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              정가 (할인 표시용)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="비워두면 할인 뱃지 비표시"
                className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              현재: {row.original_price !== null ? `₩${formatPrice(row.original_price)}` : '없음'}
              {previewDiscount !== null && (
                <span className="ml-2 inline-block px-2 py-0.5 bg-rose-100 text-rose-600 font-bold rounded">
                  {previewDiscount}% OFF (미리보기)
                </span>
              )}
            </p>
          </div>

          {/* Active Toggle */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">판매 상태</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              {isActive ? (
                <>
                  <Eye className="w-4 h-4" /> 판매 중
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" /> 판매 중지
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-1">
              판매 중지 시 결제 시도 즉시 거부됩니다 (서버 검증).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              변경 사유 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 1Q 프로모션 종료, 원자재 가격 인상 등"
              rows={2}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-yellow-400 focus:ring-0 focus:outline-none resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">변경 로그에 함께 기록됩니다.</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{err}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !!validation || isUnchanged}
            className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 저장 중...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> 저장
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// =====================================================
// Logs Drawer (간단 표 형태)
// =====================================================
function LogsDrawer({
  logs,
  loading,
  onClose,
}: {
  logs: PricingLog[]
  loading: boolean
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 border-l-2 border-slate-200 flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">가격 변경 로그</h2>
          <span className="text-xs text-slate-500">최근 {logs.length}건</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">변경 로그가 없습니다</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => {
              const priceChanged = log.old_price !== null && log.old_price !== log.new_price
              const origChanged =
                (log.old_original_price ?? null) !== (log.new_original_price ?? null)
              const activeChanged = log.old_is_active !== log.new_is_active
              const isInsert = log.old_price === null && log.new_price !== null
              const goesUp =
                priceChanged && (log.new_price ?? 0) > (log.old_price ?? 0)

              return (
                <li key={log.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-900">
                          {log.product_type}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-700">{log.size}</span>
                        {isInsert && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded">
                            INITIAL
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 text-sm">
                        {priceChanged && (
                          <div className="flex items-center gap-2 font-mono tabular-nums">
                            {goesUp ? (
                              <TrendingUp className="w-4 h-4 text-rose-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-emerald-500" />
                            )}
                            <span className="text-slate-400 line-through">
                              ₩{log.old_price?.toLocaleString('ko-KR')}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-slate-900">
                              ₩{log.new_price?.toLocaleString('ko-KR')}
                            </span>
                          </div>
                        )}
                        {origChanged && (
                          <div className="text-xs text-slate-500">
                            정가:{' '}
                            {log.old_original_price !== null
                              ? `₩${log.old_original_price.toLocaleString('ko-KR')}`
                              : '(없음)'}{' '}
                            →{' '}
                            {log.new_original_price !== null
                              ? `₩${log.new_original_price.toLocaleString('ko-KR')}`
                              : '(없음)'}
                          </div>
                        )}
                        {activeChanged && (
                          <div className="text-xs">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold ${
                                log.new_is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {log.new_is_active ? '판매 중으로 전환' : '판매 중지로 전환'}
                            </span>
                          </div>
                        )}
                        {log.reason && (
                          <div className="text-xs text-slate-600 italic mt-1">
                            “{log.reason}”
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">{formatDateTime(log.changed_at)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                        {log.changed_by ?? '(unknown)'}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

// =====================================================
// Main Page
// =====================================================
export default function AdminProductPricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PricingRow | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<PricingLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [toast, setToast] = useState<string>('')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const fetchPricing = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/product-pricing', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.pricing ?? [])
    } catch (e) {
      console.error('[admin/product-pricing] fetch failed:', e)
      showToast('가격 목록 불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch('/api/admin/product-pricing/log?limit=200', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLogs(json.logs ?? [])
    } catch (e) {
      console.error('[admin/product-pricing/log] fetch failed:', e)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  const handleSave = async (payload: {
    price: number
    original_price: number | null
    is_active: boolean
    reason: string
  }) => {
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
    showToast('가격이 수정되었습니다')
    await fetchPricing()
    if (showLogs) await fetchLogs()
  }

  // 그룹화
  const grouped = useMemo(() => {
    const map = new Map<ProductType, PricingRow[]>()
    for (const row of rows) {
      const key = row.product_type
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    for (const v of map.values()) v.sort((a, b) => a.sort_order - b.sort_order)
    return map
  }, [rows])

  const orderedKeys: ProductType[] = useMemo(() => {
    const known = PRODUCT_TYPE_ORDER.filter((k) => grouped.has(k))
    const extra = Array.from(grouped.keys()).filter((k) => !known.includes(k))
    return [...known, ...extra]
  }, [grouped])

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="가격 관리"
        subtitle="상품별 사이즈 가격 / 정가 / 판매 상태"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLogs(true)
                if (logs.length === 0) fetchLogs()
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
            >
              <History className="w-4 h-4" /> 변경 로그
            </button>
            <button
              onClick={fetchPricing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" /> 새로고침
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            가격 데이터가 없습니다. 마이그레이션을 확인하세요.
          </div>
        ) : (
          orderedKeys.map((key) => {
            const list = grouped.get(key) ?? []
            const badge = PRODUCT_TYPE_BADGES[key] ?? PRODUCT_TYPE_BADGES.image_analysis
            return (
              <section key={key} className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className={`px-6 py-3 ${badge.bg} ${badge.border} border-b-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-black ${badge.text}`}>{badge.label}</span>
                    <span className="text-xs text-slate-500 font-mono">{key}</span>
                  </div>
                  <span className="text-xs text-slate-500">{list.length}개 사이즈</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {list.map((row) => {
                    const discount = discountPercent(row.price, row.original_price)
                    return (
                      <div
                        key={row.size}
                        className={`px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 ${
                          !row.is_active ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="col-span-3">
                          <div className="font-semibold text-slate-900">{row.label}</div>
                          <div className="text-xs text-slate-500 font-mono">{row.size}</div>
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                            ₩{formatPrice(row.price)}
                          </div>
                          <div className="text-[11px] text-slate-400">판매가</div>
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="text-sm text-slate-500 font-mono tabular-nums">
                            {row.original_price !== null
                              ? `₩${formatPrice(row.original_price)}`
                              : '—'}
                          </div>
                          <div className="text-[11px] text-slate-400">정가</div>
                        </div>

                        <div className="col-span-2 text-center">
                          {discount !== null ? (
                            <span className="inline-block px-2 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded">
                              {discount}% OFF
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">할인 없음</span>
                          )}
                        </div>

                        <div className="col-span-2 text-center">
                          {row.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                              <Eye className="w-3 h-3" /> 판매 중
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded">
                              <EyeOff className="w-3 h-3" /> 중지
                            </span>
                          )}
                        </div>

                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => setEditing(row)}
                            className="p-2 hover:bg-yellow-50 text-slate-700 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}

        <div className="text-xs text-slate-400 px-2">
          ※ 가격 변경은 즉시 반영되지만, 기존 주문(<code>order_items.unit_price</code>)은
          주문 시점 가격이 그대로 보존됩니다. 결제 시 서버는 항상 DB 가격을 검증합니다.
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <EditPricingModal
            row={editing}
            onSave={handleSave}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogs && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowLogs(false)}
            />
            <LogsDrawer logs={logs} loading={logsLoading} onClose={() => setShowLogs(false)} />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-slate-900 text-white font-medium rounded-xl shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-yellow-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
