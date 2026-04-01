import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { deductInventoryForOrder } from '@/lib/inventory-deduction'
import { addStampsForUser } from '@/lib/stamps'

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
    const influencerFilter = searchParams.get('influencer') // 'true', 'false', or null (all)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const serviceClient = createServiceRoleClient()

    // 기본 쿼리 (결제 대기 중인 주문은 제외 - 카드결제 완료 전 임시 주문)
    let query = serviceClient
      .from('orders')
      .select('*', { count: 'exact' })
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false })

    // 엑셀 다운로드가 아닌 경우에만 페이지네이션 적용
    if (!exportAll) {
      query = query.range(offset, offset + limit - 1)
    }

    // 상태 필터
    if (status && ['pending', 'paid', 'shipping', 'delivered', 'cancel_requested'].includes(status)) {
      query = query.eq('status', status)
    }

    // 인플루언서 필터
    if (influencerFilter === 'true') {
      query = query.eq('is_influencer', true)
    } else if (influencerFilter === 'false') {
      query = query.eq('is_influencer', false)
    }

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Admin orders fetch failed:', error)
      return NextResponse.json(
        { error: '주문 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // order_items 조회 (엑셀 다운로드가 아닌 경우에만)
    const orderIds = orders?.map(o => o.id) || []
    let orderItemsMap: Record<string, any[]> = {}

    if (!exportAll && orderIds.length > 0) {
      const { data: orderItems } = await serviceClient
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true })

      if (orderItems) {
        orderItemsMap = orderItems.reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = []
          acc[item.order_id].push(item)
          return acc
        }, {} as Record<string, any[]>)
      }
    }

    // 모든 analysis_id 수집 (orders + order_items 모두)
    const analysisIdsFromOrders = orders?.filter(o => o.analysis_id).map(o => o.analysis_id) || []
    const analysisIdsFromItems = Object.values(orderItemsMap)
      .flat()
      .filter(item => item.analysis_id)
      .map(item => item.analysis_id)
    const allAnalysisIds = [...new Set([...analysisIdsFromOrders, ...analysisIdsFromItems])]

    let analysisMap: Record<string, any> = {}

    if (allAnalysisIds.length > 0) {
      const { data: analyses } = await serviceClient
        .from('analysis_results')
        .select('id, modeling_image_url, modeling_request, product_type, user_image_url')
        .in('id', allAnalysisIds)

      if (analyses) {
        analysisMap = analyses.reduce((acc, a) => {
          acc[a.id] = a
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 주문에 분석 정보 + order_items 추가
    const enrichedOrders = orders?.map(order => {
      const items = orderItemsMap[order.id] || []
      const enrichedItems = items.map(item => ({
        ...item,
        analysis: item.analysis_id ? analysisMap[item.analysis_id] : null
      }))
      return {
        ...order,
        analysis: order.analysis_id ? analysisMap[order.analysis_id] : null,
        order_items: enrichedItems,
      }
    })

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
    const { orderId, status, is_influencer } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId가 필요합니다' },
        { status: 400 }
      )
    }

    // is_influencer만 업데이트하는 경우
    if (typeof is_influencer === 'boolean' && !status) {
      const serviceClient = createServiceRoleClient()
      const { data: order, error } = await serviceClient
        .from('orders')
        .update({
          is_influencer,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Influencer flag update failed:', error)
        return NextResponse.json(
          { error: '인플루언서 설정 변경에 실패했습니다' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, order })
    }

    if (!status) {
      return NextResponse.json(
        { error: 'status가 필요합니다' },
        { status: 400 }
      )
    }

    // 유효한 상태값 확인
    const validStatuses = ['pending', 'paid', 'shipping', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 기존 주문 상태 조회 (재고 차감 및 스탬프 중복 방지)
    const { data: existingOrder } = await serviceClient
      .from('orders')
      .select('status, user_id, item_count')
      .eq('id', orderId)
      .single()

    const previousStatus = existingOrder?.status

    // 주문 상태 업데이트 (is_influencer도 함께 업데이트 가능)
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    }
    if (typeof is_influencer === 'boolean') {
      updateData.is_influencer = is_influencer
    }

    const { data: order, error } = await serviceClient
      .from('orders')
      .update(updateData)
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

    // 결제 완료(paid) 상태로 변경될 때 재고 자동 차감 + 스탬프 추가
    // (기존 상태가 pending이고 새 상태가 paid인 경우에만 - 중복 차감 방지)
    let inventoryDeduction = null
    let stampResult = null
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

      // Add stamps for bank transfer orders confirmed by admin
      if (existingOrder?.user_id) {
        const itemCount = existingOrder.item_count || 1
        console.log(`[Admin Orders] Adding ${itemCount} stamps for user ${existingOrder.user_id} (bank transfer confirmed)`)
        stampResult = await addStampsForUser(
          serviceClient,
          existingOrder.user_id,
          itemCount,
          orderId,
          'online_order'
        )
      }
    }

    return NextResponse.json({
      success: true,
      order,
      inventoryDeduction,
      stampResult,
    })

  } catch (error) {
    console.error('Admin orders PATCH error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * 관리자 - 주문 삭제
 * DELETE /api/admin/orders
 */
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin: isUserAdmin } = await isAdmin()

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderIds } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '삭제할 주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 관련 order_items 먼저 삭제
    const { error: itemsError } = await serviceClient
      .from('order_items')
      .delete()
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('Order items delete failed:', itemsError)
    }

    // 주문 삭제
    const { error, count } = await serviceClient
      .from('orders')
      .delete()
      .in('id', orderIds)

    if (error) {
      console.error('Orders delete failed:', error)
      return NextResponse.json(
        { error: '주문 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || orderIds.length,
    })

  } catch (error) {
    console.error('Admin orders DELETE error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * 관리자 - 주문 메모 업데이트
 * PUT /api/admin/orders
 */
export async function PUT(request: NextRequest) {
  try {
    const { isAdmin: isUserAdmin } = await isAdmin()

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId, admin_memo } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId가 필요합니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    const { data: order, error } = await serviceClient
      .from('orders')
      .update({
        admin_memo,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Admin memo update failed:', error)
      return NextResponse.json(
        { error: '메모 저장에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })

  } catch (error) {
    console.error('Admin orders PUT error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
