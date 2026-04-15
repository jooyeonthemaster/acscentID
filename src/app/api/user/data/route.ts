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

    const linkedRecipesMap: Map<string, { granules: Array<{ id: string; name: string; ratio: number }> }> = new Map()

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
    const analysesWithRecipes = analysesRaw.map((analysis: { id: string }) => ({
      ...analysis,
      confirmed_recipe: linkedRecipesMap.get(analysis.id) || null
    }))

    // ── 케미 향수(chemistry_set) 통합 처리 ──
    // chemistry_set인 analysis ID들을 추출
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chemistryAnalysisIds = (analysesWithRecipes as any[])
      .filter((a) => a.product_type === 'chemistry_set')
      .map((a) => a.id as string)

    interface ChemistryAnalysisItem {
      id: string
      twitter_name: string
      perfume_name: string
      perfume_brand: string
      user_image_url: string | null
      analysis_data: object
      created_at: string
      idol_name: string | null
      product_type?: string
      service_mode?: string
      confirmed_recipe: { granules: Array<{ id: string; name: string; ratio: number }> } | null
    }

    interface ChemistryGroup {
      sessionId: string
      characterA: ChemistryAnalysisItem
      characterB: ChemistryAnalysisItem
      chemistryData: object
      chemistryType: string | null
      chemistryTitle: string | null
      service_mode: string
      created_at: string
    }

    console.log(`[UserData] Total analyses: ${analysesWithRecipes.length}, Chemistry IDs: ${chemistryAnalysisIds.length}`, chemistryAnalysisIds)

    const chemistryAnalyses: ChemistryGroup[] = []
    const chemistryAnalysisIdSet = new Set<string>()

    if (chemistryAnalysisIds.length > 0) {
      // layering_sessions에서 해당 analysis_id들과 연결된 세션 조회
      const idList = chemistryAnalysisIds.join(',')
      const { data: layeringSessions, error: layeringError } = await supabase
        .from('layering_sessions')
        .select('*')
        .or(`analysis_a_id.in.(${idList}),analysis_b_id.in.(${idList})`)
        .order('created_at', { ascending: false })

      if (layeringError) {
        console.error('[UserData] layering_sessions query error:', layeringError)
      }

      console.log(`[UserData] layeringSessions found: ${layeringSessions?.length || 0}`)

      if (layeringSessions && layeringSessions.length > 0) {
        // analysis ID → analysis 데이터 맵
        const chemAnalysisMap = new Map<string, ChemistryAnalysisItem>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(analysesWithRecipes as any[])
          .filter((a) => a.product_type === 'chemistry_set')
          .forEach((a) => chemAnalysisMap.set(a.id, a as ChemistryAnalysisItem))

        for (const session of layeringSessions) {
          const charA = chemAnalysisMap.get(session.analysis_a_id)
          const charB = chemAnalysisMap.get(session.analysis_b_id)

          if (charA && charB) {
            chemistryAnalyses.push({
              sessionId: session.id,
              characterA: charA,
              characterB: charB,
              chemistryData: session.chemistry_data || {},
              chemistryType: session.chemistry_type || null,
              chemistryTitle: session.chemistry_title || null,
              service_mode: session.service_mode || 'online',
              created_at: session.created_at,
            })
            // 통합된 ID를 기록하여 일반 목록에서 제거
            chemistryAnalysisIdSet.add(session.analysis_a_id)
            chemistryAnalysisIdSet.add(session.analysis_b_id)
          }
        }
      }
    }

    // 일반 분석 목록에서 chemistry_set 중 통합된 항목 제거
    const analyses = analysesWithRecipes.filter(
      (a: { id: string }) => !chemistryAnalysisIdSet.has(a.id)
    )

    // 레시피를 분석 결과별로 그룹핑
    interface RecipeItem {
      id: string
      result_id: string | null
      created_at: string
      perfume_name: string
      perfume_id: string
      generated_recipe: object | null
      retention_percentage: number
    }

    interface AnalysisInfo {
      id: string
      twitter_name: string
      perfume_name: string
      perfume_brand: string
      user_image_url: string | null
      created_at: string
    }

    const recipesByAnalysis = new Map<string | null, RecipeItem[]>()

    recipes.forEach((recipe: RecipeItem) => {
      const key = recipe.result_id || null
      if (!recipesByAnalysis.has(key)) {
        recipesByAnalysis.set(key, [])
      }
      recipesByAnalysis.get(key)!.push(recipe)
    })

    // 분석 정보 맵 생성
    const analysisInfoMap = new Map<string, AnalysisInfo>()
    analysesRaw.forEach((a: AnalysisInfo) => {
      analysisInfoMap.set(a.id, {
        id: a.id,
        twitter_name: a.twitter_name,
        perfume_name: a.perfume_name,
        perfume_brand: a.perfume_brand,
        user_image_url: a.user_image_url,
        created_at: a.created_at
      })
    })

    // 그룹 배열 생성 (연결된 분석이 있는 것부터, 최신순)
    const recipeGroups: Array<{
      analysis: AnalysisInfo | null
      recipes: RecipeItem[]
    }> = []

    // 연결된 레시피 그룹 추가
    recipesByAnalysis.forEach((groupRecipes, analysisId) => {
      if (analysisId) {
        const analysisInfo = analysisInfoMap.get(analysisId) || null
        recipeGroups.push({
          analysis: analysisInfo,
          recipes: groupRecipes.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })
      }
    })

    // 분석 날짜 기준 정렬
    recipeGroups.sort((a, b) => {
      const dateA = a.analysis ? new Date(a.analysis.created_at).getTime() : 0
      const dateB = b.analysis ? new Date(b.analysis.created_at).getTime() : 0
      return dateB - dateA
    })

    // 연결 안 된 레시피 그룹 (마지막에 추가)
    const unlinkedRecipes = recipesByAnalysis.get(null)
    if (unlinkedRecipes && unlinkedRecipes.length > 0) {
      recipeGroups.push({
        analysis: null,
        recipes: unlinkedRecipes.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      })
    }

    console.log(`[UserData] Final: analyses=${analyses.length}, chemistryAnalyses=${chemistryAnalyses.length}`)

    return NextResponse.json({
      analyses,
      chemistryAnalyses,  // 케미 향수 통합 데이터
      recipes,  // 기존 호환성 유지
      recipeGroups,  // 새로운 그룹핑 데이터
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
