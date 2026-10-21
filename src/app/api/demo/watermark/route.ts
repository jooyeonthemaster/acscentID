// 데모 화면 워터마크 끄기 — 매장 관리자 비밀번호(6자리, 키오스크·부스 관리자 창과 같은 PIN)를 서버에서 확인만 한다.
// 기기 설정 권한(관리자 세션 쿠키)은 주지 않는다. 끈 상태는 그 브라우저에만 남는다(src/lib/demo-watermark.ts).
import { NextRequest, NextResponse } from 'next/server'
import { correctDevicePin, pinAttemptAllowed, sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!pinAttemptAllowed(request)) return NextResponse.json({ error: '입력이 너무 많습니다. 1분 후 다시 시도해 주세요.' }, { status: 429, headers })
  try {
    const raw = await request.text()
    const body = raw.length <= 100 ? JSON.parse(raw) : null
    if (!correctDevicePin(body?.pin)) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers })
    return NextResponse.json({ success: true }, { headers })
  } catch {
    return NextResponse.json({ error: '확인하지 못했습니다.' }, { status: 400, headers })
  }
}
