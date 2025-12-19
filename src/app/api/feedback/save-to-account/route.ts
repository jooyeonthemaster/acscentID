import { createServerSupabaseClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/feedback/save-to-account
 * 로그인된 사용자의 레시피를 계정에 저장하고, fingerprint 데이터를 연동합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Authorization 헤더에서 토큰 확인 (클라이언트에서 전송)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      // 토큰으로 세션 설정
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      if (authError || !user) {
        // 토큰이 유효하지 않은 경우, 익명 저장 시도
        console.log('No valid auth token, proceeding without user')
      }
    }

    // 요청 본문 파싱
    const body = await request.json()
    const { recipe, perfumeName, selectedProduct, feedbackId } = body

    // fingerprint 헤더 확인
    const fingerprint = request.headers.get('x-fingerprint')

    // 현재 사용자 확인 (Supabase 세션 기반)
    const { data: { user } } = await supabase.auth.getUser()

    // 사용자가 로그인되어 있고 fingerprint가 있으면 데이터 연동
    if (user && fingerprint) {
      try {
        // fingerprint 기반 데이터를 user_id로 연동
        const { data: linkResult, error: linkError } = await supabase.rpc('link_fingerprint_data', {
          p_user_id: user.id,
          p_fingerprint: fingerprint
        })

        if (linkError) {
          console.error('Failed to link fingerprint data:', linkError)
        } else {
          console.log('Fingerprint data linked:', linkResult)
        }
      } catch (linkErr) {
        console.error('Link fingerprint error:', linkErr)
      }
    }

    // 특정 피드백 ID가 있으면 해당 레코드 업데이트
    if (feedbackId && user) {
      const { data, error } = await supabase
        .from('perfume_feedbacks')
        .update({
          user_id: user.id,
          generated_recipe: recipe,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update feedback:', error)
        return NextResponse.json(
          { success: false, error: '레시피 업데이트 실패' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '레시피가 계정에 저장되었습니다',
        data
      })
    }

    // 새 레시피 저장 (피드백 ID가 없는 경우)
    if (recipe && perfumeName) {
      const newFeedback = {
        perfume_id: recipe.granules?.[0]?.id || 'custom',
        perfume_name: perfumeName,
        retention_percentage: 100,
        category_preferences: {},
        generated_recipe: recipe,
        user_fingerprint: fingerprint || null,
        user_id: user?.id || null
      }

      const { data, error } = await supabase
        .from('perfume_feedbacks')
        .insert(newFeedback)
        .select()
        .single()

      if (error) {
        console.error('Failed to save recipe:', error)
        return NextResponse.json(
          { success: false, error: '레시피 저장 실패' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: user ? '레시피가 계정에 저장되었습니다' : '레시피가 저장되었습니다',
        data,
        isLoggedIn: !!user
      })
    }

    return NextResponse.json(
      { success: false, error: '필수 데이터가 누락되었습니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Save to account error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
