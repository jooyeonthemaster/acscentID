import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isMasterPass } from '@/lib/photobooth/master-pass'
import { PASS_FAILURE_LIMIT, PASS_FAILURE_WINDOW_MS } from '@/lib/photobooth/passes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 이용권 사용 처리 (부스 화면 키패드 전용, 비로그인 공개)
 * POST /api/photobooth/pass  { code: "123456" }
 *
 * 상품 구매 특전 — 직원이 결제 시 발급한 6자리 코드를 부스에서 입력하면 1회 사용 처리.
 * 카운터 발급분은 expires_at(당일 자정)이 지나면 쓸 수 없다.
 *
 * 키패드는 누구나 누를 수 있으므로 번호 맞히기를 막는다 — 최근 1분 동안 틀린 번호가
 * PASS_FAILURE_LIMIT 번 쌓이면 매장 전체 부스가 1분간 입력을 받지 않는다(마스터 번호 포함).
 * 기록은 DB 에 남겨 서버 인스턴스가 여러 개여도 같이 센다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const raw = body && typeof body.code === 'string' ? body.code.replace(/\D/g, '') : ''
    if (raw.length !== 6) {
      return NextResponse.json({ error: '6자리 이용권 번호를 입력해주세요' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { count: recentFailures, error: failureError } = await serviceClient
      .from('photobooth_pass_failures')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - PASS_FAILURE_WINDOW_MS).toISOString())
    // 기록을 못 읽으면 잠그지 않는다 — 손님 흐름을 막는 쪽보다 낫다
    if (failureError) console.error('Photobooth pass failure count failed:', failureError)
    if ((recentFailures ?? 0) >= PASS_FAILURE_LIMIT) {
      return NextResponse.json(
        { error: '번호가 여러 번 틀렸어요. 1분 뒤에 다시 입력해 주세요' },
        { status: 429 }
      )
    }

    // 마스터 번호는 사용 처리 없이 항상 통과 (직원·테스트용)
    if (isMasterPass(raw)) {
      return NextResponse.json({ success: true, master: true })
    }

    // 발급 상태이고 기한이 남은 코드만 사용 처리 (status 조건으로 중복 사용 방지)
    const now = new Date().toISOString()
    const { data, error } = await serviceClient
      .from('photobooth_passes')
      .update({ status: 'used', used_at: now })
      .eq('code', raw)
      .eq('status', 'issued')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .select('id')

    if (error) {
      console.error('Photobooth pass redeem failed:', error)
      return NextResponse.json({ error: '이용권 확인에 실패했습니다' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // 존재하지 않거나 이미 사용/취소된 코드 — 구분해 안내
      const { data: existing } = await serviceClient
        .from('photobooth_passes')
        .select('status, expires_at')
        .eq('code', raw)
        .maybeSingle()

      if (existing?.status === 'issued' && existing.expires_at && Date.parse(existing.expires_at) <= Date.parse(now)) {
        return NextResponse.json(
          { error: '사용 기간이 지난 이용권이에요. 직원에게 문의해주세요' },
          { status: 410 }
        )
      }
      if (existing?.status === 'used') {
        return NextResponse.json({ error: '이미 사용된 이용권이에요' }, { status: 410 })
      }
      if (existing?.status === 'void') {
        return NextResponse.json({ error: '취소된 이용권이에요. 직원에게 문의해주세요' }, { status: 410 })
      }
      if (!existing) {
        // 없는 번호만 '틀린 입력'으로 센다. 하루 지난 기록은 같이 정리한다
        await serviceClient.from('photobooth_pass_failures').insert({})
        await serviceClient
          .from('photobooth_pass_failures')
          .delete()
          .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
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
