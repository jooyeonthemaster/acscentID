/**
 * 오프라인 결제 증빙 접수 — 손님 폼(/proof)과 접수 API(/api/offline-proof)가 같이 쓰는 값.
 * 테이블·버킷은 supabase/migrations/20261022_offline_payment_proofs.sql 로 만든다.
 */

export const OFFLINE_PROOF_TABLE = 'offline_payment_proofs'
export const OFFLINE_PROOF_PRODUCTS_TABLE = 'offline_proof_products'
export const OFFLINE_PROOF_BUCKET = 'offline-payment-proofs'

export const OFFLINE_PROOF_MAX_IMAGES = 3
/** 한 장 상한 — 폼이 미리 줄여서 보내므로 보통 1MB 안팎 */
export const OFFLINE_PROOF_MAX_IMAGE_BYTES = 4 * 1024 * 1024
/** 요청 전체 상한 — Vercel 요청 본문 4.5MB 제한 아래로 */
export const OFFLINE_PROOF_MAX_TOTAL_BYTES = 4.2 * 1024 * 1024
export const OFFLINE_PROOF_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const OFFLINE_PROOF_MAX_AMOUNT = 100_000_000

/** 계좌번호 숫자 자릿수 — 은행마다 10~14자리, 옛 계좌·증권사까지 넉넉히 */
export const ACCOUNT_DIGITS_MIN = 8
export const ACCOUNT_DIGITS_MAX = 20

/** 은행 선택지 — 목록에 없으면 '기타'를 고르고 직접 입력 */
export const BANK_OPTIONS = [
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협은행',
  'IBK기업은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
  '새마을금고',
  '신협',
  '우체국',
  'SC제일은행',
  '수협은행',
  'iM뱅크(대구)',
  '부산은행',
  '경남은행',
  '광주은행',
  '전북은행',
  '제주은행',
  'KDB산업은행',
  '한국씨티은행',
  '저축은행',
] as const

export const BANK_OTHER = '기타'

/** 상품 한 줄 수량 상한 */
export const OFFLINE_PROOF_MAX_QUANTITY = 20
export const OFFLINE_PROOF_PRODUCT_NAME_MAX = 50

/** 손님 폼에 보내는 상품 — 기준 가격은 손님에게 보내지 않는다 */
export interface OfflineProofProductOption {
  id: string
  name: string
}

/** 관리자 「상품 관리」의 상품 */
export interface OfflineProofProduct {
  id: string
  created_at: string
  updated_at: string
  name: string
  /** 차액 계산용 기준 가격 — 비어 있으면 차액을 계산하지 않는다 */
  price: number | null
  is_active: boolean
  sort_order: number
}

/** 접수에 저장되는 구매 상품 — 상품명은 제출 당시 그대로 남긴다 */
export interface OfflineProofItem {
  product_id: string
  name: string
  quantity: number
}

export const REFUND_TYPES = ['full', 'difference', 'custom'] as const
export type RefundType = (typeof REFUND_TYPES)[number]

export const REFUND_TYPE_LABELS: Record<RefundType, string> = {
  full: '전액',
  difference: '차액',
  custom: '직접 입력',
}

/** 구매 상품의 기준 가격 합계 — 가격이 없는 상품이 하나라도 있거나 상품이 없으면 null */
export function itemsTotal(
  items: Pick<OfflineProofItem, 'product_id' | 'quantity'>[],
  priceById: Map<string, number | null>
): number | null {
  if (items.length === 0) return null
  let total = 0
  for (const item of items) {
    const price = priceById.get(item.product_id)
    if (price === null || price === undefined) return null
    total += price * item.quantity
  }
  return total
}

/**
 * 환불 금액 — 전액은 결제 금액 그대로, 차액은 결제 금액 − 기준 가격 합계(음수면 0).
 * 차액을 계산할 수 없으면(기준 가격 없음) null.
 */
export function refundAmountFor(
  type: 'full' | 'difference',
  paymentAmount: number,
  total: number | null
): number | null {
  if (type === 'full') return paymentAmount
  if (total === null) return null
  return Math.max(0, paymentAmount - total)
}

/** '비아이 클리커 1개, 비아이 피규어 2개' */
export function formatItems(items: Pick<OfflineProofItem, 'name' | 'quantity'>[]): string {
  return items.map((item) => `${item.name} ${item.quantity}개`).join(', ')
}

/** 010-1234-5678 형태로 자동 하이픈 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

/** 35000 → '35,000' */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR')
}

/** KST 기준 오늘 'YYYY-MM-DD' */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
