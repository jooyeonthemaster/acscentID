import { NextResponse } from 'next/server'
import { getSession, isId, saveCard, updateSession, type PostCard } from '@/lib/post/store'

interface RouteParams { params: Promise<{ id: string }> }

/** 기기 · 휴대폰이 서로의 상태를 본다(1~2초마다) */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params
  if (!isId(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 })
  const s = await getSession(id)
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: s.id, joined: Boolean(s.joinedAt), cardId: s.cardId ?? null })
}

const dataUrlBuffer = (s: unknown) => (typeof s === 'string' && s.includes(',') ? Buffer.from(s.split(',')[1], 'base64') : null)

/**
 * action
 * - join : 휴대폰이 QR 로 들어옴
 * - card : 기기가 완성 엽서를 올림 { card, cardJpg(dataURL), voiceWav(base64) }
 * - log  : 휴대폰 단추 기록 { what: 'kakao' | 'share' | 'save' }
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params
  if (!isId(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 })
  const body = await req.json().catch(() => null)
  const action = body?.action
  const now = new Date().toISOString()

  if (action === 'join') {
    const s = await updateSession(id, (x) => { x.joinedAt ??= now; x.events.push({ at: now, what: 'join' }) })
    return s ? NextResponse.json({ ok: true, cardId: s.cardId ?? null }) : NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (action === 'log') {
    const what = String(body?.what ?? '').slice(0, 20)
    const s = await updateSession(id, (x) => { x.events.push({ at: now, what }) })
    return s ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (action === 'card') {
    const card = body?.card as PostCard | undefined
    const jpg = dataUrlBuffer(body?.cardJpg)
    if (!card || !isId(card.id) || !jpg) return NextResponse.json({ error: 'bad card' }, { status: 400 })
    const voice = typeof body?.voiceWav === 'string' && body.voiceWav ? Buffer.from(body.voiceWav, 'base64') : undefined
    await saveCard({ ...card, hasVoice: Boolean(voice), createdAt: now }, { cardJpg: jpg, voiceWav: voice })
    const s = await updateSession(id, (x) => { x.cardId = card.id; x.events.push({ at: now, what: 'card' }) })
    return s ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({ error: 'bad action' }, { status: 400 })
}
