import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { STAMP_MILESTONES, type StampInfo } from '@/types/stamp'

export async function GET() {
  try {
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

    // Get or create user_stamps record
    let { data: userStamp } = await serviceClient
      .from('user_stamps')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!userStamp) {
      const { data: newStamp } = await serviceClient
        .from('user_stamps')
        .insert({ user_id: userId, total_stamps: 0 })
        .select()
        .single()
      userStamp = newStamp
    }

    const totalStamps = userStamp?.total_stamps || 0

    // Get rewards
    const { data: rewards } = await serviceClient
      .from('stamp_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('milestone', { ascending: true })

    // Calculate next milestone
    let nextMilestone = null
    for (const m of STAMP_MILESTONES) {
      if (totalStamps < m.milestone) {
        nextMilestone = {
          milestone: m.milestone,
          stampsNeeded: m.milestone - totalStamps,
          reward: m.label,
        }
        break
      }
    }

    const stampInfo: StampInfo = {
      totalStamps,
      rewards: rewards || [],
      nextMilestone,
    }

    return NextResponse.json({ success: true, ...stampInfo })
  } catch (error) {
    console.error('Stamps API error:', error)
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 })
  }
}
