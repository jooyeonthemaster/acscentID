// 워터마크 없는 데모 링크의 서명(서버 전용) — '<만료 시각(초, 36진)>.<서명 32자>'. 관리자 비밀번호를 확인한 /api/demo/clean 만 만든다.
// 서명 비밀은 다른 부스 · 관리자 증표와 같은 SCREEN_BACKGROUND_SESSION_SECRET(없으면 서비스 키), 용도 이름(demo-clean)으로 섞이지 않게 나눈다.
// 내보낸 링크를 한꺼번에 무르려면 DEMO_CLEAN_LINK_VERSION 을 바꾼다(기본 '1') — 그 전에 만든 링크는 모두 워터마크가 다시 깔린다.

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { DemoCleanDays } from './demo-clean'

/** 서명에 받아 주는 가장 먼 만료(만든 날부터) — 90일 링크 + 여유 */
const MAX_AHEAD_MS = 100 * 24 * 60 * 60 * 1000

function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('데모 링크 서명 설정이 없습니다.')
  return value
}
const version = () => process.env.DEMO_CLEAN_LINK_VERSION || '1'
const sign = (exp: number) => createHmac('sha256', secret()).update(`demo-clean:${version()}:${exp}`).digest('hex').slice(0, 32)

export function issueCleanDemoKey(days: DemoCleanDays, now = Date.now()): { key: string; expiresAt: number } {
  const exp = Math.floor(now / 1000) + days * 24 * 60 * 60
  return { key: `${exp.toString(36)}.${sign(exp)}`, expiresAt: exp * 1000 }
}

/** 맞는 서명이면 만료 시각(ms), 아니면(형식 · 서명 · 기간) null */
export function readCleanDemoKey(key: unknown, now = Date.now()): number | null {
  if (typeof key !== 'string' || !/^[0-9a-z]{6,8}\.[0-9a-f]{32}$/.test(key)) return null
  const [head, signed] = key.split('.')
  const exp = parseInt(head, 36)
  if (!Number.isSafeInteger(exp)) return null
  const expiresAt = exp * 1000
  if (expiresAt <= now || expiresAt - now > MAX_AHEAD_MS) return null
  const want = Buffer.from(sign(exp)), got = Buffer.from(signed)
  return want.length === got.length && timingSafeEqual(want, got) ? expiresAt : null
}
