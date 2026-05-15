'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'

export interface RefundModalOrder {
  id: string
  order_number: string
  recipient_name: string
  perfume_name: string
  final_price: number
  payment_method?: string | null
  payment_id?: string | null
  receipt_url?: string | null
  status?: string
  refunded_at?: string | null
  refund_reason?: string | null
  cancel_reason?: string | null
}

interface RefundModalProps {
  order: RefundModalOrder
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '신용/체크카드 (KCP)',
  kakao_pay: '카카오페이',
  naver_pay: '네이버페이',
  bank_transfer: '계좌이체(무통장)',
}

function formatPrice(n: number) {
  return `${n.toLocaleString()}원`
}

export function RefundModal({ order, onClose, onSuccess }: RefundModalProps) {
  const isBank = order.payment_method === 'bank_transfer'
  const isOrphan = order.status === 'cancelled' && !order.refunded_at
  const [reason, setReason] = useState(order.refund_reason || order.cancel_reason || '')
  const [amountInput, setAmountInput] = useState<string>(
    String(order.final_price)
  )
  const [isPartial, setIsPartial] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [transferredAt, setTransferredAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
  )
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const amount = useMemo(() => {
    const v = Number(amountInput.replace(/[^0-9]/g, ''))
    return Number.isFinite(v) ? v : 0
  }, [amountInput])

  const amountInvalid = isPartial && (amount <= 0 || amount > order.final_price)

  useEffect(() => {
    // 모달 열렸을 때 바디 스크롤 차단
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleSubmit = async () => {
    setErrorMsg(null)
    if (!acknowledged) {
      setErrorMsg('환불 실행에 대한 확인 체크가 필요합니다.')
      return
    }
    if (reason.trim().length < 2) {
      setErrorMsg('환불 사유를 2자 이상 입력해 주세요.')
      return
    }
    if (amountInvalid) {
      setErrorMsg('환불 금액이 유효하지 않습니다.')
      return
    }

    setSubmitting(true)
    try {
      const endpoint = isBank
        ? '/api/admin/orders/refund/manual'
        : '/api/admin/orders/refund'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        orderId: order.id,
        reason: reason.trim(),
      }
      if (isPartial) payload.amount = amount
      if (isBank) payload.transferredAt = transferredAt

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '환불 처리에 실패했습니다')
      }
      onSuccess()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '환불 처리에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000] max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <h2 className="font-black text-lg text-slate-900">
              {isBank ? '계좌이체 환불 처리' : '카드/간편결제 환불 처리'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 오염 복구 안내 */}
          {isOrphan && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 text-sm text-amber-900">
              <p className="font-bold">⚠️ 상태 불일치 복구 모드</p>
              <p className="mt-1 text-xs leading-relaxed">
                DB 상태는 이미 <strong>취소완료</strong>지만 포트원 환불 기록이 없습니다. 실제 포트원에서 결제가 살아있는지 자동으로 확인한 뒤 누락된 환불을 진행하거나 DB만 동기화합니다.
              </p>
            </div>
          )}

          {/* 주문 정보 요약 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">주문번호</span>
              <span className="font-mono font-bold text-slate-900">
                {order.order_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">주문자</span>
              <span className="font-bold text-slate-900">
                {order.recipient_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">상품</span>
              <span className="text-slate-900 text-right max-w-[60%] truncate">
                {order.perfume_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">결제 수단</span>
              <span className="text-slate-900">
                {PAYMENT_METHOD_LABEL[order.payment_method || ''] ||
                  order.payment_method ||
                  '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">결제 금액</span>
              <span className="font-black text-slate-900">
                {formatPrice(order.final_price)}
              </span>
            </div>
            {order.receipt_url && (
              <a
                href={order.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                영수증 확인 <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* 부분 환불 토글 */}
          {!isBank && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPartial}
                onChange={(e) => setIsPartial(e.target.checked)}
                className="w-4 h-4"
              />
              부분 환불 (일부 금액만)
            </label>
          )}

          {/* 금액 입력 */}
          {isPartial && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1">
                환불 금액
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  amountInvalid
                    ? 'border-red-500'
                    : 'border-slate-300 focus:border-slate-900'
                } outline-none`}
                placeholder="숫자만 입력"
              />
              <p className="text-xs text-slate-500 mt-1">
                최대 {formatPrice(order.final_price)}
              </p>
            </div>
          )}

          {/* 계좌이체: 송금일 */}
          {isBank && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1">
                송금 완료 일시
              </label>
              <input
                type="datetime-local"
                value={transferredAt}
                onChange={(e) => setTransferredAt(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm outline-none focus:border-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">
                고객 계좌로 직접 송금 완료한 시각을 기록합니다. PG API 호출은 발생하지 않습니다.
              </p>
            </div>
          )}

          {/* 사유 */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              환불 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="예: 고객 단순변심 요청, 배송 전 재고 부족 등 (2자 이상)"
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm resize-none outline-none focus:border-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              사유는 감사 로그에 그대로 기록되고 고객에게도 발송되는 환불 안내 메일에 포함됩니다.
            </p>
          </div>

          {/* 확인 체크 */}
          <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer bg-red-50 border-2 border-red-400 rounded-xl p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 mt-0.5"
            />
            <span className="leading-relaxed">
              {isBank
                ? '해당 고객의 계좌로 환불 송금을 이미 완료했으며, 이 내역을 환불로 기록함을 확인합니다.'
                : '이 작업은 되돌릴 수 없습니다. 포트원으로 실제 결제 취소 API가 호출되며 고객 카드 승인이 해제됨을 확인합니다.'}
            </span>
          </label>

          {/* 에러 */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 px-5 py-3 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl border-2 border-slate-300 font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !acknowledged || reason.trim().length < 2 || amountInvalid}
            className="flex-1 h-11 rounded-xl border-2 border-slate-900 font-black text-white bg-red-500 hover:bg-red-600 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                처리 중...
              </>
            ) : (
              '환불 실행'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
