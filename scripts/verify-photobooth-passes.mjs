#!/usr/bin/env node
// 카운터 이용권 발급·부스 사용 처리 검증 — DB 는 메모리 모형이라 운영 데이터를 건드리지 않는다.
// node scripts/verify-photobooth-passes.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function loadTs(relativePath, mocks, cache) {
  const filename = path.resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename);
  const mod = { exports: {} };
  cache.set(filename, mod.exports);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('@/')) return loadTs(path.relative(root, path.resolve(root, 'src', `${id.slice(2)}.ts`)), mocks, cache);
    return require(id);
  };
  new Function('require', 'module', 'exports', 'process', output)(localRequire, mod, mod.exports, process);
  cache.set(filename, mod.exports);
  return mod.exports;
}

/** supabase-js 쿼리 빌더의 필요한 만큼만 흉내 낸 메모리 DB */
function fakeDb() {
  const tables = { photobooth_passes: [], photobooth_pass_failures: [] };
  const failing = new Set();
  let seq = 1;
  const from = name => {
    const rows = (tables[name] ??= []);
    let action = 'select', value, opts = {}, single = false, maybe = false, limit = Infinity;
    const filters = [];
    const q = {
      select(_cols, o) { if (action === 'select') opts = o || {}; return q; },
      insert(v) { action = 'insert'; value = v; return q; },
      update(v) { action = 'update'; value = v; return q; },
      delete() { action = 'delete'; return q; },
      eq(f, v) { filters.push(r => r[f] === v); return q; },
      gte(f, v) { filters.push(r => r[f] != null && Date.parse(r[f]) >= Date.parse(v)); return q; },
      lt(f, v) { filters.push(r => r[f] != null && Date.parse(r[f]) < Date.parse(v)); return q; },
      or(expr) {
        const parts = expr.split(',').map(part => {
          const [f, op, ...rest] = part.split('.');
          const v = rest.join('.');
          return r => (op === 'is' ? r[f] == null : op === 'gt' ? r[f] != null && Date.parse(r[f]) > Date.parse(v) : false);
        });
        filters.push(r => parts.some(p => p(r)));
        return q;
      },
      order() { return q; },
      limit(n) { limit = n; return q; },
      single() { single = true; return q; },
      maybeSingle() { maybe = true; return q; },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    const run = () => {
      if (failing.has(name)) return { data: null, count: null, error: { message: 'simulated outage' } };
      const match = rows.filter(r => filters.every(f => f(r)));
      if (action === 'insert') {
        const row = { id: String(seq++), created_at: new Date().toISOString(), ...value };
        if (name === 'photobooth_passes' && rows.some(r => r.code === row.code)) return { data: null, error: { code: '23505' } };
        rows.push(row);
        return { data: single ? { ...row } : [{ ...row }], error: null };
      }
      if (action === 'update') { match.forEach(r => Object.assign(r, value)); return { data: match.map(r => ({ ...r })), error: null }; }
      if (action === 'delete') { for (const r of match) rows.splice(rows.indexOf(r), 1); return { data: null, error: null }; }
      if (opts.head) return { data: null, count: match.length, error: null };
      const data = match.slice(0, limit).map(r => ({ ...r }));
      if (maybe) return { data: data[0] ?? null, error: null };
      if (single) return { data: data[0], error: null };
      return { data, error: null };
    };
    return q;
  };
  return { client: { from }, tables, failing };
}

function response(body, options = {}) {
  const jar = {};
  return { body, status: options.status || 200, cookies: { set: (name, value, opts) => { jar[name] = { value, opts }; } }, jar };
}

function harness({ admin = false } = {}) {
  const db = fakeDb();
  let isAdmin = admin;
  const mocks = {
    '@/lib/supabase/service': { createServiceRoleClient: () => db.client },
    '@/lib/auth/require-admin': { requireAdmin: async () => (isAdmin ? { id: 'admin', email: 'a@b.c' } : null) },
    '@/lib/photobooth/current-event': { resolveCurrentEvent: async () => null },
    'next/server': { NextResponse: { json: response } },
  };
  const cache = new Map();
  return {
    db,
    setAdmin: v => { isAdmin = v; },
    auth: loadTs('src/lib/photobooth/counter-auth.ts', mocks, cache),
    passesLib: loadTs('src/lib/photobooth/passes.ts', mocks, cache),
    counter: loadTs('src/app/api/photobooth/counter/route.ts', mocks, cache),
    counterPasses: loadTs('src/app/api/photobooth/counter/passes/route.ts', mocks, cache),
    redeem: loadTs('src/app/api/photobooth/pass/route.ts', mocks, cache),
  };
}

let ipSeq = 0;
function req({ body, cookie, origin = 'https://www.acscent.co.kr', ip } = {}) {
  const headers = new Map([['host', 'www.acscent.co.kr'], ['x-forwarded-for', ip ?? `10.0.0.${++ipSeq}`]]);
  if (origin) headers.set('origin', origin);
  return {
    headers: { get: k => headers.get(k.toLowerCase()) ?? null },
    cookies: { get: name => (cookie && name === 'acscent-booth-counter' ? { value: cookie } : undefined) },
    nextUrl: { protocol: 'https:', origin: 'https://www.acscent.co.kr' },
    text: async () => JSON.stringify(body ?? {}),
    json: async () => body ?? {},
  };
}

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';

test('counter pairing: PIN required, cookie scoped, PIN change revokes paired devices', async () => {
  delete process.env.PHOTOBOOTH_COUNTER_PIN;
  const h = harness();
  assert.equal((await h.counter.POST(req({ body: { pin: '123456' } }))).status, 503, 'no PIN configured → pairing closed');
  assert.equal((await h.counter.GET(req())).body.access, null);

  process.env.PHOTOBOOTH_COUNTER_PIN = '24681357';
  assert.equal((await h.counter.POST(req({ body: { pin: '11111111' } }))).status, 401, 'wrong PIN');
  assert.equal((await h.counter.POST(req({ body: { pin: '24681357' }, origin: 'https://evil.example' }))).status, 403, 'cross-site');
  const ok = await h.counter.POST(req({ body: { pin: '24681357' } }));
  assert.equal(ok.status, 200);
  const cookie = ok.jar['acscent-booth-counter'];
  assert.equal(cookie.opts.httpOnly, true);
  assert.equal(cookie.opts.path, '/api/photobooth/counter');
  assert.equal((await h.counter.GET(req({ cookie: cookie.value }))).body.access, 'counter');
  assert.equal((await h.counter.GET(req({ cookie: cookie.value.replace(/.$/, c => (c === '0' ? '1' : '0')) }))).body.access, null, 'tampered');

  process.env.PHOTOBOOTH_COUNTER_PIN = '97531864';
  assert.equal((await h.counter.GET(req({ cookie: cookie.value }))).body.access, null, 'PIN change unpairs');

  // PIN 맞히기 — 같은 주소에서 1분에 8번까지만
  const ip = '10.9.9.9';
  let limited = false;
  for (let i = 0; i < 10; i++) if ((await h.counter.POST(req({ body: { pin: `0000000${i}` }, ip }))).status === 429) limited = true;
  assert.ok(limited, 'pairing attempts are rate limited');
});

test('counter issue: only counter/admin, 1~6 per press, today-midnight expiry, void rules', async () => {
  process.env.PHOTOBOOTH_COUNTER_PIN = '24681357';
  const h = harness();
  assert.equal((await h.counterPasses.POST(req({ body: { count: 1 } }))).status, 401, 'anonymous cannot issue');
  const cookie = (await h.counter.POST(req({ body: { pin: '24681357' } }))).jar['acscent-booth-counter'].value;

  assert.equal((await h.counterPasses.POST(req({ body: { count: 7 }, cookie }))).status, 400);
  assert.equal((await h.counterPasses.POST(req({ body: { count: 0 }, cookie }))).status, 400);
  const issued = await h.counterPasses.POST(req({ body: { count: 3 }, cookie }));
  assert.equal(issued.status, 200);
  assert.equal(issued.body.passes.length, 3);
  for (const pass of issued.body.passes) {
    assert.match(pass.code, /^\d{6}$/);
    assert.notEqual(pass.code, '110619', 'never the master code');
    assert.ok(Date.parse(pass.expires_at) > Date.now());
  }
  const rows = h.db.tables.photobooth_passes;
  assert.ok(rows.every(r => r.issued_via === 'counter' && r.status === 'issued'));

  const list = await h.counterPasses.GET(req({ cookie }));
  assert.deepEqual(list.body.stats, { issued: 3, used: 0, voided: 0 });

  // 사용한 이용권은 취소할 수 없고, 미사용분만 취소된다
  const [a, b] = issued.body.passes;
  assert.equal((await h.redeem.POST(req({ body: { code: a.code } }))).status, 200);
  assert.equal((await h.counterPasses.PATCH(req({ body: { id: a.id }, cookie }))).status, 409);
  assert.equal((await h.counterPasses.PATCH(req({ body: { id: b.id }, cookie }))).status, 200);
  assert.equal((await h.redeem.POST(req({ body: { code: b.code } }))).body.error, '취소된 이용권이에요. 직원에게 문의해주세요');
  assert.deepEqual((await h.counterPasses.GET(req({ cookie }))).body.stats, { issued: 2, used: 1, voided: 1 });

  // 관리자 로그인도 카운터 화면을 쓸 수 있다
  h.setAdmin(true);
  assert.equal((await h.counterPasses.POST(req({ body: { count: 1 } }))).status, 200);
});

test('booth redeem: once only, expiry, admin passes without expiry still work', async () => {
  process.env.PHOTOBOOTH_COUNTER_PIN = '24681357';
  const h = harness();
  const rows = h.db.tables.photobooth_passes;
  const past = new Date(Date.now() - 1000).toISOString();
  const future = new Date(Date.now() + 3600_000).toISOString();
  rows.push(
    { id: 'x1', code: '111111', status: 'issued', expires_at: future, created_at: past },
    { id: 'x2', code: '222222', status: 'issued', expires_at: past, created_at: past },
    { id: 'x3', code: '333333', status: 'issued', expires_at: null, created_at: past },
  );
  assert.equal((await h.redeem.POST(req({ body: { code: '111111' } }))).status, 200);
  const again = await h.redeem.POST(req({ body: { code: '111111' } }));
  assert.equal(again.status, 410);
  assert.equal(again.body.error, '이미 사용된 이용권이에요');

  const old = await h.redeem.POST(req({ body: { code: '222222' } }));
  assert.equal(old.status, 410);
  assert.match(old.body.error, /사용 기간이 지난/);
  assert.equal(rows.find(r => r.id === 'x2').status, 'issued', 'expired pass is not consumed');

  assert.equal((await h.redeem.POST(req({ body: { code: '333333' } }))).status, 200, 'admin pass without expiry');
  assert.equal((await h.redeem.POST(req({ body: { code: '110619' } }))).body.master, true);
});

test('booth keypad lock: 10 wrong codes in a minute lock every booth (master too), outage fails open', async () => {
  const h = harness();
  for (let i = 0; i < 10; i++) {
    const res = await h.redeem.POST(req({ body: { code: String(900000 + i) } }));
    assert.equal(res.status, 404);
  }
  assert.equal(h.db.tables.photobooth_pass_failures.length, 10);
  const locked = await h.redeem.POST(req({ body: { code: '110619' } }));
  assert.equal(locked.status, 429);
  assert.match(locked.body.error, /1분 뒤/);

  // 1분이 지나면 풀린다
  for (const row of h.db.tables.photobooth_pass_failures) row.created_at = new Date(Date.now() - 61_000).toISOString();
  assert.equal((await h.redeem.POST(req({ body: { code: '110619' } }))).status, 200);

  // 틀린 입력 기록을 못 읽어도(테이블 장애·마이그레이션 전) 손님을 막지 않는다
  h.db.failing.add('photobooth_pass_failures');
  assert.equal((await h.redeem.POST(req({ body: { code: '110619' } }))).status, 200);

  // 이미 쓴 번호를 다시 넣는 건 틀린 입력으로 세지 않는다
  h.db.failing.delete('photobooth_pass_failures');
  h.db.tables.photobooth_pass_failures.length = 0;
  h.db.tables.photobooth_passes.push({ id: 'u', code: '444444', status: 'used', expires_at: null, created_at: new Date().toISOString() });
  for (let i = 0; i < 12; i++) await h.redeem.POST(req({ body: { code: '444444' } }));
  assert.equal(h.db.tables.photobooth_pass_failures.length, 0);
});

test('counter expiry: KST midnight of the issue day, at least 2 hours', () => {
  const { counterPassExpiry, kstMidnightIso } = harness().passesLib;
  // 2026-09-24 14:00 KST → 2026-09-25 00:00 KST (= 09-24 15:00Z)
  assert.equal(counterPassExpiry(Date.parse('2026-09-24T05:00:00Z')), '2026-09-24T15:00:00.000Z');
  // 23:30 KST → 01:30 KST 다음 날 (최소 2시간)
  assert.equal(counterPassExpiry(Date.parse('2026-09-24T14:30:00Z')), '2026-09-24T16:30:00.000Z');
  // 00:10 KST 는 그날 자정까지
  assert.equal(kstMidnightIso(Date.parse('2026-09-24T15:10:00Z')), '2026-09-24T15:00:00.000Z');
  assert.equal(counterPassExpiry(Date.parse('2026-09-24T15:10:00Z')), '2026-09-25T15:00:00.000Z');
});
