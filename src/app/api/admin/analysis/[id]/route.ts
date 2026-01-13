import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createServerSupabaseClientWithCookies()

    // 분석 결과 조회
    const { data: analysis, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !analysis) {
      return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다' }, { status: 404 })
    }

    // 사용자 정보 조회
    let userProfile = null
    if (analysis.user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, name, email, provider, referral_code, referred_by, created_at')
        .eq('id', analysis.user_id)
        .single()

      userProfile = profile
    }

    // 피드백 및 레시피 조회
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('result_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 관련 주문 조회
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at, final_price')
      .eq('user_id', analysis.user_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      analysis,
      user_profile: userProfile,
      feedback: feedback || null,
      orders: orders || [],
    })
  } catch (error) {
    console.error('Error fetching analysis detail:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
