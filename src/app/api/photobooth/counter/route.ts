import { NextRequest, NextResponse } from 'next/server'
import { pinAttemptAllowed, sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import {
  COUNTER_COOKIE,
  COUNTER_COOKIE_PATH,
  COUNTER_SESSION_SECONDS,
  correctCounterPin,
  counterAccess,
  counterPinConfigured,
  issueCounterSession,
} from '@/lib/photobooth/counter-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }

/**
 * 카운터 기기 연결 (/booth/counter)
 * GET    연결 상태 { access: 'counter' | 'admin' | null, configured }
 * POST   기기 연결 { pin } — PHOTOBOOTH_COUNTER_PIN 과 같으면 180일 쿠키 발급
 * DELETE 기기 연결 해제
 */
export async function GET(request: NextRequest) {
  const access = await counterAccess(request)
  return NextResponse.json({ access, configured: counterPinConfigured() }, { headers })
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!counterPinConfigured()) {
    return NextResponse.json({ error: '카운터 PIN 이 아직 설정되지 않았습니다. 관리자에게 문의해주세요.' }, { status: 503, headers })
  }
  if (!pinAttemptAllowed(request)) {
    return NextResponse.json({ error: '입력이 너무 많습니다. 1분 후 다시 시도해주세요.' }, { status: 429, headers })
  }
  const raw = await request.text().catch(() => '')
  let pin: unknown = null
  try {
    pin = raw.length <= 200 ? JSON.parse(raw)?.pin : null
  } catch {
    pin = null
  }
  if (!correctCounterPin(pin)) {
    return NextResponse.json({ error: 'PIN 이 올바르지 않습니다.' }, { status: 401, headers })
  }
  const response = NextResponse.json({ success: true }, { headers })
  response.cookies.set(COUNTER_COOKIE, issueCounterSession(), {
    httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict',
    path: COUNTER_COOKIE_PATH, maxAge: COUNTER_SESSION_SECONDS,
  })
  return response
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  const response = NextResponse.json({ success: true }, { headers })
  response.cookies.set(COUNTER_COOKIE, '', { path: COUNTER_COOKIE_PATH, expires: new Date(0) })
  return response
}
