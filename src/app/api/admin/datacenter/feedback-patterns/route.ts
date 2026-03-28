import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { SpecificScent } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'

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

// 향료 ID → 카테고리 매핑
function getPerfumeCategory(perfumeId: string): string {
  const perfume = perfumes.find((p) => p.id === perfumeId)
  return perfume?.category || 'unknown'
}

// 타입 정의
interface RetentionDistribution {
  range: string
  count: number
  percentage: number
}

interface CategoryAdditionStats {
  category: string
  label: string
  icon: string
  totalSelections: number
  avgRatio: number
  uniquePerfumes: number
  topPerfumes: Array<{ name: string; count: number }>
}

interface PopularScent {
  id: string
  name: string
  category: string
  count: number
  avgRatio: number
  minRatio: number
  maxRatio: number
  stddevRatio: number
  ratioDistribution: { range: string; count: number }[]
}

interface ScentAdditionPattern {
  scentCount: number
  feedbackCount: number
  avgTotalRatio: number
}

interface RecipeTypeStats {
  userDirect: number
  aiRecommended: number
  original: number
  unknown: number
}

interface FeedbackPatternsResponse {
  retentionDistribution: RetentionDistribution[]
  categoryAdditions: CategoryAdditionStats[]
  popularAddedScents: PopularScent[]
  scentAdditionPatterns: ScentAdditionPattern[]
  recipeTypeStats: RecipeTypeStats
  totalFeedbacks: number
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  citrus: { label: '시트러스', icon: '🍋' },
  floral: { label: '플로럴', icon: '🌸' },
  woody: { label: '우디', icon: '🌳' },
  musky: { label: '머스크', icon: '✨' },
  fruity: { label: '프루티', icon: '🍎' },
  spicy: { label: '스파이시', icon: '🌶️' },
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

