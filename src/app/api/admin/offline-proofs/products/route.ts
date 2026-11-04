import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  OFFLINE_PROOF_MAX_AMOUNT,
  OFFLINE_PROOF_PRODUCT_NAME_MAX,
  OFFLINE_PROOF_PRODUCTS_TABLE,
} from '@/lib/offline-proof'

export const runtime = 'nodejs'

const NOT_READY_ERROR =
  'DB 준비가 필요합니다 — supabase/migrations/20261022_offline_proof_products_refund.sql 을 SQL 에디터에서 실행해주세요'

function isMissingTable(error: { code?: string } | null) {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

/** 상품명 — 앞뒤 공백 제거, 비었거나 너무 길면 null */
function parseName(raw: unknown): string | null {
  const name = typeof raw === 'string' ? raw.trim() : ''
  return name && name.length <= OFFLINE_PROOF_PRODUCT_NAME_MAX ? name : null
}

/** 기준 가격 — 빈 값은 null(차액 계산 안 함), 그 외에는 0 이상 정수 */
function parsePrice(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null }
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 0 || value > OFFLINE_PROOF_MAX_AMOUNT) return { ok: false }
  return { ok: true, value }
}

/**
 * 관리자 - 증빙 상품 목록 (숨긴 상품 포함)
 * GET /api/admin/offline-proofs/products
 */
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Offline proof products fetch failed:', error)
      if (isMissingTable(error)) return NextResponse.json({ error: NOT_READY_ERROR }, { status: 503 })
      return NextResponse.json({ error: '상품 목록 조회에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error) {
    console.error('Admin offline proof products GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 증빙 상품 추가 (목록 맨 뒤에)
 * POST /api/admin/offline-proofs/products  { name, price? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const name = parseName(body.name)
    if (!name) {
      return NextResponse.json({ error: `상품명을 ${OFFLINE_PROOF_PRODUCT_NAME_MAX}자 이내로 입력해주세요` }, { status: 400 })
    }
    const price = parsePrice(body.price)
    if (!price.ok) {
      return NextResponse.json({ error: '기준 가격을 다시 확인해주세요' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: last } = await serviceClient
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: product, error } = await serviceClient
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .insert({ name, price: price.value, sort_order: (last?.sort_order ?? 0) + 1 })
      .select()
      .single()

    if (error) {
      console.error('Offline proof product insert failed:', error)
      if (isMissingTable(error)) return NextResponse.json({ error: NOT_READY_ERROR }, { status: 503 })
      return NextResponse.json({ error: '상품 추가에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Admin offline proof products POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 증빙 상품 수정 (이름·기준 가격·노출)
 * PATCH /api/admin/offline-proofs/products  { id, name?, price?, is_active? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: '상품 id가 필요합니다' }, { status: 400 })
    }

    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('name' in body) {
      const name = parseName(body.name)
      if (!name) {
        return NextResponse.json({ error: `상품명을 ${OFFLINE_PROOF_PRODUCT_NAME_MAX}자 이내로 입력해주세요` }, { status: 400 })
      }
      changes.name = name
    }
    if ('price' in body) {
      const price = parsePrice(body.price)
      if (!price.ok) {
        return NextResponse.json({ error: '기준 가격을 다시 확인해주세요' }, { status: 400 })
      }
      changes.price = price.value
    }
    if ('is_active' in body) {
      changes.is_active = body.is_active === true
    }

    const serviceClient = createServiceRoleClient()
    const { data: product, error } = await serviceClient
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .update(changes)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Offline proof product update failed:', error)
      return NextResponse.json({ error: '상품 수정에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Admin offline proof products PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 증빙 상품 삭제 (이미 들어온 접수에는 상품명이 그대로 남는다)
 * DELETE /api/admin/offline-proofs/products  { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: '상품 id가 필요합니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient.from(OFFLINE_PROOF_PRODUCTS_TABLE).delete().eq('id', body.id)

    if (error) {
      console.error('Offline proof product delete failed:', error)
      return NextResponse.json({ error: '상품 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin offline proof products DELETE error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
