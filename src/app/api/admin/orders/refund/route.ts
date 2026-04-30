import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import {
  cancelPortOnePayment,
  getPortOnePayment,
} from '@/lib/portone/verify'
import { notifyCustomerRefundCompleted } from '@/lib/email/customer-notify'

// 관리자 이메일 목록 (환경변수 또는 하드코딩)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

// 관리자 인증 확인
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

// refund_logs insert 헬퍼 — 테이블 미적용 환경도 안전하게 무시
async function writeRefundLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  entry: {
    order_id: string
    admin_email: string
    trigger_type: 'admin_manual' | 'admin_bank_manual' | 'webhook' | 'system'
    payment_id: string | null
    payment_method: string | null
    pg_provider: string | null
    amount: number
    reason: string | null
    cancellation_id: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portone_response: any
    status: 'requested' | 'succeeded' | 'failed'
    error_message: string | null
  }
): Promise<string | null> {
  try {
    const { data, error } = await serviceClient
      .from('refund_logs')
      .insert({
        ...entry,
        completed_at:
          entry.status === 'succeeded' || entry.status === 'failed'
            ? new Date().toISOString()
            : null,
      })
      .select('id')
      .single()
    if (error) {
      console.warn('[Admin Refund] refund_logs insert skipped:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.warn('[Admin Refund] refund_logs table unavailable:', err)
    return null
  }
}

async function updateRefundLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  logId: string,
  patch: Partial<{
    status: 'requested' | 'succeeded' | 'failed'
    cancellation_id: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portone_response: any
    error_message: string | null
  }>
) {
  if (!logId) return
  try {
    await serviceClient
      .from('refund_logs')
      .update({
        ...patch,
        completed_at:
          patch.status === 'succeeded' || patch.status === 'failed'
            ? new Date().toISOString()
            : undefined,
      })
      .eq('id', logId)
  } catch (err) {
    console.warn('[Admin Refund] refund_logs update skipped:', err)
  }
}

/**
 * 관리자 - 주문 환불 처리
 * POST /api/admin/orders/refund
 *
 * 포트원 V2 결제 취소(환불)를 실행하고 주문 상태를 업데이트합니다.
 * 부분 환불도 지원합니다 (amount 파라미터).
 *
 * 보강된 방어:
 *  - 관리자 인증
 *  - 상태 검증 (paid / cancel_requested / cancelled+미환불 주문만 허용)
 *  - 금액 검증 (0 < amount <= final_price)
 *  - 이미 환불된 주문 거부 (refunded_at 존재)
 *  - 동시성: 포트원 호출 전 refund_logs에 requested 기록
 *  - DB 업데이트 실패 시에도 포트원 응답을 감사 로그에 남겨 추적 가능
 *  - 환불 완료 시 고객에게 이메일 발송
 */
export async function POST(request: NextRequest) {
  console.log('[Admin Refund] POST request received')

  try {
    // 1. 관리자 인증
    const { isAdmin: isUserAdmin, email: adminEmail } = await isAdmin()
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    // 2. 요청 파싱 및 기본 검증
    const body = await request.json()
    const { orderId, reason: rawReason, amount } = body
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

    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: '환불 금액은 양의 정수여야 합니다' },
          { status: 400 }
        )
      }
    }

    const serviceClient = createServiceRoleClient()

    // 3. 주문 조회
    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      console.error('[Admin Refund] Order not found:', fetchError)
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 4. 결제 ID 확인 (계좌이체는 별도 엔드포인트 사용)
    if (!order.payment_id) {
      return NextResponse.json(
        {
          error:
            '결제 정보가 없는 주문입니다. 계좌이체(무통장입금)는 수동 환불 경로를 사용하세요.',
        },
        { status: 400 }
      )
    }

    // 5. 이미 환불된 주문 거부 (refunded_at 단일 기준 — OR 조건으로 강화)
    if (order.refunded_at) {
      return NextResponse.json(
        { error: '이미 환불 처리된 주문입니다' },
        { status: 400 }
      )
    }

    // 6. 환불 가능 상태 검증
    // paid, preparing, cancel_requested — 정상 환불 경로
    // cancelled + refunded_at null — "DB만 cancelled로 바뀐 과거 오염" 복구 경로
    const refundableStatuses = ['paid', 'preparing', 'cancel_requested', 'cancelled']
    if (!refundableStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: `현재 주문 상태(${order.status})에서는 환불할 수 없습니다. 결제 완료·취소 요청 상태에서만 가능합니다.`,
        },
        { status: 400 }
      )
    }

    const refundAmount =
      typeof amount === 'number' ? Math.floor(amount) : order.final_price

    if (refundAmount <= 0 || refundAmount > order.final_price) {
      return NextResponse.json(
        {
          error: `환불 금액은 0 초과 ${order.final_price.toLocaleString()}원 이하여야 합니다`,
        },
        { status: 400 }
      )
    }

    // 7. 포트원 실제 상태 사전 조회 — idempotency
    //    포트원에 이미 취소 기록이 있으면 DB 동기화만 진행 (중복 환불 방지)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let portoneBefore: any = null
    try {
      portoneBefore = await getPortOnePayment(order.payment_id)
    } catch (e) {
      console.warn('[Admin Refund] PortOne pre-check failed:', e)
    }

    const portoneAlreadyCancelled =
      portoneBefore &&
      (portoneBefore.status === 'CANCELLED' ||
        portoneBefore.status === 'PARTIAL_CANCELLED')

    console.log('[Admin Refund] Processing refund:', {
      orderId,
      reason,
      refundAmount,
      adminEmail,
      portoneStatus: portoneBefore?.status,
      portoneAlreadyCancelled,
    })

    // 8. refund_logs: requested 단계 기록
    const logId = await writeRefundLog(serviceClient, {
      order_id: orderId,
      admin_email: adminEmail || 'unknown',
      trigger_type: 'admin_manual',
      payment_id: order.payment_id,
      payment_method: order.payment_method,
      pg_provider: order.pg_provider,
      amount: refundAmount,
      reason,
      cancellation_id: null,
      portone_response: portoneBefore ?? null,
      status: 'requested',
      error_message: null,
    })

    // 9. 포트원 취소 실행 (이미 취소됐으면 스킵)
    let cancelResult: {
      cancellationId: string
      cancelledAt: string
    } | null = null
    let cancelledAtISO = new Date().toISOString()

    if (portoneAlreadyCancelled) {
      console.log(
        '[Admin Refund] PortOne already cancelled — skipping API call, syncing DB only'
      )
      cancelledAtISO =
        portoneBefore?.cancellations?.[0]?.cancelledAt || cancelledAtISO
    } else {
      try {
        cancelResult = await cancelPortOnePayment(
          order.payment_id,
          reason,
          typeof amount === 'number' ? amount : undefined
        )
        cancelledAtISO = cancelResult.cancelledAt || cancelledAtISO
        console.log('[Admin Refund] PortOne cancel result:', cancelResult)
      } catch (cancelError) {
        console.error('[Admin Refund] PortOne cancel failed:', cancelError)
        await updateRefundLog(serviceClient, logId ?? '', {
          status: 'failed',
          error_message:
            cancelError instanceof Error
              ? cancelError.message
              : String(cancelError),
        })
        return NextResponse.json(
          {
            error: '결제 취소에 실패했습니다',
            details:
              cancelError instanceof Error
                ? cancelError.message
                : String(cancelError),
          },
          { status: 502 }
        )
      }
    }

    // 10. 주문 상태 업데이트
    const now = new Date().toISOString()
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'cancelled',
        refund_amount: refundAmount,
        refunded_at: cancelledAtISO,
        refund_reason: reason,
        cancellation_id: cancelResult?.cancellationId ?? null,
        refunded_by: adminEmail || 'admin',
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error(
        '[Admin Refund] Order update failed (PortOne already cancelled):',
        updateError
      )
      // 감사 로그에만 실패 기록 — 포트원 환불은 이미 완료
      await updateRefundLog(serviceClient, logId ?? '', {
        status: 'failed',
        cancellation_id: cancelResult?.cancellationId ?? null,
        portone_response: cancelResult ?? portoneBefore,
        error_message:
          'DB 업데이트 실패 (포트원 취소는 성공). 수동 동기화 필요.',
      })
      return NextResponse.json(
        {
          error:
            '결제 취소는 완료됐지만 주문 상태 업데이트에 실패했습니다. 관리자에게 DB 동기화를 요청하세요.',
          cancellation_id: cancelResult?.cancellationId ?? null,
        },
        { status: 500 }
      )
    }

    // 11. refund_logs: succeeded 기록
    await updateRefundLog(serviceClient, logId ?? '', {
      status: 'succeeded',
      cancellation_id: cancelResult?.cancellationId ?? null,
      portone_response: cancelResult ?? portoneBefore,
    })

    console.log(
      `[Admin Refund] Refund completed: ${orderId} (${refundAmount}원)`
    )

    // 12. 고객에게 환불 완료 이메일 (fire-and-forget)
    //     고객 이메일은 orders 행에 저장되어 있지 않을 수 있어 users 테이블 경유 조회 시도
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
        paymentMethod: order.payment_method || 'card',
        reason,
        refundedAt: cancelledAtISO,
      })
    } catch (notifyErr) {
      console.warn('[Admin Refund] customer notify skipped:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund: {
        cancellationId: cancelResult?.cancellationId ?? null,
        cancelledAt: cancelledAtISO,
        amount: refundAmount,
        synced_from_portone: portoneAlreadyCancelled,
      },
    })
  } catch (error) {
    console.error('[Admin Refund] Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
