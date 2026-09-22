import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  RESULT_PHOTO_BUCKET,
  isResultExpired,
  isResultToken,
  resultPhotoPath,
  resultTokenCreatedAt,
} from '@/lib/photobooth/result-photo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 폰으로 받는 부스 사진 파일
 * GET /api/photobooth/result/[token]            화면 표시용 (inline)
 * GET /api/photobooth/result/[token]?download=1  저장용 (attachment — 안드로이드는 바로 갤러리 다운로드 폴더로)
 *
 * 우리 도메인으로 한 번 거쳐 준다 — 다른 도메인 파일은 폰 브라우저가 download 속성을 무시하고 열기만 한다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!isResultToken(token) || isResultExpired(token)) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다' }, { status: 404 })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient.storage
    .from(RESULT_PHOTO_BUCKET)
    .download(resultPhotoPath(token))
  if (error || !data) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다' }, { status: 404 })
  }

  // 파일 이름의 날짜는 한국 시간 기준 (서버는 UTC)
  const stamp = new Date(resultTokenCreatedAt(token) + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const filename = `acscent-wow-${stamp}-${token.slice(-4)}.jpg`
  const download = request.nextUrl.searchParams.get('download') === '1'

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      // 링크를 가진 사람만 보는 개인 사진 — 공유 캐시에 남기지 않는다
      'Cache-Control': 'private, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  })
}
