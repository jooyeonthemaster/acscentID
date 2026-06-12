import { randomBytes, createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'

export const runtime = 'nodejs'

const MAX_ISSUE_QUANTITY = 100
const MAX_DELETE_QUANTITY = 200
// 발급 현황 목록에 한 번에 불러올 최대 행 수. 통계 카드는 별도 count 쿼리로 정확히 집계한다.
const RECENT_LIST_LIMIT = 1000
const DEFAULT_SITE_URL = 'https://www.acscent.co.kr'
const READABLE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const READABLE_CODE_LENGTH = 8
type CouponDiscountType = 'percent' | 'fixed_amount'

interface GeneratedCoupon {
  id: string
  serialNumber: string
  claimUrl: string
  qrImageUrl: string
  title: string
  description: string | null
  discountType: CouponDiscountType
  discountPercent: number
  discountAmount: number
  validUntil: string | null
}

interface LegacyOfflineCouponRow {
  id: string
  code: string
  title: string
  description: string | null
  discount_percent: number
  discount_type?: CouponDiscountType | null
  discount_amount?: number | null
  valid_until: string | null
  is_active: boolean
  created_at: string | null
  user_coupons?: Array<{
    id: string
    claimed_at: string | null
    is_used: boolean | null
  }>
}

interface CouponStats {
  total: number
  active: number
  claimed: number
  used: number
  voided: number
}

function emptyStats(): CouponStats {
  return { total: 0, active: 0, claimed: 0, used: 0, voided: 0 }
}

/**
 * 발급 현황 통계는 목록 한도(RECENT_LIST_LIMIT)와 무관하게 전체를 정확히 집계해야 하므로
 * 상태별 head count 쿼리로 따로 계산한다.
 */
async function fetchOfflineCouponStats(
  serviceClient: ReturnType<typeof createServiceRoleClient>
): Promise<{ stats: CouponStats | null; error: { code?: string; message?: string } | null }> {
  const countByStatus = async (status?: string): Promise<number> => {
    let query = serviceClient
      .from('offline_coupon_codes')
      .select('id', { count: 'exact', head: true })
    if (status) query = query.eq('status', status)
    const { count, error } = await query
    if (error) throw error
    return count || 0
  }

  try {
    const [total, active, claimed, used, voided] = await Promise.all([
      countByStatus(),
      countByStatus('active'),
      countByStatus('claimed'),
      countByStatus('used'),
      countByStatus('void'),
    ])
    return { stats: { total, active, claimed, used, voided }, error: null }
  } catch (error) {
    return { stats: null, error: error as { code?: string; message?: string } }
  }
}

function computeStatsFromRows(rows: Array<{ status: string }>): CouponStats {
  const stats = emptyStats()
  for (const row of rows) {
    stats.total += 1
    if (row.status === 'active') stats.active += 1
    else if (row.status === 'claimed') stats.claimed += 1
    else if (row.status === 'used') stats.used += 1
    else if (row.status === 'void') stats.voided += 1
  }
  return stats
}

function isOfflineCodeTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.message?.includes('offline_coupon_codes') === true
}

function isOfflineTypeUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '23514' || error.message?.includes('coupons_type_check') === true
}

function getSiteUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
  return normalized.replace(/\/$/, '')
}

function getRequestSiteUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  if (!host) return getSiteUrl()

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`.replace(/\/$/, '')
}

function getCouponRegisterSiteUrl(request: NextRequest): string {
  const configuredSiteUrl = getSiteUrl()
  if (!configuredSiteUrl.includes('localhost') && !configuredSiteUrl.includes('127.0.0.1')) {
    return configuredSiteUrl
  }

  return getRequestSiteUrl(request)
}

function buildCouponRegisterUrl(siteUrl: string): string {
  return `${siteUrl}/coupon/register`
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function createToken(): string {
  return toBase64Url(randomBytes(32))
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function createReadableCode(usedCodes: Set<string>): string {
  let code = ''
  do {
    const bytes = randomBytes(READABLE_CODE_LENGTH)
    code = Array.from(bytes)
      .map((byte) => READABLE_CODE_ALPHABET[byte % READABLE_CODE_ALPHABET.length])
      .join('')
  } while (usedCodes.has(code))

  usedCodes.add(code)
  return code
}

function createCouponCode(index: number): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const sequence = index.toString(36).toUpperCase().padStart(2, '0')
  const suffix = randomBytes(2).toString('hex').toUpperCase()
  return `OFF${timestamp}${sequence}${suffix}`.slice(0, 20)
}

function normalizeValidUntil(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59+09:00`).toISOString()
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeDiscountType(value: unknown): CouponDiscountType {
  return value === 'fixed_amount' ? 'fixed_amount' : 'percent'
}

