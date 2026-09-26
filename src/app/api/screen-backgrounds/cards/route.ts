import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 포토부스 기기 관리자 — 포토카드 목록(QR 확인용). 등록·삭제는 관리자 웹에서만 */
export async function GET(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const { data, error } = await createServiceRoleClient()
      .from('photobooth_cards')
      .select('id, code, title, image_url, cutout_url, is_active, source_credit, created_at, photobooth_events(title)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw new BackgroundError('포토카드 목록을 불러오지 못했습니다.', 503)
    return NextResponse.json({ cards: data ?? [] }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '포토카드 목록을 불러오지 못했습니다.') }
}

/** 카드 켜기·끄기 — 끈 카드의 QR 은 부스에서 인식하지 않는다 */
export async function PATCH(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const body = await deviceBody(request)
    if (typeof body.id !== 'string' || typeof body.is_active !== 'boolean') throw new BackgroundError('잘못된 요청입니다.')
    const { error } = await createServiceRoleClient().from('photobooth_cards')
      .update({ is_active: body.is_active, updated_at: new Date().toISOString() }).eq('id', body.id)
    if (error) throw new BackgroundError('저장하지 못했습니다.', 503)
    return NextResponse.json({ success: true }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '저장하지 못했습니다.') }
}
