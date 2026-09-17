// ============================================================
//  ERP 매출 피드 계약 (acscent.co.kr 쪽 사본)
// ------------------------------------------------------------
//  본사 ERP(NEANDER)가 온라인 매출을 자동으로 가져가는 창구의 약속이다.
//  정본은 ERP 저장소의 `lib/neander/sync/contract.ts` 이고 이 파일은 그
//  사본이다 — 두 저장소가 서로를 import 할 수 없어서 복사해 둔다.
//
//  ⚠️ 한쪽만 고치면 안 된다. 계약을 바꾸면 FEED_VERSION 을 올리고 양쪽을
//     함께 고친다. 판이 어긋나면 ERP 가 동기화를 **멈춘다** — 조용히 틀린
//     숫자를 쌓는 것보다 멈추는 편이 낫다.
//
//  ⚠️ 개인정보는 싣지 않는다. 수령인·전화·주소·이메일은 이 피드에 없다.
//     ERP 는 회사 손익을 보는 곳이지 고객 명부가 아니다.
// ============================================================

/**
 * 계약 판 — ERP 와 다르면 ERP 가 동기화를 멈춘다.
 *   1  첫 판
 *   2  커서를 (updated_at, id) 짝으로 · ids 모드 (지운 주문 찾기)
 */
export const FEED_VERSION = 2

export const FEED_SOURCE = 'acscent-online' as const

export interface FeedEnvelope<T> {
  version: number
  source: typeof FEED_SOURCE
  /** 읽기 시작한 시각 (ms) */
  serverTime: number
  /** 이번 응답의 마지막 수정 시각 (ms) — ERP 화면 표시용 */
  cursor: number
  /**
   * 다음 호출의 after 로 돌려받을 열쇠 — `updated_at 원문|id`.
   * 원문 그대로 두는 이유: 이 DB 는 마이크로초까지 담는다. ms 로 줄이면
   * 같은 ms 안의 줄 순서가 흐려져 같은 쪽이 되풀이되거나 줄이 빠진다.
   */
  cursorKey: string
  /** false 면 아직 남았다 */
  complete: boolean
  rows: T[]
}

export interface OnlineOrderItemRow {
  id: string
  productType: string
  size: string
  name: string
  unitPrice: number
  qty: number
  subtotal: number
}

export interface OnlineOrderRow {
  id: string
  orderNumber: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
  status: string
  /** 우리가 판정한 "이건 매출이다". false 면 ERP 가 그 줄을 지운다 */
  revenue: boolean
  excluded?: 'unpaid' | 'cancelled' | 'influencer' | 'refunded' | 'test'
  paymentMethod: string
  pgProvider?: string
  pgTxId?: string
  itemsTotal: number
  shippingFee: number
  discountAmount: number
  finalPrice: number
  refundAmount: number
  refundedAt: string | null
  items: OnlineOrderItemRow[]
}

/**
 * 매출로 인정하는 주문 상태 — 원가계산 화면과 **같은 값**을 쓴다
 * (src/app/api/admin/cost-analysis/finance/route.ts 의 PAID_STATUSES).
 * 두 곳이 갈라지면 사이트 안의 매출과 ERP 의 매출이 달라진다.
 */
export const REVENUE_STATUSES = ['paid', 'preparing', 'shipping', 'delivered'] as const

/**
 * 피드에 아예 올리지 않는 상태 — 결제창만 열고 끝난 시도.
 *
 * 장바구니에서 결제창을 열기만 해도 awaiting_payment 주문이 생긴다. 그런
 * 줄까지 보내면 피드가 결제 시도로 가득 찬다.
 *
 * ⚠️ pending(무통장 입금 대기)은 **여기 넣지 않는다.** 관리자가 입금 확인을
 *    되돌리면 paid → pending 이 되는데, pending 을 걸러 버리면 ERP 가 이미
 *    적재한 줄을 지울 기회가 사라진다. pending 은 수가 적어 보내도 된다.
 */
export const NEVER_PAID_STATUSES = ['awaiting_payment'] as const

/** 상품 매칭 키 — ERP 상품 마스터의 별칭에 이 문자열을 넣어 둔다 */
export const siteKeyOf = (productType: string, size: string) =>
  `${String(productType ?? '').trim()}/${String(size ?? '').trim()}`
