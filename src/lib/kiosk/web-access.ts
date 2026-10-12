// 키오스크 화면(/kiosk)을 일반 웹브라우저로 열 때 묻는 비밀번호(2026-10-13).
// 매장 키오스크 앱(Electron 셸, window.kiosk)은 묻지 않고 바로 연다 — 인터넷이 끊겨도 앱이 잠기지 않게 그 판단은 화면에서 한다(WebAccessGate).
// 브라우저는 비밀번호를 서버에서 확인받고, 맞으면 서명한 쿠키를 받아 12시간 동안 다시 묻지 않는다.
// 손님 휴대폰이 여는 주소(/kiosk/get/…·/kiosk/upload/…)는 묻지 않는다. 설명: docs/kiosk-modes.md '웹브라우저 접속 비밀번호'

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

export const WEB_ACCESS_COOKIE = 'acscent-kiosk-web'
export const WEB_ACCESS_SECONDS = 12 * 60 * 60
/** 쿠키가 따라가는 경로 — 확인하는 API 만 */
export const WEB_ACCESS_PATH = '/api/kiosk'

function secret() {
  const value = process.env.KIOSK_WEB_SESSION_SECRET || process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('키오스크 웹 접속 인증 설정이 없습니다.')
  return value
}
function signature(value: string) { return createHmac('sha256', secret()).update(`kiosk-web:${value}`).digest('hex') }
function equal(a: string, b: string) {
  const first = Buffer.from(a), second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}

/** 비밀번호를 물어야 하는 서버인가 — KIOSK_WEB_GATE=1 항상 · 0 끔 · 없으면 운영 서버에서만(개발 서버와 기기 안의 localhost 는 묻지 않는다) */
export function webGateOn(request: NextRequest): boolean {
  const flag = process.env.KIOSK_WEB_GATE
  if (flag === '0') return false
  if (flag === '1') return true
  if (process.env.NODE_ENV !== 'production') return false
  const host = (request.headers.get('host') ?? '').split(':')[0]
  return host !== 'localhost' && host !== '127.0.0.1'
}

export function correctWebPassword(value: unknown) {
  return typeof value === 'string' && /^\d{4,12}$/.test(value) && equal(value, process.env.KIOSK_WEB_PASSWORD || '110619')
}

export function issueWebAccess(now = Date.now()) {
  const expires = String(now + WEB_ACCESS_SECONDS * 1000)
  return `${expires}.${signature(expires)}`
}

export function validWebAccess(request: NextRequest) {
  const token = request.cookies.get(WEB_ACCESS_COOKIE)?.value || ''
  const [expires, signed, extra] = token.split('.')
  if (extra || !/^\d{13}$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(signed || '')) return false
  const remaining = Number(expires) - Date.now()
  return remaining > 0 && remaining <= WEB_ACCESS_SECONDS * 1000 && equal(signed, signature(expires))
}

// 마구 넣어 보기 막기 — 서버 인스턴스 안에서 주소(IP)마다 1분에 8번
const attempts = new Map<string, { count: number; until: number }>()
export function webAttemptAllowed(request: NextRequest) {
  const key = (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim()
  const now = Date.now()
  for (const [ip, record] of attempts) if (record.until <= now) attempts.delete(ip)
  const record = attempts.get(key) || { count: 0, until: now + 60_000 }
  if (record.count >= 8) return false
  record.count++
  attempts.set(key, record)
  return true
}
