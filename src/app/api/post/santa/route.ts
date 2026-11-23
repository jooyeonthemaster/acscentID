import { NextResponse } from 'next/server'
import { santaReply } from '@/lib/post/ai'

// POST! 우체통 크리스마스 — 산타 답장. { wish, name }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const wish = String(body?.wish ?? '').slice(0, 400)
  if (!wish) return NextResponse.json({ error: 'no wish' }, { status: 400 })
  try {
    const { result, cost } = await santaReply(wish, String(body?.name ?? '').slice(0, 8))
    return NextResponse.json({ ...result, cost })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 502 })
  }
}