    // 피드백 데이터 조회 (페이지네이션으로 전체 조회)
    let allFeedbacks: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      let query = supabase
        .from('perfume_feedbacks')
        .select(`
          id,
          created_at,
          retention_percentage,
          specific_scents,
          selected_recipe_type
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching feedbacks:', error)
        return NextResponse.json(
          { error: '피드백 데이터 조회 실패' },
          { status: 500 }
        )
      }

      if (!data || data.length === 0) break
      allFeedbacks = allFeedbacks.concat(data)
      if (data.length < pageSize) break
      page++
    }

    const feedbacks = allFeedbacks
    const totalFeedbacks = feedbacks.length

    // 1. 잔향률 분포 계산
    const retentionRanges = [
      { range: '0-20%', min: 0, max: 20 },
      { range: '21-40%', min: 21, max: 40 },
      { range: '41-60%', min: 41, max: 60 },
      { range: '61-80%', min: 61, max: 80 },
      { range: '81-100%', min: 81, max: 100 },
    ]

    const retentionCounts = retentionRanges.map((r) => ({
      range: r.range,
      count: 0,
    }))

    for (const fb of feedbacks) {
      const retention = fb.retention_percentage || 0
      for (let i = 0; i < retentionRanges.length; i++) {
        if (retention >= retentionRanges[i].min && retention <= retentionRanges[i].max) {
          retentionCounts[i].count++
          break
        }
      }
    }

    const retentionDistribution: RetentionDistribution[] = retentionCounts.map((r) => ({
      range: r.range,
      count: r.count,
      percentage: totalFeedbacks > 0
        ? Math.round((r.count / totalFeedbacks) * 1000) / 10
        : 0,
    }))

    // 2. 카테고리별 추가 선택 빈도 (specific_scents에서 역추적)
    const categoryMap: Record<string, {
      totalSelections: number
      totalRatio: number
      perfumeCounts: Map<string, number>
    }> = {}

    for (const cat of Object.keys(CATEGORY_META)) {
      categoryMap[cat] = { totalSelections: 0, totalRatio: 0, perfumeCounts: new Map() }
    }

    // 3. 인기 추가 향료 상세 분석
    const scentStats = new Map<string, {
      id: string
      name: string
      category: string
      ratios: number[]
    }>()

    // 4. 향료 추가 패턴
    const additionPatterns = new Map<number, { count: number; totalRatio: number }>()

    for (const fb of feedbacks) {
      const scents = fb.specific_scents as SpecificScent[] | null
      if (!scents || !Array.isArray(scents) || scents.length === 0) continue

      // 추가 패턴 집계
      const totalRatio = scents.reduce((sum, s) => sum + (s.ratio || 0), 0)
      const existing = additionPatterns.get(scents.length)
      if (existing) {
        existing.count++
        existing.totalRatio += totalRatio
      } else {
        additionPatterns.set(scents.length, { count: 1, totalRatio: totalRatio })
      }

      for (const scent of scents) {
        const category = getPerfumeCategory(scent.id)

        // 카테고리 집계
        if (categoryMap[category]) {
          categoryMap[category].totalSelections++
          categoryMap[category].totalRatio += scent.ratio || 0
          const prev = categoryMap[category].perfumeCounts.get(scent.name) || 0
          categoryMap[category].perfumeCounts.set(scent.name, prev + 1)
        }

        // 향료별 상세 집계
        const scentStat = scentStats.get(scent.id)
        if (scentStat) {
          scentStat.ratios.push(scent.ratio || 0)
        } else {
          scentStats.set(scent.id, {
            id: scent.id,
            name: scent.name,
            category,
            ratios: [scent.ratio || 0],
          })
        }
      }
    }

    // 카테고리 결과 정리
    const totalCategorySelections = Object.values(categoryMap).reduce((s, c) => s + c.totalSelections, 0)
    const categoryAdditions: CategoryAdditionStats[] = Object.entries(categoryMap)
      .map(([cat, stats]) => {
        const meta = CATEGORY_META[cat] || { label: cat, icon: '🎯' }
        const topPerfumes = Array.from(stats.perfumeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))

        return {
          category: cat,
          label: meta.label,
          icon: meta.icon,
          totalSelections: stats.totalSelections,
          avgRatio: stats.totalSelections > 0
            ? Math.round((stats.totalRatio / stats.totalSelections) * 10) / 10
            : 0,
          uniquePerfumes: stats.perfumeCounts.size,
          topPerfumes,
        }
      })
      .sort((a, b) => b.totalSelections - a.totalSelections)

    // 향료별 결과 정리 (상세 통계 포함)
    const popularAddedScents: PopularScent[] = Array.from(scentStats.values())
      .map((s) => {
        const count = s.ratios.length
        const avg = s.ratios.reduce((a, b) => a + b, 0) / count
        const min = Math.min(...s.ratios)
        const max = Math.max(...s.ratios)
        const variance = s.ratios.reduce((sum, r) => sum + (r - avg) ** 2, 0) / count
        const stddev = Math.sqrt(variance)

        // 비율 분포
        const ratioBuckets = [
          { range: '1-20%', min: 1, max: 20, count: 0 },
          { range: '21-40%', min: 21, max: 40, count: 0 },
          { range: '41-60%', min: 41, max: 60, count: 0 },
          { range: '61-80%', min: 61, max: 80, count: 0 },
          { range: '81-100%', min: 81, max: 100, count: 0 },
        ]
        for (const r of s.ratios) {
          for (const bucket of ratioBuckets) {
            if (r >= bucket.min && r <= bucket.max) {
              bucket.count++
              break
            }
          }
        }

        return {
          id: s.id,
          name: s.name,
          category: s.category,
          count,
          avgRatio: Math.round(avg * 10) / 10,
          minRatio: min,
          maxRatio: max,
          stddevRatio: Math.round(stddev * 10) / 10,
          ratioDistribution: ratioBuckets.map((b) => ({ range: b.range, count: b.count })),
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // 향료 추가 패턴 정리
    const scentAdditionPatterns: ScentAdditionPattern[] = Array.from(additionPatterns.entries())
      .map(([scentCount, stats]) => ({
        scentCount,
        feedbackCount: stats.count,
        avgTotalRatio: Math.round((stats.totalRatio / stats.count) * 10) / 10,
      }))
      .sort((a, b) => a.scentCount - b.scentCount)

    // 5. 레시피 타입 선택 통계
    const recipeTypeStats: RecipeTypeStats = {
      userDirect: 0,
      aiRecommended: 0,
      original: 0,
      unknown: 0,
    }

    for (const fb of feedbacks) {
      switch (fb.selected_recipe_type) {
        case 'user_direct': recipeTypeStats.userDirect++; break
        case 'ai_recommended': recipeTypeStats.aiRecommended++; break
        case 'original': recipeTypeStats.original++; break
        default: recipeTypeStats.unknown++; break
      }
    }

    const result: FeedbackPatternsResponse = {
      retentionDistribution,
      categoryAdditions,
      popularAddedScents,
      scentAdditionPatterns,
      recipeTypeStats,
      totalFeedbacks,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in feedback-patterns API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
