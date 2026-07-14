import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  isPaymentLinkPayable,
  mapPaymentLinkRow,
  toPublicPaymentLink,
  type PaymentLinkRow,
} from '@/lib/payment-links/payment-links'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * 공개 개인결제창 조회 API
 * GET /api/payment-links/[token]
 *
 * 링크(token)를 아는 사람만 접근한다. 활성 + 미만료 링크의 공개 필드만 반환.
 * service_role 로 token 단건 조회하므로 RLS 공개 정책은 두지 않는다.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_payment_links')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[payment-links GET] DB error:', error)
    return NextResponse.json({ error: '결제창을 불러오지 못했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '존재하지 않는 결제창입니다' }, { status: 404 })
  }

  const link = mapPaymentLinkRow(data as PaymentLinkRow)
  if (!isPaymentLinkPayable(link)) {
    return NextResponse.json(
      { error: '현재 결제할 수 없는 링크입니다 (마감되었거나 비활성 상태)', unavailable: true },
      { status: 410 },
    )
  }

  return NextResponse.json({ link: toPublicPaymentLink(link) })
}
