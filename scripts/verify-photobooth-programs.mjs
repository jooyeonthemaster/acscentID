#!/usr/bin/env node
// 포토부스 프로그램 14종 검증 — 목록·프롬프트·운영 모드·이용권 정책·데모 주소·사진 받기 세션 토큰.
// 네트워크·자격 증명·운영 데이터 없이 돈다. node scripts/verify-photobooth-programs.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const cache = new Map()

function loadTs(relativePath, mocks = {}) {
  const filename = path.resolve(root, relativePath)
  if (cache.has(filename)) return cache.get(filename)
  const mod = { exports: {} }
  cache.set(filename, mod.exports)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    if (id.startsWith('@/')) return loadTs(path.relative(root, path.resolve(root, 'src', `${id.slice(2)}.ts`)), mocks)
    if (id.startsWith('./') || id.startsWith('../')) return loadTs(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)), mocks)
    return require(id)
  }
  new Function('require', 'module', 'exports', 'process', output)(localRequire, mod, mod.exports, process)
  cache.set(filename, mod.exports)
  return mod.exports
}

const catalog = loadTs('src/lib/booth/programs/catalog.ts')
const prompts = loadTs('src/lib/booth/programs/prompts.ts')
const modes = loadTs('src/lib/booth/modes.ts')
const pass = loadTs('src/lib/booth/pass-policy.ts')
const demo = loadTs('src/lib/booth/demo.ts')
process.env.SCREEN_BACKGROUND_SESSION_SECRET ||= 'verify-secret'
const album = loadTs('src/lib/photobooth/album.ts')

const IDS = ['runway', 'fashion-time', 'idol-makeup', 'fan-card', 'graduation', 'history', 'timecapsule', 'brand-avatar', 'hanbok', 'traditional', 'wedding', 'future-family', 'music-video', 'memory-movie']

