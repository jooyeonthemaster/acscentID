import { NextRequest, NextResponse } from 'next/server'
import { kioskEnabled } from '@/lib/kiosk/access'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { ExhibitError, isExhibitKind } from '@/lib/kiosk/expansion/exhibit'
import { createExhibitRoom } from '@/lib/kiosk/expansion/exhibit-store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const attempts = new Map<string, { until: number; count: number }>()
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request) || !sameOrigin(request)) return NextResponse.json({ error: '전시 연결이 허용되지 않습니다.' }, { status: 403 })
  try {
    const raw = await request.text()
    if (raw.length > 1024) throw new ExhibitError('요청이 너무 큽니다.', 413)
    const body = JSON.parse(raw)
    if (!isExhibitKind(body?.kind)) throw new ExhibitError('전시 종류를 확인해 주세요.')
    const now = Date.now(), ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0]
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key)
    const entry = attempts.get(ip) ?? { until: now + 60_000, count: 0 }
    if (++entry.count > 10 || attempts.size > 2000) throw new ExhibitError('잠시 후 연결을 다시 만들어 주세요.', 429)
    attempts.set(ip, entry)
    const room = await createExhibitRoom(body.kind)
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof ExhibitError ? error.message : error instanceof SyntaxError ? '요청 형식을 확인해 주세요.' : '전시 연결을 만들지 못했습니다.' }, { status: error instanceof ExhibitError ? error.status : error instanceof SyntaxError ? 400 : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
