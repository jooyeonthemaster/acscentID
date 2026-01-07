import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 사용자 데이터 조회 API
 * Kakao 사용자와 Google 사용자 모두 지원
 * user_id + user_fingerprint 둘 다 조회하여 병합
 * 각 분석 결과에 연결된 확정 레시피도 함께 조회
 */
export async function GET(request: NextRequest) {
  try {
    // fingerprint는 쿼리 파라미터로 받음
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')

    // 1. 먼저 Kakao 세션 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      // 2. Kakao 세션이 없으면 Supabase Auth 세션 확인
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // Service Role 클라이언트로 RLS 우회
    const supabase = createServiceRoleClient()

    // fingerprint가 있으면 먼저 데이터 연동 시도
    if (fingerprint) {
      console.log('[UserData] Attempting to link fingerprint data for user:', userId)
      try {
        await supabase.rpc('link_fingerprint_data', {
          p_user_id: userId,
          p_fingerprint: fingerprint
        })
      } catch (linkError) {
        console.error('[UserData] Fingerprint link failed:', linkError)
      }
    }

    // user_id로 조회 + fingerprint로 조회 후 병합
    const queries = [
      // user_id로 분석 결과 조회
      supabase
        .from('analysis_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // user_id로 레시피 조회
      supabase
        .from('perfume_feedbacks')
        .select('*')
        .eq('user_id', userId)
        .not('generated_recipe', 'is', null)
        .order('created_at', { ascending: false })
    ]

    // fingerprint가 있으면 추가 조회
    if (fingerprint) {
      queries.push(
        // fingerprint로 분석 결과 조회 (user_id가 NULL인 것만)
        supabase
          .from('analysis_results')
          .select('*')
          .eq('user_fingerprint', fingerprint)
          .is('user_id', null)
          .order('created_at', { ascending: false }),

        // fingerprint로 레시피 조회 (user_id가 NULL인 것만)
        supabase
          .from('perfume_feedbacks')
          .select('*')
          .eq('user_fingerprint', fingerprint)
          .is('user_id', null)
          .not('generated_recipe', 'is', null)
          .order('created_at', { ascending: false })
      )
    }

    const results = await Promise.all(queries)

    // 결과 병합 (중복 제거)
    const analysisById = new Map()
    const recipeById = new Map()

    // user_id로 조회한 결과
    ;(results[0].data || []).forEach((item: { id: string }) => analysisById.set(item.id, item))
    ;(results[1].data || []).forEach((item: { id: string }) => recipeById.set(item.id, item))

    // fingerprint로 조회한 결과 추가 (있는 경우)
    if (fingerprint && results.length > 2) {
      ;(results[2].data || []).forEach((item: { id: string }) => analysisById.set(item.id, item))
      ;(results[3].data || []).forEach((item: { id: string }) => recipeById.set(item.id, item))
    }

    // Map을 배열로 변환하고 날짜순 정렬
    const analysesRaw = Array.from(analysisById.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const recipes = Array.from(recipeById.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 각 분석 결과에 연결된 확정 레시피 조회
    const analysisIds = analysesRaw.map((a: { id: string }) => a.id)

    let linkedRecipesMap: Map<string, { granules: Array<{ id: string; name: string; ratio: number }> }> = new Map()

    if (analysisIds.length > 0) {
      const { data: linkedRecipes } = await supabase
        .from('perfume_feedbacks')
        .select('result_id, generated_recipe')
        .in('result_id', analysisIds)
        .not('generated_recipe', 'is', null)

      if (linkedRecipes) {
        linkedRecipes.forEach((r: { result_id: string; generated_recipe: { granules: Array<{ id: string; name: string; ratio: number }> } }) => {
          if (r.result_id && r.generated_recipe) {
            linkedRecipesMap.set(r.result_id, r.generated_recipe)
          }
        })
      }
    }

    // 분석 결과에 연결된 레시피 정보 추가
    const analyses = analysesRaw.map((analysis: { id: string }) => ({
      ...analysis,
      confirmed_recipe: linkedRecipesMap.get(analysis.id) || null
    }))

    return NextResponse.json({
      analyses,
      recipes,
      analysisError: results[0].error?.message || null,
      recipeError: results[1].error?.message || null,
    })

  } catch (error) {
    console.error('사용자 데이터 조회 실패:', error)
    return NextResponse.json(
      { error: '데이터 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
