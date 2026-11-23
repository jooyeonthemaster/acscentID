import { NextResponse } from 'next/server'
import { transcribeLetter } from '@/lib/post/ai'

// POST! 우체통 — 녹음한 말을 엽서 글로. { wav: base64(16kHz 모노 WAV), toLine, santa }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const wav = typeof body?.wav === 'string' ? body.wav : ''
  if (!wav || wav.length > 4_000_000) return NextResponse.json({ error: 'bad audio' }, { status: 400 })
  try {
    const { result, cost } = await transcribeLetter(wav, String(body?.toLine ?? '받는 분께').slice(0, 20), Boolean(body?.santa))
    return NextResponse.json({ ...result, cost })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 502 })
  }
}
