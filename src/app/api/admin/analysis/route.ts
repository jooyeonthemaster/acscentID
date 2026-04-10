import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  // 카카오 세션 확인
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

  // Supabase Auth 세션 확인
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

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'csv' for export
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const productType = searchParams.get('product_type')
    const serviceMode = searchParams.get('service_mode')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClientWithCookies()

    // CSV 내보내기 - 페이지네이션 없이 전체 조회
    if (format === 'csv') {
      let csvQuery = supabase
        .from('analysis_results')
        .select('id, created_at, product_type, service_mode, idol_name, twitter_name, perfume_name, perfume_brand, matching_keywords, qr_code_id, pin, user_id')
        .order('created_at', { ascending: false })
        .limit(50000)

      if (productType && productType !== 'all') csvQuery = csvQuery.eq('product_type', productType)
      if (serviceMode && serviceMode !== 'all') csvQuery = csvQuery.eq('service_mode', serviceMode)
      if (search) csvQuery = csvQuery.or(`idol_name.ilike.%${search}%,twitter_name.ilike.%${search}%,perfume_name.ilike.%${search}%`)
      if (dateFrom) csvQuery = csvQuery.gte('created_at', dateFrom)
      if (dateTo) csvQuery = csvQuery.lte('created_at', dateTo + 'T23:59:59.999Z')

      const { data: csvAnalyses, error: csvError } = await csvQuery
      if (csvError) {
        return NextResponse.json({ error: 'CSV 생성 실패' }, { status: 500 })
      }

      // [FIX] HIGH: CSV productLabels에 chemistry_set, signature 추가
      const productLabels: Record<string, string> = {
        image_analysis: '최애 이미지', figure_diffuser: '피규어', personal_scent: '퍼스널', graduation: '졸업 퍼퓸', signature: '시그니처', chemistry_set: '케미 향수', etc: '기타',
      }
      const modeLabels: Record<string, string> = { online: '온라인', offline: '오프라인 QR' }

      const BOM = '\uFEFF'
      const headers = ['분석ID', '분석일시', '상품 타입', '서비스 모드', '아이돌명', '트위터이름', '추천 향수', '향수 브랜드', '키워드', 'QR코드ID', 'PIN']
      const rows = (csvAnalyses || []).map((a: any) => [
        a.id,
        new Date(a.created_at).toLocaleString('ko-KR'),
        productLabels[a.product_type] || a.product_type || '',
        modeLabels[a.service_mode] || a.service_mode || '',
        a.idol_name || '',
        a.twitter_name || '',
        a.perfume_name || '',
        a.perfume_brand || '',
        Array.isArray(a.matching_keywords) ? a.matching_keywords.join(', ') : '',
        a.qr_code_id || '',
        a.pin || '',
      ])

      const csvContent = BOM + [
        headers.join(','),
        ...rows.map((row: string[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const date = new Date().toISOString().split('T')[0]
      const filename = `ACSCENT_분석관리_${date}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    }

    // 기본 쿼리
    let query = supabase
      .from('analysis_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 필터 적용
    if (productType && productType !== 'all') {
      query = query.eq('product_type', productType)
    }

    if (serviceMode && serviceMode !== 'all') {
      query = query.eq('service_mode', serviceMode)
    }

    if (search) {
      query = query.or(`idol_name.ilike.%${search}%,twitter_name.ilike.%${search}%,perfume_name.ilike.%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data: analyses, error, count } = await query

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({ error: '분석 목록을 불러오는데 실패했습니다' }, { status: 500 })
    }

    // 사용자 정보 조회 (user_id가 있는 경우)
    const userIds = analyses?.filter(a => a.user_id).map(a => a.user_id) || []
    let userProfiles: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, email, provider')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 피드백 정보 조회
    const analysisIds = analyses?.map(a => a.id) || []
    let feedbacks: Record<string, any> = {}

    if (analysisIds.length > 0) {
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*')
        .in('result_id', analysisIds)

      if (feedbackData) {
        feedbacks = feedbackData.reduce((acc, f) => {
          acc[f.result_id] = f
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 응답 데이터 구성
    const enrichedAnalyses = analyses?.map(analysis => ({
      ...analysis,
      user_profile: analysis.user_id ? userProfiles[analysis.user_id] : null,
      feedback: feedbacks[analysis.id] || null,
    }))

    return NextResponse.json({
      data: enrichedAnalyses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in admin analysis API:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
