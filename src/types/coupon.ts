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

// 개인 쿠폰(user_coupons)에 고정 저장되는 할인 스냅샷.
// discount_type 이 채워져 있으면 발급/잠금 당시 값으로 고정된 것으로 본다.
export interface UserCouponDiscountSnapshot {
  discount_type?: CouponDiscountType | string | null
  discount_percent?: number | null
  discount_amount?: number | null
}

/**
 * 개인 쿠폰의 실제 적용 할인값을 결정한다.
 * 스냅샷(snapshot.discount_type != null)이 있으면 그 값을, 없으면 템플릿(coupons) 값을 따른다.
 * 관리자가 "신규 발급분부터만" 할인을 바꾸면 기존 보유분은 스냅샷으로 잠겨 기존 할인을 유지한다.
 */
export function resolveEffectiveDiscount(
  snapshot: UserCouponDiscountSnapshot | null | undefined,
  template: CouponDiscountFields | null | undefined
): CouponDiscountFields {
  if (snapshot && snapshot.discount_type != null) {
    return {
      discount_type: snapshot.discount_type,
      discount_percent: snapshot.discount_percent ?? 0,
      discount_amount: snapshot.discount_amount ?? 0,
    }
  }
  return {
    discount_type: template?.discount_type ?? null,
    discount_percent: template?.discount_percent ?? null,
    discount_amount: template?.discount_amount ?? null,
  }
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
