import { NextRequest, NextResponse } from 'next/server'
import { issueIdolTicket } from '@/lib/booth/idol-generate'
import { boothPassRequired } from '@/lib/booth/pass-policy'
import { readBoothModeToken } from '@/lib/booth/device-mode-token'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { readBackgroundSnapshot } from '@/lib/screen-backgrounds/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }

/** 부스 한 대가 손님을 받는 속도보다 넉넉하게 — 인스턴스 안에서 1분에 이만큼 */
const PER_MINUTE = 6
let windowStart = 0
let windowCount = 0

/**
 * 이용권 없이 쓰는 운영 모드(스토어 어드민 '이용권 번호: 없이 바로 촬영')의 AI 아이돌 사진 생성 표.
 * POST /api/photobooth/idol/ticket → { idolTicket }
 *
 * 이용권이 필요한 모드면 거절한다 — 그때는 이용권 확인(/api/photobooth/pass)이 표를 준다.
 * 비용이 드는 생성이라 1분에 받을 수 있는 표 수를 묶어 둔다(표 하나 = 생성 3번, src/lib/booth/idol-generate.ts).
 * body { deviceMode?: 증표 } — 이 부스에만 따로 고른 운영 모드(관리자 세션으로 서명받은 것, device-mode-token.ts)면
 * 모든 부스 공통 운영 모드 대신 그 모드로 본다. 증표가 없거나 틀리면 공통 운영 모드.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  try {
    const body = await request.json().catch(() => null) as { deviceMode?: unknown } | null
    const deviceMode = readBoothModeToken(body?.deviceMode)
    const snapshot = await readBackgroundSnapshot()
    const settings = deviceMode ? { ...snapshot.settings.booth, mode: deviceMode } : snapshot.settings.booth
    if (boothPassRequired(settings)) {
      return NextResponse.json({ error: '이용권을 먼저 확인해 주세요.' }, { status: 403, headers })
    }
    const now = Date.now()
    if (now - windowStart > 60_000) {
      windowStart = now
      windowCount = 0
    }
    if (++windowCount > PER_MINUTE) {
      return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers })
    }
    return NextResponse.json({ idolTicket: issueIdolTicket('free') }, { headers })
  } catch (error) {
    console.error('[idol-ticket] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '표를 만들지 못했어요.' }, { status: 500, headers })
  }
}
