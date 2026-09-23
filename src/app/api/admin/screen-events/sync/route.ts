import { NextRequest, NextResponse } from 'next/server'
import { syncScreenEvents } from '@/lib/screen-events/sync'
import { authorize, failure, headers } from '../shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** ERP·노션에서 불러오기 — 매일 새벽 크론(/api/cron/screen-events)과 같은 일 */
export async function POST(request: NextRequest) {
  try { const denied = await authorize(request); if (denied) return denied
    return NextResponse.json({ success: true, result: await syncScreenEvents() }, { headers })
  } catch (error) { return failure(error) }
}
