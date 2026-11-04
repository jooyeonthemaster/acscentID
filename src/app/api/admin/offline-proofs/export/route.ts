import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  applyOfflineProofFilters,
  parseOfflineProofFilters,
} from '@/lib/admin/offline-proof-filters'
import {
  buildOfflineProofWorkbook,
  buildOfflineProofFileName,
  type OfflineProofExcelRequest,
} from '@/lib/admin/offline-proof-excel'
import { OFFLINE_PROOF_TABLE } from '@/lib/offline-proof'

export const runtime = 'nodejs'

/**
 * 관리자 - 오프라인 결제 증빙 엑셀 내보내기
 * GET /api/admin/offline-proofs/export?status=&search=&date_from=&date_to=&ids=
 *
 * `ids` 가 있으면 선택한 접수만, 없으면 현재 필터(기간 포함) 전체를 내보낸다.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseOfflineProofFilters(searchParams)

    const serviceClient = createServiceRoleClient()

    const baseQuery = serviceClient
      .from(OFFLINE_PROOF_TABLE)
      .select('*')
      .order('created_at', { ascending: true })

    const { data: requests, error } = await applyOfflineProofFilters(baseQuery, filters)

    if (error) {
      console.error('Offline proof export fetch failed:', error)
      return NextResponse.json({ error: '접수 조회에 실패했습니다' }, { status: 500 })
    }

    const requestList = (requests || []) as OfflineProofExcelRequest[]
    const buffer = await buildOfflineProofWorkbook(requestList)
    const fileName = buildOfflineProofFileName(filters.dateFrom, filters.dateTo)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buffer.byteLength),
        'X-Request-Count': String(requestList.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Offline proof export error:', error)
    return NextResponse.json({ error: '엑셀 생성에 실패했습니다' }, { status: 500 })
  }
}
