import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAuthenticatedUser } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const CLAIMABLE_STATUSES = ['active']

interface CouponRow {
  id: string
  code: string
  type: string
  discount_percent: number
  discount_type?: string | null
  discount_amount?: number | null
  title: string
  description: string | null
  valid_until: string | null
  is_active: boolean
}

interface OfflineCouponCodeRow {
  id: string
  coupon_id: string
  serial_number: string
  status: string
  claimed_by_user_id: string | null
  user_coupon_id: string | null
  claimed_at: string | null
  expires_at: string | null
  coupon: CouponRow | CouponRow[] | null
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function isOfflineCodeTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.message?.includes('offline_coupon_codes') === true
}

function normalizeSerialNumber(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeLegacyOfflineCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '')
}

function isLegacyOfflineCode(value: string): boolean {
  return value.startsWith('OFF') || /^[A-Z0-9]{8}$/.test(value)
}

function isLegacyOfflineCoupon(coupon: CouponRow): boolean {
  if (coupon.code.startsWith('OFF')) return true
  return coupon.type === 'welcome' && /^[A-Z0-9]{8}$/.test(coupon.code) && coupon.title !== '웰컴 쿠폰'
}

function getCoupon(row: OfflineCouponCodeRow): CouponRow | null {
  if (Array.isArray(row.coupon)) return row.coupon[0] || null
  return row.coupon
}

function formatClaimMessage(title: string): string {
  const couponTitle = title.endsWith('쿠폰') ? title : `${title} 쿠폰`
  return `${couponTitle}이 쿠폰함에 저장되었습니다`
}

