import type { createServiceRoleClient } from '@/lib/supabase/service'
import type { UserCouponDiscountSnapshot } from '@/types/coupon'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/**
 * user_coupons 의 할인 스냅샷 컬럼은 마이그레이션(20260609_user_coupon_discount_snapshot) 이후에만 존재한다.
 * 컬럼이 없으면(=마이그레이션 전) 에러가 나는데, 이 경우 "스냅샷 없음"으로 안전하게 처리해
 * 결제/체크아웃이 기존 동작(템플릿 값 사용)을 유지하도록 한다.
 */
export function isSnapshotColumnMissing(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  const message = error.message || ''
  return (
    message.includes('discount_type') ||
    message.includes('discount_percent') ||
    message.includes('discount_amount')
  )
}

export async function getUserCouponSnapshot(
  serviceClient: ServiceClient,
  userCouponId: string
): Promise<UserCouponDiscountSnapshot | null> {
  const { data, error } = await serviceClient
    .from('user_coupons')
    .select('discount_type, discount_percent, discount_amount')
    .eq('id', userCouponId)
    .maybeSingle()

  if (error || !data) return null
  return data as UserCouponDiscountSnapshot
}

export async function getUserCouponSnapshots(
  serviceClient: ServiceClient,
  userCouponIds: string[]
): Promise<Map<string, UserCouponDiscountSnapshot>> {
  const map = new Map<string, UserCouponDiscountSnapshot>()
  if (userCouponIds.length === 0) return map

  const { data, error } = await serviceClient
    .from('user_coupons')
    .select('id, discount_type, discount_percent, discount_amount')
    .in('id', userCouponIds)

  if (error || !data) return map

  for (const row of data as Array<{ id: string } & UserCouponDiscountSnapshot>) {
    map.set(row.id, {
      discount_type: row.discount_type,
      discount_percent: row.discount_percent,
      discount_amount: row.discount_amount,
    })
  }
  return map
}
