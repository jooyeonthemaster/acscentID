import { NextResponse } from 'next/server'
import { createSession } from '@/lib/post/store'

// POST! 우체통 — 손님 한 명의 흐름마다 세션을 연다(기기 화면 QR ↔ 손님 휴대폰)
export async function POST() {
  const s = await createSession()
  return NextResponse.json({ id: s.id })
}
