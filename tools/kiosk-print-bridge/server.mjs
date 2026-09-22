#!/usr/bin/env node
/**
 * 키오스크 로컬 인쇄 브리지 — 매장 PC에서 돌리는 작은 HTTP 서비스.
 *
 * 왜 필요한가: 브라우저는 USB 감열 프린터에 직접 바이트를 보낼 수 없다.
 * Electron 셸을 만드는 대신, 같은 PC에서 이 서비스를 띄우고 키오스크 화면이
 * localhost로 인쇄를 부탁하게 한다 (window.kiosk 계약과 동일한 표면).
 *
 *   POST /print   { receiptImageBase64, ticket? }  → ESC/POS 래스터로 인쇄
 *   POST /ticket                                   → 다음 발권 번호 (일자별 리셋)
 *   GET  /health                                   → { ok, printer, dots }
 *
 * 인쇄 경로는 OS 프린터 큐의 raw 전송을 쓴다 (libusb 불필요):
 *   macOS/Linux : lp -d <PRINTER> -o raw <file>
 *   Windows     : copy /b <file> \\.\<PORT>   또는 공유 프린터 경로
 *
 * 실행:
 *   KIOSK_PRINTER="POS80" node tools/kiosk-print-bridge/server.mjs
 *   (sharp는 이 저장소 node_modules의 것을 그대로 쓴다 — 추가 설치 없음)
 */

import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile, exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)
const require = createRequire(import.meta.url)
const sharp = require('sharp')

const PORT = Number(process.env.KIOSK_PRINT_PORT || 9110)
/** OS에 등록된 프린터 이름 (macOS: lpstat -p / Windows: 공유 이름) */
const PRINTER = process.env.KIOSK_PRINTER || ''
/** 프린터 헤드 도트 폭 — 80mm 기종은 보통 576, 일부는 512. 영수증 원판 폭과 맞춰야 한다 */
const DOTS = Number(process.env.KIOSK_PRINTER_DOTS || 512)
/** 흑백 임계값 — 감열 인쇄는 중간톤이 없다 */
const THRESHOLD = Number(process.env.KIOSK_PRINT_THRESHOLD || 170)
/** 한 번에 보낼 래스터 밴드 높이 (큰 이미지를 통째로 보내면 버퍼가 작은 기종이 토한다) */
const BAND_ROWS = 128
/** 전송 명령을 직접 지정하고 싶을 때 ({file}이 파일 경로로 치환된다) */
const PRINT_CMD = process.env.KIOSK_PRINT_CMD || ''
/** 인쇄를 실제로 보내지 않고 파일만 남기는 점검 모드 */
const DRY_RUN = process.env.KIOSK_PRINT_DRY_RUN === '1'

const STATE_DIR = path.join(os.homedir(), '.acscent-kiosk')
const TICKET_FILE = path.join(STATE_DIR, 'ticket.json')
const OUT_DIR = path.join(STATE_DIR, 'spool')
fs.mkdirSync(OUT_DIR, { recursive: true })

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args)

// ── 발권 번호 ────────────────────────────────────────────────
/** KST 기준 날짜가 바뀌면 0001부터 다시 시작한다 */
function nextTicket() {
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  let state = { day: today, seq: 0 }
  try {
    const saved = JSON.parse(fs.readFileSync(TICKET_FILE, 'utf8'))
    if (saved.day === today) state = saved
  } catch {
    /* 첫 실행 */
  }
  state.seq += 1
  fs.writeFileSync(TICKET_FILE, JSON.stringify(state))
  return String(state.seq).padStart(4, '0')
}

// ── PNG → ESC/POS 래스터 ────────────────────────────────────
/**
 * GS v 0 — 래스터 비트 이미지. 1 = 검정.
 * 원판(512dot)이 헤드 폭과 다르면 비율을 유지한 채 맞춰 늘리거나 좌측 정렬로 패딩한다.
 */
