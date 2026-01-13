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
    const productType = searchParams.get('product_type')
    const serviceMode = searchParams.get('service_mode')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClientWithCookies()

    // 기본 쿼리
    let query = supabase
      .from('analysis_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 필터 적용
    if (productType && productType !== 'all') {
      query = query.eq('product_type', productType)
    }

    if (serviceMode && serviceMode !== 'all') {
      query = query.eq('service_mode', serviceMode)
    }

    if (search) {
      query = query.or(`idol_name.ilike.%${search}%,twitter_name.ilike.%${search}%,perfume_name.ilike.%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data: analyses, error, count } = await query

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({ error: '분석 목록을 불러오는데 실패했습니다' }, { status: 500 })
    }

    // 사용자 정보 조회 (user_id가 있는 경우)
    const userIds = analyses?.filter(a => a.user_id).map(a => a.user_id) || []
    let userProfiles: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, email, provider')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 피드백 정보 조회
    const analysisIds = analyses?.map(a => a.id) || []
    let feedbacks: Record<string, any> = {}

    if (analysisIds.length > 0) {
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*')
        .in('result_id', analysisIds)

      if (feedbackData) {
        feedbacks = feedbackData.reduce((acc, f) => {
          acc[f.result_id] = f
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 응답 데이터 구성
    const enrichedAnalyses = analyses?.map(analysis => ({
      ...analysis,
      user_profile: analysis.user_id ? userProfiles[analysis.user_id] : null,
      feedback: feedbacks[analysis.id] || null,
    }))

    return NextResponse.json({
      data: enrichedAnalyses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in admin analysis API:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
