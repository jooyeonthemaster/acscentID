import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_IGNORED_DEPOSITORS,
  ignoreReason,
  normalizeDepositorName,
  parseDepositAlert,
  pickDepositMatch,
  type PendingOrderCandidate,
} from '../alert'

// 2026-11-09 15:00 KST
const NOW = new Date('2026-11-09T06:00:00Z')
const options = { accountSuffix: '549279', ignoredDepositors: DEFAULT_IGNORED_DEPOSITORS }

// 우리은행 실제 형식(이름·금액만 바꿈)
const WOORI = '[Web발신]\n우리 11/09 14:23\n*549279\n입금 48,000원\n홍길동\n잔액 1,234,567원'

test('우리은행 여러 줄 문자 — 금액·입금자명·계좌 끝자리·입금 시각(한국 시각)', () => {
  const alert = parseDepositAlert(WOORI, NOW)
  assert.equal(alert.amount, 48000)
  assert.equal(alert.depositorName, '홍길동')
  assert.equal(alert.accountSuffix, '549279')
  assert.equal(alert.occurredAt?.toISOString(), '2026-11-09T05:23:00.000Z')
  assert.equal(alert.isWithdrawal, false)
  assert.equal(ignoreReason(alert, options), null)
})

test('잔액은 입금액으로 읽지 않는다 — 한 줄 형식, 줄바꿈 섞인 형식', () => {
  const inline = parseDepositAlert('[Web발신] 우리 입금 24,000원 김철수 잔액1,000,000', NOW)
  assert.equal(inline.amount, 24000)
  assert.equal(inline.depositorName, '김철수')
  const split = parseDepositAlert('입금\n51,000원\n이영희', NOW)
  assert.equal(split.amount, 51000)
  assert.equal(split.depositorName, '이영희')
})

test('주문과 무관한 입금은 넘긴다 — 통장 이자(예금결산)·다른 계좌·출금·설정한 이름', () => {
  const interest = parseDepositAlert('[Web발신]\n우리 11/09 09:00\n*549279\n입금 84원\n예금결산\n잔액 1,000,084원', NOW)
  assert.match(ignoreReason(interest, options) ?? '', /예금결산/)

  const smoat = parseDepositAlert('[Web발신]\n우리 11/09 14:23\n*573695\n입금 48,000원\n홍길동\n잔액 5원', NOW)
  assert.match(ignoreReason(smoat, options) ?? '', /다른 계좌\(\*573695\)/)

  const out = parseDepositAlert('[Web발신]\n우리 11/09 14:23\n*549279\n출금 10,000원\n카드대금\n잔액 5원', NOW)
  assert.equal(out.isWithdrawal, true)
  assert.equal(out.amount, null)
  assert.equal(ignoreReason(out, options), '출금 알림')

  const pg = parseDepositAlert('[Web발신]\n우리 11/09 14:23\n*549279\n입금 312,000원\n(주)케이지이니시스\n잔액 5원', NOW)
  assert.equal(pg.depositorName, '(주)케이지이니시스')
  assert.match(ignoreReason(pg, { ...options, ignoredDepositors: ['케이지이니시스'] }) ?? '', /주문이 아닌 입금/)
})

test('연말에 받은 작년 날짜 문자는 작년으로', () => {
  const alert = parseDepositAlert('우리 12/31 23:59\n*549279\n입금 4,000원\n홍길동', new Date('2026-12-31T15:30:00Z')) // 2027-01-01 00:30 KST
  assert.equal(alert.occurredAt?.toISOString(), '2026-12-31T14:59:00.000Z')
})

test('입금자명 비교는 공백·기호·대소문자 무시', () => {
  assert.equal(normalizeDepositorName(' 홍 길동 '), '홍길동')
  assert.equal(normalizeDepositorName('Kim, Min-Ji'), 'kimminji')
  assert.equal(normalizeDepositorName(null), '')
})

const order = (id: string, fields: Partial<PendingOrderCandidate> = {}): PendingOrderCandidate => ({
  id,
  final_price: 48000,
  created_at: '2026-11-09T05:10:00Z', // 입금 13분 전 주문
  recipient_name: '홍길동',
  depositor_name: null,
  ...fields,
})
const deposit = { amount: 48000, depositorName: '홍길동', occurredAt: new Date('2026-11-09T05:23:00Z') }

test('금액·입금자명이 같은 입금대기 주문이 하나면 그 주문', () => {
  const match = pickDepositMatch(deposit, [order('a'), order('b', { recipient_name: '김철수' })], 168, NOW)
  assert.deepEqual(match, { status: 'matched', orderId: 'a' })
})

test('손님이 적은 입금자명이 받는 분 이름보다 먼저', () => {
  const candidates = [order('mom', { recipient_name: '홍길동', depositor_name: '박엄마' }), order('me', { recipient_name: '김철수', depositor_name: '홍길동' })]
  assert.deepEqual(pickDepositMatch(deposit, candidates, 168, NOW), { status: 'matched', orderId: 'me' })
})

test('같은 금액 주문이 많아도 이름이 다르면 자동으로 붙이지 않는다', () => {
  const match = pickDepositMatch(deposit, [order('a', { recipient_name: '김철수' }), order('b', { recipient_name: '이영희' })], 168, NOW)
  assert.equal(match.status, 'unmatched')
  assert.match((match as { reason: string }).reason, /2건 — 입금자명이 다름/)
})

test('금액·이름이 같은 주문이 둘이면 관리자에게', () => {
  const match = pickDepositMatch(deposit, [order('a'), order('b', { created_at: '2026-11-08T05:00:00Z' })], 168, NOW)
  assert.deepEqual(match, { status: 'ambiguous', orderIds: ['a', 'b'] })
})

test('시간창 밖 주문·입금보다 늦게 만든 주문·이름 없는 입금은 붙이지 않는다', () => {
  assert.equal(pickDepositMatch(deposit, [order('old', { created_at: '2026-10-01T00:00:00Z' })], 168, NOW).status, 'unmatched')
  assert.equal(pickDepositMatch(deposit, [order('later', { created_at: '2026-11-09T05:40:00Z' })], 168, NOW).status, 'unmatched')
  assert.deepEqual(pickDepositMatch(deposit, [order('ok', { created_at: '2026-11-09T05:30:00Z' })], 168, NOW), { status: 'matched', orderId: 'ok' })
  assert.equal(pickDepositMatch({ ...deposit, depositorName: null }, [order('a')], 168, NOW).status, 'unmatched')
  assert.equal(pickDepositMatch({ ...deposit, amount: 47000 }, [order('a')], 168, NOW).status, 'unmatched')
})
