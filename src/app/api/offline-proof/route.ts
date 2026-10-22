import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import {
  ACCOUNT_DIGITS_MAX,
  ACCOUNT_DIGITS_MIN,
  OFFLINE_PROOF_BUCKET,
  OFFLINE_PROOF_MAX_AMOUNT,
  OFFLINE_PROOF_MAX_IMAGE_BYTES,
  OFFLINE_PROOF_MAX_IMAGES,
  OFFLINE_PROOF_MAX_QUANTITY,
  OFFLINE_PROOF_MAX_TOTAL_BYTES,
  OFFLINE_PROOF_PRODUCTS_TABLE,
  OFFLINE_PROOF_TABLE,
  kstToday,
  type OfflineProofItem,
} from '@/lib/offline-proof'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 전화번호 — 숫자/하이픈/공백/괄호/+ 만 허용, 숫자 9~11자리
const PHONE_ALLOWED_PATTERN = /^[\d\-\s()+]+$/
// 계좌번호 — 숫자/하이픈/공백만 허용
const ACCOUNT_ALLOWED_PATTERN = /^[\d\-\s]+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EARLIEST_PAYMENT_DATE = '2020-01-01'

const NOT_READY_MESSAGE = '접수 준비가 아직 끝나지 않았어요. 잠시 후 다시 시도하거나 매장에 문의해주세요.'

interface FieldSpec {
  key: 'name' | 'phone' | 'bank_name' | 'account_number' | 'payment_date' | 'payment_amount'
  label: string
  maxLength: number
}

const FIELD_SPECS: FieldSpec[] = [
  { key: 'name', label: '이름', maxLength: 50 },
  { key: 'phone', label: '연락처', maxLength: 20 },
  { key: 'bank_name', label: '은행', maxLength: 30 },
  { key: 'account_number', label: '계좌번호', maxLength: 30 },
  { key: 'payment_date', label: '결제일', maxLength: 10 },
  { key: 'payment_amount', label: '결제 금액', maxLength: 15 },
]

// 같은 기기에서 짧은 시간에 반복 접수 차단 — 인스턴스 단위 최선 노력.
// 입력 실수로 되돌아간 요청은 세지 않고, 저장까지 끝난 접수만 센다.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 6
const submissions = new Map<string, { count: number; until: number }>()

function clientKey(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim()
}

function submitAllowed(key: string): boolean {
  const now = Date.now()
  for (const [ip, record] of submissions) if (record.until <= now) submissions.delete(ip)
  return (submissions.get(key)?.count ?? 0) < RATE_MAX
}

function recordSubmit(key: string) {
  const record = submissions.get(key) || { count: 0, until: Date.now() + RATE_WINDOW_MS }
  record.count++
  submissions.set(key, record)
}

/** PF-YYMMDD-XXXX 형식 접수번호 생성 */
function generateRequestNumber(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS)
  const ymd = kst.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Array.from({ length: 4 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]
  ).join('')
  return `PF-${ymd}-${rand}`
}

/** 파일 앞부분으로 실제 이미지 형식 판별 — 브라우저가 붙인 type 은 믿지 않는다 */
function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

