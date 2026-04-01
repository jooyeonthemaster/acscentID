// 프로모션 관련 타입 정의

export type PromotionType = 'free_shipping' // 향후 'discount' 등 확장 가능

export interface Promotion {
  id: string
  type: PromotionType
  name: string
  description: string | null
  is_active: boolean
  min_order_amount: number | null // NULL이면 무조건 적용, 값이 있으면 해당 금액 이상만 적용
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

// 클라이언트에서 사용할 활성 프로모션 정보
export interface ActiveFreeShippingPromotion {
  id: string
  name: string
  min_order_amount: number | null // NULL = 무조건 무료, 숫자 = 해당 금액 이상 무료
}

// 배송비 계산 결과 (프로모션 적용 포함)
export interface ShippingFeeResult {
  originalFee: number       // 원래 배송비 (3,000원 또는 0원)
  finalFee: number          // 프로모션 적용 후 최종 배송비
  isFreeByPromotion: boolean // 프로모션에 의해 무료가 되었는지
  promotionName: string | null // 적용된 프로모션 이름
}
