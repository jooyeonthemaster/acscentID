import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * 단일 주문 조회 API
 * GET /api/orders/[id]
 *
 * 주문 완료 페이지에서 주문 정보를 표시할 때 사용
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 주문 정보 조회
    const { data: order, error } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('Order fetch failed:', error)
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 필요한 필드만 반환 (보안상 민감한 정보 제외)
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        perfume_name: order.perfume_name,
        perfume_brand: order.perfume_brand,
        size: order.size,
        price: order.price,
        shipping_fee: order.shipping_fee,
        discount_amount: order.discount_amount,
        final_price: order.final_price,
        product_type: order.product_type,
        status: order.status,
        created_at: order.created_at
      }
    })

  } catch (error) {
    console.error('Order GET error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
