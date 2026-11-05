// 포토부스 기기별 운영 모드의 서버 증표(서버 전용).
// 운영 모드를 '이 부스만' 고르면 부스 화면은 기기(localStorage)에 모드를 적는다(device-mode.ts). 화면은 그 값만 보면 되지만,
// 무료 AI 생성 표(/api/photobooth/idol/ticket)는 비용이 들어 '이 기기는 무료 모드'라는 말만 믿을 수 없다.
// 그래서 관리자 비밀번호로 잠금을 푼 부스가 모드를 고를 때 서버가 그 모드에 서명해 주고(/api/screen-backgrounds/device-mode),
// 부스는 표를 받을 때 이 증표를 낸다. 서명이 맞으면 그 기기의 모드로 이용권 정책을 본다.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { BOOTH_MODE_IDS } from './modes'

/** 증표 유효 기간 — 행사·매장 운영 동안 다시 받을 일 없게 넉넉히(지나면 다시 고르면 된다) */
const TOKEN_DAYS = 365

function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('기기 모드 서명 설정이 없습니다.')
  return value
}

const sign = (payload: string) => createHmac('sha256', secret()).update(`booth-device-mode:${payload}`).digest('hex')

/** 모드 id 에 서명한 증표 — `<모드>.<만료 ms>.<서명>` */
export function issueBoothModeToken(mode: string, now = Date.now()): string {
  const payload = `${mode}.${now + TOKEN_DAYS * 24 * 60 * 60 * 1000}`
  return `${payload}.${sign(payload)}`
}

/** 증표가 맞으면 그 모드 id, 아니면 null(공통 운영 모드를 따른다) */
export function readBoothModeToken(token: unknown, now = Date.now()): string | null {
  if (typeof token !== 'string' || token.length > 200) return null
  const [mode, expires, signed, extra] = token.split('.')
  if (extra !== undefined || !mode || !/^\d{13}$/.test(expires ?? '') || !/^[a-f0-9]{64}$/.test(signed ?? '')) return null
  if (!BOOTH_MODE_IDS.includes(mode) || Number(expires) < now) return null
  const expected = Buffer.from(sign(`${mode}.${expires}`)), given = Buffer.from(signed)
  return expected.length === given.length && timingSafeEqual(expected, given) ? mode : null
}
