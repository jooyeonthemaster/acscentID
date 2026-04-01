import { STAMP_MILESTONES } from '@/types/stamp'

/**
 * Shared utility to add stamps to a user and auto-generate milestone coupons.
 * Used by orders API (online payments) and admin API (bank transfer confirmation).
 */
export async function addStampsForUser(
  serviceClient: any,
  userId: string,
  itemCount: number,
  orderId: string | null,
  source: 'online_order' | 'offline_admin' | 'manual_adjustment' = 'online_order'
) {
  try {
    // Atomic increment using RPC or upsert
    const { data: existingStamp } = await serviceClient
      .from('user_stamps')
      .select('total_stamps')
      .eq('user_id', userId)
      .single()

    const previousStamps = existingStamp?.total_stamps || 0
    const newTotal = previousStamps + itemCount

    await serviceClient
      .from('user_stamps')
      .upsert({
        user_id: userId,
        total_stamps: newTotal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    // Record stamp history
    await serviceClient
      .from('stamp_history')
      .insert({
        user_id: userId,
        stamps_added: itemCount,
        source,
        order_id: orderId,
      })

    // Auto-generate milestone reward coupons
    for (const m of STAMP_MILESTONES) {
      if (newTotal >= m.generation_at) {
        const { data: existingReward } = await serviceClient
          .from('stamp_rewards')
          .select('id')
          .eq('user_id', userId)
          .eq('milestone', m.milestone)
          .single()

        if (!existingReward) {
          const { data: couponTemplate } = await serviceClient
            .from('coupons')
            .select('id')
            .eq('type', m.reward_type)
            .eq('is_active', true)
            .single()

          if (couponTemplate) {
            const { data: userCoupon } = await serviceClient
              .from('user_coupons')
              .insert({
                user_id: userId,
                coupon_id: couponTemplate.id,
                is_used: false,
                claimed_at: new Date().toISOString(),
              })
              .select()
              .single()

            await serviceClient
              .from('stamp_rewards')
              .insert({
                user_id: userId,
                milestone: m.milestone,
                reward_type: m.reward_type,
                is_claimed: true,
                user_coupon_id: userCoupon?.id || null,
                claimed_at: new Date().toISOString(),
              })
          }
        }
      }
    }

    console.log(`[Stamps] Added ${itemCount} stamps for user ${userId}. Previous: ${previousStamps}, New: ${newTotal}`)
    return { success: true, previousStamps, newTotal }
  } catch (error) {
    console.error('[Stamps] Failed to add stamps:', error)
    return { success: false, previousStamps: 0, newTotal: 0 }
  }
}
