import { NextRequest, NextResponse } from 'next/server'
import { correctDevicePin, DEVICE_COOKIE, DEVICE_SESSION_SECONDS, issueDeviceSession, pinAttemptAllowed, sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!pinAttemptAllowed(request)) return NextResponse.json({ error: '입력이 너무 많습니다. 1분 후 다시 시도해주세요.' }, { status: 429, headers })
  try {
    const raw = await request.text()
    const body = raw.length <= 100 ? JSON.parse(raw) : null
    if (!correctDevicePin(body?.pin)) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers })
    const response = NextResponse.json({ success: true }, { headers })
    response.cookies.set(DEVICE_COOKIE, issueDeviceSession(), {
      httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict',
      path: '/api/screen-backgrounds', maxAge: DEVICE_SESSION_SECONDS,
    })
    return response
  } catch {
    return NextResponse.json({ error: '관리자 인증에 실패했습니다.' }, { status: 400, headers })
  }
}
