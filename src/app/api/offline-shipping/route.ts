import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  SHIP_COUPON_MAX_PER_REQUEST,
  SHIP_COUPON_TABLE,
  formatShipCouponCode,
  isShipCouponTableMissing,
  normalizeShipCouponCode,
  summarizeShipCouponProducts,
} from '@/lib/offline-shipping-coupons'

export const runtime = 'nodejs'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 전화번호 — 숫자/하이픈/공백/괄호/+ 만 허용, 숫자 9~11자리
const PHONE_ALLOWED_PATTERN = /^[\d\-\s()+]+$/

interface FieldSpec {
  key: 'name' | 'phone' | 'zip_code' | 'address' | 'address_detail'
  label: string
  required: boolean
  maxLength: number
}

const FIELD_SPECS: FieldSpec[] = [
  { key: 'name', label: '이름', required: true, maxLength: 50 },
  { key: 'phone', label: '연락처', required: true, maxLength: 20 },
  { key: 'zip_code', label: '우편번호', required: false, maxLength: 10 },
  { key: 'address', label: '주소', required: true, maxLength: 200 },
  { key: 'address_detail', label: '상세주소', required: false, maxLength: 100 },
]

const SUBMIT_FAILED = '접수에 실패했습니다. 잠시 후 다시 시도해주세요'

/** TB-YYMMDD-XXXX 형식 접수번호 생성 */
function generateRequestNumber(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS)
  const ymd = kst.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Array.from({ length: 4 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]
  ).join('')
  return `TB-${ymd}-${rand}`
}

