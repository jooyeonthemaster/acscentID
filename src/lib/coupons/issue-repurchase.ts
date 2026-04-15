import type { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * 재구매 10% 쿠폰 자동 발급.
 * - 사용자가 현재 미사용 repurchase 쿠폰이 없으면 1장 발급.
 * - 이미 있으면 skip (중복 발급 방지).
 * 주문 생성 성공 시 호출.
 */
export async function issueRepurchaseCouponIfNeeded(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<{ issued: boolean; userCouponId?: string }> {
  try {
    // 1. repurchase 쿠폰 템플릿 조회
    const { data: couponTemplate } = await serviceClient
      .from('coupons')
      .select('id')
      .eq('type', 'repurchase')
      .eq('is_active', true)
      .single()

    if (!couponTemplate) {
      console.warn('[RepurchaseCoupon] No active repurchase coupon template found')
      return { issued: false }
    }

    // 2. 사용자가 미사용 repurchase 쿠폰을 이미 갖고 있는지 확인
    const { data: existing } = await serviceClient
      .from('user_coupons')
      .select('id')
      .eq('user_id', userId)
      .eq('coupon_id', couponTemplate.id)
      .eq('is_used', false)
      .maybeSingle()

    if (existing) {
      return { issued: false, userCouponId: existing.id }
    }

    // 3. 새 쿠폰 발급
    const { data: inserted, error } = await serviceClient
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: couponTemplate.id,
        claimed_at: new Date().toISOString(),
        is_used: false,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[RepurchaseCoupon] Issue failed:', error)
      return { issued: false }
    }

    console.log(`[RepurchaseCoupon] Issued to user ${userId}, coupon ${inserted.id}`)
    return { issued: true, userCouponId: inserted.id }
  } catch (err) {
    console.error('[RepurchaseCoupon] Unexpected error:', err)
    return { issued: false }
  }
}
