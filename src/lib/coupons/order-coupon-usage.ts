import { createServiceRoleClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

type OrderCouponUsageTarget = {
  id: string
  user_coupon_id?: string | null
}

function isOfflineCouponCodeTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.message?.includes('offline_coupon_codes') === true
}

async function markOfflineCouponCodesUsed(
  serviceClient: ServiceClient,
  userCouponId: string,
  now: string
) {
  const { error } = await serviceClient
    .from('offline_coupon_codes')
    .update({
      status: 'used',
      updated_at: now,
    })
    .eq('user_coupon_id', userCouponId)
    .eq('status', 'claimed')

  if (error && !isOfflineCouponCodeTableMissing(error)) {
    console.error('[Coupon Usage] Offline coupon code status update failed:', error)
  }
}

async function markOfflineCouponCodesClaimed(
  serviceClient: ServiceClient,
  userCouponIds: string[],
  now: string
) {
  if (userCouponIds.length === 0) return

  const { error } = await serviceClient
    .from('offline_coupon_codes')
    .update({
      status: 'claimed',
      updated_at: now,
    })
    .in('user_coupon_id', userCouponIds)
    .eq('status', 'used')

  if (error && !isOfflineCouponCodeTableMissing(error)) {
    console.error('[Coupon Usage] Offline coupon code release failed:', error)
  }
}

export async function markCouponUsedForPaidOrder(
  serviceClient: ServiceClient,
  order: OrderCouponUsageTarget,
  now = new Date().toISOString()
) {
  const userCouponId = order.user_coupon_id
  if (!userCouponId) return { success: true, skipped: true }

  const { data: updatedRows, error: updateError } = await serviceClient
    .from('user_coupons')
    .update({
      is_used: true,
      used_at: now,
      used_order_id: order.id,
    })
    .eq('id', userCouponId)
    .eq('is_used', false)
    .select('id')

  if (updateError) {
    console.error('[Coupon Usage] Coupon usage update failed:', updateError)
    return { success: false, error: updateError.message }
  }

  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
    await markOfflineCouponCodesUsed(serviceClient, userCouponId, now)
    return { success: true, updated: true }
  }

  const { data: currentCoupon, error: fetchError } = await serviceClient
    .from('user_coupons')
    .select('id, is_used, used_order_id')
    .eq('id', userCouponId)
    .maybeSingle()

  if (fetchError) {
    console.error('[Coupon Usage] Coupon usage lookup failed:', fetchError)
    return { success: false, error: fetchError.message }
  }

  if (currentCoupon?.is_used && currentCoupon.used_order_id === order.id) {
    await markOfflineCouponCodesUsed(serviceClient, userCouponId, now)
    return { success: true, alreadyUsed: true }
  }

  console.error('[Coupon Usage] Coupon is already used by another order:', {
    userCouponId,
    orderId: order.id,
    usedOrderId: currentCoupon?.used_order_id,
  })
  return { success: false, error: '이미 다른 주문에서 사용된 쿠폰입니다' }
}

export async function releaseCouponUsageForOrder(
  serviceClient: ServiceClient,
  orderId: string,
  now = new Date().toISOString()
) {
  const { data: lockedCoupons, error: fetchError } = await serviceClient
    .from('user_coupons')
    .select('id')
    .eq('used_order_id', orderId)
    .eq('is_used', true)

  if (fetchError) {
    console.error('[Coupon Usage] Coupon release lookup failed:', fetchError)
    return { success: false, error: fetchError.message, releasedCount: 0 }
  }

  const userCouponIds = (lockedCoupons || [])
    .map((coupon) => coupon.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (userCouponIds.length === 0) {
    return { success: true, releasedCount: 0 }
  }

  const { error: updateError } = await serviceClient
    .from('user_coupons')
    .update({
      is_used: false,
      used_at: null,
      used_order_id: null,
    })
    .in('id', userCouponIds)

  if (updateError) {
    console.error('[Coupon Usage] Coupon release failed:', updateError)
    return { success: false, error: updateError.message, releasedCount: 0 }
  }

  await markOfflineCouponCodesClaimed(serviceClient, userCouponIds, now)

  return { success: true, releasedCount: userCouponIds.length }
}