/** 실제로 있는 날짜인지 (2026-02-30 같은 값 차단) */
function isRealDate(date: string): boolean {
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

/** 테이블·버킷이 아직 없을 때(마이그레이션 실행 전) */
function isMissingResource(error: { code?: string; message?: string; statusCode?: unknown } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  return /not found|does not exist/i.test(error.message ?? '') || String(error.statusCode) === '404'
}

/**
 * 오프라인 결제 증빙 접수 (손님 폼 /proof 전용, 비로그인 공개)
 * POST /api/offline-proof  multipart/form-data
 *   name, phone, bank_name, account_number, payment_date(YYYY-MM-DD), payment_amount,
 *   items(JSON [{product_id, quantity}]), privacy_agreed('true'), images(파일 1~3장), website(허니팟)
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다' }, { status: 403 })
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > OFFLINE_PROOF_MAX_TOTAL_BYTES + 64 * 1024) {
      return NextResponse.json({ error: '사진 용량이 너무 커요. 사진 수를 줄여 다시 시도해주세요' }, { status: 413 })
    }

    const form = await request.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    // 허니팟 — 봇이 숨겨진 필드를 채우면 저장 없이 성공한 것처럼 응답
    const honeypot = form.get('website')
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      return NextResponse.json({ success: true, requestNumber: generateRequestNumber() })
    }

    const key = clientKey(request)
    if (!submitAllowed(key)) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 })
    }

    const values = {} as Record<FieldSpec['key'], string>
    for (const spec of FIELD_SPECS) {
      const raw = form.get(spec.key)
      const value = typeof raw === 'string' ? raw.trim() : ''
      if (!value) {
        return NextResponse.json({ error: `${spec.label}을(를) 입력해주세요` }, { status: 400 })
      }
      if (value.length > spec.maxLength) {
        return NextResponse.json(
          { error: `${spec.label}은(는) ${spec.maxLength}자 이내로 입력해주세요` },
          { status: 400 }
        )
      }
      values[spec.key] = value
    }

    if (form.get('privacy_agreed') !== 'true') {
      return NextResponse.json({ error: '개인정보 수집·이용에 동의해주세요' }, { status: 400 })
    }

    const phoneDigits = values.phone.replace(/\D/g, '')
    if (!PHONE_ALLOWED_PATTERN.test(values.phone) || phoneDigits.length < 9 || phoneDigits.length > 11) {
      return NextResponse.json({ error: '올바른 연락처를 입력해주세요' }, { status: 400 })
    }

    const accountDigits = values.account_number.replace(/\D/g, '')
    if (
      !ACCOUNT_ALLOWED_PATTERN.test(values.account_number) ||
      accountDigits.length < ACCOUNT_DIGITS_MIN ||
      accountDigits.length > ACCOUNT_DIGITS_MAX
    ) {
      return NextResponse.json({ error: '계좌번호를 다시 확인해주세요' }, { status: 400 })
    }

    const paymentDate = values.payment_date
    if (
      !DATE_PATTERN.test(paymentDate) ||
      !isRealDate(paymentDate) ||
      paymentDate < EARLIEST_PAYMENT_DATE ||
      paymentDate > kstToday()
    ) {
      return NextResponse.json({ error: '결제일을 다시 확인해주세요' }, { status: 400 })
    }

    const amountDigits = values.payment_amount.replace(/[,\s원]/g, '')
    const paymentAmount = /^\d+$/.test(amountDigits) ? Number(amountDigits) : NaN
    if (!Number.isSafeInteger(paymentAmount) || paymentAmount < 1 || paymentAmount > OFFLINE_PROOF_MAX_AMOUNT) {
      return NextResponse.json({ error: '결제 금액을 다시 확인해주세요' }, { status: 400 })
    }

    // 구매 상품 — 손님 폼에 보이는(노출 중인) 상품만, 상품이 하나라도 있으면 1개 이상 필수
    let requested: unknown = []
    try {
      requested = JSON.parse(typeof form.get('items') === 'string' ? (form.get('items') as string) : '[]')
    } catch {
      return NextResponse.json({ error: '구매 상품을 다시 선택해주세요' }, { status: 400 })
    }
    if (!Array.isArray(requested) || requested.length > 20) {
      return NextResponse.json({ error: '구매 상품을 다시 선택해주세요' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: activeProducts, error: productsError } = await serviceClient
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .select('id, name')
      .eq('is_active', true)
    if (productsError) {
      console.error('Offline proof products fetch failed:', productsError)
      const missing = isMissingResource(productsError)
      return NextResponse.json(
        { error: missing ? NOT_READY_MESSAGE : '접수에 실패했습니다. 잠시 후 다시 시도해주세요' },
        { status: missing ? 503 : 500 }
      )
    }

    const productNameById = new Map((activeProducts || []).map(product => [product.id as string, product.name as string]))
    const items: OfflineProofItem[] = []
    for (const entry of requested) {
      const productId = typeof entry?.product_id === 'string' ? entry.product_id : ''
      const quantity = Number(entry?.quantity)
      const name = productNameById.get(productId)
      if (!name || items.some(item => item.product_id === productId)) {
        return NextResponse.json({ error: '구매 상품을 다시 선택해주세요' }, { status: 400 })
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > OFFLINE_PROOF_MAX_QUANTITY) {
        return NextResponse.json({ error: '상품 수량을 다시 확인해주세요' }, { status: 400 })
      }
      items.push({ product_id: productId, name, quantity })
    }
    if (productNameById.size > 0 && items.length === 0) {
      return NextResponse.json({ error: '구매하신 상품을 선택해주세요' }, { status: 400 })
    }

    // 증빙 사진 — 1~3장, 형식은 파일 내용으로 판별
    const files = form.getAll('images').filter((item): item is File => item instanceof File && item.size > 0)
    if (files.length === 0) {
      return NextResponse.json({ error: '결제 내역 사진을 올려주세요' }, { status: 400 })
    }
    if (files.length > OFFLINE_PROOF_MAX_IMAGES) {
      return NextResponse.json({ error: `사진은 최대 ${OFFLINE_PROOF_MAX_IMAGES}장까지 올릴 수 있어요` }, { status: 400 })
    }

    let totalBytes = 0
    const images: { buffer: Buffer; mime: string; ext: string }[] = []
    for (const file of files) {
      if (file.size > OFFLINE_PROOF_MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: '사진 한 장의 용량이 너무 커요' }, { status: 413 })
      }
      totalBytes += file.size
      const buffer = Buffer.from(await file.arrayBuffer())
      const kind = sniffImage(buffer)
      if (!kind) {
        return NextResponse.json({ error: 'JPG·PNG 사진만 올릴 수 있어요' }, { status: 400 })
      }
      images.push({ buffer, ...kind })
    }
    if (totalBytes > OFFLINE_PROOF_MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: '사진 용량이 너무 커요. 사진 수를 줄여 다시 시도해주세요' }, { status: 413 })
    }

    const bucket = serviceClient.storage.from(OFFLINE_PROOF_BUCKET)

    // 사진을 먼저 올리고 행을 만든다 — 행 저장이 실패하면 올린 사진을 지운다
    const id = crypto.randomUUID()
    const imagePaths: string[] = []
    for (const [index, image] of images.entries()) {
      const path = `${id}/${index + 1}.${image.ext}`
      const { error: uploadError } = await bucket.upload(path, image.buffer, {
        contentType: image.mime,
        upsert: false,
      })
      if (uploadError) {
        console.error('Offline proof image upload failed:', uploadError.message)
        if (imagePaths.length) await bucket.remove(imagePaths)
        const missing = isMissingResource(uploadError as { message?: string; statusCode?: unknown })
        return NextResponse.json(
          { error: missing ? NOT_READY_MESSAGE : '사진을 올리지 못했어요. 잠시 후 다시 시도해주세요' },
          { status: missing ? 503 : 500 }
        )
      }
      imagePaths.push(path)
    }

    const now = new Date().toISOString()

    // 접수번호 유니크 충돌(23505) 시 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = generateRequestNumber()
      const { data, error } = await serviceClient
        .from(OFFLINE_PROOF_TABLE)
        .insert({
          id,
          request_number: requestNumber,
          name: values.name,
          phone: values.phone,
          bank_name: values.bank_name,
          account_number: accountDigits,
          payment_date: paymentDate,
          payment_amount: paymentAmount,
          items,
          image_paths: imagePaths,
          privacy_agreed_at: now,
          status: 'received',
        })
        .select('request_number')
        .single()

      if (!error) {
        recordSubmit(key)
        return NextResponse.json({ success: true, requestNumber: data.request_number })
      }
      if (error.code !== '23505' || !error.message.includes('request_number')) {
        console.error('Offline proof insert failed:', error)
        await bucket.remove(imagePaths)
        const missing = isMissingResource(error)
        return NextResponse.json(
          { error: missing ? NOT_READY_MESSAGE : '접수에 실패했습니다. 잠시 후 다시 시도해주세요' },
          { status: missing ? 503 : 500 }
        )
      }
    }

    await bucket.remove(imagePaths)
    return NextResponse.json({ error: '접수에 실패했습니다. 잠시 후 다시 시도해주세요' }, { status: 500 })
  } catch (error) {
    console.error('Offline proof POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
