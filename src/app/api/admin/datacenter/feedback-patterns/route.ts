import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { aggregateKeywords } from '@/lib/fragrance-usage'
import { CategoryPreferences, SpecificScent } from '@/types/feedback'

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
interface RetentionDistribution {
  range: string
  count: number
  percentage: number
}

interface CategoryPreferenceStats {
  increase: number
  decrease: number
  maintain: number
  total: number
}

interface PopularScent {
  id: string
  name: string
  count: number
  avgRatio: number
}

interface FeedbackPatternsResponse {
  retentionDistribution: RetentionDistribution[]
  categoryPreferences: Record<string, CategoryPreferenceStats>
  popularAddedScents: PopularScent[]
  naturalLanguageKeywords: Array<{ keyword: string; count: number }>
  totalFeedbacks: number
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

    // 피드백 데이터 조회
    let query = supabase
      .from('perfume_feedbacks')
      .select(`
        id,
        created_at,
        retention_percentage,
        category_preferences,
        specific_scents,
        natural_language_feedback
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

    const totalFeedbacks = feedbacks?.length || 0

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

    for (const fb of feedbacks || []) {
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

    // 2. 카테고리 선호도 분석
    const categoryStats: Record<string, CategoryPreferenceStats> = {
      citrus: { increase: 0, decrease: 0, maintain: 0, total: 0 },
      floral: { increase: 0, decrease: 0, maintain: 0, total: 0 },
      woody: { increase: 0, decrease: 0, maintain: 0, total: 0 },
      musky: { increase: 0, decrease: 0, maintain: 0, total: 0 },
      fruity: { increase: 0, decrease: 0, maintain: 0, total: 0 },
      spicy: { increase: 0, decrease: 0, maintain: 0, total: 0 },
    }

    for (const fb of feedbacks || []) {
      const prefs = fb.category_preferences as CategoryPreferences | null
      if (prefs) {
        for (const [category, pref] of Object.entries(prefs)) {
          if (categoryStats[category]) {
            categoryStats[category][pref as 'increase' | 'decrease' | 'maintain']++
            categoryStats[category].total++
          }
        }
      }
    }

    // 3. 인기 추가 향료 분석
    const scentStats = new Map<string, { id: string; name: string; count: number; totalRatio: number }>()

    for (const fb of feedbacks || []) {
      const scents = fb.specific_scents as SpecificScent[] | null
      if (scents && Array.isArray(scents)) {
        for (const scent of scents) {
          const existing = scentStats.get(scent.id)
          if (existing) {
            existing.count++
            existing.totalRatio += scent.ratio || 0
          } else {
            scentStats.set(scent.id, {
              id: scent.id,
              name: scent.name,
              count: 1,
              totalRatio: scent.ratio || 0,
            })
          }
        }
      }
    }

    const popularAddedScents: PopularScent[] = Array.from(scentStats.values())
      .map((s) => ({
        id: s.id,
        name: s.name,
        count: s.count,
        avgRatio: Math.round((s.totalRatio / s.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // 4. 자연어 피드백 키워드 분석
    const nlFeedbacks = (feedbacks || [])
      .map((fb) => fb.natural_language_feedback as string | null)
      .filter((f): f is string => !!f)

    const naturalLanguageKeywords = aggregateKeywords(nlFeedbacks).slice(0, 20)

    const result: FeedbackPatternsResponse = {
      retentionDistribution,
      categoryPreferences: categoryStats,
      popularAddedScents,
      naturalLanguageKeywords,
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
