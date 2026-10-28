import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { SHARE_TYPES, isShareExpired, isShareFileName, isShareToken, shareCreatedAt, type ShareType } from '@/lib/kiosk/share'
import { getShareFile } from '@/lib/kiosk/share-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPE_BY_EXT = Object.fromEntries(Object.entries(SHARE_TYPES).map(([type, ext]) => [ext, type])) as Record<string, ShareType>

/**
 * 휴대폰으로 받는 키오스크 체험 결과 파일
 * GET /api/kiosk/share/[token]/[name]            화면 표시용(inline)
 * GET /api/kiosk/share/[token]/[name]?download=1  저장용(attachment)
 * 우리 도메인으로 한 번 거쳐 준다 — 다른 도메인 파일은 폰 브라우저가 download 속성을 무시하고 열기만 한다.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; name: string }> }) {
  const { token, name } = await params
  if (!isShareToken(token) || isShareExpired(token) || !isShareFileName(name)) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })

  const ext = name.slice(name.lastIndexOf('.') + 1)
  const type = TYPE_BY_EXT[ext]
  const data = type ? await getShareFile(createServiceRoleClient(), token, name, type) : null
  if (!data) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })

  // 파일 이름의 날짜는 한국 시간 기준(서버는 UTC)
  const stamp = new Date(shareCreatedAt(token) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
  // 체험 결과는 브랜드 없이(2026-10-28) — 받기 페이지(ShareSaver)의 저장 이름과 같은 kiosk- 로
  const filename = `kiosk-${name.slice(0, name.lastIndexOf('.'))}-${stamp}-${token.slice(-4)}.${ext}`
  const download = request.nextUrl.searchParams.get('download') === '1'
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': type,
      'Content-Length': String(data.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      // 링크를 가진 사람만 보는 개인 결과 — 공유 캐시에 남기지 않는다
      'Cache-Control': 'private, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  })
}
