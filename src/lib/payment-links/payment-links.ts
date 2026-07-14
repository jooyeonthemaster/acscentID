import { STORE_PRODUCT_TYPE, STORE_PRODUCT_DB_COMPAT_TYPE } from '@/lib/products/store-products'
import type { ProductType } from '@/types/cart'

/**
 * 개인결제창(맞춤 결제 링크).
 *
 * 관리자가 임의 금액의 결제 링크를 만들고, 메인/상품 카탈로그에는 노출하지 않은 채
 * 개별 고객에게 token URL(`/pay/<token>`)을 공유해 결제받는다.
 * 결제 주문은 기존 orders 테이블 + PortOne 흐름을 재사용한다.
 *
 * orders.product_type 은 별도 제약(check constraint) 추가 없이 재사용하기 위해
 * store_product 값을 사용하며, DB가 store_product 를 거부하는 환경에서는
 * store-products 유틸의 today_scent 호환 폴백을 그대로 탄다.
 */

// 개인결제창 주문에 사용하는 상품 타입 (store_product 재사용)
export const PAYMENT_LINK_ORDER_PRODUCT_TYPE: ProductType = STORE_PRODUCT_TYPE
export const PAYMENT_LINK_ORDER_DB_COMPAT_TYPE: ProductType = STORE_PRODUCT_DB_COMPAT_TYPE
// orders.size 에 기록하는 라벨 (가격 검증은 링크 금액으로 별도 수행하므로 표시용)
export const PAYMENT_LINK_ORDER_SIZE = 'payment_link'

export interface PaymentLink {
  id: string
  token: string
  title: string
  description: string
  amount: number
  imageUrl: string | null
  isActive: boolean
  expiresAt: string | null
  memo: string
  paidCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentLinkRow {
  id: string
  token: string
  title: string
  description: string | null
  amount: number | null
  image_url: string | null
  is_active: boolean | null
  expires_at: string | null
  memo: string | null
  paid_count: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 공개 결제 페이지에 노출해도 되는 필드만 추린 형태 */
export interface PublicPaymentLink {
  token: string
  title: string
  description: string
  amount: number
  imageUrl: string | null
}

export function mapPaymentLinkRow(row: PaymentLinkRow): PaymentLink {
  return {
    id: row.id,
    token: row.token,
    title: row.title,
    description: row.description || '',
    amount: row.amount ?? 0,
    imageUrl: row.image_url || null,
    isActive: row.is_active ?? true,
    expiresAt: row.expires_at || null,
    memo: row.memo || '',
    paidCount: row.paid_count ?? 0,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toPublicPaymentLink(link: PaymentLink): PublicPaymentLink {
  return {
    token: link.token,
    title: link.title,
    description: link.description,
    amount: link.amount,
    imageUrl: link.imageUrl,
  }
}

/** 만료 여부 판정 (expires_at 이 지났으면 만료) */
export function isPaymentLinkExpired(link: Pick<PaymentLink, 'expiresAt'>, now: Date = new Date()): boolean {
  if (!link.expiresAt) return false
  const expires = new Date(link.expiresAt)
  if (Number.isNaN(expires.getTime())) return false
  return expires.getTime() < now.getTime()
}

/** 링크가 지금 결제 가능한 상태인지 (활성 + 미만료) */
export function isPaymentLinkPayable(link: Pick<PaymentLink, 'isActive' | 'expiresAt'>, now: Date = new Date()): boolean {
  return link.isActive && !isPaymentLinkExpired(link, now)
}

/** 개인결제창 주문의 orders.analysis_data 에 남기는 마커 */
export function buildPaymentLinkAnalysisData(link: Pick<PaymentLink, 'token' | 'title' | 'amount'>) {
  return {
    paymentLink: {
      token: link.token,
      title: link.title,
      amount: link.amount,
    },
  }
}

export function isPaymentLinkAnalysisData(analysisData: unknown): boolean {
  return Boolean(
    analysisData &&
    typeof analysisData === 'object' &&
    'paymentLink' in analysisData,
  )
}
