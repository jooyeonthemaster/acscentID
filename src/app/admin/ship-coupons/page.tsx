'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react'
import { AdminHeader } from '../components/AdminHeader'
import {
  SHIP_COUPON_MAX_ISSUE,
  SHIP_COUPON_PRODUCT_PRESETS,
  SHIP_COUPON_STATUS_LABELS,
  type ShipCouponStatus,
  buildShipCouponUrl,
  formatShipCouponCode,
  normalizeShipCouponCode,
} from '@/lib/offline-shipping-coupons'

interface RequestRef {
  request_number: string
  name: string
}

interface ShipCouponRow {
  id: string
  code: string
  product_name: string
  batch_id: string
  batch_name: string | null
  status: ShipCouponStatus
  used_at: string | null
  created_at: string
  shipping_request_id: string | null
  request: RequestRef | RequestRef[] | null
}

interface Batch {
  id: string
  name: string
  productName: string
  createdAt: string
  coupons: ShipCouponRow[]
  counts: Record<ShipCouponStatus, number>
}

interface PrintItem {
  id: string
  code: string
  productName: string
  qr: string
}

const STATUS_CLASS: Record<ShipCouponStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  used: 'border-slate-300 bg-slate-100 text-slate-700',
  void: 'border-red-200 bg-red-50 text-red-600',
}

// 실물 교환권(/admin/coupons)과 같은 신용카드 크기 — A4 한 장에 2 × 5 = 10장
const CARDS_PER_PAGE = 10

