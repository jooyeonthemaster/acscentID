#!/usr/bin/env node
// 조각 영상 만들기 — 오픈라우터 영상 API(POST /api/v1/videos)로 첫 · 끝 프레임을 정해 영상을 만든다. 키 값은 출력하지 않는다.
//
//   node wan-clips.mjs <spec.json> [--dry] [--only 이름,이름] [--jobs 6]
//
// spec.json(경로는 spec 파일 기준 상대 경로도 된다):
// {
//   "imageDir": "../art",                 // 첫 · 끝 프레임 그림이 있는 폴더
//   "outDir": "../art/clips",             // 원본 mp4 를 둘 곳(이미 있는 이름은 건너뛴다 — 다시 만들려면 지운다)
//   "keyEnv": "OPENROUTER_KEY_RND",       // 키가 든 환경 변수 이름(~/.config/openrouter/keys.env 를 읽어 둔 셸에서)
//   "model": "alibaba/wan-3.0", "resolution": "720p", "aspect": "9:16",
//   "title": "R&D 프로그램이름 clips",    // 오픈라우터 X-Title(비용 기록에서 알아보게)
//   "look": "모든 프롬프트 뒤에 붙일 공통 문장(화풍 · 카메라 고정 · 처음과 끝 같은 자세 · 글자 없음)",
//   "clips": [ { "name": "hi-gate", "first": "01-gate.jpg", "last": "01-gate.jpg", "duration": 4, "prompt": "..." } ]
// }
// --dry: 만들지 않고 모델 단가로 어림 비용만. 결과는 한 줄씩 JSON, 마지막 줄 합계 $. outDir/_log.jsonl 에도 남긴다.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve, extname, basename } from 'node:path'
import { tmpdir } from 'node:os'

let specPath = null, DRY = false, ONLY = null, JOBS = 6
for (const argv = process.argv.slice(2); argv.length;) {
  const a = argv.shift()
  if (a === '--dry') DRY = true
  else if (a === '--only') ONLY = argv.shift().split(',')
  else if (a === '--jobs') JOBS = Number(argv.shift())
  else specPath = a
}
if (!specPath) { console.error('사용: node wan-clips.mjs <spec.json> [--dry] [--only a,b] [--jobs 6]'); process.exit(1) }

const base = dirname(resolve(specPath))
const spec = JSON.parse(readFileSync(specPath, 'utf8'))
const at = (p) => resolve(base, p)
const imageDir = at(spec.imageDir), outDir = at(spec.outDir)
const model = spec.model ?? 'alibaba/wan-3.0', resolution = spec.resolution ?? '720p', aspect = spec.aspect ?? '9:16'
const KEY = process.env[spec.keyEnv ?? 'OPENROUTER_KEY_RND']
if (!KEY) { console.error(`${spec.keyEnv ?? 'OPENROUTER_KEY_RND'} 환경 변수가 없다 — set -a; . ~/.config/openrouter/keys.env; set +a`); process.exit(1) }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': spec.title ?? 'R&D kiosk video clips' }
const clips = spec.clips.filter((c) => !ONLY || ONLY.includes(c.name))

// 모델 단가 · 길이 확인
const models = await (await fetch('https://openrouter.ai/api/v1/videos/models', { headers: H })).json()
const m = (models.data ?? models).find((x) => x.id === model)
if (!m) { console.error(`모델 ${model} 없음`); process.exit(1) }
const perSec = Number(m.pricing_skus?.[`duration_seconds_${resolution}`] ?? m.pricing_skus?.duration_seconds ?? NaN)
for (const c of clips) {
  if (!m.supported_durations?.includes(c.duration)) { console.error(`${c.name}: ${model} 는 ${c.duration}초를 못 만든다(${m.supported_durations?.join(',')})`); process.exit(1) }
  if (c.last && !m.supported_frame_images?.includes('last_frame')) { console.error(`${model} 는 끝 프레임을 못 받는다`); process.exit(1) }
}
const todo = clips.filter((c) => !existsSync(`${outDir}/${c.name}.mp4`))
const secs = todo.reduce((a, c) => a + c.duration, 0)
console.error(`${model} ${resolution} — 만들 것 ${todo.length}개 ${secs}초, 목록 단가로 약 $${(secs * perSec).toFixed(2)} (실제 청구는 이보다 낮을 수 있다 — Wan 3.0 720p 4초는 $0.30 이었다)`)
if (DRY) process.exit(0)
mkdirSync(outDir, { recursive: true })

