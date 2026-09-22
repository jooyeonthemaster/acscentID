import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 부스 기기 진단 결과 수집 (개발 서버 전용)
 *
 * 매장 PC가 같은 네트워크의 개발 서버로 접속해 /booth/diag 를 열면 이 API로 결과가 모인다.
 * 서버를 돌리는 쪽에서 파일로 확인할 수 있어, 원격에서도 기기 사양을 정확히 파악할 수 있다.
 * 운영 환경에서는 저장하지 않는다(로그만 남긴다).
 */
const DIR = path.join(os.tmpdir(), 'acscent-booth-diag')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    const record = {
      receivedAt: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') ?? 'local',
      userAgent: request.headers.get('user-agent') ?? '',
      report: body,
    }

    if (process.env.NODE_ENV === 'production') {
      console.log('[booth-diag]', JSON.stringify(record))
      return NextResponse.json({ success: true, stored: false })
    }

    await fs.mkdir(DIR, { recursive: true })
    const file = path.join(DIR, `report-${Date.now()}.json`)
    await fs.writeFile(file, JSON.stringify(record, null, 2), 'utf8')
    console.log('[booth-diag] 저장:', file)
    return NextResponse.json({ success: true, stored: true, file })
  } catch (error) {
    console.error('Booth diag POST error:', error)
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }
}

/** 수집된 진단 결과 목록 (개발 서버 전용) */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '사용할 수 없습니다' }, { status: 404 })
  }
  try {
    const files = await fs.readdir(DIR).catch(() => [] as string[])
    const reports = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-10)
        .map(async (f) => JSON.parse(await fs.readFile(path.join(DIR, f), 'utf8')))
    )
    return NextResponse.json({ success: true, count: reports.length, reports })
  } catch (error) {
    console.error('Booth diag GET error:', error)
    return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
  }
}