function getRequest(row: ShipCouponRow): RequestRef | null {
  return Array.isArray(row.request) ? row.request[0] || null : row.request
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupBatches(rows: ShipCouponRow[]): Batch[] {
  const batches = new Map<string, Batch>()
  for (const row of rows) {
    let batch = batches.get(row.batch_id)
    if (!batch) {
      batch = {
        id: row.batch_id,
        name: row.batch_name || row.product_name,
        productName: row.product_name,
        createdAt: row.created_at,
        coupons: [],
        counts: { active: 0, used: 0, void: 0 },
      }
      batches.set(row.batch_id, batch)
    }
    batch.coupons.push(row)
    batch.counts[row.status] += 1
  }
  return [...batches.values()]
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages
}

export default function AdminShipCouponsPage() {
  const [rows, setRows] = useState<ShipCouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [preset, setPreset] = useState<string>(SHIP_COUPON_PRODUCT_PRESETS[0])
  const [customProduct, setCustomProduct] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [memo, setMemo] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ batchName: string; coupons: ShipCouponRow[] } | null>(null)

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [voiding, setVoiding] = useState<string | null>(null)

  const [printItems, setPrintItems] = useState<PrintItem[]>([])
  const [printPending, setPrintPending] = useState(false)
  const [preparingPrint, setPreparingPrint] = useState<string | null>(null)

  const productName = customProduct.trim() || preset

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/admin/ship-coupons')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '교환권 목록을 불러오지 못했습니다')
      setSetupError(data.setupRequired ? data.error : null)
      setRows(data.coupons || [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '교환권 목록을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const batches = useMemo(() => groupBatches(rows), [rows])

  const searchResults = useMemo(() => {
    const term = search.trim()
    if (!term) return null
    const codeTerm = normalizeShipCouponCode(term)
    return rows.filter((row) => {
      const req = getRequest(row)
      return (
        (codeTerm && row.code.includes(codeTerm)) ||
        (req && (req.request_number.toUpperCase().includes(term.toUpperCase()) || req.name.includes(term)))
      )
    })
  }, [rows, search])

  // 인쇄 — 카드가 그려지고 QR 이미지가 다 읽힌 다음에 인쇄 창을 연다
  useEffect(() => {
    if (!printPending || printItems.length === 0) return
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.ship-print-root img'))
    Promise.all(images.map((img) => img.decode().catch(() => undefined))).then(() => {
      window.print()
      setPrintPending(false)
    })
  }, [printPending, printItems])

  const printCoupons = async (coupons: ShipCouponRow[], key: string) => {
    const targets = coupons.filter((coupon) => coupon.status === 'active')
    if (targets.length === 0) {
      alert('인쇄할 미사용 교환권이 없습니다.')
      return
    }
    setPreparingPrint(key)
    try {
      const items = await Promise.all(
        targets.map(async (coupon) => ({
          id: coupon.id,
          code: coupon.code,
          productName: coupon.product_name,
          qr: await QRCode.toDataURL(buildShipCouponUrl(coupon.code), {
            width: 320,
            margin: 1,
            errorCorrectionLevel: 'M',
          }),
        }))
      )
      setPrintItems(items)
      setPrintPending(true)
    } catch (err) {
      console.error('Ship coupon QR render failed:', err)
      alert('QR을 만들지 못했습니다. 다시 시도해주세요.')
    } finally {
      setPreparingPrint(null)
    }
  }

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (issuing) return
    const count = Number(quantity)
    if (!productName) {
      setIssueError('상품을 골라주세요')
      return
    }
    if (!Number.isInteger(count) || count < 1 || count > SHIP_COUPON_MAX_ISSUE) {
      setIssueError(`발급 수량은 1부터 ${SHIP_COUPON_MAX_ISSUE} 사이여야 합니다`)
      return
    }

    setIssuing(true)
    setIssueError(null)
    try {
      const response = await fetch('/api/admin/ship-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, quantity: count, memo }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '교환권 발급에 실패했습니다')
      setIssued({ batchName: data.batchName, coupons: data.coupons || [] })
      setMemo('')
      await load()
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : '교환권 발급에 실패했습니다')
    } finally {
      setIssuing(false)
    }
  }

  const voidCoupons = async (payload: { ids?: string[]; batchId?: string }, label: string, key: string) => {
    if (!confirm(`${label}\n\n취소한 교환권은 QR을 찍어도 접수되지 않습니다. 이미 접수된 교환권은 그대로 둡니다.`)) return
    setVoiding(key)
    try {
      const response = await fetch('/api/admin/ship-coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '교환권 취소에 실패했습니다')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '교환권 취소에 실패했습니다')
    } finally {
      setVoiding(null)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderCouponRow = (row: ShipCouponRow, showProduct: boolean) => {
    const req = getRequest(row)
    return (
      <tr key={row.id} className="border-t border-slate-100">
        <td className="whitespace-nowrap px-3 py-2 font-mono text-sm font-black text-slate-800">
          {formatShipCouponCode(row.code)}
        </td>
        {showProduct && <td className="px-3 py-2 text-sm font-bold text-slate-700">{row.product_name}</td>}
        <td className="px-3 py-2">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-black ${STATUS_CLASS[row.status]}`}>
            {SHIP_COUPON_STATUS_LABELS[row.status]}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">
          {row.status === 'used' ? (
            <>
              <span className="font-mono font-bold text-slate-800">{req?.request_number || '연결 없음'}</span>
              {req?.name && <span className="ml-1.5">{req.name}</span>}
              <span className="ml-1.5 text-slate-400">{formatDateTime(row.used_at)}</span>
            </>
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {row.status === 'active' && (
            <button
              type="button"
              onClick={() => voidCoupons({ ids: [row.id] }, `${formatShipCouponCode(row.code)} 교환권을 취소할까요?`, row.id)}
              disabled={voiding !== null}
              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              {voiding === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '취소'}
            </button>
          )}
        </td>
      </tr>
    )
  }

  const printPages = chunk(printItems, CARDS_PER_PAGE)

  return (
    <div>
      <style>{`
        /* 인쇄 카드는 <body> 바로 아래에 따로 그린다(createPortal).
           관리자 틀 안에 두면 A4 폭에서 모바일 상단바(h-14)가 보이지 않는 빈칸으로 남아 첫 줄이 밀리고,
           다섯째 줄이 다음 장으로 넘어간다. */
        .ship-print-root {
          display: none;
        }

        /* 실물 쿠폰(/admin/coupons)과 같은 102 × 57mm 카드, 2 × 5 = 10장.
           A4 297mm 를 꽉 채우면 반올림으로 줄이 넘어갈 수 있어 296mm 로 1mm 여유를 둔다. */
        .ship-coupon-page {
          display: grid;
          grid-template-columns: repeat(2, 102mm);
          grid-template-rows: repeat(5, 57mm);
          gap: 2mm;
          justify-content: center;
          align-content: start;
          width: 210mm;
          height: 296mm;
          padding-top: 1.5mm;
          box-sizing: border-box;
          overflow: hidden;
          background: white;
        }

        .ship-coupon-card {
          width: 102mm;
          height: 57mm;
          box-sizing: border-box;
          border: 0.2mm dashed #cbd5e1;
          border-radius: 3mm;
          break-inside: avoid;
          page-break-inside: avoid;
          overflow: hidden;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > *:not(.ship-print-root) {
            display: none !important;
          }

          .ship-print-root {
            display: block !important;
          }

          .ship-coupon-page {
            break-after: page;
            page-break-after: always;
          }

          .ship-coupon-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      <div>
        <AdminHeader
          title="택배 교환권"
          subtitle="교환권 QR을 찍은 손님만 /ship 에서 택배를 접수할 수 있어요 · 교환권 1장 = 1회"
          actions={
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          }
        />
      </div>

      <main className="space-y-6 p-4 sm:p-6">
        {setupError && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>교환권 테이블이 아직 없어요. Supabase SQL 에디터에서 아래 파일을 한 번 실행해주세요.</p>
              <p className="mt-1 font-mono text-xs">supabase/migrations/20261028_offline_shipping_coupons.sql</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* 발급 */}
          <section className="h-fit rounded-xl border-2 border-slate-900 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-yellow-300">
                <PackageCheck className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">교환권 발급</h2>
                <p className="text-xs font-semibold text-slate-500">상품마다 고유 QR · 한 번 접수하면 끝</p>
              </div>
            </div>

            <form onSubmit={handleIssue} className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-black text-slate-800">상품</p>
                <div className="flex flex-wrap gap-2">
                  {SHIP_COUPON_PRODUCT_PRESETS.map((option) => {
                    const selected = !customProduct.trim() && preset === option
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setPreset(option)
                          setCustomProduct('')
                        }}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  placeholder="목록에 없으면 직접 입력"
                  maxLength={100}
                  className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-800">수량</span>
                  <input
                    type="number"
                    min={1}
                    max={SHIP_COUPON_MAX_ISSUE}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-800">
                    메모 <span className="font-medium text-slate-400">(선택)</span>
                  </span>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="예: 10/28 생일카페"
                    maxLength={100}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-slate-900"
                  />
                </label>
              </div>

              {issueError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{issueError}</p>
              )}

              <button
                type="submit"
                disabled={issuing || !!setupError}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-40"
              >
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                {productName} {Number(quantity) > 0 ? `${Number(quantity)}장` : ''} 발급
              </button>
            </form>

            {issued && (
              <div className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-900">
                  {issued.batchName} · {issued.coupons.length}장 발급됨
                </p>
                <button
                  type="button"
                  onClick={() => void printCoupons(issued.coupons, 'issued')}
                  disabled={preparingPrint !== null}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-slate-900 bg-yellow-300 py-2.5 text-sm font-black text-slate-900 disabled:opacity-50"
                >
                  {preparingPrint === 'issued' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  A4로 인쇄 (한 장에 {CARDS_PER_PAGE}개)
                </button>
              </div>
            )}
          </section>

          {/* 발급 목록 */}
          <section className="min-w-0 rounded-xl border-2 border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-lg font-black text-slate-950">발급한 교환권</h2>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="교환권 코드 · 접수번호 · 이름"
                  className="w-full rounded-lg border-2 border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {loadError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{loadError}</p>
            )}

            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : searchResults ? (
              searchResults.length === 0 ? (
                <p className="py-10 text-center text-sm font-bold text-slate-400">찾는 교환권이 없어요</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[560px]">
                    <tbody>{searchResults.map((row) => renderCouponRow(row, true))}</tbody>
                  </table>
                </div>
              )
            ) : batches.length === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-slate-400">아직 발급한 교환권이 없어요</p>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => {
                  const open = expanded.has(batch.id)
                  return (
                    <article key={batch.id} className="rounded-xl border-2 border-slate-200">
                      <div className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-[180px] flex-1">
                          <p className="text-base font-black text-slate-900">{batch.productName}</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {batch.name !== batch.productName && <span className="mr-2">{batch.name}</span>}
                            {formatDateTime(batch.createdAt)} 발급 · {batch.coupons.length}장
                          </p>
                        </div>
                        <div className="flex gap-1.5 text-xs font-black">
                          {(Object.keys(SHIP_COUPON_STATUS_LABELS) as ShipCouponStatus[]).map((status) => (
                            <span key={status} className={`rounded-full border px-2 py-1 ${STATUS_CLASS[status]}`}>
                              {SHIP_COUPON_STATUS_LABELS[status]} {batch.counts[status]}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void printCoupons(batch.coupons, batch.id)}
                            disabled={batch.counts.active === 0 || preparingPrint !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-yellow-300 px-3 py-1.5 text-xs font-black text-slate-900 disabled:opacity-40"
                          >
                            {preparingPrint === batch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            미사용 {batch.counts.active}장 인쇄
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              voidCoupons(
                                { batchId: batch.id },
                                `${batch.name}의 미사용 교환권 ${batch.counts.active}장을 모두 취소할까요?`,
                                batch.id
                              )
                            }
                            disabled={batch.counts.active === 0 || voiding !== null}
                            title="미사용 교환권 모두 취소"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-red-200 px-2.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            {voiding === batch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(batch.id)}
                            aria-expanded={open}
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                          >
                            코드 {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      {open && (
                        <div className="max-h-[420px] overflow-auto border-t border-slate-200">
                          <table className="w-full min-w-[480px]">
                            <tbody>{batch.coupons.map((row) => renderCouponRow(row, false))}</tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* 인쇄 전용 — <body> 바로 아래에 그리고, 화면에는 숨겨 둔다 (위 <style> 설명) */}
        {printItems.length > 0 &&
          createPortal(
            <section className="ship-print-root" aria-hidden="true">
              {printPages.map((page, pageIndex) => (
                <div key={pageIndex} className="ship-coupon-page">
                  {page.map((item) => (
                    <article key={item.id} className="ship-coupon-card flex bg-white p-[4.5mm] text-slate-950">
                      <div className="flex min-w-0 flex-1 flex-col justify-between pr-[2.5mm]">
                        <div>
                          <div className="mb-[2mm] inline-flex rounded-full bg-slate-950 px-[3mm] py-[1mm] text-[7.5pt] font-black text-white">
                            특전 교환권 (택배)
                          </div>
                          <h3 className="line-clamp-2 text-[15pt] font-black leading-tight">{item.productName}</h3>
                          <p className="mt-[1.5mm] text-[7pt] font-bold leading-snug text-slate-600">
                            QR을 찍어 받으실 주소를 입력해주세요.
                            <br />
                            교환권이 여러 장이면 한 번에 접수돼요.
                          </p>
                        </div>
                        <div className="space-y-[0.8mm]">
                          <div className="text-[5.8pt] font-black leading-none text-slate-400">교환권 코드 · 1회만 접수</div>
                          <div className="font-mono text-[14pt] font-black leading-none tracking-[0.08em]">
                            {formatShipCouponCode(item.code)}
                          </div>
                          <div className="text-[5.8pt] font-bold text-slate-500">QR이 안 되면 acscent.co.kr/ship 에서 입력</div>
                        </div>
                      </div>
                      <div className="flex w-[31mm] shrink-0 flex-col items-center justify-center gap-[1.5mm]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.qr} alt={`${item.code} QR`} className="h-[30mm] w-[30mm]" />
                        <div className="w-full rounded-full bg-yellow-300 py-[1mm] text-center text-[6.5pt] font-black text-slate-950">
                          택배 접수
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </section>,
            document.body
          )}
      </main>
    </div>
  )
}
