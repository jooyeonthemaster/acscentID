'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { formatPrice } from '@/types/cart'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'

interface Suggestion {
  id: string
  order_number: string
  final_price: number
  recipient_name: string | null
  depositor_name?: string | null
  perfume_name: string | null
  created_at: string
  sameAmount: boolean
  sameName: boolean
}

interface Deposit {
  id: string
  amount: number
  depositor_name: string | null
  account_suffix: string | null
  status: string
  note: string | null
  raw_text: string
  occurred_at: string | null
  received_at: string
  resolved_by: string | null
  matched_order: { id: string; order_number: string; status: string } | null
  suggestions: Suggestion[]
}

interface ListResponse {
  deposits: Deposit[]
  receiving: boolean
  accountSuffix: string
  windowHours: number
  error?: string
  setupNeeded?: boolean
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  matched: { label: '자동 확인', tone: 'bg-emerald-100 text-emerald-800' },
  linked: { label: '관리자 확인', tone: 'bg-emerald-100 text-emerald-800' },
  unmatched: { label: '주문 못 찾음', tone: 'bg-amber-100 text-amber-800' },
  ambiguous: { label: '후보 여러 건', tone: 'bg-amber-100 text-amber-800' },
  failed: { label: '처리 오류', tone: 'bg-red-100 text-red-700' },
  ignored: { label: '자동 제외', tone: 'bg-slate-100 text-slate-600' },
  dismissed: { label: '주문 아님', tone: 'bg-slate-100 text-slate-600' },
  received: { label: '처리 중', tone: 'bg-slate-100 text-slate-600' },
}

const kst = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    : '-'

/**
 * 관리자 - 입금 문자 확인
 * 우리은행 입금 문자로 자동 입금완료 처리하지 못한 입금(주문 못 찾음·후보 여러 건·오류)을 모아,
 * 맞는 주문을 골라 입금 확인하거나 주문과 무관한 입금으로 넘긴다. 아래에는 최근 처리 기록.
 */
export default function BankDepositsPage() {
  const [view, setView] = useState<'review' | 'all'>('review')
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/bank-deposits?view=${view}`, { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setData({ deposits: [], receiving: false, accountSuffix: '', windowHours: 0, error: '목록을 불러오지 못했어요' })
    } finally {
      setLoading(false)
    }
  }, [view])

  useEffect(() => {
    load()
  }, [load])

  const act = async (deposit: Deposit, body: Record<string, unknown>, confirmText: string) => {
    if (!window.confirm(confirmText)) return
    setBusy(deposit.id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/bank-deposits/${deposit.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || '처리하지 못했어요')
      setMessage(result.orderNumber ? `${result.orderNumber} 주문을 입금완료로 바꿨어요` : '처리했어요')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '처리하지 못했어요')
    } finally {
      setBusy(null)
    }
  }

  const deposits = data?.deposits ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="입금 문자 확인"
        subtitle="우리은행 입금 문자로 무통장 주문을 자동 입금완료 처리합니다. 자동으로 못 고른 입금만 여기서 골라 주세요."
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        {data && !data.error && !data.receiving && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              아직 입금 문자를 받지 않고 있어요. 서버 환경변수 BANK_NOTIFY_INGEST_TOKEN 을 넣고 폰(MacroDroid)을 설정해야 자동 확인이 시작됩니다.
            </span>
          </div>
        )}
        {data?.error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{data.error}</span>
          </div>
        )}
        {message && <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800">{message}</div>}

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-bold">
            {(['review', 'all'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded-md px-3 py-1.5 ${view === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {key === 'review' ? '확인 필요' : '전체 기록'}
              </button>
            ))}
          </div>
          {data?.receiving && (
            <p className="text-xs text-slate-500">
              계좌 *{data.accountSuffix} · 주문 후 {Math.round(data.windowHours / 24)}일 안의 입금만 자동 확인
            </p>
          )}
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : deposits.length === 0 && !data?.error ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            {view === 'review' ? '확인이 필요한 입금이 없어요.' : '받은 입금 문자가 아직 없어요.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {deposits.map((deposit) => {
              const status = STATUS_LABEL[deposit.status] ?? { label: deposit.status, tone: 'bg-slate-100 text-slate-600' }
              const isReview = ['unmatched', 'ambiguous', 'failed'].includes(deposit.status)
              return (
                <li key={deposit.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.tone}`}>{status.label}</span>
                    <span className="text-lg font-black text-slate-900">{formatPrice(deposit.amount)}원</span>
                    <span className="font-bold text-slate-800">{deposit.depositor_name || '(이름 없음)'}</span>
                    <span className="text-xs text-slate-500">입금 {kst(deposit.occurred_at || deposit.received_at)}</span>
                    {deposit.matched_order && (
                      <span className="text-xs font-semibold text-emerald-700">→ {deposit.matched_order.order_number}</span>
                    )}
                  </div>
                  {deposit.note && <p className="mt-1 text-sm text-slate-600">{deposit.note}</p>}
                  {deposit.resolved_by && <p className="mt-1 text-xs text-slate-400">처리: {deposit.resolved_by}</p>}

                  {isReview && (
                    <div className="mt-3 space-y-2">
                      {deposit.suggestions.length === 0 ? (
                        <p className="text-sm text-slate-500">금액이나 이름이 같은 입금대기 무통장 주문이 없어요.</p>
                      ) : (
                        deposit.suggestions.map((order) => (
                          <div key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-mono text-xs text-slate-500">{order.order_number}</span>
                            <span className={order.sameAmount ? 'font-bold text-slate-900' : 'text-red-600'}>
                              {formatPrice(order.final_price)}원
                            </span>
                            <span className={order.sameName ? 'font-bold text-slate-900' : 'text-slate-600'}>
                              {order.depositor_name || order.recipient_name}
                              {order.depositor_name && order.recipient_name && order.depositor_name !== order.recipient_name && (
                                <span className="text-xs text-slate-400"> (받는 분 {order.recipient_name})</span>
                              )}
                            </span>
                            <span className="truncate text-xs text-slate-500">{order.perfume_name}</span>
                            <span className="text-xs text-slate-400">주문 {kst(order.created_at)}</span>
                            <button
                              disabled={busy === deposit.id}
                              onClick={() =>
                                act(
                                  deposit,
                                  { action: 'link', orderId: order.id },
                                  `${order.order_number} 주문을 입금완료로 바꿀까요?\n재고 차감·쿠폰 처리·ERP 매출 반영이 함께 됩니다.${order.sameAmount ? '' : '\n\n⚠️ 입금액과 주문 금액이 다릅니다.'}`,
                                )
                              }
                              className="ml-auto flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />이 주문 입금 확인
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        disabled={busy === deposit.id}
                        onClick={() => act(deposit, { action: 'dismiss' }, '이 입금을 주문과 무관한 입금으로 넘길까요?')}
                        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />주문 아님 — 넘기기
                      </button>
                    </div>
                  )}

                  <details className="mt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer">문자 원문</summary>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-slate-600">{deposit.raw_text}</pre>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
