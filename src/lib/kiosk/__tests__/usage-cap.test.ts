// 키오스크 API 하루 상한(src/lib/kiosk/usage-cap.ts) — 저장소 대신 메모리로: 몫 가르기 · 상한 · 날짜(KST) · 환경 변수 · 저장소 실패 시 막지 않음
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { kioskDailyLimit, kioskUsagePool, takeKioskUsage, type KioskUsageStore } from '../usage-cap'

const req = (referer?: string) => new NextRequest('https://www.acscent.co.kr/api/kiosk/experience/caricature', { method: 'POST', headers: referer ? { referer } : {} })
function memory() {
  const counts = new Map<string, number>()
  const store: KioskUsageStore = { async read(path) { return counts.get(path) ?? 0 }, async write(path, count) { counts.set(path, count) } }
  return { counts, store }
}

test('데모 화면(주소에 demo=)에서 온 요청은 demo 몫, 나머지는 main 몫', () => {
  assert.equal(kioskUsagePool(req('https://www.acscent.co.kr/kiosk?mode=studio-draw&demo=1')), 'demo')
  assert.equal(kioskUsagePool(req('https://www.acscent.co.kr/kiosk?mode=studio-draw&demo=clean&k=abc')), 'demo')
  assert.equal(kioskUsagePool(req('https://www.acscent.co.kr/kiosk-demo')), 'demo')
  assert.equal(kioskUsagePool(req('https://www.acscent.co.kr/kiosk')), 'main')
  assert.equal(kioskUsagePool(req('https://www.acscent.co.kr/kiosk/pc/caricature')), 'main')
  assert.equal(kioskUsagePool(req()), 'main')
  assert.equal(kioskUsagePool(req('not a url')), 'main')
})

test('상한까지는 통과하고, 넘으면 429 — 몫마다 따로 센다', async () => {
  process.env.KIOSK_DEMO_DAILY_LIMIT_IMAGE = '2'
  const { store, counts } = memory()
  const now = Date.UTC(2026, 10, 11, 3, 0)
  const demo = req('https://www.acscent.co.kr/kiosk?demo=1')
  assert.equal(await takeKioskUsage(demo, 'image', now, store), null)
  assert.equal(await takeKioskUsage(demo, 'image', now, store), null)
  const blocked = await takeKioskUsage(demo, 'image', now, store)
  assert.equal(blocked?.status, 429)
  assert.equal((await blocked!.json()).limited, true)
  // main 몫은 그대로 열려 있다
  assert.equal(await takeKioskUsage(req('https://www.acscent.co.kr/kiosk'), 'image', now, store), null)
  assert.deepEqual([...counts.entries()].sort(), [['kiosk-usage/2026-11-11/demo-image.json', 2], ['kiosk-usage/2026-11-11/main-image.json', 1]])
  delete process.env.KIOSK_DEMO_DAILY_LIMIT_IMAGE
})

test('날짜는 한국 시간 — 자정(KST)이 지나면 새로 센다', async () => {
  process.env.KIOSK_DAILY_LIMIT_ANALYSIS = '1'
  const { store } = memory()
  const before = Date.UTC(2026, 10, 11, 14, 59) // KST 11-11 23:59
  const after = Date.UTC(2026, 10, 11, 15, 1) // KST 11-12 00:01
  assert.equal(await takeKioskUsage(req(), 'analysis', before, store), null)
  assert.equal((await takeKioskUsage(req(), 'analysis', before, store))?.status, 429)
  assert.equal(await takeKioskUsage(req(), 'analysis', after, store), null)
  delete process.env.KIOSK_DAILY_LIMIT_ANALYSIS
})

test('기본 상한과 환경 변수(잘못된 값은 기본값)', () => {
  assert.equal(kioskDailyLimit('main', 'analysis'), 2000)
  assert.equal(kioskDailyLimit('demo', 'image'), 40)
  process.env.KIOSK_DAILY_LIMIT_SHARE = 'abc'
  assert.equal(kioskDailyLimit('main', 'share'), 3000)
  process.env.KIOSK_DAILY_LIMIT_SHARE = '120'
  assert.equal(kioskDailyLimit('main', 'share'), 120)
  delete process.env.KIOSK_DAILY_LIMIT_SHARE
})

test('저장소가 안 되면 막지 않는다(매장 손님을 세우지 않게)', async () => {
  const broken: KioskUsageStore = { async read() { throw new Error('storage down') }, async write() { throw new Error('storage down') } }
  const error = console.error
  console.error = () => {}
  try { assert.equal(await takeKioskUsage(req(), 'analysis', Date.now(), broken), null) } finally { console.error = error }
})
