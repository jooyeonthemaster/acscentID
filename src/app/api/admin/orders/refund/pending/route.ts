import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

async function isAdmin(): Promise<boolean> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase())
  }
  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
}

/**
 * 환불 처리 대기 집계
 * GET /api/admin/orders/refund/pending
 *
 * 관리자 대시보드/주문 페이지 상단에 뜨는 "환불 처리 대기: N건" 배너용.
 * 세 가지 위험 그룹을 각각 집계해 반환한다:
 *   - requested: 고객이 취소 요청했지만 아직 환불 미처리 (cancel_requested + refunded_at null)
 *   - orphan: 관리자가 실수로 cancelled까지 바꿨지만 실제 환불은 안 된 케이스
 *               (status = cancelled + payment_id 존재 + refunded_at null)
 *   - bankPending: 계좌이체 주문 중 취소 요청됐지만 수동 환불 미처리
 */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const serviceClient = createServiceRoleClient()

    const [
      { count: requested, error: e1 },
      { count: orphan, error: e2 },
      { count: bankPending, error: e3 },
    ] = await Promise.all([
      serviceClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancel_requested')
        .not('payment_id', 'is', null)
        .is('refunded_at', null),
      serviceClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .not('payment_id', 'is', null)
        .is('refunded_at', null),
      serviceClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancel_requested')
        .eq('payment_method', 'bank_transfer')
        .is('refunded_at', null),
    ])

    if (e1 || e2 || e3) {
      console.error('[Refund Pending] count error:', e1, e2, e3)
    }

    return NextResponse.json({
      success: true,
      counts: {
        requested: requested ?? 0,
        orphan: orphan ?? 0,
        bankPending: bankPending ?? 0,
        total: (requested ?? 0) + (orphan ?? 0) + (bankPending ?? 0),
      },
    })
  } catch (error) {
    console.error('[Refund Pending] unexpected:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
