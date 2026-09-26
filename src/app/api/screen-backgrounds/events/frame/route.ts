import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { generateEventFrame } from '@/lib/screen-events/frame-generate'
import { readScreenEvents } from '@/lib/screen-events/store'
import { deviceBody, deviceDenied, deviceFailure, deviceHeaders } from '../../device-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** 기기 관리자에서 프레임 만들기 — 관리자 웹과 같은 생성(이미지 1장, 약 200원) */
export async function POST(request: NextRequest) {
  const denied = deviceDenied(request); if (denied) return denied
  try {
    const body = await deviceBody(request)
    const event = (await readScreenEvents()).find(e => e.id === body.id)
    if (!event || event.hidden) throw new BackgroundError('이벤트를 찾을 수 없습니다.', 404)
    return NextResponse.json({ success: true, ...(await generateEventFrame(event)) }, { headers: deviceHeaders })
  } catch (error) { return deviceFailure(error, '프레임을 만들지 못했습니다.') }
}
