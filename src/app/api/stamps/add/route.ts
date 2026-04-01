import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { STAMP_MILESTONES } from '@/types/stamp'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim())

/**
 * Internal/Admin-only API to add stamps to a user after order completion
 * Also auto-generates milestone reward coupons
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication: require internal secret header or admin session
    const internalSecret = request.headers.get('x-internal-secret')
    const isInternalCall = internalSecret === process.env.INTERNAL_API_SECRET

    if (!isInternalCall) {
      // Must be admin
      let isAdmin = false
      const kakaoSession = await getKakaoSession()
      if (kakaoSession?.user?.email && ADMIN_EMAILS.includes(kakaoSession.user.email)) {
        isAdmin = true
      }
      if (!isAdmin) {
        const supabase = await createServerSupabaseClientWithCookies()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email && ADMIN_EMAILS.includes(user.email)) {
          isAdmin = true
        }
      }
      if (!isAdmin) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { userId, stamps, orderId, source = 'online_order', adminNote } = body

    if (!userId || !stamps || stamps < 1) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // 1. Upsert user_stamps
    const { data: existingStamp } = await serviceClient
      .from('user_stamps')
      .select('total_stamps')
      .eq('user_id', userId)
      .single()

    const previousStamps = existingStamp?.total_stamps || 0
    const newTotal = previousStamps + stamps

    await serviceClient
      .from('user_stamps')
      .upsert({
        user_id: userId,
        total_stamps: newTotal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    // 2. Record stamp history
    await serviceClient
      .from('stamp_history')
      .insert({
        user_id: userId,
        stamps_added: stamps,
        source,
        order_id: orderId || null,
        admin_note: adminNote || null,
      })

    // 3. Check and generate milestone rewards
    // Rewards are generated when stamps >= generation_at threshold
    // generation_at: 1 for milestone 2, 3 for milestone 4, 5 for milestone 6
    const generatedRewards = []

    for (const m of STAMP_MILESTONES) {
      if (newTotal >= m.generation_at) {
        // Check if reward already exists
        const { data: existingReward } = await serviceClient
          .from('stamp_rewards')
          .select('id')
          .eq('user_id', userId)
          .eq('milestone', m.milestone)
          .single()

        if (!existingReward) {
          // Get the stamp coupon template
          const { data: couponTemplate } = await serviceClient
            .from('coupons')
            .select('id')
            .eq('type', m.reward_type)
            .eq('is_active', true)
            .single()

          if (couponTemplate) {
            // Create user_coupon
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

            // Create stamp_reward record
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

            generatedRewards.push({
              milestone: m.milestone,
              reward_type: m.reward_type,
              label: m.label,
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      previousStamps,
      newTotal,
      stampsAdded: stamps,
      generatedRewards,
    })
  } catch (error) {
    console.error('Add stamps error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
