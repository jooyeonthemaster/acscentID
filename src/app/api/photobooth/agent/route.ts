import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 매장 PC 원격 점검 통로 (개발 서버 전용)
 *
 * 매장 PC는 방화벽으로 인바운드가 막혀 있어 이쪽에서 접속할 수 없다.
 * 대신 PC가 이 API를 주기적으로 물어보게 해서(아웃바운드), 개발 쪽에서 넣어둔 명령을
 * 가져가 실행하고 결과를 돌려주는 구조로 뒤집는다.
 *
 * - 개발 서버에서만 동작한다 (운영에서는 404)
 * - 명령 넣기는 서버와 같은 기기(localhost)에서만 가능
 * - 에이전트는 사용자가 PowerShell 창을 닫으면 즉시 끝난다 (설치·자동실행 없음)
 */

const DIR = path.join(os.tmpdir(), 'acscent-booth-agent')
const QUEUE = path.join(DIR, 'queue.json')
const RESULTS = path.join(DIR, 'results.json')
const TOKEN = process.env.BOOTH_AGENT_TOKEN || 'wow-booth-2026'

interface Job {
  id: string
  command: string
  label?: string
  createdAt: string
}

interface JobResult extends Job {
  finishedAt: string
  output: string
  error: string
  exitCode: number | null
}

function devOnly() {
  return process.env.NODE_ENV === 'production'
}

/** 서버와 같은 기기에서 온 요청인지 (명령 주입은 여기서만 허용) */
function isLocal(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const host = request.headers.get('host') ?? ''
  return (
    forwarded === '' ||
    forwarded.includes('127.0.0.1') ||
    forwarded.includes('::1') ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1')
  )
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

/** 에이전트가 다음 명령을 가져간다 / localhost 는 결과를 조회한다 */
export async function GET(request: NextRequest) {
  if (devOnly()) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const params = request.nextUrl.searchParams

  if (params.get('results') === '1') {
    if (!isLocal(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const results = await readJson<JobResult[]>(RESULTS, [])
    const queue = await readJson<Job[]>(QUEUE, [])
    return NextResponse.json({ pending: queue.length, results: results.slice(-20) })
  }

  if (params.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 점검 스크립트 내려받기 — PowerShell 한 줄에 JS를 넣으면 따옴표 지옥이라 파일로 넘긴다
  const scriptName = params.get('script')
  if (scriptName) {
    if (!/^[a-z0-9-]+\.(js|mjs|cjs|ps1|json|html|ico)$/i.test(scriptName)) {
      return NextResponse.json({ error: 'bad name' }, { status: 400 })
    }
    try {
      // 바이트 그대로 — 아이콘 같은 바이너리와 BOM 이 있는 ps1 이 깨지지 않게
      const body = await fs.readFile(path.join(DIR, 'scripts', scriptName))
      return new NextResponse(new Uint8Array(body), {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    } catch {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
  }

  const queue = await readJson<Job[]>(QUEUE, [])
  const next = queue.shift()
  if (next) await writeJson(QUEUE, queue)
  return NextResponse.json(next ? { job: next } : { job: null })
}

/** 에이전트가 실행 결과를 돌려준다 (?upload=이름 이면 바이너리 파일 수신) */
export async function POST(request: NextRequest) {
  if (devOnly()) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // 카메라 프레임·촬영본처럼 명령 출력(40KB 제한)에 담기 어려운 파일을 받는다
  const upload = request.nextUrl.searchParams.get('upload')
  if (upload) {
    if (request.nextUrl.searchParams.get('token') !== TOKEN) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (!/^[a-z0-9-]+\.(jpg|jpeg|png|txt|json)$/i.test(upload)) {
      return NextResponse.json({ error: 'bad name' }, { status: 400 })
    }
    const buf = Buffer.from(await request.arrayBuffer())
    await fs.mkdir(path.join(DIR, 'uploads'), { recursive: true })
    const dest = path.join(DIR, 'uploads', upload)
    await fs.writeFile(dest, buf)
    return NextResponse.json({ success: true, bytes: buf.length })
  }

  const body = await request.json().catch(() => null)
  if (!body || body.token !== TOKEN || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const results = await readJson<JobResult[]>(RESULTS, [])
  results.push({
    id: body.id,
    command: String(body.command ?? ''),
    label: body.label,
    createdAt: String(body.createdAt ?? ''),
    finishedAt: new Date().toISOString(),
    output: String(body.output ?? '').slice(0, 40000),
    error: String(body.error ?? '').slice(0, 8000),
    exitCode: typeof body.exitCode === 'number' ? body.exitCode : null,
  })
  await writeJson(RESULTS, results.slice(-50))
  return NextResponse.json({ success: true })
}

/** 개발 쪽에서 명령을 넣는다 (localhost 전용) */
export async function PUT(request: NextRequest) {
  if (devOnly()) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!isLocal(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.command !== 'string' || !body.command.trim()) {
    return NextResponse.json({ error: 'command 가 필요합니다' }, { status: 400 })
  }

  const queue = await readJson<Job[]>(QUEUE, [])
  const job: Job = {
    id: crypto.randomUUID(),
    command: body.command,
    label: typeof body.label === 'string' ? body.label : undefined,
    createdAt: new Date().toISOString(),
  }
  queue.push(job)
  await writeJson(QUEUE, queue)
  return NextResponse.json({ success: true, id: job.id, pending: queue.length })
}

/** 대기열·결과 비우기 (localhost 전용) */
export async function DELETE(request: NextRequest) {
  if (devOnly()) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!isLocal(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  await writeJson(QUEUE, [])
  await writeJson(RESULTS, [])
  return NextResponse.json({ success: true })
}
