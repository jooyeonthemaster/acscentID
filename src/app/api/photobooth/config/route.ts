import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { resolveCurrentEvent } from '@/lib/photobooth/current-event'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 부스 화면용 설정 조회 — 진행 중 생카 이벤트 + 활성 소재(프레임/템플릿)
 * 소재는 현재 이벤트 귀속분 + 상시(event_id NULL)만 노출 (종료된 생카 소재 자동 미노출)
 * GET /api/photobooth/config
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient()
    const event = await resolveCurrentEvent(serviceClient)

    let query = serviceClient
      .from('photobooth_assets')
      .select('id, kind, title, image_url, display_order, event_id')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    query = event
      ? query.or(`event_id.is.null,event_id.eq.${event.id}`)
      : query.is('event_id', null)

    const { data, error } = await query

    if (error) {
      console.error('Photobooth config fetch failed:', error)
      return NextResponse.json({ error: '소재를 불러오지 못했습니다' }, { status: 500 })
    }

    // 이벤트 귀속 소재를 상시 소재보다 앞에 배치 (생카 프레임이 첫 선택지)
    const assets = (data ?? []).sort((a, b) => {
      const aEvent = a.event_id ? 0 : 1
      const bEvent = b.event_id ? 0 : 1
      if (aEvent !== bEvent) return aEvent - bEvent
      return a.display_order - b.display_order
    })

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Photobooth config error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
