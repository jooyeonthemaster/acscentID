import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { generateEventScreens } from '@/lib/screen-events/generate'
import { readScreenEvents } from '@/lib/screen-events/store'
import { authorize, bodyOf, failure, headers } from '../shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 분석 1번 + 이미지 2장(동시) — 보통 1~2분
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    const body = await bodyOf(request)
    const event = (await readScreenEvents()).find(e => e.id === body.id)
    if (!event) throw new BackgroundError('이벤트를 찾을 수 없습니다.', 404)
    return NextResponse.json({ success: true, event: await generateEventScreens(event) }, { headers })
  } catch (error) { return failure(error) }
}
