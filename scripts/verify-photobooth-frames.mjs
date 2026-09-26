// Read-only regression tests: no credentials, network or production writes.
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
  const mod = { exports: {} };
  contextCache.set(filename, mod.exports);
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
  new Function('require', 'module', 'exports', 'process', output)(localRequire, mod, mod.exports, mocks.__process || process);
  contextCache.set(filename, mod.exports);
  return mod.exports;
}

loadTs('src/lib/photobooth/frame-catalog.ts');
const generated = JSON.parse(readFileSync(path.join(root, 'src/lib/photobooth/frame-catalog.json'), 'utf8'));

test('50 unique print overlays, ten families, transparent photos and full event footer', async () => {
  assert.equal(generated.length, 50);
  assert.equal(new Set(generated.map(f => f.id)).size, 50);
  assert.equal(new Set(generated.map(f => f.category)).size, 10);
  for (const frame of generated) {
    const file = path.join(root, 'public', frame.image_url);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, 1200); assert.equal(metadata.height, 1800);
    assert.equal(metadata.density, 300); assert.equal(metadata.hasAlpha, true);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const alpha = (x,y) => data[(y*info.width+x)*4+3];
    for(let y=160; y<1540; y+=17) for(let x=160; x<1040; x+=17) assert.equal(alpha(x,y),0,frame.title);
    for(let y=1564; y<1764; y+=7) for(let x=36; x<1164; x+=7) assert.equal(alpha(x,y),0,`footer: ${frame.title}`);
    assert.equal(alpha(10,10),255);
    assert.ok(existsSync(path.join(root,'public',frame.thumbnail_url)));
  }
});

// DS-RX1 PR(4x6) 는 4.13x6.15in 로 찍어 4x6in 로 자른다 — 원판 기준 위아래 ~28px, 좌우 ~19px 가 잘린다.
// 글자는 가장자리에서 40px 안쪽이어야 인화지에 온전히 남는다 (예전 아래 크레딧 줄은 재단 구간에 있었다).
test('every text in the frame sources stays inside the print trim safe area', () => {
  const SAFE = 40;
  for (const frame of generated) {
    const svg = readFileSync(path.join(root, 'public', frame.image_url.replace(/\.png$/, '.svg')), 'utf8');
    for (const [, attrs, label] of svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)) {
      const num = name => Number(attrs.match(new RegExp(`\\b${name}="([\\d.]+)"`))?.[1] ?? 0);
      const x = num('x'), y = num('y'), size = num('font-size'), spacing = num('letter-spacing');
      const anchor = attrs.match(/text-anchor="(\w+)"/)?.[1] ?? 'start';
      const width = label.length * (size * 0.62 + spacing);
      const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
      const where = `${frame.title} "${label}"`;
      assert.ok(y - size * 0.75 >= SAFE, `top trim: ${where}`);
      assert.ok(y + size * 0.2 <= 1800 - SAFE, `bottom trim: ${where}`);
      assert.ok(left >= SAFE && left + width <= 1200 - SAFE, `side trim: ${where}`);
    }
  }
});

function apiHarness() {
  const rows = new Map(); let admin = true; let event = null; let fail = false; let screenEvents = [];
  const db = { from() {
    let action='select', value, id, ignore=false;
    const query = {
      select(){return query}, order(){return query},
      eq(_field,v){id=v;return query},
      upsert(v,options){action='upsert';value=v;ignore=!!options?.ignoreDuplicates;return query},
      insert(v){action='insert';value=v;return query},
      single(){return query},
      update(v){action='update';value=v;return query},
      delete(){action='delete';return query},
      then(resolve,reject){
        if(fail) return Promise.resolve({data:null,error:{message:'simulated outage'}}).then(resolve,reject);
        if(action==='upsert' && (!ignore || !rows.has(value.id))) rows.set(value.id,{...rows.get(value.id),...value});
        if(action==='update' && rows.has(id)) rows.set(id,{...rows.get(id),...value});
        if(action==='delete') rows.delete(id);
        if(action==='insert') rows.set('custom',{id:'custom',is_active:true,...value});
        return Promise.resolve({data:[...rows.values()],error:null}).then(resolve,reject);
      }
    };return query;
  }};
  const mocks={
    '@/lib/auth/require-admin':{requireAdmin:async()=>admin?{id:'admin'}:null},
    '@/lib/supabase/service':{createServiceRoleClient:()=>db},
    '@/lib/photobooth/current-event':{resolveCurrentEvent:async()=>event},
    '@/lib/screen-events/store':{readScreenEvents:async()=>screenEvents},
    'next/server':{NextResponse:Object.assign(function(body,options={}){return {body,status:options.status||200,headers:options.headers}},{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})})},
  };
  const modules=new Map();
  return {
    rows, admin:loadTs('src/app/api/admin/photobooth/route.ts',mocks,modules),
    public:loadTs('src/app/api/photobooth/config/route.ts',mocks,modules),
    auth:value=>admin=value, event:value=>event=value, fail:value=>fail=value,
    // 화면 이벤트(ERP·노션 행사) — 바꾼 뒤엔 인스턴스 기억(20초)을 비워야 바로 보인다
    screenEvents:value=>{screenEvents=value;loadTs('src/lib/photobooth/event-scope.ts',mocks,modules).resetEventScopeCache();},
  };
}
const request=body=>({json:async()=>body,nextUrl:{searchParams:new URLSearchParams(body)}});