async function claimLegacyOfflineCoupon({
  serviceClient,
  userId,
  rawCode,
}: {
  serviceClient: ReturnType<typeof createServiceRoleClient>
  userId: string
  rawCode: string
}) {
  const legacyCode = normalizeLegacyOfflineCode(rawCode)
  if (!isLegacyOfflineCode(legacyCode)) {
    return NextResponse.json(
      { success: false, error: '등록할 수 없는 쿠폰입니다' },
      { status: 404 }
    )
  }

  const { data: coupon, error: couponError } = await serviceClient
    .from('coupons')
    .select('*')
    .eq('code', legacyCode)
    .maybeSingle<CouponRow>()

  if (couponError) {
    console.error('Legacy offline coupon lookup failed:', couponError)
    return NextResponse.json(
      { success: false, error: '쿠폰 조회에 실패했습니다' },
      { status: 500 }
    )
  }

  if (!coupon) {
    return NextResponse.json(
      { success: false, error: '등록할 수 없는 쿠폰입니다' },
      { status: 404 }
    )
  }

  if (!isLegacyOfflineCoupon(coupon)) {
    return NextResponse.json(
      { success: false, error: '등록할 수 없는 쿠폰입니다' },
      { status: 404 }
    )
  }

  if (!coupon.is_active) {
    const { data: claimedCoupon } = await serviceClient
      .from('user_coupons')
      .select('id')
      .eq('coupon_id', coupon.id)
      .maybeSingle()

    return NextResponse.json(
      {
        success: false,
        error: claimedCoupon ? '이미 등록된 쿠폰입니다' : '발급이 취소된 쿠폰입니다',
      },
      { status: 409 }
    )
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return NextResponse.json(
      { success: false, error: '쿠폰 유효기간이 만료되었습니다' },
      { status: 400 }
    )
  }

  const { data: lockedCoupon, error: lockError } = await serviceClient
    .from('coupons')
    .update({ is_active: false })
    .eq('id', coupon.id)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  if (lockError) {
    console.error('Legacy offline coupon lock failed:', lockError)
    return NextResponse.json(
      { success: false, error: '쿠폰 등록에 실패했습니다' },
      { status: 500 }
    )
  }

  if (!lockedCoupon) {
    return NextResponse.json(
      { success: false, error: '이미 등록된 쿠폰입니다' },
      { status: 409 }
    )
  }

  const nowIso = new Date().toISOString()
  const { data: userCoupon, error: insertError } = await serviceClient
    .from('user_coupons')
    .insert({
      user_id: userId,
      coupon_id: coupon.id,
      claimed_at: nowIso,
      is_used: false,
    })
    .select(`
      *,
      coupon:coupons(*)
    `)
    .single()

  if (insertError || !userCoupon) {
    await serviceClient
      .from('coupons')
      .update({ is_active: true })
      .eq('id', coupon.id)

    console.error('Legacy offline user coupon insert failed:', insertError)
    return NextResponse.json(
      { success: false, error: '쿠폰함 저장에 실패했습니다' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: formatClaimMessage(coupon.title),
    userCoupon,
  })
}

/**
 * 실물 QR 쿠폰 등록
 * POST /api/coupons/offline/claim
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다', requireLogin: true },
        { status: 401 }
      )
    }

    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const code = typeof body.code === 'string' ? normalizeSerialNumber(body.code) : ''
    const legacyCodeCandidate = token || code

    if (!token && !code) {
      return NextResponse.json(
        { success: false, error: '쿠폰 QR 또는 쿠폰 코드가 필요합니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    let query = serviceClient
      .from('offline_coupon_codes')
      .select(`
        id,
        coupon_id,
        serial_number,
        status,
        claimed_by_user_id,
        user_coupon_id,
        claimed_at,
        expires_at,
        coupon:coupons (
          id,
          code,
          type,
          discount_percent,
          discount_type,
          discount_amount,
          title,
          description,
          valid_until,
          is_active
        )
      `)

    if (token) {
      query = query.eq('token_hash', hashToken(token))
    } else {
      query = query.eq('serial_number', code)
    }

    const { data: offlineCode, error: lookupError } = await query
      .maybeSingle<OfflineCouponCodeRow>()

    if (isOfflineCodeTableMissing(lookupError)) {
      return claimLegacyOfflineCoupon({
        serviceClient,
        userId: user.id,
        rawCode: legacyCodeCandidate,
      })
    }

    if (lookupError) {
      console.error('Offline coupon lookup failed:', lookupError)
      return NextResponse.json(
        { success: false, error: '쿠폰 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    if (!offlineCode) {
      if (legacyCodeCandidate && isLegacyOfflineCode(normalizeLegacyOfflineCode(legacyCodeCandidate))) {
        return claimLegacyOfflineCoupon({
          serviceClient,
          userId: user.id,
          rawCode: legacyCodeCandidate,
        })
      }

      return NextResponse.json(
        { success: false, error: '등록할 수 없는 쿠폰입니다' },
        { status: 404 }
      )
    }

    const coupon = getCoupon(offlineCode)
    if (!coupon || coupon.type !== 'offline') {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 쿠폰입니다' },
        { status: 400 }
      )
    }

    if (offlineCode.status === 'void') {
      return NextResponse.json(
        { success: false, error: '발급이 취소된 쿠폰입니다' },
        { status: 409 }
      )
    }

    if (!CLAIMABLE_STATUSES.includes(offlineCode.status)) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 쿠폰입니다' },
        { status: 409 }
      )
    }

    if (!coupon.is_active) {
      return NextResponse.json(
        { success: false, error: '발급이 취소된 쿠폰입니다' },
        { status: 409 }
      )
    }

    const now = new Date()
    const expiresAt = offlineCode.expires_at || coupon.valid_until
    if (expiresAt && new Date(expiresAt) < now) {
      return NextResponse.json(
        { success: false, error: '쿠폰 유효기간이 만료되었습니다' },
        { status: 400 }
      )
    }

    const { data: existingCoupon } = await serviceClient
      .from('user_coupons')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', coupon.id)
      .maybeSingle()

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: '이미 같은 쿠폰을 보유하고 있습니다' },
        { status: 409 }
      )
    }

    const nowIso = now.toISOString()
    const { data: lockedCode, error: lockError } = await serviceClient
      .from('offline_coupon_codes')
      .update({
        status: 'claimed',
        claimed_by_user_id: user.id,
        claimed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', offlineCode.id)
      .in('status', CLAIMABLE_STATUSES)
      .is('claimed_by_user_id', null)
      .select('id')
      .maybeSingle()

    if (lockError) {
      console.error('Offline coupon lock failed:', lockError)
      return NextResponse.json(
        { success: false, error: '쿠폰 등록에 실패했습니다' },
        { status: 500 }
      )
    }

    if (!lockedCode) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 쿠폰입니다' },
        { status: 409 }
      )
    }

    const { data: userCoupon, error: insertError } = await serviceClient
      .from('user_coupons')
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
        claimed_at: nowIso,
        is_used: false,
      })
      .select(`
        *,
        coupon:coupons(*)
      `)
      .single()

    if (insertError || !userCoupon) {
      await serviceClient
        .from('offline_coupon_codes')
        .update({
          status: 'active',
          claimed_by_user_id: null,
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offlineCode.id)
        .eq('claimed_by_user_id', user.id)
        .is('user_coupon_id', null)

      console.error('Offline coupon user coupon insert failed:', insertError)
      return NextResponse.json(
        { success: false, error: '쿠폰함 저장에 실패했습니다' },
        { status: 500 }
      )
    }

    await serviceClient
      .from('offline_coupon_codes')
      .update({
        user_coupon_id: userCoupon.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offlineCode.id)

    return NextResponse.json({
      success: true,
      message: formatClaimMessage(coupon.title),
      userCoupon,
    })
  } catch (error) {
    console.error('Offline coupon claim API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
