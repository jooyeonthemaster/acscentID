import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim())

async function checkAdmin(): Promise<boolean> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email && ADMIN_EMAILS.includes(kakaoSession.user.email)) return true
  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && ADMIN_EMAILS.includes(user.email)) return true
  return false
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId 필요' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { data: rewards, error } = await serviceClient
    .from('stamp_rewards')
    .select('*')
    .eq('user_id', userId)
    .order('milestone', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, rewards: rewards || [] })
}
