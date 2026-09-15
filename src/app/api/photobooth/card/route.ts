import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isCardCode } from '@/lib/photobooth/card-code'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 카드 코드 해석 (부스 스캔 전용, 비로그인 공개)
 * GET /api/photobooth/card?code=XXXXX
 *
 * 부스가 카메라로 읽은 코드를 넘기면 합성용 누끼 PNG 주소를 돌려준다.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase() ?? ''
    if (!isCardCode(code)) {
      return NextResponse.json({ error: '카드 번호 형식이 올바르지 않습니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('photobooth_cards')
      .select('code, title, image_url, cutout_url, is_active, event_id, photobooth_events(title, artist, hashtag, theme_color)')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('Photobooth card fetch failed:', error)
      return NextResponse.json({ error: '카드를 확인하지 못했습니다' }, { status: 500 })
    }
    if (!data || !data.is_active) {
      return NextResponse.json({ error: '사용할 수 없는 카드입니다' }, { status: 404 })
    }
    if (!data.cutout_url) {
      return NextResponse.json(
        { error: '아직 준비 중인 카드입니다. 직원에게 문의해주세요' },
        { status: 409 }
      )
    }

    // 사용 통계 (실패해도 부스 흐름을 막지 않는다)
    serviceClient
      .rpc('increment_photobooth_card_scan', { card_code: code })
      .then(({ error: rpcError }) => {
        if (rpcError) console.error('Photobooth card scan count failed:', rpcError)
      })

    return NextResponse.json({
      success: true,
      card: {
        code: data.code,
        title: data.title,
        imageUrl: data.image_url,
        cutoutUrl: data.cutout_url,
        event: data.photobooth_events ?? null,
      },
    })
  } catch (error) {
    console.error('Photobooth card GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
