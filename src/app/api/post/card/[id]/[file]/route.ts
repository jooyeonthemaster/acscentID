import { getCardFile, isId } from '@/lib/post/store'

interface RouteParams { params: Promise<{ id: string; file: string }> }

const TYPES = { 'card.jpg': 'image/jpeg', 'voice.wav': 'audio/wav' } as const

// 엽서 그림 · 보낸 사람 목소리
export async function GET(_req: Request, { params }: RouteParams) {
  const { id, file } = await params
  if (!isId(id) || !(file in TYPES)) return new Response('bad request', { status: 400 })
  const name = file as keyof typeof TYPES
  const buf = await getCardFile(id, name)
  if (!buf) return new Response('not found', { status: 404 })
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': TYPES[name], 'Cache-Control': 'private, max-age=3600' } })
}