/** 그림 → data URL(긴 변 1920 이하 jpeg) */
const cache = new Map()
function img(name) {
  if (cache.has(name)) return cache.get(name)
  const src = resolve(imageDir, name)
  if (!existsSync(src)) throw new Error(`그림 없음: ${src}`)
  // 줄인 그림 캐시 — 경로만으로 이름을 지으면 같은 이름으로 그림을 다시 그렸을 때 옛 그림이 들어간다(2026-11-18 실제로 11조각을 옛 그림으로 만듦). 수정 시각 · 크기를 넣는다
  const st = statSync(src)
  const out = `${tmpdir()}/wan-clips-${basename(name, extname(name))}-${Math.abs(hash(`${src}|${st.mtimeMs}|${st.size}`))}.jpg`
  if (!existsSync(out)) execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '1920', src, '--out', out], { stdio: 'ignore' })
  const url = `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`
  cache.set(name, url)
  return url
}
function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h }

async function make(c) {
  const out = `${outDir}/${c.name}.mp4`
  if (existsSync(out)) return { name: c.name, skip: true }
  const frame_images = [{ type: 'image_url', image_url: { url: img(c.first) }, frame_type: 'first_frame' }]
  if (c.last) frame_images.push({ type: 'image_url', image_url: { url: img(c.last) }, frame_type: 'last_frame' })
  const res = await fetch('https://openrouter.ai/api/v1/videos', { method: 'POST', headers: H, body: JSON.stringify({
    model, prompt: [c.prompt, spec.look].filter(Boolean).join(' '), duration: c.duration, aspect_ratio: aspect, resolution, generate_audio: false, frame_images,
  }) })
  const job = await res.json().catch(() => ({}))
  if (!job.id) return { name: c.name, ok: false, err: JSON.stringify(job).slice(0, 300) }
  const t = Date.now()
  for (;;) {
    await new Promise((ok) => setTimeout(ok, 15000))
    const p = await (await fetch(`https://openrouter.ai/api/v1/videos/${job.id}`, { headers: H })).json().catch(() => ({}))
    if (p.status === 'completed') {
      const v = await fetch(`https://openrouter.ai/api/v1/videos/${job.id}/content?index=0`, { headers: H })
      writeFileSync(out, Buffer.from(await v.arrayBuffer()))
      return { name: c.name, ok: true, secs: Math.round((Date.now() - t) / 1000), cost: p.usage?.cost }
    }
    if (['failed', 'cancelled', 'expired'].includes(p.status)) return { name: c.name, ok: false, status: p.status, err: JSON.stringify(p.error ?? '').slice(0, 300) }
    if (Date.now() - t > 25 * 60000) return { name: c.name, ok: false, err: '25분 넘음', id: job.id }
  }
}

let next = 0
const results = []
await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, async () => {
  while (next < todo.length) {
    const r = await make(todo[next++]).catch((e) => ({ ok: false, err: String(e).slice(0, 300) }))
    results.push(r); console.log(JSON.stringify(r)); appendFileSync(`${outDir}/_log.jsonl`, JSON.stringify({ ...r, at: new Date().toISOString(), model }) + '\n')
  }
}))
console.log(`$${results.reduce((a, r) => a + (r.cost ?? 0), 0).toFixed(3)} · 실패 ${results.filter((r) => r.ok === false).length}`)
