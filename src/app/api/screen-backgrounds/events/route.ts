import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { SCREEN_FONT_IDS } from '@/lib/screen-fonts/catalog'
import { generatorConfigured } from '@/lib/screen-events/generate'
import { readScreenEvents, writeScreenEvent } from '@/lib/screen-events/store'
import { addDays, DEVICE_STORE, kstToday } from '@/lib/screen-events/types'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 기기 관리자 — 이 매장의 진행 중·다가오는 행사(오늘 ~ 약 두 달) */
export async function GET(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const today = kstToday()
    const until = addDays(today, 62)
    const events = (await readScreenEvents())
      .filter(e => !e.hidden && (e.store === DEVICE_STORE || e.store === 'all') && e.ends_on >= today && e.starts_on <= until)
    return NextResponse.json({ events, today, generator: generatorConfigured() }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '이벤트 목록을 불러오지 못했습니다.') }
}

/** 기기에서 바꿀 수 있는 것 — 기간 중 자동 적용, 글꼴, 지금 바로 적용/해제 */
export async function PATCH(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const body = await deviceBody(request)
    const event = (await readScreenEvents()).find(e => e.id === body.id)
    if (!event || event.hidden) throw new BackgroundError('이벤트를 찾을 수 없습니다. 목록을 새로고침해주세요.', 404)
    const next = { ...event }
    const hasScreens = !!(event.backgrounds.kiosk || event.backgrounds.booth)
    if (Object.hasOwn(body, 'approved')) {
      if (body.approved === true && !hasScreens) throw new BackgroundError('배경을 먼저 만들어주세요.')
      next.approved = body.approved === true
    }
    if (Object.hasOwn(body, 'font')) {
      if (body.font !== null && !SCREEN_FONT_IDS.includes(body.font as string)) throw new BackgroundError('글꼴을 찾을 수 없습니다.')
      next.font = body.font as string | null
    }
    if (Object.hasOwn(body, 'force')) {
      if (body.force === true && !hasScreens) throw new BackgroundError('배경을 먼저 만들어주세요.')
      next.forced_at = body.force === true ? new Date().toISOString() : null
    }
    return NextResponse.json({ success: true, event: await writeScreenEvent(next) }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '이벤트를 저장하지 못했습니다.') }
}
