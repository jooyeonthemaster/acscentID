import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

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

    const supabase = await createServerSupabaseClientWithCookies()

    // 오늘 날짜 (KST 기준)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // 1. 분석 통계
    const { count: totalAnalysis } = await supabase
      .from('analysis_results')
      .select('*', { count: 'exact', head: true })

    const { count: analysisToday } = await supabase
      .from('analysis_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)

    // 상품 타입별 분석 수
    const { data: analysisByProductData } = await supabase
      .from('analysis_results')
      .select('product_type')

    const analysisByProduct = {
      image_analysis: 0,
      figure_diffuser: 0,
      personal_scent: 0,
    }

    analysisByProductData?.forEach(item => {
      const type = item.product_type || 'image_analysis'
      if (type in analysisByProduct) {
        analysisByProduct[type as keyof typeof analysisByProduct]++
      }
    })

    // 서비스 모드별 분석 수
    const { data: analysisByModeData } = await supabase
      .from('analysis_results')
      .select('service_mode')

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

    // 2. 주문 통계
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)

    // 상태별 주문 수
    const { data: ordersByStatusData } = await supabase
      .from('orders')
      .select('status')

    const ordersByStatus = {
      pending: 0,
      paid: 0,
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

    // 3. 매출 통계
    const { data: revenueData } = await supabase
      .from('orders')
      .select('final_price, created_at')
      .in('status', ['paid', 'shipping', 'delivered'])

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0

    const revenueToday = revenueData?.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today
    }).reduce((sum, order) => sum + (order.final_price || 0), 0) || 0

    // 4. 회원 통계
    const { count: totalMembers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    const { count: newMembersToday } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)

    // 5. QR 통계
    const { count: totalQRCodes } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })

    const { data: qrScansData } = await supabase
      .from('qr_codes')
      .select('scan_count')

    const totalQRScans = qrScansData?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
