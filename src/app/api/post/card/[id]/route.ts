import { NextResponse } from 'next/server'
import { getCard, isId } from '@/lib/post/store'

interface RouteParams { params: Promise<{ id: string }> }

// 받는 사람 웹 엽서 · 보낸 사람 휴대폰이 엽서 정보를 본다
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params
  if (!isId(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 })
  const card = await getCard(id)
  if (!card) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(card)
}
