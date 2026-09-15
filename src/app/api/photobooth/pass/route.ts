import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isMasterPass } from '@/lib/photobooth/master-pass'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 이용권 사용 처리 (부스 화면 키패드 전용, 비로그인 공개)
 * POST /api/photobooth/pass  { code: "123456" }
 *
 * 상품 구매 특전 — 직원이 결제 시 발급한 6자리 코드를 부스에서 입력하면 1회 사용 처리.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const raw = body && typeof body.code === 'string' ? body.code.replace(/\D/g, '') : ''
    if (raw.length !== 6) {
      return NextResponse.json({ error: '6자리 이용권 번호를 입력해주세요' }, { status: 400 })
    }

    // 마스터 번호는 사용 처리 없이 항상 통과 (직원·테스트용)
    if (isMasterPass(raw)) {
      return NextResponse.json({ success: true, master: true })
    }

    const serviceClient = createServiceRoleClient()

    // 발급 상태인 코드만 사용 처리 (status 조건으로 중복 사용 방지)
    const { data, error } = await serviceClient
      .from('photobooth_passes')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('code', raw)
      .eq('status', 'issued')
      .select('id')

    if (error) {
      console.error('Photobooth pass redeem failed:', error)
      return NextResponse.json({ error: '이용권 확인에 실패했습니다' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // 존재하지 않거나 이미 사용/취소된 코드 — 구분해 안내
      const { data: existing } = await serviceClient
        .from('photobooth_passes')
        .select('status')
        .eq('code', raw)
        .maybeSingle()

      if (existing?.status === 'used') {
        return NextResponse.json({ error: '이미 사용된 이용권이에요' }, { status: 410 })
      }
      if (existing?.status === 'void') {
        return NextResponse.json({ error: '취소된 이용권이에요. 직원에게 문의해주세요' }, { status: 410 })
      }
      return NextResponse.json(
        { error: '등록되지 않은 번호예요. 직원에게 문의해주세요' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Photobooth pass POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
