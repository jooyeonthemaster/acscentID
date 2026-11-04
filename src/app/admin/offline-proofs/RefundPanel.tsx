'use client'

import { useState } from 'react'
import { Banknote, Loader2 } from 'lucide-react'
import {
  REFUND_TYPE_LABELS,
  refundAmountFor,
  type OfflineProofItem,
  type RefundType,
} from '@/lib/offline-proof'

export interface RefundTarget {
  id: string
  payment_amount: number
  /** 관리자 API 가 붙여 주는 지금 기준 가격 */
  items: (OfflineProofItem & { price: number | null })[]
  items_total: number | null
  refund_type: RefundType | null
  refund_amount: number | null
}

export interface RefundSaved {
  refund_type: RefundType | null
  refund_amount: number | null
  updated_at: string
}

function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

/**
 * 환불 금액 정하기 — 전액 / 차액(결제 금액 − 기준 가격 × 수량) / 직접 입력.
 * 정한 금액은 저장 시점 값으로 고정되어 엑셀 「환불 금액」 칸에 들어간다.
 */
export function RefundPanel({ request, onSaved }: { request: RefundTarget; onSaved: (saved: RefundSaved) => void }) {
  const difference = refundAmountFor('difference', request.payment_amount, request.items_total)
  const [custom, setCustom] = useState(
    request.refund_type === 'custom' && request.refund_amount !== null ? String(request.refund_amount) : ''
  )
  const [saving, setSaving] = useState<RefundType | 'clear' | null>(null)

  const save = async (type: RefundType | null, amount?: number) => {
    setSaving(type ?? 'clear')
    try {
      const response = await fetch('/api/admin/offline-proofs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, refund_type: type, refund_amount: amount }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const updated = data.updated?.[0]
      if (!updated) throw new Error('차액을 계산할 수 없습니다 — 상품 기준 가격을 확인해주세요')
      onSaved({ refund_type: updated.refund_type, refund_amount: updated.refund_amount, updated_at: data.updated_at })
      if (type !== 'custom') setCustom('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '환불 금액 저장에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const optionClass = (type: RefundType) =>
    `flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
      request.refund_type === type
        ? 'border-slate-900 bg-yellow-50'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Banknote className="h-4 w-4 text-slate-500" />
          환불 금액
        </span>
        {request.refund_type && request.refund_amount !== null ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-sm font-bold text-emerald-700">
            {REFUND_TYPE_LABELS[request.refund_type]} · {formatWon(request.refund_amount)}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">미정</span>
        )}
      </div>

      {/* 계산 근거 */}
      <dl className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">결제 금액</dt>
          <dd className="text-slate-900">{formatWon(request.payment_amount)}</dd>
        </div>
        {request.items.map(item => (
          <div key={item.product_id} className="flex justify-between gap-3">
            <dt className="text-slate-500">
              {item.name} × {item.quantity}
            </dt>
            <dd className={item.price === null ? 'text-amber-600' : 'text-slate-900'}>
              {item.price === null ? '기준 가격 미입력' : `− ${formatWon(item.price * item.quantity)}`}
            </dd>
          </div>
        ))}
        {request.items.length === 0 && <div className="text-xs text-slate-400">선택한 구매 상품 없음</div>}
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-1 font-bold">
          <dt className="text-slate-700">차액</dt>
          <dd className="text-slate-900">{difference === null ? '계산 불가' : formatWon(difference)}</dd>
        </div>
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => save('full')} disabled={saving !== null} className={optionClass('full')}>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            {saving === 'full' && <Loader2 className="h-3 w-3 animate-spin" />}
            전액 환불
          </span>
          <span className="text-sm font-bold text-slate-900">{formatWon(request.payment_amount)}</span>
        </button>
        <button
          onClick={() => save('difference')}
          disabled={saving !== null || difference === null}
          className={optionClass('difference')}
          title={difference === null ? '상품 기준 가격을 먼저 입력하세요 (증빙 상품 관리)' : undefined}
        >
          <span className="flex items-center gap-1 text-xs text-slate-500">
            {saving === 'difference' && <Loader2 className="h-3 w-3 animate-spin" />}
            차액 환불
          </span>
          <span className="text-sm font-bold text-slate-900">{difference === null ? '—' : formatWon(difference)}</span>
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <input
            value={custom ? Number(custom).toLocaleString('ko-KR') : ''}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9))}
            inputMode="numeric"
            placeholder="금액 직접 입력"
            aria-label="환불 금액 직접 입력"
            className={`w-full rounded-lg border-2 py-1.5 pl-3 pr-7 text-right text-sm text-slate-900 focus:border-yellow-400 focus:outline-none ${
              request.refund_type === 'custom' ? 'border-slate-900' : 'border-slate-200'
            }`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
        </div>
        <button
          onClick={() => save('custom', Number(custom))}
          disabled={saving !== null || custom === ''}
          className="flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-yellow-400 px-3 py-1.5 text-sm font-medium text-slate-900 disabled:border-slate-200 disabled:bg-white disabled:text-slate-300"
        >
          {saving === 'custom' && <Loader2 className="h-4 w-4 animate-spin" />}
          저장
        </button>
      </div>

      {difference === null && request.items.some(item => item.price === null) && (
        <p className="mt-2 text-xs text-amber-700">
          차액을 계산하려면 위 <span className="font-bold">증빙 상품 관리</span>에서 기준 가격을 입력하세요.
        </p>
      )}
      {request.refund_type && (
        <button
          onClick={() => save(null)}
          disabled={saving !== null}
          className="mt-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          환불 금액 지우기
        </button>
      )}
    </div>
  )
}
