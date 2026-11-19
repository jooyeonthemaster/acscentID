#!/usr/bin/env node
// 목소리 · 립싱크 도구 — ElevenLabs(목소리 만들기 · 받아쓰기) + Sync.so(영상 입 모양 맞추기)
//
// 키: 이 저장소 .env.local 의 ELEVENLABS_API_KEY · SYNC_API_KEY (환경변수에 있으면 그것을 먼저 쓴다).
// 키 값은 절대 찍지 않는다.
//
//   node voice-sync.mjs voices [ko]                                   목소리 목록(ko 면 한국어만)
//   node voice-sync.mjs tts "<대사>" out.mp3 [--voice id] [--model eleven_v3] [--timestamps out.json]
//   node voice-sync.mjs stt <소리|영상> out.json [--model scribe_v1]   받아쓰기(낱말마다 시작 · 끝 초)
//   node voice-sync.mjs lipsync <영상.mp4> <소리.wav|mp3> out.mp4
//        [--model lipsync-2|lipsync-2-pro|sync-3] [--mode cut_off|loop|bounce|silence|remap]
//        [--speaker x,y,frame] [--dry]
//
// 기록: 출력 파일 옆 _voice-log.jsonl 에 한 줄씩(무엇을 · 길이 · 글자 수 · 걸린 시간).
import fs from 'node:fs'
import path from 'node:path'

const KO_DEFAULT_VOICE = 'n2fbxG88jqAoaVPUy3IG' // Yooni - Natural & Clear (여, 한국어)

function loadEnv() {
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    const f = path.join(dir, '.env.local')
    if (fs.existsSync(f)) {
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
      return
    }
    const up = path.dirname(dir)
    if (up === dir) break
    dir = up
  }
}
loadEnv()

const args = process.argv.slice(2)
const flags = {}
const pos = []
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2)
    const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
    flags[k] = v
  } else pos.push(args[i])
}
const cmd = pos.shift()

function need(name) {
  const v = process.env[name]
  if (!v) { console.error(`${name} 가 없다 — 저장소 .env.local 을 확인`); process.exit(1) }
  return v
}
function log(out, rec) {
  const f = path.join(path.dirname(path.resolve(out)), '_voice-log.jsonl')
  fs.appendFileSync(f, JSON.stringify({ at: new Date().toISOString(), ...rec }) + '\n')
}
function fileBlob(p) {
  const ext = path.extname(p).slice(1).toLowerCase()
  const type = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' }[ext] || 'application/octet-stream'
  return new Blob([fs.readFileSync(p)], { type })
}
async function fail(res, what) {
  const t = await res.text()
  console.error(`${what} 실패 ${res.status}: ${t.slice(0, 500)}`)
  process.exit(1)
}

const EL = 'https://api.elevenlabs.io'
const elHead = () => ({ 'xi-api-key': need('ELEVENLABS_API_KEY') })

async function voices() {
  const res = await fetch(`${EL}/v2/voices?page_size=100`, { headers: elHead() })
  if (!res.ok) return fail(res, 'voices')
  const d = await res.json()
  for (const v of d.voices) {
    const lang = v.labels?.language || ''
    if (pos[0] === 'ko' && lang !== 'ko') continue
    console.log(`${v.voice_id}  ${v.name}  [${v.category}${v.labels?.gender ? ' · ' + v.labels.gender : ''}${lang ? ' · ' + lang : ''}]`)
  }
}

async function tts() {
  const [text, out] = pos
  if (!text || !out) { console.error('tts "<대사>" out.mp3'); process.exit(1) }
  const voice = flags.voice || KO_DEFAULT_VOICE
  const model = flags.model || 'eleven_v3'
  const t0 = Date.now()
  const withTs = Boolean(flags.timestamps)
  const url = `${EL}/v1/text-to-speech/${voice}${withTs ? '/with-timestamps' : ''}?output_format=mp3_44100_128`
  const body = { text, model_id: model }
  if (flags.stability) body.voice_settings = { stability: Number(flags.stability) }
  const res = await fetch(url, { method: 'POST', headers: { ...elHead(), 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) return fail(res, 'tts')
  if (withTs) {
    const d = await res.json()
    fs.writeFileSync(out, Buffer.from(d.audio_base64, 'base64'))
    fs.writeFileSync(flags.timestamps, JSON.stringify({ alignment: d.alignment, normalized_alignment: d.normalized_alignment }, null, 1))
  } else {
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()))
  }
  const sec = (Date.now() - t0) / 1000
  log(out, { kind: 'tts', out, voice, model, chars: text.length, sec })
  console.log(`${out}  (${text.length}자 · ${model} · ${sec.toFixed(1)}초)`)
}

