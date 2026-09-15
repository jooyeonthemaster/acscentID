import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { applyKioskFilters, parseKioskFilters } from '@/lib/admin/kiosk-filters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 관리자 — 키오스크 분석 기록
 * GET    /api/admin/kiosk?program=&search=&date_from=&date_to=&mock=&page=&limit=
 * DELETE /api/admin/kiosk?id=...   (테스트/데모 기록 정리용)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const filters = parseKioskFilters(searchParams)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    const serviceClient = createServiceRoleClient()
    let query = serviceClient
      .from('kiosk_analyses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    query = applyKioskFilters(query, filters)

    const { data, error, count } = await query
    if (error) {
      console.error('Kiosk analyses list fetch failed:', error)
      return NextResponse.json({ error: '기록 조회에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      records: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin kiosk GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

    const id = new URL(request.url).searchParams.get('id')?.trim() ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient.from('kiosk_analyses').delete().eq('id', id)
    if (error) {
      console.error('Kiosk analysis delete failed:', error)
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin kiosk DELETE error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
