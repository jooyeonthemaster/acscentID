import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  applyOfflineProofFilters,
  parseOfflineProofFilters,
  OFFLINE_PROOF_STATUSES,
} from '@/lib/admin/offline-proof-filters'
import {
  OFFLINE_PROOF_BUCKET,
  OFFLINE_PROOF_MAX_AMOUNT,
  OFFLINE_PROOF_PRODUCTS_TABLE,
  OFFLINE_PROOF_TABLE,
  REFUND_TYPES,
  itemsTotal,
  refundAmountFor,
  type OfflineProofItem,
} from '@/lib/offline-proof'

export const runtime = 'nodejs'

/** 관리자 화면에서 사진을 볼 수 있는 시간 — 지나면 새로고침하면 다시 받는다 */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60

interface ProofRow {
  id: string
  account_number: string
  payment_amount: number
  items: OfflineProofItem[] | null
  image_paths: string[] | null
  [key: string]: unknown
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/** 상품 id → 지금 기준 가격 (차액 계산용) */
async function loadPriceMap(serviceClient: ServiceClient): Promise<Map<string, number | null>> {
  const { data, error } = await serviceClient.from(OFFLINE_PROOF_PRODUCTS_TABLE).select('id, price')
  if (error) {
    console.error('Offline proof product prices fetch failed:', error.message)
    return new Map()
  }
  return new Map((data || []).map(product => [product.id as string, product.price as number | null]))
}

/**
 * 관리자 - 오프라인 결제 증빙 목록 조회
 * GET /api/admin/offline-proofs?status=&search=&date_from=&date_to=&page=&limit=
 *
 * 각 접수에 사진 서명 주소(image_urls), 같은 계좌로 들어온 다른 접수 수(duplicate_count),
 * 구매 상품별 지금 기준 가격(items[].price)과 합계(items_total, 차액 계산용)를 붙인다.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseOfflineProofFilters(searchParams)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    const serviceClient = createServiceRoleClient()

    let query = serviceClient
      .from(OFFLINE_PROOF_TABLE)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    query = applyOfflineProofFilters(query, filters)

    const { data, error, count } = await query

    if (error) {
      console.error('Offline proof list fetch failed:', error)
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return NextResponse.json(
          { error: 'DB 준비가 필요합니다 — supabase/migrations/20261022_offline_payment_proofs.sql 을 SQL 에디터에서 실행해주세요' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: '접수 목록 조회에 실패했습니다' }, { status: 500 })
    }

    const rows = (data || []) as ProofRow[]

    // 사진 서명 주소 — 한 번에 받아 접수별로 나눠 붙인다
    const allPaths = rows.flatMap(row => row.image_paths || [])
    const urlByPath = new Map<string, string>()
    if (allPaths.length > 0) {
      const { data: signed, error: signError } = await serviceClient.storage
        .from(OFFLINE_PROOF_BUCKET)
        .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS)
      if (signError) {
        console.error('Offline proof signed urls failed:', signError.message)
      }
      for (const item of signed || []) {
        if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl)
      }
    }

    // 같은 계좌번호로 들어온 접수 수 — 중복 지급 방지용 표시
    const accounts = Array.from(new Set(rows.map(row => row.account_number).filter(Boolean)))
    const accountCounts = new Map<string, number>()
    if (accounts.length > 0) {
      const { data: sameAccount, error: dupError } = await serviceClient
        .from(OFFLINE_PROOF_TABLE)
        .select('account_number')
        .in('account_number', accounts)
      if (dupError) {
        console.error('Offline proof duplicate check failed:', dupError.message)
      }
      for (const item of sameAccount || []) {
        accountCounts.set(item.account_number, (accountCounts.get(item.account_number) || 0) + 1)
      }
    }

    const priceById = await loadPriceMap(serviceClient)

    const requests = rows.map(row => {
      const items = row.items || []
      return {
        ...row,
        items: items.map(item => ({ ...item, price: priceById.get(item.product_id) ?? null })),
        items_total: itemsTotal(items, priceById),
        image_urls: (row.image_paths || []).map(path => urlByPath.get(path) || null),
        duplicate_count: Math.max(0, (accountCounts.get(row.account_number) || 1) - 1),
      }
    })

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin offline proof GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 접수 상태 변경 또는 환불 금액 지정 (한 건 또는 선택한 여러 건)
 * PATCH /api/admin/offline-proofs
 *   { requestId | requestIds, status }
 *   { requestId | requestIds, refund_type: 'full' | 'difference' | 'custom' | null, refund_amount? }
 *     — 전액·차액은 서버가 접수마다 계산한다. 차액을 계산할 수 없는 접수(기준 가격 없음)는 건너뛴다.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { requestId, requestIds, status } = body

    const ids: string[] = Array.isArray(requestIds)
      ? requestIds.filter((id: unknown): id is string => typeof id === 'string')
      : typeof requestId === 'string' ? [requestId] : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'requestId가 필요합니다' }, { status: 400 })
    }

    if ('refund_type' in body) {
      return updateRefund(ids, body.refund_type, body.refund_amount)
    }

    if (!status || !(OFFLINE_PROOF_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: updated, error } = await serviceClient
      .from(OFFLINE_PROOF_TABLE)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select('id, status, updated_at')

    if (error) {
      console.error('Offline proof status update failed:', error)
      return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: updated || [] })
  } catch (error) {
    console.error('Admin offline proof PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/** 환불 금액 지정 — PATCH 에서 refund_type 이 오면 여기로 */
async function updateRefund(ids: string[], refundType: unknown, refundAmount: unknown) {
  if (refundType !== null && !(REFUND_TYPES as readonly string[]).includes(refundType as string)) {
    return NextResponse.json({ error: '유효하지 않은 환불 방식입니다' }, { status: 400 })
  }

  const customAmount = Number(refundAmount)
  if (
    refundType === 'custom' &&
    (!Number.isSafeInteger(customAmount) || customAmount < 0 || customAmount > OFFLINE_PROOF_MAX_AMOUNT)
  ) {
    return NextResponse.json({ error: '환불 금액을 다시 확인해주세요' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  const { data: rows, error: fetchError } = await serviceClient
    .from(OFFLINE_PROOF_TABLE)
    .select('id, payment_amount, items')
    .in('id', ids)

  if (fetchError) {
    console.error('Offline proof refund fetch failed:', fetchError)
    return NextResponse.json({ error: '환불 금액 저장에 실패했습니다' }, { status: 500 })
  }

  const priceById = refundType === 'difference' ? await loadPriceMap(serviceClient) : new Map()
  const now = new Date().toISOString()
  const updates: { id: string; refund_type: string | null; refund_amount: number | null }[] = []
  let skipped = 0

  for (const row of (rows || []) as Pick<ProofRow, 'id' | 'payment_amount' | 'items'>[]) {
    let amount: number | null = null
    if (refundType === 'full' || refundType === 'difference') {
      amount = refundAmountFor(refundType, row.payment_amount, itemsTotal(row.items || [], priceById))
      if (amount === null) {
        skipped++
        continue
      }
    } else if (refundType === 'custom') {
      amount = customAmount
    }
    updates.push({ id: row.id, refund_type: (refundType as string | null) ?? null, refund_amount: amount })
  }

  // 접수마다 금액이 달라 한 건씩 저장한다
  const results = await Promise.all(
    updates.map(update =>
      serviceClient
        .from(OFFLINE_PROOF_TABLE)
        .update({ refund_type: update.refund_type, refund_amount: update.refund_amount, updated_at: now })
        .eq('id', update.id)
    )
  )
  const failed = results.find(result => result.error)
  if (failed?.error) {
    console.error('Offline proof refund update failed:', failed.error)
    return NextResponse.json({ error: '환불 금액 저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updates, skipped, updated_at: now })
}

/**
 * 관리자 - 접수 관리자 메모 업데이트
 * PUT /api/admin/offline-proofs  { requestId, admin_memo }
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { requestId, admin_memo } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId가 필요합니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { error } = await serviceClient
      .from(OFFLINE_PROOF_TABLE)
      .update({
        admin_memo: typeof admin_memo === 'string' ? admin_memo.slice(0, 2000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      console.error('Offline proof memo update failed:', error)
      return NextResponse.json({ error: '메모 저장에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin offline proof PUT error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 접수 삭제 (증빙 사진도 저장소에서 함께 지운다)
 * DELETE /api/admin/offline-proofs  { requestIds }
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { requestIds } = body

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: '삭제할 접수 ID가 필요합니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: deleted, error } = await serviceClient
      .from(OFFLINE_PROOF_TABLE)
      .delete()
      .in('id', requestIds)
      .select('id, image_paths')

    if (error) {
      console.error('Offline proof delete failed:', error)
      return NextResponse.json({ error: '접수 삭제에 실패했습니다' }, { status: 500 })
    }

    const paths = (deleted || []).flatMap(row => (row.image_paths as string[] | null) || [])
    if (paths.length > 0) {
      const { error: removeError } = await serviceClient.storage.from(OFFLINE_PROOF_BUCKET).remove(paths)
      if (removeError) {
        console.error('Offline proof image remove failed:', removeError.message)
      }
    }

    return NextResponse.json({ success: true, deletedCount: deleted?.length || 0 })
  } catch (error) {
    console.error('Admin offline proof DELETE error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
