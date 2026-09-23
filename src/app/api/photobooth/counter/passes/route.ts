import { NextRequest, NextResponse } from 'next/server'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import { counterAccess } from '@/lib/photobooth/counter-auth'
import { counterPassExpiry, issuePasses, kstMidnightIso } from '@/lib/photobooth/passes'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store, max-age=0' }

/** 한 번에 뽑을 수 있는 최대 장수 — 단체 손님은 여러 번 누른다 */
const MAX_PER_ISSUE = 6

/**
 * 카운터 이용권 발급 (연결된 카운터 기기 또는 관리자)
 * GET   오늘 카운터 발급 목록 + 발급·사용 수
 * POST  발급 { count } — 당일 자정까지 유효
 * PATCH 취소 { id } — 오늘 발급한 미사용분만 (잘못 뽑았을 때)
 */
export async function GET(request: NextRequest) {
  if (!(await counterAccess(request))) {
    return NextResponse.json({ error: '카운터 기기 연결이 필요합니다' }, { status: 401, headers })
  }
  const client = createServiceRoleClient()
  const since = kstMidnightIso()
  const { data, error } = await client
    .from('photobooth_passes')
    .select('id, code, status, created_at, used_at, expires_at')
    .eq('issued_via', 'counter')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('Counter passes fetch failed:', error)
    return NextResponse.json({ error: '목록을 불러오지 못했습니다' }, { status: 500, headers })
  }
  const rows = data ?? []
  return NextResponse.json(
    {
      success: true,
      passes: rows.slice(0, 20),
      stats: {
        issued: rows.filter((row) => row.status !== 'void').length,
        used: rows.filter((row) => row.status === 'used').length,
        voided: rows.filter((row) => row.status === 'void').length,
      },
    },
    { headers }
  )
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!(await counterAccess(request))) {
    return NextResponse.json({ error: '카운터 기기 연결이 필요합니다' }, { status: 401, headers })
  }
  const body = await request.json().catch(() => ({}))
  const count = Number.isInteger(body?.count) ? body.count : 1
  if (count < 1 || count > MAX_PER_ISSUE) {
    return NextResponse.json({ error: `한 번에 1~${MAX_PER_ISSUE}장까지 발급할 수 있습니다` }, { status: 400, headers })
  }
  const result = await issuePasses(createServiceRoleClient(), {
    count, via: 'counter', expiresAt: counterPassExpiry(),
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500, headers })
  return NextResponse.json({ success: true, passes: result.passes, event: result.event }, { headers })
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  if (!(await counterAccess(request))) {
    return NextResponse.json({ error: '카운터 기기 연결이 필요합니다' }, { status: 401, headers })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400, headers })
  }
  const { data, error } = await createServiceRoleClient()
    .from('photobooth_passes')
    .update({ status: 'void' })
    .eq('id', body.id)
    .eq('issued_via', 'counter')
    .eq('status', 'issued')
    .gte('created_at', kstMidnightIso())
    .select('id')
  if (error) {
    console.error('Counter pass void failed:', error)
    return NextResponse.json({ error: '취소에 실패했습니다' }, { status: 500, headers })
  }
  if (!data?.length) {
    return NextResponse.json({ error: '이미 사용했거나 취소할 수 없는 이용권입니다' }, { status: 409, headers })
  }
  return NextResponse.json({ success: true }, { headers })
}
