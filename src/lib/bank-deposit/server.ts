import { timingSafeEqual } from 'crypto'
import type { createServiceRoleClient } from '@/lib/supabase/service'
import { applyPaidOrderEffects } from '@/lib/orders/paid-effects'
import { notifyErp } from '@/lib/erp/signal'
import { DEFAULT_IGNORED_DEPOSITORS, type PendingOrderCandidate } from './alert'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export const BANK_DEPOSIT_TABLE = 'bank_deposit_notifications'

/** 관리자 화면에서 '확인 필요'로 모으는 상태 */
export const BANK_DEPOSIT_REVIEW_STATUSES = ['unmatched', 'ambiguous', 'failed'] as const
export const isReviewStatus = (status: string) => (BANK_DEPOSIT_REVIEW_STATUSES as readonly string[]).includes(status)

export interface BankDepositConfig {
  /** 폰(MacroDroid)이 보내는 Bearer 토큰. 비어 있으면 받는 길 자체를 닫는다 */
  token: string
  /** 쇼핑몰 입금 계좌(우리 1005-204-549279) 끝 6자리 — 문자에 '*549279'로 찍힌다 */
  accountSuffix: string
  /** 주문을 만든 뒤 이 시간 안에 들어온 입금만 자동으로 붙인다 */
  windowHours: number
  /** 주문이 아닌 입금(통장 이자 '예금결산', PG 정산 등) — 자동으로 넘긴다 */
  ignoredDepositors: string[]
}

export function getBankDepositConfig(): BankDepositConfig {
  const hours = Number(process.env.BANK_DEPOSIT_MATCH_WINDOW_HOURS)
  const extra = (process.env.BANK_DEPOSIT_IGNORED_DEPOSITORS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return {
    token: process.env.BANK_NOTIFY_INGEST_TOKEN?.trim() || '',
    accountSuffix: (process.env.BANK_DEPOSIT_ACCOUNT_SUFFIX?.trim() || '549279').replace(/\D/g, ''),
    // 지난 무통장 주문은 확인까지 대부분 몇 시간, 가장 늦은 건 약 7일이었다
    windowHours: Number.isFinite(hours) && hours > 0 ? hours : 168,
    ignoredDepositors: [...DEFAULT_IGNORED_DEPOSITORS, ...extra],
  }
}

/** Authorization: Bearer <token> 를 시간 일정하게 비교 */
export function verifyIngestToken(header: string | null, expected: string): boolean {
  if (!expected || !header) return false
  const provided = header.replace(/^Bearer\s+/i, '').trim()
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

const isMissingColumn = (error: { code?: string; message?: string } | null, column: string) =>
  !!error && (error.code === '42703' || error.code === 'PGRST204') && (error.message || '').includes(column)

/**
 * 입금대기 무통장 주문 — 금액이 같고 입금 시각 기준 window 안에 만든 것.
 * orders.depositor_name 이 아직 없는 DB(마이그레이션 전)에서도 받는 분 이름으로 동작한다.
 */
export async function loadPendingCandidates(
  serviceClient: ServiceClient,
  amount: number,
  at: Date,
  windowHours: number,
): Promise<PendingOrderCandidate[]> {
  const from = new Date(at.getTime() - windowHours * 3600e3).toISOString()
  const until = new Date(at.getTime() + 10 * 60e3).toISOString()
  const query = (columns: string) =>
    serviceClient
      .from('orders')
      .select(columns)
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer')
      .eq('final_price', amount)
      .gte('created_at', from)
      .lte('created_at', until)
      .limit(50)
  let { data, error } = await query('id, final_price, created_at, recipient_name, depositor_name')
  if (isMissingColumn(error, 'depositor_name')) {
    ;({ data, error } = await query('id, final_price, created_at, recipient_name'))
  }
  if (error) throw new Error(`입금대기 주문 조회 실패: ${error.message}`)
  return (data || []) as unknown as PendingOrderCandidate[]
}

export type ConfirmResult =
  | { confirmed: true; orderNumber: string }
  | { confirmed: false; reason: string }

/**
 * 무통장 주문 하나를 입금완료로 바꾸고 결제 확정 후속 처리(쿠폰·재고·재구매 쿠폰·ERP)를 한다.
 * 입금대기(pending)인 무통장 주문일 때만 바꾼다 — 같은 주문을 두 번 확정하지 않게
 * 상태 조건을 건 update 로 바꾸고, 바뀐 줄이 없으면 아무것도 하지 않는다.
 * paid_at 은 입금 시각(문자 시각) — 본사 ERP 가 매출일로 쓴다.
 */
export async function confirmBankTransferPaid(
  serviceClient: ServiceClient,
  orderId: string,
  options: { paidAt: Date; by: string },
): Promise<ConfirmResult> {
  const { data: existing, error: readError } = await serviceClient
    .from('orders')
    .select('id, order_number, status, payment_method, paid_at, user_id, user_coupon_id')
    .eq('id', orderId)
    .maybeSingle()
  if (readError) throw new Error(`주문 조회 실패: ${readError.message}`)
  if (!existing) return { confirmed: false, reason: '주문이 없습니다' }
  if (existing.payment_method !== 'bank_transfer') return { confirmed: false, reason: '무통장 주문이 아닙니다' }
  if (existing.status !== 'pending') return { confirmed: false, reason: `이미 '${existing.status}' 상태입니다` }

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await serviceClient
    .from('orders')
    .update({
      status: 'paid',
      updated_at: now,
      ...(existing.paid_at ? {} : { paid_at: options.paidAt.toISOString() }),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id')
  if (updateError) throw new Error(`주문 상태 변경 실패: ${updateError.message}`)
  if (!updated?.length) return { confirmed: false, reason: '그 사이 다른 곳에서 상태가 바뀌었습니다' }

  await applyPaidOrderEffects(serviceClient, existing, options.by)
  notifyErp('무통장 입금 확인')
  return { confirmed: true, orderNumber: existing.order_number }
}
