import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import type { ProductType } from '@/types/cart'
import { PRODUCT_PRICING, FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from '@/types/cart'
import { notifyNewOrder } from '@/lib/email/admin-notify'
import { addStampsForUser } from '@/lib/stamps'
import { STAMP_MILESTONES } from '@/types/stamp'

/**
 * Prospective stamp coupon 검증
 * userCouponId가 'prospective_stamp_10' 등인 경우:
 * - 현재 스탬프 + 구매 수량으로 해당 마일스톤 도달 가능한지 검증
 * - 할인율 반환
 */
async function validateProspectiveStampCoupon(
  userId: string,
  userCouponId: string,
  purchaseQuantity: number,
  serviceClient: ReturnType<typeof createServiceRoleClient>
): Promise<{ valid: boolean; discountPercent: number; rewardType: string }> {
  // prospective_stamp_10, prospective_stamp_20, prospective_stamp_free
  const rewardType = userCouponId.replace('prospective_', '')
  const milestone = STAMP_MILESTONES.find(m => m.reward_type === rewardType)

  if (!milestone) return { valid: false, discountPercent: 0, rewardType }

  // 현재 스탬프 조회
  const { data: userStamp } = await serviceClient
    .from('user_stamps')
    .select('total_stamps')
    .eq('user_id', userId)
    .single()

  const currentStamps = userStamp?.total_stamps || 0
  const projectedStamps = currentStamps + purchaseQuantity

  // 마일스톤 도달 가능한지 확인
  if (projectedStamps < milestone.milestone) {
    return { valid: false, discountPercent: 0, rewardType }
  }

  return { valid: true, discountPercent: milestone.discount_percent, rewardType }
}

/**
 * 서버사이드 가격 검증
 * 클라이언트가 보낸 가격을 서버의 PRODUCT_PRICING과 대조하여 조작 여부를 확인합니다.
 */
function validatePrice(productType: ProductType, size: string, clientPrice: number): { valid: boolean; expectedPrice: number } {
  const pricing = PRODUCT_PRICING[productType]
  if (!pricing) {
    return { valid: false, expectedPrice: 0 }
  }
  const option = pricing.find((p) => p.size === size)
  if (!option) {
    return { valid: false, expectedPrice: 0 }
  }
  return { valid: clientPrice === option.price, expectedPrice: option.price }
}

function calculateServerShippingFee(subtotal: number, productType?: string): number {
  if (productType === 'payment_test') return 0
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE
}

/**
 * 서버사이드 배송비 검증 (프로모션 적용 포함)
 * 활성 프로모션을 DB에서 조회하여 배송비를 검증합니다.
 */
async function calculateServerShippingFeeWithPromotion(
  subtotal: number,
  productType: string | undefined,
  promotionId: string | null,
  serviceClient: ReturnType<typeof createServiceRoleClient>
): Promise<number> {
  // 기본 배송비 계산
  const baseFee = calculateServerShippingFee(subtotal, productType)

  // 이미 무료이면 프로모션 불필요
  if (baseFee === 0) return 0

  // 프로모션 ID가 없으면 기본 배송비
  if (!promotionId) return baseFee

  // 프로모션 유효성 검증
  const { data: promo } = await serviceClient
    .from('promotions')
    .select('id, type, is_active, min_order_amount, start_date, end_date')
    .eq('id', promotionId)
    .eq('is_active', true)
    .eq('type', 'free_shipping')
    .single()

  if (!promo) return baseFee

  // 날짜 범위 검증
  const now = new Date()
  if (promo.start_date && new Date(promo.start_date) > now) return baseFee
  if (promo.end_date && new Date(promo.end_date) < now) return baseFee

  // 최소 주문 금액 조건 확인
  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) return baseFee

  // 프로모션 적용: 배송비 무료
  return 0
}

// Stamp logic moved to shared utility: @/lib/stamps.ts

// 주문 상품 아이템 타입
interface OrderItem {
  analysisId?: string
  productType: ProductType
  perfumeName: string
  perfumeBrand?: string
  twitterName?: string
  size: string
  unitPrice: number
  quantity: number
  imageUrl?: string
  analysisData?: object
}

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
 *
 * 지원:
 * - 단일 상품 주문 (기존 호환)
 * - 다중 상품 주문 (items 배열)
 */
