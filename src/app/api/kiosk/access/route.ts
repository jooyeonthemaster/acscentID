import { NextRequest, NextResponse } from 'next/server'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { WEB_ACCESS_COOKIE, WEB_ACCESS_PATH, WEB_ACCESS_SECONDS, correctWebPassword, issueWebAccess, validWebAccess, webAttemptAllowed, webGateOn } from '@/lib/kiosk/web-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }

/**
 * 키오스크 화면을 웹브라우저로 열어도 되는가(src/lib/kiosk/web-access.ts)
 * GET  /api/kiosk/access → { ok } — 비밀번호를 묻지 않는 서버이거나, 이미 통과한 브라우저면 true
 * POST /api/kiosk/access { password } → 맞으면 12시간짜리 쿠키
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: !webGateOn(request) || validWebAccess(request) }, { headers })
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!webAttemptAllowed(request)) return NextResponse.json({ error: '입력이 너무 많습니다. 1분 후 다시 시도해주세요.' }, { status: 429, headers })
  try {
    const raw = await request.text()
    const body = raw.length <= 100 ? JSON.parse(raw) : null
    if (!correctWebPassword(body?.password)) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers })
    const response = NextResponse.json({ ok: true }, { headers })
    response.cookies.set(WEB_ACCESS_COOKIE, issueWebAccess(), {
      httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict',
      path: WEB_ACCESS_PATH, maxAge: WEB_ACCESS_SECONDS,
    })
    return response
  } catch {
    return NextResponse.json({ error: '확인하지 못했습니다.' }, { status: 400, headers })
  }
}
