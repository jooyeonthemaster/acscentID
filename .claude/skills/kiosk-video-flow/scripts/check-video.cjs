#!/usr/bin/env node
// 실제 Chrome 으로 영상 프레임 재기 — mp4 폴더를 직접 띄워(작은 서버, Range 지원) 개발 서버 없이 돈다.
// Playwright 의 Chromium 은 H.264 를 못 틀어서 설치된 Google Chrome(channel: 'chrome')을 쓴다.
//
//   node check-video.cjs <mp4 폴더> seams a>b c>d …     이음매: a 의 끝 프레임과 b 의 첫 프레임 평균 차이(0~255, 3 안팎이면 이음매가 안 보인다)
//   node check-video.cjs <mp4 폴더> chain a b c …       a>b, b>c … 처럼 줄줄이
//   node check-video.cjs <mp4 폴더> profile a b …       0.25초마다 '첫 프레임과의 차이' — 이 영상을 중간에서 끊고 나갈 자리가 있는지(첫 프레임 쪽으로 돌아오는 곳)
// 이름에 .mp4 는 빼도 된다. 차이가 5 이상인 이음매는 줄 앞에 !! 를 찍고, 하나라도 있으면 끝 코드 2.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os')

function loadPlaywright() {
  try { return require('playwright') } catch { /* 아래에서 찾는다 */ }
  const roots = [path.join(process.cwd(), 'node_modules'), path.join(os.homedir(), '.npm/_npx')]
  for (const r of roots) {
    if (!fs.existsSync(r)) continue
    const direct = path.join(r, 'playwright')
    if (fs.existsSync(direct)) return require(direct)
    for (const d of fs.readdirSync(r)) { const p = path.join(r, d, 'node_modules/playwright'); if (fs.existsSync(p)) return require(p) }
  }
  throw new Error('playwright 를 못 찾았다 — npx -y playwright@latest --version 을 한 번 돌리면 ~/.npm/_npx 에 생긴다')
}

const [dir, mode, ...rest] = process.argv.slice(2)
if (!dir || !['seams', 'chain', 'profile'].includes(mode) || !rest.length) {
  console.error('사용: node check-video.cjs <mp4 폴더> seams a>b … | chain a b c … | profile a b …'); process.exit(1)
}
const strip = (n) => n.replace(/\.mp4$/, '')
let pairs = []
if (mode === 'seams') pairs = rest.map((p) => p.split('>').map(strip))
if (mode === 'chain') for (let i = 0; i + 1 < rest.length; i++) pairs.push([strip(rest[i]), strip(rest[i + 1])])
for (const n of mode === 'profile' ? rest.map(strip) : pairs.flat()) if (!fs.existsSync(path.join(dir, `${n}.mp4`))) { console.error(`없음: ${n}.mp4`); process.exit(1) }

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0].slice(1))
  if (!name) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>check</title>') }
  const file = path.join(dir, path.basename(name))
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end() }
  const size = fs.statSync(file).size, range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (range) {
    const start = range[1] ? +range[1] : 0, end = range[2] ? +range[2] : size - 1
    res.writeHead(206, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
    return fs.createReadStream(file, { start, end }).pipe(res)
  }
  res.writeHead(200, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': size })
  fs.createReadStream(file).pipe(res)
})

server.listen(0, async () => {
  const origin = `http://127.0.0.1:${server.address().port}`
  const { chromium } = loadPlaywright()
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  let bad = 0
  try {
    const p = await b.newPage()
    await p.goto(origin + '/')
    const out = await p.evaluate(async ({ mode, pairs, names }) => {
      const W = 180, H = 320
      const cache = {}
      const open = (src) => cache[src] ??= new Promise((ok, no) => {
        const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = `/${src}.mp4`
        v.onloadeddata = () => ok(v); v.onerror = () => no(new Error(`${src} 를 못 읽음`))
      })
      const frame = async (src, t) => {
        const v = await open(src)
        await new Promise((ok) => { v.onseeked = ok; v.currentTime = t === 'end' ? Math.max(0, v.duration - 0.01) : t })
        const c = document.createElement('canvas'); c.width = W; c.height = H
        const g = c.getContext('2d'); g.drawImage(v, 0, 0, W, H)
        return { d: g.getImageData(0, 0, W, H).data, dur: v.duration }
      }
      const diff = (A, B) => { let s = 0; for (let i = 0; i < A.length; i += 4) s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]); return s / (A.length / 4) / 3 }
      const lines = []
      if (mode === 'profile') {
        for (const n of names) {
          const f0 = await frame(n, 0.001), row = []
          for (let t = 0.25; t < f0.dur - 0.05; t += 0.25) row.push(`${t.toFixed(2)}:${diff((await frame(n, t)).d, f0.d).toFixed(1)}`)
          row.push(`끝:${diff((await frame(n, 'end')).d, f0.d).toFixed(1)}`)
          lines.push({ text: `${n} (${f0.dur.toFixed(2)}초)\n  ${row.join(' ')}` })
        }
      } else {
        for (const [a, b] of pairs) {
          const d = diff((await frame(a, 'end')).d, (await frame(b, 0.001)).d)
          lines.push({ text: `${d.toFixed(1).padStart(5)}  ${a} → ${b}`, bad: d >= 5 })
        }
      }
      return lines
    }, { mode, pairs, names: rest.map(strip) })
    for (const l of out) { console.log(`${l.bad ? '!!' : '  '} ${l.text}`); if (l.bad) bad++ }
    if (mode !== 'profile') console.log(bad ? `이음매가 보일 수 있는 곳 ${bad}개(5 이상)` : '모든 이음매 5 미만')
  } finally { await b.close(); server.close() }
  process.exit(bad ? 2 : 0)
})
