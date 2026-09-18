import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 키오스크 배경 목록 (매장 기기 전용, 비로그인)
 * GET /api/kiosk/backgrounds → { backgrounds: [{ id, title, image_url, palette }] }
 *
 * 공개 이미지 URL 목록뿐이라 인증을 두지 않는다. 꺼둔 배경은 내려보내지 않는다.
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('kiosk_backgrounds')
      .select('id, title, image_url, palette')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      // 테이블이 아직 없어도 키오스크는 내장 배경으로 정상 동작해야 한다
      console.error('Kiosk backgrounds fetch failed:', error)
      return NextResponse.json({ backgrounds: [] })
    }
    return NextResponse.json({ backgrounds: data ?? [] })
  } catch (error) {
    console.error('Kiosk backgrounds GET error:', error)
    return NextResponse.json({ backgrounds: [] })
  }
}
