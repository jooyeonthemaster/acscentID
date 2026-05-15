import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
const ANALYSIS_LIST_SELECT = 'id, created_at, product_type, service_mode, target_type, idol_name, twitter_name, perfume_name, perfume_brand, matching_keywords, qr_code_id, pin, user_id, modeling_image_url, modeling_request'
const EXCLUDE_B_IDS_CACHE_TTL_MS = 60_000
let excludeBIdsCache: { expiresAt: number; ids: string[] } | null = null

interface AnalysisListRow {
  id: string
  created_at: string
  product_type: string | null
  service_mode: string | null
  target_type: string | null
  idol_name: string | null
  twitter_name: string | null
  perfume_name: string | null
  perfume_brand: string | null
  matching_keywords: string[] | null
  qr_code_id: string | null
  pin: string | null
  user_id: string | null
  modeling_image_url: string | null
  modeling_request: string | null
}

interface UserProfileRow {
  id: string
  name: string | null
  email: string | null
  provider: string | null
}

interface FeedbackRow {
  result_id: string
  [key: string]: unknown
}

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

async function getExcludeBIds(supabase: ReturnType<typeof createServiceRoleClient>) {
  if (excludeBIdsCache && excludeBIdsCache.expiresAt > Date.now()) {
    return excludeBIdsCache.ids
  }

  const { data: bIdRows } = await supabase
    .from('layering_sessions')
    .select('analysis_b_id')
    .not('analysis_b_id', 'is', null)
    .limit(100000)

  const ids = (bIdRows || [])
    .map((row: { analysis_b_id: string | null }) => row.analysis_b_id)
    .filter(Boolean) as string[]

  excludeBIdsCache = {
    expiresAt: Date.now() + EXCLUDE_B_IDS_CACHE_TTL_MS,
    ids,
  }

  return ids
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
    const targetType = searchParams.get('target_type')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const offset = (page - 1) * limit

    const supabase = createServiceRoleClient()

    // [FIX] 레이어링 퍼퓸: 세션당 2개 row가 생성되므로, 관리자 목록에서는 analysis_b_id를
    // 전부 제외해 "세션 1건 = row 1건 (캐릭터 A 기준)"으로 표시
    const excludeBIds = await getExcludeBIds(supabase)

    // CSV 내보내기 - 페이지네이션 없이 전체 조회
    if (format === 'csv') {
      let csvQuery = supabase
        .from('analysis_results')
        .select('id, created_at, product_type, service_mode, target_type, idol_name, twitter_name, perfume_name, perfume_brand, matching_keywords, qr_code_id, pin, user_id')
        .order('created_at', { ascending: false })
        .limit(50000)

      if (excludeBIds.length > 0) {
        csvQuery = csvQuery.not('id', 'in', `(${excludeBIds.join(',')})`)
      }
      if (productType && productType !== 'all') csvQuery = csvQuery.eq('product_type', productType)
      if (serviceMode && serviceMode !== 'all') csvQuery = csvQuery.eq('service_mode', serviceMode)
      if (targetType && targetType !== 'all') csvQuery = csvQuery.eq('target_type', targetType)
      if (search) csvQuery = csvQuery.or(`idol_name.ilike.%${search}%,twitter_name.ilike.%${search}%,perfume_name.ilike.%${search}%`)
      if (dateFrom) csvQuery = csvQuery.gte('created_at', dateFrom)
      if (dateTo) csvQuery = csvQuery.lte('created_at', dateTo + 'T23:59:59.999Z')

      const { data: csvAnalyses, error: csvError } = await csvQuery
      if (csvError) {
        return NextResponse.json({ error: 'CSV 생성 실패' }, { status: 500 })
      }

      // [FIX] 레이어링 퍼퓸: layering_sessions과 JOIN하여 파트너/PIN/QR 보강
      const csvAnalysisRows = (csvAnalyses || []) as AnalysisListRow[]
      const csvChemIds = csvAnalysisRows
        .filter((analysis) => analysis.product_type === 'chemistry_set')
        .map((analysis) => analysis.id)
      const csvPairs: Record<string, { partnerName: string | null; pin: string | null; qrCodeId: string | null; chemistryTitle: string | null }> = {}

      if (csvChemIds.length > 0) {
        const { data: csvSessions } = await supabase
          .from('layering_sessions')
          .select('analysis_a_id, analysis_b_id, character_a_name, character_b_name, chemistry_title, pin, qr_code_id')
          .or(`analysis_a_id.in.(${csvChemIds.join(',')}),analysis_b_id.in.(${csvChemIds.join(',')})`)

        for (const s of csvSessions || []) {
          if (csvChemIds.includes(s.analysis_a_id)) {
            csvPairs[s.analysis_a_id] = {
              partnerName: s.character_b_name || null,
              pin: s.pin || null,
              qrCodeId: s.qr_code_id || null,
              chemistryTitle: s.chemistry_title || null,
            }
          }
          if (csvChemIds.includes(s.analysis_b_id)) {
            csvPairs[s.analysis_b_id] = {
              partnerName: s.character_a_name || null,
              pin: s.pin || null,
              qrCodeId: s.qr_code_id || null,
              chemistryTitle: s.chemistry_title || null,
            }
          }
        }
      }

      // [FIX] HIGH: CSV productLabels에 chemistry_set, signature 추가
      const productLabels: Record<string, string> = {
        image_analysis: '최애 이미지', figure_diffuser: '피규어', personal_scent: '퍼스널', graduation: '졸업 퍼퓸', signature: '시그니처', chemistry_set: '레이어링 퍼퓸', etc: '기타',
      }
      const modeLabels: Record<string, string> = { online: '온라인', offline: '오프라인 QR' }

      const BOM = '\uFEFF'
      const headers = ['분석ID', '분석일시', '상품 타입', '서비스 모드', '분석 대상', '아이돌명', '트위터이름', '케미 파트너', '케미 타이틀', '추천 향수', '향수 브랜드', '키워드', 'QR코드ID', 'PIN']
      const targetLabel = (t: string | null | undefined, p: string | null | undefined) => {
        const tt = t === 'self' ? 'self' : 'idol'
        if (tt === 'self' && p === 'chemistry_set') return '나와 상대방'
        return tt === 'self' ? '나' : '최애'
      }
      const rows = csvAnalysisRows.map((a) => {
        const pair = a.product_type === 'chemistry_set' ? csvPairs[a.id] : null
        return [
          a.id,
          new Date(a.created_at).toLocaleString('ko-KR'),
          a.product_type ? productLabels[a.product_type] || a.product_type : '',
          a.service_mode ? modeLabels[a.service_mode] || a.service_mode : '',
          targetLabel(a.target_type, a.product_type),
          a.idol_name || '',
          a.twitter_name || '',
          pair?.partnerName || '',
          pair?.chemistryTitle || '',
          a.perfume_name || '',
          a.perfume_brand || '',
          Array.isArray(a.matching_keywords) ? a.matching_keywords.join(', ') : '',
          a.qr_code_id || pair?.qrCodeId || '',
          a.pin || pair?.pin || '',
        ]
      })

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
      .select(ANALYSIS_LIST_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // [FIX] 레이어링 퍼퓸: 세션당 2 row 중 analysis_b_id row는 제외 (캐릭터 A만 표시)
    if (excludeBIds.length > 0) {
      query = query.not('id', 'in', `(${excludeBIds.join(',')})`)
    }

    // 필터 적용
    if (productType && productType !== 'all') {
      query = query.eq('product_type', productType)
    }

    if (serviceMode && serviceMode !== 'all') {
      query = query.eq('service_mode', serviceMode)
    }

    if (targetType && targetType !== 'all') {
      query = query.eq('target_type', targetType)
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
    const analysisRows = (analyses || []) as AnalysisListRow[]
    const userIds = analysisRows.filter(a => a.user_id).map(a => a.user_id as string)
    let userProfiles: Record<string, UserProfileRow> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, email, provider')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, UserProfileRow>)
      }
    }

    // 피드백 정보 조회
    const analysisIds = analysisRows.map(a => a.id)
    let feedbacks: Record<string, FeedbackRow> = {}

    if (analysisIds.length > 0) {
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*')
        .in('result_id', analysisIds)

      if (feedbackData) {
        feedbacks = feedbackData.reduce((acc, f) => {
          acc[f.result_id] = f
          return acc
        }, {} as Record<string, FeedbackRow>)
      }
    }

    // [FIX] 레이어링 퍼퓸: layering_sessions과 JOIN하여 파트너 이름/PIN/QR 보강
    const chemistryIds = analysisRows
      .filter(a => a.product_type === 'chemistry_set')
      .map(a => a.id)
    const chemistryPairs: Record<string, {
      partnerName: string | null
      sessionId: string | null
      chemistryTitle: string | null
      chemistryType: string | null
      role: 'A' | 'B' | null
      pin: string | null
      qrCodeId: string | null
    }> = {}

    if (chemistryIds.length > 0) {
      const { data: sessions } = await supabase
        .from('layering_sessions')
        .select('id, analysis_a_id, analysis_b_id, character_a_name, character_b_name, chemistry_title, chemistry_type, pin, qr_code_id')
        .or(`analysis_a_id.in.(${chemistryIds.join(',')}),analysis_b_id.in.(${chemistryIds.join(',')})`)

      for (const s of sessions || []) {
        if (chemistryIds.includes(s.analysis_a_id)) {
          chemistryPairs[s.analysis_a_id] = {
            partnerName: s.character_b_name || null,
            sessionId: s.id,
            chemistryTitle: s.chemistry_title || null,
            chemistryType: s.chemistry_type || null,
            role: 'A',
            pin: s.pin || null,
            qrCodeId: s.qr_code_id || null,
          }
        }
        if (chemistryIds.includes(s.analysis_b_id)) {
          chemistryPairs[s.analysis_b_id] = {
            partnerName: s.character_a_name || null,
            sessionId: s.id,
            chemistryTitle: s.chemistry_title || null,
            chemistryType: s.chemistry_type || null,
            role: 'B',
            pin: s.pin || null,
            qrCodeId: s.qr_code_id || null,
          }
        }
      }
    }

    // 응답 데이터 구성
    const enrichedAnalyses = analysisRows.map(analysis => {
      const pair = chemistryPairs[analysis.id]
      return {
        ...analysis,
        user_profile: analysis.user_id ? userProfiles[analysis.user_id] : null,
        feedback: feedbacks[analysis.id] || null,
        // 케미 세션 정보 (chemistry_set일 때만 채워짐)
        partner_name: pair?.partnerName ?? null,
        layering_session_id: pair?.sessionId ?? null,
        chemistry_title: pair?.chemistryTitle ?? null,
        chemistry_type: pair?.chemistryType ?? null,
        chemistry_role: pair?.role ?? null,
        // 케미에서 analysis_results.pin이 비어있는 경우 layering_sessions.pin으로 보강
        pin: analysis.pin || pair?.pin || null,
        qr_code_id: analysis.qr_code_id || pair?.qrCodeId || null,
      }
    })

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
