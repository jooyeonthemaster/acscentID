import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { resolveCurrentEvent, todayKst } from '@/lib/photobooth/current-event'
import { MASTER_PASS_CODE, isMasterPass } from '@/lib/photobooth/master-pass'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** KST 오늘 0시의 UTC ISO 문자열 */
function kstMidnightIso(): string {
  return new Date(new Date(`${todayKst()}T00:00:00.000Z`).getTime() - KST_OFFSET_MS).toISOString()
}

/** 마스터 번호와 겹치면 사용 불가능한 죽은 이용권이 되므로 다시 뽑는다 */
function generatePassCode(): string {
  let code: string
  do {
    code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  } while (isMasterPass(code))
  return code
}

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

  const serviceClient = createServiceRoleClient()
  const currentEvent = await resolveCurrentEvent(serviceClient)

  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // 코드 유니크 충돌(23505) 시 재시도
    let inserted = false
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = generatePassCode()
      const { error } = await serviceClient.from('photobooth_passes').insert({
        code,
        status: 'issued',
        event_id: currentEvent?.id ?? null,
        note,
      })
      if (!error) {
        codes.push(code)
        inserted = true
      } else if (error.code !== '23505') {
        console.error('Admin photobooth pass insert failed:', error)
        return NextResponse.json({ error: '발급에 실패했습니다' }, { status: 500 })
      }
    }
    if (!inserted) {
      return NextResponse.json({ error: '발급에 실패했습니다' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, codes, event: currentEvent?.title ?? null })
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
