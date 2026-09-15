// 키오스크 전용 API의 공개 범위 게이트.
// /api/kiosk/* 는 무인 기기에서 로그인 없이 호출되므로 인증 게이트가 없다.
// 대신 프로덕션에서는 KIOSK_ENABLED=1을 명시해야 열리고, 기본값은 로컬호스트 요청만 허용한다
// (키오스크 셸이 기기 안에서 Next 서버를 띄우는 시나리오).
// 배포된 사이트에 매장 기기가 직접 접속하는 운영이라면 KIOSK_ALLOW_REMOTE=1을 함께 설정한다 —
// 이 엔드포인트들은 무인증이라 공개 인터넷에 열리면 AI 과금 릴레이가 될 수 있다.

import type { NextRequest } from 'next/server'

export function kioskEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  if (process.env.KIOSK_ENABLED !== '1') return false
  if (process.env.KIOSK_ALLOW_REMOTE === '1') return true
  const host = (request.headers.get('host') ?? '').split(':')[0]
  return host === 'localhost' || host === '127.0.0.1'
}

/** 데모/폴백 mock 결과 허용 여부 — 프로덕션에서는 KIOSK_DEMO=1일 때만 */
export function mockAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.KIOSK_DEMO === '1'
}
