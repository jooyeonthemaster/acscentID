import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { isSnapshotColumnMissing } from '@/lib/coupons/user-coupon-discount'

export const runtime = 'nodejs'

type CouponDiscountType = 'percent' | 'fixed_amount'

const REPURCHASE_TYPE = 'repurchase'
const DEFAULT_TITLE = '재구매 감사'
const DEFAULT_DESCRIPTION = '첫 구매 완료 후 재구매 시 적용 가능한 감사 할인'

interface RepurchaseCouponSettings {
  id: string | null
  isActive: boolean
  discountType: CouponDiscountType
  discountPercent: number
  discountAmount: number
  title: string
  description: string | null
  validUntil: string | null
}

function normalizeDiscountType(value: unknown): CouponDiscountType {
  return value === 'fixed_amount' ? 'fixed_amount' : 'percent'
}

/**
 * 재구매 템플릿 행은 유일해야 하므로 가장 먼저 생성된 행을 정본으로 사용.
 * (활성 행을 우선하되, 없으면 비활성 행이라도 반환)
 */
async function fetchTemplateRow(
  serviceClient: ReturnType<typeof createServiceRoleClient>
) {
  const { data, error } = await serviceClient
    .from('coupons')
    .select('*')
    .eq('type', REPURCHASE_TYPE)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

function toSettings(row: Record<string, unknown> | null): RepurchaseCouponSettings {
  if (!row) {
    return {
      id: null,
      isActive: false,
      discountType: 'percent',
      discountPercent: 10,
      discountAmount: 0,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      validUntil: null,
    }
  }

  return {
    id: String(row.id),
    isActive: Boolean(row.is_active),
    discountType: normalizeDiscountType(row.discount_type),
    discountPercent: Number(row.discount_percent || 0),
    discountAmount: Number(row.discount_amount || 0),
    title: String(row.title || DEFAULT_TITLE),
    description: (row.description as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
  }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const serviceClient = createServiceRoleClient()
    const row = await fetchTemplateRow(serviceClient)

    // 변경 시 영향받을 "미사용 재구매 쿠폰" 수 (소급 여부 안내용)
    let unusedCount = 0
    if (row?.id) {
      const { count } = await serviceClient
        .from('user_coupons')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', row.id)
        .eq('is_used', false)
      unusedCount = count || 0
    }

    return NextResponse.json({ settings: toSettings(row), unusedCount })
  } catch (err) {
    console.error('[RepurchaseCoupon] GET failed:', err)
    return NextResponse.json(
      { error: '재구매 할인 설정을 불러오지 못했습니다' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: {
    isActive?: boolean
    discountType?: string
    discountValue?: number | string
    applyToExisting?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  // true  = 기존 미사용 쿠폰에도 새 할인 소급 적용
  // false = 신규 발급분부터만. 기존 미사용분은 예전 할인값으로 잠근다.
  const applyToExisting = body.applyToExisting === true
  const isActive = Boolean(body.isActive)
  const discountType = normalizeDiscountType(body.discountType)
  const discountValue = Math.floor(Number(body.discountValue))

  // DB 제약(coupons_discount_value_check)에 맞춰 한쪽 값만 양수로, 나머지는 0으로 저장.
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: '할인 값을 입력해주세요' }, { status: 400 })
  }
  if (discountType === 'percent' && discountValue > 100) {
    return NextResponse.json({ error: '할인율은 1~100% 사이여야 합니다' }, { status: 400 })
  }
  if (discountType === 'fixed_amount' && discountValue > 1_000_000) {
    return NextResponse.json({ error: '할인 금액이 너무 큽니다' }, { status: 400 })
  }

  const discountPercent = discountType === 'percent' ? discountValue : 0
  const discountAmount = discountType === 'fixed_amount' ? discountValue : 0

  try {
    const serviceClient = createServiceRoleClient()
    const existing = await fetchTemplateRow(serviceClient)

    const payload = {
      discount_type: discountType,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      is_active: isActive,
    }

    if (existing) {
      // 신규 발급분부터만 적용: 템플릿을 바꾸기 전에, 아직 스냅샷이 없어 템플릿을 따르던
      // 미사용 쿠폰들을 "예전 값"으로 잠가 기존 할인을 유지시킨다.
      if (!applyToExisting) {
        const { error: lockError } = await serviceClient
          .from('user_coupons')
          .update({
            discount_type: normalizeDiscountType(existing.discount_type),
            discount_percent: Number(existing.discount_percent || 0),
            discount_amount: Number(existing.discount_amount || 0),
          })
          .eq('coupon_id', existing.id)
          .eq('is_used', false)
          .is('discount_type', null)

        if (lockError) {
          // 스냅샷 컬럼이 없으면(마이그레이션 전) "신규부터만"을 보장할 수 없으므로 안내.
          if (isSnapshotColumnMissing(lockError)) {
            return NextResponse.json(
              { error: '쿠폰 스냅샷 컬럼이 없어 "신규 발급분부터만" 적용을 보장할 수 없습니다. 마이그레이션(20260609)을 먼저 실행해주세요.' },
              { status: 409 }
            )
          }
          throw new Error(lockError.message)
        }
      }

      const { data, error } = await serviceClient
        .from('coupons')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)

      // 소급 적용: 미사용 쿠폰의 스냅샷을 제거해 모두 새 템플릿 값을 따르게 한다.
      if (applyToExisting) {
        const { error: resetError } = await serviceClient
          .from('user_coupons')
          .update({ discount_type: null, discount_percent: null, discount_amount: null })
          .eq('coupon_id', existing.id)
          .eq('is_used', false)

        // 컬럼이 없으면 스냅샷 자체가 없는 상태 = 이미 템플릿을 따르므로 무시해도 안전.
        if (resetError && !isSnapshotColumnMissing(resetError)) {
          throw new Error(resetError.message)
        }
      }

      return NextResponse.json({ success: true, settings: toSettings(data) })
    }

    // 템플릿이 없으면 새로 생성 (code는 유니크 제약이므로 임의 부여)
    const generatedCode = `REPURCHASE${randomBytes(3).toString('hex').toUpperCase()}`
    const { data, error } = await serviceClient
      .from('coupons')
      .insert({
        ...payload,
        code: generatedCode,
        type: REPURCHASE_TYPE,
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, settings: toSettings(data) })
  } catch (err) {
    console.error('[RepurchaseCoupon] PUT failed:', err)
    return NextResponse.json(
      { error: '재구매 할인 설정 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}