function getDiscountPercentForStorage(discountType: CouponDiscountType, discountValue: number): number {
  return discountType === 'percent' ? discountValue : 0
}

function getDiscountAmountForStorage(discountType: CouponDiscountType, discountValue: number): number {
  return discountType === 'fixed_amount' ? discountValue : 0
}

function getCouponDiscountType(coupon: { discount_type?: CouponDiscountType | null }): CouponDiscountType {
  return coupon.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percent'
}

function getCouponDiscountAmount(coupon: { discount_amount?: number | null }): number {
  return Number(coupon.discount_amount || 0)
}

async function createQrImageDataUrl(claimUrl: string, size: number = 220): Promise<string> {
  return QRCode.toDataURL(claimUrl, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

function toLegacyAdminRow(row: LegacyOfflineCouponRow) {
  const userCoupon = row.user_coupons?.[0]
  const status = userCoupon?.is_used
    ? 'used'
    : userCoupon
      ? 'claimed'
      : row.is_active
        ? 'active'
        : 'void'

  return {
    id: row.id,
    batch_id: row.id,
    batch_name: '기존 쿠폰 테이블 발급',
    serial_number: row.code,
    status,
    claimed_at: userCoupon?.claimed_at || null,
    expires_at: row.valid_until,
    printed_at: row.created_at,
    created_at: row.created_at,
    claim_url: buildCouponRegisterUrl(getSiteUrl()),
    coupon: {
      title: row.title,
      description: row.description,
      discount_percent: row.discount_percent,
      discount_type: getCouponDiscountType(row),
      discount_amount: getCouponDiscountAmount(row),
      valid_until: row.valid_until,
    },
  }
}

async function fetchLegacyOfflineCoupons(serviceClient: ReturnType<typeof createServiceRoleClient>) {
  const { data, error } = await serviceClient
    .from('coupons')
    .select(`
      id,
      code,
      title,
      description,
      discount_percent,
      discount_type,
      discount_amount,
      valid_until,
      is_active,
      created_at,
      user_coupons (
        id,
        claimed_at,
        is_used
      )
    `)
    .in('type', ['welcome', 'offline'])
    .order('created_at', { ascending: false })
    .limit(RECENT_LIST_LIMIT)

  if (error) {
    return { data: null, error }
  }

  const adminRows = ((data || []) as LegacyOfflineCouponRow[])
    .filter((row) => row.code.startsWith('OFF') || /^[A-Z0-9]{8}$/.test(row.code))
    .map(toLegacyAdminRow)

  return {
    data: adminRows,
    error: null,
  }
}

async function issueLegacyOfflineCoupons({
  serviceClient,
  title,
  description,
  discountPercent,
  discountType,
  discountAmount,
  quantity,
  validUntil,
  siteUrl,
}: {
  serviceClient: ReturnType<typeof createServiceRoleClient>
  title: string
  description: string
  discountPercent: number
  discountType: CouponDiscountType
  discountAmount: number
  quantity: number
  validUntil: string | null
  siteUrl: string
}) {
  const usedCodes = new Set<string>()
  const generated = Array.from({ length: quantity }, () => {
    const code = createReadableCode(usedCodes)
    return { code }
  })

  const { data: coupons, error } = await serviceClient
    .from('coupons')
    .insert(generated.map((item) => ({
      code: item.code,
      type: 'welcome',
      discount_percent: discountPercent,
      discount_type: discountType,
      discount_amount: discountAmount,
      title,
      description,
      valid_until: validUntil,
      is_active: true,
    })))
    .select('id, code, title, description, discount_percent, discount_type, discount_amount, valid_until')

  if (error || !coupons) {
    return {
      error,
      coupons: null,
    }
  }

  const claimUrl = buildCouponRegisterUrl(siteUrl)
  const qrImageUrl = await createQrImageDataUrl(claimUrl)
  const printableCoupons: GeneratedCoupon[] = coupons.map((coupon) => ({
    id: coupon.id,
    serialNumber: coupon.code,
    claimUrl,
    qrImageUrl,
    title: coupon.title,
    description: coupon.description,
    discountType: getCouponDiscountType(coupon),
    discountPercent: coupon.discount_percent,
    discountAmount: getCouponDiscountAmount(coupon),
    validUntil: coupon.valid_until,
  }))

  return {
    error: null,
    coupons: printableCoupons,
  }
}

/**
 * 최근 실물 쿠폰 발급 내역
 * GET /api/admin/offline-coupons
 */
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('offline_coupon_codes')
      .select(`
        id,
        batch_id,
        batch_name,
        serial_number,
        status,
        claimed_at,
        expires_at,
        printed_at,
        created_at,
        coupon:coupons (
          title,
          description,
          discount_percent,
          discount_type,
          discount_amount,
          valid_until
        )
      `)
      .order('created_at', { ascending: false })
      .limit(RECENT_LIST_LIMIT)

    if (isOfflineCodeTableMissing(error)) {
      const legacyResult = await fetchLegacyOfflineCoupons(serviceClient)
      if (legacyResult.error) {
        return NextResponse.json(
          { error: '실물 쿠폰 내역을 불러오지 못했습니다', details: legacyResult.error.message },
          { status: 500 }
        )
      }

      const legacyRows = legacyResult.data || []
      return NextResponse.json({
        coupons: legacyRows,
        stats: computeStatsFromRows(legacyRows),
        storageMode: 'coupons',
      })
    }

    if (error) {
      return NextResponse.json(
        { error: '실물 쿠폰 내역을 불러오지 못했습니다', details: error.message },
        { status: 500 }
      )
    }

    // 통계 카드는 목록 한도와 무관하게 전체를 정확히 집계 (count 쿼리)
    const { stats, error: statsError } = await fetchOfflineCouponStats(serviceClient)

    return NextResponse.json({
      coupons: data || [],
      stats: statsError ? computeStatsFromRows(data || []) : stats,
    })
  } catch (error) {
    console.error('Admin offline coupons GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 실물 코드 쿠폰 발급
 * POST /api/admin/offline-coupons
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : '오프라인 구매 고객님께 드리는 실물 코드 쿠폰입니다.'
    const discountType = normalizeDiscountType(body.discountType)
    const rawDiscountValue = body.discountValue ?? body.discountPercent
    const discountValue = Number(rawDiscountValue)
    const discountPercent = getDiscountPercentForStorage(discountType, discountValue)
    const discountAmount = getDiscountAmountForStorage(discountType, discountValue)
    const quantity = Number(body.quantity)
    const validUntil = normalizeValidUntil(body.validUntil)

    if (!title) {
      return NextResponse.json({ error: '쿠폰 이름을 입력해주세요' }, { status: 400 })
    }

    if (discountType === 'percent' && (!Number.isInteger(discountValue) || discountValue < 1 || discountValue > 100)) {
      return NextResponse.json({ error: '할인율은 1부터 100 사이의 정수여야 합니다' }, { status: 400 })
    }

    if (discountType === 'fixed_amount' && (!Number.isInteger(discountValue) || discountValue < 100 || discountValue > 1000000)) {
      return NextResponse.json({ error: '정액 할인 금액은 100원부터 1,000,000원 사이의 정수여야 합니다' }, { status: 400 })
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ISSUE_QUANTITY) {
      return NextResponse.json(
        { error: `발급 수량은 1부터 ${MAX_ISSUE_QUANTITY} 사이여야 합니다` },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    const now = new Date()
    const batchId = randomUUID()
    const batchName = `${title} ${now.toLocaleDateString('ko-KR')}`

    const siteUrl = getCouponRegisterSiteUrl(request)
    const couponRegisterUrl = buildCouponRegisterUrl(siteUrl)
    const couponRegisterQrImageUrl = await createQrImageDataUrl(couponRegisterUrl)
    const usedSerials = new Set<string>()
    const generated = Array.from({ length: quantity }, (_, index) => {
      const token = createToken()

      return {
        token,
        couponCode: createCouponCode(index + 1),
        serialNumber: createReadableCode(usedSerials),
        claimUrl: couponRegisterUrl,
        tokenHash: hashToken(token),
      }
    })

    let { data: coupons, error: couponError } = await serviceClient
      .from('coupons')
      .insert(generated.map((item) => ({
        code: item.couponCode,
        type: 'offline',
        discount_percent: discountPercent,
        discount_type: discountType,
        discount_amount: discountAmount,
        title,
        description,
        valid_until: validUntil,
        is_active: true,
      })))
      .select('*')

    if (isOfflineTypeUnavailable(couponError)) {
      const legacyResult = await issueLegacyOfflineCoupons({
        serviceClient,
        title,
        description,
        discountPercent,
        discountType,
        discountAmount,
        quantity,
        validUntil,
        siteUrl,
      })

      if (legacyResult.error || !legacyResult.coupons) {
        return NextResponse.json(
          { error: '쿠폰 생성에 실패했습니다', details: legacyResult.error?.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        batchId,
        batchName,
        storageMode: 'coupons',
        coupons: legacyResult.coupons,
      })
    }

    if (couponError || !coupons || coupons.length !== generated.length) {
      return NextResponse.json(
        { error: '쿠폰 템플릿 생성에 실패했습니다', details: couponError?.message },
        { status: 500 }
      )
    }

    const couponByCode = new Map<string, {
      id: string
      code: string
      title: string
      description: string | null
      discount_percent: number
      discount_type?: CouponDiscountType | null
      discount_amount?: number | null
      valid_until: string | null
    }>(coupons.map((coupon) => [coupon.code, coupon]))

    const { data: insertedCodes, error: insertCodesError } = await serviceClient
      .from('offline_coupon_codes')
      .insert(generated.map((item) => ({
        coupon_id: couponByCode.get(item.couponCode)?.id,
        batch_id: batchId,
        batch_name: batchName,
        serial_number: item.serialNumber,
        token_hash: item.tokenHash,
        status: 'active',
        expires_at: validUntil,
        issued_by_admin_email: admin.email,
      })))
      .select('id, serial_number')

    if (insertCodesError || !insertedCodes) {
      await serviceClient
        .from('coupons')
        .delete()
        .in('id', Array.from(couponByCode.values()).map((coupon) => coupon.id))

      return NextResponse.json(
        { error: '고유 쿠폰 코드 생성에 실패했습니다', details: insertCodesError?.message },
        { status: 500 }
      )
    }

    const idBySerial = new Map<string, string>(
      insertedCodes.map((code) => [code.serial_number, code.id])
    )

    const printableCoupons: GeneratedCoupon[] = generated.map((item) => {
      const coupon = couponByCode.get(item.couponCode)
      return {
        id: idBySerial.get(item.serialNumber) || item.serialNumber,
        serialNumber: item.serialNumber,
        claimUrl: item.claimUrl,
        qrImageUrl: couponRegisterQrImageUrl,
        title: coupon?.title || title,
        description: coupon?.description || description,
        discountType: getCouponDiscountType(coupon || { discount_type: discountType }),
        discountPercent: coupon?.discount_percent ?? discountPercent,
        discountAmount: getCouponDiscountAmount(coupon || { discount_amount: discountAmount }),
        validUntil: coupon?.valid_until || validUntil,
      }
    })

    return NextResponse.json({
      success: true,
      batchId,
      batchName,
      couponIds: Array.from(couponByCode.values()).map((coupon) => coupon.id),
      coupons: printableCoupons,
    })
  } catch (error) {
    console.error('Admin offline coupons POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 실물 코드 쿠폰 발급 취소
 * DELETE /api/admin/offline-coupons
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const ids = Array.isArray(body.ids)
      ? body.ids
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
      : []
    const uniqueIds = Array.from(new Set(ids))

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: '삭제할 쿠폰을 선택해주세요' }, { status: 400 })
    }

    if (uniqueIds.length > MAX_DELETE_QUANTITY) {
      return NextResponse.json(
        { error: `한 번에 삭제할 수 있는 쿠폰은 최대 ${MAX_DELETE_QUANTITY}장입니다` },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    const nowIso = new Date().toISOString()
    const { data: cancelledCodes, error } = await serviceClient
      .from('offline_coupon_codes')
      .update({
        status: 'void',
        updated_at: nowIso,
      })
      .in('id', uniqueIds)
      .eq('status', 'active')
      .select('id')

    if (isOfflineCodeTableMissing(error)) {
      const { data: legacyCoupons, error: legacyError } = await serviceClient
        .from('coupons')
        .update({ is_active: false })
        .in('id', uniqueIds)
        .like('code', 'OFF%')
        .eq('is_active', true)
        .select('id')

      if (legacyError) {
        return NextResponse.json(
          { error: '쿠폰 삭제에 실패했습니다', details: legacyError.message },
          { status: 500 }
        )
      }

      const cancelledIds = (legacyCoupons || []).map((coupon) => coupon.id)
      const cancelledIdSet = new Set(cancelledIds)

      return NextResponse.json({
        success: true,
        cancelledCount: cancelledIds.length,
        skippedCount: uniqueIds.length - cancelledIds.length,
        cancelledIds,
        skippedIds: uniqueIds.filter((id) => !cancelledIdSet.has(id)),
        storageMode: 'coupons',
      })
    }

    if (error) {
      return NextResponse.json(
        { error: '쿠폰 삭제에 실패했습니다', details: error.message },
        { status: 500 }
      )
    }

    const cancelledIds = (cancelledCodes || []).map((code) => code.id)
    const cancelledIdSet = new Set(cancelledIds)

    return NextResponse.json({
      success: true,
      cancelledCount: cancelledIds.length,
      skippedCount: uniqueIds.length - cancelledIds.length,
      cancelledIds,
      skippedIds: uniqueIds.filter((id) => !cancelledIdSet.has(id)),
    })
  } catch (error) {
    console.error('Admin offline coupons DELETE error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
