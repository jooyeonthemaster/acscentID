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

    // 분석 결과 조회. 케미 주문에서는 orders.analysis_id 대신
    // layering_session_id만 저장되므로, 세션 ID로 들어온 경우도 지원한다.
    const { data: directAnalysis } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', id)
      .single()

    let analysis = directAnalysis
    let layeringSession = null
    let partnerAnalysis = null

    if (!analysis) {
      const { data: session } = await supabase
        .from('layering_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (!session) {
        return NextResponse.json({ error: '분석 결과를 찾을 수 없습니다' }, { status: 404 })
      }

      layeringSession = session
      const primaryAnalysisId = session.analysis_a_id || session.analysis_b_id

      if (!primaryAnalysisId) {
        return NextResponse.json({ error: '케미 분석 결과를 찾을 수 없습니다' }, { status: 404 })
      }

      const { data: sessionAnalysis } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('id', primaryAnalysisId)
        .single()

      if (!sessionAnalysis) {
        return NextResponse.json({ error: '케미 분석 결과를 찾을 수 없습니다' }, { status: 404 })
      }

      analysis = sessionAnalysis
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
      .eq('result_id', analysis.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 관련 주문 조회
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at, final_price')
      .eq('user_id', analysis.user_id)
      .order('created_at', { ascending: false })

    // [FIX] HIGH: chemistry_set일 때 layering_sessions 포함
    if (analysis.product_type === 'chemistry_set') {
      if (!layeringSession) {
        const { data: session } = await supabase
          .from('layering_sessions')
          .select('*')
          .or(`analysis_a_id.eq.${analysis.id},analysis_b_id.eq.${analysis.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        layeringSession = session || null
      }

      if (layeringSession) {
        const partnerId = layeringSession.analysis_a_id === analysis.id ? layeringSession.analysis_b_id : layeringSession.analysis_a_id
        if (partnerId) {
          const { data: partnerData } = await supabase
            .from('analysis_results')
            .select('*')
            .eq('id', partnerId)
            .single()
          partnerAnalysis = partnerData || null
        }
      }
    }

    return NextResponse.json({
      analysis,
      user_profile: userProfile,
      feedback: feedback || null,
      orders: orders || [],
      layering_session: layeringSession,
      partner_analysis: partnerAnalysis,
    })
  } catch (error) {
    console.error('Error fetching analysis detail:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
