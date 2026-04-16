import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { notifyCustomerRefundCompleted } from '@/lib/email/customer-notify'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email,
    }
  }
  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email,
    }
  }
  return { isAdmin: false, email: null }
}

/**
 * 관리자 - 계좌이체(무통장) 주문 수동 환불 기록
 * POST /api/admin/orders/refund/manual
 *
 * 계좌이체 주문은 PG 연동이 없어 관리자가 직접 고객 계좌로 송금 후 이 엔드포인트로
 * 환불 완료를 기록한다. refund_logs에 trigger_type='admin_bank_manual'로 남김.
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin: isUserAdmin, email: adminEmail } = await isAdmin()
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId, reason: rawReason, amount, transferredAt } = body
    const reason = typeof rawReason === 'string' ? rawReason.trim() : ''

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'orderId와 reason이 필요합니다' },
        { status: 400 }
      )
    }
    if (reason.length < 2) {
      return NextResponse.json(
        { error: '환불 사유는 2자 이상 입력해 주세요' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 이 엔드포인트는 계좌이체 전용
    if (order.payment_method !== 'bank_transfer') {
      return NextResponse.json(
        {
          error:
            '계좌이체 주문이 아닙니다. 카드/간편결제 환불은 POST /api/admin/orders/refund 를 사용하세요.',
        },
        { status: 400 }
      )
    }

    if (order.refunded_at) {
      return NextResponse.json(
        { error: '이미 환불 기록된 주문입니다' },
        { status: 400 }
      )
    }

    const refundAmount =
      typeof amount === 'number' && Number.isFinite(amount) && amount > 0
        ? Math.floor(amount)
        : order.final_price

    if (refundAmount <= 0 || refundAmount > order.final_price) {
      return NextResponse.json(
        {
          error: `환불 금액은 0 초과 ${order.final_price.toLocaleString()}원 이하여야 합니다`,
        },
        { status: 400 }
      )
    }

    const refundedAt =
      typeof transferredAt === 'string' && transferredAt
        ? new Date(transferredAt).toISOString()
        : new Date().toISOString()
    const now = new Date().toISOString()

    // orders 업데이트
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'cancelled',
        refund_amount: refundAmount,
        refunded_at: refundedAt,
        refund_reason: reason,
        refunded_by: adminEmail || 'admin_bank_manual',
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('[Manual Refund] Order update failed:', updateError)
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    // 감사 로그
    try {
      await serviceClient.from('refund_logs').insert({
        order_id: orderId,
        admin_email: adminEmail || 'unknown',
        trigger_type: 'admin_bank_manual',
        payment_id: order.payment_id ?? null,
        payment_method: order.payment_method,
        pg_provider: null,
        amount: refundAmount,
        reason,
        cancellation_id: null,
        portone_response: null,
        status: 'succeeded',
        error_message: null,
        completed_at: now,
      })
    } catch (logErr) {
      console.warn('[Manual Refund] refund_logs insert skipped:', logErr)
    }

    // 고객 이메일
    try {
      let customerEmail: string | null = null
      if (order.user_id) {
        const { data: profile } = await serviceClient
          .from('users')
          .select('email')
          .eq('id', order.user_id)
          .maybeSingle()
        if (profile?.email) customerEmail = profile.email
      }
      notifyCustomerRefundCompleted({
        customerEmail,
        orderNumber: order.order_number,
        recipientName: order.recipient_name || order.customer_name || '',
        perfumeName: order.perfume_name || '',
        refundAmount,
        paymentMethod: 'bank_transfer',
        reason,
        refundedAt,
      })
    } catch (notifyErr) {
      console.warn('[Manual Refund] customer notify skipped:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund: {
        amount: refundAmount,
        refundedAt,
        trigger_type: 'admin_bank_manual',
      },
    })
  } catch (error) {
    console.error('[Manual Refund] unexpected:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
