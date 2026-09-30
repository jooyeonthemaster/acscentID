#!/usr/bin/env node
/**
 * 맥 개발용 인쇄 도우미 — 윈도우 카운터 PC 의 scripts/counter-pc/counter-print-helper.ps1 과 같은 계약.
 * /booth/counter 가 만든 ESC/POS 바이트를 USB 로 꽂힌 OK30 에 CUPS usb 백엔드로 그대로 보낸다
 * (macOS 는 raw 프린터 큐를 막아서 백엔드를 직접 부른다).
 *
 *   node tools/receipt-printer-mac/helper.mjs     → http://127.0.0.1:9131  (GET /health · POST /print)
 */
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const PORT = 9131
const BACKEND = '/usr/libexec/cups/backend/usb'

// lpinfo -v 는 네트워크 프린터까지 뒤져 10초 넘게 걸린다 — USB 만 찾고, 찾은 주소는 기억해 둔다
let cachedUri = null
async function printerUri() {
  if (cachedUri) return cachedUri
  const { stdout } = await run('lpinfo', ['--include-schemes', 'usb', '-v']).catch(() => ({ stdout: '' }))
  cachedUri = stdout.match(/usb:\/\/SEWOO\/\S+/)?.[0] ?? null
  return cachedUri
}

function cors(req, res) {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Private-Network', 'true')
    res.setHeader('Vary', 'Origin')
  }
}

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

http
  .createServer(async (req, res) => {
    cors(req, res)
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    const uri = await printerUri()
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, uri ? { ok: true, printer: 'OK30 (mac dev)' } : { ok: false, printer: 'OK30 (mac dev)', error: 'USB 에 프린터가 없음' })
    }
    if (req.method !== 'POST' || req.url !== '/print') return send(res, 404, { error: 'not found' })
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)
    if (!uri) return send(res, 500, { error: 'USB 에 프린터가 없음' })
    const file = path.join(os.tmpdir(), `ok30-${Date.now()}.bin`)
    fs.writeFileSync(file, body)
    try {
      await run(BACKEND, ['1', os.userInfo().username, 'counter', '1', '', file], { env: { ...process.env, DEVICE_URI: uri } })
      console.log(new Date().toLocaleTimeString(), `인쇄 ${body.length}B (${req.headers.origin ?? '-'})`)
      send(res, 200, { ok: true })
    } catch (error) {
      cachedUri = null // 케이블을 다른 구멍에 꽂으면 주소가 바뀐다
      console.error(error)
      send(res, 500, { error: String(error.stderr || error.message).slice(-200) })
    } finally {
      fs.rmSync(file, { force: true })
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`OK30 개발 도우미 http://127.0.0.1:${PORT}`))