/**
 * 오프라인 매장 택배 접수 (QR 폼 /ship 전용, 비로그인 공개)
 * POST /api/offline-shipping
 *
 * 택배 교환권이 있어야 접수된다. 교환권은 한 번만 쓸 수 있고, 상품은 교환권에 정해진 상품으로 채운다.
 * 순서: 교환권을 'used' 로 잠금(조건부 update) → 접수 저장 → 교환권에 접수 건 연결. 저장이 실패하면 잠금을 푼다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    // 허니팟 — 봇이 숨겨진 필드를 채우면 저장 없이 성공한 것처럼 응답
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true, requestNumber: generateRequestNumber() })
    }

    const values: Record<string, string | null> = {}
    for (const spec of FIELD_SPECS) {
      const raw = body[spec.key]
      const value = typeof raw === 'string' ? raw.trim() : ''
      if (spec.required && !value) {
        return NextResponse.json({ error: `${spec.label}을(를) 입력해주세요` }, { status: 400 })
      }
      if (value.length > spec.maxLength) {
        return NextResponse.json(
          { error: `${spec.label}은(는) ${spec.maxLength}자 이내로 입력해주세요` },
          { status: 400 }
        )
      }
      values[spec.key] = value || null
    }

    const phone = values.phone as string
    const phoneDigits = phone.replace(/\D/g, '')
    if (!PHONE_ALLOWED_PATTERN.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 11) {
      return NextResponse.json({ error: '올바른 연락처를 입력해주세요' }, { status: 400 })
    }

    const rawCodes: unknown[] = Array.isArray(body.coupon_codes) ? body.coupon_codes : []
    const codes = [...new Set(rawCodes.filter((c): c is string => typeof c === 'string').map(normalizeShipCouponCode))]
      .filter(Boolean)
    if (codes.length === 0) {
      return NextResponse.json({ error: '택배 교환권이 필요합니다' }, { status: 400 })
    }
    if (codes.length > SHIP_COUPON_MAX_PER_REQUEST) {
      return NextResponse.json(
        { error: `교환권은 한 번에 ${SHIP_COUPON_MAX_PER_REQUEST}장까지 접수할 수 있어요` },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    const { data: coupons, error: lookupError } = await serviceClient
      .from(SHIP_COUPON_TABLE)
      .select('id, code, product_name, status')
      .in('code', codes)

    if (isShipCouponTableMissing(lookupError)) {
      return NextResponse.json({ error: '택배 접수를 준비하고 있어요. 매장 스태프에게 문의해주세요.' }, { status: 503 })
    }
    if (lookupError || !coupons) {
      console.error('Ship coupon lookup failed:', lookupError)
      return NextResponse.json({ error: SUBMIT_FAILED }, { status: 500 })
    }

    // 없는 코드·이미 쓴 코드는 어떤 코드인지 알려 줘서 폼이 빼고 다시 보낼 수 있게 한다
    const byCode = new Map(coupons.map((coupon) => [coupon.code, coupon]))
    const unusable = codes.filter((code) => byCode.get(code)?.status !== 'active')
    if (unusable.length > 0) {
      return NextResponse.json(
        {
          error: `쓸 수 없는 교환권이 있어요: ${unusable.map(formatShipCouponCode).join(', ')} (이미 접수했거나 없는 교환권)`,
          unusableCodes: unusable,
        },
        { status: 409 }
      )
    }

    const couponIds = coupons.map((coupon) => coupon.id)
    const usedAt = new Date().toISOString()

    // 동시에 같은 교환권으로 두 번 접수해도 한쪽만 잠기도록 status='active' 조건을 건다
    const { data: locked, error: lockError } = await serviceClient
      .from(SHIP_COUPON_TABLE)
      .update({ status: 'used', used_at: usedAt, updated_at: usedAt })
      .in('id', couponIds)
      .eq('status', 'active')
      .select('id')

    const releaseLocks = async (ids: string[]) => {
      if (ids.length === 0) return
      const { error } = await serviceClient
        .from(SHIP_COUPON_TABLE)
        .update({ status: 'active', used_at: null, updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('used_at', usedAt)
        .is('shipping_request_id', null)
      if (error) console.error('Ship coupon lock release failed:', error, ids)
    }

    if (lockError || !locked || locked.length !== couponIds.length) {
      await releaseLocks((locked || []).map((row) => row.id))
      if (lockError) {
        console.error('Ship coupon lock failed:', lockError)
        return NextResponse.json({ error: SUBMIT_FAILED }, { status: 500 })
      }
      const lockedIds = new Set((locked || []).map((row) => row.id))
      const taken = coupons.filter((coupon) => !lockedIds.has(coupon.id)).map((coupon) => coupon.code)
      return NextResponse.json(
        {
          error: `방금 다른 접수에 쓰인 교환권이 있어요: ${taken.map(formatShipCouponCode).join(', ')}`,
          unusableCodes: taken,
        },
        { status: 409 }
      )
    }

    // 상품 칸은 손님 입력 대신 교환권 순서(손님이 추가한 순서)대로 요약
    const productName = summarizeShipCouponProducts(
      codes.map((code) => byCode.get(code)?.product_name).filter((name): name is string => !!name)
    )

    // 접수번호 유니크 충돌(23505) 시 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = generateRequestNumber()
      const { data, error } = await serviceClient
        .from('offline_shipping_requests')
        .insert({
          request_number: requestNumber,
          name: values.name,
          phone,
          zip_code: values.zip_code,
          address: values.address,
          address_detail: values.address_detail,
          product_name: productName,
          status: 'received',
        })
        .select('id, request_number')
        .single()

      if (!error) {
        const { error: linkError } = await serviceClient
          .from(SHIP_COUPON_TABLE)
          .update({ shipping_request_id: data.id, updated_at: new Date().toISOString() })
          .in('id', couponIds)
        // 연결이 실패해도 교환권은 이미 'used' 라 다시 쓰이지 않는다 — 기록만 남긴다
        if (linkError) console.error('Ship coupon link failed:', linkError, data.request_number, codes)

        return NextResponse.json({ success: true, requestNumber: data.request_number, productName })
      }
      if (error.code !== '23505') {
        console.error('Offline shipping insert failed:', error)
        break
      }
    }

    await releaseLocks(couponIds)
    return NextResponse.json({ error: SUBMIT_FAILED }, { status: 500 })
  } catch (error) {
    console.error('Offline shipping POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
