// PortOne V2 결제 검증 및 환불 (서버사이드 전용)

const PORTONE_API_BASE = 'https://api.portone.io'

export interface PortOnePaymentResponse {
  id: string
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'READY' | 'VIRTUAL_ACCOUNT_ISSUED' | 'PARTIAL_CANCELLED'
  amount: {
    total: number
    paid: number
    cancelled: number
  }
  method?: {
    type: string
    provider?: string
  }
  channel?: {
    pgProvider: string
    name: string
  }
  paidAt?: string
  receiptUrl?: string
  pgTxId?: string
  orderName?: string
  customData?: string | Record<string, unknown>
}

export interface PortOneCancelResponse {
  cancellationId: string
  cancelledAt: string
  raw?: unknown
}

export interface PortOnePreRegisterResponse {
  success: true
}

/**
 * 포트원 API에서 결제 정보 조회
 */
export async function getPortOnePayment(paymentId: string): Promise<PortOnePaymentResponse> {
  const response = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`PortOne API error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * 포트원 결제 정보 사전 등록
 * 브라우저 결제창 호출 전에 결제 예정 금액을 포트원에 등록해 금액 위변조를 방어합니다.
 */
export async function preRegisterPortOnePayment(
  paymentId: string,
  totalAmount: number
): Promise<PortOnePreRegisterResponse> {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const apiSecret = process.env.PORTONE_API_SECRET

  if (!storeId || !apiSecret) {
    throw new Error('PortOne server environment is not configured')
  }

  const response = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/pre-register`,
    {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId,
        totalAmount,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`PortOne pre-register error: ${error.message || response.statusText}`)
  }

  return { success: true }
}

/**
 * 포트원 결제 취소 (환불)
 * @param paymentId - 포트원 결제 ID
 * @param reason - 환불 사유
 * @param amount - 부분 환불 금액 (생략 시 전액 환불)
 */
export async function cancelPortOnePayment(
  paymentId: string,
  reason: string,
  amount?: number
): Promise<PortOneCancelResponse> {
  const body: Record<string, unknown> = { reason }
  if (amount !== undefined) {
    body.amount = amount
  }

  const response = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`PortOne cancel error: ${error.message || response.statusText}`)
  }

  const result = await response.json()
  const cancellation = result?.cancellation || result

  return {
    cancellationId: cancellation?.id || cancellation?.cancellationId || '',
    cancelledAt: cancellation?.cancelledAt || cancellation?.cancelled_at || new Date().toISOString(),
    raw: result,
  }
}
