import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'

// 관리자 이메일 목록 (환경변수 또는 하드코딩)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim().toLowerCase())

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

/**
 * 관리자 - 전체 주문 목록 조회
 * GET /api/admin/orders
 */
export async function GET(request: NextRequest) {
  try {
    const { isAdmin: isUserAdmin, email } = await isAdmin()

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, paid, shipping, delivered
    const exportAll = searchParams.get('export') === 'true' // 엑셀 다운로드용 전체 조회
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const serviceClient = createServiceRoleClient()

    // 기본 쿼리
    let query = serviceClient
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 엑셀 다운로드가 아닌 경우에만 페이지네이션 적용
    if (!exportAll) {
      query = query.range(offset, offset + limit - 1)
    }

    // 상태 필터
    if (status && ['pending', 'paid', 'shipping', 'delivered', 'cancel_requested'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Admin orders fetch failed:', error)
      return NextResponse.json(
        { error: '주문 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // analysis_id가 있는 주문들의 분석 정보 조회 (모델링 이미지 포함)
    const analysisIds = orders?.filter(o => o.analysis_id).map(o => o.analysis_id) || []
    let analysisMap: Record<string, any> = {}

    if (analysisIds.length > 0) {
      const { data: analyses } = await serviceClient
        .from('analysis_results')
        .select('id, modeling_image_url, modeling_request, product_type, user_image_url')
        .in('id', analysisIds)

      if (analyses) {
        analysisMap = analyses.reduce((acc, a) => {
          acc[a.id] = a
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 주문에 분석 정보 추가
    const enrichedOrders = orders?.map(order => ({
      ...order,
      analysis: order.analysis_id ? analysisMap[order.analysis_id] : null
    }))

    return NextResponse.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Admin orders GET error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * 관리자 - 주문 상태 변경
 * PATCH /api/admin/orders
 */
export async function PATCH(request: NextRequest) {
  try {
    const { isAdmin: isUserAdmin, email } = await isAdmin()

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId와 status가 필요합니다' },
        { status: 400 }
      )
    }

    // 유효한 상태값 확인
    const validStatuses = ['pending', 'paid', 'shipping', 'delivered']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 기존 주문 상태 조회 (재고 차감 중복 방지)
    const { data: existingOrder } = await serviceClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    const previousStatus = existingOrder?.status

    // 주문 상태 업데이트
    const { data: order, error } = await serviceClient
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Order status update failed:', error)
      return NextResponse.json(
        { error: '주문 상태 변경에 실패했습니다' },
        { status: 500 }
      )
    }

    // 결제 완료(paid) 상태로 변경될 때 재고 자동 차감
    // (기존 상태가 pending이고 새 상태가 paid인 경우에만 - 중복 차감 방지)
    let inventoryDeduction = null
    if (previousStatus === 'pending' && status === 'paid') {
      console.log(`[Admin Orders] Deducting inventory for order: ${orderId}`)
      const deductionResult = await deductInventoryForOrder(
        serviceClient,
        orderId,
        email || undefined
      )
      inventoryDeduction = {
        success: deductionResult.success,
        deductedCount: deductionResult.deducted.length,
        errors: deductionResult.errors,
      }
      if (!deductionResult.success) {
        console.warn(`[Admin Orders] Inventory deduction had errors:`, deductionResult.errors)
      }
    }

    return NextResponse.json({
      success: true,
      order,
      inventoryDeduction,
    })

  } catch (error) {
    console.error('Admin orders PATCH error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
