import { createHash } from 'node:crypto'
import { mergeFrameCatalog } from '@/lib/photobooth/frame-catalog'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { resolveCurrentEvent } from '@/lib/photobooth/current-event'
import { inScope, screenEventScope } from '@/lib/photobooth/event-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 부스 화면용 설정 조회 — 진행 중 생카 이벤트 + 활성 소재(프레임/템플릿)
 * 소재는 현재 이벤트 귀속분 + 상시(event_id NULL)만 노출 (종료된 생카 소재 자동 미노출)
 * 화면 이벤트(ERP·노션 행사)에 묶인 소재는 그 행사가 적용 중일 때만, 맨 앞에 (event-scope.ts)
 * GET /api/photobooth/config
 *
 * 부스가 화면이 켜져 있는 동안 1초마다 묻는다(useLiveBoothConfig). 바뀐 게 없으면 본문 없이 304 로 답한다 —
 * 응답이 약 17KB 라 그대로 두면 부스 한 대가 하루 1GB 넘게 받는다. 반영 속도는 그대로다.
 */
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceRoleClient()
    const [event, scope] = await Promise.all([resolveCurrentEvent(serviceClient), screenEventScope()])

    // Include inactive/event-bound overrides before merging; otherwise hidden defaults return.
    // '*' — screen_event_id 칸이 생기기 전(마이그레이션 전)에도 읽기가 깨지지 않게
    const { data, error } = await serviceClient
      .from('photobooth_assets')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Photobooth config fetch failed:', error)
      return NextResponse.json({ error: '소재를 불러오지 못했습니다' }, { status: 500 })
    }

    // 이벤트 귀속 소재를 상시 소재보다 앞에 배치 (생카 프레임이 첫 선택지)
    const assets = mergeFrameCatalog(data ?? [])
      .filter(a => a.is_active && (!a.event_id || a.event_id === event?.id) && inScope(a.screen_event_id, scope))
      .sort((a, b) => {
      const aEvent = a.event_id || a.screen_event_id ? 0 : 1
      const bEvent = b.event_id || b.screen_event_id ? 0 : 1
      if (aEvent !== bEvent) return aEvent - bEvent
      return a.display_order - b.display_order
    })
      // 부스에 필요한 칸만 — select('*') 의 생성·수정 시각 같은 내부 칸은 내보내지 않는다
      .map(({ id, kind, title, image_url, display_order, event_id, is_active, category, thumbnail_url, screen_event_id }) => ({
        id, kind, title, image_url, display_order, event_id, is_active,
        ...(category ? { category } : {}), ...(thumbnail_url ? { thumbnail_url } : {}),
        ...(screen_event_id ? { screen_event_id } : {}),
      }))

    const body = {
      event: event
        ? {
            id: event.id,
            title: event.title,
            artist: event.artist,
            organizer: event.organizer,
            hashtag: event.hashtag,
            greeting: event.greeting,
            theme_color: event.theme_color,
            cover_image_url: event.cover_image_url,
            starts_on: event.starts_on,
            ends_on: event.ends_on,
          }
        : null,
      frames: assets.filter((a) => a.kind === 'frame'),
      templates: assets.filter((a) => a.kind === 'template'),
    }
    const etag = `W/"${createHash('sha1').update(JSON.stringify(body)).digest('base64url').slice(0, 22)}"`
    // no-cache = 저장은 하되 매번 서버에 확인 — 브라우저가 If-None-Match 를 붙여 온다
    const headers = { 'Cache-Control': 'no-cache', ETag: etag }
    if (request?.headers?.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers })
    }
    return NextResponse.json(body, { headers })
  } catch (error) {
    console.error('Photobooth config error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
