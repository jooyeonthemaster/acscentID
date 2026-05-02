import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 분석 결과 삭제 API
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. 사용자 인증 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. Service Role로 삭제 (user_id 확인 포함)
    const supabase = createServiceRoleClient()

    // 레이어링 퍼퓸 세션 삭제: ?type=chemistry 인 경우 id를 sessionId로 취급
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'chemistry') {
      // layering_session 조회 (소유권 확인)
      const { data: session, error: sessionError } = await supabase
        .from('layering_sessions')
        .select('id, analysis_a_id, analysis_b_id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session) {
        console.error('케미 세션 조회 실패:', sessionError)
        return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 })
      }

      // layering_session 삭제 (CASCADE로 연결된 analysis_results도 삭제됨)
      // analysis_results는 ON DELETE CASCADE이므로 layering_session 삭제 시 자동 삭제되지 않음
      // layering_sessions가 analysis_results를 참조하므로 순서: session 먼저 삭제 → analysis 삭제
      const { error: deleteSessionError } = await supabase
        .from('layering_sessions')
        .delete()
        .eq('id', session.id)

      if (deleteSessionError) {
        console.error('케미 세션 삭제 실패:', deleteSessionError)
        return NextResponse.json({ error: '세션 삭제에 실패했습니다' }, { status: 500 })
      }

      // 연결된 analysis_results 2개 삭제
      const { error: deleteAnalysesError } = await supabase
        .from('analysis_results')
        .delete()
        .in('id', [session.analysis_a_id, session.analysis_b_id])

      if (deleteAnalysesError) {
        console.error('케미 분석 결과 삭제 실패:', deleteAnalysesError)
        // 세션은 이미 삭제됨, 분석 결과 삭제 실패는 로그만 남김
      }

      return NextResponse.json({ success: true })
    }

    // 일반 분석 결과 삭제
    const { error } = await supabase
      .from('analysis_results')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('분석 결과 삭제 실패:', error)
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('분석 결과 삭제 오류:', error)
    return NextResponse.json({ error: '삭제 중 오류가 발생했습니다' }, { status: 500 })
  }
}