test('admin changes reach public catalog, hidden/deleted defaults never return',async()=>{
  const h=apiHarness(); const id=generated[0].id;
  assert.equal((await h.admin.GET()).body.assets.length,56);
  assert.equal((await h.public.GET()).body.frames.length,56);
  assert.equal((await h.admin.PATCH(request({id,is_active:false}))).status,200);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===id),false);
  assert.equal((await h.admin.GET()).body.assets.find(f=>f.id===id).is_active,false);
  await h.admin.PATCH(request({id,title:'수정 이름',display_order:-1}));
  assert.equal(h.rows.get(id).is_active,false,'second patch must retain previous hidden state');
  await h.admin.PATCH(request({id,is_active:true}));
  assert.equal((await h.public.GET()).body.frames[0].title,'수정 이름');
  await h.admin.DELETE(request({id}));
  for(let i=0;i<3;i++) {
    assert.equal((await h.public.GET()).body.frames.some(f=>f.id===id),false);
    assert.equal((await h.admin.GET()).body.assets.some(f=>f.id===id),false);
  }
  const another=generated[1].id;
  await h.admin.DELETE(request({id:another}));
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===another),false,'delete untouched default');
  const first=await h.public.GET();
  assert.equal(first.headers['Cache-Control'],'no-cache','browser must revalidate every poll');
  assert.ok(first.headers.ETag,'poll responses carry an ETag');
  const again=await h.public.GET({headers:{get:name=>name==='if-none-match'?first.headers.ETag:null}});
  assert.equal(again.status,304,'unchanged catalog answers 304 without a body');
  assert.equal(again.body,null);
});

test('authorization, uploads, event scope and offline error response',async()=>{
  const h=apiHarness();h.auth(false);
  for(const method of ['GET','POST','PATCH','DELETE']) assert.equal((await h.admin[method](request({id:generated[0].id}))).status,403);
  assert.equal(h.rows.size,0);h.auth(true);
  assert.equal((await h.admin.POST(request({kind:'frame',title:'직접 등록',image_url:'https://example.test/frame.png',event_id:'birthday'}))).status,200);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id==='custom'),false);
  h.event({id:'birthday',title:'Birthday'});
  assert.equal((await h.public.GET()).body.frames[0].id,'custom');
  await h.admin.DELETE(request({id:'custom'}));
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id==='custom'),false);
  h.fail(true);
  assert.equal((await h.public.GET()).status,500,'failure must not masquerade as an empty catalog');
});

