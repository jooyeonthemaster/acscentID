import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError, readBackgroundSnapshot, selectSharedBackground, saveDeviceSettings } from '@/lib/screen-backgrounds/store'
import { isScreenTarget } from '@/lib/screen-backgrounds/types'
import { sameOrigin, validDeviceSession } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }
function failure(error: unknown) {
  if (error instanceof BackgroundError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
  console.error('[screen-backgrounds] Device request failed', error instanceof Error ? error.message : 'unknown')
  return NextResponse.json({ error: '배경 목록을 새로고침하지 못했습니다. 마지막 설정을 유지합니다.' }, { status: 503, headers })
}
export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('target')
  if (!isScreenTarget(target)) return NextResponse.json({ error: '기기를 확인해주세요.' }, { status: 400, headers })
  try {
    const snapshot = await readBackgroundSnapshot()
    return NextResponse.json({ ...snapshot, backgrounds: snapshot.backgrounds.filter(item => item.is_active && item.target === target) }, { headers })
  } catch (error) { return failure(error) }
}
export async function PUT(request: NextRequest) {
  try {
    if (!sameOrigin(request) || !validDeviceSession(request)) return NextResponse.json({ error: '관리자 비밀번호를 다시 입력해주세요.' }, { status: 403, headers })
    const raw = await request.text()
    if (raw.length > 1000) throw new BackgroundError('잘못된 요청입니다.')
    let body
    try { body = JSON.parse(raw) } catch { throw new BackgroundError('잘못된 요청입니다.') }
    if (isScreenTarget(body?.target) && body && (Object.hasOwn(body, 'ui') || Object.hasOwn(body, 'font'))) {
      const settings = await saveDeviceSettings(body.target, body)
      return NextResponse.json({ success: true, settings }, { headers })
    }
    if (!isScreenTarget(body?.target) || typeof body?.id !== 'string') throw new BackgroundError('기기와 배경을 확인해주세요.')
    await selectSharedBackground(body.target, body.id)
    return NextResponse.json({ success: true }, { headers })
  } catch (error) { return failure(error) }
}
