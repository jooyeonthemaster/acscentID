import { NextRequest, NextResponse } from 'next/server'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { generateEventFrame } from '@/lib/screen-events/frame-generate'
import { readScreenEvents } from '@/lib/screen-events/store'
import { authorize, bodyOf, failure, headers } from '../shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 이미지 1장 — 보통 30초~1분
export const maxDuration = 300

/** 관리자 — 행사 포스터로 AI 프레임 1장 만들어 이 행사에 묶기 (약 200원) */
export async function POST(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    const body = await bodyOf(request)
    const event = (await readScreenEvents()).find(e => e.id === body.id)
    if (!event) throw new BackgroundError('이벤트를 찾을 수 없습니다.', 404)
    return NextResponse.json({ success: true, ...(await generateEventFrame(event)) }, { headers })
  } catch (error) { return failure(error) }
}
