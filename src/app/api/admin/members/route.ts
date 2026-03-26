import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 서비스 역할 클라이언트 (RLS 우회 + 1000행 제한 없음)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 페이지네이션 헬퍼 (PostgREST 1000행 제한 우회)
const PAGE_SIZE = 1000

async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  filters?: { column: string; op: 'gte' | 'lte' | 'eq' | 'in' | 'neq'; value: string | string[] }[]
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    let query = supabaseAdmin
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1)

    if (filters) {
      for (const f of filters) {
        if (f.op === 'in') query = query.in(f.column, f.value as string[])
        else if (f.op === 'gte') query = query.gte(f.column, f.value as string)
        else if (f.op === 'lte') query = query.lte(f.column, f.value as string)
        else if (f.op === 'eq') query = query.eq(f.column, f.value as string)
        else if (f.op === 'neq') query = query.neq(f.column, f.value as string)
      }
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) break
    allRows.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

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
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'list'

    switch (type) {
      case 'list':
        return await getMemberList(searchParams)
      case 'insights':
        return await getMemberInsights()
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in admin members API:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// ========================
// 회원 목록 (필터 + 페이지네이션 + 엑셀 내보내기)
// ========================
async function getMemberList(searchParams: URLSearchParams) {
  const exportAll = searchParams.get('export') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = exportAll ? 50000 : parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search')
  const provider = searchParams.get('provider')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const hasAnalysis = searchParams.get('has_analysis') // 'yes' | 'no' | null
  const hasOrder = searchParams.get('has_order') // 'yes' | 'no' | null
  const sortBy = searchParams.get('sort_by') || 'created_at_desc'

  const offset = exportAll ? 0 : (page - 1) * limit

  // 기본 쿼리
  let query = supabaseAdmin
    .from('user_profiles')
    .select('*', { count: 'exact' })

  // 정렬
  const [sortCol, sortDir] = sortBy.includes('_asc')
    ? [sortBy.replace('_asc', ''), true]
    : [sortBy.replace('_desc', ''), false]

  if (sortCol === 'created_at' || sortCol === 'name' || sortCol === 'email') {
    query = query.order(sortCol, { ascending: sortDir })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  // 필터
  if (provider && provider !== 'all') {
    query = query.eq('provider', provider)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`)
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
  }

  const { data: members, error, count } = await query

  if (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: '회원 목록을 불러오는데 실패했습니다' }, { status: 500 })
  }

  if (!members || members.length === 0) {
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    })
  }

  const memberIds = members.map(m => m.id)

  // 병렬로 관련 데이터 조회
  const [analysisData, orderData, reviewData, couponData] = await Promise.all([
    fetchAllRows<{ user_id: string; product_type: string; created_at: string }>(
      'analysis_results', 'user_id, product_type, created_at',
      [{ column: 'user_id', op: 'in', value: memberIds }]
    ),
    fetchAllRows<{ user_id: string; status: string; final_price: number; created_at: string }>(
      'orders', 'user_id, status, final_price, created_at',
      [{ column: 'user_id', op: 'in', value: memberIds }]
    ),
    fetchAllRows<{ user_id: string }>(
      'reviews', 'user_id',
      [{ column: 'user_id', op: 'in', value: memberIds }]
    ),
    fetchAllRows<{ user_id: string; is_used: boolean }>(
      'user_coupons', 'user_id, is_used',
      [{ column: 'user_id', op: 'in', value: memberIds }]
    ),
  ])

  // 집계
  const analysisCounts: Record<string, number> = {}
  const firstAnalysisDate: Record<string, string> = {}
  analysisData.forEach(a => {
    analysisCounts[a.user_id] = (analysisCounts[a.user_id] || 0) + 1
    if (!firstAnalysisDate[a.user_id] || a.created_at < firstAnalysisDate[a.user_id]) {
      firstAnalysisDate[a.user_id] = a.created_at
    }
  })

  const orderCounts: Record<string, number> = {}
  const orderTotals: Record<string, number> = {}
  const firstOrderDate: Record<string, string> = {}
  orderData.forEach(o => {
    if (o.status !== 'cancelled' && o.status !== 'cancel_requested') {
      orderCounts[o.user_id] = (orderCounts[o.user_id] || 0) + 1
      orderTotals[o.user_id] = (orderTotals[o.user_id] || 0) + (o.final_price || 0)
      if (!firstOrderDate[o.user_id] || o.created_at < firstOrderDate[o.user_id]) {
        firstOrderDate[o.user_id] = o.created_at
      }
    }
  })

  const reviewCounts: Record<string, number> = {}
  reviewData.forEach(r => {
    reviewCounts[r.user_id] = (reviewCounts[r.user_id] || 0) + 1
  })

  const couponCounts: Record<string, { total: number; used: number }> = {}
  couponData.forEach(c => {
    if (!couponCounts[c.user_id]) couponCounts[c.user_id] = { total: 0, used: 0 }
    couponCounts[c.user_id].total++
    if (c.is_used) couponCounts[c.user_id].used++
  })

  // 피추천인 수 집계
  const referralCodes = members.filter(m => m.referral_code).map(m => m.referral_code)
  let referredCounts: Record<string, number> = {}

  if (referralCodes.length > 0) {
    const referredData = await fetchAllRows<{ referred_by: string }>(
      'user_profiles', 'referred_by',
      [{ column: 'referred_by', op: 'in', value: referralCodes }]
    )
    referredData.forEach(r => {
      referredCounts[r.referred_by] = (referredCounts[r.referred_by] || 0) + 1
    })
  }

  // 추천인 정보 조회
  const referredByCodes = members.filter(m => m.referred_by).map(m => m.referred_by)
  let referrerInfo: Record<string, { name: string; email: string }> = {}

  if (referredByCodes.length > 0) {
    const referrerData = await fetchAllRows<{ referral_code: string; name: string; email: string }>(
      'user_profiles', 'referral_code, name, email',
      [{ column: 'referral_code', op: 'in', value: referredByCodes }]
    )
    referrerData.forEach(r => {
      referrerInfo[r.referral_code] = { name: r.name, email: r.email }
    })
  }

  // 응답 데이터 구성
  let enrichedMembers = members.map(member => ({
    ...member,
    analysis_count: analysisCounts[member.id] || 0,
    order_count: orderCounts[member.id] || 0,
    order_total: orderTotals[member.id] || 0,
    review_count: reviewCounts[member.id] || 0,
    coupon_total: couponCounts[member.id]?.total || 0,
    coupon_used: couponCounts[member.id]?.used || 0,
    referred_count: member.referral_code ? (referredCounts[member.referral_code] || 0) : 0,
    referrer: member.referred_by ? referrerInfo[member.referred_by] : null,
    first_analysis_at: firstAnalysisDate[member.id] || null,
    first_order_at: firstOrderDate[member.id] || null,
  }))

  // 활동 기반 필터 (집계 후 적용)
  if (hasAnalysis === 'yes') {
    enrichedMembers = enrichedMembers.filter(m => m.analysis_count > 0)
  } else if (hasAnalysis === 'no') {
    enrichedMembers = enrichedMembers.filter(m => m.analysis_count === 0)
  }

  if (hasOrder === 'yes') {
    enrichedMembers = enrichedMembers.filter(m => m.order_count > 0)
  } else if (hasOrder === 'no') {
    enrichedMembers = enrichedMembers.filter(m => m.order_count === 0)
  }

  // 활동 기반 정렬
  if (sortBy === 'analysis_desc') {
    enrichedMembers.sort((a, b) => b.analysis_count - a.analysis_count)
  } else if (sortBy === 'order_desc') {
    enrichedMembers.sort((a, b) => b.order_count - a.order_count)
  } else if (sortBy === 'order_total_desc') {
    enrichedMembers.sort((a, b) => b.order_total - a.order_total)
  } else if (sortBy === 'referred_desc') {
    enrichedMembers.sort((a, b) => b.referred_count - a.referred_count)
  }

  return NextResponse.json({
    data: enrichedMembers,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

// ========================
// 회원 인사이트 (마케팅 분석 데이터)
// ========================
async function getMemberInsights() {
  // 전체 회원 데이터
  const allMembers = await fetchAllRows<{
    id: string
    provider: string
    referral_code: string | null
    referred_by: string | null
    created_at: string
  }>('user_profiles', 'id, provider, referral_code, referred_by, created_at')

  // 전체 분석 데이터
  const allAnalyses = await fetchAllRows<{
    user_id: string
    product_type: string
    created_at: string
  }>('analysis_results', 'user_id, product_type, created_at')

  // 전체 주문 데이터
  const allOrders = await fetchAllRows<{
    user_id: string
    status: string
    final_price: number
    created_at: string
  }>('orders', 'user_id, status, final_price, created_at')

  // 전체 리뷰 데이터
  const allReviews = await fetchAllRows<{ user_id: string }>('reviews', 'user_id')

  // 전체 쿠폰 데이터
  const allCoupons = await fetchAllRows<{
    user_id: string
    is_used: boolean
  }>('user_coupons', 'user_id, is_used')

  const totalMembers = allMembers.length
  const memberSet = new Set(allMembers.map(m => m.id))

  // ===== 1. 전환 퍼널 =====
  const membersWithAnalysis = new Set<string>()
  const membersWithOrder = new Set<string>()
  const validOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'cancel_requested')

  allAnalyses.forEach(a => {
    if (a.user_id && memberSet.has(a.user_id)) membersWithAnalysis.add(a.user_id)
  })
  validOrders.forEach(o => {
    if (o.user_id && memberSet.has(o.user_id)) membersWithOrder.add(o.user_id)
  })

  const membersWithBoth = new Set([...membersWithAnalysis].filter(id => membersWithOrder.has(id)))
  const membersInactive = totalMembers - membersWithAnalysis.size

  const funnel = {
    total: totalMembers,
    analyzed: membersWithAnalysis.size,
    ordered: membersWithOrder.size,
    analyzedAndOrdered: membersWithBoth.size,
    inactive: membersInactive,
    signupToAnalysis: totalMembers > 0 ? Math.round((membersWithAnalysis.size / totalMembers) * 100) : 0,
    analysisToOrder: membersWithAnalysis.size > 0 ? Math.round((membersWithBoth.size / membersWithAnalysis.size) * 100) : 0,
    signupToOrder: totalMembers > 0 ? Math.round((membersWithOrder.size / totalMembers) * 100) : 0,
  }

  // ===== 2. 회원 세그먼트 =====
  const segments = {
    loyal: 0,      // 재구매 (주문 2회 이상)
    buyer: 0,      // 구매 1회
    explorer: 0,   // 분석만 하고 구매 안 함
    dormant: 0,    // 가입만 하고 아무것도 안 함
  }

  const orderCountPerUser: Record<string, number> = {}
  validOrders.forEach(o => {
    if (o.user_id) orderCountPerUser[o.user_id] = (orderCountPerUser[o.user_id] || 0) + 1
  })

  allMembers.forEach(m => {
    const orders = orderCountPerUser[m.id] || 0
    const hasAn = membersWithAnalysis.has(m.id)
    if (orders >= 2) segments.loyal++
    else if (orders === 1) segments.buyer++
    else if (hasAn) segments.explorer++
    else segments.dormant++
  })

  // ===== 3. 가입 채널별 성과 =====
  const channelStats: Record<string, {
    total: number
    analyzed: number
    ordered: number
    revenue: number
  }> = {}

  const revenuePerUser: Record<string, number> = {}
  validOrders.forEach(o => {
    if (o.user_id) revenuePerUser[o.user_id] = (revenuePerUser[o.user_id] || 0) + (o.final_price || 0)
  })

  allMembers.forEach(m => {
    const ch = m.provider || 'unknown'
    if (!channelStats[ch]) channelStats[ch] = { total: 0, analyzed: 0, ordered: 0, revenue: 0 }
    channelStats[ch].total++
    if (membersWithAnalysis.has(m.id)) channelStats[ch].analyzed++
    if (membersWithOrder.has(m.id)) {
      channelStats[ch].ordered++
      channelStats[ch].revenue += revenuePerUser[m.id] || 0
    }
  })

  // ===== 4. 추천 효과 분석 =====
  const referredMembers = allMembers.filter(m => m.referred_by)
  const directMembers = allMembers.filter(m => !m.referred_by)

  const referralEffect = {
    referredCount: referredMembers.length,
    directCount: directMembers.length,
    referredAnalysisRate: referredMembers.length > 0
      ? Math.round((referredMembers.filter(m => membersWithAnalysis.has(m.id)).length / referredMembers.length) * 100)
      : 0,
    directAnalysisRate: directMembers.length > 0
      ? Math.round((directMembers.filter(m => membersWithAnalysis.has(m.id)).length / directMembers.length) * 100)
      : 0,
    referredOrderRate: referredMembers.length > 0
      ? Math.round((referredMembers.filter(m => membersWithOrder.has(m.id)).length / referredMembers.length) * 100)
      : 0,
    directOrderRate: directMembers.length > 0
      ? Math.round((directMembers.filter(m => membersWithOrder.has(m.id)).length / directMembers.length) * 100)
      : 0,
  }

  // Top 추천인
  const referralCodeToUser: Record<string, { id: string; name: string | null }> = {}
  // 이름 조회를 위해 전체 가져옴
  const allMembersFull = await fetchAllRows<{
    id: string; name: string | null; email: string | null; referral_code: string | null
  }>('user_profiles', 'id, name, email, referral_code')

  allMembersFull.forEach(m => {
    if (m.referral_code) {
      referralCodeToUser[m.referral_code] = { id: m.id, name: m.name || m.email || '알 수 없음' }
    }
  })

  const referralCounts: Record<string, number> = {}
  referredMembers.forEach(m => {
    if (m.referred_by) {
      referralCounts[m.referred_by] = (referralCounts[m.referred_by] || 0) + 1
    }
  })

  const topReferrers = Object.entries(referralCounts)
    .map(([code, count]) => ({
      code,
      name: referralCodeToUser[code]?.name || code,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ===== 5. 월별 가입 추이 =====
  const monthlySignups: Record<string, number> = {}
  allMembers.forEach(m => {
    const month = m.created_at.slice(0, 7) // YYYY-MM
    monthlySignups[month] = (monthlySignups[month] || 0) + 1
  })

  const monthlyTrend = Object.entries(monthlySignups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  // ===== 6. 주문 패턴 =====
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.final_price || 0), 0)
  const avgOrderValue = membersWithOrder.size > 0 ? Math.round(totalRevenue / validOrders.length) : 0
  const repeatBuyers = Object.values(orderCountPerUser).filter(c => c >= 2).length
  const repeatRate = membersWithOrder.size > 0 ? Math.round((repeatBuyers / membersWithOrder.size) * 100) : 0

  // 회원당 평균 분석 횟수
  const analysisCountPerUser: Record<string, number> = {}
  allAnalyses.forEach(a => {
    if (a.user_id) analysisCountPerUser[a.user_id] = (analysisCountPerUser[a.user_id] || 0) + 1
  })
  const avgAnalysisPerMember = membersWithAnalysis.size > 0
    ? Math.round((Object.values(analysisCountPerUser).reduce((a, b) => a + b, 0) / membersWithAnalysis.size) * 10) / 10
    : 0

  // 회원당 평균 주문 횟수
  const avgOrderPerBuyer = membersWithOrder.size > 0
    ? Math.round((validOrders.length / membersWithOrder.size) * 10) / 10
    : 0

  // ===== 7. 쿠폰 효과 =====
  const totalCouponsIssued = allCoupons.length
  const totalCouponsUsed = allCoupons.filter(c => c.is_used).length
  const couponUsageRate = totalCouponsIssued > 0 ? Math.round((totalCouponsUsed / totalCouponsIssued) * 100) : 0

  // 쿠폰 사용한 회원 vs 미사용 회원의 구매율
  const couponUserIds = new Set(allCoupons.filter(c => c.is_used).map(c => c.user_id))
  const couponUsersWhoOrdered = [...couponUserIds].filter(id => membersWithOrder.has(id)).length
  const couponOrderRate = couponUserIds.size > 0 ? Math.round((couponUsersWhoOrdered / couponUserIds.size) * 100) : 0

  // ===== 8. 리뷰 참여 =====
  const reviewerIds = new Set(allReviews.map(r => r.user_id))
  const reviewRate = membersWithOrder.size > 0 ? Math.round((reviewerIds.size / membersWithOrder.size) * 100) : 0

  // ===== 9. 상품 타입별 분석 분포 =====
  const productTypeAnalysis: Record<string, number> = {}
  allAnalyses.forEach(a => {
    productTypeAnalysis[a.product_type] = (productTypeAnalysis[a.product_type] || 0) + 1
  })

  // ===== 10. 가입 후 첫 행동까지 평균 시간 =====
  let totalTimeToAnalysis = 0
  let countTimeToAnalysis = 0
  let totalTimeToOrder = 0
  let countTimeToOrder = 0

  const firstAnalysisPerUser: Record<string, string> = {}
  allAnalyses.forEach(a => {
    if (a.user_id && (!firstAnalysisPerUser[a.user_id] || a.created_at < firstAnalysisPerUser[a.user_id])) {
      firstAnalysisPerUser[a.user_id] = a.created_at
    }
  })

  const firstOrderPerUser: Record<string, string> = {}
  validOrders.forEach(o => {
    if (o.user_id && (!firstOrderPerUser[o.user_id] || o.created_at < firstOrderPerUser[o.user_id])) {
      firstOrderPerUser[o.user_id] = o.created_at
    }
  })

  const memberCreatedMap: Record<string, string> = {}
  allMembers.forEach(m => { memberCreatedMap[m.id] = m.created_at })

  Object.entries(firstAnalysisPerUser).forEach(([userId, analysisDate]) => {
    const signupDate = memberCreatedMap[userId]
    if (signupDate) {
      const diff = new Date(analysisDate).getTime() - new Date(signupDate).getTime()
      if (diff >= 0) {
        totalTimeToAnalysis += diff
        countTimeToAnalysis++
      }
    }
  })

  Object.entries(firstOrderPerUser).forEach(([userId, orderDate]) => {
    const signupDate = memberCreatedMap[userId]
    if (signupDate) {
      const diff = new Date(orderDate).getTime() - new Date(signupDate).getTime()
      if (diff >= 0) {
        totalTimeToOrder += diff
        countTimeToOrder++
      }
    }
  })

  const avgTimeToAnalysisHours = countTimeToAnalysis > 0
    ? Math.round(totalTimeToAnalysis / countTimeToAnalysis / (1000 * 60 * 60) * 10) / 10
    : 0
  const avgTimeToOrderHours = countTimeToOrder > 0
    ? Math.round(totalTimeToOrder / countTimeToOrder / (1000 * 60 * 60) * 10) / 10
    : 0

  return NextResponse.json({
    funnel,
    segments,
    channelStats,
    referralEffect,
    topReferrers,
    monthlyTrend,
    orderPatterns: {
      totalRevenue,
      avgOrderValue,
      repeatBuyers,
      repeatRate,
      avgAnalysisPerMember,
      avgOrderPerBuyer,
    },
    couponEffect: {
      totalIssued: totalCouponsIssued,
      totalUsed: totalCouponsUsed,
      usageRate: couponUsageRate,
      couponOrderRate,
    },
    reviewStats: {
      totalReviewers: reviewerIds.size,
      reviewRate,
    },
    productTypeAnalysis,
    timeToAction: {
      avgTimeToAnalysisHours,
      avgTimeToOrderHours,
    },
  })
}
