import { NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
const DASHBOARD_CACHE_TTL_MS = 30_000
let dashboardCache: { expiresAt: number; data: unknown } | null = null

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

export async function GET() {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    if (dashboardCache && dashboardCache.expiresAt > Date.now()) {
      return NextResponse.json(dashboardCache.data)
    }

    const supabase = createServiceRoleClient()

    // 오늘 날짜 (KST 기준)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const [
      totalAnalysisResult,
      analysisTodayResult,
      analysisByProductResult,
      analysisByModeResult,
      totalOrdersResult,
      ordersTodayResult,
      ordersByStatusResult,
      revenueResult,
      totalMembersResult,
      newMembersTodayResult,
      totalQRCodesResult,
      qrScansResult,
    ] = await Promise.all([
      supabase.from('analysis_results').select('*', { count: 'exact', head: true }),
      supabase.from('analysis_results').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('analysis_results').select('product_type').limit(50000),
      supabase.from('analysis_results').select('service_mode').limit(50000),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('orders').select('status').limit(50000),
      supabase
        .from('orders')
        .select('final_price, created_at')
        .in('status', ['paid', 'preparing', 'shipping', 'delivered'])
        .eq('is_influencer', false)
        .limit(50000),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('qr_codes').select('*', { count: 'exact', head: true }),
      supabase.from('qr_codes').select('scan_count'),
    ])

    const totalAnalysis = totalAnalysisResult.count
    const analysisToday = analysisTodayResult.count
    const analysisByProductData = analysisByProductResult.data
    const analysisByModeData = analysisByModeResult.data
    const totalOrders = totalOrdersResult.count
    const ordersToday = ordersTodayResult.count
    const ordersByStatusData = ordersByStatusResult.data
    const revenueData = revenueResult.data
    const totalMembers = totalMembersResult.count
    const newMembersToday = newMembersTodayResult.count
    const totalQRCodes = totalQRCodesResult.count
    const qrScansData = qrScansResult.data

    // [FIX] HIGH: analysisByProduct에 chemistry_set, graduation, signature 추가
    const analysisByProduct: Record<string, number> = {
      image_analysis: 0,
      figure_diffuser: 0,
      personal_scent: 0,
      graduation: 0,
      signature: 0,
      chemistry_set: 0,
    }

    // [FIX] HIGH: 동적 키 처리
    analysisByProductData?.forEach(item => {
      const type = item.product_type || 'image_analysis'
      if (type in analysisByProduct) {
        analysisByProduct[type]++
      } else {
        analysisByProduct[type] = 1
      }
    })

    const analysisByMode = {
      online: 0,
      offline: 0,
    }

    analysisByModeData?.forEach(item => {
      const mode = item.service_mode || 'online'
      if (mode in analysisByMode) {
        analysisByMode[mode as keyof typeof analysisByMode]++
      }
    })

    const ordersByStatus = {
      awaiting_payment: 0,
      pending: 0,
      paid: 0,
      preparing: 0,
      shipping: 0,
      delivered: 0,
      cancel_requested: 0,
      cancelled: 0,
    }

    ordersByStatusData?.forEach(item => {
      const status = item.status || 'pending'
      if (status in ordersByStatus) {
        ordersByStatus[status as keyof typeof ordersByStatus]++
      }
    })

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0

    const revenueToday = revenueData?.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today
    }).reduce((sum, order) => sum + (order.final_price || 0), 0) || 0

    const totalQRScans = qrScansData?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0

    const responseData = {
      totalAnalysis: totalAnalysis || 0,
      analysisToday: analysisToday || 0,
      analysisByProduct,
      analysisByMode,
      totalOrders: totalOrders || 0,
      ordersToday: ordersToday || 0,
      ordersByStatus,
      totalRevenue,
      revenueToday,
      totalMembers: totalMembers || 0,
      newMembersToday: newMembersToday || 0,
      totalQRCodes: totalQRCodes || 0,
      totalQRScans,
    }

    dashboardCache = {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      data: responseData,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
