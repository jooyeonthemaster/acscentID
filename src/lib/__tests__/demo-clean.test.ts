// 워터마크 없는 데모 링크의 서명(src/lib/demo-clean-server.ts) — 만든 서명은 통과, 고친 · 지난 · 너무 먼 · 무른(버전) 서명은 거절
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { issueCleanDemoKey, readCleanDemoKey } from '../demo-clean-server'

// 서명 비밀은 부를 때 읽는다
process.env.SCREEN_BACKGROUND_SESSION_SECRET = 'test-secret'

test('만든 서명은 기간 동안 통과하고 만료 시각을 돌려준다', () => {
  const now = Date.UTC(2026, 10, 11)
  const { key, expiresAt } = issueCleanDemoKey(30, now)
  assert.match(key, /^[0-9a-z]{6,8}\.[0-9a-f]{32}$/)
  assert.equal(readCleanDemoKey(key, now), expiresAt)
  assert.equal(readCleanDemoKey(key, expiresAt - 1000), expiresAt)
  assert.equal(readCleanDemoKey(key, expiresAt), null)
})

test('고친 서명 · 다른 만료 · 형식이 틀린 값은 거절', () => {
  const now = Date.UTC(2026, 10, 11)
  const { key } = issueCleanDemoKey(7, now)
  const [head, sig] = key.split('.')
  assert.equal(readCleanDemoKey(`${head}.${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`, now), null)
  assert.equal(readCleanDemoKey(`${(parseInt(head, 36) + 86400).toString(36)}.${sig}`, now), null)
  for (const bad of ['', 'clean', '1', `${key}x`, null, undefined, 123]) assert.equal(readCleanDemoKey(bad, now), null)
})

test('너무 먼 만료는 거절(서명이 맞아도)', () => {
  const now = Date.UTC(2026, 10, 11)
  const { key } = issueCleanDemoKey(90, now)
  assert.notEqual(readCleanDemoKey(key, now), null)
  assert.equal(readCleanDemoKey(key, now - 30 * 864e5), null) // 만든 시점이 30일 전이라 치면 120일 뒤 → 100일 한도 밖
})

test('DEMO_CLEAN_LINK_VERSION 을 바꾸면 그 전 링크가 모두 무효', () => {
  const now = Date.UTC(2026, 10, 11)
  const { key } = issueCleanDemoKey(30, now)
  process.env.DEMO_CLEAN_LINK_VERSION = '2'
  assert.equal(readCleanDemoKey(key, now), null)
  delete process.env.DEMO_CLEAN_LINK_VERSION
  assert.notEqual(readCleanDemoKey(key, now), null)
})
