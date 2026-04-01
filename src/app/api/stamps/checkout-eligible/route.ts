import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { STAMP_MILESTONES } from '@/types/stamp'

/**
 * Check which stamp-based discounts are available for a checkout
 * considering current stamps + items being purchased
 *
 * GET /api/stamps/checkout-eligible?quantity=2
 */
export async function GET(request: NextRequest) {
  try {
    const quantity = parseInt(request.nextUrl.searchParams.get('quantity') || '1')

    let userId: string | null = null
    const kakaoSession = await getKakaoSession()
    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, requireLogin: true })
    }

    const serviceClient = createServiceRoleClient()

    // Get current stamps
    const { data: userStamp } = await serviceClient
      .from('user_stamps')
      .select('total_stamps')
      .eq('user_id', userId)
      .single()

    const currentStamps = userStamp?.total_stamps || 0
    const projectedStamps = currentStamps + quantity

    // Find which milestones would be reached with this purchase
    // A discount is available at checkout if:
    // 1. User already has an unused stamp coupon, OR
    // 2. projected stamps >= milestone (immediate eligibility)
    const eligibleDiscounts = []

    for (const m of STAMP_MILESTONES) {
      if (projectedStamps >= m.milestone) {
        // Check if reward was already claimed and coupon used
        const { data: reward } = await serviceClient
          .from('stamp_rewards')
          .select('id, is_claimed, user_coupon_id')
          .eq('user_id', userId)
          .eq('milestone', m.milestone)
          .single()

        if (reward?.user_coupon_id) {
          // Check if the coupon is still available (not used)
          const { data: coupon } = await serviceClient
            .from('user_coupons')
            .select('id, is_used')
            .eq('id', reward.user_coupon_id)
            .single()

          if (coupon && !coupon.is_used) {
            eligibleDiscounts.push({
              milestone: m.milestone,
              reward_type: m.reward_type,
              discount_percent: m.discount_percent,
              label: m.label,
              source: 'existing_coupon',
              userCouponId: coupon.id,
            })
          }
        } else if (!reward) {
          // Milestone not yet reached but will be with this purchase
          // This is a "prospective" discount
          eligibleDiscounts.push({
            milestone: m.milestone,
            reward_type: m.reward_type,
            discount_percent: m.discount_percent,
            label: m.label,
            source: 'prospective',
            userCouponId: null,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      currentStamps,
      projectedStamps,
      eligibleDiscounts,
    })
  } catch (error) {
    console.error('Stamp checkout eligible error:', error)
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 })
  }
}
