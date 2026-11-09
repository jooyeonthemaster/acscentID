import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ignoreReason, parseDepositAlert, pickDepositMatch } from '@/lib/bank-deposit/alert'
import {
  BANK_DEPOSIT_TABLE,
  confirmBankTransferPaid,
  getBankDepositConfig,
  loadPendingCandidates,
  verifyIngestToken,
} from '@/lib/bank-deposit/server'
import { notifyBankDeposit } from '@/lib/email/admin-notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 같은 문자를 폰이 다시 보낸 것(네트워크 재시도)으로 보는 시간 */
const RETRY_DEDUP_MS = 60_000
const MAX_BODY = 4000

/**
 * 무통장입금 자동 확인 — 우리은행 입금 알림 문자를 받는 곳
 * POST /api/payments/bank-notify
 *   Authorization: Bearer <BANK_NOTIFY_INGEST_TOKEN>
 *   본문: 문자 원문 그대로(text/plain) — 또는 JSON { text } / { amount, depositorName, externalId? }
 *
 * 전용 안드로이드 폰이 은행 문자를 받으면 MacroDroid 가 여기로 보낸다(docs/BANK_DEPOSIT_AUTO_CONFIRM.md).
 * 금액·입금자명·주문 시각이 맞는 입금대기 주문이 정확히 하나면 입금완료로 바꾸고,
 * 아니면 bank_deposit_notifications 에 남겨 관리자(/admin/bank-deposits)가 고르게 한다 — 입금은 하나도 버리지 않는다.
 */
export async function POST(request: NextRequest) {
  const config = getBankDepositConfig()
  if (!config.token) {
    return NextResponse.json({ error: 'bank notify is not configured' }, { status: 503 })
  }
  if (!verifyIngestToken(request.headers.get('authorization'), config.token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'too large' }, { status: 413 })

  // MacroDroid 는 문자 원문을 그대로 보낸다(JSON 을 만들게 하면 줄바꿈·따옴표에서 깨진다)
  let body: { text?: unknown; amount?: unknown; depositorName?: unknown; externalId?: unknown } = { text: raw }
  const trimmed = raw.trim()
  if ((request.headers.get('content-type') || '').includes('application/json') && trimmed.startsWith('{')) {
    try {
      body = JSON.parse(trimmed)
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
  }

  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_BODY) : ''
  const parsed = parseDepositAlert(text)
  const amount = typeof body.amount === 'number' && Number.isInteger(body.amount) && body.amount > 0 ? body.amount : parsed.amount
  const depositorName = typeof body.depositorName === 'string' && body.depositorName.trim()
    ? body.depositorName.trim().slice(0, 60)
    : parsed.depositorName
  if (!amount) {
    console.warn('[bank-notify] 입금 금액을 읽지 못함', parsed.isWithdrawal ? '(출금 알림)' : '')
    return NextResponse.json({ status: 'not_a_deposit' }, { status: parsed.isWithdrawal ? 200 : 422 })
  }

  const serviceClient = createServiceRoleClient()
  const explicitId = typeof body.externalId === 'string' && body.externalId.trim() ? body.externalId.trim().slice(0, 200) : ''
  const baseId = explicitId || createHash('sha256').update(`${text}|${amount}|${depositorName ?? ''}`).digest('hex')
  const row = {
    source: 'sms',
    raw_text: text || JSON.stringify({ amount, depositorName }),
    amount,
    depositor_name: depositorName,
    account_suffix: parsed.accountSuffix,
    occurred_at: parsed.occurredAt?.toISOString() ?? null,
    status: 'received',
  }

  // 같은 문자 재전송은 한 번만. 같은 내용이라도 시간이 지나 다시 온 것은 새 입금(같은 사람이 같은 금액을 또 보냄)
  let externalId = baseId
  let inserted = await serviceClient.from(BANK_DEPOSIT_TABLE).insert({ external_id: externalId, ...row }).select('id').single()
  if (inserted.error?.code === '23505') {
    const { data: existing } = await serviceClient
      .from(BANK_DEPOSIT_TABLE)
      .select('status, matched_order_id, received_at')
      .eq('external_id', baseId)
      .maybeSingle()
    if (existing && (explicitId || Date.now() - Date.parse(existing.received_at) < RETRY_DEDUP_MS)) {
      return NextResponse.json({ duplicate: true, status: existing.status, orderId: existing.matched_order_id })
    }
    externalId = `${baseId}-${Date.now()}`
    inserted = await serviceClient.from(BANK_DEPOSIT_TABLE).insert({ external_id: externalId, ...row }).select('id').single()
  }
  if (inserted.error || !inserted.data) {
    console.error('[bank-notify] 입금 기록 실패', inserted.error?.code, inserted.error?.message)
    return NextResponse.json({ error: 'record failed' }, { status: 500 })
  }
  const notificationId = inserted.data.id as string
  const finish = (fields: Record<string, unknown>) =>
    serviceClient.from(BANK_DEPOSIT_TABLE).update({ ...fields, processed_at: new Date().toISOString() }).eq('id', notificationId)

  const ignored = ignoreReason({ ...parsed, depositorName }, config)
  if (ignored) {
    await finish({ status: 'ignored', note: ignored })
    return NextResponse.json({ status: 'ignored', reason: ignored })
  }

  try {
    const at = parsed.occurredAt ?? new Date()
    const candidates = await loadPendingCandidates(serviceClient, amount, at, config.windowHours)
    const match = pickDepositMatch({ amount, depositorName, occurredAt: parsed.occurredAt }, candidates, config.windowHours)

    if (match.status === 'matched') {
      const result = await confirmBankTransferPaid(serviceClient, match.orderId, { paidAt: at, by: 'bank-notify' })
      if (result.confirmed) {
        await finish({ status: 'matched', matched_order_id: match.orderId, note: null })
        await notifyBankDeposit({ kind: 'confirmed', amount, depositorName, orderNumber: result.orderNumber })
        console.log('[bank-notify] 입금 자동 확인', result.orderNumber, amount)
        return NextResponse.json({ status: 'matched', orderId: match.orderId })
      }
      const note = `맞는 주문을 찾았지만 확정하지 못함 — ${result.reason}`
      await finish({ status: 'ambiguous', candidate_order_ids: [match.orderId], note })
      await notifyBankDeposit({ kind: 'review', amount, depositorName, note })
      return NextResponse.json({ status: 'ambiguous', reason: result.reason })
    }

    if (match.status === 'ambiguous') {
      const note = `금액·입금자명이 같은 입금대기 주문 ${match.orderIds.length}건 — 어느 주문인지 골라 주세요`
      await finish({ status: 'ambiguous', candidate_order_ids: match.orderIds, note })
      await notifyBankDeposit({ kind: 'review', amount, depositorName, note })
      return NextResponse.json({ status: 'ambiguous', candidates: match.orderIds.length })
    }

    await finish({ status: 'unmatched', note: match.reason })
    await notifyBankDeposit({ kind: 'review', amount, depositorName, note: match.reason })
    return NextResponse.json({ status: 'unmatched', reason: match.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[bank-notify] 처리 실패', message)
    await finish({ status: 'failed', note: message.slice(0, 500) })
    await notifyBankDeposit({ kind: 'review', amount, depositorName, note: `자동 처리 중 오류: ${message.slice(0, 200)}` })
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
