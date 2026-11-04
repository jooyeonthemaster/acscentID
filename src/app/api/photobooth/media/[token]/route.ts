import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isResultExpired, isResultToken, resultTokenCreatedAt } from '@/lib/photobooth/result-photo'
import { RESULT_MEDIA_BUCKET, RESULT_MEDIA_DIR, mediaExt, resultMediaPath } from '@/lib/photobooth/result-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 폰으로 받는 부스 영상
 * GET /api/photobooth/media/[token]              재생(잠깐 쓰는 서명 주소로 넘긴다 — 구간 요청·탐색이 저장소에서 바로 된다)
 * GET /api/photobooth/media/[token]?download=1   저장(첨부 파일 이름을 붙인 서명 주소)
 * GET /api/photobooth/media/[token]?check=1      { ok } — 부스가 QR 을 다시 보여 줄 때 파일이 아직 있는지
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const check = request.nextUrl.searchParams.get('check') === '1'
  if (!isResultToken(token) || isResultExpired(token)) {
    return NextResponse.json({ ok: false, error: '영상을 찾을 수 없습니다' }, { status: 404 })
  }
  const bucket = createServiceRoleClient().storage.from(RESULT_MEDIA_BUCKET)
  const { data: files } = await bucket.list(RESULT_MEDIA_DIR, { search: token, limit: 1 })
  const file = files?.find((f) => f.name === token)
  if (!file) return NextResponse.json({ ok: false, error: '영상을 찾을 수 없습니다' }, { status: 404 })
  if (check) return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })

  const mime = String((file.metadata as { mimetype?: string } | null)?.mimetype ?? 'video/mp4')
  const stamp = new Date(resultTokenCreatedAt(token) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
  const download = request.nextUrl.searchParams.get('download') === '1'
  const { data, error } = await bucket.createSignedUrl(resultMediaPath(token), 60 * 60, download ? { download: `photobooth-${stamp}-${token.slice(-4)}.${mediaExt(mime)}` } : undefined)
  if (error || !data) return NextResponse.json({ ok: false, error: '영상을 찾을 수 없습니다' }, { status: 404 })
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } })
}
