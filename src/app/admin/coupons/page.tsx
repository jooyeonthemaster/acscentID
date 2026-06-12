'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Printer,
  QrCode,
  ShieldCheck,
  Ticket,
  Trash2,
} from 'lucide-react'
import { getCouponDiscountLabel, getCouponDiscountType, type CouponDiscountType } from '@/types/coupon'
import { AdminHeader } from '../components/AdminHeader'
import { RepurchaseCouponSettings } from './RepurchaseCouponSettings'

interface IssueForm {
  title: string
  description: string
  discountType: CouponDiscountType
  discountValue: string
  quantity: string
  validUntil: string
}

interface PrintableCoupon {
  id: string
  serialNumber: string
  claimUrl: string
  qrImageUrl: string
  title: string
  description: string | null
  discountType: CouponDiscountType
  discountPercent: number
  discountAmount: number
  validUntil: string | null
}

interface RecentCouponRow {
  id: string
  batch_id: string
  batch_name: string | null
  serial_number: string
  status: string
  claimed_at: string | null
  expires_at: string | null
  printed_at: string | null
  created_at: string | null
  claim_url?: string | null
  coupon: {
    title: string
    description?: string | null
    discount_percent: number
    discount_type?: CouponDiscountType | string | null
    discount_amount?: number | null
    valid_until: string | null
  } | {
    title: string
    description?: string | null
    discount_percent: number
    discount_type?: CouponDiscountType | string | null
    discount_amount?: number | null
    valid_until: string | null
  }[] | null
}

interface CouponGroup {
  key: string
  title: string
  description: string | null
  total: number
  active: number
  claimed: number
  used: number
  voided: number
  discountLabel: string
  validUntilLabel: string
  latestCreatedAt: string | null
  rows: RecentCouponRow[]
}

const COUPONS_PER_PRINT_PAGE = 10
const COUPON_REGISTER_PATH = '/coupon/register'

const DEFAULT_FORM: IssueForm = {
  title: '오프라인 구매 감사 쿠폰',
  description: '매장에서 구매해주신 고객님께 드리는 할인 쿠폰입니다.',
  discountType: 'percent',
  discountValue: '10',
  quantity: '10',
  validUntil: '',
}

