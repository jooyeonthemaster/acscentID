import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mergeFrameCatalog } from '@/lib/photobooth/frame-catalog'
import { patchBoothAsset } from '@/lib/photobooth/asset-admin'
import { screenEventScope } from '@/lib/photobooth/event-scope'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 포토부스 기기 관리자 — 프레임 목록(꺼진 것 포함)과 행사 선택지. 등록·삭제·순서는 관리자 웹에서만 */
export async function GET(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    // '*' — screen_event_id 칸이 생기기 전(마이그레이션 전)에도 읽기가 깨지지 않게
    const { data, error } = await createServiceRoleClient().from('photobooth_assets').select('*').eq('kind', 'frame')
    if (error) throw new BackgroundError('프레임 목록을 불러오지 못했습니다.', 503)
    const frames = mergeFrameCatalog(data ?? [])
      .filter(frame => frame.kind === 'frame')
      .sort((a, b) => a.display_order - b.display_order)
      .map(({ id, title, image_url, thumbnail_url, is_active, category, screen_event_id }) => ({
        id, title, thumbnail_url: thumbnail_url || image_url, is_active, category: category ?? '직접 등록', screen_event_id: screen_event_id ?? null,
      }))
    return NextResponse.json({ frames, screen_events: (await screenEventScope()).options }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '프레임 목록을 불러오지 못했습니다.') }
}

/** 프레임 켜기·끄기, 행사 연결 { id, is_active?, screen_event_id? } — 부스에는 1초 안에 반영된다 */
export async function PATCH(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const body = await deviceBody(request)
    if (typeof body.id !== 'string' || (!Object.hasOwn(body, 'is_active') && !Object.hasOwn(body, 'screen_event_id'))) {
      throw new BackgroundError('잘못된 요청입니다.')
    }
    const patch: Record<string, unknown> = {}
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
    if (Object.hasOwn(body, 'screen_event_id')) patch.screen_event_id = body.screen_event_id
    const result = await patchBoothAsset(createServiceRoleClient(), body.id, patch)
    if (result.error) throw new BackgroundError(result.error, result.status ?? 503)
    return NextResponse.json({ success: true }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '저장하지 못했습니다.') }
}
