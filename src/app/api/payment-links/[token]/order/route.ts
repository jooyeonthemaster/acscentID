import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { notifyNewOrder } from '@/lib/email/admin-notify'
import {
  isStoreProductConstraintError,
  withStoreProductCompatAnalysisData,
} from '@/lib/products/store-products'
import {
  PAYMENT_LINK_ORDER_PRODUCT_TYPE,
  PAYMENT_LINK_ORDER_DB_COMPAT_TYPE,
  PAYMENT_LINK_ORDER_SIZE,
  buildPaymentLinkAnalysisData,
  isPaymentLinkPayable,
  mapPaymentLinkRow,
  type PaymentLinkRow,
} from '@/lib/payment-links/payment-links'

interface RouteParams {
  params: Promise<{ token: string }>
}

const ALLOWED_PAYMENT_METHODS = new Set(['card', 'kakao_pay', 'naver_pay', 'bank_transfer'])

function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${year}${month}${day}-${random}`
}

async function resolveUserId(): Promise<string | null> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.id) return kakaoSession.user.id
  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * 개인결제창 주문 생성 API
 * POST /api/payment-links/[token]/order
 *
 * 배송지 없이 결제 금액만 받는 주문을 생성한다. 결제 자체는 이후 기존
 * /api/payments/prepare → PortOne → /api/payments/verify(또는 webhook) 흐름을 그대로 탄다.
 * 금액은 서버가 링크(token)의 amount 를 신뢰하며 클라이언트 값은 사용하지 않는다.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    // 비회원 결제도 게스트 세션(user_id)이 있어야 결제 준비/검증 소유권 검사를 통과한다.
    const userId = await resolveUserId()
    if (!userId) {
      return NextResponse.json({ error: '결제 세션이 없습니다. 페이지를 새로고침 후 다시 시도해주세요' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const buyerName = typeof body.buyerName === 'string' ? body.buyerName.trim() : ''
    const buyerPhone = typeof body.buyerPhone === 'string' ? body.buyerPhone.trim() : ''
    const buyerEmail = typeof body.buyerEmail === 'string' ? body.buyerEmail.trim() : ''
    const memo = typeof body.memo === 'string' ? body.memo.trim() : ''
    const paymentMethod = typeof body.paymentMethod === 'string' && ALLOWED_PAYMENT_METHODS.has(body.paymentMethod)
      ? body.paymentMethod
      : 'card'

    if (!buyerName || !buyerPhone) {
      return NextResponse.json({ error: '결제자 이름과 연락처를 입력해주세요' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // 링크 조회 및 결제 가능 여부 검증 (금액은 서버가 신뢰)
    const { data: linkRow, error: linkError } = await serviceClient
      .from('admin_payment_links')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      console.error('[payment-links order] link lookup failed:', linkError)
      return NextResponse.json({ error: '결제창을 불러오지 못했습니다' }, { status: 500 })
    }
    if (!linkRow) {
      return NextResponse.json({ error: '존재하지 않는 결제창입니다' }, { status: 404 })
    }

    const link = mapPaymentLinkRow(linkRow as PaymentLinkRow)
    if (!isPaymentLinkPayable(link)) {
      return NextResponse.json({ error: '현재 결제할 수 없는 링크입니다' }, { status: 410 })
    }

    const amount = link.amount
    const now = new Date().toISOString()
    const orderNumber = generateOrderNumber()
    const isZeroAmountOrder = amount <= 0
    const effectivePaymentMethod = paymentMethod

    const orderPayload = {
      order_number: orderNumber,
      user_id: userId,
      perfume_name: link.title,
      perfume_brand: '개인결제',
      size: PAYMENT_LINK_ORDER_SIZE,
      price: amount,
      subtotal: amount,
      item_count: 1,
      shipping_fee: 0,
      discount_amount: 0,
      original_price: amount,
      final_price: amount,
      // 배송 없음 — NOT NULL 컬럼 방어를 위해 최소 값 채움
      recipient_name: buyerName,
      phone: buyerPhone,
      zip_code: '',
      address: '개인결제 (배송 없음)',
      address_detail: '',
      memo,
      user_image_url: link.imageUrl || null,
      keywords: [] as string[],
      analysis_data: buildPaymentLinkAnalysisData(link),
      product_type: PAYMENT_LINK_ORDER_PRODUCT_TYPE,
      payment_method: effectivePaymentMethod,
      status: isZeroAmountOrder
        ? 'paid'
        : effectivePaymentMethod !== 'bank_transfer'
          ? 'awaiting_payment'
          : 'pending',
      ...(isZeroAmountOrder ? { paid_at: now } : {}),
      created_at: now,
      updated_at: now,
    }

    let { data: order, error: insertError } = await serviceClient
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    // store_product 타입을 DB가 거부하면 today_scent 호환 페이로드로 재시도
    if (insertError && isStoreProductConstraintError(insertError)) {
      const retry = await serviceClient
        .from('orders')
        .insert({
          ...orderPayload,
          product_type: PAYMENT_LINK_ORDER_DB_COMPAT_TYPE,
          analysis_data: withStoreProductCompatAnalysisData(orderPayload.analysis_data),
        })
        .select()
        .single()
      order = retry.data
      insertError = retry.error
    }

    if (insertError || !order) {
      console.error('[payment-links order] order creation failed:', insertError)
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다', details: insertError?.message },
        { status: 500 },
      )
    }

    // 무통장입금 또는 0원 결제는 즉시 관리자 알림 (온라인 결제는 결제 완료 웹훅에서 발송)
    if (effectivePaymentMethod === 'bank_transfer' || isZeroAmountOrder) {
      notifyNewOrder({
        orderNumber: order.order_number,
        recipientName: buyerName,
        perfumeName: link.title,
        finalPrice: amount,
        productType: PAYMENT_LINK_ORDER_PRODUCT_TYPE,
        itemCount: 1,
        paymentMethod: effectivePaymentMethod,
        status: isZeroAmountOrder ? 'paid' : 'awaiting_payment',
        orderId: order.id,
      })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      amount,
      buyerEmail,
    })
  } catch (error) {
    console.error('[payment-links order] unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
