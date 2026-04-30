/**
 * 관리자 운송장 등록/해제 API
 *  PATCH /api/admin/orders/[id]/tracking
 *
 * Body:
 *  {
 *    tracking_number: string | null,   // null/빈값이면 운송장 해제
 *    tracking_carrier?: 'cj',          // 기본 'cj'
 *    auto_set_shipping?: boolean,      // true(default)면 status도 'shipping'으로 자동 전환 + shipped_at 기록
 *    notify_customer?: boolean,        // true(default)면 고객에게 발송 알림 이메일
 *  }
 *
 * 응답: { success, order, emailSent, statusChanged }
 *
 * 정책:
 *  - 운송장 번호 형식 검증 실패 시 400 (외부 사이트 안전성 보장)
 *  - 운송장 등록 = 발송 완료 신호 → 표준은 자동 shipping 전환 + 고객 알림
 *  - 등록자가 OFF 토글로 끄면 status는 그대로, 이메일도 미발송
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import {
  isValidTrackingNumber,
  normalizeTrackingNumber,
  getTrackingUrl,
  type CarrierId,
} from '@/lib/shipping/cj'
import { notifyCustomerShipped } from '@/lib/email/customer-notify'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email,
    }
  }
  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email,
    }
  }
  return { isAdmin: false, email: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin: isUserAdmin } = await isAdmin()
    if (!isUserAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { id: orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const rawTracking = (body?.tracking_number ?? null) as string | null
    const carrier = (body?.tracking_carrier ?? 'cj') as CarrierId
    const autoSetShipping = body?.auto_set_shipping !== false  // default true
    const notifyCustomer = body?.notify_customer !== false      // default true

    if (carrier !== 'cj') {
      return NextResponse.json(
        { error: '지원하지 않는 택배사입니다 (현재 CJ대한통운만 지원)' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 기존 주문 조회
    const { data: existingOrder, error: fetchErr } = await serviceClient
      .from('orders')
      .select('id, status, user_id, order_number, recipient_name, perfume_name')
      .eq('id', orderId)
      .single()
    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    // 운송장 해제 케이스
    if (!rawTracking || String(rawTracking).trim() === '') {
      const { data: updated, error: updErr } = await serviceClient
        .from('orders')
        .update({
          tracking_number: null,
          shipped_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single()
      if (updErr) {
        console.error('[Admin Tracking] clear failed:', updErr)
        return NextResponse.json({ error: '운송장 해제에 실패했습니다' }, { status: 500 })
      }
      return NextResponse.json({
        success: true,
        order: updated,
        emailSent: false,
        statusChanged: false,
      })
    }

    // 운송장 등록 케이스 — 정규화 + 검증
    const normalized = normalizeTrackingNumber(rawTracking)
    if (!isValidTrackingNumber(normalized, carrier)) {
      return NextResponse.json(
        { error: '운송장 번호 형식이 올바르지 않습니다 (CJ대한통운: 숫자 10~12자리)' },
        { status: 400 }
      )
    }

    const trackingUrl = getTrackingUrl(normalized, carrier)
    if (!trackingUrl) {
      // 이론상 도달 불가 (위에서 isValid 통과했음) — 안전망
      return NextResponse.json({ error: '운송장 URL 생성에 실패했습니다' }, { status: 400 })
    }

    const nowISO = new Date().toISOString()

    // 자동 shipping 전환 여부에 따라 update payload 구성
    const updatePayload: Record<string, unknown> = {
      tracking_number: normalized,
      tracking_carrier: carrier,
      shipped_at: nowISO,
      updated_at: nowISO,
    }

    let statusChanged = false
    if (autoSetShipping) {
      // 이미 더 진행된 상태(delivered)는 그대로 둠 — 회귀 방지
      // 취소된 주문은 운송장 등록 자체가 비정상이지만 화면에서 막음. API는 명시적 거부.
      if (existingOrder.status === 'cancelled' || existingOrder.status === 'cancel_requested') {
        return NextResponse.json(
          { error: '취소(요청)된 주문에는 운송장을 등록할 수 없습니다' },
          { status: 409 }
        )
      }
      if (existingOrder.status !== 'shipping' && existingOrder.status !== 'delivered') {
        updatePayload.status = 'shipping'
        statusChanged = true
      }
    }

    const { data: updated, error: updErr } = await serviceClient
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single()
    if (updErr) {
      console.error('[Admin Tracking] save failed:', updErr)
      return NextResponse.json({ error: '운송장 저장에 실패했습니다' }, { status: 500 })
    }

    // 고객 이메일 발송 (fire-and-forget)
    let emailSent = false
    if (notifyCustomer) {
      try {
        let customerEmail: string | null = null
        if (existingOrder.user_id) {
          const { data: profile } = await serviceClient
            .from('users')
            .select('email')
            .eq('id', existingOrder.user_id)
            .maybeSingle()
          if (profile?.email) customerEmail = profile.email
        }
        notifyCustomerShipped({
          customerEmail,
          orderNumber: existingOrder.order_number,
          recipientName: existingOrder.recipient_name || '',
          perfumeName: existingOrder.perfume_name || '',
          trackingNumber: normalized,
          trackingCarrier: carrier,
          trackingUrl,
          shippedAt: nowISO,
        })
        emailSent = !!customerEmail
      } catch (notifyErr) {
        console.error('[Admin Tracking] notify failed:', notifyErr)
        // 이메일 실패가 운송장 저장을 막지 않음
      }
    }

    return NextResponse.json({
      success: true,
      order: updated,
      emailSent,
      statusChanged,
    })
  } catch (err) {
    console.error('[Admin Tracking] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
