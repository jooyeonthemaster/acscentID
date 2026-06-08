import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-user'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { normalizeAddress, isFilledAddress } from '@/lib/user/address'

/**
 * 기본 배송지 — user_profiles.preferences.shipping_address 에 저장.
 */

// GET /api/user/address - 저장된 기본 배송지 조회
export async function GET() {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('user_profiles')
    .select('preferences')
    .eq('id', authUser.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load address:', error)
    return NextResponse.json({ error: '배송지를 불러오지 못했습니다.' }, { status: 500 })
  }

  const prefs = (data?.preferences ?? {}) as Record<string, unknown>
  const address = prefs.shipping_address ?? null
  return NextResponse.json({ address })
}

// PUT /api/user/address - 기본 배송지 저장/갱신
export async function PUT(request: NextRequest) {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const address = normalizeAddress(body)

  if (!isFilledAddress(address)) {
    return NextResponse.json(
      { error: '받는 분, 연락처, 우편번호, 주소를 모두 입력해주세요.' },
      { status: 400 },
    )
  }

  const service = createServiceRoleClient()

  // 기존 preferences 유지하며 shipping_address만 병합
  const { data: existing } = await service
    .from('user_profiles')
    .select('preferences')
    .eq('id', authUser.id)
    .maybeSingle()

  const prefs = (existing?.preferences ?? {}) as Record<string, unknown>
  prefs.shipping_address = address

  const profile = {
    id: authUser.id,
    preferences: prefs,
    updated_at: new Date().toISOString(),
    ...(authUser.email ? { email: authUser.email } : {}),
    provider: authUser.provider,
  }

  const { error } = await service.from('user_profiles').upsert(
    profile,
    { onConflict: 'id' },
  )

  if (error) {
    console.error('Failed to save address:', error)
    return NextResponse.json({ error: '배송지 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ address })
}

// DELETE /api/user/address - 기본 배송지 삭제
export async function DELETE() {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const { data: existing } = await service
    .from('user_profiles')
    .select('preferences')
    .eq('id', authUser.id)
    .maybeSingle()

  const prefs = (existing?.preferences ?? {}) as Record<string, unknown>
  delete prefs.shipping_address

  const { error } = await service
    .from('user_profiles')
    .update({ preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', authUser.id)

  if (error) {
    console.error('Failed to delete address:', error)
    return NextResponse.json({ error: '배송지 삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
