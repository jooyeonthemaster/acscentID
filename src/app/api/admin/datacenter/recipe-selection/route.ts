import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { SelectedRecipeType } from '@/types/feedback'
import { PROGRAM_TYPE_MAP, ProgramType } from '@/lib/fragrance-usage'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email,
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email,
    }
  }

  return { isAdmin: false, email: null }
}

// 타입 정의
interface SelectionBreakdown {
  count: number
  percentage: number
}

interface ProgramBreakdown {
  userDirect: number
  aiRecommended: number
  original: number
  total: number
}

interface MonthlyTrend {
  month: string
  userDirect: number
  aiRecommended: number
  original: number
  total: number
}

interface RecipeSelectionResponse {
  total: number
  breakdown: {
    userDirect: SelectionBreakdown
    aiRecommended: SelectionBreakdown
    original: SelectionBreakdown
  }
  byProgram: Record<ProgramType, ProgramBreakdown>
  trend: MonthlyTrend[]
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const supabase = await createServerSupabaseClientWithCookies()

    // 피드백 데이터 조회 (레시피 선택 타입 포함)
    let query = supabase
      .from('perfume_feedbacks')
      .select(`
        id,
        created_at,
        selected_recipe_type,
        result_id,
        generated_recipe
      `)
      .order('created_at', { ascending: false })

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: feedbacks, error } = await query

    if (error) {
      console.error('Error fetching feedbacks:', error)
      return NextResponse.json(
        { error: '피드백 데이터 조회 실패' },
        { status: 500 }
      )
    }

    // 분석 결과와 연결하여 프로그램 타입 조회
    const resultIds = (feedbacks || [])
      .map((f) => f.result_id)
      .filter(Boolean)

    let resultProgramMap = new Map<string, ProgramType>()

    if (resultIds.length > 0) {
      const { data: results } = await supabase
        .from('analysis_results')
        .select('id, product_type')
        .in('id', resultIds)

      resultProgramMap = new Map(
        (results || []).map((r) => [
          r.id,
          PROGRAM_TYPE_MAP[r.product_type] || 'idol_image',
        ])
      )
    }

    // 전체 집계
    const total = feedbacks?.length || 0
    const counts = {
      userDirect: 0,
      aiRecommended: 0,
      original: 0,
    }

    // 프로그램별 집계
    const byProgram: Record<ProgramType, ProgramBreakdown> = {
      idol_image: { userDirect: 0, aiRecommended: 0, original: 0, total: 0 },
      figure: { userDirect: 0, aiRecommended: 0, original: 0, total: 0 },
      graduation: { userDirect: 0, aiRecommended: 0, original: 0, total: 0 },
    }

    // 월별 트렌드 집계
    const monthlyData = new Map<string, {
      userDirect: number
      aiRecommended: number
      original: number
      total: number
    }>()

    for (const fb of feedbacks || []) {
      // 레시피 타입 결정
      let recipeType: SelectedRecipeType = 'original'

      if (fb.selected_recipe_type) {
        recipeType = fb.selected_recipe_type as SelectedRecipeType
      } else if (fb.generated_recipe) {
        // generated_recipe가 있으면 user_direct 또는 ai_recommended로 추정
        // 정확한 분류는 selected_recipe_type 필드에 의존
        recipeType = 'user_direct'
      }

      // 전체 카운트
      if (recipeType === 'user_direct') counts.userDirect++
      else if (recipeType === 'ai_recommended') counts.aiRecommended++
      else counts.original++

      // 프로그램별 카운트
      const programType = fb.result_id
        ? resultProgramMap.get(fb.result_id) || 'idol_image'
        : 'idol_image'

      byProgram[programType].total++
      if (recipeType === 'user_direct') byProgram[programType].userDirect++
      else if (recipeType === 'ai_recommended') byProgram[programType].aiRecommended++
      else byProgram[programType].original++

      // 월별 트렌드
      const createdAt = new Date(fb.created_at)
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`

      const monthStats = monthlyData.get(monthKey) || {
        userDirect: 0,
        aiRecommended: 0,
        original: 0,
        total: 0,
      }

      monthStats.total++
      if (recipeType === 'user_direct') monthStats.userDirect++
      else if (recipeType === 'ai_recommended') monthStats.aiRecommended++
      else monthStats.original++

      monthlyData.set(monthKey, monthStats)
    }

    // 월별 트렌드 정렬
    const trend: MonthlyTrend[] = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // 최근 12개월
      .map(([month, stats]) => ({
        month,
        ...stats,
      }))

    // 백분율 계산
    const breakdown = {
      userDirect: {
        count: counts.userDirect,
        percentage: total > 0 ? Math.round((counts.userDirect / total) * 1000) / 10 : 0,
      },
      aiRecommended: {
        count: counts.aiRecommended,
        percentage: total > 0 ? Math.round((counts.aiRecommended / total) * 1000) / 10 : 0,
      },
      original: {
        count: counts.original,
        percentage: total > 0 ? Math.round((counts.original / total) * 1000) / 10 : 0,
      },
    }

    const result: RecipeSelectionResponse = {
      total,
      breakdown,
      byProgram,
      trend,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in recipe-selection API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
