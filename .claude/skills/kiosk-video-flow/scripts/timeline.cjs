#!/usr/bin/env node
// 실제 화면 매 프레임 기록 — 프로그램을 Chrome 으로 열어 시나리오대로 누르면서, 화면 맨 위에 보이는 영상이 무엇 · 몇 초인지 매 프레임(requestAnimationFrame) 적는다.
//   node timeline.cjs <scenario.json> [스크린샷 폴더]
// scenario.json:
// {
//   "url": "http://localhost:3014/kiosk?mode=...&demo=1",
//   "viewport": [560, 996],
//   "visible": "video.sip-film[data-on]",   // '보이는 영상' 선택자 — 재생기가 첫 프레임을 그린 겹에 붙이는 표시(references/player.md 의 data-on)
//   "move": "^move-",                       // 이동 영상 이름 패턴 — 누른 뒤 이게 화면에 나오기까지를 잰다
//   "steps": [                              // 차례대로. click: Playwright 선택자 · delay: 그 버튼이 보인 뒤 누르기 전 기다림(ms) · shot: 스크린샷 이름 · wait: 그냥 기다림(ms)
//     { "wait": 3000 }, { "click": ".sip-title" }, { "click": "text=따라가기", "delay": 300 }, { "click": "text=다음에요", "delay": 2500, "shot": "after-skip" }
//   ]
// }
// 출력: 누른 버튼마다 '누른 순간 보이던 영상@초 → 이동 영상이 나오기까지 ms'(같은 장소 안 버튼이면 다음 이동까지라 길게 나온다 — 무시),
//       보이는 영상이 바뀐 차례, 빈 프레임 수(보이는 영상이 없거나 readyState<2 — 시작 1.5초 뒤부터). 빈 프레임이 있으면 끝 코드 2.
// 개발 서버가 도중에 페이지를 새로 고치면(파일을 바꾼 직후 등) 기록이 끊긴다 — NAV 줄이 두 번 넘게 보이면 다시 돌린다.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os')
function loadPlaywright() {
  try { return require('playwright') } catch { /* 아래에서 찾는다 */ }
  for (const r of [path.join(process.cwd(), 'node_modules'), path.join(os.homedir(), '.npm/_npx')]) {
    if (!fs.existsSync(r)) continue
    if (fs.existsSync(path.join(r, 'playwright'))) return require(path.join(r, 'playwright'))
    for (const d of fs.readdirSync(r)) { const p = path.join(r, d, 'node_modules/playwright'); if (fs.existsSync(p)) return require(p) }
  }
  throw new Error('playwright 를 못 찾았다 — npx -y playwright@latest --version 을 한 번 돌린다')
}

const [scenarioPath, shotDir] = process.argv.slice(2)
if (!scenarioPath) { console.error('사용: node timeline.cjs <scenario.json> [스크린샷 폴더]'); process.exit(1) }
const sc = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'))
const visible = sc.visible ?? 'video[data-on]', movePat = new RegExp(sc.move ?? '^move-')

;(async () => {
  const { chromium } = loadPlaywright()
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
  const [w, h] = sc.viewport ?? [560, 996]
  const p = await b.newPage({ viewport: { width: w, height: h } })
  p.on('framenavigated', (f) => { if (f === p.mainFrame()) console.log('NAV', f.url()) })
  p.on('pageerror', (e) => console.log('PAGEERR', e.message.slice(0, 300)))
  p.on('console', async (m) => { if (m.type() !== 'error') return; const a = await Promise.all(m.args().map((x) => x.jsonValue().catch(() => '?'))); console.log('CONSOLE', JSON.stringify(a).slice(0, 400)) })
  await p.goto(sc.url, { waitUntil: 'networkidle', timeout: 90000 })
  await p.evaluate((sel) => {
    window.__log = []
    const t0 = performance.now()
    const tick = () => {
      const top = [...document.querySelectorAll(sel)].pop()
      window.__log.push({ t: Math.round(performance.now() - t0), top: top ? decodeURIComponent(top.currentSrc || top.src).split('/').pop().replace(/\.(mp4|webm)$/, '') : '-', ct: top ? +top.currentTime.toFixed(2) : 0, rate: top ? +top.playbackRate.toFixed(2) : 0, ready: top ? top.readyState : -1 })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, visible)
  const now = () => p.evaluate(() => window.__log.at(-1).t)
  const presses = []
  let failed = null
  try {
    for (const s of sc.steps) {
      if (s.wait) await p.waitForTimeout(s.wait)
      if (s.click) {
        await p.waitForSelector(s.click, { state: 'visible', timeout: s.timeout ?? 60000 })
        if (s.delay) await p.waitForTimeout(s.delay)
        presses.push([s.click, await now()])
        await p.click(s.click)
      }
      if (s.shot && shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await p.waitForTimeout(600); await p.screenshot({ path: path.join(shotDir, `${s.shot}.png`) }) }
    }
    await p.waitForTimeout(sc.tail ?? 1500)
  } catch (e) { failed = e.message.split('\n')[0] }
  const log = await p.evaluate(() => window.__log || []).catch(() => [])
  await b.close()
  for (const [label, t] of presses) {
    const before = log.filter((r) => r.t <= t).at(-1)
    const m = log.find((r) => r.t > t && movePat.test(r.top))
    console.log(`누름 ${label} — ${before ? `${before.top}@${before.ct}` : '?'} → ${m ? `${m.top} 까지 ${m.t - t}ms` : '이동 없음'}`)
  }
  let prev = ''; const seq = []
  for (const r of log) if (r.top !== prev) { seq.push(`${r.t}:${r.top}@${r.ct}`); prev = r.top }
  console.log('차례', seq.join('  '))
  const blank = log.filter((r) => r.t > 1500 && r.ready < 2).length
  console.log(`프레임 ${log.length} · 빈 프레임 ${blank}`)
  if (failed) { console.log('중단', failed); process.exit(1) }
  process.exit(blank ? 2 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
