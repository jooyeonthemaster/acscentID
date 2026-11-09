// ============================================================
//  무통장입금 자동 확인 — 입금 알림 문자 읽기·주문 고르기 (순수 함수)
// ------------------------------------------------------------
//  우리은행 입금 알림 문자(전용 안드로이드 폰 → MacroDroid → /api/payments/bank-notify)를
//  읽어 금액·입금자명·계좌 끝자리·입금 시각을 뽑고, 입금대기 주문 중 하나를 고른다.
//  DB·Next 에 기대지 않아 테스트에서 그대로 부른다. 흐름은 docs/BANK_DEPOSIT_AUTO_CONFIRM.md.
//
//  우리은행 실제 문자 형식(같은 회사 SMOAT 계좌로 받은 알림에서 확인):
//    [Web발신]
//    우리 11/09 14:23
//    *549279
//    입금 48,000원
//    홍길동
//    잔액 1,234,567원
// ============================================================

export interface ParsedDepositAlert {
  /** 입금 금액(원). 못 찾으면 null */
  amount: number | null
  depositorName: string | null
  /** 문자에 찍힌 계좌 끝자리('*549279' → '549279'). 없으면 null */
  accountSuffix: string | null
  /** 문자의 'MM/DD hh:mm'(한국 시각). 없으면 null */
  occurredAt: Date | null
  /** 출금 알림이면 true — 주문과 무관 */
  isWithdrawal: boolean
}

const KST_OFFSET_MS = 9 * 3600e3

/** 입금자명 비교용 — 공백·기호를 지우고 영문은 소문자로 */
export function normalizeDepositorName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z가-힣]/g, '')
    .toLowerCase()
}

const toAmount = (digits: string) => {
  const value = Number(digits.replace(/,/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** 'MM/DD hh:mm'(한국 시각) → Date. 연도가 없으니 지금 기준으로 고르고, 하루 넘게 미래면 작년 */
function parseKstStamp(text: string, now: Date): Date | null {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/)
  if (!m) return null
  const [month, day, hour, minute] = m.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const year = new Date(now.getTime() + KST_OFFSET_MS).getUTCFullYear()
  const at = (y: number) => new Date(Date.UTC(y, month - 1, day, hour, minute) - KST_OFFSET_MS)
  const guess = at(year)
  return guess.getTime() - now.getTime() > 24 * 3600e3 ? at(year - 1) : guess
}

/**
 * 은행 입금 알림 문자를 읽는다. 우리은행 여러 줄 형식을 먼저 보고,
 * 한 줄로 이어 붙은 형식("우리 입금 48,000원 홍길동 잔액…")도 받는다.
 */
export function parseDepositAlert(text: string, now = new Date()): ParsedDepositAlert {
  const normalized = text.replace(/\r/g, '').replace(/ /g, ' ')
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)
  const accountSuffix = normalized.match(/\*(\d{4,8})(?!\d)/)?.[1] ?? null
  const occurredAt = parseKstStamp(normalized, now)
  const hasDeposit = /입금/.test(normalized)
  const isWithdrawal = !hasDeposit && /출금/.test(normalized)

  let amount: number | null = null
  let depositorName: string | null = null

  // 1) 여러 줄 — "입금 48,000원" 다음 줄이 입금자명(잔액 줄이 아니면)
  const depositLine = lines.findIndex((line) => /^입금\s*[\d,]+\s*원/.test(line))
  if (depositLine >= 0) {
    amount = toAmount(lines[depositLine].match(/^입금\s*([\d,]+)/)![1])
    const next = lines[depositLine + 1]
    if (next && !/^잔액/.test(next) && !/^[\d,]+\s*원?$/.test(next)) depositorName = next
  }

  // 2) 한 줄 — "입금" 뒤 첫 'N원', 그 뒤 이름(잔액 앞)
  if (amount == null && hasDeposit) {
    const afterDeposit = normalized.slice(normalized.indexOf('입금'))
    const inline = afterDeposit.match(/입금\s*([\d,]+)\s*원\s*([^\s\d][^\n]*?)?(?=\s*잔액|\n|$)/)
    if (inline) {
      amount = toAmount(inline[1])
      const name = inline[2]?.trim()
      if (name) depositorName = name
    }
  }

  return {
    amount,
    depositorName: depositorName ? depositorName.replace(/\s+/g, ' ').trim() : null,
    accountSuffix,
    occurredAt,
    isWithdrawal,
  }
}

/** 이 사이트 주문과 무관해 자동으로 넘기는 입금 */
export function ignoreReason(
  alert: Pick<ParsedDepositAlert, 'accountSuffix' | 'depositorName' | 'isWithdrawal'>,
  options: { accountSuffix: string; ignoredDepositors: string[] },
): string | null {
  if (alert.isWithdrawal) return '출금 알림'
  if (options.accountSuffix && alert.accountSuffix && alert.accountSuffix !== options.accountSuffix) {
    return `다른 계좌(*${alert.accountSuffix}) 알림`
  }
  const name = normalizeDepositorName(alert.depositorName?.replace(/\(주\)|㈜|주식회사/g, ''))
  if (name && options.ignoredDepositors.some((ignored) => normalizeDepositorName(ignored) === name)) {
    return `주문이 아닌 입금(${alert.depositorName})`
  }
  return null
}

/** 은행이 이자를 넣을 때 입금자명 자리에 찍는 이름(우리은행 실측) — 기본으로 넘긴다 */
export const DEFAULT_IGNORED_DEPOSITORS = ['예금결산']

export interface PendingOrderCandidate {
  id: string
  final_price: number
  created_at: string
  recipient_name: string | null
  depositor_name?: string | null
}

export type DepositMatch =
  | { status: 'matched'; orderId: string }
  | { status: 'unmatched'; reason: string }
  | { status: 'ambiguous'; orderIds: string[] }

/**
 * 입금 한 건에 맞는 입금대기 주문을 고른다.
 * 금액이 정확히 같고, 입금 시각 기준 window 안에 만든 주문이며, 입금자명이 같아야 한다.
 * 주문의 입금자명(손님이 적은 것)이 있으면 그것, 없으면 받는 분 이름과 비교한다.
 * 같은 금액 주문이 흔해서(48,000원·24,000원) 이름 없이 금액만으로는 고르지 않는다.
 */
export function pickDepositMatch(
  deposit: { amount: number; depositorName: string | null; occurredAt: Date | null },
  candidates: PendingOrderCandidate[],
  windowHours: number,
  now = new Date(),
): DepositMatch {
  const wanted = normalizeDepositorName(deposit.depositorName)
  if (!wanted) return { status: 'unmatched', reason: '문자에서 입금자명을 읽지 못함' }
  const at = (deposit.occurredAt ?? now).getTime()
  const inWindow = candidates.filter((order) => {
    const created = Date.parse(order.created_at)
    // 주문보다 입금이 조금 먼저 찍히는 경우(시계 차이·분 단위 문자 시각)를 10분 봐준다
    return order.final_price === deposit.amount && created <= at + 10 * 60e3 && created >= at - windowHours * 3600e3
  })
  const named = inWindow.filter(
    (order) => normalizeDepositorName(order.depositor_name || order.recipient_name) === wanted,
  )
  if (named.length === 1) return { status: 'matched', orderId: named[0].id }
  if (named.length > 1) return { status: 'ambiguous', orderIds: named.map((order) => order.id) }
  return {
    status: 'unmatched',
    reason: inWindow.length
      ? `금액이 같은 입금대기 주문 ${inWindow.length}건 — 입금자명이 다름`
      : '금액이 같은 입금대기 주문 없음',
  }
}
