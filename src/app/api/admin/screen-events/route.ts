import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { SCREEN_FONT_IDS } from '@/lib/screen-fonts/catalog'
import { generatorConfigured } from '@/lib/screen-events/generate'
import { erpConfigured, notionConfigured } from '@/lib/screen-events/sources'
import { readScreenEvents, writeScreenEvent } from '@/lib/screen-events/store'
import { DEVICE_STORE, EVENT_STORES, emptyEvent, isEventDate, kstToday, type EventStore } from '@/lib/screen-events/types'
import { authorize, bodyOf, failure, headers, isOwnPosterUrl } from './shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    return NextResponse.json({
      events: await readScreenEvents(), today: kstToday(), device_store: DEVICE_STORE,
      sources: { erp: erpConfigured(), notion: notionConfigured(), generator: generatorConfigured() },
    }, { headers })
  } catch (error) { return failure(error) }
}

/** 직접 추가 — ERP·노션에 없는 행사 */
export async function POST(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    const body = await bodyOf(request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const store = (EVENT_STORES as readonly string[]).includes(body.store as string) ? body.store as EventStore : DEVICE_STORE
    if (!title || !isEventDate(body.starts_on) || !isEventDate(body.ends_on) || body.starts_on > body.ends_on) throw new BackgroundError('이벤트 이름과 기간을 확인해주세요.')
    let event = emptyEvent({ id: `man-${randomUUID().slice(0, 12)}`, source: 'manual', store, title, starts_on: body.starts_on, ends_on: body.ends_on })
    if (isOwnPosterUrl(body.poster)) event = { ...event, posters: [body.poster], poster: body.poster }
    return NextResponse.json({ success: true, event: await writeScreenEvent(event) }, { headers })
  } catch (error) { return failure(error) }
}

/** 고치기 — 포스터 추가·선택, 글꼴, 기간 중 자동 적용, 숨기기, (직접 추가한 행사) 이름·기간 */
export async function PATCH(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    const body = await bodyOf(request)
    const event = (await readScreenEvents()).find(e => e.id === body.id)
    if (!event) throw new BackgroundError('이벤트를 찾을 수 없습니다. 목록을 새로고침해주세요.', 404)
    const next = { ...event }
    if (Object.hasOwn(body, 'add_poster')) {
      if (!isOwnPosterUrl(body.add_poster)) throw new BackgroundError('포스터 주소가 올바르지 않습니다.')
      next.posters = [...next.posters.filter(url => url !== body.add_poster), body.add_poster].slice(-6)
      next.poster = body.add_poster
    }
    if (Object.hasOwn(body, 'poster')) {
      if (body.poster !== null && !next.posters.includes(body.poster as string)) throw new BackgroundError('포스터를 찾을 수 없습니다.')
      next.poster = body.poster as string | null
    }
    if (Object.hasOwn(body, 'font')) {
      if (body.font !== null && !SCREEN_FONT_IDS.includes(body.font as string)) throw new BackgroundError('글꼴을 찾을 수 없습니다.')
      next.font = body.font as string | null
    }
    if (Object.hasOwn(body, 'approved')) {
      if (body.approved === true && !next.backgrounds.kiosk && !next.backgrounds.booth) throw new BackgroundError('배경을 먼저 만들어주세요.')
      next.approved = body.approved === true
    }
    if (Object.hasOwn(body, 'hidden')) next.hidden = body.hidden === true
    if (Object.hasOwn(body, 'force')) {
      if (body.force === true && !next.backgrounds.kiosk && !next.backgrounds.booth) throw new BackgroundError('배경을 먼저 만들어주세요.')
      next.forced_at = body.force === true ? new Date().toISOString() : null
    }
    if (event.source === 'manual') {
      if (typeof body.title === 'string' && body.title.trim()) next.title = body.title.trim()
      if (isEventDate(body.starts_on)) next.starts_on = body.starts_on
      if (isEventDate(body.ends_on)) next.ends_on = body.ends_on
    }
    return NextResponse.json({ success: true, event: await writeScreenEvent(next) }, { headers })
  } catch (error) { return failure(error) }
}
