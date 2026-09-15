import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { todayKst } from '@/lib/photobooth/current-event'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

interface ShotRow {
  id: string
  created_at: string
  mode: string
  cut_count: number
  event_id: string | null
  card_code: string | null
  frame_title: string | null
  template_title: string | null
  cutout_used: boolean
  printed: boolean
  downloaded: boolean
  photobooth_events: { title: string } | null
}

/** KST 기준 날짜 키 (YYYY-MM-DD) */
function kstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

function countBy<T extends string>(rows: ShotRow[], pick: (r: ShotRow) => T | null) {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = pick(row)
    if (!key) continue
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/**
 * 촬영 내역 통계 (관리자)
 * GET /api/admin/photobooth/shots?days=30&event=<id>
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const days = Math.min(180, Math.max(1, Number(request.nextUrl.searchParams.get('days')) || 30))
  const eventFilter = request.nextUrl.searchParams.get('event')

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const serviceClient = createServiceRoleClient()

  let query = serviceClient
    .from('photobooth_shots')
    .select('*, photobooth_events(title)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (eventFilter) query = query.eq('event_id', eventFilter)

  const { data, error } = await query
  if (error) {
    console.error('Admin photobooth shots fetch failed:', error)
    return NextResponse.json({ error: '통계 조회에 실패했습니다' }, { status: 500 })
  }

  const rows = (data ?? []) as ShotRow[]
  const today = todayKst()

  // 날짜별 추이 (요청 기간 전체를 0으로 채워 빈 날도 보이게)
  const daily: { date: string; count: number; printed: number }[] = []
  const dayIndex = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(new Date(`${today}T00:00:00.000Z`).getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    dayIndex.set(d, daily.length)
    daily.push({ date: d, count: 0, printed: 0 })
  }
  // 시간대 분포 (KST) — 운영 인력 배치에 쓴다
  const hourly = Array.from({ length: 24 }, () => 0)

  for (const row of rows) {
    const key = kstDate(row.created_at)
    const idx = dayIndex.get(key)
    if (idx !== undefined) {
      daily[idx].count += 1
      if (row.printed) daily[idx].printed += 1
    }
    const hour = new Date(new Date(row.created_at).getTime() + KST_OFFSET_MS).getUTCHours()
    hourly[hour] += 1
  }

  const total = rows.length
  const printedCount = rows.filter((r) => r.printed).length
  const todayCount = rows.filter((r) => kstDate(r.created_at) === today).length

  return NextResponse.json({
    success: true,
    range: { days, since },
    summary: {
      total,
      today: todayCount,
      printed: printedCount,
      print_rate: total ? Math.round((printedCount / total) * 100) : 0,
      cutout_used: rows.filter((r) => r.cutout_used).length,
      avg_cuts: total
        ? Math.round((rows.reduce((a, r) => a + (r.cut_count || 1), 0) / total) * 10) / 10
        : 0,
    },
    by_mode: countBy(rows, (r) => r.mode),
    by_event: countBy(rows, (r) => r.photobooth_events?.title ?? null),
    by_card: countBy(rows, (r) => r.card_code),
    by_frame: countBy(rows, (r) => r.frame_title),
    daily,
    hourly,
    recent: rows.slice(0, 30),
  })
}
