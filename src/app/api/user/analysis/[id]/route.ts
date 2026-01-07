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
