import { NextRequest, NextResponse } from 'next/server'
import { issueDemoTicket } from '@/lib/booth/demo-server'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }
const PER_MINUTE = 10
let windowStart = 0
let windowCount = 0

/**
 * 영업용 포토부스 데모(/booth?…&demo=1)의 표 — AI 아이돌 사진 생성과 폰으로 받기(사진 올리기)에 쓴다.
 * POST /api/photobooth/demo/ticket → { idolTicket }
 * 매장 운영 모드·이용권 설정과 상관없다. 생성 상한(1분 3장·하루 40장)은 생성할 때 센다(src/lib/booth/demo-server.ts).
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  const now = Date.now()
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
  if (++windowCount > PER_MINUTE) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers })
  return NextResponse.json({ idolTicket: issueDemoTicket() }, { headers })
}
