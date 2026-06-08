// 쿠폰 시스템 타입 정의

export type CouponType = 'birthday' | 'referral' | 'repurchase' | 'welcome' | 'offline'
export type CouponDiscountType = 'percent' | 'fixed_amount'

export interface CouponDiscountFields {
  discount_percent?: number | null
  discount_type?: CouponDiscountType | string | null
  discount_amount?: number | null
}

export interface Coupon {
  id: string
  code: string
  type: CouponType
  discount_percent: number
  discount_type?: CouponDiscountType
  discount_amount?: number
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
  discount_type?: CouponDiscountType
  discount_amount?: number
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
  discount_type?: CouponDiscountType
  discount_amount?: number
  title: string
  isEligible: boolean
  ineligibleReason?: string
}

export function getCouponDiscountType(coupon: CouponDiscountFields | null | undefined): CouponDiscountType {
  return coupon?.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percent'
}

export function getCouponDiscountLabel(coupon: CouponDiscountFields | null | undefined): string {
  if (getCouponDiscountType(coupon) === 'fixed_amount') {
    return `${Math.max(0, Number(coupon?.discount_amount || 0)).toLocaleString('ko-KR')}원`
  }

  return `${Math.max(0, Number(coupon?.discount_percent || 0))}%`
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon: CouponDiscountFields | null | undefined
): number {
  if (!coupon || subtotal <= 0) return 0

  if (getCouponDiscountType(coupon) === 'fixed_amount') {
    return Math.min(subtotal, Math.max(0, Math.floor(Number(coupon.discount_amount || 0))))
  }

  const percent = Math.max(0, Math.min(100, Number(coupon.discount_percent || 0)))
  return Math.floor(subtotal * (percent / 100))
}
