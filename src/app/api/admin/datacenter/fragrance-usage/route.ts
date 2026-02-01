import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import {
  ProgramType,
  FragranceUsageItem,
  CategoryUsage,
  ProgramUsage,
  FragranceUsageResult,
  UsageSummary,
  PROGRAM_TYPE_MAP,
  CATEGORY_META,
  getFragranceVolume,
  extractGranulesFromRecipe,
  createSinglePerfumeRecipe,
  aggregateFragranceUsage,
  aggregateCategoryUsage,
} from '@/lib/fragrance-usage'
import { GeneratedRecipe } from '@/types/feedback'

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

// 사용량 데이터 타입
interface UsageDataItem {
  fragranceId: string
  fragranceName: string
  category: string
  ml: number
  g: number
  ratio: number
  programType: ProgramType
  source: 'online' | 'offline'
}

// 프로그램별 집계 생성 함수
function createEmptyProgramUsage(): Record<ProgramType, ProgramUsage> {
  return {
    idol_image: { totalMl: 0, totalG: 0, totalItems: 0, topFragrances: [] },
    figure: { totalMl: 0, totalG: 0, totalItems: 0, topFragrances: [] },
    graduation: { totalMl: 0, totalG: 0, totalItems: 0, topFragrances: [] },
  }
}

// 요약 생성 함수
function createSummary(usageData: UsageDataItem[], byFragrance: FragranceUsageItem[]): UsageSummary {
  return {
    totalMl: Math.round(byFragrance.reduce((sum, f) => sum + f.totalMl, 0) * 100) / 100,
    totalG: Math.round(byFragrance.reduce((sum, f) => sum + f.totalG, 0) * 100) / 100,
    totalItems: usageData.length,
    uniqueFragrances: byFragrance.length,
  }
}