function formatDate(value: string | null): string {
  if (!value) return '상시'
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getRecentCoupon(row: RecentCouponRow) {
  if (Array.isArray(row.coupon)) return row.coupon[0] || null
  return row.coupon
}

function getPrintableCouponDiscountLabel(coupon: PrintableCoupon): string {
  if (coupon.discountType === 'fixed_amount') {
    return `${Math.max(0, Number(coupon.discountAmount || 0)).toLocaleString('ko-KR')}원`
  }

  return `${Math.max(0, Number(coupon.discountPercent || 0))}%`
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'claimed':
      return '등록됨'
    case 'used':
      return '사용됨'
    case 'void':
      return '취소됨'
    default:
      return '발급됨'
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'claimed':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'used':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'void':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function createGroupKey(row: RecentCouponRow): string {
  const coupon = getRecentCoupon(row)
  return coupon?.title || row.batch_name || '실물 쿠폰'
}

function getConfiguredSiteUrl(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!rawUrl || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) return null
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
  return normalized.replace(/\/$/, '')
}

function getCouponRegisterUrl(): string {
  const baseUrl = getConfiguredSiteUrl() || window.location.origin
  return `${baseUrl}${COUPON_REGISTER_PATH}`
}

async function createQrImageDataUrl(claimUrl: string): Promise<string> {
  return QRCode.toDataURL(claimUrl, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

export default function AdminCouponsPage() {
  const [form, setForm] = useState<IssueForm>(DEFAULT_FORM)
  const [issuing, setIssuing] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [recentCoupons, setRecentCoupons] = useState<RecentCouponRow[]>([])
  const [serverStats, setServerStats] = useState<{ total: number; active: number; claimed: number; used: number; voided: number } | null>(null)
  const [printCoupons, setPrintCoupons] = useState<PrintableCoupon[]>([])
  const [, setBatchName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const batchStats = useMemo(() => {
    // 서버가 전체 기준으로 정확히 집계한 통계가 있으면 우선 사용 (목록 한도와 무관하게 정확)
    if (serverStats) {
      return {
        active: serverStats.active,
        claimed: serverStats.claimed + serverStats.used,
        total: serverStats.total,
        voided: serverStats.voided,
      }
    }
    const claimed = recentCoupons.filter((coupon) => coupon.status === 'claimed' || coupon.status === 'used').length
    const active = recentCoupons.filter((coupon) => coupon.status === 'active').length
    const voided = recentCoupons.filter((coupon) => coupon.status === 'void').length
    return { active, claimed, total: recentCoupons.length, voided }
  }, [recentCoupons, serverStats])

  const couponGroups = useMemo<CouponGroup[]>(() => {
    const groups = new Map<string, RecentCouponRow[]>()

    for (const row of recentCoupons) {
      const key = createGroupKey(row)
      groups.set(key, [...(groups.get(key) || []), row])
    }

    return Array.from(groups.entries())
      .map(([key, rows]) => {
        const sortedRows = [...rows].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        })
        const firstCoupon = getRecentCoupon(sortedRows[0])
        const discounts = new Set(sortedRows.map((row) => getCouponDiscountLabel(getRecentCoupon(row))))
        const validUntilValues = new Set(sortedRows.map((row) => row.expires_at || getRecentCoupon(row)?.valid_until || null))
        const active = sortedRows.filter((row) => row.status === 'active').length
        const claimed = sortedRows.filter((row) => row.status === 'claimed').length
        const used = sortedRows.filter((row) => row.status === 'used').length
        const voided = sortedRows.filter((row) => row.status === 'void').length

        return {
          key,
          title: key,
          description: firstCoupon?.description || null,
          total: sortedRows.length,
          active,
          claimed,
          used,
          voided,
          discountLabel: discounts.size === 1 ? `${Array.from(discounts)[0]} 할인권` : '혼합',
          validUntilLabel: validUntilValues.size === 1 ? formatDate(Array.from(validUntilValues)[0]) : '혼합',
          latestCreatedAt: sortedRows[0]?.created_at || null,
          rows: sortedRows,
        }
      })
      .sort((a, b) => {
        const aTime = a.latestCreatedAt ? new Date(a.latestCreatedAt).getTime() : 0
        const bTime = b.latestCreatedAt ? new Date(b.latestCreatedAt).getTime() : 0
        return bTime - aTime
      })
  }, [recentCoupons])

  const selectedGroup = useMemo(() => {
    return couponGroups.find((group) => group.key === selectedGroupKey) || null
  }, [couponGroups, selectedGroupKey])

  const printPages = useMemo(() => chunkArray(printCoupons, COUPONS_PER_PRINT_PAGE), [printCoupons])
  const effectiveDiscountType: CouponDiscountType = form.discountType === 'fixed_amount' ? 'fixed_amount' : 'percent'
  const effectiveDiscountValue = form.discountValue ?? (effectiveDiscountType === 'fixed_amount' ? '10000' : '10')

  const fetchRecentCoupons = useCallback(async () => {
    setLoadingRecent(true)
    try {
      const response = await fetch('/api/admin/offline-coupons', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '쿠폰 내역을 불러오지 못했습니다')
      }
      setRecentCoupons(data.coupons || [])
      setServerStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿠폰 내역을 불러오지 못했습니다')
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    void fetchRecentCoupons()
  }, [fetchRecentCoupons])

  useEffect(() => {
    if (couponGroups.length === 0) {
      setSelectedGroupKey(null)
      return
    }

    if (selectedGroupKey && !couponGroups.some((group) => group.key === selectedGroupKey)) {
      setSelectedGroupKey(null)
    }
  }, [couponGroups, selectedGroupKey])

  const handleIssueCoupons = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIssuing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/offline-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          discountType: effectiveDiscountType,
          discountValue: Number(effectiveDiscountValue),
          quantity: Number(form.quantity),
          validUntil: form.validUntil || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '쿠폰 발급에 실패했습니다')
      }

      setPrintCoupons(data.coupons || [])
      setBatchName(data.batchName || '')
      setMessage(`${data.coupons?.length || 0}장의 실물 쿠폰이 발급되었습니다.`)
      await fetchRecentCoupons()
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿠폰 발급에 실패했습니다')
    } finally {
      setIssuing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const toPrintableCoupon = async (row: RecentCouponRow): Promise<PrintableCoupon | null> => {
    const coupon = getRecentCoupon(row)
    if (!coupon) return null

    const claimUrl = getCouponRegisterUrl()

    return {
      id: row.id,
      serialNumber: row.serial_number,
      claimUrl,
      qrImageUrl: await createQrImageDataUrl(claimUrl),
      title: coupon.title,
      description: coupon.description || null,
      discountType: getCouponDiscountType(coupon),
      discountPercent: coupon.discount_percent,
      discountAmount: Number(coupon.discount_amount || 0),
      validUntil: row.expires_at || coupon.valid_until,
    }
  }

  const handlePrintSelectedGroup = async (group = selectedGroup) => {
    if (!group) return

    const printable = (await Promise.all(
      group.rows
        .filter((row) => row.status === 'active')
        .map(toPrintableCoupon)
    )).filter((coupon): coupon is PrintableCoupon => coupon !== null)

    if (printable.length === 0) {
      setError('이 묶음에는 인쇄할 수 있는 등록 가능 쿠폰이 없습니다.')
      return
    }

    setError('')
    setPrintCoupons(printable)
    setBatchName(`${group.title} 묶음`)
    requestAnimationFrame(() => window.print())
  }

  const handleDeleteCoupons = async (rows: RecentCouponRow[], label: string) => {
    const activeRows = rows.filter((row) => row.status === 'active')
    const ids = activeRows.map((row) => row.id)

    if (ids.length === 0) {
      setError('삭제할 수 있는 등록 가능 쿠폰이 없습니다.')
      return
    }

    const confirmed = window.confirm(`${label}의 등록 가능한 쿠폰 ${ids.length}장을 삭제할까요? 삭제된 쿠폰은 고객이 등록할 수 없습니다.`)
    if (!confirmed) return

    setError('')
    setMessage('')
    setDeletingIds(new Set(ids))

    try {
      const response = await fetch('/api/admin/offline-coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '쿠폰 삭제에 실패했습니다')
      }

      const cancelledCount = data.cancelledCount || 0
      const skippedCount = data.skippedCount || 0
      const cancelledIds = Array.isArray(data.cancelledIds) && data.cancelledIds.length > 0
        ? data.cancelledIds.filter((id: unknown): id is string => typeof id === 'string')
        : ids.slice(0, cancelledCount)

      setMessage(
        skippedCount > 0
          ? `${cancelledCount}장을 삭제했습니다. 이미 등록되었거나 삭제된 ${skippedCount}장은 유지되었습니다.`
          : `${cancelledCount}장의 쿠폰을 삭제했습니다.`
      )
      setRecentCoupons((prev) => prev.map((coupon) => (
        cancelledIds.includes(coupon.id)
          ? { ...coupon, status: 'void' }
          : coupon
      )))
      setPrintCoupons((prev) => prev.filter((coupon) => !cancelledIds.includes(coupon.id)))
      await fetchRecentCoupons()
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿠폰 삭제에 실패했습니다')
    } finally {
      setDeletingIds(new Set())
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .offline-coupon-sheet-wrap {
          overflow-x: auto;
          padding: 18px;
        }

        .offline-coupon-page {
          display: grid;
          grid-template-columns: repeat(2, 102mm);
          grid-template-rows: repeat(5, 57mm);
          gap: 2mm;
          justify-content: center;
          align-content: start;
          width: 210mm;
          min-height: 297mm;
          padding: 2mm;
          background: white;
          box-sizing: border-box;
          overflow: hidden;
        }

        .offline-coupon-card {
          width: 102mm;
          height: 57mm;
          box-sizing: border-box;
          border: 0;
          border-radius: 3mm;
          box-shadow: none;
          break-inside: avoid;
          page-break-inside: avoid;
          overflow: hidden;
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            min-height: 297mm !important;
          }

          body {
            background: white !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .admin-shell {
            position: static !important;
            inset: auto !important;
            width: auto !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            z-index: auto !important;
          }

          .admin-shell aside {
            display: none !important;
          }

          .admin-shell-main {
            margin-left: 0 !important;
            min-height: 0 !important;
            transition: none !important;
          }

          .offline-print-root,
          .offline-print-root * {
            visibility: visible !important;
          }

          .admin-no-print {
            display: none !important;
          }

          .coupon-admin-main {
            padding: 0 !important;
            margin: 0 !important;
          }

          .coupon-admin-main > * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

          .offline-print-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .offline-coupon-sheet-wrap {
            padding: 0 !important;
            overflow: visible !important;
          }

          .offline-coupon-page {
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: hidden !important;
          }

          .offline-coupon-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .offline-coupon-card {
            box-shadow: none;
          }
        }
      `}</style>

      <div className="admin-no-print">
        <AdminHeader
          title="쿠폰 발급"
          subtitle="오프라인 고객용 실물 코드 쿠폰을 신용카드 크기로 출력합니다"
          actions={
            <button
              onClick={handlePrint}
              disabled={printCoupons.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              A4 인쇄
            </button>
          }
        />
      </div>

      <main className="coupon-admin-main space-y-6 overflow-x-hidden p-4 sm:p-6">
        <RepurchaseCouponSettings />

        <section className="admin-no-print min-w-0 rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[4px_4px_0_#0f172a] sm:p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-900 bg-yellow-300">
              <QrCode className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">실물 쿠폰</h2>
              <p className="text-sm font-semibold text-slate-500">오프라인 고객용 QR 코드 쿠폰 발급 · 관리</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-900 bg-yellow-300">
                <Ticket className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">실물 쿠폰 발급</h2>
                <p className="text-sm font-semibold text-slate-500">QR 스캔 또는 코드 입력으로 등록됩니다</p>
              </div>
            </div>

            <form onSubmit={handleIssueCoupons} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">쿠폰 이름</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-slate-900"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">설명</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-20 w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">할인 방식</label>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border-2 border-slate-200 bg-slate-100 p-1">
                    {[
                      { value: 'percent' as const, label: '정률' },
                      { value: 'fixed_amount' as const, label: '정액' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          discountType: option.value,
                          discountValue: option.value === 'percent' ? '10' : '10000',
                        }))}
                        className={`rounded-lg px-3 py-3 text-sm font-black transition ${
                          effectiveDiscountType === option.value
                            ? 'bg-slate-950 text-white'
                            : 'text-slate-500 hover:bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    {effectiveDiscountType === 'fixed_amount' ? '할인 금액' : '할인율'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={effectiveDiscountType === 'fixed_amount' ? '100' : '1'}
                      max={effectiveDiscountType === 'fixed_amount' ? '1000000' : '100'}
                      step={effectiveDiscountType === 'fixed_amount' ? '100' : '1'}
                      value={effectiveDiscountValue}
                      onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-9 font-black text-slate-900 outline-none transition focus:border-slate-900"
                      required
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                      {effectiveDiscountType === 'fixed_amount' ? '원' : '%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">발급 수량</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-black text-slate-900 outline-none transition focus:border-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">만료일</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="flex items-start gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={issuing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-yellow-300 px-4 py-3 font-black text-slate-950 shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {issuing ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                쿠폰 발급
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-950">발급 현황</h2>
                <p className="text-sm font-semibold text-slate-500">최근 발급된 실물 쿠폰 기준</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
                <ShieldCheck className="h-4 w-4" />
                해시 저장
              </div>
            </div>

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2 sm:gap-3">
              <div className="rounded-xl bg-slate-950 p-3 sm:p-4 text-white">
                <div className="text-xs font-bold text-slate-300">전체</div>
                <div className="mt-1 text-xl sm:text-2xl font-black">{batchStats.total}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 sm:p-4 text-emerald-900">
                <div className="text-xs font-bold text-emerald-600">등록 가능</div>
                <div className="mt-1 text-xl sm:text-2xl font-black">{batchStats.active}</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 sm:p-4 text-blue-900">
                <div className="text-xs font-bold text-blue-600">등록 완료</div>
                <div className="mt-1 text-xl sm:text-2xl font-black">{batchStats.claimed}</div>
              </div>
              <div className="rounded-xl bg-red-50 p-3 sm:p-4 text-red-900">
                <div className="text-xs font-bold text-red-600">삭제됨</div>
                <div className="mt-1 text-xl sm:text-2xl font-black">{batchStats.voided}</div>
              </div>
            </div>

            {loadingRecent ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 py-16 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : couponGroups.length === 0 ? (
              <div className="rounded-xl border border-slate-200 py-16 text-center text-sm font-bold text-slate-400">
                발급된 실물 쿠폰 묶음이 없습니다
              </div>
            ) : (
              <div className="max-h-[760px] min-w-0 space-y-3 overflow-y-auto pr-1">
                {couponGroups.map((group) => {
                  const selected = selectedGroupKey === group.key
                  return (
                    <article
                      key={group.key}
                      className={`overflow-hidden rounded-xl border-2 transition ${
                        selected
                          ? 'border-slate-950 bg-yellow-50 shadow-[3px_3px_0_#000]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={selected}
                        onClick={() => setSelectedGroupKey((current) => current === group.key ? null : group.key)}
                        className="w-full p-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">{group.title}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {group.discountLabel} · 만료 {group.validUntilLabel}
                            </div>
                          </div>
                          <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition ${selected ? 'rotate-90 text-slate-950' : ''}`} />
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                          <div className="rounded-lg bg-slate-950 px-2 py-2 text-white">
                            <div className="text-[10px] font-bold text-slate-300">총</div>
                            <div className="text-lg font-black">{group.total}</div>
                          </div>
                          <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-800">
                            <div className="text-[10px] font-bold text-emerald-600">가능</div>
                            <div className="text-lg font-black">{group.active}</div>
                          </div>
                          <div className="rounded-lg bg-blue-50 px-2 py-2 text-blue-800">
                            <div className="text-[10px] font-bold text-blue-600">등록</div>
                            <div className="text-lg font-black">{group.claimed + group.used}</div>
                          </div>
                          <div className="rounded-lg bg-red-50 px-2 py-2 text-red-800">
                            <div className="text-[10px] font-bold text-red-600">취소</div>
                            <div className="text-lg font-black">{group.voided}</div>
                          </div>
                        </div>
                      </button>

                      {selected && (
                        <div className="border-t-2 border-slate-200 bg-white">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-3 sm:px-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <PackageCheck className="h-4 w-4 text-slate-600" />
                                <h3 className="truncate text-sm font-black text-slate-900">{group.title}</h3>
                              </div>
                              <p className="mt-1 truncate text-xs font-bold text-slate-500">
                                {group.description || '선택한 묶음의 개별 쿠폰 코드'}
                              </p>
                            </div>
                            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handlePrintSelectedGroup(group)}
                                disabled={group.active === 0}
                                className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-2.5 py-2 text-xs font-black text-slate-900 shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
                              >
                                <Printer className="h-4 w-4" />
                                <span className="hidden sm:inline">묶음 인쇄</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupons(group.rows, group.title)}
                                disabled={group.active === 0 || deletingIds.size > 0}
                                className="inline-flex items-center gap-2 rounded-lg border-2 border-red-200 bg-white px-2.5 py-2 text-xs font-black text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
                              >
                                {deletingIds.size > 0 && group.rows.some((row) => deletingIds.has(row.id))
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />
                                }
                                <span className="hidden sm:inline">묶음 삭제</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400 sm:px-4">
                            <span className="flex-1">코드 · 만료</span>
                            <span className="w-16 text-center">상태</span>
                            <span className="w-8 text-right">관리</span>
                          </div>
                          <div className="max-h-[430px] overflow-y-auto">
                            {group.rows.map((row) => {
                              const coupon = getRecentCoupon(row)
                              const deleting = deletingIds.has(row.id)
                              return (
                                <div
                                  key={row.id}
                                  className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm sm:px-4"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-mono text-xs font-black text-slate-700">{row.serial_number}</div>
                                    <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                      만료 {formatDate(row.expires_at || coupon?.valid_until || null)}
                                    </div>
                                  </div>
                                  <span className={`w-16 flex-shrink-0 rounded-full border px-1.5 py-1 text-center text-[11px] font-black ${getStatusClass(row.status)}`}>
                                    {getStatusLabel(row.status)}
                                  </span>
                                  <div className="flex w-8 flex-shrink-0 justify-end">
                                    {row.status === 'active' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCoupons([row], row.serial_number)}
                                        disabled={deleting}
                                        aria-label="쿠폰 삭제"
                                        title="쿠폰 삭제"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                      </button>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-300">-</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          </div>
        </section>

        {/* 인쇄 전용 영역 — 화면에는 표시하지 않고, "A4 인쇄"/"묶음 인쇄" 시에만 A4 카드가 출력됩니다 */}
        <section className="offline-print-root hidden print:block">
          {printCoupons.length > 0 && (
            <div className="offline-coupon-sheet-wrap">
              {printPages.map((pageCoupons, pageIndex) => (
                <div key={`print-page-${pageIndex}`} className="offline-coupon-page">
                  {pageCoupons.map((coupon) => (
                    <article
                      key={coupon.id}
                      className="offline-coupon-card flex bg-white p-[4mm] text-slate-950"
                    >
                      <div className="flex min-w-0 flex-1 flex-col justify-between pr-[3mm]">
                        <div>
                          <div className="mb-[2mm] inline-flex rounded-full bg-slate-950 px-[3mm] py-[1mm] text-[8pt] font-black text-white">
                            AC&apos;SCENT ID COUPON
                          </div>
                          <h3 className="line-clamp-2 text-[13pt] font-black leading-tight">{coupon.title}</h3>
                          <div className="mt-[1mm] text-[19pt] font-black leading-none">
                            {getPrintableCouponDiscountLabel(coupon)} 할인권
                          </div>
                          <p className="mt-[1.5mm] line-clamp-2 text-[6.8pt] font-bold leading-tight text-slate-600">
                            {coupon.description || '오프라인 고객 전용 쿠폰'}
                          </p>
                        </div>

                        <div className="space-y-[0.9mm]">
                          <div className="text-[5.8pt] font-black leading-none text-slate-400">쿠폰 코드</div>
                          <div className="font-mono text-[14pt] font-black leading-none tracking-[0.08em] text-slate-950">{coupon.serialNumber}</div>
                          <div className="text-[6.5pt] font-bold text-slate-500">만료일 {formatDate(coupon.validUntil)}</div>
                        </div>
                      </div>

                      <div className="flex w-[28mm] flex-col items-center justify-between pl-[3mm]">
                        <img
                          src={coupon.qrImageUrl}
                          alt={`${coupon.serialNumber} QR`}
                          className="h-[23mm] w-[23mm]"
                        />
                        <div className="text-center text-[5.8pt] font-black leading-tight text-slate-700">
                          스캔 후 코드 입력
                        </div>
                        <div className="h-[5mm] w-full rounded-full bg-yellow-300 text-center text-[6pt] font-black leading-[5mm] text-slate-950">
                          쿠폰 등록
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
