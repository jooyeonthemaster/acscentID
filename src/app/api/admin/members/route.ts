import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  // 카카오 세션 확인
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

  // Supabase Auth 세션 확인
  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email
    }
  }

  return { isAdmin: false, email: null }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const provider = searchParams.get('provider')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClientWithCookies()

    // 기본 쿼리
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 필터 적용
    if (provider && provider !== 'all') {
      query = query.eq('provider', provider)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data: members, error, count } = await query

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: '회원 목록을 불러오는데 실패했습니다' }, { status: 500 })
    }

    // 각 회원의 분석 수, 주문 수, 피추천인 수 조회
    const memberIds = members?.map(m => m.id) || []

    // 분석 수 집계
    let analysisCounts: Record<string, number> = {}
    if (memberIds.length > 0) {
      const { data: analysisData } = await supabase
        .from('analysis_results')
        .select('user_id')
        .in('user_id', memberIds)

      if (analysisData) {
        analysisData.forEach(a => {
          analysisCounts[a.user_id] = (analysisCounts[a.user_id] || 0) + 1
        })
      }
    }

    // 주문 수 집계
    let orderCounts: Record<string, number> = {}
    if (memberIds.length > 0) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('user_id')
        .in('user_id', memberIds)

      if (orderData) {
        orderData.forEach(o => {
          orderCounts[o.user_id] = (orderCounts[o.user_id] || 0) + 1
        })
      }
    }

    // 피추천인 수 집계 (이 회원의 추천 코드를 사용한 사람 수)
    const referralCodes = members?.filter(m => m.referral_code).map(m => m.referral_code) || []
    let referredCounts: Record<string, number> = {}

    if (referralCodes.length > 0) {
      const { data: referredData } = await supabase
        .from('user_profiles')
        .select('referred_by')
        .in('referred_by', referralCodes)

      if (referredData) {
        referredData.forEach(r => {
          referredCounts[r.referred_by] = (referredCounts[r.referred_by] || 0) + 1
        })
      }
    }

    // 추천인 정보 조회 (referred_by 코드로 누가 추천했는지)
    const referredByCodes = members?.filter(m => m.referred_by).map(m => m.referred_by) || []
    let referrerInfo: Record<string, { name: string; email: string }> = {}

    if (referredByCodes.length > 0) {
      const { data: referrerData } = await supabase
        .from('user_profiles')
        .select('referral_code, name, email')
        .in('referral_code', referredByCodes)

      if (referrerData) {
        referrerData.forEach(r => {
          referrerInfo[r.referral_code] = { name: r.name, email: r.email }
        })
      }
    }

    // 응답 데이터 구성
    const enrichedMembers = members?.map(member => ({
      ...member,
      analysis_count: analysisCounts[member.id] || 0,
      order_count: orderCounts[member.id] || 0,
      referred_count: member.referral_code ? (referredCounts[member.referral_code] || 0) : 0,
      referrer: member.referred_by ? referrerInfo[member.referred_by] : null,
    }))

    return NextResponse.json({
      data: enrichedMembers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in admin members API:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
