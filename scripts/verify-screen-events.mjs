/**
 * 이벤트 기간 화면 — 네트워크 없이 도는 검증.
 * Run: node scripts/verify-screen-events.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const cache = new Map()
function loadTs(relativePath) {
  const filename = path.resolve(root, relativePath)
  if (cache.has(filename)) return cache.get(filename)
  const module = { exports: {} }
  cache.set(filename, module.exports)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const localRequire = id => {
    if (id.startsWith('.') || id.startsWith('@/')) {
      const resolved = id.startsWith('@/') ? path.resolve(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id)
      if (resolved.endsWith('.json')) return JSON.parse(readFileSync(resolved, 'utf8'))
      return loadTs(path.relative(root, `${resolved}.ts`))
    }
    return require(id)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  cache.set(filename, module.exports)
  return module.exports
}

const types = loadTs('src/lib/screen-events/types.ts')
const sources = loadTs('src/lib/screen-events/sources.ts')
const background = target => ({
  id: `event-x-${target}`, target, title: '테스트 이벤트', image_url: 'https://example.com/a.webp', thumbnail_url: 'https://example.com/a.webp',
  collection: 'event', palette: 'soft', tone: 'light', ink: '#222222', accent: '#ff0066', base: '#ffffff', display_order: 0, is_active: true,
})
const event = (edits = {}) => ({
  ...types.emptyEvent({ id: 'erp-abc', source: 'erp', store: 'wow', title: '세븐틴 정한', starts_on: '2026-10-03', ends_on: '2026-10-04' }),
  backgrounds: { kiosk: background('kiosk'), booth: background('booth') }, approved: true, font: 'bm-jua', ...edits,
})

test('노션 토글 제목을 매장·이름·기간으로 읽는다(연도는 오늘과 가까운 쪽)', () => {
  assert.deepEqual(sources.parseNotionTitle('[와우] 세븐틴 정한 (10.3~10.4) /', '2026-09-23'), { store: 'wow', title: '세븐틴 정한', starts_on: '2026-10-03', ends_on: '2026-10-04' })
  assert.deepEqual(sources.parseNotionTitle('[와우] 최예나 (9.29)', '2026-09-23'), { store: 'wow', title: '최예나', starts_on: '2026-09-29', ends_on: '2026-09-29' })
  assert.deepEqual(sources.parseNotionTitle('[아이디] 프로미스나인 이나경 (5.31-6.1)', '2026-05-20'), { store: 'id', title: '프로미스나인 이나경', starts_on: '2026-05-31', ends_on: '2026-06-01' })
  // 연말에 1월 행사 — 다음 해로
  assert.equal(sources.parseNotionTitle('[와우] 원위 동명 (1.9~1.10)', '2026-12-20').starts_on, '2027-01-09')
  // 해를 넘기는 행사
  assert.equal(sources.parseNotionTitle('[와우] 연말 (12.30~1.2)', '2026-12-20').ends_on, '2027-01-02')
  assert.equal(sources.parseNotionTitle('다혜 완료 체크', '2026-09-23'), null)
  assert.equal(sources.parseNotionTitle('[어딘가] 이름 (1.1)', '2026-09-23'), null)
})

test('기간 중에만, 승인된, 기기 매장·공통 이벤트만 적용된다', () => {
  const on = event()
  assert.equal(types.liveOverride([on], 'kiosk', '2026-10-02'), null)
  assert.equal(types.liveOverride([on], 'kiosk', '2026-10-03').event_id, 'erp-abc')
  assert.equal(types.liveOverride([on], 'booth', '2026-10-04').background.target, 'booth')
  assert.equal(types.liveOverride([on], 'kiosk', '2026-10-05'), null)
  assert.equal(types.liveOverride([event({ approved: false })], 'kiosk', '2026-10-03'), null)
  assert.equal(types.liveOverride([event({ hidden: true })], 'kiosk', '2026-10-03'), null)
  assert.equal(types.liveOverride([event({ store: 'id' })], 'kiosk', '2026-10-03'), null)
  assert.equal(types.liveOverride([event({ store: 'all' })], 'kiosk', '2026-10-03').font, 'bm-jua')
  assert.equal(types.liveOverride([event({ backgrounds: { kiosk: null, booth: background('booth') } })], 'kiosk', '2026-10-03'), null)
})

test('겹치면 늦게 시작한 이벤트가 이긴다', () => {
  const long = event({ id: 'erp-long', starts_on: '2026-10-01', ends_on: '2026-10-10' })
  const short = event({ id: 'erp-short', starts_on: '2026-10-05', ends_on: '2026-10-06' })
  assert.equal(types.liveOverride([long, short], 'kiosk', '2026-10-05').event_id, 'erp-short')
  assert.equal(types.liveOverride([long, short], 'kiosk', '2026-10-07').event_id, 'erp-long')
})

test('한국 시간 날짜와 저장 검증', () => {
  assert.equal(types.kstToday(new Date('2026-10-02T15:30:00Z')), '2026-10-03') // 한국 00:30
  assert.equal(types.kstToday(new Date('2026-10-02T14:59:00Z')), '2026-10-02')
  assert.equal(types.validateScreenEvent(event()), true)
  assert.equal(types.validateScreenEvent(event({ ends_on: '2026-10-01' })), false)
  assert.equal(types.validateScreenEvent(event({ id: '../x' })), false)
  assert.equal(types.validateScreenEvent(event({ poster: 'https://example.com/p.jpg' })), false) // posters 에 없는 포스터
  assert.equal(types.validateScreenEvent(event({ backgrounds: { kiosk: background('booth'), booth: null } })), false)
})
