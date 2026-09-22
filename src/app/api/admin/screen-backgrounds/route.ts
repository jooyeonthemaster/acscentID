import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { BackgroundError, readBackgroundSnapshot, saveBackground, deleteBackground, selectSharedBackground } from '@/lib/screen-backgrounds/store'
import { isScreenTarget } from '@/lib/screen-backgrounds/types'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }
function failure(error: unknown) {
  if (error instanceof BackgroundError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
  console.error('[screen-backgrounds] Admin request failed', error instanceof Error ? error.message : 'unknown')
  return NextResponse.json({ error: '중앙 배경 설정에 연결하지 못했습니다.' }, { status: 503, headers })
}
async function authorize(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!await requireAdmin()) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403, headers })
  return null
}
async function bodyOf(request: NextRequest) {
  if (Number(request.headers.get('content-length')) > 20000) throw new BackgroundError('요청이 너무 큽니다.', 413)
  const text = await request.text()
  if (text.length > 20000) throw new BackgroundError('요청이 너무 큽니다.', 413)
  try { const value = JSON.parse(text); if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown> } catch { /* handled below */ }
  throw new BackgroundError('올바른 JSON 요청이 필요합니다.')
}
export async function GET(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    return NextResponse.json(await readBackgroundSnapshot(), { headers })
  } catch (error) { return failure(error) }
}
async function save(request: NextRequest, create: boolean) {
  try { const denied = await authorize(request); if (denied) return denied
    const background = await saveBackground(await bodyOf(request), create)
    return NextResponse.json({ success: true, background }, { headers })
  } catch (error) { return failure(error) }
}
export const POST = (request: NextRequest) => save(request, true)
export const PATCH = (request: NextRequest) => save(request, false)
export async function DELETE(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    await deleteBackground(request.nextUrl.searchParams.get('id') || '')
    return NextResponse.json({ success: true }, { headers })
  } catch (error) { return failure(error) }
}
export async function PUT(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    const body = await bodyOf(request)
    if (!isScreenTarget(body.target) || typeof body.id !== 'string') throw new BackgroundError('기기와 배경을 확인해주세요.')
    await selectSharedBackground(body.target, body.id)
    return NextResponse.json({ success: true }, { headers })
  } catch (error) { return failure(error) }
}
