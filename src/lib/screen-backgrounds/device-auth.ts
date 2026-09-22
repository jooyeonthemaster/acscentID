import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

export const DEVICE_COOKIE = 'acscent-screen-background-admin'
export const DEVICE_SESSION_SECONDS = 10 * 60
function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('배경 관리자 인증 설정이 없습니다.')
  return value
}
function signature(value: string) { return createHmac('sha256', secret()).update(`screen-backgrounds:${value}`).digest('hex') }
function equal(a: string, b: string) {
  const first = Buffer.from(a), second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}
export function correctDevicePin(pin: unknown) {
  return typeof pin === 'string' && /^\d{6}$/.test(pin) && equal(pin, process.env.SCREEN_BACKGROUND_ADMIN_PIN || '110619')
}
export function issueDeviceSession(now = Date.now()) {
  const expires = String(now + DEVICE_SESSION_SECONDS * 1000)
  return `${expires}.${signature(expires)}`
}
export function validDeviceSession(request: NextRequest) {
  const token = request.cookies.get(DEVICE_COOKIE)?.value || ''
  const [expires, signed, extra] = token.split('.')
  if (extra || !/^\d{13}$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(signed || '')) return false
  const remaining = Number(expires) - Date.now()
  return remaining > 0 && remaining <= DEVICE_SESSION_SECONDS * 1000 && equal(signed, signature(expires))
}
/**
 * 같은 사이트에서 온 요청인지 (CSRF 방어).
 * 요청 URL(nextUrl)만 보면 개발 서버에서 접속 주소가 localhost 로 정규화돼,
 * 매장 부스처럼 사설 IP(http://172.30.x.x:3000)로 연 화면의 요청을 다른 사이트로 오판한다.
 * 그래서 브라우저가 붙인 Origin 의 호스트를 실제 요청의 Host 헤더와도 비교한다.
 */
export function sameOrigin(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.headers.get('origin')
  if (!origin) return true
  if (origin === request.nextUrl.origin) return true
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return !!host && originHost === host
}

// Best-effort process-local abuse limit; the PIN only authorizes selection, never CRUD.
const attempts = new Map<string, { count: number; until: number }>()
export function pinAttemptAllowed(request: NextRequest) {
  const key = (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim()
  const now = Date.now()
  for (const [ip, record] of attempts) if (record.until <= now) attempts.delete(ip)
  const record = attempts.get(key) || { count: 0, until: now + 60_000 }
  if (record.count >= 8) return false
  record.count++
  attempts.set(key, record)
  return true
}