async function stt() {
  const [inp, out] = pos
  if (!inp || !out) { console.error('stt <소리|영상> out.json'); process.exit(1) }
  const fd = new FormData()
  fd.append('model_id', flags.model || 'scribe_v1')
  fd.append('file', fileBlob(inp), path.basename(inp))
  if (flags.lang) fd.append('language_code', flags.lang)
  fd.append('timestamps_granularity', 'word')
  const t0 = Date.now()
  const res = await fetch(`${EL}/v1/speech-to-text`, { method: 'POST', headers: elHead(), body: fd })
  if (!res.ok) return fail(res, 'stt')
  const d = await res.json()
  fs.writeFileSync(out, JSON.stringify(d, null, 1))
  log(out, { kind: 'stt', in: inp, out, sec: (Date.now() - t0) / 1000 })
  console.log(d.text)
  const words = (d.words || []).filter((w) => w.type === 'word')
  if (words.length) console.log(`낱말 ${words.length}개 · ${words[0].start}s ~ ${words.at(-1).end}s`)
}

const SY = 'https://api.sync.so'
const syHead = () => ({ 'x-api-key': need('SYNC_API_KEY') })

async function lipsync() {
  const [video, audio, out] = pos
  if (!video || !audio || !out) { console.error('lipsync <영상> <소리> out.mp4'); process.exit(1) }
  const model = flags.model || 'lipsync-2'
  const options = { sync_mode: flags.mode || 'cut_off' }
  if (typeof flags.speaker === 'string') {
    const [x, y, frame] = flags.speaker.split(',').map(Number)
    options.active_speaker_detection = { auto_detect: false, coordinates: [x, y], frame_number: frame || 0 }
  }
  const mb = (p) => (fs.statSync(p).size / 1e6).toFixed(1)
  console.log(`모델 ${model} · ${JSON.stringify(options)} · 영상 ${mb(video)}MB · 소리 ${mb(audio)}MB`)
  if (flags.dry) return
  const fd = new FormData()
  fd.append('model', model)
  fd.append('options', JSON.stringify(options))
  fd.append('video', fileBlob(video), path.basename(video))
  fd.append('audio', fileBlob(audio), path.basename(audio))
  const t0 = Date.now()
  const res = await fetch(`${SY}/v2/generate`, { method: 'POST', headers: syHead(), body: fd })
  if (!res.ok) return fail(res, 'lipsync 요청')
  let job = await res.json()
  console.log(`작업 ${job.id} — 기다리는 중`)
  while (!['COMPLETED', 'FAILED', 'REJECTED', 'CANCELED'].includes(job.status)) {
    await new Promise((r) => setTimeout(r, 5000))
    const r = await fetch(`${SY}/v2/generate/${job.id}`, { headers: syHead() })
    if (!r.ok) return fail(r, 'lipsync 상태')
    job = await r.json()
    process.stdout.write(`  ${job.status} ${((Date.now() - t0) / 1000).toFixed(0)}s\r`)
  }
  console.log('')
  if (job.status !== 'COMPLETED') {
    log(out, { kind: 'lipsync', id: job.id, model, status: job.status, error: job.error })
    console.error(`실패: ${job.status} ${job.errorCode || ''} ${job.error || ''}`)
    process.exit(1)
  }
  const dl = await fetch(job.outputUrl, { headers: syHead(), redirect: 'follow' })
  if (!dl.ok) return fail(dl, '결과 받기')
  fs.writeFileSync(out, Buffer.from(await dl.arrayBuffer()))
  const sec = (Date.now() - t0) / 1000
  log(out, { kind: 'lipsync', id: job.id, model, options, video, audio, out, duration: job.outputDuration, sec })
  console.log(`${out}  (${job.outputDuration?.toFixed(2)}초 영상 · ${sec.toFixed(0)}초 걸림 · 작업 ${job.id})`)
}

const run = { voices, tts, stt, lipsync }[cmd]
if (!run) {
  console.error(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n').replace(/^\/\/ ?/gm, ''))
  process.exit(1)
}
await run()
