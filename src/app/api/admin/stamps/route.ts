import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { addStampsForUser } from '@/lib/stamps'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim())

async function checkAdmin(): Promise<boolean> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email && ADMIN_EMAILS.includes(kakaoSession.user.email)) return true

  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && ADMIN_EMAILS.includes(user.email)) return true

  return false
}

// GET: List users' stamps (search by name/email) + recent offline customers
export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const search = request.nextUrl.searchParams.get('search') || ''
  const mode = request.nextUrl.searchParams.get('mode') || '' // 'offline' = 최근 오프라인 분석 고객
  const serviceClient = createServiceRoleClient()

  // 오프라인 분석 고객 목록 조회
  if (mode === 'offline') {
    // 최근 7일 오프라인 분석 결과에서 user_id 추출 + user_profiles join
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: offlineAnalyses } = await serviceClient
      .from('analysis_results')
      .select('user_id, twitter_name, perfume_name, user_image_url, created_at')
      .eq('service_mode', 'offline')
      .gte('created_at', sevenDaysAgo)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!offlineAnalyses || offlineAnalyses.length === 0) {
      return NextResponse.json({ success: true, customers: [] })
    }

    // 고유 user_id 추출
    const userIds = [...new Set(offlineAnalyses.map(a => a.user_id).filter(Boolean))]

    // user_profiles에서 이름/이메일 조회
    const { data: profiles } = await serviceClient
      .from('user_profiles')
      .select('id, name, email, avatar_url')
      .in('id', userIds)

    // user_stamps에서 스탬프 수 조회
    const { data: stamps } = await serviceClient
      .from('user_stamps')
      .select('user_id, total_stamps')
      .in('user_id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const stampMap = new Map((stamps || []).map(s => [s.user_id, s.total_stamps]))

    // user별로 최근 분석 + 분석 횟수 집계
    const userAnalysisMap = new Map<string, { count: number; latest: any }>()
    for (const a of offlineAnalyses) {
      if (!a.user_id) continue
      const existing = userAnalysisMap.get(a.user_id)
      if (!existing) {
        userAnalysisMap.set(a.user_id, { count: 1, latest: a })
      } else {
        existing.count++
      }
    }

    const customers = Array.from(userAnalysisMap.entries()).map(([userId, data]) => {
      const profile = profileMap.get(userId)
      return {
        user_id: userId,
        name: profile?.name || null,
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
        total_stamps: stampMap.get(userId) || 0,
        offline_analysis_count: data.count,
        latest_analysis: {
          twitter_name: data.latest.twitter_name,
          perfume_name: data.latest.perfume_name,
          image_url: data.latest.user_image_url,
          created_at: data.latest.created_at,
        },
      }
    })

    return NextResponse.json({ success: true, customers })
  }

  // 일반 검색 (이름/이메일/user_id)
  if (search) {
    // user_profiles에서 이름이나 이메일로 검색
    const { data: profiles } = await serviceClient
      .from('user_profiles')
      .select('id, name, email, avatar_url')
      .or(`name.ilike.%${search}%,email.ilike.%${search}%,id.ilike.%${search}%`)
      .limit(20)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, stamps: [] })
    }

    const userIds = profiles.map(p => p.id)

    // user_stamps 조회
    const { data: stamps } = await serviceClient
      .from('user_stamps')
      .select('*')
      .in('user_id', userIds)

    const stampMap = new Map((stamps || []).map(s => [s.user_id, s]))

    const results = profiles.map(p => ({
      user_id: p.id,
      name: p.name,
      email: p.email,
      avatar_url: p.avatar_url,
      total_stamps: stampMap.get(p.id)?.total_stamps || 0,
      updated_at: stampMap.get(p.id)?.updated_at || null,
    }))

    return NextResponse.json({ success: true, stamps: results })
  }

  // 검색어 없으면 스탬프가 있는 유저 목록
  const { data: stamps } = await serviceClient
    .from('user_stamps')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (!stamps || stamps.length === 0) {
    return NextResponse.json({ success: true, stamps: [] })
  }

  // user_profiles 조인
  const userIds = stamps.map(s => s.user_id)
  const { data: profiles } = await serviceClient
    .from('user_profiles')
    .select('id, name, email, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  const results = stamps.map(s => ({
    ...s,
    name: profileMap.get(s.user_id)?.name || null,
    email: profileMap.get(s.user_id)?.email || null,
    avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
  }))

  return NextResponse.json({ success: true, stamps: results })
}

// POST: Admin adds stamps to a user
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, stamps, note } = body

    if (!userId || !stamps || stamps < 1) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const result = await addStampsForUser(serviceClient, userId, stamps, null, 'offline_admin')

    return NextResponse.json({
      success: result.success,
      previousStamps: result.previousStamps,
      newTotal: result.newTotal,
      stampsAdded: stamps,
    })
  } catch (error) {
    console.error('Admin stamp add error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
