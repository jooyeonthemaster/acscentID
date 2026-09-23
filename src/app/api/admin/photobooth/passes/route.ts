import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { MASTER_PASS_CODE } from '@/lib/photobooth/master-pass'
import { issuePasses, kstMidnightIso } from '@/lib/photobooth/passes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 포토부스 이용권 관리 (관리자/직원 — 상품 구매 시 발급)
 * GET   /api/admin/photobooth/passes            최근 목록 + 통계
 * POST  /api/admin/photobooth/passes            발급 { count?, note? } (최대 20장)
 * PATCH /api/admin/photobooth/passes            취소 { id }
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const serviceClient = createServiceRoleClient()
  const since = kstMidnightIso()

  const [listRes, issuedTodayRes, usedTodayRes, eventStatsRes] = await Promise.all([
    serviceClient
      .from('photobooth_passes')
      .select('*, photobooth_events(title)')
      .order('created_at', { ascending: false })
      .limit(30),
    serviceClient
      .from('photobooth_passes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    serviceClient
      .from('photobooth_passes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'used')
      .gte('used_at', since),
    serviceClient.from('photobooth_passes').select('event_id, status'),
  ])

  if (listRes.error) {
    console.error('Admin photobooth passes fetch failed:', listRes.error)
    return NextResponse.json({ error: '목록 조회에 실패했습니다' }, { status: 500 })
  }

  // 이벤트별 발급/사용 집계 (주최자 리포트용)
  const byEvent: Record<string, { issued: number; used: number }> = {}
  for (const row of eventStatsRes.data ?? []) {
    const key = row.event_id ?? 'none'
    byEvent[key] = byEvent[key] ?? { issued: 0, used: 0 }
    byEvent[key].issued += 1
    if (row.status === 'used') byEvent[key].used += 1
  }

  return NextResponse.json({
    success: true,
    passes: listRes.data ?? [],
    masterCode: MASTER_PASS_CODE,
    stats: {
      issued_today: issuedTodayRes.count ?? 0,
      used_today: usedTodayRes.count ?? 0,
      by_event: byEvent,
    },
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const count = Math.min(Math.max(Number.isInteger(body?.count) ? body.count : 1, 1), 20)
  const note =
    typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 100) : null

  // 관리자 발급분은 기한 없음 (행사 사전 배포 등) — 카운터 발급분만 당일 자정 만료
  const result = await issuePasses(createServiceRoleClient(), { count, note, via: 'admin' })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ success: true, codes: result.passes.map((pass) => pass.code), event: result.event })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('photobooth_passes')
    .update({ status: 'void' })
    .eq('id', body.id)
    .eq('status', 'issued')

  if (error) {
    console.error('Admin photobooth pass void failed:', error)
    return NextResponse.json({ error: '취소에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
