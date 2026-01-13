import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

// 주문 번호 생성 함수
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${year}${month}${day}-${random}`
}

/**
 * 주문 생성 API
 * POST /api/orders
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const {
      perfumeName,
      perfumeBrand,
      size,
      price,
      shippingFee,
      totalPrice,
      // 쿠폰 정보
      userCouponId,
      discountAmount,
      originalPrice,
      finalPrice,
      // 배송 정보
      recipientName,
      phone,
      zipCode,
      address,
      addressDetail,
      memo,
      userImage,
      keywords,
      analysisData, // 전체 분석 데이터 (레시피 표시용)
    } = body

    // 3. 필수 필드 검증
    if (!recipientName || !phone || !address || !price || !size) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 4. 주문 생성
    const serviceClient = createServiceRoleClient()
    const orderNumber = generateOrderNumber()

    const { data: order, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        perfume_name: perfumeName,
        perfume_brand: perfumeBrand,
        size,
        price,
        shipping_fee: shippingFee || 0,
        // 쿠폰 정보
        user_coupon_id: userCouponId || null,
        discount_amount: discountAmount || 0,
        original_price: originalPrice || (price + (shippingFee || 0)),
        final_price: finalPrice || totalPrice || price,
        // 배송 정보
        recipient_name: recipientName,
        phone,
        zip_code: zipCode,
        address,
        address_detail: addressDetail || '',
        memo: memo || '',
        user_image_url: userImage,
        keywords: keywords || [],
        analysis_data: analysisData || null, // 전체 분석 데이터 (JSONB)
        status: 'pending', // 입금대기
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Order creation failed:', insertError)
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다', details: insertError.message },
        { status: 500 }
      )
    }

    // 5. 쿠폰 사용 처리
    if (userCouponId) {
      const { error: couponUpdateError } = await serviceClient
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          used_order_id: order.id,
        })
        .eq('id', userCouponId)

      if (couponUpdateError) {
        console.error('Coupon update failed:', couponUpdateError)
        // 쿠폰 업데이트 실패해도 주문은 성공으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      discountApplied: discountAmount > 0,
    })

  } catch (error) {
    console.error('Order API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * 사용자 주문 목록 조회 API
 * GET /api/orders
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 주문 목록 조회
    const serviceClient = createServiceRoleClient()

    const { data: orders, error } = await serviceClient
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Orders fetch failed:', error)
      return NextResponse.json(
        { error: '주문 내역 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })

  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
