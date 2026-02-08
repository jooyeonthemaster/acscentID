import { NextRequest, NextResponse } from 'next/server'

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'a1b2c3d4e5f6g7h8i9j0'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr'

// IndexNow 엔드포인트 (Bing + Naver 동시 지원)
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls } = body as { urls?: string[] }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls 배열이 필요합니다' }, { status: 400 })
    }

    // 절대 URL로 변환
    const absoluteUrls = urls.map((url) =>
      url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
    )

    const payload = {
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: absoluteUrls,
    }

    // 모든 IndexNow 엔드포인트에 동시 전송
    const results = await Promise.allSettled(
      INDEXNOW_ENDPOINTS.map(async (endpoint) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload),
        })
        return { endpoint, status: res.status }
      })
    )

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { endpoint: 'unknown', status: 'error' }
    )

    return NextResponse.json({ success: true, submitted: absoluteUrls.length, results: summary })
  } catch (error) {
    console.error('IndexNow error:', error)
    return NextResponse.json({ error: 'IndexNow 전송 실패' }, { status: 500 })
  }
}

// GET: 키 검증용
export async function GET() {
  return new NextResponse(INDEXNOW_KEY, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
