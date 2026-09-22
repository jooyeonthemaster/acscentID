/**
 * Read-only background regression checks. No running server, credentials, network,
 * real metadata writes or additional dependencies are required.
 * Run: node scripts/verify-screen-backgrounds.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cache = new Map();

function loadTs(relativePath, mocks = {}, contextCache = cache) {
  const filename = path.resolve(root, relativePath);
  if (contextCache.has(filename)) return contextCache.get(filename);
  const module = { exports: {} };
  contextCache.set(filename, module.exports);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('.') || id.startsWith('@/')) {
      const resolved = id.startsWith('@/') ? path.resolve(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      if (resolved.endsWith('.json')) return JSON.parse(readFileSync(resolved, 'utf8'));
      return loadTs(path.relative(root, `${resolved}.ts`), mocks, contextCache);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', 'process', output)(localRequire, module, module.exports, mocks.__process || process);
  contextCache.set(filename, module.exports);
  return module.exports;
}

const types = loadTs('src/lib/screen-backgrounds/types.ts');
const validation = loadTs('src/lib/screen-backgrounds/validation.ts');
const theme = loadTs('src/lib/screen-backgrounds/theme.ts');
const catalog = JSON.parse(readFileSync(path.join(root, 'src/lib/screen-backgrounds/catalog.json'), 'utf8'));
const booth = catalog.filter(item => item.target === 'booth');
const kiosk = catalog.filter(item => item.target === 'kiosk');
const clone = (value, edits = {}) => ({ ...value, ...edits });

test('catalog contains 72 valid unique entries and every required collection', () => {
  assert.equal(catalog.length, 72);
  assert.equal(new Set(catalog.map(item => item.id)).size, 72);
  assert.equal(new Set(catalog.map(item => item.image_url)).size, 72);
  for (const target of types.SCREEN_TARGETS) {
    const entries = catalog.filter(item => item.target === target);
    assert.equal(entries.length, 36);
    assert.equal(entries.filter(item => item.collection === 'poster').length, 20);
    assert.equal(entries.filter(item => item.collection === 'study').length, 10);
    assert.equal(entries.filter(item => item.collection === 'legacy').length, 6);
    assert.deepEqual(entries.slice(0, 20).map(item => item.collection), Array(20).fill('poster'));
    assert.deepEqual(entries.map(item => item.display_order), entries.map(item => item.display_order).sort((a, b) => a - b));
  }
  for (const item of catalog) {
    assert.equal(validation.validateBackground(item), true, item.id);
    assert.equal(item.is_active, true, item.id);
    assert.match(item.image_url, new RegExp(`^/assets/screen-backgrounds/${item.target}/`));
    assert.doesNotMatch(item.image_url, /mockup|reference-study|photobooth\/frames/);
  }
});

test('all catalog images and thumbnails exist with exact WebP dimensions', async () => {
  for (const item of catalog) {
    for (const field of ['image_url', 'thumbnail_url']) {
      const filename = path.join(root, 'public', item[field]);
      assert.equal(existsSync(filename), true, `${item.id} ${field}`);
      const metadata = await sharp(filename).metadata();
      const thumbnail = field === 'thumbnail_url';
      const dimensions = item.target === 'booth' ? (thumbnail ? [384, 216] : [1920, 1080]) : (thumbnail ? [216, 384] : [1080, 1920]);
      assert.deepEqual([metadata.width, metadata.height], dimensions, `${item.id} ${field}`);
      assert.equal(metadata.format, 'webp', item.id);
    }
  }
});

test('selection remains within the requested target', () => {
  assert.deepEqual(types.resolveSelected(catalog, { booth: kiosk[2].id, kiosk: booth[4].id }), {
    booth: booth[0].id, kiosk: kiosk[0].id,
  });
  assert.deepEqual(types.resolveSelected(catalog, { booth: booth[6].id, kiosk: kiosk[10].id }), {
    booth: booth[6].id, kiosk: kiosk[10].id,
  });
});

test('hidden, removed and unknown selections fall back to an active option', () => {
  const hidden = catalog.map(item => item.id === booth[0].id ? clone(item, { is_active: false }) : item);
  assert.equal(types.resolveSelected(hidden, { booth: booth[0].id }).booth, booth[1].id);
  const removed = catalog.filter(item => item.id !== kiosk[0].id);
  assert.equal(types.resolveSelected(removed, { kiosk: kiosk[0].id }).kiosk, kiosk[1].id);
  assert.equal(types.resolveSelected(catalog, { booth: 'missing-id' }).booth, booth[0].id);
});

test('an empty target stays empty and neutral background is valid', () => {
  const hidden = catalog.map(item => item.target === 'booth' ? clone(item, { is_active: false }) : item);
  assert.deepEqual(types.resolveSelected(hidden, { booth: booth[0].id, kiosk: kiosk[1].id }), { booth: null, kiosk: kiosk[1].id });
  assert.deepEqual(types.resolveSelected([], { booth: booth[0].id, kiosk: kiosk[0].id }), { booth: null, kiosk: null });
  for (const target of types.SCREEN_TARGETS) {
    const fallback = types.neutralBackground(target);
    assert.equal(validation.validateBackground(fallback), true);
    assert.equal(fallback.target, target);
    assert.equal(fallback.collection, 'system');
  }
});

test('image URLs reject executable schemes, traversal, credentials and invalid types', () => {
  const rejected = [null, undefined, 42, {}, '', 'javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'http://example.com/image.jpg', '//example.com/image.jpg', '/assets/../secret.png', '/assets/%2e%2e/secret.png', '/assets/x.png" onerror="alert(1)', 'https://user:password@example.com/image.png', 'https://user@example.com/image.png', 'https://' + 'a'.repeat(2050)];
  for (const url of rejected) assert.equal(validation.validImageUrl(url), false, String(url));
  for (const url of ['/assets/screen-backgrounds/booth/booth-poster-01.webp', 'https://example.com/image.png', 'https://example.com/image.png?version=2']) {
    assert.equal(validation.validImageUrl(url), true, url);
  }
});

test('background validation rejects malformed field types and colors', () => {
  const invalid = [
    { id: '../escape' }, { id: '' }, { id: 'x'.repeat(101) }, { target: 'both' },
    { title: '' }, { title: '   ' }, { title: 1 }, { title: 'x'.repeat(81) },
    { collection: 7 }, { collection: 'x'.repeat(81) }, { palette: 'untrusted-css' }, { tone: 'black' },
    { ink: 'red' }, { accent: '#fff' }, { base: 'url(javascript:alert(1))' },
    { ink: '#gggggg' }, { accent: 100 }, { base: null },
    { display_order: '1' }, { display_order: 0.5 }, { display_order: Infinity }, { display_order: 100001 },
    { is_active: 'true' }, { is_active: 1 }, { image_url: 'javascript:alert(1)' }, { thumbnail_url: {} },
  ];
  for (const edits of invalid) assert.equal(validation.validateBackground(clone(booth[0], edits)), false, JSON.stringify(edits));
  for (const value of [null, undefined, false, 'background']) assert.equal(validation.validateBackground(value), false);
  assert.equal(validation.EDITABLE_BACKGROUND_FIELDS.includes('id'), false);
  assert.equal(validation.EDITABLE_BACKGROUND_FIELDS.includes('target'), false);
});

test('all presets have readable kiosk text and buttons, including dark themes', () => {
  for (const item of catalog) {
    const resolved = theme.toKioskTheme(item);
    for (const color of ['ink', 'inkSoft', 'accent']) {
      assert.ok(theme.contrast(resolved[color], resolved.paper) >= 4.5, `${item.id} ${color}`);
    }
    assert.ok(theme.contrast(resolved.onAccent, resolved.accent) >= 4.5, `${item.id} button`);
    assert.match(resolved.surface, /^#[0-9a-f]{6}$/i);
    assert.match(resolved.surfaceStrong, /^#[0-9a-f]{6}$/i);
  }
});

test('fonts cover all five palettes in booth and kiosk themes', () => {
  const expected = { wanted: 'Wanted Sans', jua: 'Jua', kirang: 'Kirang Haerang', serif: 'Noto Serif KR', soft: 'S-Core Dream' };
  for (const palette of types.BACKGROUND_PALETTES) {
    const background = clone(booth[0], { palette });
    const boothTheme = theme.toBoothTheme(background);
    const kioskTheme = theme.toKioskTheme(background);
    assert.equal(boothTheme.fontLabel, expected[palette]);
    assert.equal(boothTheme.image, background.image_url);
    assert.equal(kioskTheme.image, background.image_url);
    assert.equal(boothTheme.displayFont, kioskTheme.displayFont);
    assert.equal(boothTheme.bodyFont, kioskTheme.bodyFont);
    assert.ok(boothTheme.displayFont.length > 10 && boothTheme.bodyFont.length > 10);
  }
  assert.equal(theme.toBoothTheme(clone(booth[0], { palette: 'unknown' })).fontLabel, 'Wanted Sans');
});

test('color utilities retain numeric bounds and known contrast ratios', () => {
  assert.equal(theme.mixColor('#000000', '#ffffff', 0), '#000000');
  assert.equal(theme.mixColor('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(theme.mixColor('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(theme.contrast('#000000', '#ffffff'), 21);
  assert.equal(theme.contrast('#ffffff', '#ffffff'), 1);
});

test('valid custom colors stay readable even if the declared tone disagrees with the base', () => {
  for (const edits of [
    { tone: 'dark', base: '#ffffff', ink: '#ffffff', accent: '#ffffff' },
    { tone: 'light', base: '#000000', ink: '#000000', accent: '#000000' },
    { tone: 'light', base: '#777777', ink: '#777777', accent: '#777777' },
  ]) {
    const background = clone(booth[0], edits);
    assert.equal(validation.validateBackground(background), true);
    const resolved = theme.toKioskTheme(background);
    assert.ok(theme.contrast(resolved.ink, resolved.paper) >= 4.5);
    assert.ok(theme.contrast(resolved.accent, resolved.paper) >= 4.5);
    assert.ok(theme.contrast(resolved.inkSoft, resolved.paper) >= 4.5);
  }
});

const merge = loadTs('src/lib/screen-backgrounds/merge.ts');

test('tombstones persist across fresh merges without resurrecting bundled presets', () => {
  const records = [
    { kind: 'deleted', id: booth[0].id },
    { kind: 'background', background: clone(booth[1], { is_active: false }) },
    { kind: 'selection', target: 'booth', id: booth[0].id },
    { kind: 'selection', target: 'kiosk', id: booth[2].id },
  ];
  for (let reload = 0; reload < 2; reload++) {
    const snapshot = merge.mergeBackgroundRecords(catalog, records);
    assert.equal(snapshot.backgrounds.length, 71);
    assert.equal(snapshot.backgrounds.some(item => item.id === booth[0].id), false);
    assert.equal(snapshot.backgrounds.find(item => item.id === booth[1].id).is_active, false);
    assert.equal(snapshot.selected.booth, booth[2].id);
    assert.equal(snapshot.selected.kiosk, kiosk[0].id);
  }
  const empty = merge.mergeBackgroundRecords(catalog, catalog.map(item => ({ kind: 'deleted', id: item.id })));
  assert.deepEqual(empty, { backgrounds: [], selected: { booth: null, kiosk: null } });
});

test('merge honors custom edits/order and rejects damaged remote records', () => {
  const custom = clone(booth[0], { id: 'custom-test-background', title: '새 배경', display_order: -10 });
  const edited = clone(booth[3], { title: '수정한 배경', display_order: -5 });
  const snapshot = merge.mergeBackgroundRecords(catalog, [
    { kind: 'background', background: custom }, { kind: 'background', background: edited },
    { kind: 'selection', target: 'booth', id: edited.id },
  ]);
  assert.equal(snapshot.backgrounds.length, 73);
  assert.equal(snapshot.backgrounds[0].id, custom.id);
  assert.equal(snapshot.backgrounds[1].title, '수정한 배경');
  assert.equal(snapshot.selected.booth, edited.id);
  for (const record of [null, {}, { kind: 'deleted', id: '../escape' }, { kind: 'background', background: { id: booth[0].id, is_active: false } }, { kind: 'selection', target: 'wrong', id: booth[0].id }]) {
    assert.throws(() => merge.mergeBackgroundRecords(catalog, [record]));
  }
});

function isolatedStore() {
  const records = new Map();
  // 실제 Supabase처럼: list 는 매번 최신(eTag 포함), download 는 요청 주소 단위로 CDN 캐시된다.
  const versions = new Map();
  const cdn = new Map();
  const behavior = { failList: false, failWrite: false };
  const bucket = {
    async list(prefix, { offset, limit }) {
      if (behavior.failList) return { data: null, error: new Error('simulated offline') };
      const names = [...records.keys()].filter(key => key.startsWith(prefix + '/')).map(key => ({ name: key.slice(prefix.length + 1), metadata: { eTag: `"v${versions.get(key)}"` } })).sort((a, b) => a.name.localeCompare(b.name));
      return { data: names.slice(offset, offset + limit), error: null };
    },
    async download(url) {
      if (cdn.has(url)) return { data: { text: async () => cdn.get(url) }, error: null };
      const key = url.split('?')[0];
      if (!records.has(key)) return { data: null, error: new Error('missing mock object') };
      cdn.set(url, records.get(key));
      return { data: { text: async () => records.get(key) }, error: null };
    },
    async upload(key, value) {
      if (behavior.failWrite) return { error: new Error('simulated failure') };
      records.set(key, value.toString());
      versions.set(key, (versions.get(key) ?? 0) + 1);
      return { error: null };
    },
  };
  const mocks = { '@/lib/supabase/service': { createServiceRoleClient: () => ({ storage: { from: () => bucket } }) } };
  return { store: loadTs('src/lib/screen-backgrounds/store.ts', mocks, new Map()), records, behavior };
}

test('store keeps IDs/targets immutable and preserves original images when deleting', async () => {
  const { store, records } = isolatedStore();
  const initial = await store.readBackgroundSnapshot();
  assert.equal(initial.backgrounds.length, 72);
  const edited = await store.saveBackground({ id: booth[0].id, target: 'kiosk', title: '  이름 수정  ' }, false);
  assert.equal(edited.target, 'booth');
  assert.equal(edited.id, booth[0].id);
  assert.equal(edited.title, '이름 수정');
  const replaced = await store.saveBackground({ id: booth[0].id, image_url: 'https://example.com/new.webp' }, false);
  assert.equal(replaced.thumbnail_url, replaced.image_url);
  const countBeforeInvalid = records.size;
  await assert.rejects(store.saveBackground({ id: booth[0].id, image_url: 'javascript:alert(1)' }, false), error => error.status === 400);
  assert.equal(records.size, countBeforeInvalid);
  await store.deleteBackground(booth[0].id);
  const tombstone = [...records].find(([key]) => key.endsWith(`/${booth[0].id}.json`));
  assert.deepEqual(JSON.parse(tombstone[1]), { kind: 'deleted', id: booth[0].id });
  assert.equal((await store.readBackgroundSnapshot()).backgrounds.some(item => item.id === booth[0].id), false);
  assert.equal(existsSync(path.join(root, 'public', booth[0].image_url)), true);
  await assert.rejects(store.saveBackground({ id: booth[0].id, title: 'restore attempt' }, false), error => error.status === 404);
});

test('store synchronizes independent edits and refuses hidden or cross-target selections', async () => {
  const { store } = isolatedStore();
  await store.selectSharedBackground('booth', booth[3].id);
  assert.equal((await store.readBackgroundSnapshot()).selected.booth, booth[3].id);
  await assert.rejects(store.selectSharedBackground('booth', kiosk[0].id), error => error.status === 409);
  await store.saveBackground({ id: booth[3].id, is_active: false }, false);
  await assert.rejects(store.selectSharedBackground('booth', booth[3].id), error => error.status === 409);
  assert.equal((await store.readBackgroundSnapshot()).selected.booth, booth[0].id);
  await Promise.all([
    store.saveBackground({ id: booth[5].id, title: '독립 수정 A' }, false),
    store.saveBackground({ id: kiosk[5].id, title: '독립 수정 B' }, false),
  ]);
  const snapshot = await store.readBackgroundSnapshot();
  assert.equal(snapshot.backgrounds.find(item => item.id === booth[5].id).title, '독립 수정 A');
  assert.equal(snapshot.backgrounds.find(item => item.id === kiosk[5].id).title, '독립 수정 B');
});

test('overwritten selections and edits are read fresh through a caching CDN', async () => {
  // 실기에서 난 버그: 저장은 성공했는데 곧바로 다시 읽으면 CDN이 옛 파일을 줘서 화면이 안 바뀌었다.
  const { store } = isolatedStore();
  await store.selectSharedBackground('kiosk', kiosk[1].id);
  assert.equal((await store.readBackgroundSnapshot()).selected.kiosk, kiosk[1].id); // 캐시에 올라간다
  await store.selectSharedBackground('kiosk', kiosk[6].id);
  assert.equal((await store.readBackgroundSnapshot()).selected.kiosk, kiosk[6].id);
  await store.saveBackground({ id: kiosk[2].id, title: '첫 이름' }, false);
  await store.readBackgroundSnapshot();
  await store.saveBackground({ id: kiosk[2].id, title: '바꾼 이름' }, false);
  assert.equal((await store.readBackgroundSnapshot()).backgrounds.find(item => item.id === kiosk[2].id).title, '바꾼 이름');
});

test('store creates fresh IDs, resolves all-deleted targets and fails closed on storage errors', async () => {
  const { store, records, behavior } = isolatedStore();
  const created = await store.saveBackground(clone(booth[0], { id: 'attacker-chosen-id', title: '새 배경' }), true);
  assert.match(created.id, /^custom-[0-9a-f-]{36}$/);
  for (const item of [...booth, created]) await store.deleteBackground(item.id);
  const snapshot = await store.readBackgroundSnapshot();
  assert.equal(snapshot.selected.booth, null);
  assert.equal(snapshot.backgrounds.filter(item => item.target === 'booth').length, 0);
  assert.equal(snapshot.backgrounds.filter(item => item.target === 'kiosk').length, 36);
  behavior.failList = true;
  await assert.rejects(store.readBackgroundSnapshot(), error => error.status === 503);
  behavior.failList = false;
  const damagedPath = `${path.posix.dirname(records.keys().next().value)}/damaged.json`;
  records.set(damagedPath, '{not-json');
  await assert.rejects(store.readBackgroundSnapshot(), error => error.status === 503);
  records.delete(damagedPath);
  behavior.failWrite = true;
  await assert.rejects(store.saveBackground({ id: kiosk[0].id, title: 'not persisted' }, false), error => error.status === 503);
  assert.notEqual((await store.readBackgroundSnapshot()).backgrounds.find(item => item.id === kiosk[0].id).title, 'not persisted');
});

function mockRequest({ url = 'https://example.test/api/screen-backgrounds', method = 'GET', body, headers = {}, cookie } = {}) {
  return {
    nextUrl: new URL(url), method, headers: new Headers(headers),
    cookies: { get: () => cookie ? { value: cookie } : undefined },
    text: async () => typeof body === 'string' ? body : body === undefined ? '' : JSON.stringify(body),
  };
}

test('device auth signs short-lived sessions, rejects tampering and enforces origin', () => {
  const auth = loadTs('src/lib/screen-backgrounds/device-auth.ts', {
    __process: { env: { SCREEN_BACKGROUND_SESSION_SECRET: 'isolated-test-only-secret', SCREEN_BACKGROUND_ADMIN_PIN: '654321' } },
  }, new Map());
  assert.equal(auth.correctDevicePin('654321'), true);
  for (const pin of ['110619', 654321, '654321 ', '0654321', null]) assert.equal(auth.correctDevicePin(pin), false);
  const token = auth.issueDeviceSession();
  assert.equal(auth.validDeviceSession(mockRequest({ cookie: token })), true);
  for (const cookie of [token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), token + '.extra', '123.not-a-signature', auth.issueDeviceSession(Date.now() - 600_001), auth.issueDeviceSession(Date.now() + 60_000)]) {
    assert.equal(auth.validDeviceSession(mockRequest({ cookie })), false, 'expired, forged or invalid lifetime');
  }
  assert.equal(auth.sameOrigin(mockRequest({ headers: { origin: 'https://example.test' } })), true);
  assert.equal(auth.sameOrigin(mockRequest({ headers: { origin: 'https://attacker.test' } })), false);
  assert.equal(auth.sameOrigin(mockRequest({ headers: { 'sec-fetch-site': 'cross-site' } })), false);
  // 매장 부스: 개발 서버를 사설 IP 로 열면 nextUrl 은 localhost 로 정규화된다 — Host 헤더로 같은 사이트를 판정
  assert.equal(auth.sameOrigin(mockRequest({ url: 'http://localhost:3000/api/screen-backgrounds/unlock', headers: { origin: 'http://172.30.1.40:3000', host: '172.30.1.40:3000' } })), true);
  assert.equal(auth.sameOrigin(mockRequest({ url: 'http://localhost:3000/api/screen-backgrounds/unlock', headers: { origin: 'http://attacker.test', host: '172.30.1.40:3000' } })), false);
  const attempt = mockRequest({ headers: { 'x-forwarded-for': '192.0.2.15' } });
  for (let index = 0; index < 8; index++) assert.equal(auth.pinAttemptAllowed(attempt), true);
  assert.equal(auth.pinAttemptAllowed(attempt), false);
});

function mockRoutes() {
  const state = { admin: false, device: false, sameOrigin: true, reads: 0, writes: 0 };
  class BackgroundError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
  const store = {
    BackgroundError,
    async readBackgroundSnapshot() { state.reads++; return { backgrounds: [booth[0], clone(booth[1], { is_active: false }), kiosk[0]], selected: { booth: booth[0].id, kiosk: kiosk[0].id } }; },
    async saveBackground(body) { state.writes++; return body; },
    async deleteBackground() { state.writes++; },
    async selectSharedBackground() { state.writes++; },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200, headers: options.headers }) } },
    '@/lib/auth/require-admin': { requireAdmin: async () => state.admin ? { id: 'test-admin' } : null },
    '@/lib/screen-backgrounds/store': store,
    '@/lib/screen-backgrounds/device-auth': { sameOrigin: () => state.sameOrigin, validDeviceSession: () => state.device },
  };
  const context = new Map();
  return {
    state,
    admin: loadTs('src/app/api/admin/screen-backgrounds/route.ts', mocks, context),
    device: loadTs('src/app/api/screen-backgrounds/route.ts', mocks, context),
  };
}

test('admin routes reject unauthenticated/cross-origin CRUD before touching storage', async () => {
  const { state, admin } = mockRoutes();
  state.device = true; // A device PIN session must not authorize catalogue CRUD.
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']) {
    assert.equal((await admin[method](mockRequest({ method }))).status, 403, method);
  }
  assert.equal(state.reads + state.writes, 0);
  state.admin = true;
  state.sameOrigin = false;
  assert.equal((await admin.POST(mockRequest({ method: 'POST', body: booth[0] }))).status, 403);
  assert.equal(state.writes, 0);
  state.sameOrigin = true;
  assert.equal((await admin.GET(mockRequest())).status, 200);
  assert.equal((await admin.POST(mockRequest({ method: 'POST', body: '{bad json' }))).status, 400);
  assert.equal((await admin.POST(mockRequest({ method: 'POST', body: 'a'.repeat(20001) }))).status, 413);
  assert.equal((await admin.PUT(mockRequest({ method: 'PUT', body: { target: 'other', id: booth[0].id } }))).status, 400);
  assert.equal(state.writes, 0);
});

test('device API publishes only active target rows and guards selection-only writes', async () => {
  const { state, device } = mockRoutes();
  const response = await device.GET(mockRequest({ url: 'https://example.test/api/screen-backgrounds?target=booth' }));
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.backgrounds.map(item => item.id), [booth[0].id]);
  assert.match(response.headers['Cache-Control'], /no-store/);
  assert.equal((await device.GET(mockRequest())).status, 400);
  const request = mockRequest({ method: 'PUT', body: { target: 'booth', id: booth[0].id } });
  assert.equal((await device.PUT(request)).status, 403);
  state.device = true;
  state.sameOrigin = false;
  assert.equal((await device.PUT(request)).status, 403);
  assert.equal(state.writes, 0);
  state.sameOrigin = true;
  assert.equal((await device.PUT(request)).status, 200);
  assert.equal(state.writes, 1);
  for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal(device[method], undefined);
});

test('unlock sets a scoped HTTP-only session cookie only after valid same-origin PIN', async () => {
  const isolatedAuth = loadTs('src/lib/screen-backgrounds/device-auth.ts', {
    __process: { env: { SCREEN_BACKGROUND_SESSION_SECRET: 'unlock-test-only-secret', SCREEN_BACKGROUND_ADMIN_PIN: '654321' } },
  }, new Map());
  const cookies = [];
  const route = loadTs('src/app/api/screen-backgrounds/unlock/route.ts', {
    '@/lib/screen-backgrounds/device-auth': isolatedAuth,
    'next/server': { NextResponse: { json: (data, options = {}) => ({
      data, status: options.status || 200, headers: options.headers,
      cookies: { set: (name, value, attributes) => cookies.push({ name, value, attributes }) },
    }) } },
  }, new Map());
  const options = { url: 'https://example.test/api/screen-backgrounds/unlock', method: 'POST', headers: { origin: 'https://example.test', 'x-forwarded-for': '192.0.2.27' } };
  const bad = await route.POST(mockRequest({ ...options, body: { pin: '000000' } }));
  assert.equal(bad.status, 401);
  assert.equal(cookies.length, 0);
  const crossOrigin = await route.POST(mockRequest({ ...options, headers: { origin: 'https://attacker.test' }, body: { pin: '654321' } }));
  assert.equal(crossOrigin.status, 403);
  assert.equal(cookies.length, 0);
  const good = await route.POST(mockRequest({ ...options, body: { pin: '654321' } }));
  assert.equal(good.status, 200);
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, isolatedAuth.DEVICE_COOKIE);
  assert.equal(isolatedAuth.validDeviceSession(mockRequest({ cookie: cookies[0].value })), true);
  assert.deepEqual(cookies[0].attributes, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/screen-backgrounds', maxAge: 600 });
  assert.equal(JSON.stringify(good.data).includes('654321'), false);
});
