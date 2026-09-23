import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

/**
 * 카운터 기기 인증 — 카운터 PC는 관리자 로그인 없이 '이용권 발급'만 할 수 있어야 한다.
 *
 * 처음 한 번 PHOTOBOOTH_COUNTER_PIN 을 입력하면 서명된 쿠키(180일)를 받는다.
 * 서명에 PIN 지문을 섞어 두어, PIN 을 바꾸면 이미 연결된 기기가 모두 풀린다(분실·퇴사 시 대응).
 * PIN 환경변수가 없으면 기기 연결 자체가 막히고, 관리자 계정으로 로그인한 경우만 쓸 수 있다.
 */
export const COUNTER_COOKIE = 'acscent-booth-counter'
export const COUNTER_COOKIE_PATH = '/api/photobooth/counter'
export const COUNTER_SESSION_SECONDS = 180 * 24 * 60 * 60

function counterPin(): string {
  return (process.env.PHOTOBOOTH_COUNTER_PIN || '').trim()
}

export function counterPinConfigured(): boolean {
  return counterPin().length >= 6
}

function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('카운터 인증 설정이 없습니다.')
  return value
}

function pinFingerprint() {
  return createHash('sha256').update(counterPin()).digest('hex').slice(0, 16)
}

function signature(expires: string) {
  return createHmac('sha256', secret()).update(`booth-counter:${pinFingerprint()}:${expires}`).digest('hex')
}

function equal(a: string, b: string) {
  const first = Buffer.from(a), second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}

export function correctCounterPin(pin: unknown): boolean {
  return counterPinConfigured() && typeof pin === 'string' && equal(pin.trim(), counterPin())
}

export function issueCounterSession(now = Date.now()) {
  const expires = String(now + COUNTER_SESSION_SECONDS * 1000)
  return `${expires}.${signature(expires)}`
}

export function validCounterSession(request: NextRequest): boolean {
  if (!counterPinConfigured()) return false
  const token = request.cookies.get(COUNTER_COOKIE)?.value || ''
  const [expires, signed, extra] = token.split('.')
  if (extra || !/^\d{13}$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(signed || '')) return false
  const remaining = Number(expires) - Date.now()
  return remaining > 0 && remaining <= COUNTER_SESSION_SECONDS * 1000 && equal(signed, signature(expires))
}

/** 연결된 카운터 기기 또는 관리자 로그인 — 어느 쪽인지 돌려준다 */
export async function counterAccess(request: NextRequest): Promise<'counter' | 'admin' | null> {
  if (validCounterSession(request)) return 'counter'
  return (await requireAdmin()) ? 'admin' : null
}
