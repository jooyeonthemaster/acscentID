import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { BOOTH_MODE_IDS } from '@/lib/booth/modes'
import { issueBoothModeToken } from '@/lib/booth/device-mode-token'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 '이 부스만' 운영 모드의 증표 — 부스 관리자(우측 하단 → PIN, 10분 세션)만.
 * POST /api/screen-backgrounds/device-mode { mode } → { mode, token }
 * 부스는 모드와 증표를 그 기기에 저장하고(src/lib/booth/device-mode.ts), 무료 AI 생성 표를 받을 때 증표를 낸다.
 * 서버에는 아무것도 저장하지 않는다 — 다른 부스·공통 운영 모드는 그대로.
 */
export async function POST(request: NextRequest) {
  const denied = deviceDenied(request)
  if (denied) return denied
  try {
    const body = await deviceBody(request)
    const mode = body.mode
    if (typeof mode !== 'string' || !BOOTH_MODE_IDS.includes(mode)) throw new BackgroundError('운영 모드를 확인해주세요.')
    return NextResponse.json({ mode, token: issueBoothModeToken(mode) }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '이 부스의 운영 모드를 저장하지 못했습니다.') }
}
