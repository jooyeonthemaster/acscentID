import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 전화번호 — 숫자/하이픈/공백/괄호/+ 만 허용, 숫자 9~11자리
const PHONE_ALLOWED_PATTERN = /^[\d\-\s()+]+$/

interface FieldSpec {
  key: 'name' | 'phone' | 'zip_code' | 'address' | 'address_detail' | 'product_name'
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
  { key: 'product_name', label: '상품', required: false, maxLength: 100 },
]

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

    const serviceClient = createServiceRoleClient()

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
          product_name: values.product_name,
          status: 'received',
        })
        .select('request_number')
        .single()

      if (!error) {
        return NextResponse.json({ success: true, requestNumber: data.request_number })
      }
      if (error.code !== '23505') {
        console.error('Offline shipping insert failed:', error)
        return NextResponse.json({ error: '접수에 실패했습니다. 잠시 후 다시 시도해주세요' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: '접수에 실패했습니다. 잠시 후 다시 시도해주세요' }, { status: 500 })
  } catch (error) {
    console.error('Offline shipping POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
