import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { checkScreenEvent } from '@/lib/photobooth/asset-admin'
import { MISSING_EVENT_COLUMN_MESSAGE, missingEventColumn, screenEventScope } from '@/lib/photobooth/event-scope'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 포토부스 기기 관리자 — 포토카드 목록(QR 확인용)과 행사 선택지. 등록·삭제는 관리자 웹에서만 */
export async function GET(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const { data, error } = await createServiceRoleClient()
      .from('photobooth_cards')
      // '*' — screen_event_id 칸이 생기기 전(마이그레이션 전)에도 읽기가 깨지지 않게
      .select('*, photobooth_events(title)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw new BackgroundError('포토카드 목록을 불러오지 못했습니다.', 503)
    const cards = (data ?? []).map(({ id, code, title, image_url, cutout_url, is_active, source_credit, created_at, screen_event_id, photobooth_events }) =>
      ({ id, code, title, image_url, cutout_url, is_active, source_credit, created_at, screen_event_id: screen_event_id ?? null, photobooth_events }))
    return NextResponse.json({ cards, screen_events: (await screenEventScope()).options }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '포토카드 목록을 불러오지 못했습니다.') }
}

/** 카드 켜기·끄기(끈 카드의 QR 은 부스에서 인식하지 않는다), 행사 연결 { id, is_active?, screen_event_id? } */
export async function PATCH(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const body = await deviceBody(request)
    if (typeof body.id !== 'string') throw new BackgroundError('잘못된 요청입니다.')
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.is_active === 'boolean') payload.is_active = body.is_active
    if (Object.hasOwn(body, 'screen_event_id')) {
      const checked = await checkScreenEvent(body.screen_event_id)
      if ('error' in checked) throw new BackgroundError(checked.error)
      payload.screen_event_id = checked.id
    }
    if (Object.keys(payload).length === 1) throw new BackgroundError('잘못된 요청입니다.')
    const { error } = await createServiceRoleClient().from('photobooth_cards').update(payload).eq('id', body.id)
    if (missingEventColumn(error)) throw new BackgroundError(MISSING_EVENT_COLUMN_MESSAGE, 409)
    if (error) throw new BackgroundError('저장하지 못했습니다.', 503)
    return NextResponse.json({ success: true }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '저장하지 못했습니다.') }
}
