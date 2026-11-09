import type { createServiceRoleClient } from '@/lib/supabase/service'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'
import { issueRepurchaseCouponIfNeeded } from '@/lib/coupons/issue-repurchase'
import { markCouponUsedForPaidOrder } from '@/lib/coupons/order-coupon-usage'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export interface PaidOrderTarget {
  id: string
  user_id?: string | null
  user_coupon_id?: string | null
}

/**
 * 무통장 주문이 입금대기(pending) → 입금완료(paid)로 바뀐 직후 할 일.
 * 쿠폰 사용 확정 → 재고 차감 → 재구매 10% 쿠폰 발급.
 *
 * 관리자 수동 확인(PATCH /api/admin/orders)과 입금 문자 자동 확인
 * (/api/payments/bank-notify, /api/admin/bank-deposits)이 같은 길을 쓴다.
 * 호출부가 상태를 pending → paid 로 바꾼 경우에만 부른다(중복 차감 방지).
 * ERP 신호(notifyErp)는 호출부가 보낸다.
 */
export async function applyPaidOrderEffects(
  serviceClient: ServiceClient,
  order: PaidOrderTarget,
  createdBy?: string,
) {
  const couponUsageResult = await markCouponUsedForPaidOrder(serviceClient, order)
  if (!couponUsageResult.success) {
    console.error('[Paid order] Coupon usage finalization failed:', couponUsageResult)
  }

  console.log(`[Paid order] Deducting inventory for order: ${order.id}`)
  const deductionResult = await deductInventoryForOrder(serviceClient, order.id, createdBy)
  const inventoryDeduction = {
    success: deductionResult.success,
    deductedCount: deductionResult.deducted.length,
    errors: deductionResult.errors,
  }
  if (!deductionResult.success) {
    console.warn('[Paid order] Inventory deduction had errors:', deductionResult.errors)
  }

  let repurchaseCouponResult: Awaited<ReturnType<typeof issueRepurchaseCouponIfNeeded>> | null = null
  if (order.user_id) {
    console.log(`[Paid order] Issuing repurchase coupon for user ${order.user_id} (bank transfer confirmed)`)
    repurchaseCouponResult = await issueRepurchaseCouponIfNeeded(serviceClient, order.user_id)
  }

  return { couponUsageResult, inventoryDeduction, repurchaseCouponResult }
}
