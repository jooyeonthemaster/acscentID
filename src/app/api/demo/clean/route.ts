// 워터마크 없는 데모 링크(src/lib/demo-clean.ts)
// GET  /api/demo/clean?k=…            → { ok, expiresAt? }  서명 확인만(데모 화면의 워터마크가 묻는다)
// POST /api/demo/clean { pin, days }  → { key, expiresAt }  매장 관리자 비밀번호(키오스크 · 부스 관리자 창과 같은 6자리)를 확인하고 기간 있는 서명을 만든다.
//                                       기기 설정 권한(관리자 세션 쿠키)은 주지 않는다. 비밀번호 시도는 1분 8번까지.
import { NextRequest, NextResponse } from 'next/server'
import { correctDevicePin, pinAttemptAllowed, sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { DEMO_CLEAN_DAYS, DEMO_CLEAN_KEY_PARAM, type DemoCleanDays } from '@/lib/demo-clean'
import { issueCleanDemoKey, readCleanDemoKey } from '@/lib/demo-clean-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(request: NextRequest) {
  const expiresAt = readCleanDemoKey(request.nextUrl.searchParams.get(DEMO_CLEAN_KEY_PARAM))
  return NextResponse.json(expiresAt ? { ok: true, expiresAt } : { ok: false }, { headers })
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!pinAttemptAllowed(request)) return NextResponse.json({ error: '입력이 너무 많습니다. 1분 후 다시 시도해 주세요.' }, { status: 429, headers })
  try {
    const raw = await request.text()
    const body = raw.length <= 200 ? JSON.parse(raw) : null
    if (!correctDevicePin(body?.pin)) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers })
    const days: DemoCleanDays = (DEMO_CLEAN_DAYS as readonly number[]).includes(body?.days) ? body.days : 30
    return NextResponse.json(issueCleanDemoKey(days), { headers })
  } catch {
    return NextResponse.json({ error: '링크를 만들지 못했습니다.' }, { status: 400, headers })
  }
}
