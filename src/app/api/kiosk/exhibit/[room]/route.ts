import { NextRequest, NextResponse } from 'next/server'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { ExhibitError, parseExhibitCommand } from '@/lib/kiosk/expansion/exhibit'
import { acknowledgeExhibit, closeExhibit, heartbeatExhibit, publishExhibit, readExhibitRoom } from '@/lib/kiosk/expansion/exhibit-store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ room: string }> }
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const token = (r: NextRequest) => r.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
const fail = (error: unknown) => NextResponse.json({ error: error instanceof ExhibitError ? error.message : error instanceof SyntaxError ? '요청 형식을 확인해 주세요.' : '전시 연결을 확인하지 못했습니다.' }, { status: error instanceof ExhibitError ? error.status : error instanceof SyntaxError ? 400 : 503, headers })
export async function GET(request: NextRequest, context: Context) {
  try { return NextResponse.json(await readExhibitRoom((await context.params).room, token(request)), { headers }) } catch (error) { return fail(error) }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    if (!sameOrigin(request)) throw new ExhibitError('허용되지 않은 요청입니다.', 403)
    const raw = await request.text()
    if (raw.length > 8192) throw new ExhibitError('전시 내용이 너무 큽니다.', 413)
    const body = JSON.parse(raw), room = (await context.params).room, auth = token(request)
    if (body?.action === 'heartbeat') return NextResponse.json(await heartbeatExhibit(room, auth), { headers })
    if (body?.action === 'ack') return NextResponse.json(await acknowledgeExhibit(room, auth, body.sequence), { headers })
    if (body?.action === 'publish') {
      if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.requestId)) throw new ExhibitError('요청 번호를 확인해 주세요.')
      return NextResponse.json(await publishExhibit(room, auth, parseExhibitCommand(body.command), body.requestId), { headers })
    }
    throw new ExhibitError('전시 작업을 확인해 주세요.')
  } catch (error) { return fail(error) }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    if (!sameOrigin(request)) throw new ExhibitError('허용되지 않은 요청입니다.', 403)
    await closeExhibit((await context.params).room, token(request))
    return NextResponse.json({ success: true }, { headers })
  } catch (error) { return fail(error) }
}