export async function POST(request: NextRequest) {
  console.log('[Orders API] POST request received')

  try {
    // 1. 사용자 인증 확인
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    console.log('[Orders API] Kakao session:', kakaoSession ? 'exists' : 'null')

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
      console.log('[Orders API] Using Kakao user:', userId)
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[Orders API] Supabase user:', user ? user.id : 'null')
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      console.log('[Orders API] No user found, returning 401')
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 요청 데이터 파싱
    console.log('[Orders API] Parsing request body...')
    const body = await request.json()
    console.log('[Orders API] Request body keys:', Object.keys(body))
    const {
      // 다중 상품 주문
      items,
      subtotal: requestSubtotal,
      // 단일 상품 주문 (기존 호환)
      perfumeName,
      perfumeBrand,
      size,
      price,
      // 공통
      shippingFee,
      totalPrice,
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
      // 단일 상품용
      userImage,
      keywords,
      analysisData,
      productType,  // 상품 타입 (image_analysis, figure_diffuser, graduation, signature)
      analysisId,   // 분석 ID (분석 결과 연결용)
      // 결제 방법
      paymentMethod,  // 'bank_transfer' | 'card' | 'kakao_pay' | 'naver_pay'
      // 확정된 커스텀 레시피 (재주문 시)
      confirmedRecipe,
      // 프로모션
      promotionId,
    } = body

    // 다중 상품 모드 확인
    const isMultiItemMode = Array.isArray(items) && items.length > 0

    // 3. 필수 필드 검증
    if (!recipientName || !phone || !address) {
      return NextResponse.json(
        { error: '배송 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    if (!isMultiItemMode && (!price || !size)) {
      return NextResponse.json(
        { error: '상품 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    const orderNumber = generateOrderNumber()
    const now = new Date().toISOString()

    // ===== 다중 상품 주문 =====
    if (isMultiItemMode) {
      const orderItems: OrderItem[] = items

      // 서버사이드 가격 검증: 각 상품의 단가를 서버 가격표와 대조
      for (const item of orderItems) {
        const itemProductType: ProductType = item.productType || 'image_analysis'
        const itemPriceCheck = validatePrice(itemProductType, item.size, item.unitPrice)
        if (!itemPriceCheck.valid) {
          console.error('[Orders API] Multi-item price mismatch - item:', item.perfumeName, 'client:', item.unitPrice, 'expected:', itemPriceCheck.expectedPrice)
          return NextResponse.json(
            { error: `상품 "${item.perfumeName}"의 가격이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.` },
            { status: 400 }
          )
        }
      }

      // 상품 정보 계산
      const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0)
      const calculatedSubtotal = orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity, 0
      )

      // 배송비 및 최종 금액 검증 (프로모션 반영)
      const expectedMultiShippingFee = await calculateServerShippingFeeWithPromotion(
        calculatedSubtotal, undefined, promotionId || null, serviceClient
      )
      const clientMultiShippingFee = shippingFee || 0
      if (clientMultiShippingFee !== expectedMultiShippingFee) {
        console.error('[Orders API] Multi-item shipping fee mismatch - client:', clientMultiShippingFee, 'expected:', expectedMultiShippingFee)
        return NextResponse.json(
          { error: '배송비가 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      // Validate coupon discount server-side (multi-item)
      let validatedMultiDiscount = 0
      let isProspectiveCoupon = false
      let prospectiveRewardType = ''
      if (userCouponId) {
        if (typeof userCouponId === 'string' && userCouponId.startsWith('prospective_')) {
          // Prospective stamp coupon: 이번 구매로 마일스톤 도달 → 즉시 할인
          isProspectiveCoupon = true
          const validation = await validateProspectiveStampCoupon(
            userId, userCouponId, itemCount, serviceClient
          )
          if (!validation.valid) {
            return NextResponse.json({ error: '스탬프 즉시 할인 조건을 충족하지 않습니다' }, { status: 400 })
          }
          prospectiveRewardType = validation.rewardType
          if (validation.rewardType === 'stamp_free') {
            const cheapestPrice = Math.min(...orderItems.map((item: any) => item.unitPrice))
            validatedMultiDiscount = cheapestPrice
          } else {
            validatedMultiDiscount = Math.floor(calculatedSubtotal * (validation.discountPercent / 100))
          }
        } else {
          // Regular coupon validation
          const { data: userCouponData } = await serviceClient
            .from('user_coupons')
            .select('id, user_id, is_used, coupon:coupons(type, discount_percent)')
            .eq('id', userCouponId)
            .single()

          if (!userCouponData) {
            return NextResponse.json({ error: '유효하지 않은 쿠폰입니다' }, { status: 400 })
          }
          if (userCouponData.user_id !== userId) {
            return NextResponse.json({ error: '본인의 쿠폰만 사용 가능합니다' }, { status: 400 })
          }
          if (userCouponData.is_used) {
            return NextResponse.json({ error: '이미 사용된 쿠폰입니다' }, { status: 400 })
          }

          const coupon = userCouponData.coupon as any
          const couponPercent = coupon?.discount_percent || 0

          if (coupon?.type === 'stamp_free') {
            const cheapestPrice = Math.min(...orderItems.map((item: any) => item.unitPrice))
            validatedMultiDiscount = cheapestPrice
          } else {
            validatedMultiDiscount = Math.floor(calculatedSubtotal * (couponPercent / 100))
          }
        }
      }

      // Check client discount matches server-validated discount (allow minor rounding)
      if (Math.abs(validatedMultiDiscount - (discountAmount || 0)) > 1) {
        console.error('[Orders API] Multi-item discount mismatch - client:', discountAmount, 'validated:', validatedMultiDiscount)
        return NextResponse.json(
          { error: '할인 금액이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      const expectedMultiFinalPrice = calculatedSubtotal + expectedMultiShippingFee - validatedMultiDiscount
      const clientMultiFinalPrice = finalPrice || totalPrice || calculatedSubtotal
      if (Math.abs(clientMultiFinalPrice - expectedMultiFinalPrice) > 1) {
        console.error('[Orders API] Multi-item final price mismatch - client:', clientMultiFinalPrice, 'expected:', expectedMultiFinalPrice)
        return NextResponse.json(
          { error: '결제 금액이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      // 첫 번째 상품 정보 (orders 테이블 호환용)
      const firstItem = orderItems[0]

      // 4a. 주문 생성 (orders 테이블)
      const { data: order, error: orderError } = await serviceClient
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          analysis_id: firstItem.analysisId || null,  // 첫 번째 상품의 분석 ID
          // 첫 번째 상품 정보 (기존 필드 호환)
          perfume_name: orderItems.length > 1
            ? `${firstItem.perfumeName} 외 ${orderItems.length - 1}건`
            : firstItem.perfumeName,
          perfume_brand: firstItem.perfumeBrand || '',
          size: orderItems.length > 1 ? 'mixed' : firstItem.size,
          price: calculatedSubtotal,
          product_type: firstItem.productType || 'image_analysis',  // 첫 번째 상품의 타입
          // 다중 상품 정보
          item_count: itemCount,
          subtotal: calculatedSubtotal,
          // 배송/결제 정보
          shipping_fee: shippingFee || 0,
          user_coupon_id: isProspectiveCoupon ? null : (userCouponId || null),
          discount_amount: validatedMultiDiscount || 0,
          original_price: originalPrice || (calculatedSubtotal + (shippingFee || 0)),
          final_price: finalPrice || totalPrice || calculatedSubtotal,
          // 배송 정보
          recipient_name: recipientName,
          phone,
          zip_code: zipCode,
          address,
          address_detail: addressDetail || '',
          memo: memo || '',
          // 첫 번째 상품 이미지 (기존 필드 호환)
          user_image_url: firstItem.imageUrl || null,
          keywords: [],
          analysis_data: null,
          payment_method: paymentMethod || 'bank_transfer',
          status: paymentMethod && paymentMethod !== 'bank_transfer' ? 'awaiting_payment' : 'pending',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation failed:', orderError)
        return NextResponse.json(
          { error: '주문 생성에 실패했습니다', details: orderError.message },
          { status: 500 }
        )
      }

      // 4b. 주문 상품 생성 (order_items 테이블)
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        analysis_id: item.analysisId || null,
        product_type: item.productType,
        perfume_name: item.perfumeName,
        perfume_brand: item.perfumeBrand || '',
        twitter_name: item.twitterName || item.perfumeBrand || '',
        size: item.size,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
        image_url: item.imageUrl || null,
        analysis_data: item.analysisData || null,
        created_at: now,
      }))

      const { error: itemsError } = await serviceClient
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) {
        console.error('Order items creation failed:', itemsError)
        // 주문 아이템 생성 실패 시 주문도 삭제
        await serviceClient.from('orders').delete().eq('id', order.id)
        return NextResponse.json(
          { error: '주문 상품 저장에 실패했습니다', details: itemsError.message },
          { status: 500 }
        )
      }

      // 5. 쿠폰 사용 처리 (prospective 쿠폰은 실제 user_coupon이 없으므로 skip)
      if (userCouponId && !isProspectiveCoupon) {
        const { error: couponUpdateError } = await serviceClient
          .from('user_coupons')
          .update({
            is_used: true,
            used_at: now,
            used_order_id: order.id,
          })
          .eq('id', userCouponId)

        if (couponUpdateError) {
          console.error('Coupon update failed:', couponUpdateError)
        }
      }

      // 스탬프 추가 (카드/카카오/네이버페이 결제 시 바로 스탬프 추가, 무통장입금은 관리자 확인 후)
      if (paymentMethod && paymentMethod !== 'bank_transfer') {
        await addStampsForUser(serviceClient, userId, itemCount, order.id, 'online_order')
      }

      // 관리자 이메일 알림 발송 - 무통장입금만 주문 생성 시 발송 (카드결제는 결제 완료 후 발송)
      if (paymentMethod === 'bank_transfer') {
        notifyNewOrder({
          orderNumber: order.order_number,
          recipientName,
          perfumeName: firstItem.perfumeName,
          finalPrice: finalPrice || totalPrice || calculatedSubtotal,
          productType: firstItem.productType || 'image_analysis',
          itemCount: orderItems.length,
        })
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        itemCount,
        discountApplied: (discountAmount || 0) > 0,
      })
    }

    // ===== 단일 상품 주문 (기존 호환) =====

    // 서버사이드 가격 검증
    const resolvedProductType: ProductType = productType || 'image_analysis'
    const priceCheck = validatePrice(resolvedProductType, size, price)
    if (!priceCheck.valid) {
      console.error('[Orders API] Price mismatch - client:', price, 'expected:', priceCheck.expectedPrice, 'productType:', resolvedProductType, 'size:', size)
      return NextResponse.json(
        { error: '상품 가격이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    // 배송비 검증 (프로모션 반영) - 단가×수량 기준으로 배송비 계산
    const singleSubtotalForShipping = price * (body.quantity || 1)
    const expectedShippingFee = await calculateServerShippingFeeWithPromotion(
      singleSubtotalForShipping, resolvedProductType, promotionId || null, serviceClient
    )
    const clientShippingFee = shippingFee || 0
    if (clientShippingFee !== expectedShippingFee) {
      console.error('[Orders API] Shipping fee mismatch - client:', clientShippingFee, 'expected:', expectedShippingFee)
      return NextResponse.json(
        { error: '배송비가 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    // Validate coupon discount server-side (single-item)
    let validatedSingleDiscount = 0
    let isSingleProspective = false
    const singleItemCount = body.quantity || 1
    const singleSubtotal = price * singleItemCount // 단가 × 수량 = 총 상품금액
    if (userCouponId) {
      if (typeof userCouponId === 'string' && userCouponId.startsWith('prospective_')) {
        isSingleProspective = true
        const validation = await validateProspectiveStampCoupon(
          userId, userCouponId, singleItemCount, serviceClient
        )
        if (!validation.valid) {
          return NextResponse.json({ error: '스탬프 즉시 할인 조건을 충족하지 않습니다' }, { status: 400 })
        }
        if (validation.rewardType === 'stamp_free') {
          // stamp_free: 단가 1개분 무료
          validatedSingleDiscount = price
        } else {
          // 총 상품금액(단가×수량)에 할인율 적용
          validatedSingleDiscount = Math.floor(singleSubtotal * (validation.discountPercent / 100))
        }
      } else {
        const { data: userCouponData } = await serviceClient
          .from('user_coupons')
          .select('id, user_id, is_used, coupon:coupons(type, discount_percent)')
          .eq('id', userCouponId)
          .single()

        if (!userCouponData) {
          return NextResponse.json({ error: '유효하지 않은 쿠폰입니다' }, { status: 400 })
        }
        if (userCouponData.user_id !== userId) {
          return NextResponse.json({ error: '본인의 쿠폰만 사용 가능합니다' }, { status: 400 })
        }
        if (userCouponData.is_used) {
          return NextResponse.json({ error: '이미 사용된 쿠폰입니다' }, { status: 400 })
        }

        const coupon = userCouponData.coupon as any
        const couponPercent = coupon?.discount_percent || 0

        if (coupon?.type === 'stamp_free') {
          validatedSingleDiscount = price // 단가 1개분 무료
        } else {
          validatedSingleDiscount = Math.floor(singleSubtotal * (couponPercent / 100))
        }
      }
    }

    // Check client discount matches server-validated discount (allow minor rounding)
    if (Math.abs(validatedSingleDiscount - (discountAmount || 0)) > 1) {
      console.error('[Orders API] Single-item discount mismatch - client:', discountAmount, 'validated:', validatedSingleDiscount, 'price:', price, 'qty:', singleItemCount, 'subtotal:', singleSubtotal)
      return NextResponse.json(
        { error: '할인 금액이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    // 최종 결제금액 검증 (단가×수량 기준)
    const expectedFinalPrice = singleSubtotal + expectedShippingFee - validatedSingleDiscount
    const clientFinalPrice = finalPrice || totalPrice || price
    if (Math.abs(clientFinalPrice - expectedFinalPrice) > 1) {
      console.error('[Orders API] Final price mismatch - client:', clientFinalPrice, 'expected:', expectedFinalPrice)
      return NextResponse.json(
        { error: '결제 금액이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    const { data: order, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        analysis_id: analysisId || null,  // 분석 ID (분석 결과 연결용)
        perfume_name: perfumeName,
        perfume_brand: perfumeBrand,
        size,
        price: singleSubtotal, // 단가×수량 총액
        shipping_fee: shippingFee || 0,
        user_coupon_id: isSingleProspective ? null : (userCouponId || null),
        discount_amount: validatedSingleDiscount || 0,
        original_price: singleSubtotal + (expectedShippingFee || 0),
        final_price: clientFinalPrice,
        subtotal: singleSubtotal,
        recipient_name: recipientName,
        phone,
        zip_code: zipCode,
        address,
        address_detail: addressDetail || '',
        memo: memo || '',
        user_image_url: userImage,
        keywords: keywords || [],
        analysis_data: analysisData || null,
        confirmed_recipe: confirmedRecipe || null,  // 확정된 커스텀 레시피
        product_type: productType || 'image_analysis',  // 상품 타입
        payment_method: paymentMethod || 'bank_transfer',
        status: paymentMethod && paymentMethod !== 'bank_transfer' ? 'awaiting_payment' : 'pending',
        item_count: singleItemCount,
        created_at: now,
        updated_at: now,
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

    // 쿠폰 사용 처리 (prospective 쿠폰은 실제 user_coupon이 없으므로 skip)
    if (userCouponId && !isSingleProspective) {
      const { error: couponUpdateError } = await serviceClient
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: now,
          used_order_id: order.id,
        })
        .eq('id', userCouponId)

      if (couponUpdateError) {
        console.error('Coupon update failed:', couponUpdateError)
      }
    }

    // 스탬프 추가 (카드/카카오/네이버페이 결제 시 바로 스탬프 추가)
    if (paymentMethod && paymentMethod !== 'bank_transfer') {
      await addStampsForUser(serviceClient, userId, singleItemCount, order.id, 'online_order')
    }

    // 관리자 이메일 알림 발송 - 무통장입금만 주문 생성 시 발송 (카드결제는 결제 완료 후 발송)
    if (paymentMethod === 'bank_transfer') {
      notifyNewOrder({
        orderNumber: order.order_number,
        recipientName,
        perfumeName: perfumeName || '',
        finalPrice: finalPrice || totalPrice || price,
        productType: productType || 'image_analysis',
      })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      discountApplied: (discountAmount || 0) > 0,
    })

  } catch (error) {
    console.error('[Orders API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * 사용자 주문 목록 조회 API
 * GET /api/orders
 *
 * Query params:
 * - includeItems=true: order_items 포함
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

    // 2. 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url)
    const includeItems = searchParams.get('includeItems') === 'true'

    // 3. 주문 목록 조회
    const serviceClient = createServiceRoleClient()

    // order_items 포함 여부에 따라 쿼리 변경
    const selectQuery = includeItems
      ? '*, order_items(*)'
      : '*'

    const { data: orders, error } = await serviceClient
      .from('orders')
      .select(selectQuery)
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
