// 기기 관리자(우측 하단 → PIN) 전용 API 공통 — 10분짜리 PIN 세션 쿠키는 /api/screen-backgrounds 아래에서만 실린다
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { sameOrigin, validDeviceSession } from '@/lib/screen-backgrounds/device-auth'

export const deviceHeaders = { 'Cache-Control': 'no-store, max-age=0' }

export function deviceDenied(request: NextRequest) {
  if (!sameOrigin(request) || !validDeviceSession(request)) {
    return NextResponse.json({ error: '관리자 비밀번호를 다시 입력해주세요.', relogin: true }, { status: 403, headers: deviceHeaders })
  }
  return null
}

export function deviceFailure(error: unknown, fallback: string) {
  if (error instanceof BackgroundError) return NextResponse.json({ error: error.message }, { status: error.status, headers: deviceHeaders })
  console.error('[device-admin]', fallback, error instanceof Error ? error.message : error)
  return NextResponse.json({ error: fallback }, { status: 503, headers: deviceHeaders })
}

export async function deviceBody(request: NextRequest): Promise<Record<string, unknown>> {
  const raw = await request.text()
  if (raw.length > 2000) throw new BackgroundError('잘못된 요청입니다.')
  try { const value = JSON.parse(raw); if (value && typeof value === 'object' && !Array.isArray(value)) return value } catch { /* below */ }
  throw new BackgroundError('잘못된 요청입니다.')
}
