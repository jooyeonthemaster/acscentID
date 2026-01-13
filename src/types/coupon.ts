// 쿠폰 시스템 타입 정의

export type CouponType = 'birthday' | 'referral' | 'repurchase' | 'welcome'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  discount_percent: number
  title: string
  description: string | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface UserCoupon {
  id: string
  user_id: string
  coupon_id: string
  claimed_at: string
  used_at: string | null
  is_used: boolean
  coupon?: Coupon
}

export interface AvailableCoupon {
  id: string
  type: CouponType
  discount_percent: number
  title: string
  description: string | null
  isClaimed: boolean
}

export interface ClaimCouponRequest {
  couponId: string
}

export interface ClaimCouponResponse {
  success: boolean
  userCoupon?: UserCoupon
  error?: string
}

// 생일 쿠폰 클레임 요청
export interface BirthdayCouponClaimRequest {
  couponId: string
  proofType: 'self' | 'idol'
  idolName?: string
}

// 결제 시 사용 가능한 쿠폰
export interface CheckoutCoupon {
  id: string
  userCouponId: string
  type: CouponType
  discount_percent: number
  title: string
  isEligible: boolean
  ineligibleReason?: string
}
