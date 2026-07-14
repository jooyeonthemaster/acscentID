import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  mapPaymentLinkRow,
  type PaymentLinkRow,
} from '@/lib/payment-links/payment-links'

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null
}

function cleanExpiresAt(value: unknown): string | null {
  const text = cleanText(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    Boolean(candidate.message?.includes('admin_payment_links'))
  )
}

// URL-safe한 랜덤 토큰 (base64url, 12자). 충돌 시 POST에서 재시도한다.
function generateToken(): string {
  return randomBytes(9).toString('base64url')
}

const TABLE_UNAVAILABLE_MESSAGE =
  '개인결제창 테이블이 아직 없습니다. `20260709_admin_payment_links.sql` 마이그레이션을 적용해주세요.'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_payment_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ links: [], unavailable: true, message: TABLE_UNAVAILABLE_MESSAGE })
    }
    console.error('[admin/payment-links GET] DB error:', error)
    return NextResponse.json({ error: '결제창 목록 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({
    links: ((data ?? []) as PaymentLinkRow[]).map(mapPaymentLinkRow),
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const title = cleanText(body.title)
  const description = cleanText(body.description)
  const imageUrl = cleanText(body.image_url) || null
  const memo = cleanText(body.memo)
  const amount = cleanAmount(body.amount)
  const expiresAt = cleanExpiresAt(body.expires_at)
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true

  if (!title) return NextResponse.json({ error: '결제 항목명(제목)은 필수입니다' }, { status: 400 })
  if (amount === null) return NextResponse.json({ error: '결제 금액은 0 이상의 정수여야 합니다' }, { status: 400 })

  const client = createServiceRoleClient()
  const now = new Date().toISOString()

  // 토큰 충돌(23505) 시 최대 5회 재시도
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateToken()
    const { data, error } = await client
      .from('admin_payment_links')
      .insert({
        token,
        title,
        description,
        amount,
        image_url: imageUrl,
        is_active: isActive,
        expires_at: expiresAt,
        memo,
        created_by: admin.email,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()

    if (!error) {
      return NextResponse.json({ link: mapPaymentLinkRow(data as PaymentLinkRow) }, { status: 201 })
    }

    if (error.code === '23505') {
      // token 유니크 충돌 — 새 토큰으로 재시도
      continue
    }
    if (isMissingTable(error)) {
      return NextResponse.json({ error: TABLE_UNAVAILABLE_MESSAGE }, { status: 503 })
    }
    console.error('[admin/payment-links POST] DB error:', error)
    return NextResponse.json({ error: '결제창 생성 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: '토큰 생성에 반복 실패했습니다. 다시 시도해주세요' }, { status: 500 })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const id = cleanText(body.id)
  if (!id) return NextResponse.json({ error: 'id는 필수입니다' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.title !== undefined) {
    const title = cleanText(body.title)
    if (!title) return NextResponse.json({ error: '제목은 비워둘 수 없습니다' }, { status: 400 })
    updates.title = title
  }
  if (body.description !== undefined) updates.description = cleanText(body.description)
  if (body.image_url !== undefined) updates.image_url = cleanText(body.image_url) || null
  if (body.memo !== undefined) updates.memo = cleanText(body.memo)
  if (body.amount !== undefined) {
    const amount = cleanAmount(body.amount)
    if (amount === null) return NextResponse.json({ error: '결제 금액은 0 이상의 정수여야 합니다' }, { status: 400 })
    updates.amount = amount
  }
  if (body.expires_at !== undefined) updates.expires_at = cleanExpiresAt(body.expires_at)
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_payment_links')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: TABLE_UNAVAILABLE_MESSAGE }, { status: 503 })
    }
    console.error('[admin/payment-links PATCH] DB error:', error)
    return NextResponse.json({ error: '결제창 수정 실패', details: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: '결제창을 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ link: mapPaymentLinkRow(data as PaymentLinkRow) })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const id = cleanText(body.id)
  if (!id) return NextResponse.json({ error: 'id는 필수입니다' }, { status: 400 })

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_payment_links')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: TABLE_UNAVAILABLE_MESSAGE }, { status: 503 })
    }
    console.error('[admin/payment-links DELETE] DB error:', error)
    return NextResponse.json({ error: '결제창 삭제 실패', details: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: '결제창을 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ deleted: mapPaymentLinkRow(data as PaymentLinkRow) })
}
