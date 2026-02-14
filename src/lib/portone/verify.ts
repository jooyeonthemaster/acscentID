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
  customData?: string
}

export interface PortOneCancelResponse {
  cancellationId: string
  cancelledAt: string
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

  return response.json()
}