test('live refresh: 1-second updates, deduplication, no overlapping fetch, offline retention, cleanup',async()=>{
  const effects=[];const applied=[];const listeners=new Map();const intervals=new Map();const timeouts=new Map();
  const original={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};
  let next=0, calls=0, body={frames:[{id:'one'}],templates:[]}, hold=null, fail=false;
  globalThis.window={
    setInterval(fn,ms){assert.equal(ms,1000);intervals.set(++next,fn);return next}, clearInterval(id){intervals.delete(id)},
    setTimeout(fn){timeouts.set(++next,fn);return next},clearTimeout(id){timeouts.delete(id)},
    addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)},
  };
  globalThis.document={hidden:false,addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)}};
  globalThis.fetch=async()=>{calls++;if(hold)await hold;if(fail)throw Error('offline');return {ok:true,json:async()=>body}};
  try {
    const hook=loadTs('src/hooks/useLiveBoothConfig.ts',{react:{useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}},new Map());
    const refresh=hook.useLiveBoothConfig(config=>applied.push(config));
    const cleanup=effects[0](); const settle=()=>new Promise(resolve=>setImmediate(resolve));
    await settle();assert.equal(applied.length,1);
    await refresh();assert.equal(applied.length,1,'unchanged polling does not recompose photos');
    body={frames:[],templates:[]};await refresh();assert.equal(applied.length,2,'empty catalog clears removed frames');
    fail=true;await refresh();assert.equal(applied.length,2);fail=false;
    let release;hold=new Promise(resolve=>release=resolve);const running=refresh();const before=calls;await refresh();assert.equal(calls,before);release();await running;hold=null;
    globalThis.document.hidden=true;for(const tick of intervals.values())tick();assert.equal(calls,before);
    globalThis.document.hidden=false;listeners.get('online')();await settle();assert.equal(calls,before+1);
    cleanup();assert.equal(intervals.size,0);assert.equal(listeners.size,0);assert.equal(timeouts.size,0);
  } finally { Object.assign(globalThis,original) }
});

// 행사(화면 이벤트)에 묶인 프레임은 그 행사가 적용 중(기간 안·지금 바로 적용)일 때만, 맨 앞에 — 모르는 행사는 거절
test('frames bound to a screen event show only while that event is live, first in order',async()=>{
  const h=apiHarness(); const kst=offset=>new Date(Date.now()+9*3600_000+offset*86400_000).toISOString().slice(0,10);
  const ev=(id,starts,ends,extra={})=>({id,source:'manual',erp_id:null,notion_block_id:null,store:'wow',title:id,starts_on:kst(starts),ends_on:kst(ends),
    posters:[],poster:null,backgrounds:{booth:null,kiosk:null},font_suggestions:[],font:null,analysis:null,approved:false,hidden:false,generated_at:null,generation_cost:null,updated_at:new Date().toISOString(),...extra});
  h.screenEvents([ev('now-fest',-1,1),ev('later-fest',5,6),ev('gone-fest',-1,1,{hidden:true}),ev('other-store',-1,1,{store:'id'})]);
  const [first,second]=generated;
  assert.equal((await h.admin.PATCH(request({id:first.id,screen_event_id:'later-fest'}))).status,200);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===first.id),false,'future event frame hidden');
  assert.equal((await h.admin.PATCH(request({id:second.id,screen_event_id:'now-fest'}))).status,200);
  const live=(await h.public.GET()).body.frames;
  assert.equal(live[0].id,second.id,'live event frame comes first');
  assert.equal(live[0].screen_event_id,'now-fest');
  // '지금 바로 적용'을 누르면 기간 전이라도 보인다
  h.screenEvents([ev('now-fest',-1,1),ev('later-fest',5,6,{forced_at:new Date().toISOString()})]);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===first.id),true,'forced event frame visible');
  // 숨긴 행사·다른 매장 행사·모르는 id 는 고를 수 없다
  for(const bad of ['gone-fest','other-store','nope','BAD ID'])
    assert.equal((await h.admin.PATCH(request({id:first.id,screen_event_id:bad}))).status,400,bad);
  // 행사가 지워지면(목록에서 사라지면) 묶인 프레임은 부스에 안 나온다 — 상시로 되살아나지 않는다
  h.screenEvents([]);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===second.id),false,'deleted event frame hidden');
  // 상시로 풀면 다시 보인다
  assert.equal((await h.admin.PATCH(request({id:second.id,screen_event_id:null}))).status,200);
  assert.equal((await h.public.GET()).body.frames.some(f=>f.id===second.id),true);
  // 공개 응답은 부스에 필요한 칸만
  const keys=new Set((await h.public.GET()).body.frames.flatMap(f=>Object.keys(f)));
  for(const key of keys) assert.ok(['id','kind','title','image_url','display_order','event_id','is_active','category','thumbnail_url','screen_event_id'].includes(key),key);
});
