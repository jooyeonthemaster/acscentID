import { NextRequest, NextResponse } from 'next/server'
import { syncScreenEvents } from '@/lib/screen-events/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Vercel 크론(vercel.json) — 매일 새벽 ERP·노션 이벤트를 불러온다. CRON_SECRET 이 맞아야 한다 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const result = await syncScreenEvents()
    console.log('[screen-events] cron sync', JSON.stringify(result))
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[screen-events] cron sync failed', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'sync failed' }, { status: 500 })
  }
}
