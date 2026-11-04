// 포토부스 '이 부스만' 운영 모드 증표 — 서명·기한·모드 확인(npm run test:booth-timecapsule 에 함께)
import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.SCREEN_BACKGROUND_SESSION_SECRET = 'test-secret'
const { issueBoothModeToken, readBoothModeToken } = await import('../device-mode-token')

test('증표 — 서명한 모드를 그대로 돌려준다', () => {
  assert.equal(readBoothModeToken(issueBoothModeToken('ansan-2026')), 'ansan-2026')
  assert.equal(readBoothModeToken(issueBoothModeToken('wow')), 'wow')
})

test('증표 — 모드를 바꿔 치거나 서명이 틀리거나 기한이 지나면 인정하지 않는다', () => {
  const token = issueBoothModeToken('wow')
  const [, expires, signed] = token.split('.')
  assert.equal(readBoothModeToken(`ansan-2026.${expires}.${signed}`), null)
  assert.equal(readBoothModeToken(`${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`), null)
  assert.equal(readBoothModeToken(issueBoothModeToken('ansan-2026', Date.now() - 400 * 24 * 60 * 60 * 1000)), null)
  assert.equal(readBoothModeToken(issueBoothModeToken('no-such-mode')), null)
  assert.equal(readBoothModeToken(null), null)
  assert.equal(readBoothModeToken('ansan-2026'), null)
})
