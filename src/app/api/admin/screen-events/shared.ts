import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const headers = { 'Cache-Control': 'no-store, max-age=0' }

export function failure(error: unknown) {
  if (error instanceof BackgroundError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
  console.error('[screen-events] request failed', error instanceof Error ? error.message : error)
  return NextResponse.json({ error: '이벤트 화면 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 503, headers })
}

export async function authorize(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!await requireAdmin()) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403, headers })
  return null
}

export async function bodyOf(request: NextRequest): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > 20000) throw new BackgroundError('요청이 너무 큽니다.', 413)
  try { const value = JSON.parse(text); if (value && typeof value === 'object' && !Array.isArray(value)) return value } catch { /* below */ }
  throw new BackgroundError('올바른 JSON 요청이 필요합니다.')
}

/** 관리자가 브라우저에서 올린 포스터 — 우리 Supabase 공개 버킷 주소만 받는다 */
export function isOwnPosterUrl(value: unknown): value is string {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/admin-content/screen-events/`
  return typeof value === 'string' && value.length < 600 && value.startsWith(base) && !/[\s"'<>\\]|\.\./.test(value)
}