test('14개 프로그램 — id·순서·소개 그림·옵션', () => {
  assert.deepEqual(catalog.PROGRAMS.map((p) => p.id), IDS)
  for (const p of catalog.PROGRAMS) {
    assert.ok(existsSync(path.join(root, 'public', p.intro)), `${p.id} 소개 그림`)
    assert.ok(!/AC'?SCENT/i.test(JSON.stringify(p)), `${p.id} 에 AC'SCENT 표기 없음`)
    assert.ok(p.options.groups.length > 0)
    for (const g of p.options.groups) {
      assert.ok(g.options.length >= 2, `${p.id}/${g.id} 선택지 2개 이상`)
      assert.equal(new Set(g.options.map((o) => o.id)).size, g.options.length, `${p.id}/${g.id} id 중복 없음`)
    }
    assert.ok(catalog.validChoices(p, catalog.defaultChoices(p)), `${p.id} 기본값 유효`)
  }
  assert.equal(catalog.findProgram('wedding').capture.people, 2)
  assert.equal(catalog.findProgram('future-family').capture.shots, 2)
  for (const id of ['history', 'timecapsule', 'future-family', 'music-video', 'memory-movie']) assert.ok(catalog.findProgram(id).creative, `${id} 창작·편집 안내`)
})

test('옵션 검사 — 없는 값·빠진 그룹은 거절', () => {
  const p = catalog.findProgram('runway')
  assert.equal(catalog.validChoices(p, { look: 'glam' }), null)
  assert.equal(catalog.validChoices(p, { look: 'nope', stage: 'runway' }), null)
  assert.equal(catalog.validChoices(p, 'x'), null)
  assert.deepEqual(catalog.validChoices(p, { look: 'glam', stage: 'studio', extra: 'ignored' }), { look: 'glam', stage: 'studio' })
})

/** 모든 옵션 조합 */
function* combos(p) {
  const groups = p.options.groups
  const walk = function* (i, acc) {
    if (i === groups.length) { yield acc; return }
    for (const o of groups[i].options) yield* walk(i + 1, { ...acc, [groups[i].id]: o.id })
  }
  yield* walk(0, {})
}

test('사진 프로그램 프롬프트 — 모든 조합이 만들어지고, 얼굴 고정·글자 금지가 들어간다', () => {
  let n = 0
  for (const p of catalog.PROGRAMS.filter((x) => x.kind === 'photo')) {
    for (const c of combos(p)) {
      const text = prompts.buildProgramPrompt(p, c, p.capture.shots)
      n++
      assert.ok(text.length > 300, `${p.id} 프롬프트 길이`)
      assert.ok(!/undefined|\.\s*,|:\s*\./.test(text), `${p.id} 빈 조각 없음 ${JSON.stringify(c)}`)
      if (p.id !== 'brand-avatar') assert.match(text, /IDENTITY LOCK|SAME real/, `${p.id} 얼굴 고정`)
      assert.match(text, /DO NOT add any text|no readable letters/i, `${p.id} 글자 금지`)
    }
  }
  assert.ok(n > 100)
  assert.throws(() => prompts.buildProgramPrompt(catalog.findProgram('music-video'), {}, 1))
})

test('운영 모드·서버 허용 목록에 14종이 들어 있다', () => {
  for (const id of IDS) {
    assert.ok(modes.BOOTH_MODE_IDS.includes(id), `${id} 모드`)
    assert.equal(modes.findBoothMode(id).program, id)
  }
  assert.equal(modes.findBoothMode('wow').program, undefined)
  assert.equal(modes.findBoothMode('nope').id, 'wow')
})

test('이용권 정책 — 14종 기본 필요, K-WAVE 기본 없음, 10개 넘는 저장값도 읽는다', () => {
  for (const id of IDS) assert.equal(pass.passRequiredFor(id, null), true, id)
  assert.equal(pass.passRequiredFor('kwave-2026', null), false)
  assert.equal(pass.passRequiredFor('runway', { runway: false }), false)
  const all = Object.fromEntries(modes.BOOTH_MODE_IDS.map((id) => [id, false]))
  assert.ok(Object.keys(all).length > 10)
  assert.deepEqual(pass.parsePassSettings(all), all)
  assert.equal(pass.boothPassRequired({ mode: 'hanbok', pass: all }), false)
  assert.equal(pass.parsePassSettings({ 'BAD ID': true }), null)
})

test('데모 — AI 아이돌 4개 + 프로그램 14개(매장 포토부스 카드는 2026-10-15 뺐다), 주소 규칙 /booth?mode=<id>&demo=1', () => {
  const ids = demo.BOOTH_DEMOS.map((d) => d.id)
  for (const old of ['idol-ending-fairy', 'idol-album-jacket', 'idol-stage-fancam', 'idol-mv-still']) assert.ok(ids.includes(old), old)
  assert.ok(!ids.some((id) => id.startsWith('store-')))
  assert.equal(new Set(ids).size, ids.length)
  for (const id of IDS) {
    const d = demo.BOOTH_DEMOS.find((x) => x.mode === id)
    assert.ok(d, `${id} 카드`)
    assert.equal(demo.boothDemoHref(d), `/booth?mode=${id}&demo=1`)
    assert.ok(existsSync(path.join(root, 'public', d.screen)), `${id} 카드 그림 ${d.screen}`)
  }
  assert.equal(demo.boothDemoHref({ mode: 'wow', program: 'solo' }), '/booth?mode=wow&demo=1&program=solo')
})

test('휴대폰 사진 받기 세션 — 서명·만료·위조 거절', () => {
  const now = Date.now()
  const s = album.createAlbumSession(now)
  assert.equal(album.readAlbumToken(s.token, now), s.id)
  assert.equal(album.readAlbumToken(s.token, now + album.ALBUM_TTL_MS + 1000), null, '만료')
  assert.equal(album.readAlbumToken(s.token, 0), s.id, '지우기는 만료 뒤에도 서명으로')
  const forged = s.token.slice(0, -1) + (s.token.endsWith('0') ? '1' : '0')
  assert.equal(album.readAlbumToken(forged, now), null)
  assert.equal(album.readAlbumToken('../etc', now), null)
  assert.ok(album.isAlbumPhotoName(album.albumPhotoName()))
  assert.ok(!album.isAlbumPhotoName('../x.jpg'))
})