async function toRaster(pngBuffer) {
  const meta = await sharp(pngBuffer).metadata()
  let image = sharp(pngBuffer).greyscale()

  if (meta.width !== DOTS) {
    if (meta.width > DOTS) {
      image = image.resize({ width: DOTS, fit: 'inside' })
    } else {
      // 헤드가 더 넓으면 확대하지 않고 가운데 정렬로 여백을 준다 (글자 흐려짐 방지)
      const left = Math.floor((DOTS - meta.width) / 2)
      image = image.extend({
        left,
        right: DOTS - meta.width - left,
        top: 0,
        bottom: 0,
        background: { r: 255, g: 255, b: 255 },
      })
    }
  }

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const width = info.width
  const height = info.height
  const bytesPerRow = Math.ceil(width / 8)

  const chunks = []
  chunks.push(Buffer.from([0x1b, 0x40])) // ESC @ 초기화
  chunks.push(Buffer.from([0x1b, 0x61, 0x00])) // 좌측 정렬

  for (let bandTop = 0; bandTop < height; bandTop += BAND_ROWS) {
    const bandHeight = Math.min(BAND_ROWS, height - bandTop)
    const bitmap = Buffer.alloc(bytesPerRow * bandHeight, 0)

    for (let y = 0; y < bandHeight; y++) {
      for (let x = 0; x < width; x++) {
        const lum = data[(bandTop + y) * width + x]
        if (lum < THRESHOLD) {
          bitmap[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7)
        }
      }
    }

    chunks.push(
      Buffer.from([
        0x1d,
        0x76,
        0x30,
        0x00, // GS v 0 m=0
        bytesPerRow & 0xff,
        (bytesPerRow >> 8) & 0xff,
        bandHeight & 0xff,
        (bandHeight >> 8) & 0xff,
      ])
    )
    chunks.push(bitmap)
  }

  chunks.push(Buffer.from('\n\n\n\n')) // 커터 위치까지 피드
  chunks.push(Buffer.from([0x1d, 0x56, 0x42, 0x00])) // GS V B 0 — 부분 절단
  return Buffer.concat(chunks)
}

// ── OS 프린터 큐로 raw 전송 ─────────────────────────────────
async function sendToPrinter(raw) {
  const file = path.join(OUT_DIR, `receipt-${Date.now()}.bin`)
  fs.writeFileSync(file, raw)

  if (DRY_RUN) {
    log(`DRY_RUN — 전송 생략, 파일만 저장: ${file} (${raw.length} bytes)`)
    return { bytes: raw.length, file }
  }
  if (!PRINTER) throw new Error('KIOSK_PRINTER 환경변수가 비어 있습니다')

  if (PRINT_CMD) {
    // 탈출구 — 기종 전용 유틸이 있으면 그대로 쓴다 ({file} 자리에 경로가 들어간다)
    await execAsync(PRINT_CMD.replace('{file}', `"${file}"`))
  } else if (process.platform === 'win32') {
    // 공유 프린터로 바이트 그대로 복사 — 경로에 공백이 있을 수 있어 따옴표로 감싼다
    await execAsync(`copy /b "${file}" "${PRINTER}"`)
  } else {
    await execFileAsync('lp', ['-d', PRINTER, '-o', 'raw', file])
  }

  // 최근 20장만 남긴다 (문제 생겼을 때 원판을 되짚어 볼 수 있게)
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.bin')).sort()
  for (const old of files.slice(0, Math.max(0, files.length - 20))) {
    fs.unlinkSync(path.join(OUT_DIR, old))
  }
  return { bytes: raw.length, file }
}

// ── HTTP ────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 12 * 1024 * 1024) reject(new Error('요청이 너무 큽니다'))
      parts.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(parts)))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, printer: PRINTER || null, dots: DOTS, dryRun: DRY_RUN })
  }

  if (req.method === 'POST' && url.pathname === '/ticket') {
    const ticket = nextTicket()
    log(`발권 ${ticket}`)
    return json(res, 200, { success: true, ticket })
  }

  if (req.method === 'POST' && url.pathname === '/print') {
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8'))
      const base64 = String(body.receiptImageBase64 || '').replace(/^data:image\/\w+;base64,/, '')
      if (!base64) return json(res, 400, { success: false, error: '영수증 이미지가 없습니다' })

      // 재인쇄가 아니면 여기서 번호를 매긴다 (화면이 미리 받아 갔으면 그 번호를 쓴다)
      const ticket = body.ticket ? String(body.ticket) : nextTicket()
      const raw = await toRaster(Buffer.from(base64, 'base64'))
      const sent = await sendToPrinter(raw)
      log(`인쇄 ${ticket} — ${sent.bytes} bytes`)
      return json(res, 200, { success: true, ticket, bytes: sent.bytes })
    } catch (error) {
      console.error('[print] 실패:', error)
      return json(res, 500, { success: false, error: String(error.message || error) })
    }
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  log(`키오스크 인쇄 브리지 — http://127.0.0.1:${PORT}`)
  log(`프린터: ${PRINTER || '(미설정)'} · 헤드 ${DOTS}dot · 임계 ${THRESHOLD}${DRY_RUN ? ' · DRY_RUN' : ''}`)
  if (!PRINTER && !PRINT_CMD && !DRY_RUN) {
    log('⚠ KIOSK_PRINTER가 비어 있습니다.')
    log('   Windows: 프린터를 공유한 뒤 \\\\localhost\\<공유이름> 형태로,  macOS: `lpstat -p`의 이름으로 지정하세요.')
  }
})