// 프로그램별 집계 함수
function aggregateByProgram(usageData: UsageDataItem[]): Record<ProgramType, ProgramUsage> {
  const byProgram = createEmptyProgramUsage()

  for (const item of usageData) {
    byProgram[item.programType].totalMl += item.ml
    byProgram[item.programType].totalG += item.g
    byProgram[item.programType].totalItems += 1
  }

  // 프로그램별 상위 향료
  for (const progType of ['idol_image', 'figure', 'graduation'] as ProgramType[]) {
    const programData = usageData.filter((d) => d.programType === progType)
    byProgram[progType].topFragrances = aggregateFragranceUsage(programData).slice(0, 5)
    byProgram[progType].totalMl = Math.round(byProgram[progType].totalMl * 100) / 100
    byProgram[progType].totalG = Math.round(byProgram[progType].totalG * 100) / 100
  }

  return byProgram
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
    const programType = searchParams.get('programType') as ProgramType | 'all' | null

    const supabase = await createServerSupabaseClientWithCookies()

    // 사용량 데이터 수집
    const allUsageData: UsageDataItem[] = []

    // 1. 오프라인 분석 데이터 수집 (analysis_results + perfume_feedbacks)
    // 오프라인은 주문 여부와 관계없이 최종 레시피 기준
    let offlineQuery = supabase
      .from('analysis_results')
      .select(`
        id,
        created_at,
        product_type,
        perfume_name,
        service_mode
      `)
      .eq('service_mode', 'offline')

    if (dateFrom) {
      offlineQuery = offlineQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      offlineQuery = offlineQuery.lte('created_at', dateTo)
    }

    const { data: offlineAnalyses } = await offlineQuery

    if (offlineAnalyses && offlineAnalyses.length > 0) {
      // 피드백 데이터 조회
      const resultIds = offlineAnalyses.map((a) => a.id)
      const { data: feedbacks } = await supabase
        .from('perfume_feedbacks')
        .select('result_id, generated_recipe')
        .in('result_id', resultIds)

      const feedbackMap = new Map(
        (feedbacks || []).map((f) => [f.result_id, f.generated_recipe])
      )

      for (const analysis of offlineAnalyses) {
        const rawType = analysis.product_type || 'idol_image'
        const normalizedType = PROGRAM_TYPE_MAP[rawType] || 'idol_image'

        if (programType && programType !== 'all' && normalizedType !== programType) {
          continue
        }

        const recipe = feedbackMap.get(analysis.id) as GeneratedRecipe | null
        const fragranceVolMl = getFragranceVolume(rawType, '10ml') // 오프라인은 기본 10ml

        // 레시피가 있으면 레시피 사용, 없으면 단일 향수 100%
        const granules = recipe
          ? extractGranulesFromRecipe(recipe)
          : createSinglePerfumeRecipe(analysis.perfume_name)

        for (const granule of granules) {
          const ml = (granule.ratio / 100) * fragranceVolMl
          allUsageData.push({
            fragranceId: granule.id,
            fragranceName: granule.name,
            category: granule.category,
            ml,
            g: ml * 0.9,
            ratio: granule.ratio,
            programType: normalizedType,
            source: 'offline',
          })
        }
      }
    }

    // 2. 온라인 주문 데이터 수집 (주문 완료된 건만)
    let onlineQuery = supabase
      .from('order_items')
      .select(`
        id,
        product_type,
        perfume_name,
        size,
        quantity,
        analysis_id,
        created_at,
        orders!inner (
          status,
          created_at
        )
      `)
      .in('orders.status', ['paid', 'delivered', 'shipping'])

    if (dateFrom) {
      onlineQuery = onlineQuery.gte('orders.created_at', dateFrom)
    }
    if (dateTo) {
      onlineQuery = onlineQuery.lte('orders.created_at', dateTo)
    }

    const { data: orderItems } = await onlineQuery

    if (orderItems && orderItems.length > 0) {
      // 분석 결과와 연결된 피드백 조회
      const analysisIds = orderItems
        .map((o) => o.analysis_id)
        .filter(Boolean)

      let feedbackMap = new Map<string, GeneratedRecipe | null>()

      if (analysisIds.length > 0) {
        const { data: feedbacks } = await supabase
          .from('perfume_feedbacks')
          .select('result_id, generated_recipe')
          .in('result_id', analysisIds)

        feedbackMap = new Map(
          (feedbacks || []).map((f) => [f.result_id, f.generated_recipe as GeneratedRecipe | null])
        )
      }

      for (const item of orderItems) {
        const rawType = item.product_type || 'image_analysis'
        const normalizedType = PROGRAM_TYPE_MAP[rawType] || 'idol_image'

        if (programType && programType !== 'all' && normalizedType !== programType) {
          continue
        }

        const fragranceVolMl = getFragranceVolume(rawType, item.size || '10ml')
        const quantity = item.quantity || 1

        // 피드백 레시피가 있으면 사용, 없으면 단일 향수 100%
        const recipe = item.analysis_id ? feedbackMap.get(item.analysis_id) : null
        const granules = recipe
          ? extractGranulesFromRecipe(recipe)
          : createSinglePerfumeRecipe(item.perfume_name)

        for (const granule of granules) {
          const ml = (granule.ratio / 100) * fragranceVolMl * quantity
          allUsageData.push({
            fragranceId: granule.id,
            fragranceName: granule.name,
            category: granule.category,
            ml,
            g: ml * 0.9,
            ratio: granule.ratio,
            programType: normalizedType,
            source: 'online',
          })
        }
      }
    }

    // 온라인/오프라인 분리
    const onlineData = allUsageData.filter((d) => d.source === 'online')
    const offlineData = allUsageData.filter((d) => d.source === 'offline')

    // 향료별 집계
    const onlineByFragrance = aggregateFragranceUsage(onlineData).map((f, idx) => ({ ...f, rank: idx + 1 }))
    const offlineByFragrance = aggregateFragranceUsage(offlineData).map((f, idx) => ({ ...f, rank: idx + 1 }))
    const combinedByFragrance = aggregateFragranceUsage(allUsageData).map((f, idx) => ({ ...f, rank: idx + 1 }))

    // 카테고리별 집계
    const onlineByCategory = aggregateCategoryUsage(onlineByFragrance)
    const offlineByCategory = aggregateCategoryUsage(offlineByFragrance)
    const combinedByCategory = aggregateCategoryUsage(combinedByFragrance)

    // 프로그램별 집계
    const onlineByProgram = aggregateByProgram(onlineData)
    const offlineByProgram = aggregateByProgram(offlineData)
    const combinedByProgram = aggregateByProgram(allUsageData)

    // 요약
    const onlineSummary = createSummary(onlineData, onlineByFragrance)
    const offlineSummary = createSummary(offlineData, offlineByFragrance)
    const combinedSummary = createSummary(allUsageData, combinedByFragrance)

    const result: FragranceUsageResult = {
      summary: {
        online: onlineSummary,
        offline: offlineSummary,
        combined: combinedSummary,
      },
      byFragrance: {
        online: onlineByFragrance,
        offline: offlineByFragrance,
        combined: combinedByFragrance,
      },
      byCategory: {
        online: onlineByCategory,
        offline: offlineByCategory,
        combined: combinedByCategory,
      },
      byProgram: {
        online: onlineByProgram,
        offline: offlineByProgram,
        combined: combinedByProgram,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in fragrance-usage API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
